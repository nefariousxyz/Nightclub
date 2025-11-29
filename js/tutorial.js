// Tutorial/Onboarding System
import { ui } from './ui.js';
import { audioManager } from './audio.js';

const TUTORIAL_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Nightclub City! 🎉',
        message: 'You are the new owner! Let\'s build the hottest club in town. Here is a quick tour.',
        highlight: null,
        position: 'center'
    },
    {
        id: 'resources',
        title: 'Cash & Gems 💰',
        message: 'Money makes the club go round! Use Cash for basics and Gems for premium items.',
        highlight: '.resource-bar.cash',
        position: 'bottom'
    },
    {
        id: 'guests',
        title: 'Guest Capacity 👥',
        message: 'This shows how many party-goers are in your club. Upgrade your club tier to hold more!',
        highlight: '#guests-display',
        position: 'bottom'
    },
    {
        id: 'bar_stock',
        title: 'Keep it Flowing 🍸',
        message: 'Guests get thirsty! Keep your bar stocked to earn cash. If it hits 0, you stop making money!',
        highlight: '#stock-box',
        position: 'bottom'
    },
    {
        id: 'shop',
        title: 'Shop & Decor 🛒',
        message: 'Buy furniture, lights, and decorations here. A better looking club attracts more high-paying guests.',
        highlight: '.toolbar-btn.shop',
        position: 'top'
    },
    {
        id: 'staff',
        title: 'Hire Staff 👔',
        message: 'You can\'t do it all alone! Hire bartenders, bouncers, and promoters to automate your club.',
        highlight: '.toolbar-btn.staff',
        position: 'top'
    },
    {
        id: 'dj',
        title: 'DJ Booth 🎧',
        message: 'The music controls the vibe! Unlock better DJs to boost your Hype and earnings.',
        highlight: '.toolbar-btn.music',
        position: 'top'
    },
    {
        id: 'edit_mode',
        title: 'Edit Mode 🔨',
        message: 'Rearrange your club layout anytime. Tap here to move or sell furniture.',
        highlight: '#btn-mode',
        position: 'left'
    },
    {
        id: 'chat',
        title: 'Global Chat 💬',
        message: 'Connect with other club owners worldwide! Share tips, make friends, and visit other clubs.',
        highlight: '#chat-dock-btn',
        position: 'top'
    },
    {
        id: 'cloud',
        title: 'Cloud Save ☁️',
        message: 'Don\'t lose your progress! Your game saves automatically, but you can force a save here.',
        highlight: '.account-btn',
        position: 'left'
    },
    {
        id: 'complete',
        title: 'Ready to Party! 🚀',
        message: 'You have the keys now. Open your doors and start your legacy. Have fun!',
        highlight: null,
        position: 'center'
    }
];

export class TutorialSystem {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.onComplete = null;
        this.resizeHandler = this.handleResize.bind(this);
    }

    start(onComplete) {
        if (this.isActive) return;
        
        this.onComplete = onComplete;
        this.currentStep = 0;
        this.isActive = true;
        this.createOverlay();
        
        // Add resize listener
        window.addEventListener('resize', this.resizeHandler);
        
        // Small delay to ensure UI is ready
        setTimeout(() => this.showStep(0), 100);
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        this.overlay.innerHTML = `
            <div class="tutorial-backdrop"></div>
            <div class="tutorial-spotlight"></div>
            <div class="tutorial-card">
                <div class="tutorial-header">
                    <span class="tutorial-title"></span>
                    <span class="tutorial-step-count"></span>
                </div>
                <div class="tutorial-content"></div>
                <div class="tutorial-actions">
                    <button class="tutorial-btn secondary tutorial-skip">Skip Tour</button>
                    <button class="tutorial-btn primary tutorial-next">Next ➜</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        this.overlay.querySelector('.tutorial-next').addEventListener('click', () => this.nextStep());
        this.overlay.querySelector('.tutorial-skip').addEventListener('click', () => this.skip());
    }

    showStep(index) {
        if (index >= TUTORIAL_STEPS.length) {
            this.complete();
            return;
        }

        const step = TUTORIAL_STEPS[index];
        this.currentStep = index;

        const card = this.overlay.querySelector('.tutorial-card');
        const title = this.overlay.querySelector('.tutorial-title');
        const content = this.overlay.querySelector('.tutorial-content');
        const count = this.overlay.querySelector('.tutorial-step-count');
        const nextBtn = this.overlay.querySelector('.tutorial-next');
        const spotlight = this.overlay.querySelector('.tutorial-spotlight');

        // Update Content
        title.textContent = step.title;
        content.textContent = step.message;
        count.textContent = `${index + 1}/${TUTORIAL_STEPS.length}`;
        nextBtn.textContent = index === TUTORIAL_STEPS.length - 1 ? 'Let\'s Go!' : 'Next ➜';

        // Reset styles
        spotlight.style.opacity = '0';
        card.style.opacity = '0'; // Fade out for transition

        setTimeout(() => {
            // Handle Positioning
            if (step.highlight) {
                const target = document.querySelector(step.highlight);
                if (target) {
                    const rect = target.getBoundingClientRect();
                    
                    // Set spotlight
                    spotlight.style.opacity = '1';
                    spotlight.style.left = `${rect.left}px`;
                    spotlight.style.top = `${rect.top}px`;
                    spotlight.style.width = `${rect.width}px`;
                    spotlight.style.height = `${rect.height}px`;
                    
                    // Position Card smartly
                    this.positionCard(card, rect, step.position);
                } else {
                    // Fallback to center if target missing
                    this.centerCard(card, spotlight);
                }
            } else {
                this.centerCard(card, spotlight);
            }
            
            card.style.opacity = '1'; // Fade in
        }, 200);

        if (audioManager && audioManager.play) audioManager.play('notification');
    }

    positionCard(card, targetRect, preferredPos) {
        const cardRect = card.getBoundingClientRect();
        const margin = 20;
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        let left, top;

        // Logic to position card relative to target without going off screen
        // Simple heuristic: try preferred, fallback to center if tight
        
        if (preferredPos === 'bottom' || preferredPos === 'below') {
            left = targetRect.left + (targetRect.width / 2) - (cardRect.width / 2);
            top = targetRect.bottom + margin;
        } else if (preferredPos === 'top' || preferredPos === 'above') {
            left = targetRect.left + (targetRect.width / 2) - (cardRect.width / 2);
            top = targetRect.top - cardRect.height - margin;
        } else if (preferredPos === 'left') {
            left = targetRect.left - cardRect.width - margin;
            top = targetRect.top + (targetRect.height / 2) - (cardRect.height / 2);
        } else if (preferredPos === 'right') {
            left = targetRect.right + margin;
            top = targetRect.top + (targetRect.height / 2) - (cardRect.height / 2);
        }

        // Boundary checks
        if (left < margin) left = margin;
        if (left + cardRect.width > screenW - margin) left = screenW - cardRect.width - margin;
        if (top < margin) top = margin;
        if (top + cardRect.height > screenH - margin) top = screenH - cardRect.height - margin;

        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
        card.style.transform = 'none';
    }

    centerCard(card, spotlight) {
        spotlight.style.opacity = '0';
        card.style.left = '50%';
        card.style.top = '50%';
        card.style.transform = 'translate(-50%, -50%)';
    }

    handleResize() {
        if (this.isActive) {
            this.showStep(this.currentStep);
        }
    }

    nextStep() {
        if (audioManager && audioManager.play) audioManager.play('click');
        this.showStep(this.currentStep + 1);
    }

    skip() {
        if (audioManager && audioManager.play) audioManager.play('click');
        this.complete();
    }

    complete() {
        this.isActive = false;
        window.removeEventListener('resize', this.resizeHandler);
        
        if (this.overlay) {
            this.overlay.style.opacity = '0';
            setTimeout(() => {
                if (this.overlay) this.overlay.remove();
                this.overlay = null;
            }, 300);
        }
        
        if (ui && ui.notify) ui.notify('Tutorial complete! Have fun! 🎉', 'success');
        if (this.onComplete) this.onComplete();
    }
}

export const tutorialSystem = new TutorialSystem();
