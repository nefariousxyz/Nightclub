// In-Memory Data Store for Development Mode
// Used when Firebase Admin SDK is not configured

class InMemoryDataStore {
    constructor() {
        this.users = new Map();
        this.saves = new Map();
        this.transactions = [];
        this.violations = [];

        console.log('📦 InMemoryDataStore initialized (DEV MODE)');
    }

    /**
     * Get player save data
     */
    async getSave(userId) {
        if (!this.saves.has(userId)) {
            // Return default state for new players
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
                },
                totalEarnings: 0,
                totalVisitors: 0,
                playtime: 0,
                createdAt: Date.now()
            };
        }

        return this.saves.get(userId);
    }

    /**
     * Update player save data
     */
    async updateSave(userId, data) {
        const existing = await this.getSave(userId);
        const updated = {
            ...existing,
            ...data,
            updatedAt: Date.now()
        };

        this.saves.set(userId, updated);
        return updated;
    }

    /**
     * Log transaction
     */
    async logTransaction(userId, action, data) {
        const transaction = {
            userId,
            action,
            data,
            timestamp: Date.now()
        };

        this.transactions.push(transaction);

        // Keep only last 1000 transactions
        if (this.transactions.length > 1000) {
            this.transactions.shift();
        }

        return transaction;
    }

    /**
     * Log violation
     */
    async logViolation(userId, type, details) {
        const violation = {
            userId,
            type,
            details,
            timestamp: Date.now(),
            severity: 'high'
        };

        this.violations.push(violation);

        console.warn(`🚨 Violation logged: ${type} for user ${userId}`);

        return violation;
    }

    /**
     * Get all data (for debugging)
     */
    getAll() {
        return {
            users: Array.from(this.users.entries()),
            saves: Array.from(this.saves.entries()),
            transactions: this.transactions,
            violations: this.violations
        };
    }

    /**
     * Clear all data
     */
    clear() {
        this.users.clear();
        this.saves.clear();
        this.transactions = [];
        this.violations = [];
        console.log('🗑️  InMemoryDataStore cleared');
    }
}

// Export singleton instance
const inMemoryStore = new InMemoryDataStore();

module.exports = inMemoryStore;
