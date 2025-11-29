// Anti-Cheat & Anti-Tamper System
class AntiCheat {
    constructor() {
        this.violations = 0;
        this.maxViolations = 3;
        this.lastCash = 0;
        this.lastDiamonds = 0;
        this.lastCheck = Date.now();
        this.checksumInterval = null;
        this.isEnabled = true;
        this.initialized = false;
        this.deviceFingerprint = null;
        this.ipAddress = null;
        
        // Anti-Cheat Engine protection
        this.obfuscationKey = Math.floor(Math.random() * 1000000) + 500000;
        this.lastHeartbeat = Date.now();
        this.expectedTime = Date.now();
        this.speedHackThreshold = 1.5; // 50% faster = suspicious
        this.lastServerSync = Date.now();
        this.checksumSalt = 'NC_' + Date.now().toString(36);
        this.memoryTrapValues = {};
        this.heartbeatCount = 0;
    }

    async init() {
        if (!this.isEnabled || this.initialized) return;
        
        console.log('🛡️ Anti-cheat system initialized');
        this.initialized = true;
        
        // Generate device fingerprint and get IP
        await this.collectDeviceInfo();
        
        // Check if device/IP is banned
        await this.checkBanStatus();
        
        // Start monitoring
        this.startMonitoring();
        this.detectDevTools();
        this.protectConsole();
        this.blockCommonCheats();
        this.validateIntegrity();
        
        // Advanced protection against external cheats
        this.startSpeedHackDetection();
        this.setupMemoryTraps();
        this.startHeartbeat();
        this.obfuscateGameValues();
        this.detectCheatEnginePatterns();
    }
    
    // ==========================================
    // SPEED HACK DETECTION (Cheat Engine Speed)
    // ==========================================
    startSpeedHackDetection() {
        let lastRealTime = Date.now();
        let lastPerfTime = performance.now();
        
        setInterval(() => {
            const currentRealTime = Date.now();
            const currentPerfTime = performance.now();
            
            // Calculate expected vs actual time passage
            const realTimePassed = currentRealTime - lastRealTime;
            const perfTimePassed = currentPerfTime - lastPerfTime;
            
            // If performance.now() and Date.now() are significantly different,
            // someone might be manipulating time
            const ratio = perfTimePassed / realTimePassed;
            
            if (ratio > this.speedHackThreshold || ratio < 0.5) {
                this.flagViolation('SPEED_HACK', `Time manipulation detected (ratio: ${ratio.toFixed(2)})`);
            }
            
            // Also check against expected interval (1000ms)
            if (realTimePassed < 500 || realTimePassed > 2000) {
                // Timer was manipulated
                this.flagViolation('TIMER_MANIPULATION', `Interval was ${realTimePassed}ms instead of ~1000ms`);
            }
            
            lastRealTime = currentRealTime;
            lastPerfTime = currentPerfTime;
            
        }, 1000);
        
        // Secondary check using requestAnimationFrame
        let frameCount = 0;
        let lastFrameCheck = Date.now();
        
        const checkFrameRate = () => {
            frameCount++;
            
            if (Date.now() - lastFrameCheck >= 1000) {
                // Normal is 60fps, speed hack would show 90+ fps equivalent
                if (frameCount > 120) {
                    this.flagViolation('FRAME_RATE_ANOMALY', `Abnormal frame rate: ${frameCount} in 1s`);
                }
                frameCount = 0;
                lastFrameCheck = Date.now();
            }
            
            requestAnimationFrame(checkFrameRate);
        };
        requestAnimationFrame(checkFrameRate);
    }
    
    // ==========================================
    // MEMORY TRAPS (Detect Memory Scanners)
    // ==========================================
    setupMemoryTraps() {
        // Create fake "obvious" values that cheaters might search for
        // If these get modified, we know someone is scanning memory
        
        window._playerMoney = 99999999; // Honeypot
        window._playerGems = 99999999;  // Honeypot
        window._cheatEnabled = false;
        window._godMode = false;
        window._infiniteMoney = false;
        
        // Store original trap values
        this.memoryTrapValues = {
            money: 99999999,
            gems: 99999999,
            cheat: false,
            god: false,
            infinite: false
        };
        
        // Periodically check if traps were modified
        setInterval(() => {
            if (window._playerMoney !== this.memoryTrapValues.money) {
                this.flagViolation('MEMORY_SCANNER', `Honeypot _playerMoney modified: ${window._playerMoney}`);
                window._playerMoney = this.memoryTrapValues.money; // Reset
            }
            if (window._playerGems !== this.memoryTrapValues.gems) {
                this.flagViolation('MEMORY_SCANNER', `Honeypot _playerGems modified: ${window._playerGems}`);
                window._playerGems = this.memoryTrapValues.gems;
            }
            if (window._cheatEnabled === true) {
                this.flagViolation('CHEAT_FLAG_SET', 'Cheat flag was enabled');
                window._cheatEnabled = false;
            }
            if (window._godMode === true) {
                this.flagViolation('GOD_MODE_DETECTED', 'God mode flag was set');
                window._godMode = false;
            }
            if (window._infiniteMoney === true) {
                this.flagViolation('INFINITE_MONEY_FLAG', 'Infinite money flag was set');
                window._infiniteMoney = false;
            }
        }, 2000);
        
        // Create getter/setter traps on common cheat targets
        this.createValueTraps();
    }
    
    createValueTraps() {
        // Create decoy properties that look like game values
        const self = this;
        const decoys = ['coins', 'gold', 'money', 'gems', 'credits', 'points', 'score'];
        
        decoys.forEach(name => {
            let value = Math.floor(Math.random() * 10000);
            Object.defineProperty(window, `_game_${name}`, {
                get: () => value,
                set: (newVal) => {
                    if (newVal !== value && Math.abs(newVal - value) > 1000) {
                        self.flagViolation('DECOY_MODIFIED', `Decoy ${name} changed from ${value} to ${newVal}`);
                    }
                    value = newVal;
                },
                configurable: false
            });
        });
    }
    
    // ==========================================
    // HEARTBEAT SYSTEM (Server Validation)
    // ==========================================
    startHeartbeat() {
        // Send regular heartbeats to server with game state checksum
        setInterval(async () => {
            if (!window.game || !window.authSystem?.isLoggedIn) return;
            
            this.heartbeatCount++;
            const now = Date.now();
            
            // Calculate checksum of current game state
            const checksum = this.calculateChecksum();
            
            // Check for impossible value increases since last heartbeat
            const timeSinceLastBeat = (now - this.lastHeartbeat) / 1000; // seconds
            const maxPossibleCashGain = timeSinceLastBeat * 500; // Max $500/second
            const cashGain = (window.game.cash || 0) - this.lastCash;
            
            if (cashGain > maxPossibleCashGain && cashGain > 10000) {
                this.flagViolation('HEARTBEAT_CASH_ANOMALY', 
                    `Gained $${cashGain.toLocaleString()} in ${timeSinceLastBeat.toFixed(1)}s (max: $${maxPossibleCashGain.toFixed(0)})`);
            }
            
            // Store heartbeat data to Firebase for server-side validation
            try {
                if (typeof firebase !== 'undefined' && this.heartbeatCount % 6 === 0) { // Every 30 seconds
                    await firebase.database().ref(`heartbeats/${window.authSystem.userId}`).set({
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        checksum: checksum,
                        cash: window.game.cash,
                        diamonds: window.game.diamonds,
                        level: window.game.level,
                        fingerprint: this.deviceFingerprint
                    });
                }
            } catch (e) {
                // Silent fail
            }
            
            this.lastHeartbeat = now;
            this.lastCash = window.game.cash || 0;
            this.lastDiamonds = window.game.diamonds || 0;
            
        }, 5000); // Every 5 seconds
    }
    
    calculateChecksum() {
        if (!window.game) return 'no-game';
        
        const data = [
            window.game.cash,
            window.game.diamonds,
            window.game.level,
            window.game.xp,
            window.game.clubTier,
            this.checksumSalt
        ].join('|');
        
        // Simple hash
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            hash = ((hash << 5) - hash) + data.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
    
    // ==========================================
    // VALUE OBFUSCATION (Hide Real Values)
    // ==========================================
    obfuscateGameValues() {
        if (!window.game) {
            setTimeout(() => this.obfuscateGameValues(), 1000);
            return;
        }
        
        const self = this;
        
        // Store obfuscated versions of critical values
        // Real value = displayed value, but internal storage is obfuscated
        const protectedProps = ['cash', 'diamonds'];
        
        protectedProps.forEach(prop => {
            const originalValue = window.game[prop] || 0;
            let obfuscatedValue = originalValue ^ this.obfuscationKey; // XOR obfuscation
            
            // Create shadow storage
            window.game[`_${prop}_shadow`] = obfuscatedValue;
            window.game[`_${prop}_key`] = this.obfuscationKey;
            
            // Verify values match periodically
            setInterval(() => {
                if (!window.game) return;
                
                const storedObfuscated = window.game[`_${prop}_shadow`];
                const key = window.game[`_${prop}_key`];
                const expectedValue = storedObfuscated ^ key;
                const actualValue = window.game[prop];
                
                // If someone modified cash directly without going through game methods,
                // the shadow value won't match
                if (Math.abs(expectedValue - actualValue) > 100 && actualValue > expectedValue) {
                    self.flagViolation('VALUE_DESYNC', 
                        `${prop} mismatch: actual=${actualValue}, expected=${expectedValue}`);
                }
                
                // Update shadow to current value
                window.game[`_${prop}_shadow`] = actualValue ^ key;
                
            }, 3000);
        });
    }
    
    // ==========================================
    // CHEAT ENGINE PATTERN DETECTION
    // ==========================================
    detectCheatEnginePatterns() {
        // Detect common Cheat Engine behaviors
        
        // 1. Check for suspicious window titles (limited in browsers)
        // 2. Check for debugging
        // 3. Check for automation patterns
        
        // Detect if values are being rapidly scanned (CE does first/next scan)
        let accessCounts = { cash: 0, diamonds: 0 };
        let lastAccessTime = Date.now();
        
        if (window.game) {
            const originalCashGetter = Object.getOwnPropertyDescriptor(
                Object.getPrototypeOf(window.game), 'cash'
            )?.get;
            
            // We can't easily intercept property access, but we can detect patterns
        }
        
        // Detect abnormal patterns in value changes
        let valueHistory = [];
        
        setInterval(() => {
            if (!window.game) return;
            
            valueHistory.push({
                time: Date.now(),
                cash: window.game.cash,
                diamonds: window.game.diamonds
            });
            
            // Keep last 20 records
            if (valueHistory.length > 20) {
                valueHistory.shift();
            }
            
            // Analyze patterns
            if (valueHistory.length >= 5) {
                // Check for impossibly precise values (e.g., exactly 999999)
                const suspiciousValues = [999999, 9999999, 99999999, 1000000, 10000000];
                suspiciousValues.forEach(sv => {
                    if (window.game.cash === sv || window.game.diamonds === sv) {
                        this.flagViolation('SUSPICIOUS_VALUE', `Exact suspicious value detected: ${sv}`);
                    }
                });
                
                // Check for value oscillation (sign of memory scanning)
                const recent = valueHistory.slice(-5);
                let oscillations = 0;
                for (let i = 1; i < recent.length; i++) {
                    if ((recent[i].cash > recent[i-1].cash && recent[i-1].cash < recent[i-2]?.cash) ||
                        (recent[i].cash < recent[i-1].cash && recent[i-1].cash > recent[i-2]?.cash)) {
                        oscillations++;
                    }
                }
                if (oscillations >= 3) {
                    this.flagViolation('VALUE_OSCILLATION', 'Rapid value changes detected (possible memory scan)');
                }
            }
            
        }, 500);
        
        // Detect if someone is using automation/bots
        this.detectAutomation();
    }
    
    detectAutomation() {
        let clickPatterns = [];
        let keyPatterns = [];
        
        // Track mouse clicks
        document.addEventListener('click', (e) => {
            clickPatterns.push({
                time: Date.now(),
                x: e.clientX,
                y: e.clientY
            });
            
            // Keep last 50 clicks
            if (clickPatterns.length > 50) {
                clickPatterns.shift();
            }
            
            // Check for bot-like patterns
            if (clickPatterns.length >= 10) {
                // Check for exactly same position clicks (autoclicker)
                const recent = clickPatterns.slice(-10);
                const samePositionClicks = recent.filter(c => 
                    c.x === recent[0].x && c.y === recent[0].y
                ).length;
                
                if (samePositionClicks >= 8) {
                    this.flagViolation('AUTOCLICKER', 'Autoclicker pattern detected (same position)');
                }
                
                // Check for perfectly timed clicks (bot)
                const intervals = [];
                for (let i = 1; i < recent.length; i++) {
                    intervals.push(recent[i].time - recent[i-1].time);
                }
                
                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
                
                // Very low variance = bot (humans have natural variance)
                if (variance < 100 && avgInterval < 500) {
                    this.flagViolation('BOT_CLICKING', `Bot-like clicking pattern (variance: ${variance.toFixed(2)})`);
                }
            }
        });
        
        // Track keypresses for macro detection
        document.addEventListener('keydown', (e) => {
            keyPatterns.push({
                time: Date.now(),
                key: e.key
            });
            
            if (keyPatterns.length > 30) {
                keyPatterns.shift();
            }
        });
    }
    
    // Collect device fingerprint and IP address
    async collectDeviceInfo() {
        try {
            // Generate device fingerprint
            this.deviceFingerprint = await this.generateFingerprint();
            console.log('🔐 Device fingerprint generated');
            
            // Get IP address
            this.ipAddress = await this.getIPAddress();
            console.log('🌐 IP address obtained');
            
        } catch (e) {
            console.warn('Failed to collect device info:', e);
        }
    }
    
    // Generate unique device fingerprint
    async generateFingerprint() {
        const components = [];
        
        // Screen info
        components.push(screen.width + 'x' + screen.height);
        components.push(screen.colorDepth);
        components.push(window.devicePixelRatio || 1);
        
        // Timezone
        components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
        components.push(new Date().getTimezoneOffset());
        
        // Language
        components.push(navigator.language);
        components.push(navigator.languages?.join(',') || '');
        
        // Platform info
        components.push(navigator.platform);
        components.push(navigator.hardwareConcurrency || 0);
        components.push(navigator.maxTouchPoints || 0);
        
        // WebGL renderer (graphics card info)
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
                    components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
                }
            }
        } catch (e) {}
        
        // Canvas fingerprint
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Nightclub Anti-Cheat 🎮', 2, 2);
            components.push(canvas.toDataURL().slice(-50));
        } catch (e) {}
        
        // Audio fingerprint
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            components.push(audioContext.sampleRate);
            audioContext.close();
        } catch (e) {}
        
        // Plugins (limited in modern browsers)
        components.push(navigator.plugins?.length || 0);
        
        // Generate hash from all components
        const fingerprint = components.join('|||');
        return this.hashString(fingerprint);
    }
    
    // Simple hash function
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        // Convert to hex and pad
        const hex = Math.abs(hash).toString(16).toUpperCase();
        return 'FP-' + hex.padStart(8, '0') + '-' + Date.now().toString(36).toUpperCase().slice(-4);
    }
    
    // Get IP address using free API
    async getIPAddress() {
        try {
            // Try multiple IP services for reliability
            const services = [
                'https://api.ipify.org?format=json',
                'https://api.my-ip.io/ip.json',
                'https://ipapi.co/json/'
            ];
            
            for (const service of services) {
                try {
                    const response = await fetch(service, { timeout: 3000 });
                    const data = await response.json();
                    return data.ip || data.address || null;
                } catch (e) {
                    continue;
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    }
    
    // Check if device or IP is banned
    async checkBanStatus() {
        if (typeof firebase === 'undefined') return;
        
        try {
            // Check device fingerprint ban
            if (this.deviceFingerprint) {
                const fpBan = await firebase.database().ref(`bans/devices/${this.deviceFingerprint.replace(/[.#$\/\[\]]/g, '_')}`).once('value');
                if (fpBan.exists()) {
                    this.showBanScreen(fpBan.val());
                    return;
                }
            }
            
            // Check IP ban
            if (this.ipAddress) {
                const ipKey = this.ipAddress.replace(/\./g, '_');
                const ipBan = await firebase.database().ref(`bans/ips/${ipKey}`).once('value');
                if (ipBan.exists()) {
                    this.showBanScreen(ipBan.val());
                    return;
                }
            }
        } catch (e) {
            console.warn('Ban check failed:', e);
        }
    }
    
    // Show ban screen
    showBanScreen(banInfo) {
        document.body.innerHTML = `
            <div style="position:fixed;inset:0;background:#0a0a0f;display:flex;align-items:center;justify-content:center;z-index:99999;">
                <div style="text-align:center;color:white;font-family:system-ui,sans-serif;padding:40px;">
                    <div style="font-size:80px;margin-bottom:20px;">🚫</div>
                    <h1 style="font-size:32px;margin-bottom:10px;color:#ef4444;">ACCESS DENIED</h1>
                    <p style="color:#94a3b8;margin-bottom:20px;">Your device has been banned from Nightclub.</p>
                    <p style="color:#64748b;font-size:14px;">Reason: ${banInfo.reason || 'Cheating/Violation of Terms'}</p>
                    <p style="color:#475569;font-size:12px;margin-top:30px;">Ban ID: ${this.deviceFingerprint || 'Unknown'}</p>
                </div>
            </div>
        `;
        
        // Disable all game functionality
        if (window.game) window.game = null;
        if (window.cloudSave) window.cloudSave = null;
    }

    // Monitor for impossible value changes
    startMonitoring() {
        // Initial values
        if (window.game) {
            this.lastCash = window.game.cash;
            this.lastDiamonds = window.game.diamonds;
        }

        this.checksumInterval = setInterval(() => {
            if (!window.game) return;
            
            const now = Date.now();
            const timeDelta = (now - this.lastCheck) / 1000; // seconds
            
            // Check for impossible cash gains (max ~$500/second legitimately)
            const cashDiff = window.game.cash - this.lastCash;
            const maxPossibleGain = Math.max(timeDelta * 500, 5000); // Allow burst earnings
            
            if (cashDiff > maxPossibleGain && cashDiff > 50000) {
                this.flagViolation('CASH_MANIPULATION', `Gained $${cashDiff.toLocaleString()} in ${timeDelta.toFixed(1)}s`);
            }
            
            // Check for impossible diamond gains (should only come from purchases/rewards)
            const diamondDiff = window.game.diamonds - this.lastDiamonds;
            if (diamondDiff > 50 && this.lastDiamonds > 0) {
                this.flagViolation('DIAMOND_MANIPULATION', `Gained ${diamondDiff} diamonds suddenly`);
            }
            
            // Check for negative values (shouldn't happen)
            if (window.game.cash < 0 || window.game.diamonds < 0) {
                this.flagViolation('NEGATIVE_VALUES', 'Negative currency detected');
                window.game.cash = Math.max(0, window.game.cash);
                window.game.diamonds = Math.max(0, window.game.diamonds);
            }
            
            // Check for impossible levels
            if (window.game.level > 100) {
                this.flagViolation('LEVEL_MANIPULATION', `Invalid level: ${window.game.level}`);
                window.game.level = 100;
            }
            
            // Check for NaN values
            if (isNaN(window.game.cash) || isNaN(window.game.diamonds)) {
                this.flagViolation('NAN_VALUES', 'NaN currency detected');
                window.game.cash = 1000;
                window.game.diamonds = 5;
            }
            
            // Update tracking
            this.lastCash = window.game.cash;
            this.lastDiamonds = window.game.diamonds;
            this.lastCheck = now;
            
        }, 5000); // Check every 5 seconds
    }

    // Detect DevTools opening
    detectDevTools() {
        let devToolsOpen = false;
        const threshold = 160;
        
        const checkDevTools = () => {
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;
            
            if ((widthThreshold || heightThreshold) && !devToolsOpen) {
                devToolsOpen = true;
                this.onDevToolsOpen();
            } else if (!widthThreshold && !heightThreshold) {
                devToolsOpen = false;
            }
        };
        
        setInterval(checkDevTools, 2000);
        
        // Detect debugger
        setInterval(() => {
            const start = performance.now();
            debugger;
            const end = performance.now();
            if (end - start > 100) {
                this.onDevToolsOpen();
            }
        }, 5000);
    }

    onDevToolsOpen() {
        console.warn('🛡️ Developer tools detected - game activity is being monitored');
        
        // Log to Firebase
        this.logToFirebase('DEVTOOLS_OPEN', 'Developer tools opened');
    }

    // Protect console from common cheats
    protectConsole() {
        const self = this;
        
        // Wrap console to detect suspicious commands
        const originalEval = window.eval;
        window.eval = function(code) {
            const suspicious = [
                'game.cash', 'game.diamonds', 'game.level', 'game.xp',
                'cash=', 'diamonds=', 'level=', 'addCash', 'addDiamonds'
            ];
            
            if (suspicious.some(s => code.includes(s))) {
                self.flagViolation('EVAL_CHEAT', 'Suspicious eval detected');
                return undefined;
            }
            
            return originalEval.call(window, code);
        };
    }

    // Block common cheat patterns
    blockCommonCheats() {
        // Prevent Function constructor exploitation
        const originalFunction = Function;
        window.Function = function(...args) {
            const code = args.join('');
            if (code.includes('game.cash') || code.includes('game.diamonds')) {
                console.warn('🛡️ Blocked suspicious function creation');
                return () => {};
            }
            return originalFunction.apply(this, args);
        };

        // Freeze critical objects after game loads
        setTimeout(() => {
            if (window.game) {
                // Make certain properties harder to modify directly
                const originalAddCash = window.game.addCash?.bind(window.game);
                const originalAddXP = window.game.addXP?.bind(window.game);
                
                if (originalAddCash) {
                    window.game.addCash = function(amt) {
                        // Validate amount
                        if (amt > 100000) {
                            console.warn('🛡️ Suspicious cash amount blocked');
                            antiCheat.flagViolation('LARGE_CASH_ADD', `Attempted to add $${amt}`);
                            return;
                        }
                        return originalAddCash(amt);
                    };
                }
            }
        }, 3000);
    }

    // Validate game integrity
    validateIntegrity() {
        setInterval(() => {
            if (!window.game) return;
            
            // Check for modified functions
            const criticalFunctions = ['addCash', 'addXP', 'buyItem', 'buyFromCatalog'];
            
            criticalFunctions.forEach(fn => {
                if (window.game[fn]) {
                    const fnString = window.game[fn].toString();
                    
                    // Check for suspicious modifications
                    if (fnString.includes('= 999999') || 
                        fnString.includes('= Infinity') ||
                        fnString.includes('= 1000000')) {
                        this.flagViolation('CODE_TAMPERING', `${fn} function modified`);
                    }
                }
            });
            
            // Validate level matches XP
            const expectedLevel = this.calculateExpectedLevel(window.game.xp);
            if (window.game.level > expectedLevel + 5) {
                this.flagViolation('LEVEL_XP_MISMATCH', 
                    `Level ${window.game.level} but XP suggests ${expectedLevel}`);
            }
            
        }, 30000); // Check every 30 seconds
    }

    calculateExpectedLevel(xp) {
        // Rough calculation based on game's XP curve
        let level = 1;
        let xpNeeded = 100;
        let totalXP = 0;
        
        while (totalXP + xpNeeded <= xp && level < 100) {
            totalXP += xpNeeded;
            level++;
            xpNeeded = Math.floor(100 * Math.pow(1.5, level - 1));
        }
        
        return level;
    }

    // Flag a violation
    flagViolation(type, details) {
        this.violations++;
        console.warn(`🚨 Anti-cheat violation #${this.violations}: ${type} - ${details}`);
        
        // Log to Firebase
        this.logToFirebase(type, details);
        
        // Take action after multiple violations
        if (this.violations >= this.maxViolations) {
            this.punish();
        } else if (this.violations === 2) {
            // Warning on second violation
            if (window.ui) {
                window.ui.notify('⚠️ Suspicious activity detected. Further violations will reset your progress.', 'warning');
            }
        }
    }

    // Log to Firebase with detailed activity
    logToFirebase(type, details) {
        try {
            if (window.authSystem?.isLoggedIn && typeof firebase !== 'undefined') {
                // Capture detailed game activity
                const activity = this.captureActivity();
                
                firebase.database().ref('anticheat/violations').push({
                    odeum: window.authSystem.userId,
                    displayName: window.authSystem.displayName || 'Unknown',
                    email: window.authSystem.user?.email || 'Unknown',
                    type: type,
                    details: details,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    
                    // Device identification
                    ipAddress: this.ipAddress || 'Unknown',
                    deviceFingerprint: this.deviceFingerprint || 'Unknown',
                    userAgent: navigator.userAgent.substring(0, 300),
                    screenResolution: `${screen.width}x${screen.height}`,
                    platform: navigator.platform,
                    language: navigator.language,
                    
                    // Game state at time of violation
                    gameState: {
                        cash: window.game?.cash || 0,
                        diamonds: window.game?.diamonds || 0,
                        level: window.game?.level || 1,
                        xp: window.game?.xp || 0,
                        hype: window.game?.hype || 0,
                        clubTier: window.game?.clubTier || 1,
                        clubName: window.game?.clubName || 'Unknown',
                        visitors: window.game?.visitors?.length || 0,
                        maxVisitors: window.game?.maxVisitors || 0,
                        totalEarnings: window.game?.totalEarnings || 0,
                        playTime: window.game?.playTime || 0
                    },
                    
                    // Detailed activity context
                    activity: activity,
                    
                    // Session info
                    session: {
                        pageUrl: window.location.href,
                        referrer: document.referrer || 'Direct',
                        sessionDuration: Math.floor((Date.now() - (window.sessionStartTime || Date.now())) / 1000),
                        tabVisible: !document.hidden,
                        windowFocused: document.hasFocus(),
                        connectionType: navigator.connection?.effectiveType || 'Unknown'
                    }
                });
            }
        } catch (e) {
            // Silent fail for logging
        }
    }
    
    // Capture current activity context
    captureActivity() {
        const activity = {
            recentActions: [],
            openModals: [],
            currentPage: 'game',
            mousePosition: { x: 0, y: 0 },
            lastInteraction: null
        };
        
        try {
            // Check what modals are open
            const modals = document.querySelectorAll('.modal:not(.hidden), [class*="modal"]:not(.hidden)');
            modals.forEach(m => {
                if (m.id) activity.openModals.push(m.id);
            });
            
            // Check current game mode
            if (window.game) {
                activity.gameMode = window.game.mode || 'play';
                activity.visitMode = window.game.visitMode || false;
                activity.selectedObject = window.game.selectedObject ? 'yes' : 'no';
            }
            
            // Check if in shop
            const shopPanel = document.getElementById('shop-panel');
            if (shopPanel && !shopPanel.classList.contains('hidden')) {
                activity.inShop = true;
            }
            
            // Check recent console activity (if any was logged)
            activity.consoleAccessed = this.consoleAccessed || false;
            activity.devToolsOpen = this.devToolsDetected || false;
            
            // Track violation history in session
            activity.violationsThisSession = this.violations;
            activity.previousViolationTypes = this.violationHistory || [];
            
            // Get last known good values
            activity.lastKnownCash = this.lastCash || 0;
            activity.lastKnownDiamonds = this.lastDiamonds || 0;
            activity.cashDelta = (window.game?.cash || 0) - (this.lastCash || 0);
            activity.diamondDelta = (window.game?.diamonds || 0) - (this.lastDiamonds || 0);
            
            // Time since last check
            activity.timeSinceLastCheck = Math.floor((Date.now() - this.lastCheck) / 1000) + 's';
            
        } catch (e) {
            activity.error = 'Failed to capture some activity';
        }
        
        return activity;
    }

    // Punish cheaters
    punish() {
        console.error('🚫 Multiple cheating attempts detected! Progress reset.');
        
        // Reset their progress
        if (window.game) {
            window.game.cash = 0;
            window.game.diamonds = 0;
            window.game.hype = 0;
            
            // Show warning
            if (window.ui) {
                window.ui.notify('🚫 Cheating detected! Your currencies have been reset to 0.', 'error');
            }
            
            // Force save the punishment
            if (window.cloudSave) {
                window.cloudSave.blockSaves = false;
                window.cloudSave.saveGame(window.game.getSaveData(), true);
            }
        }
        
        // Log punishment to Firebase
        try {
            if (window.authSystem?.isLoggedIn && typeof firebase !== 'undefined') {
                firebase.database().ref('anticheat/punishments').push({
                    odeum: window.authSystem.userId,
                    displayName: window.authSystem.displayName || 'Unknown',
                    violations: this.violations,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
            }
        } catch (e) {
            // Silent fail
        }
        
        // Reset violation counter (they get another chance)
        this.violations = 0;
    }

    // Server-side validation helper
    validateTransaction(type, amount) {
        const limits = {
            cash_earn: 50000,      // Max cash per transaction
            diamond_earn: 20,      // Max diamonds per transaction
            purchase: 10000000    // Max purchase amount
        };
        
        if (amount > limits[type]) {
            this.flagViolation('INVALID_TRANSACTION', `${type}: ${amount} exceeds limit`);
            return false;
        }
        
        return true;
    }

    // Disable anti-cheat (for admins)
    disable() {
        this.isEnabled = false;
        if (this.checksumInterval) {
            clearInterval(this.checksumInterval);
        }
        console.log('🛡️ Anti-cheat disabled');
    }
}

// Create singleton instance
const antiCheat = new AntiCheat();

// Start after game loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => antiCheat.init(), 3000);
    });
} else {
    setTimeout(() => antiCheat.init(), 3000);
}

// Expose for admin control
window.antiCheat = antiCheat;

export { antiCheat };
