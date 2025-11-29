// Achievements System
import { ui } from './ui.js';

export const ACHIEVEMENTS = [
    // Money achievements
    { id: 'first_100', name: 'Pocket Change', desc: 'Earn your first $100', icon: '💵', check: g => g.totalEarnings >= 100 },
    { id: 'first_1k', name: 'Getting Started', desc: 'Earn $1,000 total', icon: '💰', check: g => g.totalEarnings >= 1000 },
    { id: 'first_10k', name: 'Money Maker', desc: 'Earn $10,000 total', icon: '🤑', check: g => g.totalEarnings >= 10000 },
    { id: 'first_100k', name: 'Club Mogul', desc: 'Earn $100,000 total', icon: '👑', check: g => g.totalEarnings >= 100000 },
    
    // Drink achievements
    { id: 'drinks_10', name: 'Bartender Rookie', desc: 'Serve 10 drinks', icon: '🍺', check: g => g.totalDrinksServed >= 10 },
    { id: 'drinks_100', name: 'Mix Master', desc: 'Serve 100 drinks', icon: '🍸', check: g => g.totalDrinksServed >= 100 },
    { id: 'drinks_500', name: 'Cocktail King', desc: 'Serve 500 drinks', icon: '🍹', check: g => g.totalDrinksServed >= 500 },
    { id: 'drinks_1000', name: 'Legendary Bartender', desc: 'Serve 1,000 drinks', icon: '🏆', check: g => g.totalDrinksServed >= 1000 },
    
    // Visitor achievements
    { id: 'visitors_50', name: 'Popular Spot', desc: 'Host 50 guests total', icon: '👤', check: g => g.totalVisitors >= 50 },
    { id: 'visitors_200', name: 'Crowd Favorite', desc: 'Host 200 guests total', icon: '👥', check: g => g.totalVisitors >= 200 },
    { id: 'visitors_1000', name: 'Party Legend', desc: 'Host 1,000 guests total', icon: '🎉', check: g => g.totalVisitors >= 1000 },
    
    // Level achievements
    { id: 'level_5', name: 'Rising Star', desc: 'Reach level 5', icon: '⭐', check: g => g.level >= 5 },
    { id: 'level_10', name: 'Club Star', desc: 'Reach level 10', icon: '🌟', check: g => g.level >= 10 },
    { id: 'level_25', name: 'Nightlife Icon', desc: 'Reach level 25', icon: '✨', check: g => g.level >= 25 },
    { id: 'level_50', name: 'Party God', desc: 'Reach level 50', icon: '🌠', check: g => g.level >= 50 },
    
    // Staff achievements
    { id: 'first_staff', name: 'First Hire', desc: 'Hire your first staff member', icon: '👔', check: g => (g.staff.bartenders + g.staff.djs + g.staff.bouncers) >= 1 },
    { id: 'full_team', name: 'Dream Team', desc: 'Have 5+ staff members', icon: '👥', check: g => (g.staff.bartenders + g.staff.djs + g.staff.bouncers) >= 5 },
    
    // Furniture achievements
    { id: 'furniture_10', name: 'Interior Designer', desc: 'Place 10 furniture items', icon: '🪑', check: g => g.furniture.length >= 10 },
    { id: 'furniture_25', name: 'Club Architect', desc: 'Place 25 furniture items', icon: '🏗️', check: g => g.furniture.length >= 25 },
    
    // Special achievements
    { id: 'first_event', name: 'Party Starter', desc: 'Host your first event', icon: '🎊', check: g => g.eventsHosted >= 1 },
    { id: 'events_10', name: 'Event Planner', desc: 'Host 10 events', icon: '🎪', check: g => g.eventsHosted >= 10 },
    { id: 'play_1hr', name: 'Dedicated Owner', desc: 'Play for 1 hour', icon: '⏰', check: g => g.playTime >= 3600 },
    { id: 'play_10hr', name: 'Club Addict', desc: 'Play for 10 hours', icon: '🕐', check: g => g.playTime >= 36000 },
    
    // Hype achievements
    { id: 'hype_50', name: 'Getting Noticed', desc: 'Reach 50 hype', icon: '📢', check: g => g.hype >= 50 },
    { id: 'hype_100', name: 'Trending', desc: 'Reach 100 hype', icon: '🔥', check: g => g.hype >= 100 },
    { id: 'hype_500', name: 'Viral Sensation', desc: 'Reach 500 hype', icon: '💥', check: g => g.hype >= 500 }
];

export class AchievementSystem {
    constructor() {
        this.unlocked = [];
    }

    loadUnlocked(achievements) {
        this.unlocked = achievements || [];
    }

    check(gameState) {
        const newAchievements = [];
        
        for (const achievement of ACHIEVEMENTS) {
            if (!this.unlocked.includes(achievement.id)) {
                if (achievement.check(gameState)) {
                    this.unlocked.push(achievement.id);
                    newAchievements.push(achievement);
                }
            }
        }

        // Show notifications for new achievements
        newAchievements.forEach(a => {
            ui.notify(`🏆 Achievement: ${a.name}!`, 'success');
            this.showAchievementPopup(a);
        });

        return this.unlocked;
    }

    showAchievementPopup(achievement) {
        const popup = document.createElement('div');
        popup.className = 'achievement-popup';
        popup.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.desc}</div>
            </div>
        `;
        document.body.appendChild(popup);

        setTimeout(() => {
            popup.classList.add('show');
        }, 100);

        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 500);
        }, 4000);
    }

    getProgress() {
        return {
            unlocked: this.unlocked.length,
            total: ACHIEVEMENTS.length,
            percentage: Math.round((this.unlocked.length / ACHIEVEMENTS.length) * 100)
        };
    }

    getAllAchievements() {
        return ACHIEVEMENTS.map(a => ({
            ...a,
            unlocked: this.unlocked.includes(a.id)
        }));
    }
}

export const achievementSystem = new AchievementSystem();
