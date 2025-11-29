// Real Friends System using Firebase
import { ui } from './ui.js';

// Gift types and costs
const GIFT_TYPES = {
    drink: { name: '🍸 Drink', cost: 50, reward: 75, xp: 10 },
    flowers: { name: '💐 Flowers', cost: 100, reward: 150, xp: 20 },
    vip_pass: { name: '🎫 VIP Pass', cost: 200, reward: 300, xp: 50 },
    champagne: { name: '🍾 Champagne', cost: 500, reward: 750, xp: 100 },
    diamond: { name: '💎 Diamond', cost: 1000, reward: 1500, xp: 200 }
};

export class FriendsSystem {
    constructor() {
        this.db = null;
        this.auth = null;
        this.initialized = false;
        
        // Friends data
        this.friends = [];
        this.pendingRequests = [];
        this.sentRequests = [];
        this.gifts = [];
        
        // Visit tracking
        this.visitedToday = new Set();
        this.lastResetDay = new Date().toDateString();
        
        // Cooldowns
        this.inviteCooldown = 0;
        
        // UI state
        this.panelOpen = false;
        this.activeTab = 'friends';
        
        // Listeners
        this.friendsListener = null;
        this.giftsListener = null;
        this.requestsListener = null;
        
        // Init retry counter
        this.initRetries = 0;
    }

    async init() {
        try {
            // Check if Firebase is loaded AND initialized
            if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
                this.initRetries++;
                if (this.initRetries < 5) {
                    console.warn('Firebase not initialized yet, friends system will retry...', this.initRetries);
                    setTimeout(() => this.init(), 2000);
                } else {
                    console.warn('Firebase not available, friends system disabled');
                }
                return;
            }
            
            this.db = firebase.database();
            this.auth = firebase.auth();
            
            // Wait for auth
            this.auth.onAuthStateChanged((user) => {
                if (user) {
                    this.setupListeners(user);
                    this.loadVisitedToday(user);
                } else {
                    this.cleanup();
                }
            });
            
            this.createFriendsUI();
            this.initialized = true;
            console.log('👥 Friends system initialized');
        } catch (error) {
            console.error('Friends init error:', error);
        }
    }
    
    setupListeners(user) {
        // Listen for friends list
        this.friendsListener = this.db.ref(`friends/${user.uid}`).on('value', async (snapshot) => {
            const friendsData = snapshot.val() || {};
            this.friends = [];
            
            for (const [uid, data] of Object.entries(friendsData)) {
                // Get friend's online status and profile
                const profile = await this.getFriendProfile(uid);
                const isOnline = await this.checkOnline(uid);
                
                this.friends.push({
                    uid,
                    name: data.name || profile?.name || 'Player',
                    avatar: profile?.avatar || '😎',
                    level: profile?.level || 1,
                    clubName: profile?.clubName || 'Club',
                    isOnline,
                    lastSeen: profile?.lastActive || data.addedAt,
                    addedAt: data.addedAt
                });
            }
            
            this.updateFriendsUI();
        });
        
        // Listen for gifts
        this.giftsListener = this.db.ref(`gifts/${user.uid}`).on('value', (snapshot) => {
            this.gifts = [];
            const giftsData = snapshot.val() || {};
            
            for (const [id, gift] of Object.entries(giftsData)) {
                if (!gift.collected) {
                    this.gifts.push({ id, ...gift });
                }
            }
            
            this.updateGiftsBadge();
        });
        
        // Listen for friend requests
        this.requestsListener = this.db.ref(`friendRequests/${user.uid}`).on('value', (snapshot) => {
            this.pendingRequests = [];
            const requestsData = snapshot.val() || {};
            
            for (const [uid, request] of Object.entries(requestsData)) {
                if (request.status === 'pending') {
                    this.pendingRequests.push({ uid, ...request });
                }
            }
            
            this.updateRequestsBadge();
        });
    }
    
    cleanup() {
        if (this.friendsListener) {
            const user = this.auth?.currentUser;
            if (user) {
                this.db.ref(`friends/${user.uid}`).off('value', this.friendsListener);
                this.db.ref(`gifts/${user.uid}`).off('value', this.giftsListener);
                this.db.ref(`friendRequests/${user.uid}`).off('value', this.requestsListener);
            }
        }
        this.friends = [];
        this.gifts = [];
        this.pendingRequests = [];
    }
    
    async getFriendProfile(uid) {
        try {
            const snapshot = await this.db.ref(`userProfiles/${uid}`).once('value');
            return snapshot.val();
        } catch (error) {
            return null;
        }
    }
    
    async checkOnline(uid) {
        try {
            const snapshot = await this.db.ref(`onlineUsers/${uid}`).once('value');
            return snapshot.exists();
        } catch (error) {
            return false;
        }
    }
    
    async loadVisitedToday(user) {
        const today = new Date().toDateString();
        if (this.lastResetDay !== today) {
            this.visitedToday.clear();
            this.lastResetDay = today;
        }
        
        try {
            const snapshot = await this.db.ref(`visits/${user.uid}/${today.replace(/\s/g, '_')}`).once('value');
            const visited = snapshot.val() || {};
            this.visitedToday = new Set(Object.keys(visited));
        } catch (error) {
            console.error('Load visits error:', error);
        }
    }
    
    createFriendsUI() {
        // Create the friends panel
        const panel = document.createElement('div');
        panel.id = 'friends-panel';
        panel.className = 'friends-panel hidden';
        panel.innerHTML = `
            <div class="friends-header">
                <div class="friends-title">
                    <i class="ph-fill ph-users-three"></i>
                    <span>Friends</span>
                    <span class="friends-count" id="friends-count">(0)</span>
                </div>
                <button class="friends-close" onclick="friendsSystem.togglePanel()">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
            
            <div class="friends-tabs">
                <button class="friends-tab active" data-tab="friends" onclick="friendsSystem.switchTab('friends')">
                    <i class="ph-fill ph-users"></i> Friends
                </button>
                <button class="friends-tab" data-tab="requests" onclick="friendsSystem.switchTab('requests')">
                    <i class="ph-fill ph-user-plus"></i> Requests
                    <span class="tab-badge hidden" id="requests-badge">0</span>
                </button>
                <button class="friends-tab" data-tab="gifts" onclick="friendsSystem.switchTab('gifts')">
                    <i class="ph-fill ph-gift"></i> Gifts
                    <span class="tab-badge hidden" id="gifts-badge">0</span>
                </button>
                <button class="friends-tab" data-tab="leaderboard" onclick="friendsSystem.switchTab('leaderboard')">
                    <i class="ph-fill ph-trophy"></i> Top
                </button>
            </div>
            
            <div class="friends-search">
                <i class="ph-bold ph-magnifying-glass"></i>
                <input type="text" id="friend-search" placeholder="Search friends..." oninput="friendsSystem.filterFriends(this.value)">
            </div>
            
            <div class="friends-content" id="friends-content">
                <!-- Friends Tab -->
                <div class="friends-tab-content active" id="tab-friends">
                    <div class="friends-list" id="panel-friends-list">
                        <div class="empty-state">
                            <i class="ph-fill ph-users"></i>
                            <p>No friends yet</p>
                            <span>Add friends from the chat!</span>
                        </div>
                    </div>
                </div>
                
                <!-- Requests Tab -->
                <div class="friends-tab-content" id="tab-requests">
                    <div class="requests-list" id="panel-requests-list">
                        <div class="empty-state">
                            <i class="ph-fill ph-user-plus"></i>
                            <p>No pending requests</p>
                        </div>
                    </div>
                </div>
                
                <!-- Gifts Tab -->
                <div class="friends-tab-content" id="tab-gifts">
                    <div class="gifts-section">
                        <div class="gifts-received" id="gifts-received">
                            <h4>📥 Received Gifts</h4>
                            <div class="gifts-list" id="received-gifts-list">
                                <div class="empty-state small">
                                    <p>No gifts to collect</p>
                                </div>
                            </div>
                        </div>
                        <div class="send-gift-section">
                            <h4>📤 Send Gift to Friends</h4>
                            <div class="gift-types" id="gift-types">
                                ${Object.entries(GIFT_TYPES).map(([key, gift]) => `
                                    <button class="gift-type-btn" data-gift="${key}" onclick="friendsSystem.selectGift('${key}')">
                                        <span class="gift-icon">${gift.name.split(' ')[0]}</span>
                                        <span class="gift-name">${gift.name.split(' ')[1]}</span>
                                        <span class="gift-cost">$${gift.cost}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Leaderboard Tab -->
                <div class="friends-tab-content" id="tab-leaderboard">
                    <div class="leaderboard-list" id="leaderboard-list">
                        <div class="empty-state">
                            <i class="ph-fill ph-trophy"></i>
                            <p>Loading...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);
    }
    
    togglePanel() {
        console.log('👥 togglePanel called');
        
        let panel = document.getElementById('friends-panel');
        
        // Create panel if it doesn't exist
        if (!panel) {
            console.log('👥 Creating friends panel...');
            this.createFriendsUI();
            panel = document.getElementById('friends-panel');
        }
        
        if (!panel) {
            console.error('👥 Failed to create friends panel');
            return;
        }
        
        this.panelOpen = !this.panelOpen;
        console.log('👥 Panel open:', this.panelOpen);
        
        if (this.panelOpen) {
            panel.classList.remove('hidden');
            panel.classList.add('open');
            this.updateFriendsUI();
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('open');
        }
    }
    
    switchTab(tab) {
        this.activeTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.friends-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Update tab content
        document.querySelectorAll('.friends-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tab}`);
        });
        
        // Load tab-specific content
        if (tab === 'leaderboard') {
            this.loadLeaderboard();
        }
    }
    
    updateFriendsUI() {
        const list = document.getElementById('panel-friends-list');
        const count = document.getElementById('friends-count');
        
        if (count) count.textContent = `(${this.friends.length})`;
        
        if (!list) return;
        
        if (this.friends.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="ph-fill ph-users"></i>
                    <p>No friends yet</p>
                    <span>Add friends from the chat!</span>
                </div>
            `;
            return;
        }
        
        // Sort: online first, then by name
        const sorted = [...this.friends].sort((a, b) => {
            if (a.isOnline !== b.isOnline) return b.isOnline - a.isOnline;
            return a.name.localeCompare(b.name);
        });
        
        list.innerHTML = sorted.map(friend => `
            <div class="friend-item ${friend.isOnline ? 'online' : ''}" data-uid="${friend.uid}">
                <div class="friend-avatar">${friend.avatar}</div>
                <div class="friend-info">
                    <div class="friend-name">
                        ${this.escapeHtml(friend.name)}
                        ${friend.isOnline ? '<span class="online-dot"></span>' : ''}
                    </div>
                    <div class="friend-details">
                        <span class="friend-level">Lv.${friend.level}</span>
                        <span class="friend-club">${this.escapeHtml(friend.clubName)}</span>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="friend-action-btn visit" onclick="friendsSystem.visitFriend('${friend.uid}')" title="Visit Club">
                        <i class="ph-fill ph-buildings"></i>
                    </button>
                    <button class="friend-action-btn gift" onclick="friendsSystem.openGiftModal('${friend.uid}', '${this.escapeHtml(friend.name)}')" title="Send Gift">
                        <i class="ph-fill ph-gift"></i>
                    </button>
                    <button class="friend-action-btn message" onclick="friendsSystem.openDirectMessage('${friend.uid}', '${this.escapeHtml(friend.name)}')" title="Message">
                        <i class="ph-fill ph-chat-circle"></i>
                    </button>
                    <button class="friend-action-btn remove" onclick="friendsSystem.removeFriend('${friend.uid}', '${this.escapeHtml(friend.name)}')" title="Remove">
                        <i class="ph-fill ph-user-minus"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    updateRequestsBadge() {
        const badge = document.getElementById('requests-badge');
        if (badge) {
            if (this.pendingRequests.length > 0) {
                badge.textContent = this.pendingRequests.length;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        
        // Update requests list
        const list = document.getElementById('panel-requests-list');
        if (!list) return;
        
        if (this.pendingRequests.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="ph-fill ph-user-plus"></i>
                    <p>No pending requests</p>
                </div>
            `;
            return;
        }
        
        list.innerHTML = this.pendingRequests.map(req => `
            <div class="request-item">
                <div class="request-info">
                    <span class="request-name">${this.escapeHtml(req.fromName || 'Player')}</span>
                    <span class="request-time">${this.timeAgo(req.timestamp)}</span>
                </div>
                <div class="request-actions">
                    <button class="accept-btn" onclick="friendsSystem.acceptRequest('${req.uid}', '${req.from}', '${this.escapeHtml(req.fromName)}')">
                        <i class="ph-fill ph-check"></i> Accept
                    </button>
                    <button class="decline-btn" onclick="friendsSystem.declineRequest('${req.uid}')">
                        <i class="ph-fill ph-x"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    updateGiftsBadge() {
        const badge = document.getElementById('gifts-badge');
        if (badge) {
            if (this.gifts.length > 0) {
                badge.textContent = this.gifts.length;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        
        // Update gifts list
        const list = document.getElementById('received-gifts-list');
        if (!list) return;
        
        if (this.gifts.length === 0) {
            list.innerHTML = `<div class="empty-state small"><p>No gifts to collect</p></div>`;
            return;
        }
        
        list.innerHTML = this.gifts.map(gift => {
            const giftType = GIFT_TYPES[gift.type] || GIFT_TYPES.drink;
            return `
                <div class="gift-item">
                    <div class="gift-icon">${giftType.name.split(' ')[0]}</div>
                    <div class="gift-info">
                        <span class="gift-from">From ${this.escapeHtml(gift.fromName || 'Friend')}</span>
                        <span class="gift-reward">+$${giftType.reward} +${giftType.xp}XP</span>
                    </div>
                    <button class="collect-btn" onclick="friendsSystem.collectGift('${gift.id}')">
                        Collect
                    </button>
                </div>
            `;
        }).join('');
    }
    
    filterFriends(query) {
        const items = document.querySelectorAll('.friend-item');
        const q = query.toLowerCase();
        
        items.forEach(item => {
            const name = item.querySelector('.friend-name')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(q) ? 'flex' : 'none';
        });
    }
    
    async visitFriend(friendUid) {
        const user = this.auth.currentUser;
        if (!user) {
            ui.notify('Please login first', 'error');
            return;
        }
        
        // Open the Visit Club modal with live preview
        if (typeof window.openVisitClubModal === 'function') {
            window.openVisitClubModal(friendUid);
            return;
        }
        
        // Fallback to old behavior if modal function not available
        const today = new Date().toDateString();
        
        // Check if already visited today
        if (this.visitedToday.has(friendUid)) {
            ui.notify('Already visited this friend today!', 'info');
            return;
        }
        
        try {
            // Get friend's club data
            const clubSnap = await this.db.ref(`clubs/${friendUid}`).once('value');
            let club = clubSnap.val();
            
            // If club not found, use friend data we already have
            if (!club) {
                const friend = this.friends.find(f => f.uid === friendUid);
                if (friend) {
                    club = {
                        name: friend.clubName || `${friend.name}'s Club`,
                        level: friend.level || 1,
                        hype: 0,
                        furnitureCount: 0,
                        maxGuests: 20
                    };
                } else {
                    ui.notify('Club not found', 'error');
                    return;
                }
            }
            
            // Calculate rewards based on friend's level
            const level = club.level || 1;
            const cashReward = 50 + level * 10;
            const xpReward = 10 + level * 5;
            const hypeReward = Math.floor(level / 2) + 1;
            
            // Mark as visited
            this.visitedToday.add(friendUid);
            await this.db.ref(`visits/${user.uid}/${today.replace(/\s/g, '_')}/${friendUid}`).set({
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Give rewards
            if (window.game) {
                window.game.cash += cashReward;
                window.game.xp += xpReward;
                window.game.hype += hypeReward;
                window.game.updateUI();
            }
            
            // Record visit on friend's club
            await this.db.ref(`clubVisits/${friendUid}/${user.uid}`).set({
                visitorName: window.game?.ownerName || user.displayName || 'Player',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Show visit mode with banner and club preview
            if (window.showVisitMode) {
                window.showVisitMode(club, {
                    cash: cashReward,
                    xp: xpReward,
                    hype: hypeReward
                });
            } else {
                // Fallback to old modal
                this.showClubPreview(club, cashReward, xpReward, hypeReward);
            }
            
            ui.notify(`Visiting ${club.name}! +$${cashReward} +${xpReward}XP +${hypeReward}🔥`, 'success');
            
            // Update friend item to show visited
            const item = document.querySelector(`.friend-item[data-uid="${friendUid}"]`);
            if (item) {
                const visitBtn = item.querySelector('.visit');
                if (visitBtn) {
                    visitBtn.classList.add('visited');
                    visitBtn.innerHTML = '<i class="ph-fill ph-check"></i>';
                }
            }
            
        } catch (error) {
            console.error('Visit friend error:', error);
            ui.notify('Failed to visit club', 'error');
        }
    }
    
    showClubPreview(club, cash, xp, hype) {
        const modal = document.createElement('div');
        modal.className = 'club-visit-modal';
        modal.innerHTML = `
            <div class="club-visit-content">
                <div class="club-visit-header">
                    <i class="ph-fill ph-buildings"></i>
                    <h3>${this.escapeHtml(club.name || 'Nightclub')}</h3>
                    <span>Level ${club.level || 1}</span>
                </div>
                <div class="club-visit-stats">
                    <div class="stat"><i class="ph-fill ph-couch"></i> ${club.furnitureCount || 0} Items</div>
                    <div class="stat"><i class="ph-fill ph-users"></i> ${club.maxGuests || 20} Capacity</div>
                    <div class="stat"><i class="ph-fill ph-fire"></i> ${club.hype || 0} Hype</div>
                </div>
                <div class="club-visit-rewards">
                    <h4>🎁 Visit Rewards</h4>
                    <div class="rewards">
                        <span class="reward cash">+$${cash}</span>
                        <span class="reward xp">+${xp} XP</span>
                        <span class="reward hype">+${hype} 🔥</span>
                    </div>
                </div>
                <button class="close-visit-btn" onclick="this.closest('.club-visit-modal').remove()">
                    Awesome!
                </button>
            </div>
        `;
        document.body.appendChild(modal);
        
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    openGiftModal(friendUid, friendName) {
        const modal = document.createElement('div');
        modal.id = 'gift-modal';
        modal.className = 'gift-modal';
        modal.innerHTML = `
            <div class="gift-modal-content">
                <button class="gift-modal-close" onclick="document.getElementById('gift-modal').remove()">
                    <i class="ph-bold ph-x"></i>
                </button>
                <h3>Send Gift to ${this.escapeHtml(friendName)}</h3>
                <div class="gift-options">
                    ${Object.entries(GIFT_TYPES).map(([key, gift]) => `
                        <button class="gift-option" onclick="friendsSystem.sendGift('${friendUid}', '${friendName}', '${key}')">
                            <span class="gift-emoji">${gift.name.split(' ')[0]}</span>
                            <span class="gift-label">${gift.name.split(' ')[1]}</span>
                            <span class="gift-price">$${gift.cost}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    async sendGift(friendUid, friendName, giftType) {
        const user = this.auth.currentUser;
        if (!user) {
            ui.notify('Please login first', 'error');
            return;
        }
        
        const gift = GIFT_TYPES[giftType];
        if (!gift) return;
        
        // Check if player has enough cash
        if (window.game && window.game.cash < gift.cost) {
            ui.notify('Not enough cash!', 'error');
            return;
        }
        
        try {
            // Deduct cost
            if (window.game) {
                window.game.cash -= gift.cost;
                window.game.xp += 5; // Bonus XP for sending gifts
                window.game.updateUI();
            }
            
            // Send gift to friend
            await this.db.ref(`gifts/${friendUid}`).push({
                type: giftType,
                from: user.uid,
                fromName: window.game?.ownerName || user.displayName || 'Player',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                collected: false
            });
            
            // Close modal
            const modal = document.getElementById('gift-modal');
            if (modal) modal.remove();
            
            ui.notify(`${gift.name} sent to ${friendName}! 🎁`, 'success');
            
        } catch (error) {
            console.error('Send gift error:', error);
            ui.notify('Failed to send gift', 'error');
        }
    }
    
    async collectGift(giftId) {
        const user = this.auth.currentUser;
        if (!user) return;
        
        const gift = this.gifts.find(g => g.id === giftId);
        if (!gift) return;
        
        const giftType = GIFT_TYPES[gift.type] || GIFT_TYPES.drink;
        
        try {
            // Mark as collected
            await this.db.ref(`gifts/${user.uid}/${giftId}/collected`).set(true);
            
            // Give rewards
            if (window.game) {
                window.game.cash += giftType.reward;
                window.game.xp += giftType.xp;
                window.game.updateUI();
            }
            
            ui.notify(`Collected ${giftType.name}! +$${giftType.reward} +${giftType.xp}XP`, 'success');
            
        } catch (error) {
            console.error('Collect gift error:', error);
            ui.notify('Failed to collect gift', 'error');
        }
    }
    
    openDirectMessage(friendUid, friendName) {
        // Open chat and start DM
        if (window.chatSystem) {
            window.chatSystem.toggleChat();
            // For now, just open chat - DM can be a future feature
            ui.notify(`Chat with ${friendName} - use @${friendName} in global chat!`, 'info');
        }
    }
    
    async removeFriend(friendUid, friendName) {
        if (!confirm(`Remove ${friendName} from friends?`)) return;
        
        const user = this.auth.currentUser;
        if (!user) return;
        
        try {
            // Remove from both users
            await this.db.ref(`friends/${user.uid}/${friendUid}`).remove();
            await this.db.ref(`friends/${friendUid}/${user.uid}`).remove();
            
            ui.notify(`${friendName} removed from friends`, 'info');
            
        } catch (error) {
            console.error('Remove friend error:', error);
            ui.notify('Failed to remove friend', 'error');
        }
    }
    
    async acceptRequest(requestUid, fromUid, fromName) {
        const user = this.auth.currentUser;
        if (!user) return;
        
        try {
            const myName = window.game?.ownerName || user.displayName || 'Player';
            
            // Add to both friends lists
            await this.db.ref(`friends/${user.uid}/${fromUid}`).set({
                name: fromName,
                addedAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            await this.db.ref(`friends/${fromUid}/${user.uid}`).set({
                name: myName,
                addedAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Remove request
            await this.db.ref(`friendRequests/${user.uid}/${requestUid}`).remove();
            
            ui.notify(`You and ${fromName} are now friends! 🎉`, 'success');
            
        } catch (error) {
            console.error('Accept request error:', error);
            ui.notify('Failed to accept request', 'error');
        }
    }
    
    async declineRequest(requestUid) {
        const user = this.auth.currentUser;
        if (!user) return;
        
        try {
            await this.db.ref(`friendRequests/${user.uid}/${requestUid}`).remove();
        } catch (error) {
            console.error('Decline request error:', error);
        }
    }
    
    async loadLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        if (!list) return;
        
        try {
            // Get all friends and include self
            const user = this.auth.currentUser;
            const players = [];
            
            // Add current user
            if (window.game) {
                players.push({
                    uid: user.uid,
                    name: window.game.ownerName || 'You',
                    level: window.game.level || 1,
                    cash: window.game.totalEarnings || 0,
                    isMe: true
                });
            }
            
            // Add friends
            for (const friend of this.friends) {
                const stats = await this.db.ref(`userStats/${friend.uid}`).once('value');
                const statsData = stats.val() || {};
                
                players.push({
                    uid: friend.uid,
                    name: friend.name,
                    avatar: friend.avatar,
                    level: statsData.level || friend.level || 1,
                    cash: statsData.totalEarnings || 0,
                    isMe: false
                });
            }
            
            // Sort by level, then by cash
            players.sort((a, b) => {
                if (b.level !== a.level) return b.level - a.level;
                return b.cash - a.cash;
            });
            
            list.innerHTML = players.slice(0, 20).map((player, i) => `
                <div class="leaderboard-item ${player.isMe ? 'is-me' : ''}">
                    <span class="rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                    <span class="avatar">${player.avatar || '😎'}</span>
                    <div class="player-info">
                        <span class="name">${this.escapeHtml(player.name)}${player.isMe ? ' (You)' : ''}</span>
                        <span class="stats">Level ${player.level} • $${this.formatNumber(player.cash)}</span>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Load leaderboard error:', error);
            list.innerHTML = '<div class="empty-state"><p>Failed to load</p></div>';
        }
    }
    
    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    timeAgo(timestamp) {
        if (!timestamp) return '';
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    // Update method called from game loop
    update(delta) {
        if (this.inviteCooldown > 0) {
            this.inviteCooldown -= delta;
        }
    }
    
    // Legacy methods for compatibility
    getGiftCount() {
        return this.gifts.length;
    }
    
    getVisitProgress() {
        return {
            visited: this.visitedToday.size,
            total: this.friends.length
        };
    }
    
    inviteFriends(gameState) {
        if (this.inviteCooldown > 0) {
            ui.notify(`Wait ${Math.ceil(this.inviteCooldown)}s`, 'error');
            return false;
        }
        
        const hypeBoost = 10 + this.friends.length;
        gameState.hype += hypeBoost;
        this.inviteCooldown = 300;
        
        ui.notify(`Friends notified! +${hypeBoost} hype!`, 'success');
        return { hypeBoost };
    }
    
    // Get available clubs to visit (for legacy friends modal)
    getAvailableClubs() {
        // Return friends as visitable clubs
        return this.friends.map((friend) => ({
            id: friend.uid,
            name: friend.clubName || `${friend.name}'s Club`,
            owner: friend.name || 'Player',
            level: friend.level || 1,
            visited: this.visitedToday.has(friend.uid),
            reward: 50 + (friend.level || 1) * 10
        }));
    }
    
    // Wrapper methods for game.js compatibility
    visitClub(clubId, game) {
        // This is called from game.js - use the visitFriend method
        this.visitFriend(clubId);
        
        // Return reward info for game.js
        const friend = this.friends.find(f => f.uid === clubId);
        const level = friend?.level || 1;
        return {
            xp: 10 + level * 5,
            cash: 50 + level * 10,
            hype: Math.floor(level / 2) + 1
        };
    }
    
    inviteFriends(game) {
        // Share/invite friends functionality
        const shareText = `Join me in Nightclub Tycoon! Build your own club and party! 🎉🪩`;
        const shareUrl = window.location.origin;
        
        if (navigator.share) {
            navigator.share({
                title: 'Nightclub Tycoon',
                text: shareText,
                url: shareUrl
            }).then(() => {
                if (game) {
                    game.hype += 10;
                    game.updateUI();
                }
                ui.notify('Thanks for sharing! +10 Hype', 'success');
            }).catch(() => {});
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
                if (game) {
                    game.hype += 10;
                    game.updateUI();
                }
                ui.notify('Invite link copied! +10 Hype', 'success');
            }).catch(() => {
                ui.notify('Could not copy invite link', 'error');
            });
        }
    }
    
    collectGifts(game) {
        // Collect all pending gifts
        const collected = [];
        
        this.gifts.forEach(gift => {
            const giftType = GIFT_TYPES[gift.type] || GIFT_TYPES.drink;
            collected.push({
                type: gift.type,
                reward: giftType.reward,
                xp: giftType.xp,
                from: gift.fromName
            });
            
            // Apply rewards
            if (game) {
                game.cash += giftType.reward;
                game.xp += giftType.xp;
            }
            
            // Remove gift from database
            this.collectGift(gift.id);
        });
        
        if (collected.length > 0 && game) {
            game.updateUI();
        }
        
        return collected;
    }
}

export const friendsSystem = new FriendsSystem();

// Expose to window for HTML onclick handlers
window.friendsSystem = friendsSystem;

// Auto-initialize when DOM is ready (wait longer for Firebase to initialize)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => friendsSystem.init(), 3000);
    });
} else {
    setTimeout(() => friendsSystem.init(), 3000);
}
