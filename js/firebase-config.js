// Firebase Configuration
// IMPORTANT: Replace these values with your Firebase project credentials
// Get these from: https://console.firebase.google.com > Project Settings

export const firebaseConfig = {
    apiKey: "AIzaSyB9Bx0t7LIrhWiAGULGjhNh1BI-S6qrFC8",
    authDomain: "nightparty-city.firebaseapp.com",
    databaseURL: "https://nightparty-city-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "nightparty-city",
    storageBucket: "nightparty-city.firebasestorage.app",
    messagingSenderId: "816223229032",
    appId: "1:816223229032:web:63a3c47a2a8310109b57dd",
    measurementId: "G-K0HDF9XHMR"
};

// Premium Products Configuration
export const PREMIUM_PRODUCTS = {
    // VIP Memberships
    vip_monthly: {
        id: 'vip_monthly',
        name: 'VIP Monthly',
        price: 4.99,
        currency: 'USD',
        bonusCoins: 500,
        duration: 30, // days
        perks: ['2x XP Boost', 'Exclusive Items', 'No Ads', 'VIP Badge', 'Priority Support']
    },
    vip_yearly: {
        id: 'vip_yearly',
        name: 'VIP Yearly',
        price: 39.99,
        currency: 'USD',
        bonusCoins: 7000,
        duration: 365,
        perks: ['2x XP Boost', 'Exclusive Items', 'No Ads', 'VIP Badge', 'Priority Support', '2 Months FREE']
    },
    
    // Coin Packages
    coins_100: { id: 'coins_100', name: '100 Coins', price: 0.99, coins: 100, bonus: 0 },
    coins_500: { id: 'coins_500', name: '550 Coins', price: 4.99, coins: 500, bonus: 50 },
    coins_1200: { id: 'coins_1200', name: '1,300 Coins', price: 9.99, coins: 1200, bonus: 100 },
    coins_2500: { id: 'coins_2500', name: '2,800 Coins', price: 19.99, coins: 2500, bonus: 300 },
    coins_6500: { id: 'coins_6500', name: '7,500 Coins', price: 49.99, coins: 6500, bonus: 1000 }
};

// Premium Items purchasable with coins
export const COIN_ITEMS = {
    // Exclusive Furniture
    vip_booth: { id: 'vip_booth', name: 'VIP Booth', cost: 200, type: 'furniture', vipOnly: false },
    gold_dancefloor: { id: 'gold_dancefloor', name: 'Gold Dance Floor', cost: 500, type: 'furniture', vipOnly: false },
    crystal_bar: { id: 'crystal_bar', name: 'Crystal Bar', cost: 800, type: 'furniture', vipOnly: true },
    
    // Boosters
    xp_boost_1h: { id: 'xp_boost_1h', name: '2x XP (1 Hour)', cost: 50, type: 'booster', duration: 3600 },
    cash_boost_1h: { id: 'cash_boost_1h', name: '2x Cash (1 Hour)', cost: 50, type: 'booster', duration: 3600 },
    hype_boost: { id: 'hype_boost', name: '+50 Hype Instant', cost: 30, type: 'instant' },
    
    // Exclusive Staff
    celebrity_dj: { id: 'celebrity_dj', name: 'Celebrity DJ', cost: 1000, type: 'staff', vipOnly: true },
    
    // Cosmetics
    neon_theme: { id: 'neon_theme', name: 'Neon Theme', cost: 300, type: 'theme' },
    retro_theme: { id: 'retro_theme', name: 'Retro 80s Theme', cost: 300, type: 'theme' },
    
    // Time Savers
    instant_restock: { id: 'instant_restock', name: 'Instant Restock', cost: 20, type: 'instant' },
    skip_night: { id: 'skip_night', name: 'Skip to Peak Hours', cost: 40, type: 'instant' }
};
