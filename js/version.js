/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NIGHTCLUB GAME - VERSION MANAGEMENT SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * © 2024 Nightclub Game. All Rights Reserved.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ==========================================
    // VERSION CONFIGURATION
    // Update this number with each push/deployment
    // ==========================================
    const VERSION = {
        major: 1,
        minor: 1,
        patch: 9,
        build: '20251129j',  // YYYYMMDD format - UPDATE THIS ON EACH PUSH
        timestamp: Date.now()
    };

    // Get version string
    const getVersionString = () => `v${VERSION.major}.${VERSION.minor}.${VERSION.patch}`;
    const getFullVersion = () => `v${VERSION.major}.${VERSION.minor}.${VERSION.patch} (Build ${VERSION.build})`;

    // ==========================================
    // VERSION CHECK CONFIGURATION
    // ==========================================
    const CONFIG = {
        checkInterval: 60000,        // Check every 60 seconds
        versionEndpoint: '/version.json',  // Endpoint for version check
        enableAutoRefresh: true,
        showUpdateNotification: true,
        notificationDuration: 10000  // 10 seconds before auto-refresh
    };

    // ==========================================
    // VERSION DISPLAY
    // ==========================================
    function displayVersion() {
        // Wait for DOM
        const display = () => {
            // Create version badge
            let versionBadge = document.getElementById('version-badge');
            
            if (!versionBadge) {
                versionBadge = document.createElement('div');
                versionBadge.id = 'version-badge';
                versionBadge.style.cssText = `
                    position: fixed;
                    bottom: 80px;
                    right: 10px;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    color: rgba(255, 255, 255, 0.6);
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-family: 'Inter', system-ui, sans-serif;
                    z-index: 9999;
                    pointer-events: none;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                `;
                document.body.appendChild(versionBadge);
            }
            
            versionBadge.innerHTML = `
                <span style="opacity: 0.5;">🎮</span> 
                <span style="font-weight: 600;">Hypeclub</span> 
                <span style="color: #8b5cf6;">${getVersionString()}</span>
            `;
        };

        if (document.body) {
            display();
        } else {
            document.addEventListener('DOMContentLoaded', display);
        }
    }

    // ==========================================
    // VERSION CHECK & AUTO-UPDATE
    // ==========================================
    async function checkForUpdates() {
        try {
            // Fetch the latest version from server (with cache bust)
            const response = await fetch(`${CONFIG.versionEndpoint}?t=${Date.now()}`, {
                cache: 'no-store'
            });
            
            if (!response.ok) return;
            
            const serverVersion = await response.json();
            
            // Compare versions
            const currentBuild = VERSION.build;
            const serverBuild = serverVersion.build;
            
            // Check if server has newer version
            if (serverBuild && serverBuild !== currentBuild) {
                console.log(`🔄 New version available: ${serverBuild} (current: ${currentBuild})`);
                showUpdateNotification(serverVersion);
            }
            
        } catch (e) {
            // Silent fail - version check is non-critical
            console.debug('Version check failed:', e.message);
        }
    }

    // ==========================================
    // UPDATE NOTIFICATION
    // ==========================================
    function showUpdateNotification(newVersion) {
        if (!CONFIG.showUpdateNotification) {
            // Auto-refresh immediately if notifications disabled
            if (CONFIG.enableAutoRefresh) {
                window.location.reload(true);
            }
            return;
        }

        // Remove existing notification if any
        const existing = document.getElementById('update-notification');
        if (existing) existing.remove();

        // Create notification
        const notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
            border: 1px solid #6366f1;
            color: white;
            padding: 16px 24px;
            border-radius: 16px;
            font-family: 'Inter', system-ui, sans-serif;
            z-index: 999999;
            box-shadow: 0 10px 40px rgba(99, 102, 241, 0.3);
            animation: slideDown 0.5s ease;
            max-width: 400px;
            text-align: center;
        `;

        const countdownSeconds = Math.floor(CONFIG.notificationDuration / 1000);
        
        notification.innerHTML = `
            <style>
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
                #update-countdown {
                    display: inline-block;
                    background: #6366f1;
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-weight: 700;
                    min-width: 24px;
                }
            </style>
            <div style="display: flex; align-items: center; gap: 12px; justify-content: center;">
                <span style="font-size: 24px;">🚀</span>
                <div>
                    <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
                        Update Available!
                    </div>
                    <div style="font-size: 12px; opacity: 0.8;">
                        Version ${newVersion.version || `v${newVersion.major}.${newVersion.minor}.${newVersion.patch}`}
                    </div>
                </div>
            </div>
            <div style="margin-top: 12px; font-size: 12px; opacity: 0.9;">
                Refreshing in <span id="update-countdown">${countdownSeconds}</span> seconds...
            </div>
            <div style="display: flex; gap: 10px; margin-top: 12px; justify-content: center;">
                <button id="update-now-btn" style="
                    background: #22c55e;
                    border: none;
                    color: white;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                ">Update Now</button>
                <button id="update-later-btn" style="
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 12px;
                    cursor: pointer;
                ">Later</button>
            </div>
        `;

        document.body.appendChild(notification);

        // Countdown timer
        let countdown = countdownSeconds;
        const countdownEl = document.getElementById('update-countdown');
        
        const timer = setInterval(() => {
            countdown--;
            if (countdownEl) countdownEl.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(timer);
                if (CONFIG.enableAutoRefresh) {
                    // Just reload - game auto-saves periodically anyway
                    window.location.reload(true);
                }
            }
        }, 1000);

        // Button handlers
        document.getElementById('update-now-btn').onclick = () => {
            clearInterval(timer);
            // Just reload - don't try to save (causes cyclic object errors)
            window.location.reload(true);
        };

        document.getElementById('update-later-btn').onclick = () => {
            clearInterval(timer);
            notification.remove();
            // Don't check again for 5 minutes
            setTimeout(() => checkForUpdates(), 300000);
        };
    }

    // ==========================================
    // INITIALIZE
    // ==========================================
    function init() {
        // Display version badge
        displayVersion();
        
        // Start periodic version checks
        if (CONFIG.enableAutoRefresh) {
            // Initial check after 5 seconds (let page load first)
            setTimeout(checkForUpdates, 5000);
            
            // Then check periodically
            setInterval(checkForUpdates, CONFIG.checkInterval);
        }

        // Expose version info globally
        window.GAME_VERSION = {
            ...VERSION,
            string: getVersionString(),
            full: getFullVersion(),
            check: checkForUpdates
        };

        console.log(`🎮 Hypeclub ${getFullVersion()}`);
    }

    // Run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
