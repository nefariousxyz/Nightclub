// Admin Panel System
// Access with: Ctrl+Shift+A (or Cmd+Shift+A on Mac) or navigate to /admin

class AdminPanel {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isAdmin = false;
        this.adminUids = []; // Will be loaded from Firebase
        this.adminEmails = []; // Emails of admins
        this.initialized = false;
        
        // Predefined admin emails (always have access)
        this.predefinedAdmins = [
            'test@test.com'
        ];
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            // Check if Firebase is initialized
            if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
                console.warn('Firebase not ready for admin system');
                setTimeout(() => this.init(), 2000);
                return;
            }
            
            this.db = firebase.database();
            this.auth = firebase.auth();
            
            // Load admin list
            await this.loadAdminList();
            
            // Check if current user is admin
            this.auth.onAuthStateChanged((user) => {
                if (user) {
                    this.checkAdminStatus(user);
                }
            });
            
            // Add keyboard shortcut
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
                    e.preventDefault();
                    this.togglePanel();
                }
            });
            
            // Check for /admin URL route
            this.checkUrlRoute();
            
            // Listen for hash changes
            window.addEventListener('hashchange', () => this.checkUrlRoute());
            
            this.initialized = true;
            console.log('🔐 Admin panel initialized');
        } catch (error) {
            console.error('Admin init error:', error);
        }
    }
    
    checkUrlRoute() {
        const hash = window.location.hash;
        const path = window.location.pathname;
        
        // Check if URL contains /admin or #admin
        if (hash === '#admin' || hash === '#/admin' || path.endsWith('/admin')) {
            // Wait for auth to be ready
            const checkAuth = setInterval(() => {
                if (this.auth?.currentUser) {
                    clearInterval(checkAuth);
                    if (this.isAdmin) {
                        this.togglePanel();
                    } else {
                        if (window.ui) ui.notify('Admin access required', 'error');
                    }
                }
            }, 500);
            
            // Timeout after 5 seconds
            setTimeout(() => clearInterval(checkAuth), 5000);
        }
    }
    
    async loadAdminList() {
        try {
            const snapshot = await this.db.ref('admins').once('value');
            if (snapshot.exists()) {
                const admins = snapshot.val();
                this.adminUids = Object.keys(admins);
                this.adminEmails = Object.values(admins).map(a => a.email?.toLowerCase());
            } else {
                console.log('No admins found - predefined admins will have access');
            }
        } catch (error) {
            // Permission denied - use predefined admins only
            console.warn('Could not load admin list (permission denied). Using predefined admins only.');
            this.adminUids = [];
            this.adminEmails = [...this.predefinedAdmins];
        }
    }
    
    async checkAdminStatus(user) {
        const userEmail = user.email?.toLowerCase();
        
        // ONLY predefined admins have access - remove auto-admin for first user
        if (this.predefinedAdmins.includes(userEmail)) {
            this.isAdmin = true;
            try {
                await this.db.ref(`admins/${user.uid}`).set({
                    email: user.email,
                    addedAt: firebase.database.ServerValue.TIMESTAMP,
                    role: 'superadmin',
                    predefined: true
                });
            } catch (e) {
                console.warn('Could not save admin status');
            }
            console.log('🔐 Predefined admin access granted:', userEmail);
        } else {
            // Check if user is in admin list by UID
            this.isAdmin = this.adminUids.includes(user.uid);
        }
        
        if (this.isAdmin) {
            console.log('🔐 Admin access granted for:', userEmail);
        }
    }
    
    togglePanel() {
        if (!this.isAdmin) {
            if (window.ui) ui.notify('Access denied - Admin only', 'error');
            return;
        }
        
        const existing = document.getElementById('admin-panel');
        if (existing) {
            existing.remove();
            return;
        }
        
        this.createPanel();
        this.loadDashboardStats();
    }
    
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'admin-panel';
        panel.className = 'admin-panel';
        panel.innerHTML = `
            <div class="admin-header">
                <div class="admin-title">
                    <i class="ph-fill ph-shield-star"></i>
                    <span>Admin Panel</span>
                </div>
                <button class="admin-close" onclick="adminPanel.togglePanel()">
                    <i class="ph-bold ph-x"></i>
                </button>
            </div>
            
            <div class="admin-tabs">
                <button class="admin-tab active" data-tab="dashboard" onclick="adminPanel.switchTab('dashboard')">
                    <i class="ph-fill ph-chart-pie"></i> Dashboard
                </button>
                <button class="admin-tab" data-tab="users" onclick="adminPanel.switchTab('users')">
                    <i class="ph-fill ph-users"></i> Users
                </button>
                <button class="admin-tab" data-tab="chat" onclick="adminPanel.switchTab('chat')">
                    <i class="ph-fill ph-chat-circle"></i> Chat
                </button>
                <button class="admin-tab" data-tab="broadcast" onclick="adminPanel.switchTab('broadcast')">
                    <i class="ph-fill ph-megaphone"></i> Broadcast
                </button>
                <button class="admin-tab" data-tab="settings" onclick="adminPanel.switchTab('settings')">
                    <i class="ph-fill ph-gear"></i> Settings
                </button>
            </div>
            
            <div class="admin-content">
                <!-- Dashboard Tab -->
                <div class="admin-tab-content active" id="tab-dashboard">
                    <div class="admin-stats-grid">
                        <div class="admin-stat-card">
                            <i class="ph-fill ph-users"></i>
                            <div class="stat-info">
                                <span class="stat-value" id="stat-total-users">--</span>
                                <span class="stat-label">Total Users</span>
                            </div>
                        </div>
                        <div class="admin-stat-card">
                            <i class="ph-fill ph-user-check"></i>
                            <div class="stat-info">
                                <span class="stat-value" id="stat-online-users">--</span>
                                <span class="stat-label">Online Now</span>
                            </div>
                        </div>
                        <div class="admin-stat-card">
                            <i class="ph-fill ph-chat-circle-dots"></i>
                            <div class="stat-info">
                                <span class="stat-value" id="stat-chat-messages">--</span>
                                <span class="stat-label">Chat Messages</span>
                            </div>
                        </div>
                        <div class="admin-stat-card">
                            <i class="ph-fill ph-buildings"></i>
                            <div class="stat-info">
                                <span class="stat-value" id="stat-total-clubs">--</span>
                                <span class="stat-label">Clubs Created</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="admin-section">
                        <h3><i class="ph-fill ph-clock"></i> Recent Activity</h3>
                        <div class="activity-list" id="activity-list">
                            <div class="activity-loading">Loading...</div>
                        </div>
                    </div>
                </div>
                
                <!-- Users Tab -->
                <div class="admin-tab-content" id="tab-users">
                    <div class="admin-search">
                        <i class="ph-bold ph-magnifying-glass"></i>
                        <input type="text" id="user-search" placeholder="Search users..." oninput="adminPanel.searchUsers(this.value)">
                    </div>
                    <div class="users-list" id="users-list">
                        <div class="activity-loading">Loading users...</div>
                    </div>
                </div>
                
                <!-- Chat Tab -->
                <div class="admin-tab-content" id="tab-chat">
                    <div class="chat-mod-header">
                        <h3><i class="ph-fill ph-chat-circle"></i> Chat Moderation</h3>
                        <button class="admin-btn danger" onclick="adminPanel.clearAllChat()">
                            <i class="ph-fill ph-trash"></i> Clear All Chat
                        </button>
                    </div>
                    <div class="chat-messages-list" id="admin-chat-list">
                        <div class="activity-loading">Loading messages...</div>
                    </div>
                </div>
                
                <!-- Broadcast Tab -->
                <div class="admin-tab-content" id="tab-broadcast">
                    <div class="broadcast-section">
                        <h3><i class="ph-fill ph-megaphone"></i> Send Announcement</h3>
                        <div class="broadcast-form">
                            <select id="broadcast-type">
                                <option value="info">ℹ️ Info</option>
                                <option value="success">✅ Success</option>
                                <option value="warning">⚠️ Warning</option>
                                <option value="event">🎉 Event</option>
                            </select>
                            <input type="text" id="broadcast-title" placeholder="Title (optional)">
                            <textarea id="broadcast-message" placeholder="Enter announcement message..." rows="3"></textarea>
                            <button class="admin-btn primary" onclick="adminPanel.sendBroadcast()">
                                <i class="ph-fill ph-paper-plane-tilt"></i> Send to All
                            </button>
                        </div>
                    </div>
                    
                    <div class="broadcast-section">
                        <h3><i class="ph-fill ph-clock"></i> Broadcast History</h3>
                        <div class="broadcast-history" id="broadcast-history">
                            <div class="activity-loading">Loading history...</div>
                        </div>
                    </div>
                </div>
                
                <!-- Settings Tab -->
                <div class="admin-tab-content" id="tab-settings">
                    <div class="settings-section">
                        <h3><i class="ph-fill ph-gear"></i> Game Settings</h3>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="setting-maintenance" onchange="adminPanel.toggleMaintenance(this.checked)">
                                <span>Maintenance Mode</span>
                            </label>
                            <p class="setting-desc">Prevents new logins and shows maintenance message</p>
                        </div>
                        <div class="setting-item">
                            <label>
                                <input type="checkbox" id="setting-chat-enabled" checked onchange="adminPanel.toggleChat(this.checked)">
                                <span>Global Chat Enabled</span>
                            </label>
                            <p class="setting-desc">Enable or disable the global chat system</p>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3><i class="ph-fill ph-shield-star"></i> Admin Management</h3>
                        <div class="admin-list" id="admin-list">
                            <!-- Populated by JS -->
                        </div>
                        <div class="add-admin-form">
                            <input type="text" id="new-admin-uid" placeholder="User UID to add as admin">
                            <button class="admin-btn" onclick="adminPanel.addAdmin()">
                                <i class="ph-fill ph-plus"></i> Add Admin
                            </button>
                        </div>
                    </div>
                    
                    <div class="settings-section danger-zone">
                        <h3><i class="ph-fill ph-warning"></i> Danger Zone</h3>
                        <button class="admin-btn danger" onclick="adminPanel.resetAllData()">
                            <i class="ph-fill ph-trash"></i> Reset All Game Data
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
        
        // Load tab data
        switch(tabName) {
            case 'users':
                this.loadUsers();
                break;
            case 'chat':
                this.loadChatMessages();
                break;
            case 'broadcast':
                this.loadBroadcastHistory();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }
    
    async loadDashboardStats() {
        try {
            // Total users
            const usersSnap = await this.db.ref('userProfiles').once('value');
            const totalUsers = usersSnap.exists() ? Object.keys(usersSnap.val()).length : 0;
            document.getElementById('stat-total-users').textContent = totalUsers;
            
            // Online users
            const onlineSnap = await this.db.ref('onlineUsers').once('value');
            const onlineUsers = onlineSnap.exists() ? Object.keys(onlineSnap.val()).length : 0;
            document.getElementById('stat-online-users').textContent = onlineUsers;
            
            // Chat messages
            const chatSnap = await this.db.ref('globalChat').once('value');
            const chatMessages = chatSnap.exists() ? Object.keys(chatSnap.val()).length : 0;
            document.getElementById('stat-chat-messages').textContent = chatMessages;
            
            // Clubs
            const clubsSnap = await this.db.ref('clubs').once('value');
            const totalClubs = clubsSnap.exists() ? Object.keys(clubsSnap.val()).length : 0;
            document.getElementById('stat-total-clubs').textContent = totalClubs;
            
            // Load recent activity
            this.loadRecentActivity();
        } catch (error) {
            console.error('Load stats error:', error);
        }
    }
    
    async loadRecentActivity() {
        try {
            const activityList = document.getElementById('activity-list');
            const chatSnap = await this.db.ref('globalChat').orderByChild('timestamp').limitToLast(10).once('value');
            
            if (!chatSnap.exists()) {
                activityList.innerHTML = '<div class="no-data">No recent activity</div>';
                return;
            }
            
            let html = '';
            const messages = [];
            chatSnap.forEach(child => {
                messages.push({ id: child.key, ...child.val() });
            });
            
            messages.reverse().forEach(msg => {
                const time = new Date(msg.timestamp).toLocaleTimeString();
                html += `
                    <div class="activity-item">
                        <div class="activity-avatar">${msg.avatar || '👤'}</div>
                        <div class="activity-info">
                            <strong>${this.escapeHtml(msg.name)}</strong>
                            <span>${this.escapeHtml(msg.text)}</span>
                        </div>
                        <span class="activity-time">${time}</span>
                    </div>
                `;
            });
            
            activityList.innerHTML = html;
        } catch (error) {
            console.error('Load activity error:', error);
        }
    }
    
    async loadUsers() {
        try {
            const usersList = document.getElementById('users-list');
            const usersSnap = await this.db.ref('userProfiles').once('value');
            
            if (!usersSnap.exists()) {
                usersList.innerHTML = '<div class="no-data">No users found</div>';
                return;
            }
            
            let html = '';
            usersSnap.forEach(child => {
                const user = child.val();
                const uid = child.key;
                const isOnline = this.isUserOnline(uid);
                
                html += `
                    <div class="user-item" data-uid="${uid}">
                        <div class="user-avatar">${user.avatar || '👤'}</div>
                        <div class="user-info">
                            <strong>${this.escapeHtml(user.name || 'Unknown')}</strong>
                            <span>Level ${user.level || 1} • ${user.clubName || 'No club'}</span>
                            <small class="user-uid">${uid}</small>
                        </div>
                        <div class="user-status ${isOnline ? 'online' : 'offline'}">
                            ${isOnline ? '🟢 Online' : '⚫ Offline'}
                        </div>
                        <div class="user-actions">
                            <button class="admin-btn small" onclick="adminPanel.viewUser('${uid}')" title="View">
                                <i class="ph-fill ph-eye"></i>
                            </button>
                            <button class="admin-btn small danger" onclick="adminPanel.banUser('${uid}', '${this.escapeHtml(user.name)}')" title="Ban">
                                <i class="ph-fill ph-prohibit"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            usersList.innerHTML = html;
        } catch (error) {
            console.error('Load users error:', error);
        }
    }
    
    isUserOnline(uid) {
        return window.chatSystem?.onlineUsers?.[uid] !== undefined;
    }
    
    searchUsers(query) {
        const items = document.querySelectorAll('.user-item');
        query = query.toLowerCase();
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
        });
    }
    
    async viewUser(uid) {
        // Use chat system's view profile
        if (window.chatSystem) {
            const userSnap = await this.db.ref(`userProfiles/${uid}`).once('value');
            const user = userSnap.val() || {};
            window.chatSystem.selectedUser = { uid, name: user.name || 'Unknown' };
            window.chatSystem.viewProfile();
        }
    }
    
    async banUser(uid, name) {
        if (!confirm(`Are you sure you want to ban ${name}?`)) return;
        
        try {
            await this.db.ref(`bannedUsers/${uid}`).set({
                name: name,
                bannedAt: firebase.database.ServerValue.TIMESTAMP,
                bannedBy: this.auth.currentUser.uid
            });
            
            // Remove from online users
            await this.db.ref(`onlineUsers/${uid}`).remove();
            
            if (window.ui) ui.notify(`${name} has been banned`, 'success');
            this.loadUsers();
        } catch (error) {
            console.error('Ban user error:', error);
            if (window.ui) ui.notify('Failed to ban user', 'error');
        }
    }
    
    async loadChatMessages() {
        try {
            const chatList = document.getElementById('admin-chat-list');
            const chatSnap = await this.db.ref('globalChat').orderByChild('timestamp').limitToLast(50).once('value');
            
            if (!chatSnap.exists()) {
                chatList.innerHTML = '<div class="no-data">No messages</div>';
                return;
            }
            
            let html = '';
            const messages = [];
            chatSnap.forEach(child => {
                messages.push({ id: child.key, ...child.val() });
            });
            
            messages.reverse().forEach(msg => {
                const time = new Date(msg.timestamp).toLocaleString();
                html += `
                    <div class="chat-mod-item">
                        <div class="chat-mod-avatar">${msg.avatar || '👤'}</div>
                        <div class="chat-mod-content">
                            <div class="chat-mod-header">
                                <strong>${this.escapeHtml(msg.name)}</strong>
                                <span class="chat-mod-time">${time}</span>
                            </div>
                            <p>${this.escapeHtml(msg.text)}</p>
                            <small class="chat-mod-uid">UID: ${msg.uid}</small>
                        </div>
                        <button class="admin-btn small danger" onclick="adminPanel.deleteMessage('${msg.id}')" title="Delete">
                            <i class="ph-fill ph-trash"></i>
                        </button>
                    </div>
                `;
            });
            
            chatList.innerHTML = html;
        } catch (error) {
            console.error('Load chat error:', error);
        }
    }
    
    async deleteMessage(messageId) {
        try {
            await this.db.ref(`globalChat/${messageId}`).remove();
            if (window.ui) ui.notify('Message deleted', 'success');
            this.loadChatMessages();
        } catch (error) {
            console.error('Delete message error:', error);
        }
    }
    
    async clearAllChat() {
        if (!confirm('Are you sure you want to delete ALL chat messages? This cannot be undone!')) return;
        
        try {
            await this.db.ref('globalChat').remove();
            if (window.ui) ui.notify('All chat messages deleted', 'success');
            this.loadChatMessages();
        } catch (error) {
            console.error('Clear chat error:', error);
        }
    }
    
    async sendBroadcast() {
        const type = document.getElementById('broadcast-type').value;
        const title = document.getElementById('broadcast-title').value.trim();
        const message = document.getElementById('broadcast-message').value.trim();
        
        if (!message) {
            if (window.ui) ui.notify('Please enter a message', 'error');
            return;
        }
        
        try {
            // Save broadcast
            await this.db.ref('broadcasts').push({
                type,
                title,
                message,
                sentAt: firebase.database.ServerValue.TIMESTAMP,
                sentBy: this.auth.currentUser.uid
            });
            
            // Send as system message in chat
            await this.db.ref('globalChat').push({
                name: '📢 SYSTEM',
                text: title ? `[${title}] ${message}` : message,
                uid: 'system',
                avatar: type === 'event' ? '🎉' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                isSystem: true
            });
            
            // Clear form
            document.getElementById('broadcast-title').value = '';
            document.getElementById('broadcast-message').value = '';
            
            if (window.ui) ui.notify('Broadcast sent!', 'success');
            this.loadBroadcastHistory();
        } catch (error) {
            console.error('Send broadcast error:', error);
            if (window.ui) ui.notify('Failed to send broadcast', 'error');
        }
    }
    
    async loadBroadcastHistory() {
        try {
            const historyEl = document.getElementById('broadcast-history');
            const snap = await this.db.ref('broadcasts').orderByChild('sentAt').limitToLast(10).once('value');
            
            if (!snap.exists()) {
                historyEl.innerHTML = '<div class="no-data">No broadcasts yet</div>';
                return;
            }
            
            let html = '';
            const broadcasts = [];
            snap.forEach(child => {
                broadcasts.push({ id: child.key, ...child.val() });
            });
            
            broadcasts.reverse().forEach(b => {
                const time = new Date(b.sentAt).toLocaleString();
                const typeIcons = { info: 'ℹ️', success: '✅', warning: '⚠️', event: '🎉' };
                html += `
                    <div class="broadcast-item">
                        <span class="broadcast-icon">${typeIcons[b.type] || 'ℹ️'}</span>
                        <div class="broadcast-content">
                            ${b.title ? `<strong>${this.escapeHtml(b.title)}</strong>` : ''}
                            <p>${this.escapeHtml(b.message)}</p>
                            <small>${time}</small>
                        </div>
                    </div>
                `;
            });
            
            historyEl.innerHTML = html;
        } catch (error) {
            console.error('Load broadcast history error:', error);
        }
    }
    
    async loadSettings() {
        try {
            // Load maintenance mode
            const maintenanceSnap = await this.db.ref('settings/maintenance').once('value');
            document.getElementById('setting-maintenance').checked = maintenanceSnap.val() === true;
            
            // Load chat enabled
            const chatSnap = await this.db.ref('settings/chatEnabled').once('value');
            document.getElementById('setting-chat-enabled').checked = chatSnap.val() !== false;
            
            // Load admin list
            this.loadAdminListUI();
        } catch (error) {
            console.error('Load settings error:', error);
        }
    }
    
    async loadAdminListUI() {
        try {
            const adminListEl = document.getElementById('admin-list');
            const snap = await this.db.ref('admins').once('value');
            
            if (!snap.exists()) {
                adminListEl.innerHTML = '<div class="no-data">No admins</div>';
                return;
            }
            
            let html = '';
            snap.forEach(child => {
                const admin = child.val();
                const uid = child.key;
                const isSelf = uid === this.auth.currentUser.uid;
                
                html += `
                    <div class="admin-item">
                        <div class="admin-item-info">
                            <strong>${this.escapeHtml(admin.email || 'Unknown')}</strong>
                            <span class="admin-role">${admin.role || 'admin'}</span>
                            <small>${uid}</small>
                        </div>
                        ${!isSelf ? `
                            <button class="admin-btn small danger" onclick="adminPanel.removeAdmin('${uid}')">
                                <i class="ph-fill ph-x"></i>
                            </button>
                        ` : '<span class="you-badge">You</span>'}
                    </div>
                `;
            });
            
            adminListEl.innerHTML = html;
        } catch (error) {
            console.error('Load admin list error:', error);
        }
    }
    
    async toggleMaintenance(enabled) {
        try {
            await this.db.ref('settings/maintenance').set(enabled);
            if (window.ui) ui.notify(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`, 'success');
        } catch (error) {
            console.error('Toggle maintenance error:', error);
        }
    }
    
    async toggleChat(enabled) {
        try {
            await this.db.ref('settings/chatEnabled').set(enabled);
            if (window.ui) ui.notify(`Chat ${enabled ? 'enabled' : 'disabled'}`, 'success');
        } catch (error) {
            console.error('Toggle chat error:', error);
        }
    }
    
    async addAdmin() {
        const uid = document.getElementById('new-admin-uid').value.trim();
        if (!uid) {
            if (window.ui) ui.notify('Please enter a UID', 'error');
            return;
        }
        
        try {
            // Get user info
            const userSnap = await this.db.ref(`userProfiles/${uid}`).once('value');
            const user = userSnap.val();
            
            await this.db.ref(`admins/${uid}`).set({
                email: user?.name || 'Unknown',
                addedAt: firebase.database.ServerValue.TIMESTAMP,
                addedBy: this.auth.currentUser.uid,
                role: 'admin'
            });
            
            document.getElementById('new-admin-uid').value = '';
            if (window.ui) ui.notify('Admin added', 'success');
            this.loadAdminListUI();
        } catch (error) {
            console.error('Add admin error:', error);
            if (window.ui) ui.notify('Failed to add admin', 'error');
        }
    }
    
    async removeAdmin(uid) {
        if (!confirm('Remove this admin?')) return;
        
        try {
            await this.db.ref(`admins/${uid}`).remove();
            if (window.ui) ui.notify('Admin removed', 'success');
            this.loadAdminListUI();
        } catch (error) {
            console.error('Remove admin error:', error);
        }
    }
    
    async resetAllData() {
        if (!confirm('⚠️ WARNING: This will delete ALL game data for ALL users! Type "RESET" to confirm.')) return;
        
        const confirmText = prompt('Type "RESET" to confirm:');
        if (confirmText !== 'RESET') {
            if (window.ui) ui.notify('Reset cancelled', 'info');
            return;
        }
        
        try {
            // This is very destructive - only superadmins should do this
            const adminSnap = await this.db.ref(`admins/${this.auth.currentUser.uid}`).once('value');
            if (adminSnap.val()?.role !== 'superadmin') {
                if (window.ui) ui.notify('Only superadmins can reset all data', 'error');
                return;
            }
            
            await this.db.ref('globalChat').remove();
            await this.db.ref('clubs').remove();
            await this.db.ref('userStats').remove();
            await this.db.ref('broadcasts').remove();
            
            if (window.ui) ui.notify('All game data has been reset', 'success');
        } catch (error) {
            console.error('Reset data error:', error);
            if (window.ui) ui.notify('Failed to reset data', 'error');
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
window.adminPanel = new AdminPanel();

// Initialize when Firebase is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Firebase
    const checkFirebase = setInterval(() => {
        if (typeof firebase !== 'undefined' && firebase.database) {
            clearInterval(checkFirebase);
            window.adminPanel.init();
        }
    }, 100);
});

export default window.adminPanel;
