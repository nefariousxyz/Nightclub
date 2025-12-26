// Game State Management
import { CONFIG } from './config.js';
import { ui } from './ui.js';
import { storage } from './storage.js';
import { achievementSystem } from './achievements.js';
import { staffManager } from './staff.js';
import { audioManager } from './audio.js';
import { friendsSystem } from './friends.js';
import { vipSystem } from './vip.js';
import { challengeSystem } from './challenges.js';
import { timeSystem } from './timeSystem.js';
import { statisticsSystem } from './statistics.js';
import { serverAPI } from './serverAPI.js'; // Server-side validation

// Furniture Catalog - comprehensive list of all purchasable items
// This will be updated from Firebase if available
export let FURNITURE_CATALOG = {
    // === FLOOR TILES (Cash) ===
    tile_wood: { name: 'Wooden Floor', icon: '🪵', cost: 50, currency: 'cash', category: 'floors', desc: 'Classic wood flooring' },
    tile_marble: { name: 'Marble Floor', icon: '⬜', cost: 100, currency: 'cash', category: 'floors', desc: 'Elegant marble tiles' },
    tile_checker: { name: 'Checker Floor', icon: '🏁', cost: 75, currency: 'cash', category: 'floors', desc: 'Black & white checker' },
    tile_carpet: { name: 'Red Carpet', icon: '🟥', cost: 80, currency: 'cash', category: 'floors', desc: 'VIP red carpet' },
    tile_concrete: { name: 'Concrete Floor', icon: '⬛', cost: 40, currency: 'cash', category: 'floors', desc: 'Industrial style' },
    tile_disco: { name: 'Disco Tile', icon: '🪩', cost: 150, currency: 'cash', category: 'floors', desc: 'Light-up disco floor' },

    // === PREMIUM FLOOR TILES (Diamonds) ===
    tile_gold: { name: 'Golden Floor', icon: '🟨', cost: 2, currency: 'diamonds', category: 'floors', desc: 'Luxurious gold tiles', premium: true },
    tile_neon: { name: 'Neon Floor', icon: '💜', cost: 3, currency: 'diamonds', category: 'floors', desc: 'Glowing neon tiles', premium: true },
    tile_hologram: { name: 'Hologram Floor', icon: '🌈', cost: 5, currency: 'diamonds', category: 'floors', desc: 'Animated holographic', premium: true },
    tile_lava: { name: 'Lava Floor', icon: '🔥', cost: 4, currency: 'diamonds', category: 'floors', desc: 'Animated lava effect', premium: true },
    tile_galaxy: { name: 'Galaxy Floor', icon: '🌌', cost: 6, currency: 'diamonds', category: 'floors', desc: 'Starry galaxy pattern', premium: true },

    // === BASIC FURNITURE (Cash) ===
    table: { name: 'Cocktail Table', icon: '🪑', cost: 100, currency: 'cash', category: 'furniture', desc: 'Small table for drinks' },
    booth: { name: 'VIP Booth', icon: '🛋️', cost: 500, currency: 'cash', category: 'furniture', desc: 'Cozy VIP seating', unlockLevel: 2 },
    bar: { name: 'Bar Counter', icon: '🍸', cost: 800, currency: 'cash', category: 'furniture', desc: 'Serve drinks here', unlockLevel: 2 },
    speaker: { name: 'Speaker', icon: '🔊', cost: 200, currency: 'cash', category: 'furniture', desc: 'Pumps up the music' },
    plant: { name: 'Potted Plant', icon: '🌿', cost: 75, currency: 'cash', category: 'furniture', desc: 'Add some greenery' },
    pooltable: { name: 'Pool Table', icon: '🎱', cost: 600, currency: 'cash', category: 'furniture', desc: 'Entertainment zone', unlockLevel: 3 },

    // === DANCE & ENTERTAINMENT (Cash) ===
    dancefloor: { name: 'Dance Floor', icon: '💃', cost: 1000, currency: 'cash', category: 'entertainment', desc: 'LED dance floor', unlockLevel: 1 },
    dj: { name: 'DJ Booth', icon: '🎧', cost: 1500, currency: 'cash', category: 'entertainment', desc: 'Drop the beat!', unlockLevel: 2 },
    stage: { name: 'Stage', icon: '🎤', cost: 2000, currency: 'cash', category: 'entertainment', desc: 'Performance stage', unlockLevel: 4 },
    discoball: { name: 'Disco Ball', icon: '🪩', cost: 300, currency: 'cash', category: 'lights', desc: 'Classic disco vibes' },
    laser: { name: 'Moving Head Laser', icon: '✨', cost: 750, currency: 'cash', category: 'lights', desc: 'Beam light show', unlockLevel: 3 },

    // === DECORATIONS (Cash) ===
    statue: { name: 'Statue', icon: '🗿', cost: 350, currency: 'cash', category: 'decor', desc: 'Artistic decoration' },
    fountain: { name: 'Fountain', icon: '⛲', cost: 700, currency: 'cash', category: 'decor', desc: 'Water feature', unlockLevel: 3 },
    neon_sign: { name: 'Neon Sign', icon: '💡', cost: 250, currency: 'cash', category: 'decor', desc: 'Glowing signage' },
    palm_tree: { name: 'Palm Tree', icon: '🌴', cost: 150, currency: 'cash', category: 'decor', desc: 'Tropical vibes' },
    rope_barrier: { name: 'VIP Rope', icon: '🚧', cost: 100, currency: 'cash', category: 'decor', desc: 'VIP area barrier' },

    // === CLUB LIGHTS (Cash) ===
    multi_laser: { name: 'Multi Laser Array', icon: '🌈', cost: 1500, currency: 'cash', category: 'lights', desc: '5-beam RGB laser', unlockLevel: 4 },
    strobe: { name: 'Strobe Light', icon: '⚡', cost: 600, currency: 'cash', category: 'lights', desc: 'Intense flash effects', unlockLevel: 2 },
    effects_light: { name: 'Derby Effects Light', icon: '🎨', cost: 1200, currency: 'cash', category: 'lights', desc: 'Multi-color party beams', unlockLevel: 5 },
    wall_light: { name: 'LED Wall Sconce', icon: '💡', cost: 400, currency: 'cash', category: 'lights', desc: 'RGB wall accent light', unlockLevel: 1 },
    moving_head: { name: 'Moving Head Spotlight', icon: '🔦', cost: 900, currency: 'cash', category: 'lights', desc: 'Pan/tilt stage light', unlockLevel: 3 },

    // === SEATING (Cash) ===
    sofa: { name: 'Sofa', icon: '🛋️', cost: 200, currency: 'cash', category: 'seating', desc: 'Comfortable sofa' },
    barstool: { name: 'Bar Stool', icon: '🪑', cost: 50, currency: 'cash', category: 'seating', desc: 'Bar seating' },
    lounge_chair: { name: 'Lounge Chair', icon: '💺', cost: 150, currency: 'cash', category: 'seating', desc: 'Relaxation zone' },
    bean_bag: { name: 'Bean Bag', icon: '🫘', cost: 80, currency: 'cash', category: 'seating', desc: 'Casual seating' },

    // === PREMIUM FURNITURE (Diamonds) ===
    viparea: { name: 'VIP Area', icon: '👑', cost: 5, currency: 'diamonds', category: 'premium', desc: 'Exclusive VIP section', premium: true },
    aquarium: { name: 'Aquarium', icon: '🐠', cost: 8, currency: 'diamonds', category: 'premium', desc: 'Giant fish tank', premium: true },
    helicopter: { name: 'Helipad', icon: '🚁', cost: 15, currency: 'diamonds', category: 'premium', desc: 'Rooftop helipad!', premium: true },
    champagne_tower: { name: 'Champagne Tower', icon: '🍾', cost: 4, currency: 'diamonds', category: 'premium', desc: 'Stacked champagne', premium: true },
    ice_sculpture: { name: 'Ice Sculpture', icon: '🧊', cost: 3, currency: 'diamonds', category: 'premium', desc: 'Frozen art piece', premium: true },
    fire_pit: { name: 'Fire Pit', icon: '🔥', cost: 4, currency: 'diamonds', category: 'premium', desc: 'Ambient fire', premium: true },
    photo_booth: { name: 'Photo Booth', icon: '📸', cost: 6, currency: 'diamonds', category: 'premium', desc: 'Guest selfie spot', premium: true },
    throne: { name: 'VIP Throne', icon: '🪑', cost: 10, currency: 'diamonds', category: 'premium', desc: 'Royal seating', premium: true },
    led_wall: { name: 'LED Wall', icon: '📺', cost: 8, currency: 'diamonds', category: 'premium', desc: 'Video display wall', premium: true },
    smoke_machine: { name: 'Smoke Machine', icon: '💨', cost: 3, currency: 'diamonds', category: 'premium', desc: 'Fog effects', premium: true },
};

class GameState {
    constructor() {
        this.cash = CONFIG.INITIAL_CASH;
        this.diamonds = 5; // Premium currency - start with 5
        this.hype = CONFIG.INITIAL_HYPE;
        this.barStock = CONFIG.INITIAL_BAR_STOCK;
        this.visitors = [];
        this.queue = [];
        this.furniture = [];
        this.maxVisitors = CONFIG.INITIAL_MAX_VISITORS;
        this.spawnRate = CONFIG.INITIAL_SPAWN_RATE;
        this.lastSpawn = 0;
        this.mode = 'play';
        this.selectedObject = null;
        this.eventMultiplier = 1;
        this.level = 1;

        // Economy system (from admin)
        this.globalMultiplier = 1;
        this.activeEconomyEvents = {};
        this.economyListenerActive = false;
        this.xp = 0;
        this.clubName = "My Club";
        this.clubTier = 1;
        this.ownerName = "Player";
        this.activeCelebrities = []; // Currently hired celebrities

        // Visit mode properties
        this.visitMode = false;
        this.visitingFriendUid = null;
        this.visitingFriendName = null;

        this.stats = {
            capacityLevel: 1,
            marketingLevel: 1,
            profitLevel: 1
        };

        // Staff reference
        this.staff = {
            bartenders: 0,
            djs: 0,
            bouncers: 0,
            promoters: 0,
            managers: 0
        };

        // Statistics for achievements
        this.totalEarnings = 0;
        this.totalDrinksServed = 0;
        this.totalVisitors = 0;
        this.eventsHosted = 0;
        this.playTime = 0;
        this.achievements = [];

        // Settings
        this.tutorialComplete = false;
        this.soundEnabled = true;
        this.musicEnabled = true;

        // Auto-save timer
        this.lastSave = 0;
        this.autoSaveInterval = CONFIG.AUTO_SAVE_INTERVAL;

        // References set by scene.js
        this.scene = null;
        this.controls = null;
        this.highlightBox = null;
        this.createFloatingText = null;

        // Server validation system
        this.validationQueue = [];
        this.pendingValidations = new Map();
        this.serverValidationEnabled = true;
        this.lastServerSync = 0;

        // Start periodic server sync (every 5 minutes)
        if (typeof window !== 'undefined') {
            setInterval(() => this.syncWithServer(), 5 * 60 * 1000);
        }
    }

    // Load shop catalog from Firebase
    async loadShopCatalog() {
        try {
            if (typeof firebase !== 'undefined' && firebase.database) {
                const snapshot = await firebase.database().ref('shop/catalog').once('value');
                const catalog = snapshot.val();

                if (catalog) {
                    // Merge Firebase catalog with default (Firebase takes precedence)
                    // Filter out disabled items
                    const enabledCatalog = {};
                    for (const [key, item] of Object.entries(catalog)) {
                        if (item.enabled !== false) {
                            enabledCatalog[key] = item;
                        }
                    }
                    FURNITURE_CATALOG = enabledCatalog;
                    console.log('📦 Shop catalog loaded from Firebase:', Object.keys(FURNITURE_CATALOG).length, 'items');
                }
            }
        } catch (e) {
            console.warn('Could not load shop catalog from Firebase, using defaults:', e.message);
        }
    }

    // Initialize from save or fresh start
    async init() {
        console.log('=== GAME INIT START ===');

        // Load shop catalog from Firebase first
        await this.loadShopCatalog();

        // Check for visit mode from URL
        const urlParams = new URLSearchParams(window.location.search);
        const visitFriendUid = urlParams.get('visit');

        if (visitFriendUid) {
            console.log('Visit mode detected for friend:', visitFriendUid);
            this.visitMode = true;
            this.visitingFriendUid = visitFriendUid;

            // Load friend's club data instead of own
            await this.loadFriendClub(visitFriendUid);
            return;
        }

        // Initialize audio
        await audioManager.init();

        // Check if this is a brand new account
        const newAccountData = localStorage.getItem('nightclub_new_account');
        const isNewAccount = newAccountData || window.authSystem?.isNewRegistration;

        if (isNewAccount) {
            console.log('New account - starting fresh with custom club name');
            try {
                const accountInfo = newAccountData ? JSON.parse(newAccountData) : {};
                if (accountInfo.clubName) this.clubName = accountInfo.clubName;
                if (accountInfo.ownerName) this.ownerName = accountInfo.ownerName;
                console.log('Set club:', this.clubName, 'Owner:', this.ownerName);
            } catch (e) {
                console.warn('Could not parse new account data:', e);
            }
            // Initialize challenges for new user
            challengeSystem.init();
            ui.notify("Welcome! Start building your club!", "success");
        } else if (window.cloudSave && window.authSystem?.isLoggedIn) {
            // ONLY load from Firebase cloud - no localStorage
            try {
                console.log('Loading from cloud for user:', window.authSystem.userId);
                const cloudData = await window.cloudSave.loadGame();

                if (cloudData) {
                    console.log('Cloud data found - loading save');
                    this.loadFromSave(cloudData);
                    ui.notify("☁️ Game loaded from cloud!", "success");
                } else {
                    console.log('No cloud save - starting fresh!');
                    // Initialize challenges for user with no save
                    challengeSystem.init();
                    ui.notify("Welcome! Start building your club!", "success");
                }
            } catch (err) {
                console.error('Cloud load failed:', err);
                // Initialize challenges even on error
                challengeSystem.init();
                ui.notify("Could not load cloud save", "error");
            }
        } else {
            console.log('Not logged in - starting fresh');
            // Initialize challenges for non-logged-in user
            challengeSystem.init();
        }

        // Start auto-save (to cloud only)
        setInterval(() => this.autoSave(), this.autoSaveInterval);

        // Initialize economy system (admin multipliers & events)
        this.initEconomySystem();
    }

    loadFromSave(data) {
        console.log('=== LOADING SAVE DATA ===');
        console.log('data.clubTier from save:', data.clubTier);

        this.cash = data.cash || CONFIG.INITIAL_CASH;
        this.diamonds = data.diamonds || 5;
        this.hype = data.hype || CONFIG.INITIAL_HYPE;
        this.barStock = data.barStock || CONFIG.INITIAL_BAR_STOCK;
        this.level = data.level || 1;
        this.xp = data.xp || 0;
        this.clubName = data.clubName || "My Club";
        this.clubTier = data.clubTier || 1;
        this.ownerName = data.ownerName || "Player";

        console.log('Set game.clubTier to:', this.clubTier);

        // Sync club tier with capacity level (every 3 levels = 1 tier)
        if (data.stats?.capacityLevel) {
            const expectedTier = Math.min(6, Math.floor(data.stats.capacityLevel / 3) + 1);
            if (expectedTier > this.clubTier) {
                console.log('Syncing clubTier from', this.clubTier, 'to', expectedTier, 'based on capacityLevel', data.stats.capacityLevel);
                this.clubTier = expectedTier;
            }
        }

        this.maxVisitors = data.maxVisitors || CONFIG.INITIAL_MAX_VISITORS;
        this.spawnRate = data.spawnRate || CONFIG.INITIAL_SPAWN_RATE;

        if (data.stats) this.stats = { ...this.stats, ...data.stats };
        if (data.staff) {
            this.staff = { ...this.staff, ...data.staff };
            staffManager.loadStaff(data.staff);
        }

        this.totalEarnings = data.totalEarnings || 0;
        this.totalDrinksServed = data.totalDrinksServed || 0;
        this.totalVisitors = data.totalVisitors || 0;
        this.eventsHosted = data.eventsHosted || 0;
        this.playTime = data.playTime || 0;
        this.tutorialComplete = data.tutorialComplete || false;
        this.soundEnabled = data.soundEnabled !== false;
        this.musicEnabled = data.musicEnabled !== false;

        if (data.achievements) {
            this.achievements = data.achievements;
            achievementSystem.loadUnlocked(data.achievements);
        }

        // Furniture will be restored by scene.js
        this.savedFurniture = data.furniture || [];

        // Visitors will be restored by scene.js
        this.savedVisitors = data.visitors || [];

        // Load premium data
        if (window.premiumSystem) {
            if (data.coins !== undefined) window.premiumSystem.coins = data.coins;
            if (data.isVIP !== undefined) window.premiumSystem.isVIP = data.isVIP;
            if (data.vipExpiry) window.premiumSystem.vipExpiry = data.vipExpiry;
            if (data.purchasedItems) window.premiumSystem.purchasedItems = data.purchasedItems;
            window.premiumSystem.updateUI();
        }

        // Load challenges/daily rewards data
        if (data.challenges) {
            challengeSystem.load(data.challenges);
            console.log('Loaded challenges data from save');
        } else {
            challengeSystem.init();
        }

        // Update displays
        if (window.updateClubDisplay) window.updateClubDisplay();
        if (window.updateProfileModal) window.updateProfileModal();
    }

    autoSave() {
        this.staff = staffManager.staff;
        this.achievements = achievementSystem.unlocked;
        storage.save(this);

        // Also trigger cloud save (non-blocking)
        if (window.cloudSave && window.cloudSave.autoSave) {
            window.cloudSave.autoSave();
        }

        // Sync stats to Firebase for chat system
        if (window.chatSystem && window.chatSystem.syncUserProfile) {
            const user = window.chatSystem.auth?.currentUser;
            if (user) {
                window.chatSystem.syncUserProfile(user);
            }
        }
    }

    // Load a friend's club for visiting
    async loadFriendClub(friendUid) {
        console.log('Loading friend club for visit:', friendUid);

        try {
            // Get visit info from sessionStorage
            const visitInfo = JSON.parse(sessionStorage.getItem('visitMode') || '{}');
            this.visitingFriendName = visitInfo.friendName || 'Friend';

            // Initialize audio in visit mode too
            await audioManager.init();

            // Load friend's club data from Firestore (where saves are stored)
            const db = firebase.firestore();
            const doc = await db.collection('saves').doc(friendUid).get();
            const friendData = doc.exists ? doc.data() : null;

            if (!friendData) {
                ui.notify('Could not load friend\'s club data', 'error');
                window.location.href = 'index.html';
                return;
            }

            // Load the friend's data
            this.loadFromSave(friendData);

            // Override club name display
            this.clubName = visitInfo.clubName || friendData.clubName || `${this.visitingFriendName}'s Club`;
            this.ownerName = this.visitingFriendName;

            // Show visit mode banner
            this.showVisitModeBanner();

            // Disable auto-save in visit mode
            this.autoSaveInterval = Infinity;

            ui.notify(`👀 Visiting ${this.visitingFriendName}'s Club`, 'success');

        } catch (e) {
            console.error('Failed to load friend club:', e);
            ui.notify('Failed to load club', 'error');
            window.location.href = 'index.html';
        }
    }

    // Show visit mode UI banner
    showVisitModeBanner() {
        const banner = document.createElement('div');
        banner.id = 'visit-mode-banner';
        banner.innerHTML = `
            <div class="visit-banner-content">
                <span class="visit-icon">👀</span>
                <span class="visit-text">Visiting <strong>${this.visitingFriendName}'s Club</strong></span>
                <span class="visit-mode-tag">PREVIEW</span>
            </div>
            <div class="visit-banner-actions">
                <button class="visit-gift-btn" onclick="game.sendGiftFromVisit()">
                    <i class="ph-fill ph-gift"></i> Send Gift
                </button>
                <button class="visit-exit-btn" onclick="game.exitVisitMode()">
                    <i class="ph-fill ph-house"></i> Go Back to My Club
                </button>
            </div>
        `;
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 50px;
            background: linear-gradient(90deg, #8b5cf6, #a855f7);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            z-index: 9999;
            color: white;
            font-family: 'Outfit', sans-serif;
            box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        `;
        document.body.appendChild(banner);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #visit-mode-banner .visit-banner-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            #visit-mode-banner .visit-icon {
                font-size: 24px;
            }
            #visit-mode-banner .visit-text {
                font-size: 15px;
            }
            #visit-mode-banner .visit-mode-tag {
                background: rgba(255,255,255,0.2);
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 1px;
            }
            #visit-mode-banner .visit-banner-actions {
                display: flex;
                gap: 10px;
            }
            #visit-mode-banner .visit-gift-btn {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                border: none;
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
            }
            #visit-mode-banner .visit-gift-btn:hover {
                transform: scale(1.05);
            }
            #visit-mode-banner .visit-exit-btn {
                background: rgba(255,255,255,0.15);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 6px;
                transition: all 0.2s;
            }
            #visit-mode-banner .visit-exit-btn:hover {
                background: rgba(255,255,255,0.25);
            }
            body.visit-mode #ui-layer {
                top: 50px;
            }
            /* Hide everything in visit mode using CSS (works even after elements are created) */
            body.visit-mode .visit-hide {
                display: none !important;
            }
            /* Hide all HUD elements in visit mode */
            body.visit-mode #ui-layer > div.flex.justify-between > div:first-child,
            body.visit-mode #ui-layer > div.flex.justify-between > div:last-child,
            body.visit-mode #ui-layer .fixed,
            body.visit-mode #now-playing-widget,
            body.visit-mode #profile-btn,
            body.visit-mode #btn-event,
            body.visit-mode #vip-badge,
            body.visit-mode #notification-bell,
            body.visit-mode #furniture-edit-bar,
            body.visit-mode #edit-controls,
            body.visit-mode #chat-dock-btn,
            body.visit-mode #restock-btn,
            body.visit-mode #btn-mode,
            body.visit-mode #stock-box,
            body.visit-mode .glass-panel.rounded-2xl.p-2,
            body.visit-mode [class*="fixed"][class*="left-3"],
            body.visit-mode [class*="fixed"][class*="right-3"],
            body.visit-mode [class*="fixed"][class*="bottom-2"] {
                display: none !important;
                visibility: hidden !important;
            }
            /* Keep club badge visible */
            body.visit-mode #club-badge,
            body.visit-mode #club-badge * {
                display: block !important;
                visibility: visible !important;
            }
        `;
        document.head.appendChild(style);
        document.body.classList.add('visit-mode');

        // Function to hide all UI elements
        const hideVisitModeUI = () => {
            // Hide specific elements by ID
            const idsToHide = [
                'now-playing-widget', 'profile-btn', 'btn-event', 'vip-badge',
                'notification-bell', 'furniture-edit-bar', 'edit-controls',
                'chat-dock-btn', 'restock-btn', 'btn-mode', 'stock-box',
                'level-display', 'cash-display', 'coins-display', 'hype-display',
                'friends-dock-btn', 'world-dock-btn', 'game-time', 'day-count'
            ];
            idsToHide.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.setProperty('display', 'none', 'important');
                    // Also hide parent containers
                    let parent = el.parentElement;
                    for (let i = 0; i < 3; i++) {
                        if (parent && parent.classList.contains('glass-panel')) {
                            parent.style.setProperty('display', 'none', 'important');
                        }
                        if (parent) parent = parent.parentElement;
                    }
                }
            });

            // Hide all fixed position elements except visit banner
            document.querySelectorAll('.fixed').forEach(el => {
                if (!el.closest('#visit-mode-banner')) {
                    el.style.setProperty('display', 'none', 'important');
                }
            });

            // Hide the bottom dock
            document.querySelectorAll('.glass-panel.rounded-2xl').forEach(el => {
                el.style.setProperty('display', 'none', 'important');
            });

            // Hide entire ui-layer children except club badge parent
            const uiLayer = document.getElementById('ui-layer');
            if (uiLayer) {
                uiLayer.querySelectorAll('*').forEach(el => {
                    if (!el.closest('#club-badge') && el.id !== 'club-badge' && !el.contains(document.getElementById('club-badge'))) {
                        el.style.setProperty('display', 'none', 'important');
                    }
                });

                // Re-show club badge
                const clubBadge = document.getElementById('club-badge');
                if (clubBadge) {
                    clubBadge.style.setProperty('display', 'block', 'important');
                    let parent = clubBadge.parentElement;
                    while (parent && parent.id !== 'ui-layer') {
                        parent.style.setProperty('display', 'flex', 'important');
                        parent = parent.parentElement;
                    }
                }
            }
        };

        // Run immediately and after delays to catch dynamically created elements
        hideVisitModeUI();
        setTimeout(hideVisitModeUI, 100);
        setTimeout(hideVisitModeUI, 500);
        setTimeout(hideVisitModeUI, 1000);
        setTimeout(hideVisitModeUI, 2000);
        setTimeout(hideVisitModeUI, 3000);
    }

    // Send gift while in visit mode
    sendGiftFromVisit() {
        if (!this.visitingFriendUid) return;

        // Get visit info
        const visitInfo = JSON.parse(sessionStorage.getItem('visitMode') || '{}');
        const friendName = visitInfo.friendName || 'Friend';

        // Open gift modal if friendsSystem has it
        if (window.friendsSystem && typeof window.friendsSystem.openGiftModal === 'function') {
            window.friendsSystem.openGiftModal(this.visitingFriendUid, friendName);
        } else {
            ui.notify('Gift system not available', 'info');
        }
    }

    // Exit visit mode and return to index
    exitVisitMode() {
        sessionStorage.removeItem('visitMode');
        window.location.href = 'index.html';
    }

    // Get all save data for cloud save
    getSaveData() {
        return {
            // Core stats
            cash: this.cash,
            diamonds: this.diamonds,
            hype: this.hype,
            barStock: this.barStock,
            level: this.level,
            xp: this.xp,

            // Club info
            clubName: this.clubName,
            clubTier: this.clubTier,
            ownerName: this.ownerName,

            // Capacity & spawn
            maxVisitors: this.maxVisitors,
            spawnRate: this.spawnRate,

            // Upgrades (capacity, marketing, profit levels)
            stats: {
                capacityLevel: this.stats.capacityLevel || 1,
                marketingLevel: this.stats.marketingLevel || 1,
                profitLevel: this.stats.profitLevel || 1
            },

            // Staff counts
            staff: {
                bartenders: staffManager.staff.bartenders || 0,
                djs: staffManager.staff.djs || 0,
                bouncers: staffManager.staff.bouncers || 0,
                promoters: staffManager.staff.promoters || 0,
                managers: staffManager.staff.managers || 0
            },

            // Statistics
            totalEarnings: this.totalEarnings,
            totalDrinksServed: this.totalDrinksServed,
            totalVisitors: this.totalVisitors,
            eventsHosted: this.eventsHosted,
            playTime: this.playTime,

            // Progress
            achievements: achievementSystem.unlocked || [],
            tutorialComplete: this.tutorialComplete,

            // Settings
            soundEnabled: this.soundEnabled,
            musicEnabled: this.musicEnabled,

            // Furniture with full details (type, position, rotation)
            furniture: this.furniture.map(f => ({
                type: f.userData?.type,
                x: Math.round((f.position?.x || 0) * 100) / 100,
                y: Math.round((f.position?.y || 0) * 100) / 100,
                z: Math.round((f.position?.z || 0) * 100) / 100,
                rotationY: Math.round((f.rotation?.y || 0) * 100) / 100
            })).filter(f => f.type),

            // Visitors in club (persist them!)
            visitors: (this.visitors || []).filter(v => v && !v.isLeaving).map(v => ({
                x: Math.round((v.mesh?.position?.x || 0) * 100) / 100,
                z: Math.round((v.mesh?.position?.z || 0) * 100) / 100,
                mood: Math.round(v.mood || 70),
                state: v.state || 'idle',
                isCelebrity: v.isCelebrity || false,
                timeInClub: Math.round(v.timeInClub || 0),
                frustration: Math.round(v.frustration || 0)
            })).slice(0, 50), // Max 50 visitors saved

            // Premium data
            coins: window.premiumSystem?.coins || 0,
            isVIP: window.premiumSystem?.isVIP || false,
            vipExpiry: window.premiumSystem?.vipExpiry || null,
            purchasedItems: window.premiumSystem?.purchasedItems || [],

            // Daily Rewards/Challenges data
            challenges: challengeSystem.save(),

            // Timestamp
            savedAt: Date.now()
        };
    }

    // Rename club
    renameClub(newName) {
        if (!newName || newName.trim().length < 2) {
            ui.notify('Club name must be at least 2 characters', 'error');
            return false;
        }
        if (newName.trim().length > 30) {
            ui.notify('Club name too long (max 30 characters)', 'error');
            return false;
        }

        this.clubName = newName.trim();
        ui.notify(`Club renamed to "${this.clubName}"!`, 'success');

        // Update displays
        if (window.updateClubDisplay) {
            window.updateClubDisplay();
        }
        if (window.updateProfileModal) {
            window.updateProfileModal();
        }

        this.autoSave();
        return true;
    }

    manualSave() {
        this.autoSave();
        ui.notify("Game saved!", "success");
        audioManager.play('notification');
    }

    // ============================
    // GIFT CODE REDEMPTION SYSTEM
    // ============================

    openRedeemModal() {
        this.closeModals();
        const modal = document.getElementById('redeem-modal');
        if (modal) {
            modal.classList.remove('hidden');
            const input = document.getElementById('redeem-code-input');
            if (input) {
                input.value = '';
                input.focus();
            }
            const status = document.getElementById('redeem-status');
            if (status) status.classList.add('hidden');
        }
    }

    closeRedeemModal() {
        const modal = document.getElementById('redeem-modal');
        if (modal) modal.classList.add('hidden');
    }

    async redeemCode() {
        const input = document.getElementById('redeem-code-input');
        const status = document.getElementById('redeem-status');
        const btn = document.getElementById('redeem-btn');

        if (!input || !status || !btn) return;

        const code = input.value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (!code || code.length < 4) {
            this.showRedeemStatus('Please enter a valid code', 'error');
            return;
        }

        // Check if user is logged in
        const user = firebase.auth().currentUser;
        if (!user) {
            this.showRedeemStatus('Please log in to redeem codes', 'error');
            return;
        }

        // Disable button
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner animate-spin"></i> Checking...';

        try {
            const db = firebase.database();
            const codeRef = db.ref(`giftCodes/${code}`);
            const snap = await codeRef.once('value');

            if (!snap.exists()) {
                this.showRedeemStatus('Invalid code. Please check and try again.', 'error');
                this.resetRedeemBtn();
                return;
            }

            const coupon = snap.val();
            const now = Date.now();

            // Check if active
            if (!coupon.active) {
                this.showRedeemStatus('This code has been disabled.', 'error');
                this.resetRedeemBtn();
                return;
            }

            // Check expiry
            if (coupon.expiresAt > 0 && coupon.expiresAt < now) {
                this.showRedeemStatus('This code has expired.', 'error');
                this.resetRedeemBtn();
                return;
            }

            // Check max uses
            if (coupon.usedCount >= coupon.maxUses) {
                this.showRedeemStatus('This code has reached its maximum uses.', 'error');
                this.resetRedeemBtn();
                return;
            }

            // Check if user already redeemed
            if (coupon.usedBy && coupon.usedBy[user.uid]) {
                this.showRedeemStatus('You have already redeemed this code!', 'error');
                this.resetRedeemBtn();
                return;
            }

            // IMPORTANT: Tell anti-cheat this is a legitimate operation BEFORE changing values
            if (window.antiCheat) {
                window.antiCheat.allowLegitimateOperation(10000); // 10 seconds
            }

            // Apply rewards
            const rewards = coupon.rewards || {};
            let rewardText = [];

            // Store current values before adding
            const oldCash = this.cash;
            const oldDiamonds = this.diamonds;

            if (rewards.cash > 0) {
                this.cash = (this.cash || 0) + rewards.cash;
                rewardText.push(`💰 ${rewards.cash.toLocaleString()} Cash`);
            }

            if (rewards.diamonds > 0) {
                this.diamonds = (this.diamonds || 0) + rewards.diamonds;
                rewardText.push(`💎 ${rewards.diamonds} Diamonds`);
            }

            // Update anti-cheat's tracked values to prevent future false positives
            if (window.antiCheat) {
                window.antiCheat.lastCash = this.cash;
                window.antiCheat.lastDiamonds = this.diamonds;
            }

            console.log('🎁 Redeem - Before:', oldCash, oldDiamonds, '| After:', this.cash, this.diamonds);

            // Update coupon usage in Firebase
            await codeRef.update({
                usedCount: (coupon.usedCount || 0) + 1,
                [`usedBy/${user.uid}`]: {
                    userName: user.displayName || user.email || 'Unknown',
                    redeemedAt: firebase.database.ServerValue.TIMESTAMP
                }
            });

            // Get full save data with updated values
            const saveData = this.getSaveData();
            console.log('🎁 SaveData cash:', saveData.cash, 'diamonds:', saveData.diamonds);

            // Save to Realtime Database (what admin reads)
            await db.ref(`saves/${user.uid}`).set(saveData);
            console.log('🎁 Saved to Realtime DB');

            // Also update Firestore saves collection
            try {
                await firebase.firestore().collection('saves').doc(user.uid).set({
                    ...saveData,
                    savedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('🎁 Saved to Firestore saves');
            } catch (e) { console.warn('Firestore saves update failed:', e); }

            // Also update Firestore users collection
            try {
                await firebase.firestore().collection('users').doc(user.uid).update({
                    coins: this.cash,
                    diamonds: this.diamonds
                });
                console.log('🎁 Saved to Firestore users');
            } catch (e) { console.warn('Firestore users update failed:', e); }

            // Also save to local storage
            if (window.storage) {
                window.storage.save(this);
            }

            // Update UI
            this.updateUI();

            // Show success
            this.showRedeemStatus(`🎉 Success! You received: ${rewardText.join(' + ')}`, 'success');
            ui.notify(`Code redeemed! +${rewardText.join(' + ')}`, 'success');
            audioManager.play('success');

            // Clear input
            input.value = '';

            // Create celebration effect
            this.createRedeemCelebration();

        } catch (e) {
            console.error('Redeem error:', e);
            this.showRedeemStatus('Error redeeming code. Please try again.', 'error');
        }

        this.resetRedeemBtn();
    }

    showRedeemStatus(message, type) {
        const status = document.getElementById('redeem-status');
        if (!status) return;

        status.classList.remove('hidden', 'text-red-400', 'text-green-400', 'text-yellow-400');
        status.classList.add(type === 'error' ? 'text-red-400' : type === 'success' ? 'text-green-400' : 'text-yellow-400');
        status.innerHTML = message;
    }

    resetRedeemBtn() {
        const btn = document.getElementById('redeem-btn');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="ph-fill ph-gift"></i> Redeem';
        }
    }

    createRedeemCelebration() {
        // Create confetti effect
        const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#A855F7'];
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position: fixed;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    left: ${50 + (Math.random() - 0.5) * 30}%;
                    top: 40%;
                    z-index: 9999;
                    border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
                    pointer-events: none;
                    animation: confetti-fall 2s ease-out forwards;
                `;
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 2000);
            }, i * 30);
        }

        // Add confetti animation if not exists
        if (!document.getElementById('confetti-style')) {
            const style = document.createElement('style');
            style.id = 'confetti-style';
            style.textContent = `
                @keyframes confetti-fall {
                    0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
                    100% { transform: translateY(300px) rotate(720deg) scale(0); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Economy System - Load from Firebase
    initEconomySystem() {
        if (this.economyListenerActive) return;
        if (typeof firebase === 'undefined' || !firebase.apps?.length) return;

        const db = firebase.database();

        // Listen for global multiplier
        db.ref('economy/multiplier').on('value', (snap) => {
            this.globalMultiplier = snap.val() || 1;
            console.log('💰 Global multiplier updated:', this.globalMultiplier);
        });

        // Listen for economy events
        db.ref('economy/events').on('value', (snap) => {
            const now = Date.now();
            const events = snap.val() || {};
            this.activeEconomyEvents = {};

            for (const [key, event] of Object.entries(events)) {
                if (event.endsAt > now) {
                    this.activeEconomyEvents[key] = event;
                }
            }
            console.log('🎉 Active economy events:', Object.keys(this.activeEconomyEvents));
        });

        // Listen for economy wipes/resets - force reload from cloud
        db.ref('economy/forceReload').on('value', async (snap) => {
            const reloadTime = snap.val();
            if (!reloadTime) return;

            // Only process if this reload is newer than when we loaded
            if (!this.lastEconomyReloadTime) {
                this.lastEconomyReloadTime = reloadTime;
                return; // First load, just record the time
            }

            if (reloadTime > this.lastEconomyReloadTime) {
                this.lastEconomyReloadTime = reloadTime;
                console.log('⚠️ Admin economy action detected - reloading from cloud...');

                // Block saves temporarily to prevent overwriting
                if (window.cloudSave) {
                    window.cloudSave.blockSaves = true;
                }

                // Reload from cloud
                try {
                    const cloudData = await window.cloudSave?.loadGame();
                    if (cloudData) {
                        this.cash = cloudData.cash ?? this.cash;
                        this.diamonds = cloudData.diamonds ?? this.diamonds;
                        this.updateUI();
                        ui.notify("💰 Your balance has been updated by admin", "info");
                    }
                } catch (e) {
                    console.error('Failed to reload economy data:', e);
                }

                // Re-enable saves after a short delay
                setTimeout(() => {
                    if (window.cloudSave) {
                        window.cloudSave.blockSaves = false;
                    }
                }, 2000);
            }
        });

        this.economyListenerActive = true;
        console.log('💰 Economy system initialized');
    }

    // Get current coin multiplier (global + events)
    getCoinMultiplier() {
        let mult = this.globalMultiplier || 1;

        // Double coins event
        if (this.activeEconomyEvents?.double_coins) {
            mult *= 2;
        }

        // Happy hour (+50%)
        if (this.activeEconomyEvents?.happy_hour) {
            mult *= 1.5;
        }

        return mult;
    }

    // Get current XP multiplier
    getXPMultiplier() {
        let mult = 1;

        // Triple XP event
        if (this.activeEconomyEvents?.triple_xp) {
            mult *= 3;
        }

        // Happy hour (+50%)
        if (this.activeEconomyEvents?.happy_hour) {
            mult *= 1.5;
        }

        return mult;
    }

    // Check if sale is active (returns discount multiplier)
    getSaleDiscount() {
        if (this.activeEconomyEvents?.sale) {
            return 0.5; // 50% off
        }
        return 1; // No discount
    }

    // Get sale-adjusted price
    getSalePrice(originalCost) {
        return Math.floor(originalCost * this.getSaleDiscount());
    }

    // Check if sale event is active
    isSaleActive() {
        return !!this.activeEconomyEvents?.sale;
    }

    // ========================================
    // SERVER VALIDATION HELPERS
    // ========================================

    /**
     * Sync local state with server periodically
     */
    async syncWithServer() {
        if (!this.serverValidationEnabled || !window.authSystem?.isLoggedIn) return;

        try {
            const clientState = {
                cash: this.cash,
                diamonds: this.diamonds,
                level: this.level,
                xp: this.xp
            };

            const result = await serverAPI.syncState(clientState);

            if (result && !result.synced) {
                // Server found discrepancies - use server state
                console.warn('⚠️ State mismatch detected, syncing from server');
                if (result.serverState.cash !== undefined) this.cash = result.serverState.cash;
                if (result.serverState.diamonds !== undefined) this.diamonds = result.serverState.diamonds;
                if (result.serverState.level !== undefined) this.level = result.serverState.level;
                if (result.serverState.xp !== undefined) this.xp = result.serverState.xp;
                this.updateUI();
                ui.notify('Game state synchronized with server', 'warning');
            }

            this.lastServerSync = Date.now();
        } catch (error) {
            console.warn('Server sync failed (offline?):', error.message);
        }
    }

    // Economy
    addCash(amt, reason = 'game_action') {
        if (isNaN(amt)) amt = 0;

        // Store original for validation
        const originalAmt = amt;

        amt *= this.eventMultiplier;
        amt *= this.getCelebrityMultiplier(); // Apply celebrity booking bonus
        amt *= this.getCoinMultiplier(); // Apply admin economy multiplier + events
        const finalAmt = Math.floor(amt);
        this.cash += finalAmt;
        this.totalEarnings += finalAmt;

        // Update celebrity booking timer
        this.updateCelebrityBooking();

        if (finalAmt > 0) {
            audioManager.play('cash');
            if (this.createFloatingText) {
                // Show multiplier if active
                const mult = this.getCoinMultiplier();
                const text = mult > 1 ? `+$${finalAmt} (${mult}x!)` : `+$${finalAmt}`;
                const color = mult > 1 ? '#ffd700' : '#85ff85';
                this.createFloatingText(text, { x: 0, y: 5, z: 0 }, color);
            }
        }

        this.checkAchievements();
        this.updateUI();

        // Server validation (background)
        if (this.serverValidationEnabled && window.authSystem?.isLoggedIn) {
            serverAPI.validateEarnings('cash', finalAmt, reason).catch(err => {
                console.warn('Server validation failed:', err.message);
            });
        }
    }

    addXP(amount, reason = 'game_action') {
        const originalAmt = amount;

        amount *= this.getCelebrityXPMultiplier(); // Apply celebrity XP bonus
        amount *= this.getXPMultiplier(); // Apply admin economy XP events
        const finalAmt = Math.floor(amount);
        this.xp += finalAmt;
        const xpNeeded = this.getXPForLevel(this.level + 1);

        if (this.xp >= xpNeeded) {
            this.levelUp();
        }
        this.updateUI();

        // Server validation (background)
        if (this.serverValidationEnabled && window.authSystem?.isLoggedIn) {
            serverAPI.validateEarnings('xp', finalAmt, reason).catch(err => {
                console.warn('XP validation failed:', err.message);
            });
        }
    }

    getCelebrityXPMultiplier() {
        if (this.bookedCelebrity && this.celebrities[this.bookedCelebrity]) {
            return this.celebrities[this.bookedCelebrity].xpMultiplier || 1;
        }
        return 1;
    }

    getXPForLevel(level) {
        return Math.floor(CONFIG.BASE_XP_TO_LEVEL * Math.pow(CONFIG.XP_LEVEL_MULTIPLIER, level - 1));
    }

    levelUp() {
        this.level++;
        this.xp = 0;

        audioManager.play('levelUp');
        ui.notify(`🎉 LEVEL UP! You're now level ${this.level}!`, 'success');

        // Level rewards
        const cashBonus = this.level * 100;
        this.cash += cashBonus;

        if (this.createFloatingText) {
            this.createFloatingText(`LEVEL ${this.level}!`, { x: 0, y: 8, z: 0 }, '#ffd700');
        }

        this.checkAchievements();

        // CRITICAL: Save to Firebase immediately to prevent sync rollback
        this.save();

        // Also validate with server
        if (this.serverValidationEnabled && window.authSystem?.isLoggedIn) {
            serverAPI.validateLevelUp(this.level, this.xp).catch(err => {
                console.warn('Level-up validation failed:', err.message);
            });
        }
    }

    // Club upgrade system
    getClubTierInfo() {
        return CONFIG.CLUB_TIERS.find(t => t.level === this.clubTier) || CONFIG.CLUB_TIERS[0];
    }

    getNextClubTier() {
        return CONFIG.CLUB_TIERS.find(t => t.level === this.clubTier + 1);
    }

    canUpgradeClub() {
        const nextTier = this.getNextClubTier();
        if (!nextTier) return false;
        return this.level >= nextTier.unlockLevel && this.cash >= nextTier.cost;
    }

    async upgradeClub() {
        const nextTier = this.getNextClubTier();
        if (!nextTier) {
            ui.notify("Your club is already at max size!", "info");
            return false;
        }

        if (this.level < nextTier.unlockLevel) {
            ui.notify(`Reach level ${nextTier.unlockLevel} to upgrade!`, "error");
            return false;
        }

        if (this.cash < nextTier.cost) {
            ui.notify(`Need $${nextTier.cost.toLocaleString()} to upgrade!`, "error");
            return false;
        }

        this.cash -= nextTier.cost;
        this.clubTier = nextTier.level;
        this.maxVisitors = nextTier.maxVisitors;

        console.log('Upgrading club to tier:', this.clubTier);

        ui.notify(`🎉 Upgrading to ${nextTier.name}... Please wait!`, "success");
        audioManager.play('levelUp');

        this.updateUI();

        // Save to cloud and WAIT for it to complete
        try {
            const saveData = this.getSaveData();
            console.log('Saving clubTier:', saveData.clubTier);

            if (window.cloudSave && window.cloudSave.db) {
                await window.cloudSave.saveGame(saveData, true); // Force save
                console.log('Cloud save completed!');
            }
        } catch (err) {
            console.error('Save failed:', err);
        }

        // Now reload to apply changes
        ui.notify(`🏗️ Reloading to apply expansion...`, "success");
        setTimeout(() => {
            location.reload();
        }, 1000);

        return true;
    }

    loadFromData(data) {
        this.loadFromSave(data);
        this.updateUI();
    }

    // Save to cloud and reload page (for upgrades that change club size)
    async saveAndReload() {
        try {
            const saveData = this.getSaveData();
            console.log('Saving before reload - clubTier:', saveData.clubTier);

            if (window.cloudSave && window.cloudSave.db) {
                await window.cloudSave.saveGame(saveData, true);
                console.log('Cloud save completed!');
            }
        } catch (err) {
            console.error('Save failed:', err);
        }

        setTimeout(() => {
            location.reload();
        }, 1000);
    }

    consumeStock() {
        if (this.barStock > 0) {
            this.barStock -= CONFIG.STOCK_CONSUMPTION;
            this.totalDrinksServed++;
            this.addXP(CONFIG.XP_PER_DRINK);
            challengeSystem.updateProgress('drinks', 1);
            this.checkAchievements();
            this.updateUI();
            return true;
        } else {
            // Only show notification every 5 seconds to prevent spam
            const now = Date.now();
            if (!this.lastBarEmptyNotify || now - this.lastBarEmptyNotify > 5000) {
                ui.notify("BAR EMPTY! Click Stock to restock.", "error");
                audioManager.play('error');
                this.lastBarEmptyNotify = now;
            }
            return false;
        }
    }

    restockBar() {
        if (this.cash >= CONFIG.RESTOCK_COST) {
            this.cash -= CONFIG.RESTOCK_COST;
            this.barStock = 100;
            ui.notify("Bar Restocked!", "success");
            audioManager.play('purchase');
            this.updateUI();
        } else {
            ui.notify(`Need $${CONFIG.RESTOCK_COST}`, "error");
            audioManager.play('error');
        }
    }

    checkAchievements() {
        this.achievements = achievementSystem.check(this);
    }

    // Game update (called from scene.js)
    update(delta, time = 0) {
        this.playTime += delta;
        staffManager.update(delta, this, time);
        friendsSystem.update(delta);
        timeSystem.update(delta);
        vipSystem.update(delta, this);
        statisticsSystem.update(delta, this);

        // Sync staff data
        this.staff = staffManager.staff;

        // Update challenge progress
        challengeSystem.setProgress('hype', this.hype);
        challengeSystem.setProgress('visitors', this.visitors?.length || 0);
    }

    onNewDay() {
        // Reset daily systems
        challengeSystem.resetDaily();
        if (friendsSystem && typeof friendsSystem.resetDailyVisits === 'function') {
            friendsSystem.resetDailyVisits();
        }
        ui.notify("A new day begins! Challenges reset.", "info");
    }

    // Shop & Upgrades
    openModal(type) {
        console.log('openModal called:', type);

        try {
            audioManager.play('click');
        } catch (e) {
            console.warn('Audio not ready');
        }

        // Close all other modals first to prevent overlapping
        document.querySelectorAll('.modal-overlay').forEach(m => {
            m.classList.add('hidden');
            m.classList.remove('active');
        });

        let modalId;
        switch (type) {
            case 'shop': modalId = 'shop-modal'; break;
            case 'premium-shop': modalId = 'premium-shop-modal'; break;
            case 'upgrade': modalId = 'upgrade-modal'; break;
            case 'staff': modalId = 'staff-modal'; break;
            case 'friends': modalId = 'friends-modal'; break;
            case 'achievements': modalId = 'achievements-modal'; break;
            case 'settings': modalId = 'settings-modal'; break;
            case 'challenges': modalId = 'challenges-modal'; break;
            case 'stats': modalId = 'stats-modal'; break;
            case 'profile': modalId = 'profile-modal'; break;
            case 'dj': modalId = 'dj-modal'; break;
            case 'club-upgrade': modalId = 'club-upgrade-modal'; break;
            case 'badge-shop': modalId = 'badge-shop-modal'; break;
            case 'login': modalId = 'login-modal'; break;
            case 'account': modalId = 'account-modal'; break;
            default:
                console.warn('Unknown modal type:', type);
                return;
        }

        // Update profile data when opening profile modal
        if (type === 'profile' && window.updateProfileModal) {
            window.updateProfileModal();
        }

        // Populate shop when opening
        if (type === 'shop' && window.populateShop) {
            window.populateShop('floors');
        }

        const modal = document.getElementById(modalId);
        console.log('Modal element:', modalId, modal);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('active');
        }
    }

    closeModals() {
        try {
            audioManager.play('click');
        } catch (e) { }
        document.querySelectorAll('.modal-overlay').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('active');
        });
    }

    buyItem(type, cost, unlockLevel = 1) {
        // Check level requirement
        if (this.level < unlockLevel) {
            ui.notify(`Unlock at level ${unlockLevel}!`, "error");
            audioManager.play('error');
            return;
        }

        // Check if this is a tile - use advanced tile placement mode
        if (type.startsWith('tile_')) {
            this.closeModals();
            // Use tile placement mode - don't deduct cost yet, will deduct on placement
            if (window.startTilePlacement) {
                window.startTilePlacement(type, cost);
                audioManager.play('click');
            } else {
                ui.notify("Tile system not ready!", "error");
            }
            return;
        }

        // Check level requirement BEFORE allowing purchase
        const item = FURNITURE_CATALOG[type];
        if (item && item.unlockLevel && this.level < item.unlockLevel) {
            ui.notify(`You need to be Level ${item.unlockLevel} to unlock this item!`, 'error');
            audioManager.play('error');
            return;
        }

        if (this.cash >= cost) {
            this.cash -= cost;
            this.closeModals();

            audioManager.play('purchase');

            // Will be handled by scene.js
            if (window.createFurnitureCallback) {
                const item = window.createFurnitureCallback(type, 0, 0);
                if (this.mode !== 'edit') this.toggleMode();
                this.selectedObject = item;
                this.isMovingFurniture = true; // Start following cursor immediately

                // Setup move offsets for the new item
                if (window.setupMoveOffsets) {
                    window.setupMoveOffsets([item]);
                }

                if (this.highlightBox) {
                    this.highlightBox.setFromObject(item);
                    this.highlightBox.visible = true;
                    this.highlightBox.material.color.setHex(0x00ff00); // Green = ready to place
                }
                if (this.controls) this.controls.enabled = false;

                // Show edit mode visual effect
                this.showEditModeEffect();
            }

            ui.notify("🛋️ Click to place item!", "info");
            this.checkAchievements();
            this.updateUI();

            // Server validation (background)
            if (this.serverValidationEnabled && window.authSystem?.isLoggedIn) {
                serverAPI.validatePurchase('furniture', type, {
                    x: 0, z: 0, rotation: 0
                }).catch(err => {
                    console.warn('Purchase validation failed:', err.message);
                });
            }
        } else {
            ui.notify("Not enough cash!", "error");
            audioManager.play('error');
        }
    }

    // Buy item with diamonds (premium currency)
    buyPremiumItem(type) {
        const item = FURNITURE_CATALOG[type];
        if (!item || item.currency !== 'diamonds') {
            ui.notify("Item not found!", "error");
            return;
        }

        // Check if this is a premium tile - use tile placement mode
        if (type.startsWith('tile_')) {
            this.closeModals();
            // For premium tiles, still use tile placement but with diamond cost
            if (window.startTilePlacement) {
                // Pass negative cost to indicate diamonds
                window.startTilePlacement(type, -item.cost);
                audioManager.play('click');
            } else {
                ui.notify("Tile system not ready!", "error");
            }
            return;
        }

        if (this.diamonds >= item.cost) {
            this.diamonds -= item.cost;
            this.closeModals();

            audioManager.play('purchase');

            // Will be handled by scene.js
            if (window.createFurnitureCallback) {
                const furniture = window.createFurnitureCallback(type, 0, 0);
                if (this.mode !== 'edit') this.toggleMode();
                this.selectedObject = furniture;
                this.isMovingFurniture = true; // Start following cursor immediately

                // Setup move offsets for the new item
                if (window.setupMoveOffsets) {
                    window.setupMoveOffsets([furniture]);
                }

                if (this.highlightBox) {
                    this.highlightBox.setFromObject(furniture);
                    this.highlightBox.visible = true;
                    this.highlightBox.material.color.setHex(0x00ff00); // Green = ready to place
                }
                if (this.controls) this.controls.enabled = false;

                // Show edit mode visual effect
                this.showEditModeEffect();
            }

            ui.notify(`💎 Click to place ${item.name}!`, "info");
            this.checkAchievements();
            this.updateUI();
        } else {
            ui.notify("Not enough diamonds! 💎", "error");
            audioManager.play('error');
        }
    }

    // Buy from catalog (handles both cash and diamonds)
    buyFromCatalog(type) {
        const item = FURNITURE_CATALOG[type];
        if (!item) {
            ui.notify("Item not found!", "error");
            return;
        }

        // Check level requirement
        if (item.unlockLevel && this.level < item.unlockLevel) {
            ui.notify(`Unlock at level ${item.unlockLevel}!`, "error");
            audioManager.play('error');
            return;
        }

        if (item.currency === 'diamonds') {
            this.buyPremiumItem(type);
        } else {
            // Apply sale discount for cash purchases
            const finalCost = this.getSalePrice(item.cost);
            this.buyItem(type, finalCost, item.unlockLevel || 1);
        }
    }

    buyUpgrade(type) {
        let cost = 0;
        if (type === 'capacity') cost = CONFIG.CAPACITY_BASE_COST * this.stats.capacityLevel;
        if (type === 'marketing') cost = CONFIG.MARKETING_BASE_COST * this.stats.marketingLevel;
        if (type === 'profit') cost = CONFIG.PROFIT_BASE_COST * this.stats.profitLevel;

        if (this.cash >= cost) {
            this.cash -= cost;
            audioManager.play('purchase');

            if (type === 'capacity') {
                this.stats.capacityLevel++;
                this.maxVisitors += 5;

                // Every 3 capacity levels, increase club tier (physical size)
                const newTier = Math.floor(this.stats.capacityLevel / 3) + 1;
                if (newTier > this.clubTier && newTier <= 6) {
                    this.clubTier = newTier;
                    ui.notify(`🏗️ Club expanded to tier ${newTier}! Reloading...`, "success");

                    // Force save and reload
                    this.saveAndReload();
                    return;
                }
            }
            if (type === 'marketing') {
                this.stats.marketingLevel++;
                this.spawnRate *= 0.9;
            }
            if (type === 'profit') {
                this.stats.profitLevel++;
            }

            ui.notify("Upgrade Complete!", "success");
            this.addXP(25);
            this.updateUI();
            this.autoSave(); // Save after upgrade
        } else {
            ui.notify("Not enough cash!", "error");
            audioManager.play('error');
        }
    }

    // Staff hiring
    hireStaff(type) {
        if (staffManager.hire(type, this)) {
            audioManager.play('purchase');
            this.staff = staffManager.staff;
            this.checkAchievements();
            this.updateUI();
            this.autoSave(); // Save after hiring
        }
    }

    // Friends system
    visitFriend(clubId) {
        const result = friendsSystem.visitClub(clubId, this);
        if (result) {
            audioManager.play('cash');
            this.addXP(result.xp);
            this.updateUI();
        }
    }

    inviteFriends() {
        friendsSystem.inviteFriends(this);
    }

    collectGifts() {
        const collected = friendsSystem.collectGifts(this);
        if (collected.length > 0) {
            audioManager.play('achievement');
            this.updateUI();
        }
    }

    // Settings
    toggleSound() {
        this.soundEnabled = audioManager.toggleSound();
        this.updateSettingsUI();
    }

    toggleMusic() {
        this.musicEnabled = audioManager.toggleMusic();
        this.updateSettingsUI();
    }

    updateSettingsUI() {
        const soundBtn = document.getElementById('sound-toggle');
        const musicBtn = document.getElementById('music-toggle');

        if (soundBtn) soundBtn.textContent = this.soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        if (musicBtn) musicBtn.textContent = this.musicEnabled ? '🎵 Music: ON' : '🎵 Music: OFF';
    }

    resetGame() {
        if (confirm('Are you sure you want to reset? All progress will be lost!')) {
            storage.deleteSave();
            location.reload();
        }
    }

    // Furniture helpers
    getFurniture(type) {
        return this.furniture.filter(f => f.userData.type === type);
    }

    getRandomSpot(type) {
        const items = this.getFurniture(type);
        if (items.length === 0) return null;

        const item = items[Math.floor(Math.random() * items.length)];
        const pos = { x: item.position.x, y: item.position.y, z: item.position.z };

        if (type === 'bar') pos.z += 2.5;
        if (type === 'dj') pos.z += 4;
        if (type === 'dancefloor') {
            pos.x += (Math.random() - 0.5) * 8;
            pos.z += (Math.random() - 0.5) * 8;
        } else {
            pos.x += (Math.random() - 0.5) * 1.5;
            pos.z += (Math.random() - 0.5) * 1.5;
        }
        return pos;
    }

    // Mode toggle
    toggleMode() {
        this.mode = this.mode === 'play' ? 'edit' : 'play';

        const modeBtn = document.getElementById('btn-mode');
        const editControls = document.getElementById('edit-controls');

        if (modeBtn) {
            modeBtn.innerHTML = this.mode === 'edit'
                ? '<span class="icon">✅</span><span class="label">Done</span>'
                : '<span class="icon">🔨</span><span class="label">Edit</span>';
            modeBtn.classList.toggle('active', this.mode === 'edit');
        }

        if (editControls) {
            editControls.style.display = this.mode === 'edit' ? 'flex' : 'none';
        }

        if (this.controls) {
            this.controls.enabled = this.mode === 'play';
        }

        if (this.mode === 'play') {
            this.selectedObject = null;
            if (this.highlightBox) this.highlightBox.visible = false;
            // Save after exiting edit mode (furniture placed)
            this.autoSave();
            this.hideEditModeEffect();
        } else {
            this.showEditModeEffect();
        }
    }

    // Show visual effect for edit mode
    showEditModeEffect() {
        let overlay = document.getElementById('edit-mode-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'edit-mode-overlay';
            overlay.innerHTML = `
                <div class="edit-mode-banner">
                    <span class="edit-icon">🔨</span>
                    <span>EDIT MODE</span>
                    <span class="edit-hint">Click to place • R to rotate • ESC to cancel</span>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.classList.add('active');
        document.body.classList.add('edit-mode-active');
    }

    // Hide edit mode visual effect
    hideEditModeEffect() {
        const overlay = document.getElementById('edit-mode-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.classList.remove('edit-mode-active');
    }

    rotateSelection() {
        if (this.selectedObject) {
            this.selectedObject.rotation.y += Math.PI / 2; // Rotate 90 degrees
            // Update highlight box to match new rotation
            if (this.highlightBox) {
                this.highlightBox.setFromObject(this.selectedObject);
            }
            console.log('Rotated furniture');
        }
    }

    deleteSelection() {
        if (this.selectedObject && this.scene) {
            this.scene.remove(this.selectedObject);
            this.furniture = this.furniture.filter(i => i !== this.selectedObject);
            this.selectedObject = null;
            if (this.highlightBox) this.highlightBox.visible = false;
            this.autoSave(); // Save after deleting furniture
        }
    }

    // Celebrity Booking System
    celebrities = {
        // Filipino Celebrities
        vice_ganda: {
            name: "Vice Ganda",
            photo: "🎭",
            category: "Filipino",
            cost: 5000,
            currency: 'cash',
            duration: 300,
            hypeBoost: 50,
            cashMultiplier: 1.5,
            xpMultiplier: 1.0,
            guestBonus: 0,
            availableHours: [21, 22, 23, 0, 1],
            feature: "Comedy Show",
            benefits: ["💰 1.5x Revenue", "😂 +50 Hype"]
        },
        sarah_g: {
            name: "Sarah Geronimo",
            photo: "🎤",
            category: "Filipino",
            cost: 8000,
            currency: 'cash',
            duration: 300,
            hypeBoost: 60,
            cashMultiplier: 1.3,
            xpMultiplier: 2.0,
            guestBonus: 0,
            availableHours: [20, 21, 22, 23],
            feature: "Live Concert",
            benefits: ["⭐ 2x XP Gain", "🔥 +60 Hype"]
        },
        daniel_padilla: {
            name: "Daniel Padilla",
            photo: "🌟",
            category: "Filipino",
            cost: 7000,
            currency: 'cash',
            duration: 240,
            hypeBoost: 45,
            cashMultiplier: 1.4,
            xpMultiplier: 1.0,
            guestBonus: 20,
            availableHours: [22, 23, 0, 1, 2],
            feature: "Meet & Greet",
            benefits: ["👥 +20% Guests", "💰 1.4x Revenue"]
        },
        maine_mendoza: {
            name: "Maine Mendoza",
            photo: "📱",
            category: "Filipino",
            cost: 4000,
            currency: 'cash',
            duration: 180,
            hypeBoost: 35,
            cashMultiplier: 1.0,
            xpMultiplier: 3.0,
            guestBonus: 0,
            availableHours: [19, 20, 21, 22, 23],
            feature: "Social Media Takeover",
            benefits: ["⭐ 3x XP Gain", "📱 Viral Buzz"]
        },
        kathryn: {
            name: "Kathryn Bernardo",
            photo: "👑",
            category: "Filipino",
            cost: 10000,
            currency: 'cash',
            duration: 360,
            hypeBoost: 70,
            cashMultiplier: 2.0,
            xpMultiplier: 1.5,
            guestBonus: 15,
            availableHours: [20, 21, 22, 23, 0],
            feature: "Queen of Hearts",
            benefits: ["💰 2x Revenue", "⭐ 1.5x XP", "👥 +15% Guests"]
        },
        // International Celebrities
        dj_snake: {
            name: "DJ Snake",
            photo: "🎧",
            category: "International",
            cost: 5,
            currency: 'diamonds',
            duration: 600,
            hypeBoost: 100,
            cashMultiplier: 2.0,
            xpMultiplier: 1.5,
            guestBonus: 0,
            availableHours: [23, 0, 1, 2, 3],
            feature: "EDM Night",
            benefits: ["💰 2x Revenue", "⭐ 1.5x XP", "🔥 +100 Hype"]
        },
        drake: {
            name: "Drake",
            photo: "🎤",
            category: "International",
            cost: 10,
            currency: 'diamonds',
            duration: 600,
            hypeBoost: 150,
            cashMultiplier: 2.5,
            xpMultiplier: 2.0,
            guestBonus: 25,
            availableHours: [22, 23, 0, 1],
            feature: "Hotline Bling",
            benefits: ["💰 2.5x Revenue", "⭐ 2x XP", "👥 +25% Guests"]
        },
        rihanna: {
            name: "Rihanna",
            photo: "💎",
            category: "International",
            cost: 15,
            currency: 'diamonds',
            duration: 600,
            hypeBoost: 200,
            cashMultiplier: 3.0,
            xpMultiplier: 2.0,
            guestBonus: 30,
            availableHours: [21, 22, 23, 0],
            feature: "Diamond Night",
            benefits: ["💰 3x Revenue", "⭐ 2x XP", "👥 +30% Guests"]
        },
        the_weeknd: {
            name: "The Weeknd",
            photo: "🌙",
            category: "International",
            cost: 8,
            currency: 'diamonds',
            duration: 480,
            hypeBoost: 120,
            cashMultiplier: 2.0,
            xpMultiplier: 2.5,
            guestBonus: 0,
            availableHours: [0, 1, 2, 3, 4],
            feature: "After Hours",
            benefits: ["💰 2x Revenue", "⭐ 2.5x XP", "🌙 Night Owl Bonus"]
        },
        dua_lipa: {
            name: "Dua Lipa",
            photo: "💃",
            category: "International",
            cost: 7,
            currency: 'diamonds',
            duration: 420,
            hypeBoost: 90,
            cashMultiplier: 1.8,
            xpMultiplier: 2.0,
            guestBonus: 20,
            availableHours: [22, 23, 0, 1, 2],
            feature: "Dance Party",
            benefits: ["💰 1.8x Revenue", "⭐ 2x XP", "👥 +20% Guests"]
        },
        bruno_mars: {
            name: "Bruno Mars",
            photo: "🎹",
            category: "International",
            cost: 12,
            currency: 'diamonds',
            duration: 600,
            hypeBoost: 180,
            cashMultiplier: 2.5,
            xpMultiplier: 2.5,
            guestBonus: 35,
            availableHours: [21, 22, 23, 0, 1],
            feature: "24K Magic",
            benefits: ["💰 2.5x Revenue", "⭐ 2.5x XP", "👥 +35% Guests"]
        }
    };

    bookedCelebrity = null;
    bookingTime = null;

    openCelebrityModal() {
        const modal = document.getElementById('celebrity-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.renderCelebrityBooking();
        }
    }

    closeCelebrityModal() {
        const modal = document.getElementById('celebrity-modal');
        if (modal) modal.classList.add('hidden');
    }

    renderCelebrityBooking() {
        const content = document.getElementById('celebrity-booking-content');
        if (!content) return;

        const currentHour = this.gameHour;
        const diamondDisplay = document.getElementById('diamond-count');
        if (diamondDisplay) diamondDisplay.textContent = this.diamonds;

        let html = '';

        // Show current booking if any
        if (this.bookedCelebrity) {
            const celeb = this.celebrities[this.bookedCelebrity];
            html += `
                <div class="current-booking">
                    <div class="booking-header">🎉 Currently Booked</div>
                    <div class="booking-celeb">
                        <span class="celeb-photo">${celeb.photo}</span>
                        <span class="celeb-name">${celeb.name}</span>
                    </div>
                    <div class="booking-feature">${celeb.feature}</div>
                </div>
            `;
        }

        // Filipino Celebrities
        html += '<h3 class="celeb-section-title">🇵🇭 Filipino Celebrities</h3><div class="celeb-grid">';
        Object.entries(this.celebrities).filter(([k, v]) => v.category === "Filipino").forEach(([key, celeb]) => {
            const isAvailable = celeb.availableHours.includes(currentHour);
            const canAfford = celeb.currency === 'cash' ? this.cash >= celeb.cost : this.diamonds >= celeb.cost;
            const availableText = isAvailable ? "✓ Available" : `${this.formatAvailability(celeb.availableHours)}`;
            const benefitsHtml = celeb.benefits ? celeb.benefits.map(b => `<span class="celeb-benefit">${b}</span>`).join('') : '';

            html += `
                <div class="celeb-card ${!isAvailable ? 'unavailable' : ''} ${!canAfford ? 'cant-afford' : ''}" onclick="${isAvailable && canAfford ? `game.bookCelebrity('${key}')` : ''}">
                    <div class="celeb-photo-large">${celeb.photo}</div>
                    <div class="celeb-name">${celeb.name}</div>
                    <div class="celeb-feature">${celeb.feature}</div>
                    <div class="celeb-benefits">${benefitsHtml}</div>
                    <div class="celeb-availability ${isAvailable ? 'available' : ''}">${availableText}</div>
                    <div class="celeb-duration">${Math.floor(celeb.duration / 60)} min</div>
                    <div class="celeb-cost ${celeb.currency}">${celeb.currency === 'cash' ? '$' + celeb.cost.toLocaleString() : '💎 ' + celeb.cost}</div>
                </div>
            `;
        });
        html += '</div>';

        // International Celebrities
        html += '<h3 class="celeb-section-title">🌍 International Celebrities <span class="diamond-only">💎 Diamonds Only</span></h3><div class="celeb-grid">';
        Object.entries(this.celebrities).filter(([k, v]) => v.category === "International").forEach(([key, celeb]) => {
            const isAvailable = celeb.availableHours.includes(currentHour);
            const canAfford = celeb.currency === 'cash' ? this.cash >= celeb.cost : this.diamonds >= celeb.cost;
            const availableText = isAvailable ? "✓ Available" : `${this.formatAvailability(celeb.availableHours)}`;
            const benefitsHtml = celeb.benefits ? celeb.benefits.map(b => `<span class="celeb-benefit">${b}</span>`).join('') : '';

            html += `
                <div class="celeb-card premium ${!isAvailable ? 'unavailable' : ''} ${!canAfford ? 'cant-afford' : ''}" onclick="${isAvailable && canAfford ? `game.bookCelebrity('${key}')` : ''}">
                    <div class="celeb-photo-large">${celeb.photo}</div>
                    <div class="celeb-name">${celeb.name}</div>
                    <div class="celeb-feature">${celeb.feature}</div>
                    <div class="celeb-benefits">${benefitsHtml}</div>
                    <div class="celeb-availability ${isAvailable ? 'available' : ''}">${availableText}</div>
                    <div class="celeb-duration">${Math.floor(celeb.duration / 60)} min</div>
                    <div class="celeb-cost diamond">💎 ${celeb.cost}</div>
                </div>
            `;
        });
        html += '</div>';

        content.innerHTML = html;
    }

    formatAvailability(hours) {
        const start = hours[0];
        return start > 12 ? `${start - 12}PM` : (start === 0 ? '12AM' : `${start}AM`);
    }

    bookCelebrity(key) {
        const celeb = this.celebrities[key];
        if (!celeb) return;

        const currentHour = this.gameHour;
        if (!celeb.availableHours.includes(currentHour)) {
            ui.notify(`${celeb.name} is not available right now!`, 'error');
            return;
        }

        // Check payment
        if (celeb.currency === 'cash') {
            if (this.cash < celeb.cost) {
                ui.notify("Not enough cash!", 'error');
                return;
            }
            this.cash -= celeb.cost;
        } else {
            if (this.diamonds < celeb.cost) {
                ui.notify("Not enough diamonds!", 'error');
                return;
            }
            this.diamonds -= celeb.cost;
        }

        // Book the celebrity
        this.bookedCelebrity = key;
        this.bookingTime = celeb.duration;
        this.hype = Math.min(100, this.hype + celeb.hypeBoost);

        ui.notify(`🎉 ${celeb.name} has arrived! ${celeb.feature}`, 'success');
        audioManager.play('success');

        this.closeCelebrityModal();
        this.updateUI();
        this.renderCelebrityBooking();
    }

    updateCelebrityBooking() {
        if (this.bookedCelebrity && this.bookingTime > 0) {
            this.bookingTime--;
            const celeb = this.celebrities[this.bookedCelebrity];

            // Apply celebrity effects
            if (celeb.cashMultiplier > 1) {
                // Effects applied in profit calculation
            }

            if (this.bookingTime <= 0) {
                ui.notify(`${celeb.name} has left the club. Thanks for coming!`, 'info');
                this.bookedCelebrity = null;
                this.bookingTime = null;
            }
        }
    }

    getCelebrityMultiplier() {
        if (this.bookedCelebrity) {
            return this.celebrities[this.bookedCelebrity].cashMultiplier || 1;
        }
        return 1;
    }

    hireCelebrity(type) {
        // Legacy function - redirect to new booking system
        this.bookCelebrity(type);
    }

    // AI Event
    async planEvent() {
        const btn = document.getElementById('btn-event');

        // Prevent double-click
        if (btn && btn.disabled) return;

        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }

        ui.notify("Planning Event...", "info");
        audioManager.play('notification');

        const eventThemes = [
            { title: "Neon Nights", desc: "Glow in the dark party vibes!" },
            { title: "Retro Disco", desc: "70s throwback with funky beats!" },
            { title: "VIP Experience", desc: "Celebrities and champagne all night!" },
            { title: "Beach Party", desc: "Tropical vibes in the city!" },
            { title: "Masquerade Ball", desc: "Mystery and elegance combined!" },
            { title: "Hip Hop Takeover", desc: "Bass drops and sick beats!" },
            { title: "Latin Fever", desc: "Salsa your way to dawn!" },
            { title: "Electric Dreams", desc: "EDM extravaganza until sunrise!" }
        ];

        let eventData;

        try {
            const prompt = `Generate a cool nightclub theme name and 8 word description. Format JSON: {"title": "X", "desc": "Y"}`;
            let txt = await this.callGemini(prompt);
            txt = txt.replace(/```json|```/g, '');
            eventData = JSON.parse(txt);
        } catch (e) {
            // Fallback to random event
            eventData = eventThemes[Math.floor(Math.random() * eventThemes.length)];
        }

        document.getElementById('event-title').innerText = eventData.title;
        document.getElementById('event-desc').innerText = eventData.desc;
        document.getElementById('event-bonus').innerText = "💰 2x CASH BONUS FOR 30 SECONDS! 💰";

        // Show modal - just remove hidden class (Tailwind flex handles display)
        const eventModal = document.getElementById('event-modal');
        if (eventModal) {
            eventModal.classList.remove('hidden');
        }

        this.eventMultiplier = 2;
        this.eventsHosted++;
        this.addXP(CONFIG.XP_PER_EVENT);
        this.checkAchievements();

        audioManager.play('achievement');

        // Trigger confetti effect
        if (window.triggerConfetti) {
            window.triggerConfetti();
        }

        // Re-enable button after 30 seconds (always runs)
        setTimeout(() => {
            this.eventMultiplier = 1;
            ui.notify("Event bonus ended!", "info");
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }, 30000);
    }

    async callGemini(prompt) {
        if (!CONFIG.GEMINI_API_KEY) {
            throw new Error('No API key');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "...";
    }

    // UI Update
    updateUI() {
        const cashDisplay = document.getElementById('cash-display');
        const hypeDisplay = document.getElementById('hype-display');
        const stockDisplay = document.getElementById('stock-display');
        const guestsDisplay = document.getElementById('guests-display');
        const guestCount = document.getElementById('guest-count');
        const maxGuests = document.getElementById('max-guests');
        const levelDisplay = document.getElementById('level-display');
        const xpBar = document.getElementById('xp-bar');
        const xpText = document.getElementById('xp-text');

        if (cashDisplay) cashDisplay.innerText = '$' + this.cash.toLocaleString();
        if (hypeDisplay) hypeDisplay.innerText = Math.floor(this.hype);
        if (stockDisplay) stockDisplay.innerText = `${Math.max(0, this.barStock)}%`;
        if (guestsDisplay) guestsDisplay.innerText = `${this.visitors.length}/${this.maxVisitors}`;
        if (guestCount) guestCount.innerText = this.visitors.length;
        if (maxGuests) maxGuests.innerText = this.maxVisitors;

        // Mobile displays (sync with desktop)
        const hypeDisplayMobile = document.getElementById('hype-display-mobile');
        const stockDisplayMobile = document.getElementById('stock-display-mobile');
        const guestCountMobile = document.getElementById('guest-count-mobile');
        const maxGuestsMobile = document.getElementById('max-guests-mobile');
        if (hypeDisplayMobile) hypeDisplayMobile.innerText = Math.floor(this.hype);
        if (stockDisplayMobile) stockDisplayMobile.innerText = `${Math.max(0, this.barStock)}%`;
        if (guestCountMobile) guestCountMobile.innerText = this.visitors.length;
        if (maxGuestsMobile) maxGuestsMobile.innerText = this.maxVisitors;
        if (levelDisplay) levelDisplay.innerText = this.level;

        // Diamonds display (uses coins-display element)
        const coinsDisplay = document.getElementById('coins-display');
        if (coinsDisplay) coinsDisplay.innerText = this.diamonds;
        const diamondCount = document.getElementById('diamond-count');
        if (diamondCount) diamondCount.innerText = this.diamonds;

        // XP bar
        const xpNeeded = this.getXPForLevel(this.level + 1);
        const xpPercent = Math.min(100, (this.xp / xpNeeded) * 100);
        if (xpBar) xpBar.style.width = `${xpPercent}%`;
        if (xpText) xpText.innerText = `${this.xp} / ${xpNeeded} XP`;

        // Update stock warning
        const stockBox = document.getElementById('stock-box');
        if (stockBox) {
            stockBox.classList.toggle('warning', this.barStock < 20);
        }

        // Update upgrade costs
        const capCost = CONFIG.CAPACITY_BASE_COST * this.stats.capacityLevel;
        const mktCost = CONFIG.MARKETING_BASE_COST * this.stats.marketingLevel;
        const prfCost = CONFIG.PROFIT_BASE_COST * this.stats.profitLevel;

        const upgCap = document.getElementById('upg-cap');
        const upgSpawn = document.getElementById('upg-spawn');
        const upgProfit = document.getElementById('upg-profit');

        if (upgCap) upgCap.innerText = `$${capCost}`;
        if (upgSpawn) upgSpawn.innerText = `$${mktCost}`;
        if (upgProfit) upgProfit.innerText = `$${prfCost}`;

        // Update level texts
        const capLevel = document.getElementById('cap-level');
        const mktLevel = document.getElementById('mkt-level');
        const prfLevel = document.getElementById('prf-level');

        if (capLevel) capLevel.innerText = `Level ${this.stats.capacityLevel}`;
        if (mktLevel) mktLevel.innerText = `Level ${this.stats.marketingLevel}`;
        if (prfLevel) prfLevel.innerText = `Level ${this.stats.profitLevel}`;

        // Update gift badge
        const giftBadge = document.getElementById('gift-badge');
        const giftCount = friendsSystem.getGiftCount();
        if (giftBadge) {
            giftBadge.style.display = giftCount > 0 ? 'block' : 'none';
            giftBadge.innerText = giftCount;
        }

        // Update staff counts
        this.updateStaffUI();
    }

    updateStaffUI() {
        const staffTypes = ['bartender', 'dj', 'bouncer', 'promoter', 'manager'];
        staffTypes.forEach(type => {
            const countEl = document.getElementById(`${type}-count`);
            const costEl = document.getElementById(`${type}-cost`);

            if (countEl) countEl.innerText = staffManager.getCount(type);
            if (costEl) costEl.innerText = `$${staffManager.getHireCost(type)}`;
        });
    }
}

export const game = new GameState();

// Expose to window for HTML onclick handlers
window.game = game;
