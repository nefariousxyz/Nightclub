// VIP Guest System - Special celebrities that boost hype
import * as THREE from 'three';

const CELEBRITIES = [
    { name: 'DJ Snake', icon: '🎧', hypeBoost: 50, cashBonus: 500, duration: 60 },
    { name: 'Paris Hilton', icon: '👸', hypeBoost: 40, cashBonus: 400, duration: 45 },
    { name: 'Drake', icon: '🎤', hypeBoost: 60, cashBonus: 600, duration: 50 },
    { name: 'Kylie Jenner', icon: '💄', hypeBoost: 45, cashBonus: 450, duration: 40 },
    { name: 'The Weeknd', icon: '🌟', hypeBoost: 55, cashBonus: 550, duration: 55 },
    { name: 'Rihanna', icon: '💎', hypeBoost: 65, cashBonus: 650, duration: 60 },
    { name: 'Post Malone', icon: '🎸', hypeBoost: 50, cashBonus: 500, duration: 45 },
    { name: 'Dua Lipa', icon: '🎵', hypeBoost: 45, cashBonus: 450, duration: 50 }
];

export class VIPSystem {
    constructor() {
        this.currentVIP = null;
        this.vipTimer = 0;
        this.nextVIPTime = 120 + Math.random() * 180; // 2-5 minutes
        this.totalVIPVisits = 0;
    }

    update(delta, gameState) {
        // Count down to next VIP
        this.nextVIPTime -= delta;

        // Spawn VIP if time and conditions met
        if (this.nextVIPTime <= 0 && !this.currentVIP && gameState.hype >= 30) {
            this.spawnVIP(gameState);
        }

        // Update current VIP
        if (this.currentVIP) {
            this.vipTimer -= delta;
            
            // Apply continuous bonuses
            if (this.vipTimer > 0) {
                gameState.hype = Math.min(100, gameState.hype + delta * 0.5);
            } else {
                this.vipLeaves(gameState);
            }
        }
    }

    spawnVIP(gameState) {
        const celeb = CELEBRITIES[Math.floor(Math.random() * CELEBRITIES.length)];
        this.currentVIP = { ...celeb };
        this.vipTimer = celeb.duration;
        this.totalVIPVisits++;

        // Apply immediate bonuses
        gameState.hype = Math.min(100, gameState.hype + celeb.hypeBoost);
        gameState.addCash(celeb.cashBonus);

        // Show notification
        this.showVIPArrival(celeb);

        // Schedule next VIP
        this.nextVIPTime = 180 + Math.random() * 300; // 3-8 minutes
    }

    showVIPArrival(celeb) {
        const popup = document.createElement('div');
        popup.className = 'vip-popup';
        popup.innerHTML = `
            <div class="vip-icon">${celeb.icon}</div>
            <div class="vip-info">
                <div class="vip-name">${celeb.name}</div>
                <div class="vip-text">is in the club!</div>
                <div class="vip-bonus">+${celeb.hypeBoost} Hype | +$${celeb.cashBonus}</div>
            </div>
        `;
        document.body.appendChild(popup);

        setTimeout(() => popup.classList.add('show'), 100);
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 500);
        }, 4000);
    }

    vipLeaves(gameState) {
        if (this.currentVIP) {
            const name = this.currentVIP.name;
            this.currentVIP = null;
            
            // Notify
            if (window.game && window.game.ui) {
                window.game.ui.notify(`${name} has left the club`, 'info');
            }
        }
    }

    getCurrentVIP() {
        return this.currentVIP;
    }

    getTimeRemaining() {
        return Math.max(0, Math.floor(this.vipTimer));
    }
}

export const vipSystem = new VIPSystem();
