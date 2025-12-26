// Analytics Service - Central analytics collection and aggregation
// Tracks violations, economy metrics, player progression, and experiments

const { db, isConfigured } = require('./firebase-admin-config');
const admin = require('firebase-admin');

// In-memory buffers for batched writes
const analyticsBuffer = {
    violations: [],
    transactions: [],
    progression: [],
    events: []
};

// Configuration
const BUFFER_FLUSH_INTERVAL = 30000; // Flush every 30 seconds
const BUFFER_MAX_SIZE = 100; // Flush when buffer reaches 100 items
const DATA_RETENTION_DAYS = 90;

/**
 * Initialize analytics service
 */
function initializeAnalytics() {
    if (!isConfigured) {
        console.warn('⚠️ Analytics: Firebase not configured, using in-memory storage');
        return;
    }

    // Set up periodic buffer flush
    setInterval(() => flushBuffers(), BUFFER_FLUSH_INTERVAL);

    console.log('📊 Analytics service initialized');
}

/**
 * Track a violation event
 */
async function trackViolation(userId, violationType, metadata = {}) {
    const violation = {
        userId,
        type: violationType,
        timestamp: Date.now(),
        metadata,
        severity: getViolationSeverity(violationType)
    };

    // Add to buffer
    analyticsBuffer.violations.push(violation);

    // Log immediately for critical violations
    if (violation.severity === 'critical') {
        await logViolationImmediate(violation);
    }

    // Flush if buffer is full
    if (analyticsBuffer.violations.length >= BUFFER_MAX_SIZE) {
        await flushViolations();
    }

    return violation;
}

/**
 * Track economy transaction
 */
async function trackTransaction(userId, transactionType, amount, currency, metadata = {}) {
    const transaction = {
        userId,
        type: transactionType, // 'purchase', 'earning', 'gift', 'admin'
        amount,
        currency, // 'cash', 'diamonds', 'xp'
        timestamp: Date.now(),
        metadata
    };

    analyticsBuffer.transactions.push(transaction);

    if (analyticsBuffer.transactions.length >= BUFFER_MAX_SIZE) {
        await flushTransactions();
    }

    return transaction;
}

/**
 * Track player progression event
 */
async function trackProgression(userId, event, data = {}) {
    const progressionEvent = {
        userId,
        event, // 'level_up', 'first_purchase', 'milestone_reached'
        data,
        timestamp: Date.now()
    };

    analyticsBuffer.progression.push(progressionEvent);

    if (analyticsBuffer.progression.length >= BUFFER_MAX_SIZE) {
        await flushProgression();
    }

    return progressionEvent;
}

/**
 * Track custom event
 */
async function trackEvent(userId, eventName, properties = {}) {
    const event = {
        userId,
        name: eventName,
        properties,
        timestamp: Date.now()
    };

    analyticsBuffer.events.push(event);

    if (analyticsBuffer.events.length >= BUFFER_MAX_SIZE) {
        await flushEvents();
    }

    return event;
}

/**
 * Get violation severity level
 */
function getViolationSeverity(violationType) {
    const severityMap = {
        // Critical - immediate action needed
        'excessive_earnings': 'critical',
        'impossible_action': 'critical',
        'banned_action': 'critical',

        // Warning - suspicious but might be legitimate
        'state_mismatch': 'warning',
        'unusual_timing': 'warning',
        'invalid_earning_reason': 'warning',

        // Info - track but not concerning
        'rate_limit_exceeded': 'info',
        'invalid_input': 'info'
    };

    return severityMap[violationType] || 'info';
}

/**
 * Log critical violation immediately
 */
async function logViolationImmediate(violation) {
    if (!isConfigured) return;

    try {
        const date = new Date(violation.timestamp);
        const dateStr = date.toISOString().split('T')[0];

        // Log to daily violations
        const dailyRef = db.ref(`analytics/violations/daily/${dateStr}/${violation.type}`);
        await dailyRef.transaction(count => (count || 0) + 1);

        // Log to user violations
        const userRef = db.ref(`analytics/violations/by_user/${violation.userId}`);
        await userRef.transaction(userData => {
            if (!userData) {
                userData = { total: 0, types: {}, last_violation: null };
            }
            userData.total++;
            userData.types[violation.type] = (userData.types[violation.type] || 0) + 1;
            userData.last_violation = violation.timestamp;
            userData.severity = violation.severity;
            return userData;
        });

        console.log(`🚨 Critical violation logged: ${violation.type} for user ${violation.userId}`);
    } catch (error) {
        console.error('Failed to log violation:', error);
    }
}

/**
 * Flush violation buffer to Firebase
 */
async function flushViolations() {
    if (!isConfigured || analyticsBuffer.violations.length === 0) {
        analyticsBuffer.violations = [];
        return;
    }

    const violations = [...analyticsBuffer.violations];
    analyticsBuffer.violations = [];

    try {
        const updates = {};
        const now = Date.now();
        const dateStr = new Date(now).toISOString().split('T')[0];

        // Aggregate by type for daily stats
        const dailyCounts = {};
        const userCounts = {};

        violations.forEach(v => {
            // Daily aggregation
            dailyCounts[v.type] = (dailyCounts[v.type] || 0) + 1;

            // User aggregation
            if (!userCounts[v.userId]) {
                userCounts[v.userId] = { total: 0, types: {}, last: v.timestamp };
            }
            userCounts[v.userId].total++;
            userCounts[v.userId].types[v.type] = (userCounts[v.userId].types[v.type] || 0) + 1;
            if (v.timestamp > userCounts[v.userId].last) {
                userCounts[v.userId].last = v.timestamp;
            }
        });

        // Build update object
        Object.entries(dailyCounts).forEach(([type, count]) => {
            updates[`analytics/violations/daily/${dateStr}/${type}`] = admin.database.ServerValue.increment(count);
        });

        Object.entries(userCounts).forEach(([userId, data]) => {
            updates[`analytics/violations/by_user/${userId}/total`] = admin.database.ServerValue.increment(data.total);
            updates[`analytics/violations/by_user/${userId}/last_violation`] = data.last;

            Object.entries(data.types).forEach(([type, count]) => {
                updates[`analytics/violations/by_user/${userId}/types/${type}`] = admin.database.ServerValue.increment(count);
            });
        });

        await db.ref().update(updates);
        console.log(`📊 Flushed ${violations.length} violations to Firebase`);
    } catch (error) {
        console.error('Failed to flush violations:', error);
    }
}

/**
 * Flush transaction buffer
 */
async function flushTransactions() {
    if (!isConfigured || analyticsBuffer.transactions.length === 0) {
        analyticsBuffer.transactions = [];
        return;
    }

    const transactions = [...analyticsBuffer.transactions];
    analyticsBuffer.transactions = [];

    try {
        const dateStr = new Date().toISOString().split('T')[0];
        const updates = {};

        // Aggregate transactions
        let totalPurchases = 0;
        let totalEarnings = 0;
        const currencyTotals = { cash: 0, diamonds: 0, xp: 0 };

        transactions.forEach(t => {
            if (t.type === 'purchase') totalPurchases++;
            if (t.type === 'earning') totalEarnings++;
            currencyTotals[t.currency] += t.amount;
        });

        updates[`analytics/economy/transactions/${dateStr}/purchases`] = admin.database.ServerValue.increment(totalPurchases);
        updates[`analytics/economy/transactions/${dateStr}/earnings`] = admin.database.ServerValue.increment(totalEarnings);

        Object.entries(currencyTotals).forEach(([currency, amount]) => {
            updates[`analytics/economy/transactions/${dateStr}/total_${currency}`] = admin.database.ServerValue.increment(amount);
        });

        await db.ref().update(updates);
        console.log(`📊 Flushed ${transactions.length} transactions to Firebase`);
    } catch (error) {
        console.error('Failed to flush transactions:', error);
    }
}

/**
 * Flush progression buffer
 */
async function flushProgression() {
    if (!isConfigured || analyticsBuffer.progression.length === 0) {
        analyticsBuffer.progression = [];
        return;
    }

    const events = [...analyticsBuffer.progression];
    analyticsBuffer.progression = [];

    try {
        const updates = {};
        const dateStr = new Date().toISOString().split('T')[0];

        // Count events by type
        const eventCounts = {};
        events.forEach(e => {
            eventCounts[e.event] = (eventCounts[e.event] || 0) + 1;
        });

        Object.entries(eventCounts).forEach(([event, count]) => {
            updates[`analytics/progression/events/${dateStr}/${event}`] = admin.database.ServerValue.increment(count);
        });

        await db.ref().update(updates);
        console.log(`📊 Flushed ${events.length} progression events to Firebase`);
    } catch (error) {
        console.error('Failed to flush progression events:', error);
    }
}

/**
 * Flush custom events buffer
 */
async function flushEvents() {
    if (!isConfigured || analyticsBuffer.events.length === 0) {
        analyticsBuffer.events = [];
        return;
    }

    const events = [...analyticsBuffer.events];
    analyticsBuffer.events = [];

    try {
        const dateStr = new Date().toISOString().split('T')[0];
        const updates = {};

        // Count events by name
        const eventCounts = {};
        events.forEach(e => {
            eventCounts[e.name] = (eventCounts[e.name] || 0) + 1;
        });

        Object.entries(eventCounts).forEach(([name, count]) => {
            updates[`analytics/events/${dateStr}/${name}`] = admin.database.ServerValue.increment(count);
        });

        await db.ref().update(updates);
        console.log(`📊 Flushed ${events.length} custom events to Firebase`);
    } catch (error) {
        console.error('Failed to flush events:', error);
    }
}

/**
 * Flush all buffers
 */
async function flushBuffers() {
    await Promise.all([
        flushViolations(),
        flushTransactions(),
        flushProgression(),
        flushEvents()
    ]);
}

/**
 * Get aggregated metrics
 */
async function getMetrics(type, timeRange = 'day') {
    if (!isConfigured) {
        return { error: 'Firebase not configured' };
    }

    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        switch (type) {
            case 'violations':
                const violationsSnap = await db.ref(`analytics/violations/daily/${dateStr}`).once('value');
                return violationsSnap.val() || {};

            case 'economy':
                const economySnap = await db.ref(`analytics/economy/transactions/${dateStr}`).once('value');
                return economySnap.val() || {};

            case 'progression':
                const progressionSnap = await db.ref(`analytics/progression/events/${dateStr}`).once('value');
                return progressionSnap.val() || {};

            default:
                return { error: 'Unknown metric type' };
        }
    } catch (error) {
        console.error('Failed to get metrics:', error);
        return { error: error.message };
    }
}

/**
 * Capture economy snapshot
 */
async function captureEconomySnapshot() {
    if (!isConfigured) return;

    try {
        // This will be called hourly to capture economy state
        // Implementation will query all player states and aggregate
        const now = new Date();
        const hourKey = `${now.toISOString().split('T')[0]}-${now.getHours()}`;

        // Placeholder - full implementation requires scanning all users
        const snapshot = {
            timestamp: Date.now(),
            total_cash: 0,
            total_diamonds: 0,
            active_players: 0,
            avg_wealth: 0
        };

        await db.ref(`analytics/economy/snapshots/hourly/${hourKey}`).set(snapshot);
        console.log(`📸 Economy snapshot captured for ${hourKey}`);
    } catch (error) {
        console.error('Failed to capture economy snapshot:', error);
    }
}

module.exports = {
    initializeAnalytics,
    trackViolation,
    trackTransaction,
    trackProgression,
    trackEvent,
    getMetrics,
    captureEconomySnapshot,
    flushBuffers
};
