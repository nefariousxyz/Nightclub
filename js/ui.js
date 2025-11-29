// UI Management Module

class UIManager {
    constructor() {
        this.notificationArea = null;
        this.broadcastContainer = null;
        this.currentBroadcast = null;
        this.broadcastTimeout = null;
    }

    init() {
        this.notificationArea = document.getElementById('notification-area');
        this.initBroadcastSystem();
    }

    notify(message, type = 'info') {
        if (!this.notificationArea) {
            this.notificationArea = document.getElementById('notification-area');
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerText = message;

        this.notificationArea.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.opacity = show ? '1' : '0';
            if (!show) {
                setTimeout(() => {
                    loading.style.display = 'none';
                }, 500);
            }
        }
    }
    
    // Broadcast System
    initBroadcastSystem() {
        // Create broadcast container
        this.createBroadcastContainer();
        
        // Listen for broadcasts from Firebase
        if (typeof firebase !== 'undefined' && firebase.apps?.length) {
            const db = firebase.database();
            db.ref('activeBroadcast').on('value', (snap) => {
                if (snap.exists()) {
                    const broadcast = snap.val();
                    // Check if broadcast is still valid (not expired)
                    if (broadcast.expiresAt === 0 || broadcast.expiresAt > Date.now()) {
                        this.showBroadcast(broadcast);
                    } else {
                        this.hideBroadcast();
                    }
                } else {
                    this.hideBroadcast();
                }
            });
        }
    }
    
    createBroadcastContainer() {
        // Check if already exists
        if (document.getElementById('broadcast-container')) return;
        
        const container = document.createElement('div');
        container.id = 'broadcast-container';
        container.innerHTML = `
            <style>
                #broadcast-container {
                    position: fixed;
                    bottom: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 9999;
                    pointer-events: none;
                    display: none;
                    max-width: 400px;
                    width: calc(100% - 32px);
                }
                #broadcast-container.show {
                    display: block;
                    animation: broadcastSlideIn 0.4s ease-out;
                }
                @keyframes broadcastSlideIn {
                    from { transform: translateX(-50%) translateY(100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                @keyframes broadcastSlideOut {
                    from { transform: translateX(-50%) translateY(0); opacity: 1; }
                    to { transform: translateX(-50%) translateY(100%); opacity: 0; }
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .broadcast-banner {
                    padding: 10px 14px;
                    border-radius: 12px;
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    pointer-events: auto;
                    border: 1px solid rgba(255,255,255,0.15);
                    position: relative;
                    overflow: hidden;
                }
                .broadcast-banner.announcement {
                    background: linear-gradient(135deg, rgba(99,102,241,0.95), rgba(139,92,246,0.95));
                }
                .broadcast-banner.alert {
                    background: linear-gradient(135deg, rgba(239,68,68,0.95), rgba(249,115,22,0.95));
                }
                .broadcast-banner.event {
                    background: linear-gradient(135deg, rgba(236,72,153,0.95), rgba(168,85,247,0.95));
                }
                .broadcast-banner.maintenance {
                    background: linear-gradient(135deg, rgba(245,158,11,0.95), rgba(249,115,22,0.95));
                }
                .broadcast-banner.reward {
                    background: linear-gradient(135deg, rgba(16,185,129,0.95), rgba(20,184,166,0.95));
                }
                .broadcast-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: rgba(255,255,255,0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    flex-shrink: 0;
                }
                .broadcast-content {
                    flex: 1;
                    min-width: 0;
                    overflow: hidden;
                }
                .broadcast-title {
                    font-size: 11px;
                    font-weight: 700;
                    color: rgba(255,255,255,0.7);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .broadcast-message-wrapper {
                    overflow: hidden;
                    white-space: nowrap;
                }
                .broadcast-message {
                    font-size: 13px;
                    font-weight: 500;
                    color: white;
                    display: inline-block;
                }
                .broadcast-message.marquee {
                    animation: marquee 10s linear infinite;
                    padding-right: 50px;
                }
                .broadcast-close {
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: background 0.2s;
                    flex-shrink: 0;
                }
                .broadcast-close:hover {
                    background: rgba(255,255,255,0.3);
                }
                .broadcast-timer {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: rgba(255,255,255,0.2);
                    overflow: hidden;
                }
                .broadcast-timer-bar {
                    height: 100%;
                    background: rgba(255,255,255,0.8);
                    transition: width linear;
                }
            </style>
            <div class="broadcast-banner announcement" id="broadcast-banner">
                <div class="broadcast-icon" id="broadcast-icon">📢</div>
                <div class="broadcast-content">
                    <div class="broadcast-title" id="broadcast-title">Announcement</div>
                    <div class="broadcast-message-wrapper">
                        <span class="broadcast-message" id="broadcast-message">Message here...</span>
                    </div>
                </div>
                <button class="broadcast-close" onclick="window.ui.hideBroadcast()">✕</button>
                <div class="broadcast-timer">
                    <div class="broadcast-timer-bar" id="broadcast-timer-bar"></div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
        this.broadcastContainer = container;
    }
    
    showBroadcast(broadcast) {
        if (!this.broadcastContainer) this.createBroadcastContainer();
        
        const container = this.broadcastContainer;
        const banner = document.getElementById('broadcast-banner');
        const icon = document.getElementById('broadcast-icon');
        const title = document.getElementById('broadcast-title');
        const message = document.getElementById('broadcast-message');
        const timerBar = document.getElementById('broadcast-timer-bar');
        
        // Set content
        title.textContent = broadcast.title || 'Announcement';
        const msgText = broadcast.message || '';
        message.textContent = msgText;
        
        // Apply marquee for long messages (over 50 chars)
        message.classList.remove('marquee');
        if (msgText.length > 50) {
            // Duplicate text for seamless marquee
            message.innerHTML = msgText + '&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;' + msgText;
            message.classList.add('marquee');
        }
        
        // Set icon and type
        const icons = {
            announcement: '📢',
            alert: '⚠️',
            event: '🎉',
            maintenance: '🔧',
            reward: '🎁'
        };
        icon.textContent = icons[broadcast.type] || '📢';
        
        // Set banner color
        banner.className = `broadcast-banner ${broadcast.type || 'announcement'}`;
        
        // Show container
        container.classList.add('show');
        
        // Clear existing timeout
        if (this.broadcastTimeout) {
            clearTimeout(this.broadcastTimeout);
            this.broadcastTimeout = null;
        }
        
        // Handle timer
        if (broadcast.duration > 0 && broadcast.expiresAt > 0) {
            const remaining = broadcast.expiresAt - Date.now();
            if (remaining > 0) {
                // Animate timer bar
                timerBar.style.width = '100%';
                timerBar.style.transition = 'none';
                setTimeout(() => {
                    timerBar.style.transition = `width ${remaining}ms linear`;
                    timerBar.style.width = '0%';
                }, 50);
                
                // Auto-hide when expired
                this.broadcastTimeout = setTimeout(() => {
                    this.hideBroadcast();
                }, remaining);
            }
        } else {
            // No timer - show full bar
            timerBar.style.width = '100%';
            timerBar.style.transition = 'none';
        }
        
        // Play notification sound
        this.playBroadcastSound(broadcast.type);
        
        this.currentBroadcast = broadcast;
    }
    
    hideBroadcast() {
        if (this.broadcastContainer) {
            this.broadcastContainer.style.animation = 'broadcastSlideOut 0.3s ease-in forwards';
            setTimeout(() => {
                this.broadcastContainer.classList.remove('show');
                this.broadcastContainer.style.animation = '';
            }, 300);
        }
        
        if (this.broadcastTimeout) {
            clearTimeout(this.broadcastTimeout);
            this.broadcastTimeout = null;
        }
        
        this.currentBroadcast = null;
    }
    
    playBroadcastSound(type) {
        try {
            // Create a simple notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Different sounds for different types
            const frequencies = {
                announcement: [523, 659, 784], // C5, E5, G5
                alert: [440, 550, 440], // Warning sound
                event: [523, 659, 784, 1047], // Celebration
                maintenance: [330, 294], // Low tones
                reward: [523, 784, 1047] // Reward jingle
            };
            
            const freqs = frequencies[type] || frequencies.announcement;
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            
            freqs.forEach((freq, i) => {
                setTimeout(() => {
                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                }, i * 100);
            });
            
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // Silent fail if audio not supported
        }
    }
}

export const ui = new UIManager();
