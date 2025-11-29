// ============================================
// COMPETITIVE DAILY REWARDS & MISSIONS SYSTEM
// ============================================

// Daily Login Rewards (7-day streak cycle)
export const LOGIN_REWARDS = [
    { day: 1, cash: 500, xp: 50, diamonds: 0, bonus: null, icon: '📦' },
    { day: 2, cash: 750, xp: 75, diamonds: 0, bonus: null, icon: '📦' },
    { day: 3, cash: 1000, xp: 100, diamonds: 5, bonus: null, icon: '💎' },
    { day: 4, cash: 1500, xp: 150, diamonds: 0, bonus: null, icon: '📦' },
    { day: 5, cash: 2000, xp: 200, diamonds: 10, bonus: 'mystery_box', icon: '🎁' },
    { day: 6, cash: 3000, xp: 300, diamonds: 0, bonus: null, icon: '📦' },
    { day: 7, cash: 5000, xp: 500, diamonds: 25, bonus: 'mega_reward', icon: '👑' }
];

// Tiered Daily Missions
export const DAILY_MISSIONS = {
    easy: [
        { id: 'login_today', name: 'Show Up', desc: 'Log in to the game', target: 1, type: 'login', cash: 100, xp: 25, icon: '✅' },
        { id: 'earn_500', name: 'Quick Cash', desc: 'Earn $500', target: 500, type: 'earnings', cash: 150, xp: 30, icon: '💵' },
        { id: 'serve_20', name: 'Bartender', desc: 'Serve 20 drinks', target: 20, type: 'drinks', cash: 100, xp: 25, icon: '🍹' },
        { id: 'visitors_10', name: 'Welcome', desc: 'Have 10 visitors', target: 10, type: 'visitors', cash: 100, xp: 25, icon: '👋' },
        { id: 'play_5min', name: 'Hang Out', desc: 'Play for 5 minutes', target: 5, type: 'playtime', cash: 100, xp: 25, icon: '⏱️' }
    ],
    medium: [
        { id: 'earn_2000', name: 'Money Maker', desc: 'Earn $2,000', target: 2000, type: 'earnings', cash: 400, xp: 75, icon: '💰' },
        { id: 'serve_75', name: 'Mixologist', desc: 'Serve 75 drinks', target: 75, type: 'drinks', cash: 350, xp: 60, icon: '🍸' },
        { id: 'visitors_50', name: 'Popular Spot', desc: 'Have 50 visitors', target: 50, type: 'visitors', cash: 400, xp: 75, icon: '👥' },
        { id: 'hype_60', name: 'Getting Hyped', desc: 'Reach 60 hype', target: 60, type: 'hype', cash: 350, xp: 60, icon: '🔥' },
        { id: 'buy_furniture', name: 'Interior Designer', desc: 'Buy 2 furniture items', target: 2, type: 'purchases', cash: 400, xp: 75, icon: '🪑' },
        { id: 'visit_2_friends', name: 'Social', desc: 'Visit 2 friend clubs', target: 2, type: 'friendVisits', cash: 350, xp: 60, icon: '👫' }
    ],
    hard: [
        { id: 'earn_5000', name: 'Big Earner', desc: 'Earn $5,000', target: 5000, type: 'earnings', cash: 1000, xp: 200, diamonds: 5, icon: '🤑' },
        { id: 'serve_150', name: 'Bar Legend', desc: 'Serve 150 drinks', target: 150, type: 'drinks', cash: 800, xp: 150, diamonds: 3, icon: '🏆' },
        { id: 'hype_90', name: 'Hype King', desc: 'Reach 90 hype', target: 90, type: 'hype', cash: 900, xp: 175, diamonds: 5, icon: '👑' },
        { id: 'host_event', name: 'Party Starter', desc: 'Host a special event', target: 1, type: 'events', cash: 1000, xp: 200, diamonds: 5, icon: '🎉' },
        { id: 'complete_all', name: 'Completionist', desc: 'Complete all other missions', target: 1, type: 'allComplete', cash: 2000, xp: 400, diamonds: 10, icon: '⭐' }
    ]
};

// Bonus Wheel Prizes
export const WHEEL_PRIZES = [
    { label: '$500', type: 'cash', value: 500, color: '#22c55e', chance: 25 },
    { label: '$1,000', type: 'cash', value: 1000, color: '#16a34a', chance: 20 },
    { label: '$2,500', type: 'cash', value: 2500, color: '#15803d', chance: 10 },
    { label: '5 💎', type: 'diamonds', value: 5, color: '#8b5cf6', chance: 15 },
    { label: '15 💎', type: 'diamonds', value: 15, color: '#7c3aed', chance: 8 },
    { label: '+50 XP', type: 'xp', value: 50, color: '#3b82f6', chance: 15 },
    { label: '2x Bonus', type: 'multiplier', value: 2, color: '#f59e0b', chance: 5 },
    { label: 'JACKPOT', type: 'jackpot', value: 10000, color: '#ef4444', chance: 2 }
];

export class ChallengeSystem {
    constructor() {
        // Daily Missions
        this.activeMissions = { easy: [], medium: [], hard: [] };
        this.progress = {};
        this.completedToday = [];
        
        // Login Streak
        this.loginStreak = 0;
        this.lastLoginDate = null;
        this.claimedLoginToday = false;
        
        // Bonus Wheel
        this.freeSpinsToday = 1;
        this.spinsUsedToday = 0;
        
        // Multiplier
        this.activeMultiplier = 1;
        this.multiplierExpiry = null;
        
        // Stats
        this.totalMissionsCompleted = 0;
        this.currentDayStreak = 0;
        this.bestDayStreak = 0;
        
        this.lastResetDay = this.getCurrentDay();
    }

    getCurrentDay() {
        return new Date().toDateString();
    }

    getTimeUntilReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const diff = tomorrow - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return { hours, mins, total: diff };
    }

    init(fromLoad = false) {
        const today = this.getCurrentDay();
        
        // Check for daily reset (only if it's actually a new day)
        if (this.lastResetDay && this.lastResetDay !== today) {
            this.resetDaily();
        }
        
        // Select missions if none active
        if (this.activeMissions.easy.length === 0) {
            this.selectDailyMissions();
        }
        
        // Auto-complete login mission (only on fresh init, not when loading saved data)
        if (!fromLoad) {
            this.updateProgress('login', 1);
        }
    }

    resetDaily() {
        // Check login streak
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        if (this.lastLoginDate === yesterdayStr) {
            this.loginStreak++;
            this.currentDayStreak++;
            if (this.currentDayStreak > this.bestDayStreak) {
                this.bestDayStreak = this.currentDayStreak;
            }
        } else if (this.lastLoginDate !== this.getCurrentDay()) {
            // Streak broken
            this.loginStreak = 1;
            this.currentDayStreak = 1;
        }
        
        // Reset daily data
        this.activeMissions = { easy: [], medium: [], hard: [] };
        this.progress = {};
        this.completedToday = [];
        this.claimedLoginToday = false;
        this.spinsUsedToday = 0;
        this.freeSpinsToday = 1 + Math.floor(this.loginStreak / 7); // Bonus spin per week streak
        this.lastResetDay = this.getCurrentDay();
        this.lastLoginDate = this.getCurrentDay();
        
        this.selectDailyMissions();
    }

    selectDailyMissions() {
        // Select 2 easy, 2 medium, 1 hard mission
        const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
        
        this.activeMissions.easy = shuffle(DAILY_MISSIONS.easy).slice(0, 2);
        this.activeMissions.medium = shuffle(DAILY_MISSIONS.medium).slice(0, 2);
        this.activeMissions.hard = shuffle(DAILY_MISSIONS.hard).slice(0, 1);
        
        // Initialize progress
        [...this.activeMissions.easy, ...this.activeMissions.medium, ...this.activeMissions.hard].forEach(m => {
            this.progress[m.id] = 0;
        });
    }

    // ========== LOGIN REWARDS ==========
    
    getLoginReward() {
        const dayIndex = ((this.loginStreak - 1) % 7);
        return LOGIN_REWARDS[dayIndex];
    }
    
    canClaimLoginReward() {
        return !this.claimedLoginToday;
    }
    
    claimLoginReward() {
        if (this.claimedLoginToday) return null;
        
        const reward = this.getLoginReward();
        this.claimedLoginToday = true;
        
        // Apply rewards with streak multiplier
        const streakBonus = 1 + (Math.floor(this.loginStreak / 7) * 0.1); // +10% per week
        const finalCash = Math.floor(reward.cash * streakBonus);
        const finalXP = Math.floor(reward.xp * streakBonus);
        
        if (window.game) {
            window.game.addCash(finalCash);
            window.game.addXP(finalXP);
            if (reward.diamonds > 0) {
                window.game.diamonds = (window.game.diamonds || 0) + reward.diamonds;
            }
        }
        
        // Show notification instead of popup
        this.showNotification(`🎁 Day ${((this.loginStreak - 1) % 7) + 1} Reward!`, `+$${finalCash.toLocaleString()} | +${finalXP} XP${reward.diamonds > 0 ? ` | +${reward.diamonds}💎` : ''}`);
        
        return { ...reward, cash: finalCash, xp: finalXP };
    }

    // ========== MISSIONS ==========
    
    updateProgress(type, amount = 1) {
        const allMissions = [
            ...this.activeMissions.easy,
            ...this.activeMissions.medium,
            ...this.activeMissions.hard
        ];
        
        allMissions.forEach(mission => {
            if (mission.type === type && !this.completedToday.includes(mission.id)) {
                this.progress[mission.id] = (this.progress[mission.id] || 0) + amount;
                
                if (this.progress[mission.id] >= mission.target) {
                    this.completeMission(mission);
                }
            }
        });
        
        // Check for "complete all" mission
        this.checkAllComplete();
    }

    setProgress(type, value) {
        const allMissions = [
            ...this.activeMissions.easy,
            ...this.activeMissions.medium,
            ...this.activeMissions.hard
        ];
        
        allMissions.forEach(mission => {
            if (mission.type === type && !this.completedToday.includes(mission.id)) {
                this.progress[mission.id] = value;
                
                if (this.progress[mission.id] >= mission.target) {
                    this.completeMission(mission);
                }
            }
        });
    }

    checkAllComplete() {
        const nonCompletionistMissions = [
            ...this.activeMissions.easy,
            ...this.activeMissions.medium,
            ...this.activeMissions.hard.filter(m => m.type !== 'allComplete')
        ];
        
        const allDone = nonCompletionistMissions.every(m => this.completedToday.includes(m.id));
        
        if (allDone) {
            const completionistMission = this.activeMissions.hard.find(m => m.type === 'allComplete');
            if (completionistMission && !this.completedToday.includes(completionistMission.id)) {
                this.progress[completionistMission.id] = 1;
                this.completeMission(completionistMission);
            }
        }
    }

    completeMission(mission) {
        if (this.completedToday.includes(mission.id)) return;
        
        this.completedToday.push(mission.id);
        this.totalMissionsCompleted++;
        
        // Apply multiplier to rewards
        const mult = this.activeMultiplier;
        const finalCash = Math.floor((mission.cash || 0) * mult);
        const finalXP = Math.floor((mission.xp || 0) * mult);
        
        if (window.game) {
            window.game.addCash(finalCash);
            window.game.addXP(finalXP);
            if (mission.diamonds) {
                window.game.diamonds = (window.game.diamonds || 0) + mission.diamonds;
            }
        }
        
        // Show notification instead of popup
        this.showNotification(`${mission.icon} ${mission.name} Complete!`, `+$${finalCash.toLocaleString()} | +${finalXP} XP${mission.diamonds ? ` | +${mission.diamonds}💎` : ''}`);
        
        // Check for bonus spin reward (every 3 missions)
        if (this.completedToday.length % 3 === 0) {
            this.freeSpinsToday++;
            this.showNotification('🎡 Bonus Spin Earned!', 'Complete more missions for extra spins!');
        }
    }

    // ========== BONUS WHEEL ==========
    
    canSpin() {
        return this.spinsUsedToday < this.freeSpinsToday;
    }
    
    getSpinsRemaining() {
        return Math.max(0, this.freeSpinsToday - this.spinsUsedToday);
    }
    
    spin() {
        if (!this.canSpin()) return null;
        
        this.spinsUsedToday++;
        
        // Weighted random selection
        const totalChance = WHEEL_PRIZES.reduce((sum, p) => sum + p.chance, 0);
        let random = Math.random() * totalChance;
        
        for (const prize of WHEEL_PRIZES) {
            random -= prize.chance;
            if (random <= 0) {
                this.applyPrize(prize);
                return prize;
            }
        }
        
        return WHEEL_PRIZES[0]; // Fallback
    }
    
    applyPrize(prize) {
        if (!window.game) return;
        
        switch (prize.type) {
            case 'cash':
                window.game.addCash(prize.value);
                break;
            case 'diamonds':
                window.game.diamonds = (window.game.diamonds || 0) + prize.value;
                break;
            case 'xp':
                window.game.addXP(prize.value);
                break;
            case 'multiplier':
                this.activeMultiplier = prize.value;
                this.multiplierExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes
                this.showNotification('🚀 2X BONUS ACTIVE!', 'All rewards doubled for 30 minutes!');
                break;
            case 'jackpot':
                window.game.addCash(prize.value);
                window.game.diamonds = (window.game.diamonds || 0) + 50;
                this.showNotification('🎰 JACKPOT!!!', 'You won $10,000 + 50 Diamonds!');
                break;
        }
    }

    // ========== UI HELPERS ==========
    
    getMissions() {
        const format = (mission, tier) => ({
            ...mission,
            tier,
            progress: this.progress[mission.id] || 0,
            completed: this.completedToday.includes(mission.id)
        });
        
        return {
            easy: this.activeMissions.easy.map(m => format(m, 'easy')),
            medium: this.activeMissions.medium.map(m => format(m, 'medium')),
            hard: this.activeMissions.hard.map(m => format(m, 'hard'))
        };
    }

    // Backward compatibility for old API
    getChallenges() {
        const allMissions = [
            ...this.activeMissions.easy,
            ...this.activeMissions.medium,
            ...this.activeMissions.hard
        ];
        
        return allMissions.map(m => ({
            ...m,
            reward: m.cash || 0,
            progress: this.progress[m.id] || 0,
            completed: this.completedToday.includes(m.id)
        }));
    }

    getCompletedCount() {
        return this.completedToday.length;
    }
    
    getTotalMissions() {
        return this.activeMissions.easy.length + 
               this.activeMissions.medium.length + 
               this.activeMissions.hard.length;
    }

    getStats() {
        return {
            loginStreak: this.loginStreak,
            currentDayStreak: this.currentDayStreak,
            bestDayStreak: this.bestDayStreak,
            totalMissionsCompleted: this.totalMissionsCompleted,
            completedToday: this.completedToday.length,
            totalToday: this.getTotalMissions(),
            spinsRemaining: this.getSpinsRemaining(),
            multiplier: this.activeMultiplier,
            multiplierExpiry: this.multiplierExpiry
        };
    }

    showNotification(title, message) {
        // Use the game's NotificationSystem
        if (window.sendNotification) {
            window.sendNotification('reward', title, message, {});
        } else if (window.NotificationSystem?.add) {
            window.NotificationSystem.add('reward', title, message, {});
        } else {
            // Fallback: create simple toast notification
            const toast = document.createElement('div');
            toast.className = 'challenge-toast';
            toast.innerHTML = `<strong>${title}</strong><br>${message}`;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 50);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3500);
        }
    }

    // ========== SAVE/LOAD ==========
    
    save() {
        return {
            activeMissions: this.activeMissions,
            progress: this.progress,
            completedToday: this.completedToday,
            loginStreak: this.loginStreak,
            lastLoginDate: this.lastLoginDate,
            claimedLoginToday: this.claimedLoginToday,
            freeSpinsToday: this.freeSpinsToday,
            spinsUsedToday: this.spinsUsedToday,
            activeMultiplier: this.activeMultiplier,
            multiplierExpiry: this.multiplierExpiry,
            totalMissionsCompleted: this.totalMissionsCompleted,
            currentDayStreak: this.currentDayStreak,
            bestDayStreak: this.bestDayStreak,
            lastResetDay: this.lastResetDay
        };
    }

    load(data) {
        if (data) {
            this.activeMissions = data.activeMissions || { easy: [], medium: [], hard: [] };
            this.progress = data.progress || {};
            this.completedToday = data.completedToday || [];
            this.loginStreak = data.loginStreak || 0;
            this.lastLoginDate = data.lastLoginDate || null;
            this.claimedLoginToday = data.claimedLoginToday || false;
            this.freeSpinsToday = data.freeSpinsToday || 1;
            this.spinsUsedToday = data.spinsUsedToday || 0;
            this.activeMultiplier = data.activeMultiplier || 1;
            this.multiplierExpiry = data.multiplierExpiry || null;
            this.totalMissionsCompleted = data.totalMissionsCompleted || 0;
            this.currentDayStreak = data.currentDayStreak || 0;
            this.bestDayStreak = data.bestDayStreak || 0;
            this.lastResetDay = data.lastResetDay || this.getCurrentDay();
            
            // Check multiplier expiry
            if (this.multiplierExpiry && Date.now() > this.multiplierExpiry) {
                this.activeMultiplier = 1;
                this.multiplierExpiry = null;
            }
        }
        // Call init but flag that we're loading from save
        this.init(true);
    }
}

export const challengeSystem = new ChallengeSystem();

// Expose to window for global access
window.challengeSystem = challengeSystem;

// Global refresh function for UI
window.refreshChallenges = function() {
    const container = document.getElementById('challenges-list');
    if (!container) return;
    
    const cs = challengeSystem;
    const missions = cs.getMissions();
    const stats = cs.getStats();
    const time = cs.getTimeUntilReset();
    
    container.innerHTML = `
        <!-- Daily Login Section -->
        <div class="daily-section login-section">
            <div class="section-header">
                <span class="section-title">🎁 DAILY LOGIN</span>
                <span class="streak-display">🔥 ${stats.loginStreak} Day Streak</span>
            </div>
            ${cs.canClaimLoginReward() ? `
                <button class="claim-login-btn" onclick="challengeSystem.claimLoginReward(); refreshChallenges();">
                    <span>CLAIM DAY ${((stats.loginStreak) % 7) + 1} REWARD</span>
                    <span class="reward-preview">💵 +${LOGIN_REWARDS[stats.loginStreak % 7].cash} | ⭐ +${LOGIN_REWARDS[stats.loginStreak % 7].xp} XP</span>
                </button>
            ` : `
                <div class="login-claimed">✅ Today's reward claimed! Come back tomorrow.</div>
            `}
            <div class="week-progress">
                ${LOGIN_REWARDS.map((r, i) => `
                    <div class="day-box ${i < (stats.loginStreak % 7) || (stats.loginStreak > 0 && i === 0 && stats.loginStreak % 7 === 0) ? 'completed' : ''} ${i === (stats.loginStreak % 7) && cs.claimedLoginToday ? 'today' : ''}">
                        <span class="day-num">D${i + 1}</span>
                        <span class="day-icon">${r.icon}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- Bonus Wheel Section -->
        <div class="daily-section wheel-section">
            <div class="section-header">
                <span class="section-title">🎡 BONUS WHEEL</span>
                <span class="spins-display">${stats.spinsRemaining} Spins Left</span>
            </div>
            <button class="spin-btn ${!cs.canSpin() ? 'disabled' : ''}" onclick="spinWheel()" ${!cs.canSpin() ? 'disabled' : ''}>
                ${cs.canSpin() ? '🎰 SPIN NOW!' : '❌ No Spins Left'}
            </button>
            ${stats.multiplier > 1 ? `<div class="multiplier-active">🚀 ${stats.multiplier}X BONUS ACTIVE!</div>` : ''}
        </div>

        <!-- Timer -->
        <div class="reset-timer">
            ⏰ Resets in ${time.hours}h ${time.mins}m
        </div>

        <!-- Missions Section -->
        <div class="missions-header">
            <span>📋 DAILY MISSIONS</span>
            <span class="progress-count">${stats.completedToday}/${stats.totalToday} Complete</span>
        </div>

        ${renderMissionTier('Easy', missions.easy, '#22c55e')}
        ${renderMissionTier('Medium', missions.medium, '#f59e0b')}
        ${renderMissionTier('Hard', missions.hard, '#ef4444')}

        <!-- All Complete Bonus -->
        ${stats.completedToday === stats.totalToday ? `
            <div class="all-complete-bonus">
                🏆 ALL MISSIONS COMPLETE! +Bonus Spin Earned!
            </div>
        ` : ''}
    `;
};

function renderMissionTier(tierName, missions, color) {
    return `
        <div class="mission-tier">
            <div class="tier-label" style="background: ${color}">${tierName}</div>
            ${missions.map(m => `
                <div class="mission-item ${m.completed ? 'completed' : ''}">
                    <div class="mission-icon">${m.icon}</div>
                    <div class="mission-info">
                        <div class="mission-name">${m.name}</div>
                        <div class="mission-desc">${m.desc}</div>
                        <div class="mission-progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(100, (m.progress / m.target) * 100)}%; background: ${color}"></div>
                        </div>
                        <div class="mission-progress-text">${m.progress}/${m.target}</div>
                    </div>
                    <div class="mission-rewards">
                        <span class="reward-cash">$${m.cash}</span>
                        ${m.diamonds ? `<span class="reward-diamonds">${m.diamonds}💎</span>` : ''}
                    </div>
                    ${m.completed ? '<div class="mission-check">✅</div>' : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// Spin wheel function
window.spinWheel = function() {
    const prize = challengeSystem.spin();
    if (!prize) return;
    
    // Show spinning notification then result
    challengeSystem.showNotification('🎰 Spinning...', '');
    
    setTimeout(() => {
        let prizeText = prize.label;
        if (prize.type === 'jackpot') {
            prizeText = '$10,000 + 50💎 JACKPOT!';
        } else if (prize.type === 'multiplier') {
            prizeText = '2X Bonus for 30 min!';
        }
        challengeSystem.showNotification('🎡 You Won!', prizeText);
        refreshChallenges();
    }, 1000);
};
