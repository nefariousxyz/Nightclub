// Game Configuration
export const CONFIG = {
    // Starting values
    INITIAL_CASH: 5000,
    INITIAL_HYPE: 10,
    INITIAL_BAR_STOCK: 50,
    INITIAL_MAX_VISITORS: 8,
    INITIAL_SPAWN_RATE: 2000,
    
    // Club Size Tiers
    CLUB_TIERS: [
        { level: 1, name: 'Tiny Bar', size: 15, maxVisitors: 8, cost: 0, unlockLevel: 1 },
        { level: 2, name: 'Small Club', size: 20, maxVisitors: 15, cost: 2000, unlockLevel: 3 },
        { level: 3, name: 'Medium Club', size: 28, maxVisitors: 25, cost: 5000, unlockLevel: 5 },
        { level: 4, name: 'Large Club', size: 35, maxVisitors: 40, cost: 15000, unlockLevel: 8 },
        { level: 5, name: 'Mega Club', size: 45, maxVisitors: 60, cost: 50000, unlockLevel: 12 },
        { level: 6, name: 'Empire', size: 60, maxVisitors: 100, cost: 150000, unlockLevel: 20 }
    ],

    // Economy
    RESTOCK_COST: 100,
    DRINK_PRICE: 15,
    CELEBRITY_DRINK_PRICE: 50,
    STOCK_CONSUMPTION: 2,

    // Upgrades base costs
    CAPACITY_BASE_COST: 500,
    MARKETING_BASE_COST: 300,
    PROFIT_BASE_COST: 400,

    // Level & XP
    XP_PER_DRINK: 5,
    XP_PER_VISITOR: 10,
    XP_PER_EVENT: 50,
    BASE_XP_TO_LEVEL: 100,
    XP_LEVEL_MULTIPLIER: 1.5,

    // Shop items - organized by category
    SHOP_ITEMS: [
        // Basic furniture
        { type: 'table', name: 'Candle Table', cost: 200, icon: '🕯️', desc: 'Relaxing vibe', category: 'furniture', unlockLevel: 1 },
        { type: 'booth', name: 'VIP Booth', cost: 400, icon: '🛋️', desc: 'High energy recovery', category: 'furniture', unlockLevel: 1 },
        { type: 'bar', name: 'Lux Bar', cost: 600, icon: '🍸', desc: 'Serves drinks', category: 'furniture', unlockLevel: 1 },
        { type: 'dancefloor', name: 'LED Floor', cost: 800, icon: '💃', desc: 'Dancing spot', category: 'furniture', unlockLevel: 1 },
        { type: 'dj', name: 'DJ Station', cost: 1000, icon: '🎧', desc: 'Music center', category: 'furniture', unlockLevel: 2 },
        { type: 'pooltable', name: 'Pool Table', cost: 500, icon: '🎱', desc: 'Entertainment', category: 'furniture', unlockLevel: 3 },
        
        // Decorations
        { type: 'plant', name: 'Neon Plant', cost: 150, icon: '🌿', desc: 'Decoration +5 hype', category: 'decor', unlockLevel: 1 },
        { type: 'speaker', name: 'Speaker Tower', cost: 350, icon: '🔊', desc: 'More bass +10 hype', category: 'decor', unlockLevel: 2 },
        { type: 'discoball', name: 'Disco Ball', cost: 500, icon: '🪩', desc: 'Classic vibes +15 hype', category: 'decor', unlockLevel: 4 },
        { type: 'statue', name: 'Gold Statue', cost: 1200, icon: '🏆', desc: 'Prestige +30 hype', category: 'decor', unlockLevel: 8 },
        { type: 'fountain', name: 'Champagne Fountain', cost: 2000, icon: '🍾', desc: 'Luxury +50 hype', category: 'decor', unlockLevel: 10 },
        
        // Club Lights
        { type: 'discoball', name: 'Disco Ball', cost: 300, icon: '🪩', desc: 'Classic disco vibes +15 hype', category: 'lights', unlockLevel: 1 },
        { type: 'laser', name: 'Moving Head Laser', cost: 750, icon: '✨', desc: 'Beam light show +20 hype', category: 'lights', unlockLevel: 3 },
        { type: 'moving_head', name: 'Moving Head Spotlight', cost: 900, icon: '🔦', desc: 'Pan/tilt stage light +25 hype', category: 'lights', unlockLevel: 3 },
        { type: 'multi_laser', name: 'Multi Laser Array', cost: 1500, icon: '🌈', desc: '5-beam RGB laser +35 hype', category: 'lights', unlockLevel: 6 },
        { type: 'strobe', name: 'Strobe Light', cost: 600, icon: '⚡', desc: 'Intense flash effects +15 hype', category: 'lights', unlockLevel: 4 },
        { type: 'effects_light', name: 'Derby Effects Light', cost: 1200, icon: '🎨', desc: 'Multi-color party beams +25 hype', category: 'lights', unlockLevel: 7 },
        { type: 'wall_light', name: 'LED Wall Sconce', cost: 400, icon: '💡', desc: 'RGB wall accent +10 hype', category: 'lights', unlockLevel: 2 },
        
        // Floor Tiles (drag to place multiple)
        { type: 'tile_wood', name: 'Wood Floor', cost: 25, icon: '🪵', desc: 'Classic wood', category: 'tiles', unlockLevel: 1 },
        { type: 'tile_marble', name: 'Marble Floor', cost: 50, icon: '⬜', desc: 'Elegant marble', category: 'tiles', unlockLevel: 2 },
        { type: 'tile_checker', name: 'Checker Floor', cost: 35, icon: '⬛', desc: 'Retro style', category: 'tiles', unlockLevel: 2 },
        { type: 'tile_carpet', name: 'Red Carpet', cost: 40, icon: '🟥', desc: 'VIP carpet', category: 'tiles', unlockLevel: 3 },
        { type: 'tile_disco', name: 'Disco Floor', cost: 75, icon: '🪩', desc: 'Light-up tiles', category: 'tiles', unlockLevel: 4 },
        { type: 'tile_neon', name: 'Neon Floor', cost: 100, icon: '💜', desc: 'Glowing tiles', category: 'tiles', unlockLevel: 6 },
        { type: 'tile_gold', name: 'Gold Floor', cost: 150, icon: '🟨', desc: 'Luxury gold', category: 'tiles', unlockLevel: 8 },
        { type: 'tile_hologram', name: 'Hologram Floor', cost: 200, icon: '🔷', desc: 'Futuristic', category: 'tiles', unlockLevel: 10 },
        { type: 'tile_lava', name: 'Lava Floor', cost: 175, icon: '🟧', desc: 'Hot look', category: 'tiles', unlockLevel: 12 },
        { type: 'tile_galaxy', name: 'Galaxy Floor', cost: 250, icon: '🌌', desc: 'Cosmic vibes', category: 'tiles', unlockLevel: 15 },
        
        // Premium
        { type: 'stage', name: 'Performance Stage', cost: 2500, icon: '🎤', desc: 'Live performances', category: 'premium', unlockLevel: 12 },
        { type: 'viparea', name: 'VIP Lounge', cost: 3000, icon: '👑', desc: 'Premium area', category: 'premium', unlockLevel: 15 },
        { type: 'aquarium', name: 'Giant Aquarium', cost: 5000, icon: '🐠', desc: 'Stunning display', category: 'premium', unlockLevel: 20 },
        { type: 'helicopter', name: 'Rooftop Helipad', cost: 10000, icon: '🚁', desc: 'VIP arrivals', category: 'premium', unlockLevel: 25 }
    ],

    // Auto-save interval (ms)
    AUTO_SAVE_INTERVAL: 30000,

    // Three.js scene
    CAMERA_DISTANCE: 40,
    FOG_NEAR: 40,
    FOG_FAR: 120,

    // Colors
    COLORS: {
        BACKGROUND: 0x0a0a12,
        FLOOR: 0x1a0a0a,
        FLOOR_TILE_1: 0x8b0000,
        FLOOR_TILE_2: 0x2d0a0a,
        WALL: 0x1a1a2e,
        WALL_TRIM: 0x7b1fa2,
        STREET: 0x1a1a1a,
        SIDEWALK: 0x333333
    },

    // Gemini API (leave empty if not using)
    GEMINI_API_KEY: ""
};
