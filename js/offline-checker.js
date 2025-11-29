/**
 * Offline Checker - Blocks the entire screen when user is offline
 * Automatically shows/hides based on network connectivity
 */
(function() {
    'use strict';

    // Create the offline overlay
    function createOfflineOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'offline-overlay';
        overlay.innerHTML = `
            <div class="offline-content">
                <div class="offline-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                        <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                        <line x1="12" y1="20" x2="12.01" y2="20"></line>
                    </svg>
                </div>
                <h1 class="offline-title">You're Offline</h1>
                <p class="offline-message">Please check your internet connection to continue playing Hypeclub City</p>
                <div class="offline-status">
                    <div class="status-dot"></div>
                    <span>Waiting for connection...</span>
                </div>
                <button class="retry-btn" onclick="window.offlineChecker.checkConnection()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    Retry Connection
                </button>
            </div>
        `;

        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            #offline-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #1a1025 0%, #2d1f3d 50%, #1a1025 100%);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 999999;
                font-family: 'Orbitron', 'Inter', 'Nunito', sans-serif;
                animation: fadeIn 0.3s ease;
            }

            #offline-overlay.show {
                display: flex;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .offline-content {
                text-align: center;
                padding: 40px;
                max-width: 500px;
            }

            .offline-icon {
                color: #ff0066;
                margin-bottom: 30px;
                animation: pulse-glow 2s ease-in-out infinite;
            }

            @keyframes pulse-glow {
                0%, 100% {
                    filter: drop-shadow(0 0 10px rgba(255, 0, 102, 0.5));
                    transform: scale(1);
                }
                50% {
                    filter: drop-shadow(0 0 30px rgba(255, 0, 102, 0.8));
                    transform: scale(1.05);
                }
            }

            .offline-title {
                color: #ffffff;
                font-size: 2.5rem;
                font-weight: 700;
                margin: 0 0 15px 0;
                text-shadow: 0 0 20px rgba(255, 0, 102, 0.5);
                letter-spacing: 2px;
            }

            .offline-message {
                color: #a0a0c0;
                font-size: 1.1rem;
                margin: 0 0 30px 0;
                line-height: 1.6;
            }

            .offline-status {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                color: #ff6b6b;
                font-size: 0.95rem;
                margin-bottom: 30px;
                padding: 15px 25px;
                background: rgba(255, 0, 102, 0.1);
                border: 1px solid rgba(255, 0, 102, 0.3);
                border-radius: 50px;
            }

            .status-dot {
                width: 12px;
                height: 12px;
                background: #ff6b6b;
                border-radius: 50%;
                animation: blink 1.5s ease-in-out infinite;
            }

            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }

            .retry-btn {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                background: linear-gradient(135deg, #ff0066 0%, #a855f7 100%);
                color: white;
                border: none;
                padding: 15px 35px;
                font-size: 1rem;
                font-weight: 600;
                border-radius: 50px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: inherit;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 0 4px 20px rgba(255, 0, 102, 0.4);
            }

            .retry-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 30px rgba(255, 0, 102, 0.6);
            }

            .retry-btn:active {
                transform: translateY(0);
            }

            .retry-btn svg {
                transition: transform 0.3s ease;
            }

            .retry-btn:hover svg {
                transform: rotate(180deg);
            }

            /* Mobile responsiveness */
            @media (max-width: 600px) {
                .offline-content {
                    padding: 20px;
                }

                .offline-icon svg {
                    width: 80px;
                    height: 80px;
                }

                .offline-title {
                    font-size: 1.8rem;
                }

                .offline-message {
                    font-size: 1rem;
                }

                .retry-btn {
                    padding: 12px 25px;
                    font-size: 0.9rem;
                }
            }
        `;

        document.head.appendChild(styles);
        document.body.appendChild(overlay);
        return overlay;
    }

    // Initialize offline checker
    function init() {
        const overlay = createOfflineOverlay();

        const offlineChecker = {
            overlay: overlay,

            show: function() {
                this.overlay.classList.add('show');
                console.log('📶 Offline overlay shown');
            },

            hide: function() {
                this.overlay.classList.remove('show');
                console.log('📶 Offline overlay hidden');
            },

            checkConnection: function() {
                if (navigator.onLine) {
                    // Double-check with a small fetch request
                    fetch('https://www.google.com/favicon.ico', { 
                        mode: 'no-cors',
                        cache: 'no-store'
                    })
                    .then(() => {
                        this.hide();
                    })
                    .catch(() => {
                        this.show();
                    });
                } else {
                    this.show();
                }
            },

            updateStatus: function() {
                if (!navigator.onLine) {
                    this.show();
                } else {
                    this.hide();
                }
            }
        };

        // Expose globally
        window.offlineChecker = offlineChecker;

        // Listen for online/offline events
        window.addEventListener('online', function() {
            console.log('📶 Connection restored');
            offlineChecker.hide();
        });

        window.addEventListener('offline', function() {
            console.log('📶 Connection lost');
            offlineChecker.show();
        });

        // Check initial status
        if (!navigator.onLine) {
            offlineChecker.show();
        }

        console.log('📶 Offline checker initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
