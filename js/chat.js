// Global Chat System using Firebase Compat SDK

class ChatSystem {
    constructor() {
        this.db = null;
        this.auth = null;
        this.chatRef = null;
        this.isOpen = false;
        this.unreadCount = 0;
        this.messages = [];
        this.maxMessages = 50;
        this.initialized = false;
        this.initStarted = false; // Guard against multiple init calls
        this.lastMessageTime = 0;
        this.onlineUsers = {};
        this.selectedUser = null;
        this.messageListener = null; // Store listener reference for cleanup
        this.onlineListener = null; // Store online listener reference
        this.renderedMessageIds = new Set(); // Track rendered message IDs to prevent duplicates
        this.isSending = false; // Prevent double-sending
        this.isBanned = false; // Moderation: banned status
        this.cooldownUntil = 0; // Moderation: cooldown timestamp
        this.contentFilters = this.initContentFilters(); // Content moderation
    }
    
    // Content Moderation Filters
    initContentFilters() {
        return {
            profanity: [
                'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'cock', 'pussy', 'cunt',
                'bastard', 'whore', 'slut', 'fag', 'nigger', 'nigga', 'retard',
                'f*ck', 'sh*t', 'b*tch', 'a$$', 'd!ck', 'fck', 'fuk', 'stfu', 'gtfo'
            ],
            scam: [
                'free money', 'free coins', 'hack', 'cheat', 'exploit', 'generator',
                'click here', 'dm me for', 'send me', 'give me your', 'password', 'login'
            ],
            toxic: [
                'kill yourself', 'kys', 'hope you die', 'neck yourself', 'go die'
            ]
        };
    }
    
    checkContent(text) {
        if (!text) return { allowed: true };
        const lower = text.toLowerCase();
        
        // Check profanity
        for (const word of this.contentFilters.profanity) {
            if (lower.includes(word)) {
                return { allowed: false, reason: 'Message contains inappropriate language' };
            }
        }
        
        // Check scam indicators (need 2+ matches)
        let scamScore = 0;
        for (const indicator of this.contentFilters.scam) {
            if (lower.includes(indicator)) scamScore++;
        }
        if (scamScore >= 2) {
            return { allowed: false, reason: 'Message flagged as potential scam' };
        }
        
        // Check toxic content
        for (const phrase of this.contentFilters.toxic) {
            if (lower.includes(phrase)) {
                return { allowed: false, reason: 'Message contains harmful content' };
            }
        }
        
        // Check spam patterns
        if (/(.)\1{5,}/i.test(text)) {
            return { allowed: false, reason: 'Message contains spam (repeated characters)' };
        }
        
        // Check excessive caps (more than 80% uppercase, min 10 chars)
        const letters = text.replace(/[^a-zA-Z]/g, '');
        if (letters.length >= 10) {
            const upperCount = (text.match(/[A-Z]/g) || []).length;
            if (upperCount / letters.length > 0.8) {
                return { allowed: false, reason: 'Please don\'t use excessive caps' };
            }
        }
        
        return { allowed: true };
    }
    
    async init() {
        // Guard against multiple initialization attempts
        if (this.initStarted) {
            console.log('💬 Chat init already started, skipping...');
            return;
        }
        
        try {
            // Wait for Firebase to be ready AND initialized
            if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
                console.warn('Firebase not initialized yet, chat will retry...');
                setTimeout(() => this.init(), 2000);
                return;
            }
            
            this.initStarted = true; // Mark init as started
            
            this.db = firebase.database();
            this.auth = firebase.auth();
            this.chatRef = this.db.ref('globalChat');
            
            this.createChatUI();
            this.listenForMessages();
            this.listenToOnlineCount();
            
            // Track online status when auth state changes
            this.auth.onAuthStateChanged((user) => {
                if (user) {
                    this.trackOnlineStatus(user);
                    this.syncUserProfile(user);
                    this.listenForFriendRequests(user);
                    this.listenForNewFollowers(user);
                    this.listenForModeration(user); // Check moderation status
                }
            });
            
            this.initialized = true;
            console.log('💬 Chat system initialized');
        } catch (error) {
            console.error('Chat init error:', error);
            this.initStarted = false; // Reset on error to allow retry
        }
    }
    
    createChatUI() {
        // Check if chat panel already exists to prevent duplicates
        if (document.getElementById('chat-panel')) {
            console.log('💬 Chat panel already exists, skipping creation');
            return;
        }
        
        // Chat panel (button is in the dock)
        const chatPanel = document.createElement('div');
        chatPanel.id = 'chat-panel';
        chatPanel.className = 'chat-panel hidden';
        chatPanel.innerHTML = `
            <div class="chat-header">
                <div class="chat-title">
                    <i class="ph-fill ph-globe"></i>
                    <span>Global Chat</span>
                    <button class="online-count-btn" id="online-count-btn" onclick="chatSystem.toggleOnlineList()">
                        <span id="online-count">0 online</span>
                        <i class="ph-bold ph-caret-down"></i>
                    </button>
                </div>
                <div class="chat-header-actions">
                    <button class="my-profile-btn" onclick="chatSystem.viewMyProfile()" title="My Profile">
                        <i class="ph-fill ph-user-circle"></i>
                        <span class="follower-badge hidden" id="follower-badge">0</span>
                    </button>
                    <button class="chat-close" onclick="chatSystem.toggleChat()">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
            </div>
            
            <!-- Online Users Panel -->
            <div class="online-users-panel hidden" id="online-users-panel">
                <div class="online-users-header">
                    <i class="ph-fill ph-users"></i>
                    <span>Online Players</span>
                </div>
                <div class="online-users-list" id="online-users-list">
                    <!-- Populated by JS -->
                </div>
            </div>
            
            <div class="chat-messages" id="chat-messages">
                <div class="chat-welcome">
                    <i class="ph-fill ph-hand-waving"></i>
                    <p>Welcome to Global Chat!</p>
                    <span>Chat with other club owners</span>
                </div>
            </div>
            <div class="chat-input-area">
                <input type="text" id="chat-input" placeholder="Type a message..." maxlength="200" autocomplete="off">
                <button id="chat-send-btn" onclick="chatSystem.sendMessage()">
                    <i class="ph-fill ph-paper-plane-tilt"></i>
                </button>
            </div>
            
            <!-- User Action Menu -->
            <div class="user-action-menu hidden" id="user-action-menu">
                <div class="user-action-header" id="user-action-header">
                    <div class="user-action-avatar">👤</div>
                    <span class="user-action-name">Player</span>
                </div>
                <button class="self-only" onclick="chatSystem.updateAvatar()"><i class="ph-fill ph-camera"></i> Update Avatar</button>
                <button onclick="chatSystem.viewProfile()"><i class="ph-fill ph-user"></i> View Profile</button>
                <button onclick="chatSystem.viewClub()"><i class="ph-fill ph-buildings"></i> View Club</button>
                <button class="not-self" onclick="chatSystem.addFriend()"><i class="ph-fill ph-user-plus"></i> Add Friend</button>
                <button class="not-self" onclick="chatSystem.followUser()"><i class="ph-fill ph-heart"></i> Follow</button>
                <button onclick="chatSystem.closeUserMenu()"><i class="ph-bold ph-x"></i> Close</button>
            </div>
        `;
        document.body.appendChild(chatPanel);
        
        // Enter key to send
        const input = document.getElementById('chat-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }
    
    toggleChat() {
        let panel = document.getElementById('chat-panel');
        const badge = document.getElementById('chat-dock-badge');
        
        // Ensure panel exists - create only if truly missing
        if (!panel) {
            console.warn('💬 Chat panel not found, creating it...');
            this.createChatUI();
            panel = document.getElementById('chat-panel');
            if (!panel) {
                console.error('💬 Failed to create chat panel');
                return;
            }
        }
        
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            panel.classList.remove('hidden');
            panel.classList.add('open');
            this.unreadCount = 0;
            if (badge) {
                badge.classList.add('hidden');
                badge.textContent = '0';
            }
            this.scrollToBottom();
            setTimeout(() => document.getElementById('chat-input')?.focus(), 100);
        } else {
            panel.classList.add('hidden');
            panel.classList.remove('open');
        }
    }
    
    listenForMessages() {
        // Detach existing listener to prevent duplicates
        if (this.messageListener) {
            console.log('💬 Detaching existing message listener');
            this.chatRef.off('child_added', this.messageListener);
            this.messageListener = null;
        }
        
        // Clear rendered message IDs when restarting listener
        this.renderedMessageIds.clear();
        
        // Listen for last N messages
        try {
            this.messageListener = this.chatRef.orderByChild('timestamp').limitToLast(this.maxMessages).on('child_added', (snapshot) => {
                const messageId = snapshot.key;
                const message = snapshot.val();
                
                // Deduplicate: skip if already rendered
                if (this.renderedMessageIds.has(messageId)) {
                    console.log('💬 Skipping duplicate message:', messageId);
                    return;
                }
                
                console.log('💬 New message received:', messageId);
                if (message) {
                    this.renderedMessageIds.add(messageId);
                    this.addMessageToUI(message, messageId);
                    
                    // Update unread count if chat is closed and not first load
                    if (!this.isOpen && this.initialized && message.timestamp > this.lastMessageTime) {
                        this.unreadCount++;
                        this.updateBadge();
                    }
                    this.lastMessageTime = Math.max(this.lastMessageTime, message.timestamp || 0);
                }
            }, (error) => {
                console.error('💬 Message listener error:', error);
            });
            console.log('💬 Message listener started');
        } catch (error) {
            console.error('💬 Failed to start message listener:', error);
        }
    }
    
    trackOnlineStatus(user) {
        if (!user) return;
        
        try {
            const userStatusRef = this.db.ref(`onlineUsers/${user.uid}`);
            const connectedRef = this.db.ref('.info/connected');
            
            connectedRef.on('value', (snap) => {
                if (snap.val() === true) {
                    userStatusRef.onDisconnect().remove();
                    userStatusRef.set({
                        name: user.displayName || user.email?.split('@')[0] || 'Player',
                        lastSeen: firebase.database.ServerValue.TIMESTAMP
                    });
                }
            });
            console.log('💬 Online status tracking enabled for', user.email);
        } catch (error) {
            console.error('Track online error:', error);
        }
    }
    
    listenForModeration(user) {
        if (!user || !this.db) return;
        
        // Listen for ban status
        this.db.ref(`moderation/banned/${user.uid}`).on('value', (snap) => {
            this.isBanned = snap.exists();
            if (this.isBanned) {
                console.log('💬 User is banned from chat');
                this.updateChatInputState();
            }
        });
        
        // Listen for cooldown status
        this.db.ref(`moderation/cooldowns/${user.uid}`).on('value', (snap) => {
            if (snap.exists()) {
                const data = snap.val();
                this.cooldownUntil = data.until || 0;
                console.log('💬 User cooldown until:', new Date(this.cooldownUntil));
            } else {
                this.cooldownUntil = 0;
            }
            this.updateChatInputState();
        });
        
        console.log('💬 Moderation listener enabled');
    }
    
    updateChatInputState() {
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('chat-send-btn');
        if (!input) return;
        
        if (this.isBanned) {
            input.placeholder = '🚫 You are banned from chat';
            input.disabled = true;
            if (sendBtn) sendBtn.disabled = true;
        } else if (this.cooldownUntil > Date.now()) {
            const remaining = Math.ceil((this.cooldownUntil - Date.now()) / 60000);
            input.placeholder = `⏱️ Cooldown: ${remaining}m remaining`;
            input.disabled = true;
            if (sendBtn) sendBtn.disabled = true;
            // Re-check when cooldown expires
            setTimeout(() => this.updateChatInputState(), 60000);
        } else {
            input.placeholder = 'Type a message...';
            input.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    }
    
    async syncUserProfile(user) {
        if (!user) return;
        
        // Ensure DB is initialized
        if (!this.db && typeof firebase !== 'undefined' && firebase.apps.length) {
            try {
                this.db = firebase.database();
            } catch (e) {
                // Silent fail if firebase not ready
                return;
            }
        }
        
        if (!this.db) return; // Exit if still no DB
        
        // Helper to log errors without triggering UI notifications
        // Changed to console.log to strictly avoid UI toast pickups
        const safeLog = (context, err) => {
            const msg = err.message || err.code || 'Unknown error';
            console.log(`Chat Sync (${context}): ${msg}`);
        };

        try {
            // Get game data if available
            const gameData = window.game || {};
            
            const playerName = gameData.ownerName || user.displayName || user.email?.split('@')[0] || 'Player';
            
            // Sync user profile
            try {
                await this.db.ref(`userProfiles/${user.uid}`).update({
                    name: playerName,
                    clubName: gameData.clubName || `${playerName}'s Club`,
                    avatar: gameData.avatar || '😎',
                    lastActive: firebase.database.ServerValue.TIMESTAMP,
                    level: gameData.level || 1
                });
            } catch (e) { safeLog('Profile', e); }
            
            // Set joinDate only if it doesn't exist
            try {
                const profileSnap = await this.db.ref(`userProfiles/${user.uid}/joinDate`).once('value');
                if (!profileSnap.exists()) {
                    await this.db.ref(`userProfiles/${user.uid}/joinDate`).set(firebase.database.ServerValue.TIMESTAMP);
                }
            } catch (e) { safeLog('JoinDate', e); }
            
            // Sync user stats
            try {
                await this.db.ref(`userStats/${user.uid}`).update({
                    level: gameData.level || 1,
                    totalEarnings: gameData.totalEarnings || 0,
                    guestsServed: gameData.totalGuests || 0
                });
            } catch (e) { safeLog('Stats', e); }
            
            // Sync club data
            try {
                await this.db.ref(`clubs/${user.uid}`).update({
                    name: gameData.clubName || `${playerName}'s Club`,
                    level: gameData.level || 1,
                    furnitureCount: gameData.furniture?.length || 0,
                    totalEarnings: gameData.totalEarnings || 0,
                    maxGuests: gameData.maxGuests || 20,
                    hype: gameData.hype || 0,
                    ownerName: playerName,
                    daysOpen: Math.floor((Date.now() - (gameData.gameStartTime || Date.now())) / (1000 * 60 * 60 * 24)) + 1
                });
            } catch (e) { safeLog('Club', e); }
            
            console.log('💬 User profile and club synced');
        } catch (error) {
            console.warn('Sync profile error:', error); // Warn instead of error to prevent UI popups
        }
    }
    
    listenToOnlineCount() {
        try {
            this.db.ref('onlineUsers').on('value', (snapshot) => {
                const users = snapshot.exists() ? snapshot.val() : {};
                const count = Object.keys(users).length;
                const onlineEl = document.getElementById('online-count');
                if (onlineEl) onlineEl.textContent = `${count} online`;
                
                // Store online users
                this.onlineUsers = users;
                
                // Update online users list
                this.updateOnlineUsersList(users);
                console.log('💬 Online users:', count);
            });
        } catch (error) {
            console.error('Online count error:', error);
        }
    }
    
    updateOnlineUsersList(users) {
        const listEl = document.getElementById('online-users-list');
        if (!listEl) return;
        
        const currentUid = this.auth.currentUser?.uid;
        const colors = ['#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#34d399', '#fb7185', '#38bdf8'];
        
        let html = '';
        for (const [uid, user] of Object.entries(users)) {
            const isMe = uid === currentUid;
            const color = colors[Math.abs(this.hashCode(uid)) % colors.length];
            html += `
                <div class="online-user-item ${isMe ? 'is-me' : ''}" onclick="chatSystem.showUserMenu('${uid}', '${this.escapeHtml(user.name)}', '${color}')">
                    <div class="online-user-avatar" style="background: ${color}">
                        ${user.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span class="online-user-name">${this.escapeHtml(user.name || 'Player')}</span>
                    ${isMe ? '<span class="you-badge">You</span>' : ''}
                    <div class="online-dot"></div>
                </div>
            `;
        }
        
        if (Object.keys(users).length === 0) {
            html = '<div class="no-users">No players online</div>';
        }
        
        listEl.innerHTML = html;
    }
    
    toggleOnlineList() {
        const panel = document.getElementById('online-users-panel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    }
    
    addMessageToUI(message, messageId = null) {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        
        // Check if message with this ID already exists in DOM
        if (messageId && container.querySelector(`[data-msg-id="${messageId}"]`)) {
            console.log('💬 Message already in DOM, skipping:', messageId);
            return;
        }
        
        // Remove welcome message if exists
        const welcome = container.querySelector('.chat-welcome');
        if (welcome) welcome.remove();
        
        const isMe = this.auth.currentUser && message.uid === this.auth.currentUser.uid;
        const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
        
        const msgEl = document.createElement('div');
        msgEl.className = `chat-message ${isMe ? 'mine' : ''}`;
        if (messageId) msgEl.setAttribute('data-msg-id', messageId);
        msgEl.innerHTML = `
            <div class="msg-header">
                <span class="msg-name clickable" data-uid="${message.uid}" data-name="${this.escapeHtml(message.name || 'Anonymous')}" data-color="${message.color || '#4ade80'}">${this.escapeHtml(message.name || 'Anonymous')}</span>
                <span class="msg-time">${time}</span>
            </div>
            <div class="msg-text">${this.escapeHtml(message.text)}</div>
        `;
        
        // Add click handler to name
        const nameEl = msgEl.querySelector('.msg-name');
        nameEl.style.color = message.color || '#4ade80';
        nameEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showUserMenu(message.uid, message.name, message.color);
        });
        
        container.appendChild(msgEl);
        
        // Keep only last N messages in UI
        while (container.children.length > this.maxMessages) {
            container.removeChild(container.firstChild);
        }
        
        this.scrollToBottom();
    }
    
    async sendMessage() {
        // Prevent double-sending
        if (this.isSending) {
            console.log('💬 Already sending, skipping...');
            return;
        }
        
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        
        if (!text) return;
        
        const user = this.auth.currentUser;
        if (!user) {
            if (window.ui) ui.notify('Please login to chat!', 'error');
            return;
        }
        
        // Check if user is banned
        if (this.isBanned) {
            if (window.ui) ui.notify('🚫 You are banned from chat', 'error');
            input.value = '';
            return;
        }
        
        // Check if user is on cooldown
        if (this.cooldownUntil > Date.now()) {
            const remaining = Math.ceil((this.cooldownUntil - Date.now()) / 60000);
            if (window.ui) ui.notify(`⏱️ Cooldown: ${remaining}m remaining`, 'warning');
            return;
        }
        
        // Content moderation check
        const contentCheck = this.checkContent(text);
        if (!contentCheck.allowed) {
            if (window.ui) ui.notify(`🚫 ${contentCheck.reason}`, 'error');
            return;
        }
        
        this.isSending = true;
        
        // Get player name from game or use email
        let playerName = 'Player';
        if (window.game && window.game.ownerName) {
            playerName = window.game.ownerName;
        } else if (user.displayName) {
            playerName = user.displayName;
        } else if (user.email) {
            playerName = user.email.split('@')[0];
        }
        
        // Random color for user
        const colors = ['#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#34d399', '#fb7185', '#38bdf8'];
        const color = colors[Math.abs(this.hashCode(user.uid)) % colors.length];
        
        try {
            console.log('💬 Sending message:', { name: playerName, text });
            
            // Clear input immediately to prevent double-send from Enter key
            input.value = '';
            
            await this.chatRef.push({
                uid: user.uid,
                name: playerName,
                text: text,
                color: color,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            console.log('💬 Message sent successfully');
        } catch (error) {
            console.error('💬 Send message error:', error);
            // Restore text on error
            input.value = text;
            if (window.ui) ui.notify('Failed to send: ' + error.message, 'error');
        } finally {
            this.isSending = false;
        }
    }
    
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
    
    updateBadge() {
        const badge = document.getElementById('chat-dock-badge');
        if (badge) {
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            badge.classList.toggle('hidden', this.unreadCount === 0);
        }
    }
    
    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // User Action Functions
    showUserMenu(uid, name, color) {
        this.selectedUser = { uid, name, color };
        
        const menu = document.getElementById('user-action-menu');
        const header = document.getElementById('user-action-header');
        const isMe = this.auth.currentUser && uid === this.auth.currentUser.uid;
        
        if (menu && header) {
            header.innerHTML = `
                <div class="user-action-avatar" style="background: ${color}">${name?.charAt(0)?.toUpperCase() || '?'}</div>
                <span class="user-action-name">${this.escapeHtml(name || 'Player')}</span>
            `;
            
            // Show/hide buttons based on if it's the user's own profile
            menu.querySelectorAll('.self-only').forEach(btn => {
                btn.style.display = isMe ? 'flex' : 'none';
            });
            menu.querySelectorAll('.not-self').forEach(btn => {
                btn.style.display = isMe ? 'none' : 'flex';
            });
            
            menu.classList.remove('hidden');
        }
    }
    
    closeUserMenu() {
        const menu = document.getElementById('user-action-menu');
        if (menu) menu.classList.add('hidden');
        this.selectedUser = null;
    }
    
    updateAvatar() {
        // Open avatar update modal or show avatar picker
        if (window.game && typeof game.openModal === 'function') {
            game.openModal('profile');
            if (window.ui) ui.notify('Update your avatar in Profile settings', 'info');
        } else {
            // Create simple avatar picker
            this.showAvatarPicker();
        }
        this.closeUserMenu();
    }
    
    showAvatarPicker() {
        const avatars = ['😎', '🤩', '🥳', '😈', '👻', '🎭', '🦊', '🐺', '🦁', '🐯', '🎤', '🎧', '💃', '🕺', '👑', '⭐'];
        
        let pickerHtml = '<div class="avatar-picker-overlay" onclick="chatSystem.closeAvatarPicker()">';
        pickerHtml += '<div class="avatar-picker" onclick="event.stopPropagation()">';
        pickerHtml += '<div class="avatar-picker-title">Choose Your Avatar</div>';
        pickerHtml += '<div class="avatar-picker-grid">';
        avatars.forEach(avatar => {
            pickerHtml += `<button class="avatar-option" onclick="chatSystem.selectAvatar('${avatar}')">${avatar}</button>`;
        });
        pickerHtml += '</div></div></div>';
        
        const picker = document.createElement('div');
        picker.id = 'avatar-picker-container';
        picker.innerHTML = pickerHtml;
        document.body.appendChild(picker);
    }
    
    closeAvatarPicker() {
        const picker = document.getElementById('avatar-picker-container');
        if (picker) picker.remove();
    }
    
    async selectAvatar(avatar) {
        const user = this.auth.currentUser;
        if (!user) return;
        
        try {
            // Save to Firebase
            await this.db.ref(`userProfiles/${user.uid}/avatar`).set(avatar);
            
            // Update local game if available
            if (window.game) {
                game.avatar = avatar;
            }
            
            if (window.ui) ui.notify('Avatar updated!', 'success');
        } catch (error) {
            console.error('Avatar update error:', error);
            if (window.ui) ui.notify('Failed to update avatar', 'error');
        }
        
        this.closeAvatarPicker();
    }
    
    async viewProfile() {
        if (!this.selectedUser) return;
        
        try {
            // Fetch user profile from Firebase
            const snapshot = await this.db.ref(`userProfiles/${this.selectedUser.uid}`).once('value');
            const profile = snapshot.val() || {};
            
            // Also get user stats
            const statsSnapshot = await this.db.ref(`userStats/${this.selectedUser.uid}`).once('value');
            const stats = statsSnapshot.val() || {};
            
            this.showProfileModal({
                uid: this.selectedUser.uid,
                name: this.selectedUser.name,
                color: this.selectedUser.color,
                avatar: profile.avatar || '😎',
                clubName: profile.clubName || `${this.selectedUser.name}'s Club`,
                level: stats.level || 1,
                totalEarnings: stats.totalEarnings || 0,
                guestsServed: stats.guestsServed || 0,
                followers: profile.followers || 0,
                following: profile.following || 0,
                joinDate: profile.joinDate || Date.now()
            });
        } catch (error) {
            console.error('View profile error:', error);
            // Show basic profile anyway
            this.showProfileModal({
                uid: this.selectedUser.uid,
                name: this.selectedUser.name,
                color: this.selectedUser.color,
                avatar: '😎',
                clubName: `${this.selectedUser.name}'s Club`,
                level: 1
            });
        }
        this.closeUserMenu();
    }
    
    showProfileModal(profile) {
        const isMe = this.auth.currentUser && profile.uid === this.auth.currentUser.uid;
        const joinDate = new Date(profile.joinDate).toLocaleDateString();
        
        let modalHtml = `
            <div class="profile-modal-overlay" onclick="chatSystem.closeProfileModal()">
                <div class="profile-modal" onclick="event.stopPropagation()">
                    <button class="profile-modal-close" onclick="chatSystem.closeProfileModal()">
                        <i class="ph-bold ph-x"></i>
                    </button>
                    
                    <div class="profile-header">
                        <div class="profile-avatar-large" style="background: ${profile.color}">${profile.avatar}</div>
                        <h2 class="profile-name">${this.escapeHtml(profile.name)}</h2>
                        <p class="profile-club">${this.escapeHtml(profile.clubName)}</p>
                        ${isMe ? '<span class="profile-you-badge">This is you</span>' : ''}
                    </div>
                    
                    <div class="profile-stats-grid">
                        <div class="profile-stat">
                            <span class="stat-value">${profile.level || 1}</span>
                            <span class="stat-label">Level</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-value">${this.formatNumber(profile.totalEarnings || 0)}</span>
                            <span class="stat-label">Earnings</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-value">${this.formatNumber(profile.guestsServed || 0)}</span>
                            <span class="stat-label">Guests</span>
                        </div>
                    </div>
                    
                    <div class="profile-social">
                        <div class="social-stat">
                            <strong>${profile.followers || 0}</strong> Followers
                        </div>
                        <div class="social-stat">
                            <strong>${profile.following || 0}</strong> Following
                        </div>
                    </div>
                    
                    <div class="profile-info">
                        <i class="ph-fill ph-calendar"></i> Joined ${joinDate}
                    </div>
                    
                    ${!isMe ? `
                        <div class="profile-actions">
                            <button class="profile-action-btn primary" onclick="chatSystem.addFriendFromProfile('${profile.uid}', '${this.escapeHtml(profile.name)}')">
                                <i class="ph-fill ph-user-plus"></i> Add Friend
                            </button>
                            <button class="profile-action-btn" onclick="chatSystem.followFromProfile('${profile.uid}', '${this.escapeHtml(profile.name)}')">
                                <i class="ph-fill ph-heart"></i> Follow
                            </button>
                            <button class="profile-action-btn" onclick="chatSystem.visitClubFromProfile('${profile.uid}')">
                                <i class="ph-fill ph-buildings"></i> Visit Club
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'profile-modal-container';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
    }
    
    closeProfileModal() {
        const modal = document.getElementById('profile-modal-container');
        if (modal) modal.remove();
    }
    
    async viewMyProfile() {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            if (window.ui) ui.notify('Please login first', 'error');
            return;
        }
        
        // Set selected user to self
        this.selectedUser = {
            uid: currentUser.uid,
            name: window.game?.ownerName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Player'
        };
        
        await this.viewProfile();
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    async addFriendFromProfile(uid, name) {
        this.selectedUser = { uid, name };
        await this.addFriend();
        this.closeProfileModal();
    }
    
    async followFromProfile(uid, name) {
        this.selectedUser = { uid, name };
        await this.followUser();
        this.closeProfileModal();
    }
    
    visitClubFromProfile(uid) {
        this.closeProfileModal();
        this.selectedUser = { uid };
        this.viewClub();
    }
    
    async viewClub() {
        if (!this.selectedUser) return;
        
        const uid = this.selectedUser.uid;
        
        try {
            // Fetch club data from Firebase
            const snapshot = await this.db.ref(`clubs/${uid}`).once('value');
            const clubData = snapshot.val();
            
            if (clubData) {
                this.showClubModal(uid, clubData);
            } else {
                // Show default club view
                const profileSnap = await this.db.ref(`userProfiles/${uid}`).once('value');
                const profile = profileSnap.val() || {};
                
                this.showClubModal(uid, {
                    name: profile.clubName || `${this.selectedUser.name || 'Player'}'s Club`,
                    level: profile.level || 1,
                    furniture: [],
                    theme: 'default'
                });
            }
        } catch (error) {
            console.error('View club error:', error);
            if (window.ui) ui.notify('Could not load club', 'error');
        }
        this.closeUserMenu();
    }
    
    showClubModal(uid, clubData) {
        const isMe = this.auth.currentUser && uid === this.auth.currentUser.uid;
        const furnitureCount = clubData.furnitureCount || 0;
        const totalEarnings = this.formatNumber(clubData.totalEarnings || 0);
        const likes = clubData.likes || 0;
        
        let modalHtml = `
            <div class="club-modal-overlay" onclick="chatSystem.closeClubModal()">
                <div class="club-modal" onclick="event.stopPropagation()">
                    <button class="club-modal-close" onclick="chatSystem.closeClubModal()">
                        <i class="ph-bold ph-x"></i>
                    </button>
                    
                    <div class="club-header">
                        <i class="ph-fill ph-buildings club-icon"></i>
                        <h2 class="club-name">${this.escapeHtml(clubData.name || 'Nightclub')}</h2>
                        <span class="club-level">Level ${clubData.level || 1}</span>
                    </div>
                    
                    <div class="club-preview">
                        <div class="club-preview-content">
                            <div class="preview-item">
                                <i class="ph-fill ph-couch"></i>
                                <span>${furnitureCount} Furniture</span>
                            </div>
                            <div class="preview-item">
                                <i class="ph-fill ph-currency-dollar"></i>
                                <span>$${totalEarnings} Earned</span>
                            </div>
                            <div class="preview-item">
                                <i class="ph-fill ph-heart"></i>
                                <span>${likes} Likes</span>
                            </div>
                            <div class="preview-item">
                                <i class="ph-fill ph-clock"></i>
                                <span>${clubData.daysOpen || 1} Days</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="club-stats">
                        <div class="club-stat">
                            <i class="ph-fill ph-users"></i>
                            <span>${clubData.maxGuests || 20} Guests</span>
                        </div>
                        <div class="club-stat">
                            <i class="ph-fill ph-star"></i>
                            <span>${clubData.rating || '4.5'}★</span>
                        </div>
                        <div class="club-stat">
                            <i class="ph-fill ph-fire"></i>
                            <span>${clubData.hype || 0} Hype</span>
                        </div>
                    </div>
                    
                    ${!isMe ? `
                        <div class="club-actions">
                            <button class="club-action-btn primary" onclick="chatSystem.likeClub('${uid}')">
                                <i class="ph-fill ph-thumbs-up"></i> Like Club
                            </button>
                            <button class="club-action-btn" onclick="chatSystem.closeClubModal(); chatSystem.showUserMenu('${uid}', '${this.escapeHtml(clubData.ownerName || 'Owner')}', '#4ade80')">
                                <i class="ph-fill ph-user"></i> View Owner
                            </button>
                        </div>
                    ` : `
                        <div class="club-actions">
                            <button class="club-action-btn primary" onclick="chatSystem.closeClubModal()">
                                <i class="ph-fill ph-check"></i> This is Your Club
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'club-modal-container';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);
    }
    
    closeClubModal() {
        const modal = document.getElementById('club-modal-container');
        if (modal) modal.remove();
    }
    
    async likeClub(uid) {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            if (window.ui) ui.notify('Please login first', 'error');
            return;
        }
        
        try {
            // Check if already liked
            const likeRef = this.db.ref(`clubLikes/${uid}/${currentUser.uid}`);
            const existing = await likeRef.once('value');
            
            if (existing.exists()) {
                if (window.ui) ui.notify('You already liked this club!', 'info');
                return;
            }
            
            await likeRef.set({
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Update likes count on club
            const likesSnap = await this.db.ref(`clubLikes/${uid}`).once('value');
            const likesCount = likesSnap.exists() ? Object.keys(likesSnap.val()).length : 0;
            await this.db.ref(`clubs/${uid}/likes`).set(likesCount);
            
            if (window.ui) ui.notify('Club liked! 👍', 'success');
            this.closeClubModal();
        } catch (error) {
            console.error('Like club error:', error);
            if (window.ui) ui.notify('Failed to like club', 'error');
        }
    }
    
    async addFriend() {
        if (!this.selectedUser) return;
        
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            if (window.ui) ui.notify('Please login first', 'error');
            return;
        }
        
        if (this.selectedUser.uid === currentUser.uid) {
            if (window.ui) ui.notify("You can't add yourself!", 'error');
            return;
        }
        
        try {
            // Add friend request to Firebase
            await this.db.ref(`friendRequests/${this.selectedUser.uid}/${currentUser.uid}`).set({
                from: currentUser.uid,
                fromName: window.game?.ownerName || currentUser.displayName || currentUser.email?.split('@')[0],
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                status: 'pending'
            });
            
            if (window.ui) ui.notify(`Friend request sent to ${this.selectedUser.name}!`, 'success');
        } catch (error) {
            console.error('Add friend error:', error);
            if (window.ui) ui.notify('Failed to send friend request', 'error');
        }
        this.closeUserMenu();
    }
    
    async followUser() {
        if (!this.selectedUser || !this.selectedUser.uid) {
            console.error('No user selected to follow');
            if (window.ui) ui.notify('No user selected', 'error');
            return;
        }
        
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            if (window.ui) ui.notify('Please login first', 'error');
            return;
        }
        
        if (this.selectedUser.uid === currentUser.uid) {
            if (window.ui) ui.notify("You can't follow yourself!", 'error');
            return;
        }
        
        const targetUid = this.selectedUser.uid;
        const targetName = this.selectedUser.name || 'Player';
        
        try {
            console.log('Following user:', targetUid, targetName);
            
            // Add to following list
            await this.db.ref(`following/${currentUser.uid}/${targetUid}`).set({
                name: targetName,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Add to follower's list
            await this.db.ref(`followers/${targetUid}/${currentUser.uid}`).set({
                name: window.game?.ownerName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Player',
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Update follower count
            await this.updateFollowerCount(targetUid);
            
            // Update following count for current user
            await this.updateFollowingCount(currentUser.uid);
            
            console.log('Follow successful!');
            if (window.ui) ui.notify(`Now following ${targetName}! 💖`, 'success');
        } catch (error) {
            console.error('Follow error:', error);
            if (window.ui) ui.notify('Failed to follow: ' + error.message, 'error');
        }
        this.closeUserMenu();
    }
    
    async updateFollowingCount(uid) {
        try {
            const snapshot = await this.db.ref(`following/${uid}`).once('value');
            const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
            await this.db.ref(`userProfiles/${uid}/following`).set(count);
        } catch (error) {
            console.error('Update following count error:', error);
        }
    }
    
    // Listen for incoming friend requests
    listenForFriendRequests(user) {
        if (!user) return;
        
        this.db.ref(`friendRequests/${user.uid}`).on('child_added', (snapshot) => {
            const request = snapshot.val();
            if (request && request.status === 'pending') {
                this.showFriendRequestNotification(snapshot.key, request);
            }
        });
    }
    
    showFriendRequestNotification(requestId, request) {
        // Create notification
        let notifHtml = `
            <div class="friend-request-notif" id="friend-notif-${requestId}">
                <div class="notif-content">
                    <i class="ph-fill ph-user-plus"></i>
                    <div class="notif-text">
                        <strong>${this.escapeHtml(request.fromName || 'Someone')}</strong>
                        <span>wants to be your friend!</span>
                    </div>
                </div>
                <div class="notif-actions">
                    <button class="accept-btn" onclick="chatSystem.acceptFriendRequest('${requestId}', '${request.from}', '${this.escapeHtml(request.fromName)}')">
                        <i class="ph-fill ph-check"></i> Accept
                    </button>
                    <button class="decline-btn" onclick="chatSystem.declineFriendRequest('${requestId}')">
                        <i class="ph-fill ph-x"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Add to notifications container or create one
        let container = document.getElementById('friend-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'friend-notifications';
            container.className = 'friend-notifications';
            document.body.appendChild(container);
        }
        
        container.insertAdjacentHTML('beforeend', notifHtml);
        
        // Auto-hide after 30 seconds
        setTimeout(() => {
            const notif = document.getElementById(`friend-notif-${requestId}`);
            if (notif) notif.remove();
        }, 30000);
    }
    
    async acceptFriendRequest(requestId, fromUid, fromName) {
        const currentUser = this.auth.currentUser;
        if (!currentUser) {
            if (window.ui) ui.notify('Please login first', 'error');
            return;
        }
        
        console.log('Accepting friend request:', requestId, fromUid, fromName);
        
        try {
            const myName = window.game?.ownerName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Player';
            
            // Add to both users' friends list
            await this.db.ref(`friends/${currentUser.uid}/${fromUid}`).set({
                name: fromName,
                addedAt: firebase.database.ServerValue.TIMESTAMP
            });
            console.log('Added friend to my list');
            
            await this.db.ref(`friends/${fromUid}/${currentUser.uid}`).set({
                name: myName,
                addedAt: firebase.database.ServerValue.TIMESTAMP
            });
            console.log('Added me to their list');
            
            // Remove the request
            await this.db.ref(`friendRequests/${currentUser.uid}/${requestId}`).remove();
            console.log('Removed friend request');
            
            // Remove notification
            const notif = document.getElementById(`friend-notif-${requestId}`);
            if (notif) notif.remove();
            
            // Update friend counts
            await this.updateFriendCount(currentUser.uid);
            await this.updateFriendCount(fromUid);
            
            console.log('Friend request accepted successfully!');
            if (window.ui) ui.notify(`You and ${fromName} are now friends! 🎉`, 'success');
            
            // Show a celebration effect
            this.showFriendCelebration(fromName);
        } catch (error) {
            console.error('Accept friend error:', error);
            if (window.ui) ui.notify('Failed to accept: ' + error.message, 'error');
        }
    }
    
    showFriendCelebration(friendName) {
        // Create celebration overlay
        const celebration = document.createElement('div');
        celebration.className = 'friend-celebration';
        celebration.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-emoji">🎉</div>
                <h3>New Friend!</h3>
                <p>You and ${this.escapeHtml(friendName)} are now friends!</p>
            </div>
        `;
        document.body.appendChild(celebration);
        
        // Remove after animation
        setTimeout(() => celebration.remove(), 3000);
    }
    
    async updateFriendCount(uid) {
        try {
            const snapshot = await this.db.ref(`friends/${uid}`).once('value');
            const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
            await this.db.ref(`userProfiles/${uid}/friendCount`).set(count);
        } catch (error) {
            console.error('Update friend count error:', error);
        }
    }
    
    async declineFriendRequest(requestId) {
        const currentUser = this.auth.currentUser;
        if (!currentUser) return;
        
        try {
            await this.db.ref(`friendRequests/${currentUser.uid}/${requestId}`).remove();
            
            const notif = document.getElementById(`friend-notif-${requestId}`);
            if (notif) notif.remove();
        } catch (error) {
            console.error('Decline friend error:', error);
        }
    }
    
    // Listen for new followers
    listenForNewFollowers(user) {
        if (!user) return;
        
        let initialLoad = true;
        
        // Listen for follower count changes
        this.db.ref(`followers/${user.uid}`).on('value', (snapshot) => {
            const followers = snapshot.exists() ? snapshot.val() : {};
            const count = Object.keys(followers).length;
            
            // Update badge
            this.updateFollowerBadge(count);
            
            // Save to profile
            this.db.ref(`userProfiles/${user.uid}/followers`).set(count);
        });
        
        // Listen for new followers (for notifications)
        this.db.ref(`followers/${user.uid}`).on('child_added', (snapshot) => {
            if (initialLoad) return; // Don't notify on initial load
            
            const follower = snapshot.val();
            if (follower) {
                // Show notification
                if (window.ui) ui.notify(`${follower.name} started following you! 💖`, 'success');
                
                // Show follower notification popup
                this.showNewFollowerNotification(follower.name);
            }
        });
        
        // Mark initial load as complete after a short delay
        setTimeout(() => { initialLoad = false; }, 2000);
    }
    
    updateFollowerBadge(count) {
        const badge = document.getElementById('follower-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }
    
    showNewFollowerNotification(followerName) {
        const notif = document.createElement('div');
        notif.className = 'new-follower-notif';
        notif.innerHTML = `
            <i class="ph-fill ph-heart"></i>
            <span><strong>${this.escapeHtml(followerName)}</strong> is now following you!</span>
        `;
        document.body.appendChild(notif);
        
        setTimeout(() => notif.remove(), 4000);
    }
    
    async updateFollowerCount(uid) {
        try {
            const snapshot = await this.db.ref(`followers/${uid}`).once('value');
            const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
            
            await this.db.ref(`userProfiles/${uid}/followers`).set(count);
            
            // Update badge if it's the current user
            if (this.auth.currentUser && uid === this.auth.currentUser.uid) {
                this.updateFollowerBadge(count);
            }
        } catch (error) {
            console.error('Update follower count error:', error);
        }
    }
}

// Create global instance
window.chatSystem = new ChatSystem();
export default window.chatSystem;
