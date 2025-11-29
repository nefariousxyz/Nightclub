// Statistics Dashboard - Track and display game metrics
export class StatisticsSystem {
    constructor() {
        this.history = {
            earnings: [],
            visitors: [],
            hype: [],
            drinks: []
        };
        this.maxHistory = 30; // Keep 30 data points
        this.recordInterval = 60; // Record every 60 seconds
        this.timeSinceLastRecord = 0;
        
        // Session stats
        this.sessionStart = Date.now();
        this.peakVisitors = 0;
        this.peakHype = 0;
        this.peakEarnings = 0;
    }

    update(delta, gameState) {
        this.timeSinceLastRecord += delta;

        // Update peaks
        if (gameState.visitors && gameState.visitors.length > this.peakVisitors) {
            this.peakVisitors = gameState.visitors.length;
        }
        if (gameState.hype > this.peakHype) {
            this.peakHype = gameState.hype;
        }

        // Record data periodically
        if (this.timeSinceLastRecord >= this.recordInterval) {
            this.recordData(gameState);
            this.timeSinceLastRecord = 0;
        }
    }

    recordData(gameState) {
        const timestamp = Date.now();
        
        this.history.earnings.push({ time: timestamp, value: gameState.totalEarnings || 0 });
        this.history.visitors.push({ time: timestamp, value: gameState.visitors?.length || 0 });
        this.history.hype.push({ time: timestamp, value: gameState.hype || 0 });
        this.history.drinks.push({ time: timestamp, value: gameState.drinksServed || 0 });

        // Trim old data
        Object.keys(this.history).forEach(key => {
            if (this.history[key].length > this.maxHistory) {
                this.history[key] = this.history[key].slice(-this.maxHistory);
            }
        });
    }

    getSessionDuration() {
        const ms = Date.now() - this.sessionStart;
        const minutes = Math.floor(ms / 60000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    getStats(gameState) {
        return {
            sessionDuration: this.getSessionDuration(),
            peakVisitors: this.peakVisitors,
            peakHype: Math.round(this.peakHype),
            totalEarnings: gameState.totalEarnings || 0,
            drinksServed: gameState.drinksServed || 0,
            eventsHosted: gameState.eventsHosted || 0,
            furnitureOwned: gameState.furniture?.length || 0,
            level: gameState.level || 1,
            xp: gameState.xp || 0,
            staffCount: this.countStaff(gameState),
            achievementsUnlocked: gameState.achievements?.length || 0
        };
    }

    countStaff(gameState) {
        if (!gameState.staff) return 0;
        return Object.values(gameState.staff).reduce((sum, count) => sum + count, 0);
    }

    getEarningsPerMinute(gameState) {
        if (this.history.earnings.length < 2) return 0;
        
        const recent = this.history.earnings.slice(-5);
        if (recent.length < 2) return 0;
        
        const first = recent[0];
        const last = recent[recent.length - 1];
        const timeDiff = (last.time - first.time) / 60000; // Convert to minutes
        const earningsDiff = last.value - first.value;
        
        return timeDiff > 0 ? Math.round(earningsDiff / timeDiff) : 0;
    }

    renderStatsModal(gameState) {
        const stats = this.getStats(gameState);
        const epm = this.getEarningsPerMinute(gameState);

        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-card-icon">⏱️</div>
                    <div class="stat-card-value">${stats.sessionDuration}</div>
                    <div class="stat-card-label">Session Time</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">💰</div>
                    <div class="stat-card-value">$${stats.totalEarnings.toLocaleString()}</div>
                    <div class="stat-card-label">Total Earnings</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">📈</div>
                    <div class="stat-card-value">$${epm}/min</div>
                    <div class="stat-card-label">Earnings Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">🍹</div>
                    <div class="stat-card-value">${stats.drinksServed.toLocaleString()}</div>
                    <div class="stat-card-label">Drinks Served</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">👥</div>
                    <div class="stat-card-value">${stats.peakVisitors}</div>
                    <div class="stat-card-label">Peak Visitors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">🔥</div>
                    <div class="stat-card-value">${stats.peakHype}</div>
                    <div class="stat-card-label">Peak Hype</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">🎉</div>
                    <div class="stat-card-value">${stats.eventsHosted}</div>
                    <div class="stat-card-label">Events Hosted</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">🪑</div>
                    <div class="stat-card-value">${stats.furnitureOwned}</div>
                    <div class="stat-card-label">Furniture</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">👔</div>
                    <div class="stat-card-value">${stats.staffCount}</div>
                    <div class="stat-card-label">Staff</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">⭐</div>
                    <div class="stat-card-value">Lv.${stats.level}</div>
                    <div class="stat-card-label">Level</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon">🏆</div>
                    <div class="stat-card-value">${stats.achievementsUnlocked}</div>
                    <div class="stat-card-label">Achievements</div>
                </div>
            </div>
        `;
    }

    save() {
        return {
            history: this.history,
            peakVisitors: this.peakVisitors,
            peakHype: this.peakHype
        };
    }

    load(data) {
        if (data) {
            this.history = data.history || this.history;
            this.peakVisitors = data.peakVisitors || 0;
            this.peakHype = data.peakHype || 0;
        }
    }
}

export const statisticsSystem = new StatisticsSystem();
