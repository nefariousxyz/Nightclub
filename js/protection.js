/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NIGHTCLUB GAME - CODE PROTECTION SYSTEM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * © 2024 Nightclub Game. All Rights Reserved.
 * 
 * This software is protected by copyright law and international treaties.
 * Unauthorized reproduction, distribution, or modification of this software,
 * or any portion of it, may result in severe civil and criminal penalties,
 * and will be prosecuted to the maximum extent possible under the law.
 * 
 * License: Proprietary - Not for redistribution
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';
    
    // ==========================================
    // CONFIGURATION - Edit your allowed domains here
    // ==========================================
    const PROTECTION_CONFIG = {
        allowedDomains: [
            'localhost',
            '127.0.0.1',
            'hypeclub.city',
            // Add your custom domains below:
            // 'yourdomain.com',
            // 'www.yourdomain.com',
        ],
        enableDomainLock: true,
        enableAntiDebug: true,
        enableRightClickBlock: false,
        enableConsoleWarning: true,
        enableDevToolsDetection: true,
        enableIframeProtection: true
    };

    // ==========================================
    // DOMAIN LOCK - Game only works on YOUR domain
    // ==========================================
    function checkDomain() {
        if (!PROTECTION_CONFIG.enableDomainLock) return true;
        
        const currentDomain = window.location.hostname;
        const isAllowed = PROTECTION_CONFIG.allowedDomains.some(domain => 
            currentDomain === domain || 
            currentDomain.endsWith('.' + domain) ||
            currentDomain.endsWith('.netlify.app') // Allow all Netlify previews
        );
        
        if (!isAllowed) {
            console.error('🚫 Unauthorized domain:', currentDomain);
            showUnauthorizedScreen();
            return false;
        }
        return true;
    }

    function showUnauthorizedScreen() {
        // Wait for body to exist
        const show = () => {
            document.body.innerHTML = `
                <div style="position:fixed;inset:0;background:linear-gradient(135deg,#0a0a0f 0%,#1a0a1a 100%);display:flex;align-items:center;justify-content:center;z-index:999999;font-family:system-ui,-apple-system,sans-serif;">
                    <div style="text-align:center;color:white;padding:40px;max-width:500px;">
                        <div style="font-size:100px;margin-bottom:20px;filter:drop-shadow(0 0 20px rgba(239,68,68,0.5));">🚫</div>
                        <h1 style="font-size:32px;margin-bottom:15px;color:#ef4444;font-weight:800;text-transform:uppercase;letter-spacing:2px;">Access Denied</h1>
                        <p style="color:#94a3b8;margin-bottom:25px;line-height:1.8;font-size:16px;">
                            This is an <strong style="color:#ef4444;">unauthorized copy</strong> of Nightclub Game. 
                            The game can only be played on official platforms.
                        </p>
                        <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:20px;margin-bottom:25px;">
                            <p style="color:#fca5a5;font-size:14px;margin:0;line-height:1.6;">
                                ⚖️ This software is protected by international copyright law.<br>
                                Unauthorized distribution is a criminal offense.
                            </p>
                        </div>
                        <a href="https://nightclub-game.netlify.app" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:16px;transition:transform 0.2s;box-shadow:0 4px 20px rgba(139,92,246,0.4);">
                            🎮 Play Official Version
                        </a>
                        <p style="color:#475569;font-size:12px;margin-top:30px;">
                            © 2024 Nightclub Game. All Rights Reserved.
                        </p>
                    </div>
                </div>
            `;
            
            // Completely disable game
            window.game = null;
            window.authSystem = null;
            window.cloudSave = null;
            window.antiCheat = null;
            
            // Remove all scripts
            document.querySelectorAll('script').forEach(s => s.remove());
        };
        
        if (document.body) {
            show();
        } else {
            document.addEventListener('DOMContentLoaded', show);
        }
        
        throw new Error('🚫 Unauthorized domain - Game terminated');
    }

    // ==========================================
    // ANTI-DEBUGGING
    // ==========================================
    function initAntiDebug() {
        if (!PROTECTION_CONFIG.enableAntiDebug) return;

        // Disable common dev tools shortcuts
        document.addEventListener('keydown', function(e) {
            // F12
            if (e.key === 'F12') {
                e.preventDefault();
                showDevToolsWarning();
                return false;
            }
            // Ctrl+Shift+I (Dev Tools)
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
                e.preventDefault();
                showDevToolsWarning();
                return false;
            }
            // Ctrl+Shift+J (Console)
            if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
                e.preventDefault();
                showDevToolsWarning();
                return false;
            }
            // Ctrl+Shift+C (Inspect)
            if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
                e.preventDefault();
                return false;
            }
            // Ctrl+U (View Source)
            if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
                e.preventDefault();
                return false;
            }
        });

        // Detect debugger pauses
        let lastTime = Date.now();
        setInterval(function() {
            const now = Date.now();
            if (now - lastTime > 200) {
                // Possible debugger pause detected
                if (window.antiCheat) {
                    window.antiCheat.flagViolation('DEBUGGER_DETECTED', 'Possible debugger pause');
                }
            }
            lastTime = now;
        }, 100);
    }

    function showDevToolsWarning() {
        if (window.ui && window.ui.notify) {
            window.ui.notify('⚠️ Developer tools are monitored for security purposes.', 'warning');
        }
    }

    // ==========================================
    // RIGHT-CLICK PROTECTION
    // ==========================================
    function initRightClickProtection() {
        if (!PROTECTION_CONFIG.enableRightClickBlock) return;

        document.addEventListener('contextmenu', function(e) {
            // Allow right-click on inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return true;
            }
            e.preventDefault();
            return false;
        });
    }

    // ==========================================
    // CONSOLE WARNING
    // ==========================================
    function initConsoleWarning() {
        if (!PROTECTION_CONFIG.enableConsoleWarning) return;

        // Clear and show warning
        setTimeout(() => {
            console.clear();
            
            console.log('%c🛑 STOP!', 
                'color:#ef4444;font-size:60px;font-weight:900;text-shadow:2px 2px 0 #000;');
            
            console.log('%cThis browser feature is for developers only.', 
                'font-size:18px;color:#fbbf24;font-weight:600;');
            
            console.log('%cIf someone told you to paste something here to get free diamonds or cash, ' +
                'they are trying to SCAM you and steal your account!', 
                'font-size:14px;color:#f87171;line-height:1.6;');
            
            console.log('%cAnything you do here is logged and may result in a permanent ban.', 
                'font-size:12px;color:#94a3b8;');
            
            console.log('%c© 2024 Nightclub Game - Protected by copyright law', 
                'font-size:11px;color:#475569;margin-top:20px;');
        }, 1000);
    }

    // ==========================================
    // DEV TOOLS DETECTION
    // ==========================================
    function initDevToolsDetection() {
        if (!PROTECTION_CONFIG.enableDevToolsDetection) return;

        let isOpen = false;
        const threshold = 160;

        const detectDevTools = () => {
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;
            
            if ((widthDiff || heightDiff) && !isOpen) {
                isOpen = true;
                onDevToolsOpen();
            } else if (!widthDiff && !heightDiff) {
                isOpen = false;
            }
        };

        setInterval(detectDevTools, 1000);
        window.addEventListener('resize', detectDevTools);

        function onDevToolsOpen() {
            if (window.antiCheat && typeof window.antiCheat.flagViolation === 'function') {
                window.antiCheat.flagViolation('DEVTOOLS_OPEN', 'Developer tools window detected');
            }
        }
    }

    // ==========================================
    // IFRAME PROTECTION
    // ==========================================
    function initIframeProtection() {
        if (!PROTECTION_CONFIG.enableIframeProtection) return;

        if (window.self !== window.top) {
            try {
                const parentHost = window.parent.location.hostname;
                const isAllowed = PROTECTION_CONFIG.allowedDomains.some(d => 
                    parentHost === d || parentHost.endsWith('.' + d)
                );
                
                if (!isAllowed) {
                    window.top.location = window.self.location;
                }
            } catch (e) {
                // Cross-origin iframe - break out
                window.top.location = window.self.location;
            }
        }
    }

    // ==========================================
    // TEXT SELECTION PROTECTION
    // ==========================================
    function initTextProtection() {
        const style = document.createElement('style');
        style.id = 'nc-protection-styles';
        style.textContent = `
            body, .game-container, #game-canvas, .no-select {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            input, textarea, [contenteditable] {
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                user-select: text;
            }
        `;
        document.head.appendChild(style);
    }

    // ==========================================
    // WATERMARK & COPYRIGHT
    // ==========================================
    function injectWatermark() {
        // Hidden watermark for tracking copies
        const wm = document.createElement('div');
        wm.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
        wm.innerHTML = `<!--NC_WM:${Date.now().toString(36)}:${Math.random().toString(36).substr(2)}-->`;
        document.body?.appendChild(wm);

        // Copyright meta
        const meta = document.createElement('meta');
        meta.name = 'copyright';
        meta.content = '© 2024 Nightclub Game. All Rights Reserved. Unauthorized copying prohibited.';
        document.head.appendChild(meta);

        // X-Frame-Options via meta (backup)
        const xfo = document.createElement('meta');
        xfo.httpEquiv = 'X-Frame-Options';
        xfo.content = 'SAMEORIGIN';
        document.head.appendChild(xfo);
    }

    // ==========================================
    // ADDITIONAL SECURITY: Freeze critical objects
    // ==========================================
    function protectGlobalObjects() {
        // Wait for game to load, then freeze critical references
        setTimeout(() => {
            if (window.PROTECTION_CONFIG) {
                Object.freeze(window.PROTECTION_CONFIG);
            }
        }, 5000);
    }

    // ==========================================
    // INITIALIZE
    // ==========================================
    function init() {
        // Domain check is FIRST - stops everything if unauthorized
        if (!checkDomain()) return;

        // Initialize all protections
        initAntiDebug();
        initRightClickProtection();
        initConsoleWarning();
        initDevToolsDetection();
        initIframeProtection();
        initTextProtection();
        injectWatermark();
        protectGlobalObjects();

        console.log('🛡️ Protection system active');
    }

    // Run immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging (can be removed in production)
    window.PROTECTION_CONFIG = PROTECTION_CONFIG;

})();
