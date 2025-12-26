// Server-Side Game Validator
// Validates all economy actions to prevent client-side manipulation

const admin = require('firebase-admin');
const { db, isConfigured } = require('./firebase-admin-config');
const analytics = require('./analyticsService');

// In-memory cache to reduce Firebase reads
const playerStateCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting storage (per user)
const rateLimits = new Map();
const RATE_LIMITS = {
    purchase: { max: 30, window: 60000 },  // 30 purchases per minute (was 10)
    earnings: { max: 180, window: 60000 }, // 180 earnings per minute = 3/sec (was 60)
    levelUp: { max: 10, window: 60000 },   // 10 level-ups per minute (was 5)
    sync: { max: 20, window: 60000 }       // 20 syncs per minute (was 10)
};

/**
 * Check rate limit for user action
 */
function checkRateLimit(userId, action) {
    const key = `${userId}:${action}`;
    const limit = RATE_LIMITS[action];

    if (!limit) return true; // No limit for this action

    const now = Date.now();

    if (!rateLimits.has(key)) {
        rateLimits.set(key, { count: 1, resetTime: now + limit.window });
        return true;
    }

    const record = rateLimits.get(key);

    // Reset if window expired
    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + limit.window;
        return true;
    }

    // Check if limit exceeded
    if (record.count >= limit.max) {
        return false;
    }

    record.count++;
    return true;
}

/**
 * Get cached player state or fetch from Firebase
 */
async function getPlayerState(userId) {
    // Check cache
    const cached = playerStateCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.state;
    }

    // If Firebase not configured, use in-memory store
    if (!isConfigured) {
        const inMemoryStore = require('./inMemoryStore');
        const state = await inMemoryStore.getSave(userId);

        // Cache state
        playerStateCache.set(userId, {
            state,
            timestamp: Date.now()
        });

        return state;
    }

    // Fetch from Firebase
    const snapshot = await db.ref(`saves/${userId}`).once('value');
    const state = snapshot.val();

    if (!state) {
        // New player - return default state
        return {
            cash: 5000,
            diamonds: 5,
            xp: 0,
            level: 1,
            furniture: [],
            staff: {
                bartenders: 0,
                djs: 0,
                bouncers: 0,
                promoters: 0,
                managers: 0
            }
        };
    }

    // Cache state
    playerStateCache.set(userId, {
        state,
        timestamp: Date.now()
    });

    return state;
}

/**
 * Update player state in Firebase and cache
 */
async function updatePlayerState(userId, newState) {
    // If Firebase not configured, use in-memory store
    if (!isConfigured) {
        const inMemoryStore = require('./inMemoryStore');
        await inMemoryStore.updateSave(userId, newState);

        // Update cache
        playerStateCache.set(userId, {
            state: newState,
            timestamp: Date.now()
        });

        return;
    }

    // Update Firebase
    await db.ref(`saves/${userId}`).update({
        ...newState,
        savedAt: Date.now()
    });

    // Update cache
    playerStateCache.set(userId, {
        state: newState,
        timestamp: Date.now()
    });
}

/**
 * Invalidate player cache (call after external updates)
 */
function invalidateCache(userId) {
    playerStateCache.delete(userId);
}

/**
 * Load game configuration (furniture prices, etc.)
 */
async function getGameConfig() {
    if (!isConfigured) {
        // Fallback to hardcoded config if Firebase not available
        return require('./js/config.js').CONFIG;
    }

    const snapshot = await db.ref('config/furniture').once('value');
    return snapshot.val() || require('./js/config.js').CONFIG;
}

/**
 * Validate furniture/staff purchase
 */
async function validatePurchase(userId, itemType, itemId, metadata = {}) {
    // Check rate limit
    if (!checkRateLimit(userId, 'purchase')) {
        return {
            valid: false,
            error: 'RATE_LIMIT',
            message: 'Too many purchases. Please slow down.'
        };
    }

    // Get player state
    const state = await getPlayerState(userId);

    // Load catalog (you'll need to fetch this from Firebase or hardcode)
    const catalog = await getGameConfig();

    // Validate item exists
    let item, itemCost, currency;

    if (itemType === 'furniture') {
        // Load furniture catalog from Firebase or fallback to hardcoded
        let furnitureCatalog = {};

        if (isConfigured) {
            const furnitureSnapshot = await db.ref('config/furnitureCatalog').once('value');
            furnitureCatalog = furnitureSnapshot.val() || {};
        }

        // If not in Firebase or Firebase not configured, use hardcoded catalog
        if (Object.keys(furnitureCatalog).length === 0) {
            // Hardcoded furniture catalog for dev mode (matches client-side catalog)
            furnitureCatalog = {
                // Floor tiles
                tile_wood: { cost: 50, unlockLevel: 1 },
                tile_marble: { cost: 100, unlockLevel: 1 },
                tile_checker: { cost: 75, unlockLevel: 1 },
                tile_carpet: { cost: 80, unlockLevel: 1 },
                tile_concrete: { cost: 40, unlockLevel: 1 },
                tile_disco: { cost: 150, unlockLevel: 1 },

                // Furniture
                table: { cost: 100, unlockLevel: 1 },
                booth: { cost: 500, unlockLevel: 2 },
                bar: { cost: 800, unlockLevel: 2 },
                speaker: { cost: 200, unlockLevel: 1 },
                plant: { cost: 75, unlockLevel: 1 },
                pooltable: { cost: 600, unlockLevel: 3 },

                // Dance & Entertainment
                dancefloor: { cost: 1000, unlockLevel: 1 },
                dj: { cost: 1500, unlockLevel: 2 },
                stage: { cost: 2000, unlockLevel: 4 },
                discoball: { cost: 300, unlockLevel: 1 },
                laser: { cost: 750, unlockLevel: 3 },

                // Decorations
                statue: { cost: 350, unlockLevel: 1 },
                fountain: { cost: 700, unlockLevel: 3 }
            };
        }

        item = furnitureCatalog[itemId];
        if (!item) {
            return {
                valid: false,
                error: 'INVALID_ITEM',
                message: `Item "${itemId}" does not exist`
            };
        }

        itemCost = item.cost;
        currency = item.currency || 'cash';

        // Check level requirement
        if (item.unlockLevel && state.level < item.unlockLevel) {
            return {
                valid: false,
                error: 'LEVEL_LOCKED',
                message: `Item requires level ${item.unlockLevel}`,
                required: item.unlockLevel,
                current: state.level
            };
        }
    }
    else if (itemType === 'staff') {
        // Staff hiring - calculate cost based on current count
        const staffTypes = {
            bartender: { baseCost: 500, multiplier: 1.5, max: 5 },
            dj: { baseCost: 800, multiplier: 1.6, max: 3 },
            bouncer: { baseCost: 700, multiplier: 1.5, max: 4 },
            promoter: { baseCost: 600, multiplier: 1.6, max: 3 },
            manager: { baseCost: 1200, multiplier: 1.7, max: 2 }
        };

        const staffType = staffTypes[itemId];
        if (!staffType) {
            return {
                valid: false,
                error: 'INVALID_ITEM',
                message: `Staff type "${itemId}" does not exist`
            };
        }

        const currentCount = state.staff[itemId + 's'] || 0;

        // Check max count
        if (currentCount >= staffType.max) {
            return {
                valid: false,
                error: 'MAX_REACHED',
                message: `Maximum ${staffType.max} ${itemId}s already hired`
            };
        }

        // Calculate cost
        itemCost = Math.floor(staffType.baseCost * Math.pow(staffType.multiplier, currentCount));
        currency = 'cash';
    }
    else {
        return {
            valid: false,
            error: 'INVALID_TYPE',
            message: `Unknown item type: ${itemType}`
        };
    }

    // Check if player has enough currency
    const currentBalance = state[currency] || 0;
    if (currentBalance < itemCost) {
        return {
            valid: false,
            error: 'INSUFFICIENT_FUNDS',
            message: `Not enough ${currency}`,
            required: itemCost,
            available: currentBalance
        };
    }

    // Execute purchase
    const newState = { ...state };
    newState[currency] = currentBalance - itemCost;

    if (itemType === 'furniture') {
        newState.furniture = [...(state.furniture || []), {
            id: itemId,
            type: itemId,
            x: metadata.x || 0,
            z: metadata.z || 0,
            rotation: metadata.rotation || 0,
            timestamp: Date.now()
        }];
    } else if (itemType === 'staff') {
        const key = itemId + 's';
        newState.staff = { ...state.staff };
        newState.staff[key] = (state.staff[key] || 0) + 1;
    }

    // Update Firebase
    await updatePlayerState(userId, newState);

    // Log transaction
    await logTransaction(userId, 'purchase', {
        itemType,
        itemId,
        cost: itemCost,
        currency,
        before: state,
        after: newState
    });

    return {
        valid: true,
        newState,
        transaction: {
            itemType,
            itemId,
            cost: itemCost,
            currency,
            newBalance: newState[currency]
        }
    };
}

/**
 * Validate earnings (cash, diamonds, XP)
 */
async function validateEarnings(userId, currency, amount, reason) {
    // Check rate limit
    if (!checkRateLimit(userId, 'earnings')) {
        return {
            valid: false,
            error: 'RATE_LIMIT',
            message: 'Too many earning actions. Please slow down.'
        };
    }

    // Get player state
    const state = await getPlayerState(userId);

    // Validate amount is reasonable
    const maxEarnings = {
        cash: 10000,      // Max $10k per action
        diamonds: 100,    // Max 100 diamonds per action
        xp: 1000          // Max 1000 XP per action
    };

    if (amount > maxEarnings[currency]) {
        return {
            valid: false,
            error: 'SUSPICIOUS_AMOUNT',
            message: `Earning ${amount} ${currency} is suspicious`,
            max: maxEarnings[currency]
        };
    }

    if (amount < 0) {
        return {
            valid: false,
            error: 'NEGATIVE_AMOUNT',
            message: 'Cannot earn negative amounts'
        };
    }

    // Validate reason
    const validReasons = [
        'drink_served', 'guest_tip', 'cover_charge', 'event_bonus',
        'friend_visit', 'daily_reward', 'achievement', 'gift_code',
        'admin_grant', 'compensation', 'game_action'  // Added for general gameplay earnings
    ];

    if (!validReasons.includes(reason)) {
        // Log suspicious activity
        await logViolation(userId, 'invalid_earning_reason', { reason, amount, currency });
    }

    // Execute earning
    const newState = { ...state };
    newState[currency] = (state[currency] || 0) + amount;

    // Special handling for XP - check for level up
    if (currency === 'xp') {
        const xpRequired = calculateXPRequired(state.level);
        if (newState.xp >= xpRequired) {
            // Level up will be handled by separate validation
        }
    }

    // Track transaction in analytics
    await analytics.trackTransaction(userId, 'earning', amount, currency, { reason });

    // Update Firebase
    await updatePlayerState(userId, newState);

    // Log transaction
    await logTransaction(userId, 'earning', {
        currency,
        amount,
        reason,
        before: state[currency],
        after: newState[currency]
    });

    return {
        valid: true,
        newState,
        transaction: {
            currency,
            amount,
            reason,
            newBalance: newState[currency]
        }
    };
}

/**
 * Validate level up
 */
async function validateLevelUp(userId) {
    // Check rate limit
    if (!checkRateLimit(userId, 'levelUp')) {
        return {
            valid: false,
            error: 'RATE_LIMIT',
            message: 'Too many level-up attempts'
        };
    }

    // Get player state
    const state = await getPlayerState(userId);

    // Calculate XP required for next level
    const xpRequired = calculateXPRequired(state.level);

    // Check if player has enough XP
    if (state.xp < xpRequired) {
        return {
            valid: false,
            error: 'INSUFFICIENT_XP',
            message: 'Not enough XP to level up',
            required: xpRequired,
            current: state.xp
        };
    }

    // Execute level up
    const newState = { ...state };
    newState.level = state.level + 1;
    newState.xp = state.xp - xpRequired; // Carry over remaining XP

    // Update Firebase
    await updatePlayerState(userId, newState);

    // Log transaction
    await logTransaction(userId, 'level_up', {
        oldLevel: state.level,
        newLevel: newState.level,
        xpSpent: xpRequired,
        xpRemaining: newState.xp
    });

    return {
        valid: true,
        newState,
        transaction: {
            oldLevel: state.level,
            newLevel: newState.level,
            xpRemaining: newState.xp
        }
    };
}

/**
 * Calculate XP required for level
 */
function calculateXPRequired(currentLevel) {
    const BASE_XP = 100;
    const MULTIPLIER = 1.5;
    return Math.floor(BASE_XP * Math.pow(MULTIPLIER, currentLevel - 1));
}

/**
 * Sync and validate full player state
 */
async function syncState(userId, clientState) {
    // Get server state
    const serverState = await getPlayerState(userId);

    // Compare critical values
    const discrepancies = [];

    const criticalFields = ['cash', 'diamonds', 'level', 'xp'];
    for (const field of criticalFields) {
        const clientValue = clientState[field];
        const serverValue = serverState[field];

        // Allow small differences due to timing
        const difference = Math.abs(clientValue - serverValue);
        const tolerance = field === 'cash' ? 500 : (field === 'xp' ? 100 : 0);

        if (difference > tolerance) {
            discrepancies.push({
                field,
                client: clientValue,
                server: serverValue,
                difference
            });
        }
    }

    // If major discrepancies, log and force server state
    if (discrepancies.length > 0) {
        await logViolation(userId, 'state_mismatch', { discrepancies, clientState, serverState });

        return {
            synced: false,
            serverState,
            discrepancies,
            message: 'State mismatch detected. Server state will be used.'
        };
    }

    return {
        synced: true,
        serverState,
        message: 'State synchronized successfully'
    };
}

/**
 * Log transaction to Firebase
 */
async function logTransaction(userId, action, data) {
    // Use in-memory store if Firebase not configured
    if (!isConfigured) {
        const inMemoryStore = require('./inMemoryStore');
        await inMemoryStore.logTransaction(userId, action, data);
        return;
    }

    await db.ref('logs/transactions').push({
        userId,
        action,
        data,
        timestamp: Date.now(),
        ip: data.ip || 'unknown'
    });
}

/**
 * Log violation to analytics system
 */
async function logViolation(userId, type, details) {
    // Use analytics service for comprehensive tracking
    await analytics.trackViolation(userId, type, details);

    // Fallback to in-memory if Firebase isn't configured
    if (!isConfigured) {
        const inMemoryStore = require('./inMemoryStore');
        await inMemoryStore.logViolation(userId, type, details);
        return;
    }

    try {
        console.log(`🚨 Violation detected: ${type} for user ${userId}`);

        // Log detailed violation with metadata
        await db.ref(`logs/violations/${userId}`).push({
            type,
            details,
            timestamp: Date.now(),
            serverTimestamp: admin.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        console.error('Failed to log violation:', error);
    }
}

module.exports = {
    validatePurchase,
    validateEarnings,
    validateLevelUp,
    syncState,
    getPlayerState,
    invalidateCache,
    checkRateLimit
};
