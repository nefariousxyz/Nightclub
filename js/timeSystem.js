// Time System - Day/Night cycle affecting gameplay
export class TimeSystem {
    constructor() {
        this.gameHour = 20; // Start at 8 PM
        this.gameMinute = 0;
        this.dayCount = 1;
        this.timeScale = 60; // 1 real second = 1 game minute
        this.accumulator = 0;
        
        // Time periods
        this.periods = {
            earlyNight: { start: 20, end: 23, visitorMod: 0.8, spendMod: 0.9 },
            peakHours: { start: 23, end: 2, visitorMod: 1.5, spendMod: 1.3 },
            lateNight: { start: 2, end: 4, visitorMod: 1.0, spendMod: 1.1 },
            closing: { start: 4, end: 6, visitorMod: 0.3, spendMod: 0.7 },
            closed: { start: 6, end: 20, visitorMod: 0, spendMod: 0 }
        };
    }

    update(delta) {
        this.accumulator += delta;
        
        while (this.accumulator >= 1) {
            this.accumulator -= 1;
            this.advanceMinute();
        }
    }

    advanceMinute() {
        this.gameMinute++;
        
        if (this.gameMinute >= 60) {
            this.gameMinute = 0;
            this.gameHour++;
            
            if (this.gameHour >= 24) {
                this.gameHour = 0;
            }
            
            // New day at 6 AM
            if (this.gameHour === 6) {
                this.newDay();
            }

            // Update UI on hour change
            this.updateTimeDisplay();
        }
    }

    newDay() {
        this.dayCount++;
        
        // Trigger daily reset
        if (window.game) {
            window.game.onNewDay();
        }

        // Show notification
        this.showNewDayNotification();
    }

    showNewDayNotification() {
        const popup = document.createElement('div');
        popup.className = 'day-popup';
        popup.innerHTML = `
            <div class="day-icon">🌅</div>
            <div class="day-info">
                <div class="day-title">Day ${this.dayCount}</div>
                <div class="day-text">A new night begins!</div>
            </div>
        `;
        document.body.appendChild(popup);

        setTimeout(() => popup.classList.add('show'), 100);
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 500);
        }, 3000);
    }

    getCurrentPeriod() {
        const hour = this.gameHour;
        
        for (const [name, period] of Object.entries(this.periods)) {
            if (period.start <= period.end) {
                if (hour >= period.start && hour < period.end) {
                    return { name, ...period };
                }
            } else {
                // Wraps around midnight
                if (hour >= period.start || hour < period.end) {
                    return { name, ...period };
                }
            }
        }
        
        return { name: 'closed', ...this.periods.closed };
    }

    getVisitorModifier() {
        return this.getCurrentPeriod().visitorMod;
    }

    getSpendModifier() {
        return this.getCurrentPeriod().spendMod;
    }

    isOpen() {
        return this.getCurrentPeriod().name !== 'closed';
    }

    getTimeString() {
        const hour12 = this.gameHour % 12 || 12;
        const ampm = this.gameHour >= 12 ? 'PM' : 'AM';
        const min = this.gameMinute.toString().padStart(2, '0');
        return `${hour12}:${min} ${ampm}`;
    }

    getPeriodName() {
        const period = this.getCurrentPeriod();
        const names = {
            earlyNight: '🌆 Early Night',
            peakHours: '🔥 Peak Hours',
            lateNight: '🌙 Late Night',
            closing: '😴 Closing Time',
            closed: '☀️ Closed'
        };
        return names[period.name] || 'Unknown';
    }

    updateTimeDisplay() {
        const timeEl = document.getElementById('game-time');
        const periodEl = document.getElementById('time-period');
        const dayEl = document.getElementById('day-count');
        
        if (timeEl) timeEl.textContent = this.getTimeString();
        if (periodEl) periodEl.textContent = this.getPeriodName();
        if (dayEl) dayEl.textContent = `Day ${this.dayCount}`;
    }

    save() {
        return {
            gameHour: this.gameHour,
            gameMinute: this.gameMinute,
            dayCount: this.dayCount
        };
    }

    load(data) {
        if (data) {
            this.gameHour = data.gameHour ?? 20;
            this.gameMinute = data.gameMinute ?? 0;
            this.dayCount = data.dayCount ?? 1;
        }
        this.updateTimeDisplay();
    }
}

export const timeSystem = new TimeSystem();
