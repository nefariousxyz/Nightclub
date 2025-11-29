// Premium System - VIP & Coins
import { authSystem } from './auth.js';
import { PREMIUM_PRODUCTS, COIN_ITEMS } from './firebase-config.js';
import { ui } from './ui.js';

class PremiumSystem {
    constructor() {
        this.coins = 0;
        this.isVIP = false;
        this.vipExpiry = null;
        this.ownedItems = [];
        this.activeBoosters = [];
    }
    
    async init() {
        try {
            // Load premium status when auth changes
            authSystem.onAuthChange(async (user) => {
                if (user) {
                    try {
                        await this.loadPremiumStatus();
                    } catch (err) {
                        console.warn('Failed to load premium status:', err);
                    }
                } else {
                    this.reset();
                }
                this.updateUI();
            });
        } catch (err) {
            console.warn('Premium init error:', err);
        }
    }
    
    async loadPremiumStatus() {
        const userData = await authSystem.getUserData();
        if (userData) {
            this.coins = userData.coins || 0;
            this.isVIP = userData.isVIP || false;
            this.vipExpiry = userData.vipExpiry?.toDate?.() || null;
            this.ownedItems = userData.ownedItems || [];
            
            // Check if VIP expired
            if (this.isVIP && this.vipExpiry && new Date() > this.vipExpiry) {
                this.isVIP = false;
                await authSystem.updateUserData({ isVIP: false });
            }
        }
        this.updateUI();
    }
    
    reset() {
        this.coins = 0;
        this.isVIP = false;
        this.vipExpiry = null;
        this.ownedItems = [];
        this.activeBoosters = [];
    }
    
    // Add coins (synced with game.diamonds)
    async addCoins(amount, reason = 'purchase') {
        this.coins += amount;
        
        // Sync with game.diamonds
        if (window.game) {
            window.game.diamonds += amount;
            window.game.autoSave();
        }
        
        if (authSystem.isLoggedIn) {
            await authSystem.updateUserData({
                coins: firebase.firestore.FieldValue.increment(amount)
            });
        }
        
        this.updateUI();
        ui.notify(`+${amount} 💎!`, 'success');
    }
    
    // Spend coins
    async spendCoins(amount) {
        if (this.coins < amount) {
            ui.notify('Not enough coins!', 'error');
            return false;
        }
        
        this.coins -= amount;
        
        if (authSystem.isLoggedIn) {
            await authSystem.updateUserData({
                coins: firebase.firestore.FieldValue.increment(-amount),
                totalCoinsSpent: firebase.firestore.FieldValue.increment(amount)
            });
        }
        
        this.updateUI();
        return true;
    }
    
    // Purchase coin item
    async purchaseItem(itemId) {
        const item = COIN_ITEMS[itemId];
        if (!item) {
            ui.notify('Item not found', 'error');
            return false;
        }
        
        // Check VIP requirement
        if (item.vipOnly && !this.isVIP) {
            ui.notify('VIP membership required!', 'error');
            return false;
        }
        
        // Check if already owned (for non-consumables)
        if (item.type !== 'instant' && item.type !== 'booster' && this.ownedItems.includes(itemId)) {
            ui.notify('You already own this!', 'error');
            return false;
        }
        
        // Spend coins
        if (!await this.spendCoins(item.cost)) {
            return false;
        }
        
        // Apply item effect
        await this.applyItemEffect(item);
        
        // Add to owned items (non-consumables)
        if (item.type !== 'instant' && item.type !== 'booster') {
            this.ownedItems.push(itemId);
            if (authSystem.isLoggedIn) {
                await authSystem.updateUserData({
                    ownedItems: firebase.firestore.FieldValue.arrayUnion(itemId)
                });
            }
        }
        
        ui.notify(`Purchased ${item.name}!`, 'success');
        return true;
    }
    
    // Apply item effects
    async applyItemEffect(item) {
        switch (item.type) {
            case 'booster':
                this.activeBoosters.push({
                    id: item.id,
                    name: item.name,
                    expiresAt: Date.now() + (item.duration * 1000)
                });
                break;
                
            case 'instant':
                if (item.id === 'hype_boost' && window.game) {
                    window.game.hype = Math.min(100, window.game.hype + 50);
                } else if (item.id === 'instant_restock' && window.game) {
                    window.game.barStock = 100;
                }
                break;
                
            case 'furniture':
                // Unlock furniture in shop
                if (window.game) {
                    window.game.unlockedFurniture = window.game.unlockedFurniture || [];
                    window.game.unlockedFurniture.push(item.id);
                }
                break;
                
            case 'theme':
                // Apply theme
                document.body.setAttribute('data-theme', item.id);
                localStorage.setItem('theme', item.id);
                break;
        }
    }
    
    // Check if booster is active
    hasActiveBooster(boosterId) {
        this.cleanExpiredBoosters();
        return this.activeBoosters.some(b => b.id === boosterId);
    }
    
    // Get XP multiplier
    getXPMultiplier() {
        let mult = 1;
        if (this.isVIP) mult *= 2;
        if (this.hasActiveBooster('xp_boost_1h')) mult *= 2;
        return mult;
    }
    
    // Get cash multiplier
    getCashMultiplier() {
        let mult = 1;
        if (this.hasActiveBooster('cash_boost_1h')) mult *= 2;
        return mult;
    }
    
    // Clean expired boosters
    cleanExpiredBoosters() {
        const now = Date.now();
        this.activeBoosters = this.activeBoosters.filter(b => b.expiresAt > now);
    }
    
    // Purchase VIP (simulated - in production, use Stripe/PayPal)
    async purchaseVIP(productId) {
        const product = PREMIUM_PRODUCTS[productId];
        if (!product) return false;
        
        // In production, this would redirect to payment processor
        // For demo, we'll simulate a successful purchase
        
        ui.notify('Opening payment...', 'info');
        
        // Show payment modal (simulated)
        const confirmed = await this.showPaymentModal(product);
        
        if (confirmed) {
            // Grant VIP
            this.isVIP = true;
            this.vipExpiry = new Date(Date.now() + product.duration * 24 * 60 * 60 * 1000);
            this.coins += product.bonusCoins;
            
            // Also add bonus to game.diamonds
            if (window.game && product.bonusCoins > 0) {
                window.game.diamonds += product.bonusCoins;
                window.game.autoSave();
            }
            
            if (authSystem.isLoggedIn) {
                await authSystem.updateUserData({
                    isVIP: true,
                    vipExpiry: this.vipExpiry,
                    coins: firebase.firestore.FieldValue.increment(product.bonusCoins),
                    purchases: firebase.firestore.FieldValue.arrayUnion({
                        productId,
                        purchasedAt: new Date().toISOString(),
                        price: product.price
                    })
                });
            }
            
            ui.notify(`🎉 VIP Activated! +${product.bonusCoins} 💎!`, 'success');
            this.updateUI();
            return true;
        }
        
        return false;
    }
    
    // Purchase coins (simulated)
    async purchaseCoins(productId) {
        const product = PREMIUM_PRODUCTS[productId];
        if (!product) return false;
        
        ui.notify('Opening payment...', 'info');
        
        const confirmed = await this.showPaymentModal(product);
        
        if (confirmed) {
            const totalCoins = product.coins + (product.bonus || 0);
            await this.addCoins(totalCoins, 'purchase');
            
            if (authSystem.isLoggedIn) {
                await authSystem.updateUserData({
                    purchases: firebase.firestore.FieldValue.arrayUnion({
                        productId,
                        purchasedAt: new Date().toISOString(),
                        price: product.price,
                        coins: totalCoins
                    })
                });
            }
            
            return true;
        }
        
        return false;
    }
    
    // Simulated payment modal (replace with real payment in production)
    showPaymentModal(product) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'payment-modal-overlay';
            modal.innerHTML = `
                <div class="payment-modal">
                    <h2>💳 Complete Purchase</h2>
                    <div class="payment-product">
                        <span class="product-name">${product.name}</span>
                        <span class="product-price">$${product.price.toFixed(2)} USD</span>
                    </div>
                    <p class="payment-note">
                        ⚠️ Demo Mode: In production, this would connect to Stripe/PayPal
                    </p>
                    <div class="payment-actions">
                        <button class="btn-cancel" onclick="this.closest('.payment-modal-overlay').remove()">Cancel</button>
                        <button class="btn-confirm" id="confirm-payment">Confirm Purchase</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.querySelector('.btn-cancel').onclick = () => {
                modal.remove();
                resolve(false);
            };
            
            modal.querySelector('#confirm-payment').onclick = () => {
                modal.remove();
                resolve(true);
            };
        });
    }
    
    // Update UI elements
    updateUI() {
        // NOTE: coins-display is now managed by game.updateUI() using game.diamonds
        // We only update premium-specific UI elements here
        
        // Update VIP badge
        const vipBadge = document.getElementById('vip-badge');
        if (vipBadge) {
            vipBadge.style.display = this.isVIP ? 'flex' : 'none';
        }
        
        // Update VIP status in account
        const vipStatus = document.getElementById('vip-status');
        if (vipStatus) {
            if (this.isVIP) {
                let daysLeft = Math.ceil((this.vipExpiry - Date.now()) / (1000 * 60 * 60 * 24));
                
                // Handle expiration if logic hasn't caught it yet
                if (daysLeft < 0) {
                    this.isVIP = false; // Temporarily set false for UI
                    daysLeft = 0;
                    vipStatus.textContent = 'Not VIP';
                    vipStatus.className = 'vip-inactive';
                } else {
                    vipStatus.textContent = `VIP (${daysLeft} days left)`;
                    vipStatus.className = 'vip-active';
                }
            } else {
                vipStatus.textContent = 'Not VIP';
                vipStatus.className = 'vip-inactive';
            }
        }
        
        // Sync coins with game.diamonds if game exists
        if (window.game) {
            window.game.updateUI();
        }
    }
    
    // Get VIP perks description
    getVIPPerks() {
        return [
            '2x XP on all activities',
            'Exclusive VIP furniture',
            'VIP badge on profile',
            'Priority customer support',
            'Early access to new features',
            'Bonus coins monthly'
        ];
    }
}

export const premiumSystem = new PremiumSystem();

// Make available globally for UI buttons
window.premiumSystem = premiumSystem;
