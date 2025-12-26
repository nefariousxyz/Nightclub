// Admin Dashboard JavaScript
const firebaseConfig = {
    apiKey: "AIzaSyB9Bx0t7LIrhWiAGULGjhNh1BI-S6qrFC8",
    authDomain: "nightparty-city.firebaseapp.com",
    databaseURL: "https://nightparty-city-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "nightparty-city",
    storageBucket: "nightparty-city.firebasestorage.app",
    messagingSenderId: "816223229032",
    appId: "1:816223229032:web:63a3c47a2a8310109b57dd"
};

firebase.initializeApp(firebaseConfig);

class AdminDashboard {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.database();
        this.firestore = firebase.firestore();
        this.user = null;
        this.predefinedAdmins = ['test@test.com', 'admin@nightclub.com', 'franzyabiva@gmail.com'];
        this.currentPage = 'dashboard';
        this.users = [];
        this.clubs = [];
        this.chatRef = null;
        this.onlineRef = null;
        this.moderationRef = null;
        this.bannedUsers = {};
        this.cooldowns = {};
        this.warnings = {};
        this.chatMessages = []; // Store messages for real-time updates
        this.contentFilters = this.initContentFilters(); // AI content moderation
        this.autoModEnabled = false; // Auto-moderation toggle
        this.currentFilter = 'all'; // Message filter state
        this.init();
    }

    init() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.classList.remove('bg-indigo-500/10', 'text-indigo-400');
                    nav.classList.add('text-slate-400', 'hover:text-slate-200', 'hover:bg-white/5');
                });
                item.classList.remove('text-slate-400', 'hover:text-slate-200', 'hover:bg-white/5');
                item.classList.add('bg-indigo-500/10', 'text-indigo-400');
                this.navigate(item.dataset.page);
            });
        });

        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.login(e));

        this.auth.onAuthStateChanged((user) => this.handleAuth(user));
    }

    async handleAuth(user) {
        if (user) {
            const isAdmin = await this.checkAdmin(user);
            if (isAdmin) {
                this.user = user;
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('dashboard').classList.remove('opacity-0', 'pointer-events-none');
                const nameEl = document.getElementById('admin-name');
                if (nameEl) nameEl.textContent = user.displayName || user.email.split('@')[0];
                this.loadPage('dashboard');
                this.log('info', `Logged in: ${user.email}`);
            } else {
                this.showError('Access denied.');
                this.auth.signOut();
            }
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('dashboard').classList.add('opacity-0', 'pointer-events-none');
        }
    }

    async checkAdmin(user) {
        if (this.predefinedAdmins.includes(user.email?.toLowerCase())) return true;
        try {
            const doc = await this.firestore.collection('admins').doc(user.uid).get();
            if (doc.exists) return true;
            const snap = await this.db.ref(`admins/${user.uid}`).once('value');
            return snap.exists();
        } catch (e) { return false; }
    }

    async login(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            await this.auth.signInWithEmailAndPassword(email, password);
        } catch (err) { this.showError(err.message); }
    }

    logout() { this.auth.signOut(); }

    showError(msg) {
        const el = document.getElementById('login-error');
        if (el) { el.textContent = msg; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 5000); }
    }

    navigate(page) {
        this.currentPage = page;
        this.loadPage(page);
        // Log page navigation
        this.log('info', `Navigated to ${page} page`, { page });
    }

    loadPage(page) {
        const content = document.getElementById('main-content');
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = page.charAt(0).toUpperCase() + page.slice(1);

        if (page !== 'chat') {
            if (this.chatRef) this.chatRef.off();
            if (this.onlineRef) this.onlineRef.off();
        }

        if (page !== 'logs') {
            if (this.logsRealtimeRef) this.logsRealtimeRef.off();
        }

        switch (page) {
            case 'dashboard': this.renderDashboard(content); break;
            case 'users': this.renderUsers(content); break;
            case 'clubs': this.renderClubs(content); break;
            case 'chat': this.renderChat(content); break;
            case 'broadcast': this.renderBroadcast(content); break;
            case 'economy': this.renderEconomy(content); break;
            case 'anticheat': this.renderAnticheat(content); break;
            case 'shop': this.renderShopManager(content); break;
            case 'logs': this.renderLogs(content); break;
            case 'coupons': this.renderCoupons(content); break;
            case 'reports': this.renderReports(content); break;
            default: content.innerHTML = '<div class="text-center text-slate-500 mt-20">Module loading...</div>';
        }
    }

    // DASHBOARD
    async renderDashboard(el) {
        el.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="glass p-6 rounded-2xl border border-white/5"><div class="text-3xl font-bold text-white" id="s-users">--</div><div class="text-sm text-slate-400">Users</div></div>
                <div class="glass p-6 rounded-2xl border border-white/5"><div class="text-3xl font-bold text-white" id="s-online">--</div><div class="text-sm text-slate-400">Online</div></div>
                <div class="glass p-6 rounded-2xl border border-white/5"><div class="text-3xl font-bold text-white" id="s-msgs">--</div><div class="text-sm text-slate-400">Messages</div></div>
                <div class="glass p-6 rounded-2xl border border-white/5"><div class="text-3xl font-bold text-white" id="s-clubs">--</div><div class="text-sm text-slate-400">Clubs</div></div>
            </div>`;
        this.loadStats();
    }

    async loadStats() {
        const [online, msgs, clubs] = await Promise.all([
            this.db.ref('onlineUsers').once('value'),
            this.db.ref('globalChat').once('value'),
            this.db.ref('clubs').once('value')
        ]);
        let userCount = 0;
        try { const snap = await this.firestore.collection('users').get(); userCount = snap.size; } catch (e) { }

        document.getElementById('s-users').textContent = userCount;
        document.getElementById('s-online').textContent = online.exists() ? Object.keys(online.val()).length : 0;
        document.getElementById('s-msgs').textContent = msgs.exists() ? Object.keys(msgs.val()).length : 0;
        document.getElementById('s-clubs').textContent = clubs.exists() ? Object.keys(clubs.val()).length : 0;
    }

    // CHAT
    renderChat(el) {
        el.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
                <!-- Sidebar: Online Users -->
                <div class="glass rounded-2xl border border-white/5 p-4 flex flex-col h-full">
                    <h3 class="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                        <i class="ph-fill ph-users text-emerald-400"></i>
                        Online (<span id="chat-online-count">0</span>)
                    </h3>
                    <div id="chat-online-list" class="flex-1 overflow-y-auto custom-scroll space-y-1"></div>
                </div>
                
                <!-- Chat Area -->
                <div class="lg:col-span-2 glass rounded-2xl border border-white/5 p-4 flex flex-col h-full">
                    <div class="flex justify-between items-center mb-3 shrink-0">
                        <div class="flex items-center gap-2">
                            <h3 class="font-bold text-white text-sm flex items-center gap-2">
                                <i class="ph-fill ph-chat-circle-text text-indigo-400"></i> Live Feed
                            </h3>
                            <span class="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Live
                            </span>
                        </div>
                        <button onclick="admin.clearAllChat()" class="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded-lg transition-colors border border-red-500/20">
                            <i class="ph-bold ph-trash"></i> Clear All
                        </button>
                    </div>
                    <div id="chat-box" class="flex-1 space-y-2 pr-2 bg-slate-900/40 rounded-xl p-3 border border-white/5 mb-3" style="overflow-y: scroll; max-height: calc(100vh - 20rem);"></div>
                    <div class="shrink-0 flex gap-2 bg-slate-800/50 p-2 rounded-xl border border-white/5">
                        <span class="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 self-center">ADMIN</span>
                        <input type="text" id="admin-msg-input" placeholder="Send admin message..." class="flex-1 bg-transparent text-white text-sm px-2 outline-none">
                        <button onclick="admin.sendAdminMessage()" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors">
                            <i class="ph-fill ph-paper-plane-tilt"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Moderation Panel -->
                <div class="glass rounded-2xl border border-white/5 p-4 flex flex-col h-full">
                    <h3 class="font-bold text-white mb-3 text-sm flex items-center gap-2">
                        <i class="ph-fill ph-shield-warning text-amber-400"></i> Moderation
                    </h3>
                    <div class="space-y-3 flex-1 overflow-y-auto custom-scroll">
                        <!-- AI Detection Stats -->
                        <div class="bg-slate-800/50 rounded-lg p-2 border border-white/5">
                            <h4 class="text-[10px] text-slate-400 mb-2 flex items-center gap-1"><i class="ph-fill ph-robot text-cyan-400"></i> AI Detection</h4>
                            <div class="grid grid-cols-2 gap-1 text-[10px]">
                                <div class="flex items-center gap-1"><span class="text-red-400">🤬</span> Profanity: <span id="flag-profanity" class="text-white font-bold">0</span></div>
                                <div class="flex items-center gap-1"><span class="text-purple-400">⚠️</span> Scam: <span id="flag-scam" class="text-white font-bold">0</span></div>
                                <div class="flex items-center gap-1"><span class="text-pink-400">☠️</span> Toxic: <span id="flag-toxic" class="text-white font-bold">0</span></div>
                                <div class="flex items-center gap-1"><span class="text-orange-400">📧</span> Spam: <span id="flag-spam" class="text-white font-bold">0</span></div>
                            </div>
                        </div>
                        
                        <!-- Auto-Moderation Toggle -->
                        <div class="bg-slate-800/50 rounded-lg p-2 border border-white/5">
                            <div class="flex items-center justify-between mb-2">
                                <h4 class="text-[10px] text-slate-400 flex items-center gap-1"><i class="ph-fill ph-lightning text-yellow-400"></i> Auto-Mod</h4>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="auto-mod-toggle" class="sr-only peer" onchange="admin.toggleAutoMod()">
                                    <div class="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                            <div class="text-[9px] text-slate-500">Auto-delete & warn flagged messages</div>
                        </div>
                        
                        <!-- Filter Buttons -->
                        <div class="flex flex-wrap gap-1">
                            <button onclick="admin.filterMessages('all')" class="filter-btn active text-[9px] px-2 py-1 rounded bg-slate-700 text-white" data-filter="all">All</button>
                            <button onclick="admin.filterMessages('flagged')" class="filter-btn text-[9px] px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700" data-filter="flagged">🚩 Flagged</button>
                            <button onclick="admin.filterMessages('clean')" class="filter-btn text-[9px] px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700" data-filter="clean">✓ Clean</button>
                        </div>
                        
                        <!-- Banned Users -->
                        <div>
                            <h4 class="text-xs text-slate-400 mb-2 flex items-center gap-1"><i class="ph-fill ph-prohibit text-red-400"></i> Banned (<span id="banned-count">0</span>)</h4>
                            <div id="banned-list" class="space-y-1 max-h-24 overflow-y-auto custom-scroll"></div>
                        </div>
                        <!-- Cooldowns -->
                        <div>
                            <h4 class="text-xs text-slate-400 mb-2 flex items-center gap-1"><i class="ph-fill ph-clock text-orange-400"></i> Cooldowns (<span id="cooldown-count">0</span>)</h4>
                            <div id="cooldown-list" class="space-y-1 max-h-24 overflow-y-auto custom-scroll"></div>
                        </div>
                        <!-- Recent Warnings -->
                        <div>
                            <h4 class="text-xs text-slate-400 mb-2 flex items-center gap-1"><i class="ph-fill ph-warning text-yellow-400"></i> Warnings (<span id="warning-count">0</span>)</h4>
                            <div id="warning-list" class="space-y-1 max-h-24 overflow-y-auto custom-scroll"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- User Action Modal -->
            <div id="mod-modal" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 hidden flex items-center justify-center">
                <div class="glass rounded-2xl border border-white/10 p-6 max-w-md w-full mx-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-white" id="mod-modal-title">Moderate User</h3>
                        <button onclick="admin.closeModModal()" class="text-slate-400 hover:text-white"><i class="ph-bold ph-x"></i></button>
                    </div>
                    <div id="mod-modal-content"></div>
                </div>
            </div>`;

        this.loadModerationData();
        this.loadChatMessages();
        this.loadChatOnlineUsers();
        document.getElementById('admin-msg-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendAdminMessage(); });
    }

    loadModerationData() {
        // Load banned users
        this.db.ref('moderation/banned').on('value', (snap) => {
            this.bannedUsers = snap.val() || {};
            this.renderBannedList();
        });
        // Load cooldowns
        this.db.ref('moderation/cooldowns').on('value', (snap) => {
            this.cooldowns = snap.val() || {};
            this.renderCooldownList();
        });
        // Load warnings
        this.db.ref('moderation/warnings').on('value', (snap) => {
            this.warnings = snap.val() || {};
            this.renderWarningList();
        });
    }

    renderBannedList() {
        const list = document.getElementById('banned-list');
        const count = document.getElementById('banned-count');
        if (!list) return;
        const entries = Object.entries(this.bannedUsers);
        count.textContent = entries.length;
        if (entries.length === 0) {
            list.innerHTML = '<div class="text-xs text-slate-500 italic">No banned users</div>';
            return;
        }
        list.innerHTML = entries.map(([uid, data]) => `
            <div class="flex items-center justify-between bg-red-500/10 rounded-lg px-2 py-1.5 border border-red-500/20">
                <span class="text-xs text-red-300 truncate flex-1">${this.esc(data.name)}</span>
                <button onclick="admin.unbanUser('${uid}')" class="text-[10px] text-emerald-400 hover:text-emerald-300 ml-2" title="Unban">
                    <i class="ph-bold ph-check"></i>
                </button>
            </div>
        `).join('');
    }

    renderCooldownList() {
        const list = document.getElementById('cooldown-list');
        const count = document.getElementById('cooldown-count');
        if (!list) return;
        const now = Date.now();
        // Filter out expired cooldowns
        const active = Object.entries(this.cooldowns).filter(([uid, data]) => data.until > now);
        count.textContent = active.length;
        if (active.length === 0) {
            list.innerHTML = '<div class="text-xs text-slate-500 italic">No active cooldowns</div>';
            return;
        }
        list.innerHTML = active.map(([uid, data]) => {
            const remaining = Math.ceil((data.until - now) / 60000);
            return `
                <div class="flex items-center justify-between bg-orange-500/10 rounded-lg px-2 py-1.5 border border-orange-500/20">
                    <span class="text-xs text-orange-300 truncate flex-1">${this.esc(data.name)}</span>
                    <span class="text-[10px] text-orange-400 ml-1">${remaining}m</span>
                    <button onclick="admin.removeCooldown('${uid}')" class="text-[10px] text-emerald-400 hover:text-emerald-300 ml-2" title="Remove">
                        <i class="ph-bold ph-x"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    renderWarningList() {
        const list = document.getElementById('warning-list');
        const count = document.getElementById('warning-count');
        if (!list) return;
        const entries = Object.entries(this.warnings);
        count.textContent = entries.length;
        if (entries.length === 0) {
            list.innerHTML = '<div class="text-xs text-slate-500 italic">No warnings</div>';
            return;
        }
        list.innerHTML = entries.slice(-10).reverse().map(([uid, data]) => `
            <div class="flex items-center justify-between bg-yellow-500/10 rounded-lg px-2 py-1.5 border border-yellow-500/20">
                <span class="text-xs text-yellow-300 truncate flex-1">${this.esc(data.name)}</span>
                <span class="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded">${data.count || 1}x</span>
            </div>
        `).join('');
    }

    loadChatOnlineUsers() {
        if (this.onlineRef) this.onlineRef.off();
        this.onlineRef = this.db.ref('onlineUsers');
        this.onlineRef.on('value', (snap) => {
            const users = snap.val() || {};
            const countEl = document.getElementById('chat-online-count');
            const listEl = document.getElementById('chat-online-list');
            if (!countEl || !listEl) return;

            const entries = Object.entries(users);
            countEl.textContent = entries.length;

            if (entries.length === 0) {
                listEl.innerHTML = '<div class="text-xs text-slate-500 italic text-center py-4">No users online</div>';
                return;
            }

            listEl.innerHTML = entries.map(([uid, u]) => {
                const isBanned = this.bannedUsers[uid];
                const isCooled = this.cooldowns[uid] && this.cooldowns[uid].until > Date.now();
                return `
                    <div class="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors" onclick="admin.showModerateModal('${uid}', '${this.esc(u.name)}')">
                        <div class="w-2 h-2 ${isBanned ? 'bg-red-500' : isCooled ? 'bg-orange-500' : 'bg-emerald-500'} rounded-full"></div>
                        <span class="text-xs text-white truncate flex-1">${this.esc(u.name)}</span>
                        ${isBanned ? '<span class="text-[9px] bg-red-500/20 text-red-400 px-1 rounded">BAN</span>' : ''}
                        ${isCooled ? '<span class="text-[9px] bg-orange-500/20 text-orange-400 px-1 rounded">CD</span>' : ''}
                        <i class="ph-bold ph-dots-three-vertical text-slate-500 group-hover:text-slate-300 text-xs"></i>
                    </div>
                `;
            }).join('');
        });
    }

    loadChatMessages() {
        if (this.chatRef) this.chatRef.off();
        this.chatMessages = [];

        const box = document.getElementById('chat-box');
        if (box) box.innerHTML = '<div class="text-center text-slate-500 text-xs py-10"><div class="spinner-sm"></div> Loading messages...</div>';

        // Use on('value') for initial load, then child_added for real-time
        this.chatRef = this.db.ref('globalChat').orderByChild('timestamp').limitToLast(100);

        this.chatRef.on('value', (snap) => {
            const box = document.getElementById('chat-box');
            if (!box) return;

            this.chatMessages = [];
            snap.forEach(c => {
                const msg = { id: c.key, ...c.val() };
                // Run AI moderation check
                msg.flags = this.analyzeContent(msg.text);
                this.chatMessages.push(msg);
            });

            this.renderChatMessages();
        });
    }

    renderChatMessages() {
        const box = document.getElementById('chat-box');
        if (!box) return;

        if (this.chatMessages.length === 0) {
            box.innerHTML = '<div class="text-center text-slate-500 text-xs py-10">No messages yet</div>';
            return;
        }

        box.innerHTML = this.chatMessages.map(m => {
            const isAdmin = m.isAdmin || m.uid === 'admin' || m.uid === 'system';
            const isBanned = this.bannedUsers[m.uid];
            const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const flags = m.flags || {};
            const hasFlags = flags.profanity || flags.spam || flags.scam || flags.toxic;

            // Determine flag badges
            let flagBadges = '';
            if (flags.profanity) flagBadges += '<span class="text-[9px] bg-red-500/20 text-red-400 px-1 rounded" title="Profanity detected">🤬</span>';
            if (flags.spam) flagBadges += '<span class="text-[9px] bg-orange-500/20 text-orange-400 px-1 rounded" title="Spam detected">📧</span>';
            if (flags.scam) flagBadges += '<span class="text-[9px] bg-purple-500/20 text-purple-400 px-1 rounded" title="Potential scam">⚠️</span>';
            if (flags.toxic) flagBadges += '<span class="text-[9px] bg-pink-500/20 text-pink-400 px-1 rounded" title="Toxic content">☠️</span>';
            if (flags.caps) flagBadges += '<span class="text-[9px] bg-yellow-500/20 text-yellow-400 px-1 rounded" title="Excessive caps">📢</span>';

            const borderColor = hasFlags ? 'border-red-500/30' : (isAdmin ? 'border-indigo-500/30' : 'border-white/5');
            const bgColor = hasFlags ? 'bg-red-900/20' : (isAdmin ? 'bg-indigo-600/20' : 'bg-slate-800/60');

            return `
                <div class="group flex ${isAdmin ? 'justify-end' : 'justify-start'} animate-fade-in" data-msg-id="${m.id}">
                    <div class="max-w-[80%] rounded-xl p-2.5 ${bgColor} border ${borderColor} relative">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <span class="text-[11px] font-semibold ${isAdmin ? 'text-yellow-400' : 'text-indigo-300'}">
                                ${isAdmin ? '🛡️ ' : ''}${this.esc(m.name || 'Unknown')}
                            </span>
                            ${isBanned ? '<span class="text-[9px] bg-red-500/20 text-red-400 px-1 rounded">BANNED</span>' : ''}
                            ${flagBadges}
                            <span class="text-[10px] text-slate-500">${time}</span>
                        </div>
                        <p class="text-sm text-slate-200 break-words ${hasFlags ? 'text-red-300' : ''}">${this.esc(m.text || '')}</p>
                        ${!isAdmin ? `
                            <div class="absolute -right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button onclick="event.stopPropagation(); admin.deleteMessage('${m.id}')" class="w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded flex items-center justify-center text-white text-xs" title="Delete">
                                    <i class="ph-bold ph-trash"></i>
                                </button>
                                <button onclick="event.stopPropagation(); admin.showModerateModal('${m.uid}', '${this.esc(m.name || 'User')}')" class="w-6 h-6 bg-amber-500/80 hover:bg-amber-500 rounded flex items-center justify-center text-white text-xs" title="Moderate">
                                    <i class="ph-bold ph-shield-warning"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        box.scrollTop = box.scrollHeight;

        // Update AI detection stats
        this.updateFlagStats();
    }

    updateFlagStats() {
        let profanity = 0, scam = 0, toxic = 0, spam = 0;
        for (const m of this.chatMessages) {
            if (m.flags?.profanity) profanity++;
            if (m.flags?.scam) scam++;
            if (m.flags?.toxic) toxic++;
            if (m.flags?.spam) spam++;
        }
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        el('flag-profanity', profanity);
        el('flag-scam', scam);
        el('flag-toxic', toxic);
        el('flag-spam', spam);
    }

    filterMessages(filter) {
        this.currentFilter = filter;

        // Update button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('bg-slate-700', 'text-white', 'active');
            btn.classList.add('bg-slate-800', 'text-slate-400');
        });
        const activeBtn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-slate-800', 'text-slate-400');
            activeBtn.classList.add('bg-slate-700', 'text-white', 'active');
        }

        // Filter and re-render
        this.renderFilteredMessages();
    }

    renderFilteredMessages() {
        const box = document.getElementById('chat-box');
        if (!box) return;

        let filtered = this.chatMessages;
        if (this.currentFilter === 'flagged') {
            filtered = this.chatMessages.filter(m => {
                const f = m.flags || {};
                return f.profanity || f.scam || f.toxic || f.spam || f.caps;
            });
        } else if (this.currentFilter === 'clean') {
            filtered = this.chatMessages.filter(m => {
                const f = m.flags || {};
                return !f.profanity && !f.scam && !f.toxic && !f.spam;
            });
        }

        if (filtered.length === 0) {
            box.innerHTML = `<div class="text-center text-slate-500 text-xs py-10">No ${this.currentFilter === 'flagged' ? 'flagged' : this.currentFilter === 'clean' ? 'clean' : ''} messages</div>`;
            return;
        }

        // Re-use renderChatMessages logic but with filtered array
        const originalMessages = this.chatMessages;
        this.chatMessages = filtered;
        this.renderChatMessages();
        this.chatMessages = originalMessages;
    }

    toggleAutoMod() {
        this.autoModEnabled = document.getElementById('auto-mod-toggle')?.checked || false;
        if (this.autoModEnabled) {
            this.toast('🤖 Auto-moderation enabled', 'success');
            // Process existing flagged messages
            this.autoModerateMessages();
        } else {
            this.toast('Auto-moderation disabled', 'info');
        }
    }

    async autoModerateMessages() {
        if (!this.autoModEnabled) return;

        for (const m of this.chatMessages) {
            const hasFlags = m.flags?.profanity || m.flags?.toxic || m.flags?.scam;
            if (hasFlags && !m.isAdmin && m.uid !== 'admin' && m.uid !== 'system') {
                // Auto-delete the message
                await this.db.ref(`globalChat/${m.id}`).remove();

                // Warn the user
                const currentWarning = this.warnings[m.uid];
                const newCount = (currentWarning?.count || 0) + 1;

                await this.db.ref(`moderation/warnings/${m.uid}`).set({
                    name: m.name || 'User',
                    count: newCount,
                    lastReason: 'Auto-moderation: Content violation detected',
                    lastWarned: firebase.database.ServerValue.TIMESTAMP,
                    warnedBy: 'AutoMod'
                });

                // Auto-ban after 3 warnings
                if (newCount >= 3) {
                    await this.db.ref(`moderation/banned/${m.uid}`).set({
                        name: m.name || 'User',
                        bannedAt: firebase.database.ServerValue.TIMESTAMP,
                        bannedBy: 'AutoMod'
                    });
                }
            }
        }
    }

    // AI Content Moderation System
    initContentFilters() {
        return {
            // Profanity word list (basic - extend as needed)
            profanity: [
                'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'cock', 'pussy', 'cunt',
                'bastard', 'whore', 'slut', 'fag', 'nigger', 'nigga', 'retard', 'idiot', 'stupid',
                'f*ck', 'sh*t', 'b*tch', 'a$$', 'd!ck', 'fck', 'fuk', 'stfu', 'gtfo', 'wtf'
            ],
            // Scam/fraud indicators
            scam: [
                'free money', 'free coins', 'hack', 'cheat', 'exploit', 'generator', 'unlimited',
                'click here', 'visit my', 'check out my', 'dm me for', 'send me', 'give me your',
                'password', 'login', 'account', 'giveaway', 'winner', 'congratulations',
                'bit.ly', 'tinyurl', 'discord.gg', 'telegram', 'whatsapp'
            ],
            // Toxic behavior patterns
            toxic: [
                'kill yourself', 'kys', 'die', 'cancer', 'hope you die', 'neck yourself',
                'go die', 'uninstall', 'trash', 'garbage', 'loser', 'noob', 'get rekt',
                'cry more', 'stay mad', 'ur bad', 'youre trash'
            ],
            // Spam patterns
            spamPatterns: [
                /(.)(\1{4,})/gi,           // Repeated characters (aaaaaaa)
                /(\w+\s*)\1{3,}/gi,         // Repeated words
                /[\u{1F300}-\u{1F9FF}]{5,}/gu, // Excessive emojis
            ]
        };
    }

    analyzeContent(text) {
        if (!text) return {};
        const lower = text.toLowerCase();
        const flags = {};

        // Check profanity
        for (const word of this.contentFilters.profanity) {
            if (lower.includes(word)) {
                flags.profanity = true;
                break;
            }
        }

        // Check scam/fraud
        let scamScore = 0;
        for (const indicator of this.contentFilters.scam) {
            if (lower.includes(indicator)) scamScore++;
        }
        if (scamScore >= 2) flags.scam = true;

        // Check toxic content
        for (const phrase of this.contentFilters.toxic) {
            if (lower.includes(phrase)) {
                flags.toxic = true;
                break;
            }
        }

        // Check spam patterns
        for (const pattern of this.contentFilters.spamPatterns) {
            if (pattern.test(text)) {
                flags.spam = true;
                break;
            }
        }

        // Check excessive caps (more than 70% uppercase)
        const letters = text.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 5) {
            const upperCount = (text.match(/[A-Z]/g) || []).length;
            if (upperCount / letters.length > 0.7) {
                flags.caps = true;
            }
        }

        // Check for links
        if (/https?:\/\/|www\./i.test(text)) {
            flags.link = true;
        }

        return flags;
    }

    async deleteMessage(msgId) {
        if (confirm('Delete this message?')) {
            await this.db.ref(`globalChat/${msgId}`).remove();
        }
    }

    showModerateModal(uid, name) {
        const modal = document.getElementById('mod-modal');
        const title = document.getElementById('mod-modal-title');
        const content = document.getElementById('mod-modal-content');

        const isBanned = this.bannedUsers[uid];
        const cooldown = this.cooldowns[uid];
        const isCooled = cooldown && cooldown.until > Date.now();
        const warning = this.warnings[uid];
        const warnCount = warning?.count || 0;

        title.textContent = `Moderate: ${name}`;
        content.innerHTML = `
            <div class="space-y-4">
                <!-- User Status -->
                <div class="bg-slate-800/50 rounded-xl p-3 border border-white/5">
                    <div class="text-xs text-slate-400 mb-2">Current Status</div>
                    <div class="flex flex-wrap gap-2">
                        ${isBanned ? '<span class="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg border border-red-500/30">🚫 Banned</span>' : ''}
                        ${isCooled ? `<span class="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-lg border border-orange-500/30">⏱️ Cooldown (${Math.ceil((cooldown.until - Date.now()) / 60000)}m left)</span>` : ''}
                        ${warnCount > 0 ? `<span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-lg border border-yellow-500/30">⚠️ ${warnCount} Warning${warnCount > 1 ? 's' : ''}</span>` : ''}
                        ${!isBanned && !isCooled && warnCount === 0 ? '<span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/30">✓ Good Standing</span>' : ''}
                    </div>
                </div>
                
                <!-- Warning -->
                <div>
                    <label class="text-xs text-slate-400 mb-1 block">Warning Message (optional)</label>
                    <input type="text" id="warn-reason" placeholder="e.g., Please be respectful..." class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-yellow-500 focus:outline-none">
                </div>
                
                <!-- Actions -->
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="admin.warnUser('${uid}', '${this.esc(name)}')" class="flex items-center justify-center gap-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 rounded-xl py-2.5 text-sm font-medium transition-colors">
                        <i class="ph-fill ph-warning"></i> Warn
                    </button>
                    <button onclick="admin.cooldownUser('${uid}', '${this.esc(name)}')" class="flex items-center justify-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30 rounded-xl py-2.5 text-sm font-medium transition-colors">
                        <i class="ph-fill ph-clock"></i> Cooldown
                    </button>
                    ${isBanned ? `
                        <button onclick="admin.unbanUser('${uid}')" class="col-span-2 flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl py-2.5 text-sm font-medium transition-colors">
                            <i class="ph-fill ph-check-circle"></i> Unban User
                        </button>
                    ` : `
                        <button onclick="admin.banUser('${uid}', '${this.esc(name)}')" class="col-span-2 flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl py-2.5 text-sm font-medium transition-colors">
                            <i class="ph-fill ph-prohibit"></i> Ban User
                        </button>
                    `}
                </div>
                
                <!-- Cooldown Duration -->
                <div class="bg-slate-800/30 rounded-lg p-3 border border-white/5">
                    <div class="text-xs text-slate-400 mb-2">Cooldown Duration</div>
                    <div class="flex gap-2">
                        <button onclick="admin.cooldownDuration=5" class="cooldown-btn flex-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors" data-dur="5">5 min</button>
                        <button onclick="admin.cooldownDuration=15" class="cooldown-btn flex-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors" data-dur="15">15 min</button>
                        <button onclick="admin.cooldownDuration=30" class="cooldown-btn flex-1 py-1.5 text-xs bg-orange-600 text-white rounded-lg" data-dur="30">30 min</button>
                        <button onclick="admin.cooldownDuration=60" class="cooldown-btn flex-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors" data-dur="60">1 hour</button>
                    </div>
                </div>
            </div>
        `;

        this.cooldownDuration = 30; // Default 30 minutes
        modal.classList.remove('hidden');
    }

    closeModModal() {
        document.getElementById('mod-modal').classList.add('hidden');
    }

    async warnUser(uid, name) {
        const reason = document.getElementById('warn-reason')?.value || 'Please follow the chat rules.';
        const currentWarning = this.warnings[uid];
        const newCount = (currentWarning?.count || 0) + 1;

        // Save warning to database
        await this.db.ref(`moderation/warnings/${uid}`).set({
            name: name,
            count: newCount,
            lastReason: reason,
            lastWarned: firebase.database.ServerValue.TIMESTAMP,
            warnedBy: this.user.email
        });

        // Send warning message to chat
        await this.db.ref('globalChat').push({
            name: '⚠️ SYSTEM',
            text: `@${name}: ${reason}`,
            uid: 'system',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            isAdmin: true,
            isWarning: true
        });

        // Auto-ban after 3 warnings
        if (newCount >= 3) {
            await this.banUser(uid, name);
            return;
        }

        this.closeModModal();
        this.toast(`⚠️ Warned ${name} (${newCount}/3)`, 'warning');
    }

    async cooldownUser(uid, name) {
        const duration = this.cooldownDuration || 30;
        const until = Date.now() + (duration * 60 * 1000);

        await this.db.ref(`moderation/cooldowns/${uid}`).set({
            name: name,
            until: until,
            duration: duration,
            setBy: this.user.email,
            setAt: firebase.database.ServerValue.TIMESTAMP
        });

        // Notify in chat
        await this.db.ref('globalChat').push({
            name: '⏱️ SYSTEM',
            text: `${name} has been placed on a ${duration}-minute cooldown.`,
            uid: 'system',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            isAdmin: true
        });

        this.closeModModal();
        this.toast(`⏱️ ${name} cooled down for ${duration}m`, 'info');
    }

    async removeCooldown(uid) {
        await this.db.ref(`moderation/cooldowns/${uid}`).remove();
        this.toast('Cooldown removed', 'success');
    }

    async banUser(uid, name) {
        if (!confirm(`Ban ${name}? They will not be able to chat.`)) return;

        await this.db.ref(`moderation/banned/${uid}`).set({
            name: name,
            bannedAt: firebase.database.ServerValue.TIMESTAMP,
            bannedBy: this.user.email
        });

        // Remove from cooldowns if any
        await this.db.ref(`moderation/cooldowns/${uid}`).remove();

        // Notify in chat
        await this.db.ref('globalChat').push({
            name: '🚫 SYSTEM',
            text: `${name} has been banned from chat.`,
            uid: 'system',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            isAdmin: true
        });

        this.closeModModal();
        this.toast(`🚫 ${name} banned`, 'error');
        this.log('action', `Banned user: ${name}`, { uid, name, reason: 'Manual ban' });
    }

    async unbanUser(uid) {
        const userData = this.bannedUsers[uid];
        await this.db.ref(`moderation/banned/${uid}`).remove();
        // Clear warnings too
        await this.db.ref(`moderation/warnings/${uid}`).remove();
        this.closeModModal();
        this.toast(`✅ ${userData?.name || 'User'} unbanned`, 'success');
        this.log('action', `Unbanned user: ${userData?.name || uid}`, { uid });
    }

    async sendAdminMessage() {
        const input = document.getElementById('admin-msg-input');
        const text = input.value.trim();
        if (!text) return;
        try {
            await this.db.ref('globalChat').push({
                name: '🛡️ ADMIN',
                text: text,
                uid: 'admin',
                avatar: '🛡️',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                isAdmin: true
            });
            input.value = '';
        } catch (e) {
            this.toast('Failed to send', 'error');
        }
    }

    async clearAllChat() {
        if (confirm('Delete ALL chat messages? This cannot be undone.')) {
            await this.db.ref('globalChat').remove();
            this.toast('Chat cleared', 'success');
            this.log('action', 'Cleared all chat messages', { action: 'clear_chat' });
        }
    }

    toast(msg, type = 'info') {
        const colors = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-indigo-500' };
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 ${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in`;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Custom Confirmation Modal
    showConfirmModal(options) {
        return new Promise((resolve) => {
            const {
                title = 'Confirm Action',
                message = 'Are you sure?',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                type = 'danger', // danger, warning, info
                requireInput = false,
                inputPlaceholder = 'Type to confirm...',
                inputMatch = ''
            } = options;

            const typeColors = {
                danger: { bg: 'bg-red-500', border: 'border-red-500/30', icon: 'ph-warning', iconColor: 'text-red-400' },
                warning: { bg: 'bg-amber-500', border: 'border-amber-500/30', icon: 'ph-warning-circle', iconColor: 'text-amber-400' },
                info: { bg: 'bg-blue-500', border: 'border-blue-500/30', icon: 'ph-info', iconColor: 'text-blue-400' }
            };
            const colors = typeColors[type] || typeColors.danger;

            const overlay = document.createElement('div');
            overlay.id = 'confirm-modal-overlay';
            overlay.className = 'fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4';
            overlay.style.animation = 'fadeIn 0.2s ease';

            overlay.innerHTML = `
                <div class="glass rounded-2xl border ${colors.border} w-full max-w-md overflow-hidden" style="animation: scaleIn 0.2s ease">
                    <div class="p-6">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-12 h-12 rounded-full ${colors.bg}/20 flex items-center justify-center">
                                <i class="ph-fill ${colors.icon} text-2xl ${colors.iconColor}"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-white">${title}</h3>
                                <p class="text-sm text-slate-400">${message}</p>
                            </div>
                        </div>
                        ${requireInput ? `
                            <div class="mb-4">
                                <input type="text" id="confirm-input" 
                                    class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest outline-none focus:border-red-500/50" 
                                    placeholder="${inputPlaceholder}"
                                    autocomplete="off">
                                <p class="text-xs text-slate-500 mt-2 text-center">Type <span class="text-red-400 font-bold">${inputMatch}</span> to confirm</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="flex border-t border-white/5">
                        <button id="confirm-cancel" class="flex-1 p-4 text-slate-400 hover:bg-white/5 transition-all font-medium">
                            ${cancelText}
                        </button>
                        <button id="confirm-ok" class="flex-1 p-4 ${colors.bg} text-white font-bold hover:brightness-110 transition-all ${requireInput ? 'opacity-50 cursor-not-allowed' : ''}" ${requireInput ? 'disabled' : ''}>
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const cancelBtn = overlay.querySelector('#confirm-cancel');
            const okBtn = overlay.querySelector('#confirm-ok');
            const input = overlay.querySelector('#confirm-input');

            const cleanup = () => {
                overlay.style.animation = 'fadeOut 0.2s ease forwards';
                setTimeout(() => overlay.remove(), 200);
            };

            cancelBtn.onclick = () => { cleanup(); resolve(false); };
            overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };

            if (requireInput && input) {
                input.focus();
                input.oninput = () => {
                    const matches = input.value.toUpperCase() === inputMatch.toUpperCase();
                    okBtn.disabled = !matches;
                    okBtn.classList.toggle('opacity-50', !matches);
                    okBtn.classList.toggle('cursor-not-allowed', !matches);
                };
                input.onkeydown = (e) => {
                    if (e.key === 'Enter' && !okBtn.disabled) {
                        cleanup(); resolve(true);
                    } else if (e.key === 'Escape') {
                        cleanup(); resolve(false);
                    }
                };
            }

            okBtn.onclick = () => { if (!okBtn.disabled) { cleanup(); resolve(true); } };

            // Add keyframe animations
            if (!document.getElementById('confirm-modal-styles')) {
                const style = document.createElement('style');
                style.id = 'confirm-modal-styles';
                style.textContent = `
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
                    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                `;
                document.head.appendChild(style);
            }
        });
    }

    // ============================
    // ENHANCED USERS MODULE
    // ============================

    async renderUsers(el) {
        this.usersFilter = 'all';
        this.usersSort = 'newest';
        this.usersSearch = '';
        this.selectedUsers = new Set();
        this.onlineUserIds = new Set();

        el.innerHTML = `
            <div class="space-y-6">
                <!-- Stats -->
                <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div class="glass p-4 rounded-xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400"><i class="ph-fill ph-users text-xl"></i></div><div><div class="text-2xl font-bold text-white" id="users-total">--</div><div class="text-xs text-slate-400">Total</div></div></div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 group hover:border-emerald-500/30 transition-all">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400"><i class="ph-fill ph-broadcast text-xl"></i></div><div><div class="text-2xl font-bold text-white" id="users-online">--</div><div class="text-xs text-slate-400">Online</div></div></div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 group hover:border-cyan-500/30 transition-all">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400"><i class="ph-fill ph-user-plus text-xl"></i></div><div><div class="text-2xl font-bold text-white" id="users-new">--</div><div class="text-xs text-slate-400">New Today</div></div></div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 group hover:border-yellow-500/30 transition-all">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400"><i class="ph-fill ph-coins text-xl"></i></div><div><div class="text-2xl font-bold text-white" id="users-total-coins">--</div><div class="text-xs text-slate-400">Total Coins</div></div></div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 group hover:border-purple-500/30 transition-all">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400"><i class="ph-fill ph-crown text-xl"></i></div><div><div class="text-2xl font-bold text-white" id="users-premium">--</div><div class="text-xs text-slate-400">Premium</div></div></div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 group hover:border-red-500/30 transition-all">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400"><i class="ph-fill ph-prohibit text-xl"></i></div><div><div class="text-2xl font-bold text-white" id="users-banned">--</div><div class="text-xs text-slate-400">Banned</div></div></div>
                    </div>
                </div>
                <!-- Controls -->
                <div class="glass rounded-2xl border border-white/5 p-4">
                    <div class="flex flex-wrap gap-4 items-center justify-between">
                        <div class="flex-1 min-w-[250px] relative">
                            <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                            <input type="text" id="users-search" placeholder="Search by name, email, UID..." class="w-full bg-slate-800/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50">
                        </div>
                        <div class="flex gap-2">
                            <button onclick="admin.setUsersFilter('all')" class="users-filter-btn active px-3 py-2 rounded-xl text-xs" data-filter="all">All</button>
                            <button onclick="admin.setUsersFilter('online')" class="users-filter-btn px-3 py-2 rounded-xl text-xs" data-filter="online"><span class="w-2 h-2 bg-emerald-400 rounded-full inline-block mr-1"></span>Online</button>
                            <button onclick="admin.setUsersFilter('premium')" class="users-filter-btn px-3 py-2 rounded-xl text-xs" data-filter="premium">👑 Premium</button>
                            <button onclick="admin.setUsersFilter('banned')" class="users-filter-btn px-3 py-2 rounded-xl text-xs" data-filter="banned">🚫 Banned</button>
                        </div>
                        <select id="users-sort" onchange="admin.setUsersSort(this.value)" class="bg-slate-800/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
                            <option value="newest">Newest</option><option value="name">Name A-Z</option><option value="coins-high">Most Coins</option><option value="level-high">Highest Level</option>
                        </select>
                        <button onclick="admin.refreshUsers()" class="p-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-slate-400 hover:text-indigo-400"><i class="ph-bold ph-arrows-clockwise"></i></button>
                    </div>
                </div>
                <!-- Users Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div class="lg:col-span-3 glass rounded-2xl border border-white/5 overflow-hidden">
                        <div class="p-4 border-b border-white/5 flex justify-between bg-slate-900/50">
                            <h3 class="font-bold text-white flex items-center gap-2"><i class="ph-fill ph-users text-indigo-400"></i> Users</h3>
                            <span class="text-xs text-slate-500" id="users-showing">Loading...</span>
                        </div>
                        <div id="users-container" class="max-h-[600px] overflow-y-auto"><div class="p-8 text-center text-slate-500"><div class="spinner mx-auto mb-3"></div>Loading...</div></div>
                    </div>
                    <div class="space-y-6">
                        <div class="glass rounded-2xl border border-white/5 p-4">
                            <h4 class="font-bold text-white mb-4 text-sm flex items-center gap-2"><i class="ph-fill ph-trophy text-yellow-400"></i> Top Players</h4>
                            <div id="top-players" class="space-y-2"><div class="text-center text-slate-500 text-xs py-4">Loading...</div></div>
                        </div>
                        <div class="glass rounded-2xl border border-white/5 p-4">
                            <h4 class="font-bold text-white mb-4 text-sm flex items-center gap-2"><i class="ph-fill ph-clock text-cyan-400"></i> Recent Signups</h4>
                            <div id="recent-signups" class="space-y-2"><div class="text-center text-slate-500 text-xs py-4">Loading...</div></div>
                        </div>
                    </div>
                </div>
            </div>
            <style>.users-filter-btn{background:rgba(51,65,85,0.5);color:#94a3b8;border:1px solid transparent}.users-filter-btn:hover,.users-filter-btn.active{background:rgba(99,102,241,0.2);color:#a5b4fc;border-color:rgba(99,102,241,0.5)}</style>
        `;
        document.getElementById('users-search').addEventListener('input', (e) => { this.usersSearch = e.target.value.toLowerCase(); this.renderUsersData(); });
        await this.loadUsersData();
    }

    async loadUsersData() {
        try {
            const [usersSnap, savesSnap, bannedSnap, onlineSnap] = await Promise.all([
                this.firestore.collection('users').get(),
                this.db.ref('saves').once('value'),
                this.db.ref('moderation/banned').once('value'),
                this.db.ref('onlineUsers').once('value')
            ]);
            const saves = savesSnap.val() || {};
            const banned = bannedSnap.val() || {};
            this.onlineUserIds = new Set(onlineSnap.exists() ? Object.keys(onlineSnap.val()) : []);
            this.users = [];
            usersSnap.forEach(doc => {
                const u = doc.data(), s = saves[doc.id] || {};
                this.users.push({ uid: doc.id, ...u, coins: u.coins || s.cash || 0, diamonds: u.diamonds || s.diamonds || 0, level: s.level || u.level || 1, hype: s.hype || 0, isBanned: !!banned[doc.id], isPremium: u.premium || u.isPremium || false, createdAt: u.createdAt?.toDate?.() || u.createdAt || new Date(0) });
            });
            this.renderUsersData();
            this.loadUsersStats();
            this.loadTopPlayers();
            this.loadRecentSignups();
        } catch (e) { document.getElementById('users-container').innerHTML = `<div class="p-8 text-center text-red-400">Failed: ${e.message}</div>`; }
    }

    setUsersFilter(f) { this.usersFilter = f; document.querySelectorAll('.users-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === f)); this.renderUsersData(); }
    setUsersSort(s) { this.usersSort = s; this.renderUsersData(); }

    renderUsersData() {
        const c = document.getElementById('users-container'); if (!c) return;
        let list = [...this.users];
        if (this.usersFilter === 'online') list = list.filter(u => this.onlineUserIds.has(u.uid));
        else if (this.usersFilter === 'premium') list = list.filter(u => u.isPremium);
        else if (this.usersFilter === 'banned') list = list.filter(u => u.isBanned);
        if (this.usersSearch) list = list.filter(u => (u.displayName || '').toLowerCase().includes(this.usersSearch) || (u.email || '').toLowerCase().includes(this.usersSearch));
        if (this.usersSort === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        else if (this.usersSort === 'name') list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        else if (this.usersSort === 'coins-high') list.sort((a, b) => (b.coins || 0) - (a.coins || 0));
        else if (this.usersSort === 'level-high') list.sort((a, b) => (b.level || 1) - (a.level || 1));
        document.getElementById('users-showing').textContent = `${list.length} users`;
        if (!list.length) { c.innerHTML = '<div class="p-12 text-center text-slate-500">No users found</div>'; return; }
        c.innerHTML = list.slice(0, 100).map(u => this.renderUserCard(u)).join('');
    }

    renderUserCard(u) {
        const on = this.onlineUserIds.has(u.uid), i = (u.displayName || 'U')[0].toUpperCase();
        const colors = ['from-purple-500 to-indigo-500', 'from-pink-500 to-rose-500', 'from-cyan-500 to-blue-500', 'from-emerald-500 to-green-500', 'from-amber-500 to-orange-500'];
        return `<div class="flex items-center gap-4 p-4 border-b border-white/5 hover:bg-indigo-500/5 transition-all">
            <div class="relative"><div class="w-12 h-12 rounded-xl bg-gradient-to-br ${colors[u.uid.charCodeAt(0) % 5]} flex items-center justify-center text-white font-bold shadow-lg">${i}</div>${on ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900"></div>' : ''}${u.isPremium ? '<div class="absolute -top-1 -right-1 text-yellow-400">👑</div>' : ''}</div>
            <div class="flex-1 min-w-0"><div class="flex items-center gap-2"><span class="text-white font-medium truncate">${this.esc(u.displayName || 'Unknown')}</span>${u.isBanned ? '<span class="text-[9px] bg-red-500/20 text-red-400 px-1.5 rounded">BANNED</span>' : ''}</div><div class="text-xs text-slate-500 truncate">${this.esc(u.email || u.uid.substring(0, 16) + '...')}</div></div>
            <div class="text-center px-3"><div class="text-sm font-medium text-indigo-400">Lv.${u.level || 1}</div></div>
            <div class="text-center px-3"><div class="text-sm font-medium text-yellow-400">${this.formatNumber(u.coins || 0)}</div><div class="text-[10px] text-slate-500">coins</div></div>
            <div class="flex gap-1">
                <button onclick="admin.viewUserProfile('${u.uid}')" class="p-2 rounded-lg hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400" title="View"><i class="ph-bold ph-eye"></i></button>
                <button onclick="admin.editUser('${u.uid}')" class="p-2 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400" title="Edit"><i class="ph-bold ph-pencil"></i></button>
                <button onclick="admin.giftUserCoins('${u.uid}')" class="p-2 rounded-lg hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-400" title="Gift"><i class="ph-bold ph-gift"></i></button>
                ${u.isBanned ? `<button onclick="admin.unbanUserById('${u.uid}')" class="p-2 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400" title="Unban"><i class="ph-bold ph-check"></i></button>` : `<button onclick="admin.banUserById('${u.uid}')" class="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400" title="Ban"><i class="ph-bold ph-prohibit"></i></button>`}
            </div>
        </div>`;
    }

    loadUsersStats() {
        const t = this.users.length, o = this.onlineUserIds.size, td = new Date().setHours(0, 0, 0, 0);
        const n = this.users.filter(u => u.createdAt && new Date(u.createdAt) >= td).length;
        const tc = this.users.reduce((s, u) => s + (u.coins || 0), 0);
        document.getElementById('users-total').textContent = t;
        document.getElementById('users-online').textContent = o;
        document.getElementById('users-new').textContent = n;
        document.getElementById('users-total-coins').textContent = this.formatNumber(tc);
        document.getElementById('users-premium').textContent = this.users.filter(u => u.isPremium).length;
        document.getElementById('users-banned').textContent = this.users.filter(u => u.isBanned).length;
    }

    loadTopPlayers() {
        const el = document.getElementById('top-players'); if (!el) return;
        const top = [...this.users].sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 5);
        if (!top.length) { el.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">No players</div>'; return; }
        const m = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        el.innerHTML = top.map((u, i) => `<div class="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 cursor-pointer" onclick="admin.viewUserProfile('${u.uid}')"><span>${m[i]}</span><div class="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">${(u.displayName || 'U')[0].toUpperCase()}</div><div class="flex-1 min-w-0"><div class="text-xs text-white truncate">${this.esc(u.displayName || 'Unknown')}</div><div class="text-[10px] text-yellow-400">${this.formatNumber(u.coins || 0)}</div></div></div>`).join('');
    }

    loadRecentSignups() {
        const el = document.getElementById('recent-signups'); if (!el) return;
        const r = [...this.users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        if (!r.length) { el.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">No signups</div>'; return; }
        el.innerHTML = r.map(u => `<div class="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 cursor-pointer" onclick="admin.viewUserProfile('${u.uid}')"><div class="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">${(u.displayName || 'U')[0].toUpperCase()}</div><div class="flex-1 min-w-0"><div class="text-xs text-white truncate">${this.esc(u.displayName || 'Unknown')}</div><div class="text-[10px] text-slate-500">${this.getTimeAgo(new Date(u.createdAt))}</div></div></div>`).join('');
    }

    async refreshUsers() { this.toast('Refreshing...', 'info'); await this.loadUsersData(); this.toast('Users refreshed', 'success'); }

    async viewUserProfile(uid) {
        const u = this.users.find(x => x.uid === uid); if (!u) return;
        let s = {}; try { const snap = await this.db.ref(`saves/${uid}`).once('value'); s = snap.val() || {}; } catch (e) { }
        const on = this.onlineUserIds.has(uid), i = (u.displayName || 'U')[0].toUpperCase();
        const o = document.getElementById('modal-overlay');
        o.innerHTML = `<div class="glass p-0 rounded-2xl max-w-xl w-full mx-4 overflow-hidden" style="animation:scaleIn .2s">
            <div class="h-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative"><div class="absolute -bottom-8 left-6"><div class="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-xl border-4 border-slate-900">${i}</div>${on ? '<div class="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900"></div>' : ''}</div><button onclick="admin.closeModal()" class="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/30 hover:bg-black/50 text-white flex items-center justify-center"><i class="ph-bold ph-x"></i></button></div>
            <div class="pt-12 px-6 pb-6">
                <div class="flex items-start justify-between mb-4"><div><div class="flex items-center gap-2"><span class="text-lg font-bold text-white">${this.esc(u.displayName || 'Unknown')}</span>${u.isPremium ? '<span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">👑 Premium</span>' : ''}${u.isBanned ? '<span class="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">🚫 Banned</span>' : ''}</div><div class="text-sm text-slate-400">${this.esc(u.email || 'No email')}</div><div class="text-xs text-slate-500 font-mono mt-1">${uid}</div></div><div class="px-3 py-1.5 rounded-full text-xs ${on ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}">${on ? '🟢 Online' : '⚫ Offline'}</div></div>
                <div class="grid grid-cols-4 gap-3 mb-4">${[['yellow', u.coins || 0, 'Coins'], ['cyan', u.diamonds || 0, 'Diamonds'], ['indigo', u.level || 1, 'Level'], ['pink', s.hype || 0, 'Hype']].map(([c, v, l]) => `<div class="bg-slate-800/50 rounded-xl p-3 text-center"><div class="text-lg font-bold text-${c}-400">${this.formatNumber(v)}</div><div class="text-xs text-slate-500">${l}</div></div>`).join('')}</div>
                <div class="bg-slate-800/30 rounded-xl p-4 mb-4"><h4 class="text-sm text-white mb-2 font-medium">Game Progress</h4><div class="grid grid-cols-2 gap-2 text-sm"><div class="flex justify-between"><span class="text-slate-400">Furniture</span><span class="text-white">${s.furniture?.length || 0}</span></div><div class="flex justify-between"><span class="text-slate-400">Max Visitors</span><span class="text-white">${s.maxVisitors || 15}</span></div><div class="flex justify-between"><span class="text-slate-400">Bar Stock</span><span class="text-white">${s.barStock || 0}</span></div><div class="flex justify-between"><span class="text-slate-400">Club Name</span><span class="text-white">${this.esc(s.clubName || 'My Club')}</span></div></div></div>
                <div class="grid grid-cols-2 gap-2"><button onclick="admin.editUser('${uid}')" class="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm flex items-center justify-center gap-2"><i class="ph-fill ph-pencil"></i> Edit</button><button onclick="admin.giftUserCoins('${uid}')" class="p-3 rounded-xl bg-yellow-500/20 text-yellow-400 text-sm flex items-center justify-center gap-2"><i class="ph-fill ph-gift"></i> Gift Coins</button><button onclick="admin.resetUserProgress('${uid}')" class="p-3 rounded-xl bg-orange-500/20 text-orange-400 text-sm flex items-center justify-center gap-2"><i class="ph-fill ph-arrow-counter-clockwise"></i> Reset</button>${u.isBanned ? `<button onclick="admin.unbanUserById('${uid}')" class="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm flex items-center justify-center gap-2"><i class="ph-fill ph-check"></i> Unban</button>` : `<button onclick="admin.banUserById('${uid}')" class="p-3 rounded-xl bg-red-500/20 text-red-400 text-sm flex items-center justify-center gap-2"><i class="ph-fill ph-prohibit"></i> Ban</button>`}</div>
            </div></div>`;
        o.classList.remove('hidden'); o.classList.add('flex'); setTimeout(() => o.classList.add('opacity-100'), 10);
    }

    async editUser(uid) {
        const u = this.users.find(x => x.uid === uid) || {};
        const o = document.getElementById('modal-overlay');
        o.innerHTML = `<div class="glass p-6 rounded-2xl max-w-lg w-full mx-4" style="animation:scaleIn .2s"><button onclick="admin.closeModal()" class="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center"><i class="ph-bold ph-x"></i></button><h3 class="text-xl font-bold text-white mb-6"><i class="ph-fill ph-user-gear text-indigo-400 mr-2"></i>Edit User</h3><div class="space-y-4"><div><label class="text-xs text-slate-400 uppercase mb-2 block">Name</label><input type="text" id="e-name" value="${this.esc(u.displayName || '')}" class="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"></div><div class="grid grid-cols-2 gap-4"><div><label class="text-xs text-slate-400 uppercase mb-2 block">Coins</label><input type="number" id="e-coins" value="${u.coins || 0}" class="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white"></div><div><label class="text-xs text-slate-400 uppercase mb-2 block">Diamonds</label><input type="number" id="e-diamonds" value="${u.diamonds || 0}" class="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white"></div></div><div class="grid grid-cols-2 gap-4"><div><label class="text-xs text-slate-400 uppercase mb-2 block">Level</label><input type="number" id="e-level" value="${u.level || 1}" class="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white"></div><div class="flex items-center pt-6"><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="e-premium" ${u.isPremium ? 'checked' : ''}><span class="text-yellow-400">👑 Premium</span></label></div></div><button onclick="admin.saveUser('${uid}')" class="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-white font-medium"><i class="ph-fill ph-floppy-disk mr-2"></i>Save</button></div></div>`;
        o.classList.remove('hidden'); o.classList.add('flex');
    }

    async saveUser(uid) {
        try {
            const upd = { displayName: document.getElementById('e-name').value, coins: parseInt(document.getElementById('e-coins').value) || 0, diamonds: parseInt(document.getElementById('e-diamonds').value) || 0, level: parseInt(document.getElementById('e-level').value) || 1, isPremium: document.getElementById('e-premium').checked };
            await this.firestore.collection('users').doc(uid).update(upd);
            await this.db.ref(`saves/${uid}`).update({ cash: upd.coins, diamonds: upd.diamonds, level: upd.level });
            this.closeModal(); this.toast('User saved', 'success'); this.log('action', `Updated user: ${upd.displayName}`, { uid }); await this.loadUsersData();
        } catch (e) { this.toast('Failed: ' + e.message, 'error'); }
    }

    async giftUserCoins(uid) {
        const u = this.users.find(x => x.uid === uid);
        const amt = prompt(`Gift coins to ${u?.displayName || 'user'}:`, '1000'); if (!amt) return;
        const c = parseInt(amt); if (isNaN(c) || c <= 0) { this.toast('Invalid amount', 'error'); return; }
        try {
            await this.firestore.collection('users').doc(uid).update({ coins: firebase.firestore.FieldValue.increment(c) });
            await this.db.ref(`saves/${uid}/cash`).transaction(x => (x || 0) + c);
            this.toast(`Gifted ${this.formatNumber(c)} coins`, 'success'); this.log('action', `Gifted ${c} coins to ${u?.displayName}`, { uid }); await this.loadUsersData();
        } catch (e) { this.toast('Failed: ' + e.message, 'error'); }
    }

    async banUserById(uid) {
        const u = this.users.find(x => x.uid === uid); if (!confirm(`Ban ${u?.displayName}?`)) return;
        try {
            await this.db.ref(`moderation/banned/${uid}`).set({ name: u?.displayName || 'Unknown', email: u?.email || '', bannedAt: firebase.database.ServerValue.TIMESTAMP, bannedBy: this.user?.email });
            this.closeModal(); this.toast(`${u?.displayName} banned`, 'success'); this.log('action', `Banned: ${u?.displayName}`, { uid }); await this.loadUsersData();
        } catch (e) { this.toast('Failed: ' + e.message, 'error'); }
    }

    async unbanUserById(uid) {
        const u = this.users.find(x => x.uid === uid);
        try {
            await this.db.ref(`moderation/banned/${uid}`).remove();
            this.closeModal(); this.toast(`${u?.displayName || 'User'} unbanned`, 'success'); this.log('action', `Unbanned: ${u?.displayName}`, { uid }); await this.loadUsersData();
        } catch (e) { this.toast('Failed: ' + e.message, 'error'); }
    }

    async resetUserProgress(uid) {
        if (!confirm('Reset all progress for this user?')) return;
        try {
            await this.db.ref(`saves/${uid}`).remove();
            this.closeModal(); this.toast('Progress reset', 'success'); this.log('action', `Reset progress for user`, { uid });
        } catch (e) { this.toast('Failed: ' + e.message, 'error'); }
    }

    closeModal() {
        const o = document.getElementById('modal-overlay');
        o.classList.add('hidden'); o.classList.remove('flex', 'opacity-100');
    }

    // CLUBS
    async renderClubs(el) {
        el.innerHTML = '<div id="clubs-list" class="glass p-6 rounded-2xl text-white">Loading...</div>';
        const snap = await this.db.ref('clubs').once('value');
        const clubs = snap.exists() ? Object.values(snap.val()) : [];
        document.getElementById('clubs-list').innerHTML = clubs.map(c => `<div class="p-2 border-b border-white/10">${this.esc(c.name)} (Lvl ${c.level})</div>`).join('');
    }

    // BROADCAST
    renderBroadcast(el) {
        el.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Send Broadcast -->
                <div class="lg:col-span-2 glass rounded-2xl border border-white/5 p-6">
                    <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                        <i class="ph-fill ph-megaphone text-amber-400 text-xl"></i> Send Broadcast
                    </h3>
                    
                    <!-- Broadcast Type -->
                    <div class="mb-4">
                        <label class="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Type</label>
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="admin.setBroadcastType('announcement')" class="broadcast-type-btn active px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm" data-type="announcement">
                                <i class="ph-fill ph-megaphone mr-1"></i> Announcement
                            </button>
                            <button onclick="admin.setBroadcastType('alert')" class="broadcast-type-btn px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600" data-type="alert">
                                <i class="ph-fill ph-warning mr-1"></i> Alert
                            </button>
                            <button onclick="admin.setBroadcastType('event')" class="broadcast-type-btn px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600" data-type="event">
                                <i class="ph-fill ph-confetti mr-1"></i> Event
                            </button>
                            <button onclick="admin.setBroadcastType('maintenance')" class="broadcast-type-btn px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600" data-type="maintenance">
                                <i class="ph-fill ph-wrench mr-1"></i> Maintenance
                            </button>
                            <button onclick="admin.setBroadcastType('reward')" class="broadcast-type-btn px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600" data-type="reward">
                                <i class="ph-fill ph-gift mr-1"></i> Reward
                            </button>
                        </div>
                    </div>
                    
                    <!-- Title -->
                    <div class="mb-4">
                        <label class="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Title</label>
                        <input type="text" id="broadcast-title" placeholder="Broadcast title..." class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-indigo-500">
                    </div>
                    
                    <!-- Message -->
                    <div class="mb-4">
                        <label class="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Message</label>
                        <textarea id="broadcast-message" rows="4" placeholder="Enter your broadcast message..." class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-indigo-500 resize-none"></textarea>
                    </div>
                    
                    <!-- Duration -->
                    <div class="mb-6">
                        <label class="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Duration</label>
                        <select id="broadcast-duration" class="bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-indigo-500">
                            <option value="10">10 seconds</option>
                            <option value="30" selected>30 seconds</option>
                            <option value="60">1 minute</option>
                            <option value="300">5 minutes</option>
                            <option value="0">Until dismissed</option>
                        </select>
                    </div>
                    
                    <!-- Preview -->
                    <div class="mb-6 p-4 bg-slate-900/50 rounded-xl border border-white/5">
                        <div class="text-xs text-slate-500 mb-2">Preview</div>
                        <div id="broadcast-preview" class="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-lg p-4">
                            <div class="flex items-start gap-3">
                                <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                                    <i class="ph-fill ph-megaphone text-white"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="text-sm font-bold text-white" id="preview-title">Announcement</div>
                                    <div class="text-sm text-slate-300" id="preview-message">Your message will appear here...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Send Button -->
                    <button onclick="admin.sendBroadcast()" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                        <i class="ph-fill ph-paper-plane-tilt"></i> Send Broadcast
                    </button>
                </div>
                
                <!-- Broadcast History -->
                <div class="glass rounded-2xl border border-white/5 p-6 flex flex-col h-[calc(100vh-12rem)]">
                    <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                        <i class="ph-fill ph-clock-counter-clockwise text-slate-400"></i> Recent Broadcasts
                    </h3>
                    <div id="broadcast-history" class="flex-1 overflow-y-auto custom-scroll space-y-3">
                        <div class="text-center text-slate-500 text-sm py-10">Loading...</div>
                    </div>
                </div>
            </div>`;

        this.broadcastType = 'announcement';
        this.loadBroadcastHistory();
        this.setupBroadcastPreview();
    }

    setBroadcastType(type) {
        this.broadcastType = type;

        // Update button styles
        document.querySelectorAll('.broadcast-type-btn').forEach(btn => {
            btn.classList.remove('bg-indigo-600', 'text-white', 'active');
            btn.classList.add('bg-slate-700', 'text-slate-300');
        });
        const activeBtn = document.querySelector(`.broadcast-type-btn[data-type="${type}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-slate-700', 'text-slate-300');
            activeBtn.classList.add('bg-indigo-600', 'text-white', 'active');
        }

        // Update preview icon and color
        this.updateBroadcastPreview();
    }

    setupBroadcastPreview() {
        const titleInput = document.getElementById('broadcast-title');
        const msgInput = document.getElementById('broadcast-message');

        titleInput?.addEventListener('input', () => this.updateBroadcastPreview());
        msgInput?.addEventListener('input', () => this.updateBroadcastPreview());
    }

    updateBroadcastPreview() {
        const title = document.getElementById('broadcast-title')?.value || this.getBroadcastTypeLabel();
        const message = document.getElementById('broadcast-message')?.value || 'Your message will appear here...';
        const previewTitle = document.getElementById('preview-title');
        const previewMessage = document.getElementById('preview-message');
        const preview = document.getElementById('broadcast-preview');

        if (previewTitle) previewTitle.textContent = title || this.getBroadcastTypeLabel();
        if (previewMessage) previewMessage.textContent = message;

        // Update colors based on type
        const colors = {
            announcement: 'from-indigo-600/20 to-purple-600/20 border-indigo-500/30',
            alert: 'from-red-600/20 to-orange-600/20 border-red-500/30',
            event: 'from-pink-600/20 to-purple-600/20 border-pink-500/30',
            maintenance: 'from-yellow-600/20 to-orange-600/20 border-yellow-500/30',
            reward: 'from-emerald-600/20 to-teal-600/20 border-emerald-500/30'
        };

        if (preview) {
            preview.className = `bg-gradient-to-r ${colors[this.broadcastType] || colors.announcement} rounded-lg p-4`;
        }
    }

    getBroadcastTypeLabel() {
        const labels = {
            announcement: 'Announcement',
            alert: '⚠️ Alert',
            event: '🎉 Event',
            maintenance: '🔧 Maintenance',
            reward: '🎁 Reward'
        };
        return labels[this.broadcastType] || 'Announcement';
    }

    async sendBroadcast() {
        const title = document.getElementById('broadcast-title')?.value.trim();
        const message = document.getElementById('broadcast-message')?.value.trim();
        const duration = parseInt(document.getElementById('broadcast-duration')?.value || '30');

        if (!message) {
            this.toast('Please enter a message', 'error');
            return;
        }

        const broadcast = {
            type: this.broadcastType,
            title: title || this.getBroadcastTypeLabel(),
            message: message,
            duration: duration,
            sentAt: firebase.database.ServerValue.TIMESTAMP,
            sentBy: this.user?.email || 'Admin',
            active: true
        };

        try {
            // Save to broadcasts collection
            await this.db.ref('broadcasts').push(broadcast);

            // Set as active broadcast (overwrites previous)
            await this.db.ref('activeBroadcast').set({
                ...broadcast,
                sentAt: Date.now(),
                expiresAt: duration > 0 ? Date.now() + (duration * 1000) : 0
            });

            this.toast('📢 Broadcast sent successfully!', 'success');
            this.log('action', `Broadcast sent: ${title || message.substring(0, 50)}`, { type: broadcastType, title, duration });

            // Clear inputs
            document.getElementById('broadcast-title').value = '';
            document.getElementById('broadcast-message').value = '';
            this.updateBroadcastPreview();
            this.loadBroadcastHistory();

        } catch (error) {
            this.toast('Failed to send broadcast: ' + error.message, 'error');
        }
    }

    async loadBroadcastHistory() {
        const historyEl = document.getElementById('broadcast-history');
        if (!historyEl) return;

        try {
            const snap = await this.db.ref('broadcasts').orderByChild('sentAt').limitToLast(20).once('value');

            if (!snap.exists()) {
                historyEl.innerHTML = '<div class="text-center text-slate-500 text-sm py-10">No broadcasts yet</div>';
                return;
            }

            const broadcasts = [];
            snap.forEach(child => broadcasts.unshift({ id: child.key, ...child.val() }));

            const typeIcons = {
                announcement: '<i class="ph-fill ph-megaphone text-indigo-400"></i>',
                alert: '<i class="ph-fill ph-warning text-red-400"></i>',
                event: '<i class="ph-fill ph-confetti text-pink-400"></i>',
                maintenance: '<i class="ph-fill ph-wrench text-yellow-400"></i>',
                reward: '<i class="ph-fill ph-gift text-emerald-400"></i>'
            };

            const typeBgs = {
                announcement: 'bg-indigo-500/10 border-indigo-500/20',
                alert: 'bg-red-500/10 border-red-500/20',
                event: 'bg-pink-500/10 border-pink-500/20',
                maintenance: 'bg-yellow-500/10 border-yellow-500/20',
                reward: 'bg-emerald-500/10 border-emerald-500/20'
            };

            historyEl.innerHTML = broadcasts.map(b => {
                const time = b.sentAt ? new Date(b.sentAt).toLocaleString() : 'Unknown';
                const icon = typeIcons[b.type] || typeIcons.announcement;
                const bg = typeBgs[b.type] || typeBgs.announcement;

                return `
                    <div class="p-3 rounded-lg border ${bg}">
                        <div class="flex items-start gap-2">
                            <div class="mt-0.5">${icon}</div>
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-semibold text-white truncate">${this.esc(b.title)}</div>
                                <div class="text-xs text-slate-400 line-clamp-2">${this.esc(b.message)}</div>
                                <div class="text-[10px] text-slate-500 mt-1">${time} • ${this.esc(b.sentBy)}</div>
                            </div>
                            <button onclick="admin.resendBroadcast('${b.id}')" class="text-slate-400 hover:text-white p-1" title="Resend">
                                <i class="ph-bold ph-arrow-clockwise"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            historyEl.innerHTML = '<div class="text-center text-red-400 text-sm py-10">Error loading history</div>';
        }
    }

    async resendBroadcast(id) {
        try {
            const snap = await this.db.ref(`broadcasts/${id}`).once('value');
            if (!snap.exists()) return;

            const broadcast = snap.val();
            document.getElementById('broadcast-title').value = broadcast.title || '';
            document.getElementById('broadcast-message').value = broadcast.message || '';
            this.setBroadcastType(broadcast.type || 'announcement');
            this.updateBroadcastPreview();

            this.toast('Broadcast loaded - edit and send again', 'info');
        } catch (error) {
            this.toast('Failed to load broadcast', 'error');
        }
    }

    async clearActiveBroadcast() {
        await this.db.ref('activeBroadcast').remove();
        this.toast('Active broadcast cleared', 'success');
    }

    // ECONOMY MODULE
    async renderEconomy(el) {
        el.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left Column: Stats & Quick Actions -->
                <div class="lg:col-span-2 space-y-6">
                    <!-- Economy Stats -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="glass p-4 rounded-xl border border-white/5">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="ph-fill ph-coins text-yellow-400"></i>
                                <span class="text-xs text-slate-400">Total Coins</span>
                            </div>
                            <div class="text-2xl font-bold text-white" id="eco-total-coins">--</div>
                        </div>
                        <div class="glass p-4 rounded-xl border border-white/5">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="ph-fill ph-chart-line-up text-emerald-400"></i>
                                <span class="text-xs text-slate-400">Avg Wealth</span>
                            </div>
                            <div class="text-2xl font-bold text-white" id="eco-avg-wealth">--</div>
                        </div>
                        <div class="glass p-4 rounded-xl border border-white/5">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="ph-fill ph-crown text-purple-400"></i>
                                <span class="text-xs text-slate-400">Richest User</span>
                            </div>
                            <div class="text-lg font-bold text-white truncate" id="eco-richest">--</div>
                        </div>
                        <div class="glass p-4 rounded-xl border border-white/5">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="ph-fill ph-lightning text-amber-400"></i>
                                <span class="text-xs text-slate-400">Multiplier</span>
                            </div>
                            <div class="text-2xl font-bold text-white" id="eco-multiplier">1x</div>
                        </div>
                    </div>
                    
                    <!-- Gift Coins -->
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-gift text-pink-400"></i> Gift Coins
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label class="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Recipient</label>
                                <select id="gift-recipient" class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none">
                                    <option value="all">🌍 All Users</option>
                                    <option value="online">🟢 Online Users Only</option>
                                    <option value="specific">👤 Specific User</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Amount</label>
                                <input type="number" id="gift-amount" placeholder="Enter amount..." min="1" class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none">
                            </div>
                        </div>
                        <div id="specific-user-input" class="mb-4 hidden">
                            <label class="text-xs text-slate-400 uppercase tracking-wider mb-2 block">User Email/ID</label>
                            <input type="text" id="gift-user-id" placeholder="Enter user email or UID..." class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-3 text-white outline-none">
                        </div>
                        <div class="flex gap-3">
                            <button onclick="admin.sendGiftCoins()" class="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                                <i class="ph-fill ph-paper-plane-tilt"></i> Send Gift
                            </button>
                            <button onclick="admin.previewGift()" class="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all">
                                <i class="ph-bold ph-eye"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Economy Events -->
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-sparkle text-amber-400"></i> Economy Events
                        </h3>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <button onclick="admin.startEconomyEvent('double_coins')" class="eco-event-btn p-3 rounded-xl bg-slate-800/50 border border-white/10 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all text-center" data-event="double_coins">
                                <div class="text-2xl mb-1">💰</div>
                                <div class="text-xs font-bold text-white">2x Coins</div>
                                <div class="text-[10px] text-slate-400">Earnings</div>
                            </button>
                            <button onclick="admin.startEconomyEvent('triple_xp')" class="eco-event-btn p-3 rounded-xl bg-slate-800/50 border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-center" data-event="triple_xp">
                                <div class="text-2xl mb-1">⭐</div>
                                <div class="text-xs font-bold text-white">3x XP</div>
                                <div class="text-[10px] text-slate-400">Experience</div>
                            </button>
                            <button onclick="admin.startEconomyEvent('happy_hour')" class="eco-event-btn p-3 rounded-xl bg-slate-800/50 border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/10 transition-all text-center" data-event="happy_hour">
                                <div class="text-2xl mb-1">🎉</div>
                                <div class="text-xs font-bold text-white">Happy Hour</div>
                                <div class="text-[10px] text-slate-400">+50% All</div>
                            </button>
                            <button onclick="admin.startEconomyEvent('sale')" class="eco-event-btn p-3 rounded-xl bg-slate-800/50 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-center" data-event="sale">
                                <div class="text-2xl mb-1">🏷️</div>
                                <div class="text-xs font-bold text-white">50% Sale</div>
                                <div class="text-[10px] text-slate-400">Shop Items</div>
                            </button>
                        </div>
                        <div class="flex gap-3">
                            <div class="flex-1">
                                <label class="text-xs text-slate-400 mb-1 block">Duration</label>
                                <select id="event-duration" class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none">
                                    <option value="30">30 minutes</option>
                                    <option value="60" selected>1 hour</option>
                                    <option value="180">3 hours</option>
                                    <option value="360">6 hours</option>
                                    <option value="1440">24 hours</option>
                                </select>
                            </div>
                            <button onclick="admin.stopAllEvents()" class="px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all text-sm">
                                <i class="ph-bold ph-stop"></i> Stop All
                            </button>
                        </div>
                    </div>
                    
                    <!-- Coin Multiplier -->
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-lightning text-yellow-400"></i> Global Multiplier
                        </h3>
                        <div class="flex items-center gap-4">
                            <input type="range" id="multiplier-slider" min="0.5" max="5" step="0.5" value="1" class="flex-1 accent-yellow-500" onchange="admin.updateMultiplierPreview()">
                            <div class="text-2xl font-bold text-yellow-400 w-16 text-center" id="multiplier-preview">1x</div>
                            <button onclick="admin.setGlobalMultiplier()" class="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-all">
                                Apply
                            </button>
                        </div>
                        <div class="text-xs text-slate-500 mt-2">Affects all coin earnings globally</div>
                    </div>
                </div>
                
                <!-- Right Column: Active Events & Transactions -->
                <div class="space-y-6">
                    <!-- Active Events -->
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-timer text-emerald-400"></i> Active Events
                        </h3>
                        <div id="active-events-list" class="space-y-2">
                            <div class="text-center text-slate-500 text-sm py-4">No active events</div>
                        </div>
                    </div>
                    
                    <!-- Recent Transactions -->
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-scroll text-blue-400"></i> Recent Admin Actions
                        </h3>
                        <div id="eco-transactions" class="space-y-2 max-h-64 overflow-y-auto custom-scroll">
                            <div class="text-center text-slate-500 text-sm py-4">Loading...</div>
                        </div>
                    </div>
                    
                    <!-- Top Earners -->
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-trophy text-yellow-400"></i> Top Earners
                        </h3>
                        <div id="top-earners" class="space-y-2">
                            <div class="text-center text-slate-500 text-sm py-4">Loading...</div>
                        </div>
                    </div>
                    
                    <!-- Danger Zone -->
                    <div class="glass rounded-2xl border border-red-500/20 p-6 bg-red-500/5">
                        <h3 class="font-bold text-red-400 mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-warning text-red-400"></i> Danger Zone
                        </h3>
                        <div class="space-y-2">
                            <button onclick="admin.resetAllCoins()" class="w-full p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-sm transition-all">
                                <i class="ph-bold ph-arrow-counter-clockwise mr-2"></i> Reset Cash to 1000
                            </button>
                            <button onclick="admin.resetAllDiamonds()" class="w-full p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-sm transition-all">
                                <i class="ph-bold ph-diamond mr-2"></i> Reset Diamonds to 5
                            </button>
                            <div class="border-t border-red-500/20 my-3"></div>
                            <button onclick="admin.wipeEconomy('cash')" class="w-full p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm transition-all">
                                <i class="ph-bold ph-coins mr-2"></i> Wipe All Cash (Set to 0)
                            </button>
                            <button onclick="admin.wipeEconomy('diamonds')" class="w-full p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm transition-all">
                                <i class="ph-bold ph-diamond mr-2"></i> Wipe All Diamonds (Set to 0)
                            </button>
                            <button onclick="admin.wipeEconomy('both')" class="w-full p-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-300 text-sm transition-all font-bold">
                                <i class="ph-bold ph-trash mr-2"></i> ⚠️ WIPE ALL (Cash + Diamonds)
                            </button>
                            <div class="border-t border-red-500/20 my-3"></div>
                            <button onclick="admin.wipeAllAccounts()" class="w-full p-4 rounded-lg bg-gradient-to-r from-red-600/30 to-orange-600/30 hover:from-red-600/50 hover:to-orange-600/50 border-2 border-red-500/50 text-white text-sm transition-all font-bold">
                                <i class="ph-bold ph-skull mr-2"></i> ☠️ NUCLEAR: WIPE ALL ACCOUNTS
                                <div class="text-[10px] text-red-300 mt-1 font-normal">Resets ALL player data (furniture, upgrades, progress)</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;

        this.loadEconomyStats();
        this.loadActiveEvents();
        this.loadEconomyTransactions();
        this.loadTopEarners();
        this.setupGiftRecipientToggle();
    }

    setupGiftRecipientToggle() {
        const select = document.getElementById('gift-recipient');
        const specificInput = document.getElementById('specific-user-input');
        select?.addEventListener('change', () => {
            specificInput.classList.toggle('hidden', select.value !== 'specific');
        });
    }

    async loadEconomyStats() {
        try {
            const usersSnap = await this.firestore.collection('users').get();
            let totalCoins = 0;
            let richestUser = { name: 'N/A', coins: 0 };
            let userCount = 0;

            usersSnap.forEach(doc => {
                const data = doc.data();
                const coins = data.coins || 0;
                totalCoins += coins;
                userCount++;
                if (coins > richestUser.coins) {
                    richestUser = { name: data.displayName || data.email?.split('@')[0] || 'Unknown', coins };
                }
            });

            const avgWealth = userCount > 0 ? Math.round(totalCoins / userCount) : 0;

            document.getElementById('eco-total-coins').textContent = this.formatNumber(totalCoins);
            document.getElementById('eco-avg-wealth').textContent = this.formatNumber(avgWealth);
            document.getElementById('eco-richest').textContent = `${richestUser.name} (${this.formatNumber(richestUser.coins)})`;

            // Load multiplier
            const multSnap = await this.db.ref('economy/multiplier').once('value');
            const multiplier = multSnap.val() || 1;
            document.getElementById('eco-multiplier').textContent = `${multiplier}x`;
            document.getElementById('multiplier-slider').value = multiplier;
            document.getElementById('multiplier-preview').textContent = `${multiplier}x`;

        } catch (e) {
            console.error('Failed to load economy stats:', e);
        }
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    async loadActiveEvents() {
        const listEl = document.getElementById('active-events-list');
        if (!listEl) return;

        try {
            const snap = await this.db.ref('economy/events').once('value');
            if (!snap.exists()) {
                listEl.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">No active events</div>';
                return;
            }

            const events = snap.val();
            const now = Date.now();
            const activeEvents = Object.entries(events).filter(([k, v]) => v.endsAt > now);

            if (activeEvents.length === 0) {
                listEl.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">No active events</div>';
                return;
            }

            const eventIcons = {
                double_coins: '💰',
                triple_xp: '⭐',
                happy_hour: '🎉',
                sale: '🏷️'
            };

            const eventColors = {
                double_coins: 'border-yellow-500/30 bg-yellow-500/10',
                triple_xp: 'border-purple-500/30 bg-purple-500/10',
                happy_hour: 'border-pink-500/30 bg-pink-500/10',
                sale: 'border-emerald-500/30 bg-emerald-500/10'
            };

            listEl.innerHTML = activeEvents.map(([key, event]) => {
                const remaining = Math.max(0, Math.ceil((event.endsAt - now) / 60000));
                const icon = eventIcons[event.type] || '🎮';
                const color = eventColors[event.type] || 'border-slate-500/30';
                return `
                    <div class="p-3 rounded-lg border ${color} flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">${icon}</span>
                            <div>
                                <div class="text-sm font-bold text-white">${event.name}</div>
                                <div class="text-xs text-slate-400">${remaining}m remaining</div>
                            </div>
                        </div>
                        <button onclick="admin.stopEvent('${key}')" class="text-red-400 hover:text-red-300 p-1">
                            <i class="ph-bold ph-x"></i>
                        </button>
                    </div>
                `;
            }).join('');

        } catch (e) {
            listEl.innerHTML = '<div class="text-center text-red-400 text-sm py-4">Error loading events</div>';
        }
    }

    async loadEconomyTransactions() {
        const listEl = document.getElementById('eco-transactions');
        if (!listEl) return;

        try {
            const snap = await this.db.ref('economy/transactions').orderByChild('timestamp').limitToLast(20).once('value');
            if (!snap.exists()) {
                listEl.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">No transactions yet</div>';
                return;
            }

            const transactions = [];
            snap.forEach(child => transactions.unshift({ id: child.key, ...child.val() }));

            listEl.innerHTML = transactions.map(t => {
                const time = t.timestamp ? new Date(t.timestamp).toLocaleString() : 'Unknown';
                const icon = t.type === 'gift' ? '🎁' : t.type === 'event' ? '🎉' : t.type === 'reset' ? '🔄' : '💫';
                return `
                    <div class="p-2 rounded-lg bg-slate-800/30 border border-white/5">
                        <div class="flex items-center gap-2">
                            <span>${icon}</span>
                            <span class="text-xs text-white flex-1">${this.esc(t.description)}</span>
                        </div>
                        <div class="text-[10px] text-slate-500 mt-1">${time} • ${this.esc(t.admin)}</div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            listEl.innerHTML = '<div class="text-center text-red-400 text-sm py-4">Error loading</div>';
        }
    }

    async loadTopEarners() {
        const listEl = document.getElementById('top-earners');
        if (!listEl) return;

        try {
            const usersSnap = await this.firestore.collection('users').orderBy('coins', 'desc').limit(5).get();

            if (usersSnap.empty) {
                listEl.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">No users</div>';
                return;
            }

            const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
            let html = '';
            let i = 0;

            usersSnap.forEach(doc => {
                const data = doc.data();
                html += `
                    <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
                        <span class="text-lg">${medals[i]}</span>
                        <span class="text-sm text-white flex-1 truncate">${this.esc(data.displayName || 'Unknown')}</span>
                        <span class="text-sm font-bold text-yellow-400">${this.formatNumber(data.coins || 0)}</span>
                    </div>
                `;
                i++;
            });

            listEl.innerHTML = html;

        } catch (e) {
            listEl.innerHTML = '<div class="text-center text-red-400 text-sm py-4">Error loading</div>';
        }
    }

    updateMultiplierPreview() {
        const slider = document.getElementById('multiplier-slider');
        const preview = document.getElementById('multiplier-preview');
        if (slider && preview) {
            preview.textContent = `${slider.value}x`;
        }
    }

    async setGlobalMultiplier() {
        const slider = document.getElementById('multiplier-slider');
        const value = parseFloat(slider?.value || 1);

        try {
            await this.db.ref('economy/multiplier').set(value);
            document.getElementById('eco-multiplier').textContent = `${value}x`;

            await this.logTransaction('multiplier', `Set global multiplier to ${value}x`);
            this.toast(`✨ Multiplier set to ${value}x`, 'success');

        } catch (e) {
            this.toast('Failed to set multiplier', 'error');
        }
    }

    async sendGiftCoins() {
        const recipient = document.getElementById('gift-recipient')?.value;
        const amount = parseInt(document.getElementById('gift-amount')?.value);
        const specificUser = document.getElementById('gift-user-id')?.value?.trim();

        if (!amount || amount <= 0) {
            this.toast('Please enter a valid amount', 'error');
            return;
        }

        if (recipient === 'specific' && !specificUser) {
            this.toast('Please enter a user email or ID', 'error');
            return;
        }

        try {
            if (recipient === 'all') {
                // Gift to all users
                const usersSnap = await this.firestore.collection('users').get();
                const batch = this.firestore.batch();
                let count = 0;

                usersSnap.forEach(doc => {
                    batch.update(doc.ref, { coins: firebase.firestore.FieldValue.increment(amount) });
                    count++;
                });

                await batch.commit();
                await this.logTransaction('gift', `Gifted ${amount} coins to ALL ${count} users`);

                // Broadcast the gift
                await this.db.ref('activeBroadcast').set({
                    type: 'reward',
                    title: '🎁 GIFT',
                    message: `Gift from admin! Everyone received ${amount} coins!`,
                    duration: 30,
                    sentAt: Date.now(),
                    expiresAt: Date.now() + 30000
                });

                this.toast(`🎁 Gifted ${amount} coins to ${count} users!`, 'success');

            } else if (recipient === 'online') {
                // Gift to online users only
                const onlineSnap = await this.db.ref('onlineUsers').once('value');
                if (!onlineSnap.exists()) {
                    this.toast('No users online', 'error');
                    return;
                }

                const onlineUsers = Object.keys(onlineSnap.val());
                const batch = this.firestore.batch();

                for (const uid of onlineUsers) {
                    const userRef = this.firestore.collection('users').doc(uid);
                    batch.update(userRef, { coins: firebase.firestore.FieldValue.increment(amount) });
                }

                await batch.commit();
                await this.logTransaction('gift', `Gifted ${amount} coins to ${onlineUsers.length} online users`);

                await this.db.ref('activeBroadcast').set({
                    type: 'reward',
                    title: '🎁 GIFT',
                    message: `Gift from admin! Online players received ${amount} coins!`,
                    duration: 30,
                    sentAt: Date.now(),
                    expiresAt: Date.now() + 30000
                });

                this.toast(`🎁 Gifted ${amount} coins to ${onlineUsers.length} online users!`, 'success');

            } else if (recipient === 'specific') {
                // Gift to specific user
                let userDoc;

                // Try by email first
                const byEmail = await this.firestore.collection('users').where('email', '==', specificUser).get();
                if (!byEmail.empty) {
                    userDoc = byEmail.docs[0];
                } else {
                    // Try by UID
                    const byUid = await this.firestore.collection('users').doc(specificUser).get();
                    if (byUid.exists) {
                        userDoc = byUid;
                    }
                }

                if (!userDoc) {
                    this.toast('User not found', 'error');
                    return;
                }

                await userDoc.ref.update({ coins: firebase.firestore.FieldValue.increment(amount) });
                await this.logTransaction('gift', `Gifted ${amount} coins to ${userDoc.data().displayName || specificUser}`);

                this.toast(`🎁 Gifted ${amount} coins to ${userDoc.data().displayName || specificUser}!`, 'success');
            }

            // Clear inputs and refresh
            document.getElementById('gift-amount').value = '';
            document.getElementById('gift-user-id').value = '';
            this.loadEconomyStats();
            this.loadEconomyTransactions();
            this.loadTopEarners();

        } catch (e) {
            console.error('Gift error:', e);
            this.toast('Failed to send gift: ' + e.message, 'error');
        }
    }

    async previewGift() {
        const recipient = document.getElementById('gift-recipient')?.value;
        const amount = parseInt(document.getElementById('gift-amount')?.value) || 0;

        let targetCount = 0;
        try {
            if (recipient === 'all') {
                const snap = await this.firestore.collection('users').get();
                targetCount = snap.size;
            } else if (recipient === 'online') {
                const snap = await this.db.ref('onlineUsers').once('value');
                targetCount = snap.exists() ? Object.keys(snap.val()).length : 0;
            } else {
                targetCount = 1;
            }
        } catch (e) { }

        const total = amount * targetCount;
        this.toast(`Preview: ${this.formatNumber(amount)} coins × ${targetCount} users = ${this.formatNumber(total)} total`, 'info');
    }

    async startEconomyEvent(eventType) {
        const duration = parseInt(document.getElementById('event-duration')?.value || 60);

        const eventNames = {
            double_coins: '2x Coins',
            triple_xp: '3x XP',
            happy_hour: 'Happy Hour',
            sale: '50% Sale'
        };

        const eventData = {
            type: eventType,
            name: eventNames[eventType] || eventType,
            startedAt: Date.now(),
            endsAt: Date.now() + (duration * 60 * 1000),
            startedBy: this.user?.email || 'Admin'
        };

        try {
            await this.db.ref(`economy/events/${eventType}`).set(eventData);
            await this.logTransaction('event', `Started ${eventNames[eventType]} event for ${duration} minutes`);

            // Broadcast the event
            const eventIcons = { double_coins: '💰', triple_xp: '⭐', happy_hour: '🎉', sale: '🏷️' };
            await this.db.ref('activeBroadcast').set({
                type: 'event',
                title: `${eventIcons[eventType]} ${eventNames[eventType]} EVENT!`,
                message: `${eventNames[eventType]} is now active for ${duration} minutes!`,
                duration: 30,
                sentAt: Date.now(),
                expiresAt: Date.now() + 30000
            });

            this.toast(`🎉 Started ${eventNames[eventType]} event!`, 'success');
            this.loadActiveEvents();

        } catch (e) {
            this.toast('Failed to start event', 'error');
        }
    }

    async stopEvent(eventKey) {
        try {
            await this.db.ref(`economy/events/${eventKey}`).remove();
            await this.logTransaction('event', `Stopped ${eventKey} event`);
            this.toast('Event stopped', 'success');
            this.loadActiveEvents();
        } catch (e) {
            this.toast('Failed to stop event', 'error');
        }
    }

    async stopAllEvents() {
        if (!confirm('Stop all active events?')) return;

        try {
            await this.db.ref('economy/events').remove();
            await this.logTransaction('event', 'Stopped all events');
            this.toast('All events stopped', 'success');
            this.loadActiveEvents();
        } catch (e) {
            this.toast('Failed to stop events', 'error');
        }
    }

    async resetAllCoins() {
        const confirmed = await this.showConfirmModal({
            title: 'Reset All Cash',
            message: 'This will reset ALL users cash to 1000. This cannot be undone!',
            confirmText: 'Reset Cash',
            type: 'warning',
            requireInput: true,
            inputPlaceholder: 'Type RESET',
            inputMatch: 'RESET'
        });

        if (!confirmed) {
            this.toast('Reset cancelled', 'info');
            return;
        }

        try {
            // Update SAVES collection (where game data is stored)
            const savesSnap = await this.firestore.collection('saves').get();
            const batch = this.firestore.batch();
            let count = 0;

            savesSnap.forEach(doc => {
                batch.update(doc.ref, { cash: 1000 });
                count++;
            });

            await batch.commit();

            // Trigger force reload on all clients
            await this.db.ref('economy/forceReload').set(Date.now());

            await this.logTransaction('reset', `Reset all ${count} game saves to 1000 cash`);

            this.toast(`🔄 Reset ${count} users to 1000 cash`, 'success');
            this.loadEconomyStats();
            this.loadTopEarners();

        } catch (e) {
            this.toast('Failed to reset: ' + e.message, 'error');
        }
    }

    async resetAllDiamonds() {
        const confirmed = await this.showConfirmModal({
            title: 'Reset All Diamonds',
            message: 'This will reset ALL users diamonds to 5. This cannot be undone!',
            confirmText: 'Reset Diamonds',
            type: 'warning',
            requireInput: true,
            inputPlaceholder: 'Type RESET',
            inputMatch: 'RESET'
        });

        if (!confirmed) {
            this.toast('Reset cancelled', 'info');
            return;
        }

        try {
            // Update SAVES collection (where game data is stored)
            const savesSnap = await this.firestore.collection('saves').get();
            const batch = this.firestore.batch();
            let count = 0;

            savesSnap.forEach(doc => {
                batch.update(doc.ref, { diamonds: 5 });
                count++;
            });

            await batch.commit();

            // Trigger force reload on all clients
            await this.db.ref('economy/forceReload').set(Date.now());

            await this.logTransaction('reset', `Reset all ${count} game saves to 5 diamonds`);

            this.toast(`💎 Reset ${count} users to 5 diamonds`, 'success');
            this.loadEconomyStats();
            this.loadTopEarners();

        } catch (e) {
            this.toast('Failed to reset: ' + e.message, 'error');
        }
    }

    async wipeEconomy(type = 'both') {
        const typeLabels = {
            cash: 'CASH',
            diamonds: 'DIAMONDS',
            both: 'CASH AND DIAMONDS'
        };

        const typeIcons = {
            cash: '💰',
            diamonds: '💎',
            both: '⚠️'
        };

        const confirmed = await this.showConfirmModal({
            title: `Wipe All ${typeLabels[type]}`,
            message: `This will set EVERYONE's ${typeLabels[type].toLowerCase()} to ZERO. This is IRREVERSIBLE!`,
            confirmText: `${typeIcons[type]} Wipe ${typeLabels[type]}`,
            type: 'danger',
            requireInput: true,
            inputPlaceholder: 'Type WIPE',
            inputMatch: 'WIPE'
        });

        if (!confirmed) {
            this.toast('Wipe cancelled', 'info');
            return;
        }

        try {
            // Update SAVES collection (where game data is stored)
            const savesSnap = await this.firestore.collection('saves').get();
            const batch = this.firestore.batch();
            let count = 0;

            savesSnap.forEach(doc => {
                if (type === 'cash') {
                    batch.update(doc.ref, { cash: 0 });
                } else if (type === 'diamonds') {
                    batch.update(doc.ref, { diamonds: 0 });
                } else {
                    batch.update(doc.ref, { cash: 0, diamonds: 0 });
                }
                count++;
            });

            await batch.commit();

            // Trigger force reload on all clients
            await this.db.ref('economy/forceReload').set(Date.now());

            await this.logTransaction('reset', `WIPED ${typeLabels[type].toLowerCase()} for ${count} users to 0`);

            this.toast(`💀 Wiped ${typeLabels[type].toLowerCase()} for ${count} users to 0`, 'success');
            this.loadEconomyStats();
            this.loadTopEarners();

        } catch (e) {
            this.toast('Failed to wipe: ' + e.message, 'error');
        }
    }

    async logTransaction(type, description) {
        await this.db.ref('economy/transactions').push({
            type,
            description,
            admin: this.user?.email || 'Unknown',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        this.loadEconomyTransactions();
    }

    // ============================
    // ADVANCED LOGS MODULE
    // ============================

    async log(type, message, metadata = {}) {
        try {
            await this.db.ref('adminLogs').push({
                type,
                message,
                admin: this.user?.email || 'System',
                metadata,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                userAgent: navigator.userAgent,
                sessionId: this.sessionId || 'unknown'
            });
        } catch (e) {
            console.error('Failed to log:', e);
        }
    }

    async renderLogs(el) {
        this.logsFilter = 'all';
        this.logsSearch = '';
        this.logsTimeRange = '24h';
        this.logsData = [];
        this.logsListeners = [];

        el.innerHTML = `
            <div class="space-y-6">
                <!-- Logs Header with Stats -->
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div class="glass p-4 rounded-xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                        <div class="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform"></div>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <i class="ph-fill ph-list-bullets text-xl"></i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-white" id="logs-total">--</div>
                                <div class="text-xs text-slate-400">Total Logs</div>
                            </div>
                        </div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                        <div class="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform"></div>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <i class="ph-fill ph-check-circle text-xl"></i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-white" id="logs-info">--</div>
                                <div class="text-xs text-slate-400">Info</div>
                            </div>
                        </div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
                        <div class="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform"></div>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                                <i class="ph-fill ph-warning text-xl"></i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-white" id="logs-warning">--</div>
                                <div class="text-xs text-slate-400">Warnings</div>
                            </div>
                        </div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 relative overflow-hidden group hover:border-red-500/30 transition-all">
                        <div class="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform"></div>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
                                <i class="ph-fill ph-x-circle text-xl"></i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-white" id="logs-error">--</div>
                                <div class="text-xs text-slate-400">Errors</div>
                            </div>
                        </div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                        <div class="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform"></div>
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                                <i class="ph-fill ph-user-circle text-xl"></i>
                            </div>
                            <div>
                                <div class="text-2xl font-bold text-white" id="logs-admins">--</div>
                                <div class="text-xs text-slate-400">Active Admins</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Logs Controls -->
                <div class="glass rounded-2xl border border-white/5 p-4">
                    <div class="flex flex-wrap gap-4 items-center justify-between">
                        <!-- Search -->
                        <div class="flex-1 min-w-[250px]">
                            <div class="relative">
                                <i class="ph-bold ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                                <input type="text" id="logs-search" placeholder="Search logs by message, admin, type..." 
                                    class="w-full bg-slate-800/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all">
                            </div>
                        </div>
                        
                        <!-- Filter Buttons -->
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="admin.setLogsFilter('all')" class="logs-filter-btn active px-4 py-2 rounded-xl text-sm font-medium transition-all" data-filter="all">
                                <i class="ph-fill ph-stack mr-1"></i> All
                            </button>
                            <button onclick="admin.setLogsFilter('info')" class="logs-filter-btn px-4 py-2 rounded-xl text-sm font-medium transition-all" data-filter="info">
                                <i class="ph-fill ph-info mr-1"></i> Info
                            </button>
                            <button onclick="admin.setLogsFilter('warning')" class="logs-filter-btn px-4 py-2 rounded-xl text-sm font-medium transition-all" data-filter="warning">
                                <i class="ph-fill ph-warning mr-1"></i> Warning
                            </button>
                            <button onclick="admin.setLogsFilter('error')" class="logs-filter-btn px-4 py-2 rounded-xl text-sm font-medium transition-all" data-filter="error">
                                <i class="ph-fill ph-x-circle mr-1"></i> Error
                            </button>
                            <button onclick="admin.setLogsFilter('action')" class="logs-filter-btn px-4 py-2 rounded-xl text-sm font-medium transition-all" data-filter="action">
                                <i class="ph-fill ph-lightning mr-1"></i> Actions
                            </button>
                            <button onclick="admin.setLogsFilter('security')" class="logs-filter-btn px-4 py-2 rounded-xl text-sm font-medium transition-all" data-filter="security">
                                <i class="ph-fill ph-shield-check mr-1"></i> Security
                            </button>
                        </div>
                        
                        <!-- Time Range -->
                        <div class="flex gap-2">
                            <select id="logs-time-range" onchange="admin.setLogsTimeRange(this.value)" 
                                class="bg-slate-800/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                                <option value="1h">Last Hour</option>
                                <option value="24h" selected>Last 24 Hours</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="all">All Time</option>
                            </select>
                            
                            <!-- Actions -->
                            <button onclick="admin.refreshLogs()" class="p-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all" title="Refresh">
                                <i class="ph-bold ph-arrows-clockwise"></i>
                            </button>
                            <button onclick="admin.exportLogs()" class="p-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all" title="Export CSV">
                                <i class="ph-bold ph-download-simple"></i>
                            </button>
                            <button onclick="admin.clearAllLogs()" class="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all" title="Clear All Logs">
                                <i class="ph-bold ph-trash"></i>
                            </button>
                            <button onclick="admin.generateTestLogs()" class="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all" title="Generate Test Logs">
                                <i class="ph-bold ph-magic-wand"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Main Logs Content -->
                <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <!-- Logs List (Main Area) -->
                    <div class="lg:col-span-3 glass rounded-2xl border border-white/5 overflow-hidden">
                        <div class="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                            <div class="flex items-center gap-3">
                                <h3 class="font-bold text-white flex items-center gap-2">
                                    <i class="ph-fill ph-scroll text-indigo-400"></i> Activity Logs
                                </h3>
                                <span class="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span class="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span> Live
                                </span>
                            </div>
                            <div class="text-xs text-slate-500" id="logs-showing">Showing 0 logs</div>
                        </div>
                        <div id="logs-container" class="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                            <div class="p-8 text-center text-slate-500">
                                <div class="spinner mx-auto mb-3"></div>
                                Loading logs...
                            </div>
                        </div>
                    </div>
                    
                    <!-- Sidebar -->
                    <div class="space-y-6">
                        <!-- Recent Admin Activity -->
                        <div class="glass rounded-2xl border border-white/5 p-4">
                            <h4 class="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                                <i class="ph-fill ph-users-three text-purple-400"></i> Admin Activity
                            </h4>
                            <div id="logs-admin-activity" class="space-y-3">
                                <div class="text-center text-slate-500 text-xs py-4">Loading...</div>
                            </div>
                        </div>
                        
                        <!-- Log Types Breakdown -->
                        <div class="glass rounded-2xl border border-white/5 p-4">
                            <h4 class="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                                <i class="ph-fill ph-chart-pie text-cyan-400"></i> Log Breakdown
                            </h4>
                            <div id="logs-breakdown" class="space-y-3">
                                <div class="text-center text-slate-500 text-xs py-4">Loading...</div>
                            </div>
                        </div>
                        
                        <!-- Economy Transactions -->
                        <div class="glass rounded-2xl border border-white/5 p-4">
                            <h4 class="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                                <i class="ph-fill ph-coins text-yellow-400"></i> Economy Log
                            </h4>
                            <div id="logs-economy" class="space-y-2 max-h-[200px] overflow-y-auto">
                                <div class="text-center text-slate-500 text-xs py-4">Loading...</div>
                            </div>
                        </div>
                        
                        <!-- Quick Stats -->
                        <div class="glass rounded-2xl border border-white/5 p-4">
                            <h4 class="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                                <i class="ph-fill ph-clock-countdown text-emerald-400"></i> Peak Times
                            </h4>
                            <div id="logs-peak-times" class="space-y-2">
                                <div class="text-center text-slate-500 text-xs py-4">Analyzing...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .logs-filter-btn {
                    background: rgba(51, 65, 85, 0.5);
                    color: #94a3b8;
                    border: 1px solid transparent;
                }
                .logs-filter-btn:hover {
                    background: rgba(99, 102, 241, 0.1);
                    color: #a5b4fc;
                    border-color: rgba(99, 102, 241, 0.3);
                }
                .logs-filter-btn.active {
                    background: rgba(99, 102, 241, 0.2);
                    color: #a5b4fc;
                    border-color: rgba(99, 102, 241, 0.5);
                }
                .log-entry {
                    transition: all 0.2s ease;
                }
                .log-entry:hover {
                    background: rgba(99, 102, 241, 0.05);
                }
                .log-entry.expanded .log-details {
                    display: block;
                }
                .log-details {
                    display: none;
                }
            </style>
        `;

        // Add search listener
        document.getElementById('logs-search').addEventListener('input', (e) => {
            this.logsSearch = e.target.value.toLowerCase();
            this.renderLogsData();
        });

        // Load logs data
        this.loadLogs().then(() => {
            this.loadLogsStats();
            this.loadAdminActivity();
            this.loadPeakTimes();
        });
        this.loadEconomyLogs();
        this.setupLogsRealtime();
    }

    setupLogsRealtime() {
        // Listen for new admin logs in real-time
        if (this.logsRealtimeRef) this.logsRealtimeRef.off();
        this.logsRealtimeRef = this.db.ref('adminLogs').orderByChild('timestamp').startAt(Date.now());
        this.logsRealtimeRef.on('child_added', (snap) => {
            const log = snap.val();
            if (log && log.timestamp) {
                this.logsData.unshift({ id: snap.key, source: 'admin', ...log });
                this.renderLogsData();
                this.loadLogsStats();
            }
        });
    }

    loadPeakTimes() {
        const el = document.getElementById('logs-peak-times');
        if (!el) return;

        // Analyze logs by hour
        const hourCounts = {};
        this.logsData.forEach(log => {
            if (log.timestamp) {
                const hour = new Date(log.timestamp).getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
        });

        // Get top 5 hours
        const sorted = Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (sorted.length === 0) {
            el.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">Not enough data</div>';
            return;
        }

        const maxCount = sorted[0][1] || 1;

        el.innerHTML = sorted.map(([hour, count]) => {
            const pct = Math.round((count / maxCount) * 100);
            const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
            return `
                <div class="flex items-center gap-3">
                    <span class="text-xs text-slate-400 w-12">${hourLabel}</span>
                    <div class="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-500 rounded-full" style="width: ${pct}%"></div>
                    </div>
                    <span class="text-xs text-white font-medium w-8 text-right">${count}</span>
                </div>
            `;
        }).join('');
    }

    setLogsFilter(filter) {
        this.logsFilter = filter;
        document.querySelectorAll('.logs-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderLogsData();
    }

    setLogsTimeRange(range) {
        this.logsTimeRange = range;
        this.loadLogs();
    }

    getTimeRangeMs() {
        const now = Date.now();
        switch (this.logsTimeRange) {
            case '1h': return now - (60 * 60 * 1000);
            case '24h': return now - (24 * 60 * 60 * 1000);
            case '7d': return now - (7 * 24 * 60 * 60 * 1000);
            case '30d': return now - (30 * 24 * 60 * 60 * 1000);
            default: return 0;
        }
    }

    async loadLogs() {
        const container = document.getElementById('logs-container');
        if (!container) return;

        container.innerHTML = `<div class="p-8 text-center text-slate-500"><div class="spinner mx-auto mb-3"></div>Loading logs...</div>`;

        try {
            const allLogs = [];
            const minTime = this.getTimeRangeMs();

            // Load admin logs
            const adminLogsSnap = await this.db.ref('adminLogs').orderByChild('timestamp').limitToLast(500).once('value');
            if (adminLogsSnap.exists()) {
                adminLogsSnap.forEach(child => {
                    const log = child.val();
                    if (log.timestamp >= minTime || this.logsTimeRange === 'all') {
                        allLogs.push({ id: child.key, source: 'admin', ...log });
                    }
                });
            }

            // Load economy transactions
            const ecoSnap = await this.db.ref('economy/transactions').orderByChild('timestamp').limitToLast(200).once('value');
            if (ecoSnap.exists()) {
                ecoSnap.forEach(child => {
                    const log = child.val();
                    if (log.timestamp >= minTime || this.logsTimeRange === 'all') {
                        allLogs.push({
                            id: child.key,
                            source: 'economy',
                            type: 'action',
                            message: `[Economy] ${log.description}`,
                            admin: log.admin,
                            timestamp: log.timestamp,
                            metadata: { transactionType: log.type }
                        });
                    }
                });
            }

            // Load anticheat violations as security logs
            const acSnap = await this.db.ref('anticheat/violations').orderByChild('timestamp').limitToLast(100).once('value');
            if (acSnap.exists()) {
                acSnap.forEach(child => {
                    const log = child.val();
                    if (log.timestamp >= minTime || this.logsTimeRange === 'all') {
                        allLogs.push({
                            id: child.key,
                            source: 'anticheat',
                            type: 'security',
                            message: `[Security] ${log.type}: ${log.details || 'Violation detected'}`,
                            admin: log.userName || 'Unknown User',
                            timestamp: log.timestamp,
                            metadata: { violationType: log.type, severity: log.severity }
                        });
                    }
                });
            }

            // Load moderation actions
            const modSnap = await this.db.ref('moderationLogs').orderByChild('timestamp').limitToLast(100).once('value');
            if (modSnap.exists()) {
                modSnap.forEach(child => {
                    const log = child.val();
                    if (log.timestamp >= minTime || this.logsTimeRange === 'all') {
                        allLogs.push({
                            id: child.key,
                            source: 'moderation',
                            type: log.type || 'warning',
                            message: `[Moderation] ${log.action}: ${log.target || ''}`,
                            admin: log.admin,
                            timestamp: log.timestamp,
                            metadata: log
                        });
                    }
                });
            }

            // Sort by timestamp descending
            allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            this.logsData = allLogs;
            this.renderLogsData();

        } catch (e) {
            console.error('Failed to load logs:', e);
            container.innerHTML = `<div class="p-8 text-center text-red-400"><i class="ph-bold ph-warning mr-2"></i>Failed to load logs: ${e.message}</div>`;
        }
    }

    renderLogsData() {
        const container = document.getElementById('logs-container');
        if (!container) return;

        let filtered = this.logsData;

        // Apply type filter
        if (this.logsFilter !== 'all') {
            filtered = filtered.filter(log => log.type === this.logsFilter);
        }

        // Apply search filter
        if (this.logsSearch) {
            filtered = filtered.filter(log =>
                (log.message || '').toLowerCase().includes(this.logsSearch) ||
                (log.admin || '').toLowerCase().includes(this.logsSearch) ||
                (log.type || '').toLowerCase().includes(this.logsSearch) ||
                (log.source || '').toLowerCase().includes(this.logsSearch)
            );
        }

        // Update showing count
        const showingEl = document.getElementById('logs-showing');
        if (showingEl) showingEl.textContent = `Showing ${filtered.length} of ${this.logsData.length} logs`;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="p-12 text-center">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                        <i class="ph-fill ph-file-search text-3xl text-slate-600"></i>
                    </div>
                    <div class="text-slate-400 font-medium">No logs found</div>
                    <div class="text-slate-500 text-sm mt-1">Try adjusting your filters or time range</div>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.slice(0, 200).map((log, idx) => this.renderLogEntry(log, idx)).join('');
    }

    renderLogEntry(log, idx) {
        const typeConfig = {
            info: { icon: 'ph-info', color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
            warning: { icon: 'ph-warning', color: 'amber', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
            error: { icon: 'ph-x-circle', color: 'red', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
            action: { icon: 'ph-lightning', color: 'indigo', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
            security: { icon: 'ph-shield-warning', color: 'rose', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' }
        };

        const config = typeConfig[log.type] || typeConfig.info;
        const time = log.timestamp ? new Date(log.timestamp) : new Date();
        const timeAgo = this.getTimeAgo(time);
        const formattedTime = time.toLocaleString();

        const sourceLabels = {
            admin: { label: 'Admin', color: 'bg-purple-500/20 text-purple-400' },
            economy: { label: 'Economy', color: 'bg-yellow-500/20 text-yellow-400' },
            anticheat: { label: 'Security', color: 'bg-red-500/20 text-red-400' },
            moderation: { label: 'Moderation', color: 'bg-orange-500/20 text-orange-400' }
        };
        const source = sourceLabels[log.source] || { label: 'System', color: 'bg-slate-500/20 text-slate-400' };

        return `
            <div class="log-entry p-4 cursor-pointer" onclick="admin.toggleLogDetails('log-${idx}')">
                <div class="flex items-start gap-4">
                    <!-- Type Icon -->
                    <div class="w-10 h-10 rounded-xl ${config.bg} ${config.border} border flex items-center justify-center shrink-0">
                        <i class="ph-fill ${config.icon} ${config.text} text-lg"></i>
                    </div>
                    
                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-4 mb-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-xs font-medium px-2 py-0.5 rounded-full ${source.color}">${source.label}</span>
                                <span class="text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.text} capitalize">${log.type || 'info'}</span>
                            </div>
                            <div class="text-xs text-slate-500 shrink-0" title="${formattedTime}">${timeAgo}</div>
                        </div>
                        <div class="text-sm text-white font-medium mb-1 break-words">${this.esc(log.message || 'No message')}</div>
                        <div class="flex items-center gap-3 text-xs text-slate-500">
                            <span class="flex items-center gap-1">
                                <i class="ph-bold ph-user"></i>
                                ${this.esc(log.admin || 'System')}
                            </span>
                            ${log.metadata?.transactionType ? `<span class="flex items-center gap-1"><i class="ph-bold ph-tag"></i>${log.metadata.transactionType}</span>` : ''}
                        </div>
                        
                        <!-- Expandable Details -->
                        <div class="log-details mt-3 pt-3 border-t border-white/5" id="log-${idx}">
                            <div class="grid grid-cols-2 gap-3 text-xs">
                                <div class="bg-slate-800/50 rounded-lg p-2">
                                    <div class="text-slate-500 mb-1">Timestamp</div>
                                    <div class="text-white font-mono">${formattedTime}</div>
                                </div>
                                <div class="bg-slate-800/50 rounded-lg p-2">
                                    <div class="text-slate-500 mb-1">Source</div>
                                    <div class="text-white">${log.source || 'Unknown'}</div>
                                </div>
                                ${log.metadata ? `
                                <div class="col-span-2 bg-slate-800/50 rounded-lg p-2">
                                    <div class="text-slate-500 mb-1">Metadata</div>
                                    <pre class="text-white font-mono text-[10px] overflow-x-auto">${JSON.stringify(log.metadata, null, 2)}</pre>
                                </div>` : ''}
                            </div>
                            <div class="flex gap-2 mt-3">
                                <button onclick="event.stopPropagation(); admin.copyLog('${log.id}')" class="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all">
                                    <i class="ph-bold ph-copy mr-1"></i> Copy
                                </button>
                                <button onclick="event.stopPropagation(); admin.deleteLog('${log.source}', '${log.id}')" class="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                                    <i class="ph-bold ph-trash mr-1"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Expand Arrow -->
                    <div class="text-slate-500 shrink-0">
                        <i class="ph-bold ph-caret-down text-sm"></i>
                    </div>
                </div>
            </div>
        `;
    }

    toggleLogDetails(id) {
        const el = document.getElementById(id);
        if (el) {
            el.parentElement.parentElement.parentElement.classList.toggle('expanded');
        }
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    async loadLogsStats() {
        try {
            // Count logs by type
            const counts = { total: 0, info: 0, warning: 0, error: 0, action: 0, security: 0 };
            const admins = new Set();

            this.logsData.forEach(log => {
                counts.total++;
                counts[log.type] = (counts[log.type] || 0) + 1;
                if (log.admin) admins.add(log.admin);
            });

            // Update UI
            const update = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };

            update('logs-total', counts.total);
            update('logs-info', counts.info);
            update('logs-warning', counts.warning);
            update('logs-error', counts.error);
            update('logs-admins', admins.size);

            // Render breakdown
            this.renderLogsBreakdown(counts);

        } catch (e) {
            console.error('Failed to load logs stats:', e);
        }
    }

    renderLogsBreakdown(counts) {
        const el = document.getElementById('logs-breakdown');
        if (!el) return;

        const total = counts.total || 1;
        const types = [
            { label: 'Info', count: counts.info || 0, color: 'emerald' },
            { label: 'Actions', count: counts.action || 0, color: 'indigo' },
            { label: 'Security', count: counts.security || 0, color: 'rose' },
            { label: 'Warnings', count: counts.warning || 0, color: 'amber' },
            { label: 'Errors', count: counts.error || 0, color: 'red' }
        ];

        el.innerHTML = types.map(t => {
            const pct = Math.round((t.count / total) * 100);
            return `
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-slate-400">${t.label}</span>
                        <span class="text-white font-medium">${t.count}</span>
                    </div>
                    <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-${t.color}-500 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadAdminActivity() {
        const el = document.getElementById('logs-admin-activity');
        if (!el) return;

        try {
            // Group by admin
            const adminLogs = {};
            this.logsData.forEach(log => {
                if (!log.admin) return;
                if (!adminLogs[log.admin]) {
                    adminLogs[log.admin] = { count: 0, lastActive: 0 };
                }
                adminLogs[log.admin].count++;
                if (log.timestamp > adminLogs[log.admin].lastActive) {
                    adminLogs[log.admin].lastActive = log.timestamp;
                }
            });

            const sorted = Object.entries(adminLogs).sort((a, b) => b[1].lastActive - a[1].lastActive).slice(0, 5);

            if (sorted.length === 0) {
                el.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">No admin activity</div>';
                return;
            }

            el.innerHTML = sorted.map(([admin, data]) => {
                const initial = admin.charAt(0).toUpperCase();
                const timeAgo = this.getTimeAgo(new Date(data.lastActive));
                return `
                    <div class="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">${initial}</div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm text-white truncate">${this.esc(admin.split('@')[0])}</div>
                            <div class="text-[10px] text-slate-500">${data.count} actions • ${timeAgo}</div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            el.innerHTML = '<div class="text-center text-red-400 text-xs py-4">Failed to load</div>';
        }
    }

    async loadEconomyLogs() {
        const el = document.getElementById('logs-economy');
        if (!el) return;

        try {
            const snap = await this.db.ref('economy/transactions').orderByChild('timestamp').limitToLast(10).once('value');

            if (!snap.exists()) {
                el.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">No transactions</div>';
                return;
            }

            const transactions = [];
            snap.forEach(child => transactions.push({ id: child.key, ...child.val() }));
            transactions.reverse();

            el.innerHTML = transactions.map(t => {
                const icons = { gift: '🎁', multiplier: '✨', event: '🎉', reset: '🔄' };
                const icon = icons[t.type] || '💰';
                return `
                    <div class="p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-all">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">${icon}</span>
                            <div class="flex-1 min-w-0">
                                <div class="text-xs text-white truncate">${this.esc(t.description || 'Transaction')}</div>
                                <div class="text-[10px] text-slate-500">${this.getTimeAgo(new Date(t.timestamp))}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            el.innerHTML = '<div class="text-center text-red-400 text-xs py-4">Failed to load</div>';
        }
    }

    async refreshLogs() {
        this.toast('Refreshing logs...', 'info');
        await this.loadLogs();
        this.loadLogsStats();
        this.loadAdminActivity();
        this.loadEconomyLogs();
        this.toast('Logs refreshed', 'success');
    }

    copyLog(logId) {
        const log = this.logsData.find(l => l.id === logId);
        if (log) {
            const text = JSON.stringify(log, null, 2);
            navigator.clipboard.writeText(text);
            this.toast('Log copied to clipboard', 'success');
        }
    }

    async deleteLog(source, logId) {
        const paths = {
            admin: 'adminLogs',
            economy: 'economy/transactions',
            anticheat: 'anticheat/violations',
            moderation: 'moderationLogs'
        };

        const path = paths[source];
        if (!path) return;

        try {
            await this.db.ref(`${path}/${logId}`).remove();
            this.logsData = this.logsData.filter(l => l.id !== logId);
            this.renderLogsData();
            this.loadLogsStats();
            this.toast('Log deleted', 'success');
        } catch (e) {
            this.toast('Failed to delete log', 'error');
        }
    }

    async clearAllLogs() {
        const confirmed = await this.showConfirmModal({
            title: 'Clear All Logs',
            message: 'This will permanently delete all logs. This action cannot be undone. Are you sure?',
            confirmText: 'Clear All',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            await Promise.all([
                this.db.ref('adminLogs').remove(),
                this.db.ref('moderationLogs').remove()
            ]);

            this.logsData = [];
            this.renderLogsData();
            this.loadLogsStats();
            this.toast('All logs cleared', 'success');
        } catch (e) {
            this.toast('Failed to clear logs: ' + e.message, 'error');
        }
    }

    exportLogs() {
        if (this.logsData.length === 0) {
            this.toast('No logs to export', 'warning');
            return;
        }

        const csv = [
            ['Timestamp', 'Type', 'Source', 'Message', 'Admin', 'Metadata'].join(','),
            ...this.logsData.map(log => [
                new Date(log.timestamp).toISOString(),
                log.type || 'info',
                log.source || 'system',
                `"${(log.message || '').replace(/"/g, '""')}"`,
                log.admin || 'System',
                `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nightclub-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.toast('Logs exported successfully', 'success');
    }

    async generateTestLogs() {
        this.toast('Generating test logs...', 'info');

        const testLogs = [
            { type: 'info', message: 'Admin dashboard accessed' },
            { type: 'info', message: 'User data loaded successfully' },
            { type: 'action', message: 'Economy page opened' },
            { type: 'action', message: 'Broadcast message sent to all users' },
            { type: 'warning', message: 'High server load detected' },
            { type: 'warning', message: 'User attempted rapid coin farming' },
            { type: 'error', message: 'Failed to sync user data' },
            { type: 'security', message: 'Suspicious login attempt blocked' },
            { type: 'security', message: 'Anti-cheat violation detected: speed hack' },
            { type: 'action', message: 'Gift sent: 1000 coins to all users' },
            { type: 'info', message: 'Shop catalog updated' },
            { type: 'warning', message: 'Database connection slow' },
            { type: 'action', message: 'User banned: suspicious activity' },
            { type: 'info', message: 'System backup completed' },
            { type: 'security', message: 'New device login from admin account' }
        ];

        // Generate logs with random timestamps in the last 24 hours
        const now = Date.now();
        const promises = testLogs.map((log, i) => {
            const randomOffset = Math.random() * 24 * 60 * 60 * 1000;
            return this.db.ref('adminLogs').push({
                ...log,
                admin: this.user?.email || 'test@admin.com',
                timestamp: now - randomOffset,
                metadata: { generated: true, index: i }
            });
        });

        try {
            await Promise.all(promises);
            this.toast(`Generated ${testLogs.length} test logs!`, 'success');
            await this.loadLogs();
            this.loadLogsStats();
            this.loadAdminActivity();
            this.loadPeakTimes();
        } catch (e) {
            this.toast('Failed to generate logs: ' + e.message, 'error');
        }
    }

    // ============================
    // GIFT CODES / COUPONS MODULE
    // ============================

    async renderCoupons(el) {
        el.innerHTML = `
            <div class="space-y-6">
                <!-- Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="glass p-4 rounded-xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400"><i class="ph-fill ph-ticket text-xl"></i></div><div><div class="text-2xl font-bold text-white" id="coupons-total">--</div><div class="text-xs text-slate-400">Total Codes</div></div></div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 group hover:border-emerald-500/30 transition-all">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400"><i class="ph-fill ph-check-circle text-xl"></i></div><div><div class="text-2xl font-bold text-white" id="coupons-active">--</div><div class="text-xs text-slate-400">Active</div></div></div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 group hover:border-yellow-500/30 transition-all">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400"><i class="ph-fill ph-gift text-xl"></i></div><div><div class="text-2xl font-bold text-white" id="coupons-redeemed">--</div><div class="text-xs text-slate-400">Redeemed</div></div></div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5 group hover:border-red-500/30 transition-all">
                        <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400"><i class="ph-fill ph-x-circle text-xl"></i></div><div><div class="text-2xl font-bold text-white" id="coupons-expired">--</div><div class="text-xs text-slate-400">Expired</div></div></div>
                    </div>
                </div>
                
                <!-- Main Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Create Code -->
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <h3 class="font-bold text-white mb-4 flex items-center gap-2"><i class="ph-fill ph-plus-circle text-emerald-400"></i> Create Gift Code</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="text-xs text-slate-400 uppercase mb-2 block">Code (auto-generated or custom)</label>
                                <div class="flex gap-2">
                                    <input type="text" id="coupon-code" placeholder="NIGHTCLUB2024" class="flex-1 bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white uppercase font-mono focus:outline-none focus:border-indigo-500">
                                    <button onclick="admin.generateCouponCode()" class="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30" title="Generate Random"><i class="ph-bold ph-shuffle"></i></button>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-xs text-slate-400 uppercase mb-2 block">💰 Cash Reward</label>
                                    <input type="number" id="coupon-cash" value="0" min="0" class="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500">
                                </div>
                                <div>
                                    <label class="text-xs text-slate-400 uppercase mb-2 block">💎 Diamonds</label>
                                    <input type="number" id="coupon-diamonds" value="0" min="0" class="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500">
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-xs text-slate-400 uppercase mb-2 block">Max Uses</label>
                                    <input type="number" id="coupon-max-uses" value="100" min="1" class="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500">
                                </div>
                                <div>
                                    <label class="text-xs text-slate-400 uppercase mb-2 block">Expires In</label>
                                    <select id="coupon-expiry" class="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none">
                                        <option value="1">1 Day</option>
                                        <option value="7" selected>7 Days</option>
                                        <option value="30">30 Days</option>
                                        <option value="90">90 Days</option>
                                        <option value="365">1 Year</option>
                                        <option value="0">Never</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label class="text-xs text-slate-400 uppercase mb-2 block">Description (optional)</label>
                                <input type="text" id="coupon-desc" placeholder="Welcome bonus!" class="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500">
                            </div>
                            <button onclick="admin.createCoupon()" class="w-full p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-medium transition-all flex items-center justify-center gap-2">
                                <i class="ph-fill ph-ticket"></i> Create Code
                            </button>
                        </div>
                    </div>
                    
                    <!-- Codes List -->
                    <div class="lg:col-span-2 glass rounded-2xl border border-white/5 overflow-hidden">
                        <div class="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                            <h3 class="font-bold text-white flex items-center gap-2"><i class="ph-fill ph-list text-indigo-400"></i> All Gift Codes</h3>
                            <div class="flex gap-2">
                                <button onclick="admin.refreshCoupons()" class="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600" title="Refresh"><i class="ph-bold ph-arrows-clockwise"></i></button>
                            </div>
                        </div>
                        <div id="coupons-list" class="max-h-[500px] overflow-y-auto">
                            <div class="p-8 text-center text-slate-500">Loading...</div>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Redemptions -->
                <div class="glass rounded-2xl border border-white/5 overflow-hidden">
                    <div class="p-4 border-b border-white/5 bg-slate-900/50">
                        <h3 class="font-bold text-white flex items-center gap-2"><i class="ph-fill ph-clock-clockwise text-cyan-400"></i> Recent Redemptions</h3>
                    </div>
                    <div id="redemptions-list" class="p-4 max-h-[300px] overflow-y-auto">
                        <div class="text-center text-slate-500 py-4">Loading...</div>
                    </div>
                </div>
            </div>
        `;
        await this.loadCoupons();
    }

    generateCouponCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            if (i > 0 && i % 4 === 0) code += '-';
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        document.getElementById('coupon-code').value = code;
    }

    async createCoupon() {
        const code = document.getElementById('coupon-code').value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        const cash = parseInt(document.getElementById('coupon-cash').value) || 0;
        const diamonds = parseInt(document.getElementById('coupon-diamonds').value) || 0;
        const maxUses = parseInt(document.getElementById('coupon-max-uses').value) || 100;
        const expiryDays = parseInt(document.getElementById('coupon-expiry').value);
        const description = document.getElementById('coupon-desc').value.trim();

        if (!code || code.length < 4) { this.toast('Code must be at least 4 characters', 'error'); return; }
        if (cash <= 0 && diamonds <= 0) { this.toast('Add at least one reward', 'error'); return; }

        try {
            // Check if code exists
            const existing = await this.db.ref(`giftCodes/${code}`).once('value');
            if (existing.exists()) { this.toast('Code already exists!', 'error'); return; }

            const coupon = {
                code,
                rewards: { cash, diamonds },
                maxUses,
                usedCount: 0,
                usedBy: {},
                description,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                createdBy: this.user?.email,
                expiresAt: expiryDays > 0 ? Date.now() + (expiryDays * 24 * 60 * 60 * 1000) : 0,
                active: true
            };

            await this.db.ref(`giftCodes/${code}`).set(coupon);
            this.toast(`Created code: ${code}`, 'success');
            this.log('action', `Created gift code: ${code}`, { code, cash, diamonds, maxUses });

            // Clear form
            document.getElementById('coupon-code').value = '';
            document.getElementById('coupon-cash').value = '0';
            document.getElementById('coupon-diamonds').value = '0';
            document.getElementById('coupon-desc').value = '';

            await this.loadCoupons();
        } catch (e) { this.toast('Failed: ' + e.message, 'error'); }
    }

    async loadCoupons() {
        try {
            const snap = await this.db.ref('giftCodes').once('value');
            const codes = snap.val() || {};
            this.coupons = Object.entries(codes).map(([k, v]) => ({ id: k, ...v }));

            // Stats
            const now = Date.now();
            const total = this.coupons.length;
            const active = this.coupons.filter(c => c.active && (c.expiresAt === 0 || c.expiresAt > now) && c.usedCount < c.maxUses).length;
            const totalRedeemed = this.coupons.reduce((s, c) => s + (c.usedCount || 0), 0);
            const expired = this.coupons.filter(c => !c.active || (c.expiresAt > 0 && c.expiresAt < now)).length;

            document.getElementById('coupons-total').textContent = total;
            document.getElementById('coupons-active').textContent = active;
            document.getElementById('coupons-redeemed').textContent = totalRedeemed;
            document.getElementById('coupons-expired').textContent = expired;

            this.renderCouponsList();
            this.loadRedemptions();
        } catch (e) { console.error('Failed to load coupons:', e); }
    }

    renderCouponsList() {
        const el = document.getElementById('coupons-list');
        if (!el) return;

        if (this.coupons.length === 0) {
            el.innerHTML = '<div class="p-8 text-center text-slate-500">No gift codes yet. Create one!</div>';
            return;
        }

        const now = Date.now();
        const sorted = [...this.coupons].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        el.innerHTML = sorted.map(c => {
            const isExpired = c.expiresAt > 0 && c.expiresAt < now;
            const isUsedUp = c.usedCount >= c.maxUses;
            const isActive = c.active && !isExpired && !isUsedUp;
            const statusColor = isActive ? 'emerald' : isExpired ? 'red' : 'slate';
            const statusText = isExpired ? 'Expired' : isUsedUp ? 'Used Up' : !c.active ? 'Disabled' : 'Active';

            return `
                <div class="p-4 border-b border-white/5 hover:bg-indigo-500/5 transition-all">
                    <div class="flex items-center gap-4">
                        <div class="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                            <i class="ph-fill ph-ticket text-xl"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-mono font-bold text-white text-lg tracking-wider">${c.code}</span>
                                <button onclick="admin.copyCouponCode('${c.code}')" class="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white" title="Copy"><i class="ph-bold ph-copy text-xs"></i></button>
                                <span class="px-2 py-0.5 rounded-full text-[10px] bg-${statusColor}-500/20 text-${statusColor}-400">${statusText}</span>
                            </div>
                            <div class="flex items-center gap-4 text-xs">
                                ${c.rewards?.cash > 0 ? `<span class="text-yellow-400">💰 ${this.formatNumber(c.rewards.cash)}</span>` : ''}
                                ${c.rewards?.diamonds > 0 ? `<span class="text-cyan-400">💎 ${c.rewards.diamonds}</span>` : ''}
                                <span class="text-slate-500">Used: ${c.usedCount || 0}/${c.maxUses}</span>
                                ${c.expiresAt > 0 ? `<span class="text-slate-500">Expires: ${new Date(c.expiresAt).toLocaleDateString()}</span>` : '<span class="text-slate-500">No expiry</span>'}
                            </div>
                            ${c.description ? `<div class="text-xs text-slate-400 mt-1">${this.esc(c.description)}</div>` : ''}
                        </div>
                        <div class="flex gap-1">
                            ${isActive ? `<button onclick="admin.toggleCoupon('${c.code}', false)" class="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400" title="Disable"><i class="ph-bold ph-pause"></i></button>` : `<button onclick="admin.toggleCoupon('${c.code}', true)" class="p-2 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400" title="Enable"><i class="ph-bold ph-play"></i></button>`}
                            <button onclick="admin.deleteCoupon('${c.code}')" class="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400" title="Delete"><i class="ph-bold ph-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadRedemptions() {
        const el = document.getElementById('redemptions-list');
        if (!el) return;

        // Get recent redemptions from all codes
        const redemptions = [];
        this.coupons.forEach(c => {
            if (c.usedBy) {
                Object.entries(c.usedBy).forEach(([uid, data]) => {
                    redemptions.push({ code: c.code, uid, ...data, rewards: c.rewards });
                });
            }
        });

        redemptions.sort((a, b) => (b.redeemedAt || 0) - (a.redeemedAt || 0));
        const recent = redemptions.slice(0, 20);

        if (recent.length === 0) {
            el.innerHTML = '<div class="text-center text-slate-500 py-4">No redemptions yet</div>';
            return;
        }

        el.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">${recent.map(r => `
            <div class="p-3 rounded-xl bg-slate-800/30 border border-white/5">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">${(r.userName || 'U')[0].toUpperCase()}</div>
                    <div class="flex-1 min-w-0">
                        <div class="text-sm text-white truncate">${this.esc(r.userName || r.uid?.substring(0, 8) || 'Unknown')}</div>
                        <div class="text-[10px] text-slate-500">${this.getTimeAgo(new Date(r.redeemedAt))}</div>
                    </div>
                </div>
                <div class="flex items-center justify-between">
                    <span class="font-mono text-xs text-indigo-400">${r.code}</span>
                    <div class="text-xs">${r.rewards?.cash > 0 ? `<span class="text-yellow-400">+${this.formatNumber(r.rewards.cash)}</span>` : ''} ${r.rewards?.diamonds > 0 ? `<span class="text-cyan-400">+${r.rewards.diamonds}💎</span>` : ''}</div>
                </div>
            </div>
        `).join('')}</div>`;
    }

    copyCouponCode(code) {
        navigator.clipboard.writeText(code);
        this.toast(`Copied: ${code}`, 'success');
    }

    async toggleCoupon(code, active) {
        try {
            await this.db.ref(`giftCodes/${code}/active`).set(active);
            this.toast(`Code ${active ? 'enabled' : 'disabled'}`, 'success');
            this.log('action', `${active ? 'Enabled' : 'Disabled'} gift code: ${code}`, { code });
            await this.loadCoupons();
        } catch (e) { this.toast('Failed: ' + e.message, 'error'); }
    }

    async deleteCoupon(code) {
        if (!confirm(`Delete code ${code}? This cannot be undone.`)) return;
        try {
            await this.db.ref(`giftCodes/${code}`).remove();
            this.toast('Code deleted', 'success');
            this.log('action', `Deleted gift code: ${code}`, { code });
            await this.loadCoupons();
        } catch (e) { this.toast('Failed: ' + e.message, 'error'); }
    }

    async refreshCoupons() {
        this.toast('Refreshing...', 'info');
        await this.loadCoupons();
        this.toast('Refreshed', 'success');
    }

    // ANTI-CHEAT MODULE
    async renderAnticheat(el) {
        el.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Stats Overview -->
                <div class="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="glass p-4 rounded-xl border border-white/5">
                        <div class="flex items-center gap-2 mb-2">
                            <i class="ph-fill ph-warning text-red-400"></i>
                            <span class="text-xs text-slate-400">Total Violations</span>
                        </div>
                        <div class="text-2xl font-bold text-white" id="ac-violations">--</div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5">
                        <div class="flex items-center gap-2 mb-2">
                            <i class="ph-fill ph-gavel text-orange-400"></i>
                            <span class="text-xs text-slate-400">Punishments</span>
                        </div>
                        <div class="text-2xl font-bold text-white" id="ac-punishments">--</div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5">
                        <div class="flex items-center gap-2 mb-2">
                            <i class="ph-fill ph-users text-amber-400"></i>
                            <span class="text-xs text-slate-400">Unique Cheaters</span>
                        </div>
                        <div class="text-2xl font-bold text-white" id="ac-cheaters">--</div>
                    </div>
                    <div class="glass p-4 rounded-xl border border-white/5">
                        <div class="flex items-center gap-2 mb-2">
                            <i class="ph-fill ph-clock text-blue-400"></i>
                            <span class="text-xs text-slate-400">Last 24h</span>
                        </div>
                        <div class="text-2xl font-bold text-white" id="ac-recent">--</div>
                    </div>
                </div>
                
                <!-- Violations List -->
                <div class="lg:col-span-2 space-y-6">
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold text-white flex items-center gap-2">
                                <i class="ph-fill ph-list-bullets text-red-400"></i> Recent Violations
                            </h3>
                            <button onclick="admin.clearAllViolations()" class="text-xs px-3 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                                <i class="ph-bold ph-trash mr-1"></i> Clear All
                            </button>
                        </div>
                        <div id="ac-violations-list" class="space-y-2 max-h-[500px] overflow-y-auto">
                            <div class="text-center text-slate-500 py-8">Loading violations...</div>
                        </div>
                    </div>
                </div>
                
                <!-- Sidebar -->
                <div class="space-y-6">
                    <!-- Punishments -->
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-gavel text-orange-400"></i> Recent Punishments
                        </h3>
                        <div id="ac-punishments-list" class="space-y-2 max-h-[200px] overflow-y-auto">
                            <div class="text-center text-slate-500 text-sm py-4">Loading...</div>
                        </div>
                    </div>
                    
                    <!-- Top Offenders -->
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-skull text-red-400"></i> Top Offenders
                        </h3>
                        <div id="ac-offenders-list" class="space-y-2">
                            <div class="text-center text-slate-500 text-sm py-4">Loading...</div>
                        </div>
                    </div>
                    
                    <!-- Quick Actions -->
                    <div class="glass rounded-2xl border border-red-500/20 p-6 bg-red-500/5">
                        <h3 class="font-bold text-red-400 mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-shield-slash text-red-400"></i> Actions
                        </h3>
                        <div class="space-y-2">
                            <button onclick="admin.clearAllViolations()" class="w-full p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm transition-all">
                                <i class="ph-bold ph-trash mr-2"></i> Clear All Violations
                            </button>
                            <button onclick="admin.clearAllPunishments()" class="w-full p-3 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-sm transition-all">
                                <i class="ph-bold ph-eraser mr-2"></i> Clear Punishment History
                            </button>
                        </div>
                    </div>
                    
                    <!-- Active Bans -->
                    <div class="glass rounded-2xl border border-white/5 p-6">
                        <h3 class="font-bold text-white mb-4 flex items-center gap-2">
                            <i class="ph-fill ph-prohibit text-red-400"></i> Active Bans
                        </h3>
                        <div id="ac-bans-list" class="space-y-2 max-h-[300px] overflow-y-auto">
                            <div class="text-center text-slate-500 text-sm py-4">Loading...</div>
                        </div>
                    </div>
                </div>
            </div>`;

        this.loadAnticheatStats();
        this.loadViolations();
        this.loadPunishments();
        this.loadTopOffenders();
        this.loadActiveBans();
    }

    async loadActiveBans() {
        const listEl = document.getElementById('ac-bans-list');
        if (!listEl) return;

        try {
            const [ipSnap, deviceSnap] = await Promise.all([
                this.db.ref('bans/ips').once('value'),
                this.db.ref('bans/devices').once('value')
            ]);

            const bans = [];

            // IP bans
            if (ipSnap.exists()) {
                ipSnap.forEach(child => {
                    const ban = child.val();
                    bans.push({
                        id: child.key,
                        type: 'ip',
                        value: ban.ip || child.key.replace(/_/g, '.'),
                        ...ban
                    });
                });
            }

            // Device bans
            if (deviceSnap.exists()) {
                deviceSnap.forEach(child => {
                    const ban = child.val();
                    bans.push({
                        id: child.key,
                        type: 'device',
                        value: ban.fingerprint || child.key,
                        ...ban
                    });
                });
            }

            if (bans.length === 0) {
                listEl.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">No active bans</div>';
                return;
            }

            // Sort by ban date
            bans.sort((a, b) => (b.bannedAt || 0) - (a.bannedAt || 0));

            listEl.innerHTML = bans.map(ban => {
                const time = ban.bannedAt ? new Date(ban.bannedAt).toLocaleDateString() : 'Unknown';
                const isIP = ban.type === 'ip';
                const icon = isIP ? 'ph-globe' : 'ph-fingerprint';
                const color = isIP ? 'text-blue-400 bg-blue-500/10' : 'text-purple-400 bg-purple-500/10';
                const displayValue = isIP ? ban.value : (ban.value || '').substring(0, 12) + '...';

                return `
                    <div class="p-2 rounded-lg bg-slate-800/50 border border-white/5">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full ${color} flex items-center justify-center">
                                <i class="ph-fill ${icon} text-xs"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-mono text-white truncate">${this.esc(displayValue)}</div>
                                <div class="text-[10px] text-slate-500">${isIP ? 'IP Ban' : 'Device Ban'} • ${time}</div>
                            </div>
                            <button onclick="admin.unban('${ban.type}', '${ban.id}')" class="text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20">
                                Unban
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            console.error('Failed to load bans:', e);
            listEl.innerHTML = '<div class="text-center text-red-400 text-sm py-4">Failed to load bans</div>';
        }
    }

    async unban(type, id) {
        const confirmed = await this.showConfirmModal({
            title: 'Remove Ban',
            message: `Are you sure you want to remove this ${type} ban?`,
            confirmText: 'Unban',
            type: 'warning'
        });

        if (!confirmed) return;

        try {
            await this.db.ref(`bans/${type}s/${id}`).remove();
            this.toast(`${type.toUpperCase()} ban removed`, 'success');
            this.loadActiveBans();
        } catch (e) {
            this.toast('Failed to remove ban: ' + e.message, 'error');
        }
    }

    async loadAnticheatStats() {
        try {
            const violationsSnap = await this.db.ref('anticheat/violations').once('value');
            const punishmentsSnap = await this.db.ref('anticheat/punishments').once('value');

            const violations = violationsSnap.val() || {};
            const punishments = punishmentsSnap.val() || {};

            const violationCount = Object.keys(violations).length;
            const punishmentCount = Object.keys(punishments).length;

            // Count unique cheaters
            const cheaters = new Set();
            Object.values(violations).forEach(v => cheaters.add(v.odeum));

            // Count last 24h
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const recentCount = Object.values(violations).filter(v => v.timestamp > oneDayAgo).length;

            document.getElementById('ac-violations').textContent = violationCount;
            document.getElementById('ac-punishments').textContent = punishmentCount;
            document.getElementById('ac-cheaters').textContent = cheaters.size;
            document.getElementById('ac-recent').textContent = recentCount;

        } catch (e) {
            console.error('Failed to load anticheat stats:', e);
        }
    }

    async loadViolations() {
        const listEl = document.getElementById('ac-violations-list');
        if (!listEl) return;

        try {
            const snap = await this.db.ref('anticheat/violations').orderByChild('timestamp').limitToLast(50).once('value');

            if (!snap.exists()) {
                listEl.innerHTML = '<div class="text-center text-slate-500 text-sm py-8">🎉 No violations detected!</div>';
                return;
            }

            const violations = [];
            snap.forEach(child => {
                violations.push({ id: child.key, ...child.val() });
            });
            violations.reverse();

            const typeColors = {
                'CASH_MANIPULATION': 'text-red-400 bg-red-500/10',
                'DIAMOND_MANIPULATION': 'text-purple-400 bg-purple-500/10',
                'LEVEL_MANIPULATION': 'text-yellow-400 bg-yellow-500/10',
                'NEGATIVE_VALUES': 'text-orange-400 bg-orange-500/10',
                'CODE_TAMPERING': 'text-red-400 bg-red-500/10',
                'EVAL_CHEAT': 'text-red-400 bg-red-500/10',
                'DEVTOOLS_OPEN': 'text-blue-400 bg-blue-500/10',
                'LARGE_CASH_ADD': 'text-amber-400 bg-amber-500/10',
                'DIRECT_MODIFICATION': 'text-red-400 bg-red-500/10',
                // External cheat detection
                'SPEED_HACK': 'text-red-500 bg-red-600/20',
                'TIMER_MANIPULATION': 'text-red-500 bg-red-600/20',
                'FRAME_RATE_ANOMALY': 'text-pink-400 bg-pink-500/10',
                'MEMORY_SCANNER': 'text-red-500 bg-red-600/20',
                'CHEAT_FLAG_SET': 'text-red-500 bg-red-600/20',
                'GOD_MODE_DETECTED': 'text-red-500 bg-red-600/20',
                'INFINITE_MONEY_FLAG': 'text-red-500 bg-red-600/20',
                'DECOY_MODIFIED': 'text-orange-400 bg-orange-500/10',
                'HEARTBEAT_CASH_ANOMALY': 'text-amber-400 bg-amber-500/10',
                'VALUE_DESYNC': 'text-red-400 bg-red-500/10',
                'SUSPICIOUS_VALUE': 'text-yellow-400 bg-yellow-500/10',
                'VALUE_OSCILLATION': 'text-orange-400 bg-orange-500/10',
                'AUTOCLICKER': 'text-cyan-400 bg-cyan-500/10',
                'BOT_CLICKING': 'text-cyan-400 bg-cyan-500/10',
                'NAN_VALUES': 'text-red-400 bg-red-500/10',
                'LEVEL_XP_MISMATCH': 'text-yellow-400 bg-yellow-500/10'
            };

            listEl.innerHTML = violations.map(v => {
                const time = v.timestamp ? new Date(v.timestamp).toLocaleString() : 'Unknown';
                const colors = typeColors[v.type] || 'text-slate-400 bg-slate-500/10';
                const ipSafe = (v.ipAddress || 'Unknown').replace(/\./g, '_');
                const fpSafe = (v.deviceFingerprint || '').replace(/[.#$\/\[\]]/g, '_');

                // Extract game state and activity
                const gs = v.gameState || {};
                const act = v.activity || {};
                const sess = v.session || {};

                return `
                    <div class="p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-red-500/30 transition-all">
                        <div class="flex items-start gap-3">
                            <div class="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                <i class="ph-fill ph-warning text-red-400"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="text-sm font-medium text-white">${this.esc(v.displayName || 'Unknown')}</span>
                                    <span class="text-[10px] px-2 py-0.5 rounded ${colors}">${v.type}</span>
                                    ${act.devToolsOpen ? '<span class="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">🔧 DevTools</span>' : ''}
                                    ${act.consoleAccessed ? '<span class="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">💻 Console</span>' : ''}
                                </div>
                                <div class="text-xs text-slate-400 mt-1">${this.esc(v.details || '')}</div>
                                <div class="text-[10px] text-slate-500 mt-1">📧 ${this.esc(v.email || 'No email')}</div>
                                
                                <!-- Device Info -->
                                <div class="mt-2 p-2 rounded bg-slate-900/50 border border-white/5">
                                    <div class="text-[9px] text-slate-500 mb-1 font-bold uppercase">Device Information</div>
                                    <div class="grid grid-cols-2 gap-2 text-[10px]">
                                        <div class="flex items-center gap-1">
                                            <i class="ph-bold ph-globe text-blue-400"></i>
                                            <span class="text-slate-400">IP:</span>
                                            <span class="text-white font-mono">${this.esc(v.ipAddress || 'Unknown')}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <i class="ph-bold ph-fingerprint text-purple-400"></i>
                                            <span class="text-slate-400">Device:</span>
                                            <span class="text-white font-mono text-[9px]">${this.esc((v.deviceFingerprint || 'Unknown').substring(0, 15))}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <i class="ph-bold ph-monitor text-green-400"></i>
                                            <span class="text-slate-400">Screen:</span>
                                            <span class="text-white">${this.esc(v.screenResolution || 'Unknown')}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <i class="ph-bold ph-desktop text-amber-400"></i>
                                            <span class="text-slate-400">Platform:</span>
                                            <span class="text-white">${this.esc(v.platform || 'Unknown')}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Game State at Violation -->
                                <div class="mt-2 p-2 rounded bg-emerald-900/20 border border-emerald-500/10">
                                    <div class="text-[9px] text-emerald-400 mb-1 font-bold uppercase">Game State at Violation</div>
                                    <div class="grid grid-cols-4 gap-2 text-[10px]">
                                        <div class="text-center">
                                            <div class="text-white font-bold">$${this.formatNumber(gs.cash || v.cash || 0)}</div>
                                            <div class="text-slate-500">Cash</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-white font-bold">💎 ${gs.diamonds || v.diamonds || 0}</div>
                                            <div class="text-slate-500">Diamonds</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-white font-bold">Lv ${gs.level || v.level || 1}</div>
                                            <div class="text-slate-500">Level</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-white font-bold">T${gs.clubTier || 1}</div>
                                            <div class="text-slate-500">Club Tier</div>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-3 gap-2 text-[10px] mt-2">
                                        <div class="text-center">
                                            <div class="text-slate-300">${gs.visitors || 0}/${gs.maxVisitors || 0}</div>
                                            <div class="text-slate-500">Visitors</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-slate-300">${gs.hype || 0}%</div>
                                            <div class="text-slate-500">Hype</div>
                                        </div>
                                        <div class="text-center">
                                            <div class="text-slate-300">$${this.formatNumber(gs.totalEarnings || 0)}</div>
                                            <div class="text-slate-500">Total Earned</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Activity Context -->
                                <div class="mt-2 p-2 rounded bg-purple-900/20 border border-purple-500/10">
                                    <div class="text-[9px] text-purple-400 mb-1 font-bold uppercase">Activity When Triggered</div>
                                    <div class="grid grid-cols-2 gap-2 text-[10px]">
                                        <div class="flex items-center gap-1">
                                            <span class="text-slate-400">Mode:</span>
                                            <span class="text-white">${act.gameMode || 'play'} ${act.visitMode ? '(visiting)' : ''}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <span class="text-slate-400">In Shop:</span>
                                            <span class="text-white">${act.inShop ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <span class="text-slate-400">Cash Δ:</span>
                                            <span class="${(act.cashDelta || 0) > 0 ? 'text-green-400' : 'text-red-400'}">${act.cashDelta > 0 ? '+' : ''}$${this.formatNumber(act.cashDelta || 0)}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <span class="text-slate-400">Time since check:</span>
                                            <span class="text-white">${act.timeSinceLastCheck || 'Unknown'}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <span class="text-slate-400">Session Violations:</span>
                                            <span class="text-red-400 font-bold">${act.violationsThisSession || 1}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <span class="text-slate-400">Open Modals:</span>
                                            <span class="text-white">${(act.openModals || []).length > 0 ? act.openModals.join(', ') : 'None'}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Session Info -->
                                <div class="mt-2 p-2 rounded bg-blue-900/20 border border-blue-500/10">
                                    <div class="text-[9px] text-blue-400 mb-1 font-bold uppercase">Session Info</div>
                                    <div class="grid grid-cols-2 gap-2 text-[10px]">
                                        <div class="flex items-center gap-1">
                                            <span class="text-slate-400">Duration:</span>
                                            <span class="text-white">${this.formatDuration(sess.sessionDuration || 0)}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <span class="text-slate-400">Tab Active:</span>
                                            <span class="${sess.tabVisible ? 'text-green-400' : 'text-red-400'}">${sess.tabVisible ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <span class="text-slate-400">Connection:</span>
                                            <span class="text-white">${sess.connectionType || 'Unknown'}</span>
                                        </div>
                                        <div class="flex items-center gap-1">
                                            <span class="text-slate-400">Window Focus:</span>
                                            <span class="${sess.windowFocused ? 'text-green-400' : 'text-red-400'}">${sess.windowFocused ? 'Yes' : 'No'}</span>
                                        </div>
                                    </div>
                                    ${sess.referrer && sess.referrer !== 'Direct' ? `<div class="text-[10px] text-slate-400 mt-1">Referrer: ${this.esc(sess.referrer.substring(0, 50))}</div>` : ''}
                                </div>
                                
                                <div class="flex items-center gap-4 mt-2 text-[10px] text-slate-500">
                                    <span><i class="ph-bold ph-clock mr-1"></i>${time}</span>
                                </div>
                                
                                <!-- Ban Actions -->
                                <div class="flex items-center gap-2 mt-2">
                                    <button onclick="admin.banByIP('${ipSafe}', '${this.esc(v.ipAddress || '')}')" class="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                                        <i class="ph-bold ph-prohibit mr-1"></i>Ban IP
                                    </button>
                                    <button onclick="admin.banByDevice('${fpSafe}', '${this.esc(v.deviceFingerprint || '')}')" class="text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all">
                                        <i class="ph-bold ph-fingerprint mr-1"></i>Ban Device
                                    </button>
                                    <button onclick="admin.banUser('${v.odeum}')" class="text-[10px] px-2 py-1 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-all">
                                        <i class="ph-bold ph-user-minus mr-1"></i>Ban Account
                                    </button>
                                </div>
                            </div>
                            <button onclick="admin.deleteViolation('${v.id}')" class="text-slate-500 hover:text-red-400 transition-colors">
                                <i class="ph-bold ph-x"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            console.error('Failed to load violations:', e);
            listEl.innerHTML = '<div class="text-center text-red-400 text-sm py-4">Failed to load violations</div>';
        }
    }

    async loadPunishments() {
        const listEl = document.getElementById('ac-punishments-list');
        if (!listEl) return;

        try {
            const snap = await this.db.ref('anticheat/punishments').orderByChild('timestamp').limitToLast(10).once('value');

            if (!snap.exists()) {
                listEl.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">No punishments yet</div>';
                return;
            }

            const punishments = [];
            snap.forEach(child => {
                punishments.push({ id: child.key, ...child.val() });
            });
            punishments.reverse();

            listEl.innerHTML = punishments.map(p => {
                const time = p.timestamp ? new Date(p.timestamp).toLocaleString() : 'Unknown';
                return `
                    <div class="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <div class="flex items-center gap-2">
                            <i class="ph-fill ph-gavel text-orange-400"></i>
                            <span class="text-sm font-medium text-white">${this.esc(p.displayName || 'Unknown')}</span>
                        </div>
                        <div class="text-[10px] text-slate-400 mt-1">${p.violations} violations • ${time}</div>
                    </div>
                `;
            }).join('');

        } catch (e) {
            console.error('Failed to load punishments:', e);
        }
    }

    async loadTopOffenders() {
        const listEl = document.getElementById('ac-offenders-list');
        if (!listEl) return;

        try {
            const snap = await this.db.ref('anticheat/violations').once('value');

            if (!snap.exists()) {
                listEl.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">No offenders</div>';
                return;
            }

            // Count violations per user
            const offenderCounts = {};
            snap.forEach(child => {
                const v = child.val();
                const key = v.odeum || 'unknown';
                if (!offenderCounts[key]) {
                    offenderCounts[key] = { count: 0, name: v.displayName || 'Unknown' };
                }
                offenderCounts[key].count++;
            });

            // Sort by count
            const sorted = Object.entries(offenderCounts)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5);

            if (sorted.length === 0) {
                listEl.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">No offenders</div>';
                return;
            }

            listEl.innerHTML = sorted.map(([uid, data], i) => {
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                return `
                    <div class="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50">
                        <span class="text-lg">${medals[i]}</span>
                        <div class="flex-1">
                            <div class="text-sm font-medium text-white">${this.esc(data.name)}</div>
                            <div class="text-[10px] text-slate-400">${data.count} violations</div>
                        </div>
                        <button onclick="admin.banUser('${uid}')" class="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20">
                            Ban
                        </button>
                    </div>
                `;
            }).join('');

        } catch (e) {
            console.error('Failed to load top offenders:', e);
        }
    }

    async deleteViolation(id) {
        try {
            await this.db.ref(`anticheat/violations/${id}`).remove();
            this.toast('Violation deleted', 'success');
            this.loadViolations();
            this.loadAnticheatStats();
        } catch (e) {
            this.toast('Failed to delete violation', 'error');
        }
    }

    async clearAllViolations() {
        const confirmed = await this.showConfirmModal({
            title: 'Clear All Violations',
            message: 'This will delete all violation records. Are you sure?',
            confirmText: 'Clear All',
            type: 'warning',
            requireInput: true,
            inputPlaceholder: 'Type CLEAR',
            inputMatch: 'CLEAR'
        });

        if (!confirmed) return;

        try {
            await this.db.ref('anticheat/violations').remove();
            this.toast('All violations cleared', 'success');
            this.loadViolations();
            this.loadAnticheatStats();
            this.loadTopOffenders();
        } catch (e) {
            this.toast('Failed to clear violations', 'error');
        }
    }

    async clearAllPunishments() {
        const confirmed = await this.showConfirmModal({
            title: 'Clear Punishment History',
            message: 'This will delete all punishment records. Are you sure?',
            confirmText: 'Clear History',
            type: 'warning'
        });

        if (!confirmed) return;

        try {
            await this.db.ref('anticheat/punishments').remove();
            this.toast('Punishment history cleared', 'success');
            this.loadPunishments();
            this.loadAnticheatStats();
        } catch (e) {
            this.toast('Failed to clear punishments', 'error');
        }
    }

    async banUser(uid) {
        const confirmed = await this.showConfirmModal({
            title: 'Ban User Account',
            message: 'This will ban the user account from the game. They may still access with a new account.',
            confirmText: 'Ban Account',
            type: 'danger',
            requireInput: true,
            inputPlaceholder: 'Type BAN',
            inputMatch: 'BAN'
        });

        if (!confirmed) return;

        try {
            // Add to banned users list
            await this.db.ref(`banned/${uid}`).set({
                bannedAt: firebase.database.ServerValue.TIMESTAMP,
                bannedBy: this.user?.email || 'Admin',
                reason: 'Anti-cheat violations'
            });

            // Wipe their save
            await this.firestore.collection('saves').doc(uid).delete();

            this.toast('User account banned and data wiped', 'success');
            this.loadTopOffenders();
            this.loadViolations();
        } catch (e) {
            this.toast('Failed to ban user: ' + e.message, 'error');
        }
    }

    async banByIP(ipKey, ipDisplay) {
        const confirmed = await this.showConfirmModal({
            title: '🌐 Ban IP Address',
            message: `This will ban IP address: ${ipDisplay}\n\nAnyone connecting from this IP will be blocked from the game.`,
            confirmText: 'Ban IP',
            type: 'danger',
            requireInput: true,
            inputPlaceholder: 'Type BANIP',
            inputMatch: 'BANIP'
        });

        if (!confirmed) return;

        try {
            await this.db.ref(`bans/ips/${ipKey}`).set({
                ip: ipDisplay,
                bannedAt: firebase.database.ServerValue.TIMESTAMP,
                bannedBy: this.user?.email || 'Admin',
                reason: 'Anti-cheat violations'
            });

            this.toast(`🌐 IP ${ipDisplay} banned successfully`, 'success');
            this.loadViolations();
        } catch (e) {
            this.toast('Failed to ban IP: ' + e.message, 'error');
        }
    }

    async banByDevice(fpKey, fpDisplay) {
        const confirmed = await this.showConfirmModal({
            title: '🔐 Ban Device',
            message: `This will ban device: ${fpDisplay}\n\nThis device will be blocked from accessing the game, even with different accounts.`,
            confirmText: 'Ban Device',
            type: 'danger',
            requireInput: true,
            inputPlaceholder: 'Type BANDEV',
            inputMatch: 'BANDEV'
        });

        if (!confirmed) return;

        try {
            await this.db.ref(`bans/devices/${fpKey}`).set({
                fingerprint: fpDisplay,
                bannedAt: firebase.database.ServerValue.TIMESTAMP,
                bannedBy: this.user?.email || 'Admin',
                reason: 'Anti-cheat violations'
            });

            this.toast(`🔐 Device ${fpDisplay.substring(0, 15)}... banned successfully`, 'success');
            this.loadViolations();
        } catch (e) {
            this.toast('Failed to ban device: ' + e.message, 'error');
        }
    }

    // Nuclear option - Wipe ALL accounts (except admins)
    async wipeAllAccounts() {
        // First confirmation
        const confirmed1 = await this.showConfirmModal({
            title: '☠️ NUCLEAR WIPE',
            message: 'This will DELETE ALL player progress, furniture, upgrades, and currencies. Admin accounts will be preserved.',
            confirmText: 'I Understand',
            type: 'danger',
            requireInput: true,
            inputPlaceholder: 'Type NUCLEAR',
            inputMatch: 'NUCLEAR'
        });

        if (!confirmed1) {
            this.toast('Wipe cancelled', 'info');
            return;
        }

        // Password confirmation with custom modal (verified against Firebase)
        const password = await this.showPasswordModal();
        const isValid = await this.verifyNuclearPassword(password);
        if (!isValid) {
            this.toast('❌ Incorrect password - Operation cancelled', 'error');
            return;
        }

        // Final confirmation
        const confirmed2 = await this.showConfirmModal({
            title: '⚠️ FINAL WARNING',
            message: 'This is your LAST CHANCE to cancel. All player data will be permanently destroyed.',
            confirmText: '☠️ EXECUTE NUCLEAR WIPE',
            type: 'danger',
            requireInput: true,
            inputPlaceholder: 'Type DESTROY',
            inputMatch: 'DESTROY'
        });

        if (!confirmed2) {
            this.toast('Wipe cancelled at final step', 'info');
            return;
        }

        try {
            this.toast('☢️ Nuclear wipe in progress...', 'warning');

            // Get all saves and users
            const savesSnap = await this.firestore.collection('saves').get();
            const usersSnap = await this.firestore.collection('users').get();

            // Get admin emails to exclude
            const adminEmails = this.predefinedAdmins || ['test@test.com', 'admin@nightclub.com'];

            // Build map of admin UIDs
            const adminUids = new Set();
            usersSnap.forEach(doc => {
                const userData = doc.data();
                if (adminEmails.includes(userData.email)) {
                    adminUids.add(doc.id);
                }
            });

            // Default fresh save data
            const freshSaveData = {
                cash: 1000,
                diamonds: 5,
                hype: 50,
                barStock: 100,
                level: 1,
                xp: 0,
                clubName: "My Club",
                clubTier: 1,
                maxVisitors: 10,
                furniture: [],
                savedFurniture: [],
                stats: {
                    capacityLevel: 1,
                    marketingLevel: 1,
                    profitLevel: 1
                },
                staff: {
                    bartenders: 0,
                    djs: 0,
                    bouncers: 0,
                    promoters: 0,
                    managers: 0
                },
                totalEarnings: 0,
                totalDrinksServed: 0,
                totalVisitors: 0,
                eventsHosted: 0,
                playTime: 0,
                achievements: [],
                activeCelebrities: [],
                tutorialComplete: false,
                wipedAt: firebase.firestore.FieldValue.serverTimestamp(),
                wipedBy: this.user?.email || 'Admin'
            };

            // Fresh user profile data (preserves email and basic auth info)
            const freshUserData = {
                friends: [],
                friendRequests: [],
                sentRequests: [],
                blockedUsers: [],
                coins: 1000,
                diamonds: 5,
                level: 1,
                highestLevel: 1,
                totalPlayTime: 0,
                lastOnline: firebase.firestore.FieldValue.serverTimestamp(),
                wipedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Wipe all non-admin saves
            const savesBatch = this.firestore.batch();
            let wipedSavesCount = 0;

            savesSnap.forEach(doc => {
                if (adminUids.has(doc.id)) {
                    console.log('Skipping admin save:', doc.id);
                } else {
                    savesBatch.set(doc.ref, freshSaveData);
                    wipedSavesCount++;
                }
            });

            await savesBatch.commit();
            console.log(`Wiped ${wipedSavesCount} game saves`);

            // Wipe all non-admin user profiles (friends, etc.)
            const usersBatch = this.firestore.batch();
            let wipedUsersCount = 0;
            let skippedCount = 0;

            usersSnap.forEach(doc => {
                if (adminUids.has(doc.id)) {
                    skippedCount++;
                    console.log('Skipping admin user:', doc.id);
                } else {
                    // Preserve email and displayName, reset everything else
                    const existingData = doc.data();
                    usersBatch.update(doc.ref, {
                        ...freshUserData,
                        email: existingData.email,
                        displayName: existingData.displayName,
                        createdAt: existingData.createdAt
                    });
                    wipedUsersCount++;
                }
            });

            await usersBatch.commit();
            console.log(`Wiped ${wipedUsersCount} user profiles`);

            // Wipe global chat messages (Realtime Database)
            await this.db.ref('globalChat').remove();
            console.log('Wiped global chat');

            // Wipe private messages for non-admin users
            const messagesRef = this.db.ref('messages');
            const messagesSnap = await messagesRef.once('value');
            if (messagesSnap.exists()) {
                const updates = {};
                messagesSnap.forEach(child => {
                    const chatId = child.key;
                    // Check if this chat involves only non-admins
                    const participants = chatId.split('_');
                    const hasAdmin = participants.some(uid => adminUids.has(uid));
                    if (!hasAdmin) {
                        updates[chatId] = null; // Delete this conversation
                    }
                });
                if (Object.keys(updates).length > 0) {
                    await messagesRef.update(updates);
                    console.log(`Wiped ${Object.keys(updates).length} private conversations`);
                }
            }

            // Wipe friend requests in Realtime Database
            await this.db.ref('friendRequests').remove();
            console.log('Wiped friend requests');

            // Wipe notifications
            const notificationsRef = this.db.ref('notifications');
            const notifSnap = await notificationsRef.once('value');
            if (notifSnap.exists()) {
                const updates = {};
                notifSnap.forEach(child => {
                    if (!adminUids.has(child.key)) {
                        updates[child.key] = null;
                    }
                });
                if (Object.keys(updates).length > 0) {
                    await notificationsRef.update(updates);
                    console.log(`Wiped notifications for ${Object.keys(updates).length} users`);
                }
            }

            // Trigger force reload on all clients
            await this.db.ref('economy/forceReload').set(Date.now());

            // Log the nuclear action
            await this.logTransaction('nuclear', `☢️ NUCLEAR WIPE: Reset ${wipedSavesCount} saves, ${wipedUsersCount} users, cleared chat & friends (${skippedCount} admins preserved)`);

            this.toast(`☢️ NUCLEAR WIPE COMPLETE: ${wipedSavesCount} saves, ${wipedUsersCount} users reset, all messages & friends cleared`, 'success');
            this.loadEconomyStats();
            this.loadTopEarners();

        } catch (e) {
            console.error('Nuclear wipe failed:', e);
            this.toast('Nuclear wipe failed: ' + e.message, 'error');
        }
    }

    // Verify nuclear password against Firebase
    async verifyNuclearPassword(password) {
        try {
            const snap = await this.db.ref('admin/nuclearPasswordHash').once('value');
            const storedHash = snap.val();

            // If no hash stored yet, set it up (first time setup)
            if (!storedHash) {
                console.log('Setting up nuclear password in Firebase...');
                const hash = btoa(password.split('').reverse().join('') + '_NIGHTCLUB_SECURE_2024');
                await this.db.ref('admin/nuclearPasswordHash').set(hash);
                return true;
            }

            // Verify against stored hash
            const inputHash = btoa(password.split('').reverse().join('') + '_NIGHTCLUB_SECURE_2024');
            return storedHash === inputHash;
        } catch (e) {
            console.error('Password verification failed:', e);
            return false;
        }
    }

    // Password modal for nuclear wipe
    showPasswordModal() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4';
            overlay.style.animation = 'fadeIn 0.2s ease';

            overlay.innerHTML = `
                <div class="glass rounded-2xl border border-red-500/50 w-full max-w-md overflow-hidden" style="animation: scaleIn 0.2s ease">
                    <div class="p-6">
                        <div class="text-center mb-6">
                            <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                                <i class="ph-fill ph-lock-key text-3xl text-red-400"></i>
                            </div>
                            <h3 class="text-xl font-bold text-white">🔐 Admin Password Required</h3>
                            <p class="text-sm text-slate-400 mt-2">Enter the nuclear authorization password</p>
                        </div>
                        <div class="mb-4">
                            <input type="password" id="nuclear-password" 
                                class="w-full bg-slate-800/50 border border-red-500/30 rounded-lg px-4 py-3 text-white text-center text-lg tracking-widest outline-none focus:border-red-500" 
                                placeholder="••••••••••••"
                                autocomplete="off">
                        </div>
                    </div>
                    <div class="flex border-t border-white/5">
                        <button id="pass-cancel" class="flex-1 p-4 text-slate-400 hover:bg-white/5 transition-all font-medium">
                            Cancel
                        </button>
                        <button id="pass-ok" class="flex-1 p-4 bg-red-500 text-white font-bold hover:brightness-110 transition-all">
                            🔓 Authorize
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const input = overlay.querySelector('#nuclear-password');
            const cancelBtn = overlay.querySelector('#pass-cancel');
            const okBtn = overlay.querySelector('#pass-ok');

            input.focus();

            const cleanup = () => {
                overlay.style.animation = 'fadeOut 0.2s ease forwards';
                setTimeout(() => overlay.remove(), 200);
            };

            cancelBtn.onclick = () => { cleanup(); resolve(null); };
            overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve(null); } };

            okBtn.onclick = () => { cleanup(); resolve(input.value); };
            input.onkeydown = (e) => {
                if (e.key === 'Enter') { cleanup(); resolve(input.value); }
                else if (e.key === 'Escape') { cleanup(); resolve(null); }
            };
        });
    }

    esc(str) { return str ? str.toString().replace(/</g, "&lt;") : ''; }
    log(t, m) { console.log(t, m); }

    formatDuration(seconds) {
        if (!seconds || seconds < 0) return '0s';
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${mins}m`;
    }

    // ==========================================
    // SHOP MANAGER
    // ==========================================

    // Default furniture catalog (fallback)
    getDefaultCatalog() {
        return {
            tile_wood: { name: 'Wooden Floor', icon: '🪵', cost: 50, currency: 'cash', category: 'floors', desc: 'Classic wood flooring', enabled: true },
            tile_marble: { name: 'Marble Floor', icon: '⬜', cost: 100, currency: 'cash', category: 'floors', desc: 'Elegant marble tiles', enabled: true },
            tile_checker: { name: 'Checker Floor', icon: '🏁', cost: 75, currency: 'cash', category: 'floors', desc: 'Black & white checker', enabled: true },
            tile_carpet: { name: 'Red Carpet', icon: '🟥', cost: 80, currency: 'cash', category: 'floors', desc: 'VIP red carpet', enabled: true },
            tile_concrete: { name: 'Concrete Floor', icon: '⬛', cost: 40, currency: 'cash', category: 'floors', desc: 'Industrial style', enabled: true },
            tile_disco: { name: 'Disco Tile', icon: '🪩', cost: 150, currency: 'cash', category: 'floors', desc: 'Light-up disco floor', enabled: true },
            tile_gold: { name: 'Golden Floor', icon: '🟨', cost: 2, currency: 'diamonds', category: 'floors', desc: 'Luxurious gold tiles', premium: true, enabled: true },
            tile_neon: { name: 'Neon Floor', icon: '💜', cost: 3, currency: 'diamonds', category: 'floors', desc: 'Glowing neon tiles', premium: true, enabled: true },
            table: { name: 'Cocktail Table', icon: '🪑', cost: 100, currency: 'cash', category: 'furniture', desc: 'Small table for drinks', enabled: true },
            booth: { name: 'VIP Booth', icon: '🛋️', cost: 500, currency: 'cash', category: 'furniture', desc: 'Cozy VIP seating', unlockLevel: 2, enabled: true },
            bar: { name: 'Bar Counter', icon: '🍸', cost: 800, currency: 'cash', category: 'furniture', desc: 'Serve drinks here', unlockLevel: 2, enabled: true },
            speaker: { name: 'Speaker', icon: '🔊', cost: 200, currency: 'cash', category: 'furniture', desc: 'Pumps up the music', enabled: true },
            plant: { name: 'Potted Plant', icon: '🌿', cost: 75, currency: 'cash', category: 'furniture', desc: 'Add some greenery', enabled: true },
            pooltable: { name: 'Pool Table', icon: '🎱', cost: 600, currency: 'cash', category: 'furniture', desc: 'Entertainment zone', unlockLevel: 3, enabled: true },
            dancefloor: { name: 'Dance Floor', icon: '💃', cost: 1000, currency: 'cash', category: 'entertainment', desc: 'LED dance floor', unlockLevel: 1, enabled: true },
            dj: { name: 'DJ Booth', icon: '🎧', cost: 1500, currency: 'cash', category: 'entertainment', desc: 'Drop the beat!', unlockLevel: 2, enabled: true },
            stage: { name: 'Stage', icon: '🎤', cost: 2000, currency: 'cash', category: 'entertainment', desc: 'Performance stage', unlockLevel: 4, enabled: true },
            discoball: { name: 'Disco Ball', icon: '🪩', cost: 300, currency: 'cash', category: 'lights', desc: 'Classic disco vibes', enabled: true },
            laser: { name: 'Moving Head Laser', icon: '✨', cost: 750, currency: 'cash', category: 'lights', desc: 'Beam light show', unlockLevel: 3, enabled: true },
            statue: { name: 'Statue', icon: '🗿', cost: 350, currency: 'cash', category: 'decor', desc: 'Artistic decoration', enabled: true },
            fountain: { name: 'Fountain', icon: '⛲', cost: 700, currency: 'cash', category: 'decor', desc: 'Water feature', unlockLevel: 3, enabled: true },
            sofa: { name: 'Sofa', icon: '🛋️', cost: 200, currency: 'cash', category: 'seating', desc: 'Comfortable sofa', enabled: true },
            barstool: { name: 'Bar Stool', icon: '🪑', cost: 50, currency: 'cash', category: 'seating', desc: 'Bar seating', enabled: true },
            viparea: { name: 'VIP Area', icon: '👑', cost: 5, currency: 'diamonds', category: 'premium', desc: 'Exclusive VIP section', premium: true, enabled: true },
            aquarium: { name: 'Aquarium', icon: '🐠', cost: 8, currency: 'diamonds', category: 'premium', desc: 'Giant fish tank', premium: true, enabled: true },
            helicopter: { name: 'Helipad', icon: '🚁', cost: 15, currency: 'diamonds', category: 'premium', desc: 'Rooftop helipad!', premium: true, enabled: true },
        };
    }

    async renderShopManager(content) {
        content.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                        <i class="ph-fill ph-storefront text-emerald-400"></i> Shop Manager
                    </h2>
                    <p class="text-slate-400 text-sm mt-1">Manage furniture items, prices, and visibility</p>
                </div>
                <button onclick="admin.addNewItem()" class="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-all flex items-center gap-2">
                    <i class="ph-bold ph-plus"></i> Add New Item
                </button>
            </div>
            
            <!-- Category Filter -->
            <div class="flex flex-wrap gap-2 mb-6">
                <button onclick="admin.filterShopItems('all')" class="shop-filter-btn active px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-all" data-filter="all">
                    All Items
                </button>
                <button onclick="admin.filterShopItems('floors')" class="shop-filter-btn px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-all" data-filter="floors">
                    🪵 Floors
                </button>
                <button onclick="admin.filterShopItems('furniture')" class="shop-filter-btn px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-all" data-filter="furniture">
                    🪑 Furniture
                </button>
                <button onclick="admin.filterShopItems('entertainment')" class="shop-filter-btn px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-all" data-filter="entertainment">
                    💃 Entertainment
                </button>
                <button onclick="admin.filterShopItems('lights')" class="shop-filter-btn px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-all" data-filter="lights">
                    💡 Lights
                </button>
                <button onclick="admin.filterShopItems('decor')" class="shop-filter-btn px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-all" data-filter="decor">
                    🗿 Decor
                </button>
                <button onclick="admin.filterShopItems('seating')" class="shop-filter-btn px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-all" data-filter="seating">
                    🛋️ Seating
                </button>
                <button onclick="admin.filterShopItems('premium')" class="shop-filter-btn px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-sm transition-all" data-filter="premium">
                    💎 Premium
                </button>
            </div>
            
            <!-- Stats -->
            <div class="grid grid-cols-4 gap-4 mb-6">
                <div class="glass rounded-xl p-4 border border-white/5">
                    <div class="text-2xl font-bold text-white" id="shop-total-items">--</div>
                    <div class="text-xs text-slate-400">Total Items</div>
                </div>
                <div class="glass rounded-xl p-4 border border-white/5">
                    <div class="text-2xl font-bold text-emerald-400" id="shop-enabled-items">--</div>
                    <div class="text-xs text-slate-400">Enabled</div>
                </div>
                <div class="glass rounded-xl p-4 border border-white/5">
                    <div class="text-2xl font-bold text-red-400" id="shop-disabled-items">--</div>
                    <div class="text-xs text-slate-400">Disabled</div>
                </div>
                <div class="glass rounded-xl p-4 border border-white/5">
                    <div class="text-2xl font-bold text-purple-400" id="shop-premium-items">--</div>
                    <div class="text-xs text-slate-400">Premium</div>
                </div>
            </div>
            
            <!-- Items Grid -->
            <div class="glass rounded-2xl border border-white/5 overflow-hidden">
                <div class="p-4 border-b border-white/5 bg-white/5">
                    <div class="flex items-center gap-4">
                        <input type="text" id="shop-search" placeholder="Search items..." 
                            class="flex-1 px-4 py-2 rounded-lg bg-slate-800 border border-white/10 text-white text-sm focus:border-emerald-500 focus:outline-none"
                            oninput="admin.searchShopItems(this.value)">
                        <button onclick="admin.syncCatalogToFirebase()" class="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all text-sm">
                            <i class="ph-bold ph-cloud-arrow-up mr-2"></i>Sync to Cloud
                        </button>
                    </div>
                </div>
                <div id="shop-items-list" class="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                    <div class="p-8 text-center text-slate-500">Loading items...</div>
                </div>
            </div>
        `;

        this.currentShopFilter = 'all';
        this.shopSearchQuery = '';
        await this.loadShopItems();
    }

    async loadShopItems() {
        try {
            // Try to load from Firebase first
            const snapshot = await this.db.ref('shop/catalog').once('value');
            let catalog = snapshot.val();

            // If no catalog in Firebase, use default
            if (!catalog) {
                catalog = this.getDefaultCatalog();
                // Save default to Firebase
                await this.db.ref('shop/catalog').set(catalog);
            }

            this.shopCatalog = catalog;
            this.renderShopItems();
            this.updateShopStats();

        } catch (e) {
            console.error('Failed to load shop items:', e);
            this.shopCatalog = this.getDefaultCatalog();
            this.renderShopItems();
        }
    }

    updateShopStats() {
        const items = Object.values(this.shopCatalog || {});
        const total = items.length;
        const enabled = items.filter(i => i.enabled !== false).length;
        const disabled = items.filter(i => i.enabled === false).length;
        const premium = items.filter(i => i.premium === true).length;

        document.getElementById('shop-total-items').textContent = total;
        document.getElementById('shop-enabled-items').textContent = enabled;
        document.getElementById('shop-disabled-items').textContent = disabled;
        document.getElementById('shop-premium-items').textContent = premium;
    }

    renderShopItems() {
        const listEl = document.getElementById('shop-items-list');
        if (!listEl || !this.shopCatalog) return;

        let items = Object.entries(this.shopCatalog);

        // Apply category filter
        if (this.currentShopFilter !== 'all') {
            if (this.currentShopFilter === 'premium') {
                items = items.filter(([k, v]) => v.premium === true);
            } else {
                items = items.filter(([k, v]) => v.category === this.currentShopFilter);
            }
        }

        // Apply search filter
        if (this.shopSearchQuery) {
            const query = this.shopSearchQuery.toLowerCase();
            items = items.filter(([k, v]) =>
                v.name.toLowerCase().includes(query) ||
                k.toLowerCase().includes(query) ||
                (v.desc && v.desc.toLowerCase().includes(query))
            );
        }

        if (items.length === 0) {
            listEl.innerHTML = '<div class="p-8 text-center text-slate-500">No items found</div>';
            return;
        }

        listEl.innerHTML = items.map(([key, item]) => {
            const isEnabled = item.enabled !== false;
            const currencyIcon = item.currency === 'diamonds' ? '💎' : '💵';
            const categoryColors = {
                'floors': 'bg-amber-500/20 text-amber-400',
                'furniture': 'bg-blue-500/20 text-blue-400',
                'entertainment': 'bg-pink-500/20 text-pink-400',
                'lights': 'bg-yellow-500/20 text-yellow-400',
                'decor': 'bg-emerald-500/20 text-emerald-400',
                'seating': 'bg-purple-500/20 text-purple-400',
                'premium': 'bg-purple-500/20 text-purple-400'
            };
            const catColor = categoryColors[item.category] || 'bg-slate-500/20 text-slate-400';

            return `
                <div class="p-4 hover:bg-white/5 transition-all ${!isEnabled ? 'opacity-50' : ''}">
                    <div class="flex items-center gap-4">
                        <!-- Icon & Info -->
                        <div class="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
                            ${item.icon || '📦'}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="font-medium text-white">${this.esc(item.name)}</span>
                                <span class="text-[10px] px-2 py-0.5 rounded ${catColor}">${item.category}</span>
                                ${item.premium ? '<span class="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">PREMIUM</span>' : ''}
                                ${item.unlockLevel ? `<span class="text-[10px] px-2 py-0.5 rounded bg-slate-500/20 text-slate-400">Lv.${item.unlockLevel}</span>` : ''}
                            </div>
                            <div class="text-xs text-slate-500 mt-0.5">${this.esc(item.desc || 'No description')}</div>
                            <div class="text-[10px] text-slate-600 mt-0.5">ID: ${key}</div>
                        </div>
                        
                        <!-- Price -->
                        <div class="text-right">
                            <div class="text-lg font-bold ${item.currency === 'diamonds' ? 'text-purple-400' : 'text-emerald-400'}">
                                ${currencyIcon} ${item.cost}
                            </div>
                            <div class="text-[10px] text-slate-500">${item.currency}</div>
                        </div>
                        
                        <!-- Actions -->
                        <div class="flex items-center gap-2">
                            <button onclick="admin.toggleItemEnabled('${key}')" 
                                class="p-2 rounded-lg ${isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} hover:opacity-80 transition-all"
                                title="${isEnabled ? 'Disable' : 'Enable'}">
                                <i class="ph-bold ${isEnabled ? 'ph-eye' : 'ph-eye-slash'}"></i>
                            </button>
                            <button onclick="admin.editShopItem('${key}')" 
                                class="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                                title="Edit">
                                <i class="ph-bold ph-pencil"></i>
                            </button>
                            <button onclick="admin.deleteShopItem('${key}')" 
                                class="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                                title="Delete">
                                <i class="ph-bold ph-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    filterShopItems(filter) {
        this.currentShopFilter = filter;

        // Update active button styling
        document.querySelectorAll('.shop-filter-btn').forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active', 'bg-white/10', 'text-white');
                btn.classList.remove('bg-white/5', 'text-slate-400');
            } else {
                btn.classList.remove('active', 'bg-white/10', 'text-white');
                btn.classList.add('bg-white/5', 'text-slate-400');
            }
        });

        this.renderShopItems();
    }

    searchShopItems(query) {
        this.shopSearchQuery = query;
        this.renderShopItems();
    }

    async toggleItemEnabled(itemKey) {
        if (!this.shopCatalog[itemKey]) return;

        const currentState = this.shopCatalog[itemKey].enabled !== false;
        this.shopCatalog[itemKey].enabled = !currentState;

        try {
            await this.db.ref(`shop/catalog/${itemKey}/enabled`).set(!currentState);
            this.renderShopItems();
            this.updateShopStats();
            this.toast(`${this.shopCatalog[itemKey].name} ${!currentState ? 'enabled' : 'disabled'}`, 'success');
        } catch (e) {
            this.toast('Failed to update item: ' + e.message, 'error');
        }
    }

    async editShopItem(itemKey) {
        const item = this.shopCatalog[itemKey];
        if (!item) return;

        const html = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Name</label>
                        <input type="text" id="edit-name" value="${this.esc(item.name)}" 
                            class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                    </div>
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Icon (emoji)</label>
                        <input type="text" id="edit-icon" value="${item.icon || ''}" 
                            class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Price</label>
                        <input type="number" id="edit-cost" value="${item.cost}" 
                            class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                    </div>
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Currency</label>
                        <select id="edit-currency" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                            <option value="cash" ${item.currency === 'cash' ? 'selected' : ''}>Cash 💵</option>
                            <option value="diamonds" ${item.currency === 'diamonds' ? 'selected' : ''}>Diamonds 💎</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Unlock Level</label>
                        <input type="number" id="edit-level" value="${item.unlockLevel || 0}" min="0" max="50"
                            class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                    </div>
                </div>
                <div>
                    <label class="block text-sm text-slate-400 mb-1">Category</label>
                    <select id="edit-category" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                        <option value="floors" ${item.category === 'floors' ? 'selected' : ''}>Floors</option>
                        <option value="furniture" ${item.category === 'furniture' ? 'selected' : ''}>Furniture</option>
                        <option value="entertainment" ${item.category === 'entertainment' ? 'selected' : ''}>Entertainment</option>
                        <option value="lights" ${item.category === 'lights' ? 'selected' : ''}>Lights</option>
                        <option value="decor" ${item.category === 'decor' ? 'selected' : ''}>Decor</option>
                        <option value="seating" ${item.category === 'seating' ? 'selected' : ''}>Seating</option>
                        <option value="premium" ${item.category === 'premium' ? 'selected' : ''}>Premium</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm text-slate-400 mb-1">Description</label>
                    <input type="text" id="edit-desc" value="${this.esc(item.desc || '')}" 
                        class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                </div>
                <div class="flex items-center gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="edit-premium" ${item.premium ? 'checked' : ''} class="w-4 h-4">
                        <span class="text-sm text-slate-300">Premium Item</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="edit-enabled" ${item.enabled !== false ? 'checked' : ''} class="w-4 h-4">
                        <span class="text-sm text-slate-300">Enabled in Shop</span>
                    </label>
                </div>
            </div>
        `;

        const confirmed = await this.showFormModal({
            title: `Edit: ${item.name}`,
            html: html,
            confirmText: 'Save Changes',
            type: 'info'
        });

        if (!confirmed) return;

        // Get values
        const updatedItem = {
            name: document.getElementById('edit-name').value.trim(),
            icon: document.getElementById('edit-icon').value.trim(),
            cost: parseInt(document.getElementById('edit-cost').value) || 0,
            currency: document.getElementById('edit-currency').value,
            category: document.getElementById('edit-category').value,
            desc: document.getElementById('edit-desc').value.trim(),
            premium: document.getElementById('edit-premium').checked,
            enabled: document.getElementById('edit-enabled').checked,
            unlockLevel: parseInt(document.getElementById('edit-level').value) || 0
        };

        if (updatedItem.unlockLevel === 0) delete updatedItem.unlockLevel;

        try {
            await this.db.ref(`shop/catalog/${itemKey}`).set(updatedItem);
            this.shopCatalog[itemKey] = updatedItem;
            this.renderShopItems();
            this.updateShopStats();
            this.toast('Item updated successfully!', 'success');
        } catch (e) {
            this.toast('Failed to update: ' + e.message, 'error');
        }
    }

    async addNewItem() {
        const html = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-slate-400 mb-1">Item ID (unique, no spaces)</label>
                    <input type="text" id="new-id" placeholder="e.g. gold_chair" 
                        class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Name</label>
                        <input type="text" id="new-name" placeholder="Golden Chair" 
                            class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                    </div>
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Icon (emoji)</label>
                        <input type="text" id="new-icon" placeholder="🪑" 
                            class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Price</label>
                        <input type="number" id="new-cost" value="100" 
                            class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                    </div>
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Currency</label>
                        <select id="new-currency" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                            <option value="cash">Cash 💵</option>
                            <option value="diamonds">Diamonds 💎</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm text-slate-400 mb-1">Unlock Level</label>
                        <input type="number" id="new-level" value="0" min="0" max="50"
                            class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                    </div>
                </div>
                <div>
                    <label class="block text-sm text-slate-400 mb-1">Category</label>
                    <select id="new-category" class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                        <option value="furniture">Furniture</option>
                        <option value="floors">Floors</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="lights">Lights</option>
                        <option value="decor">Decor</option>
                        <option value="seating">Seating</option>
                        <option value="premium">Premium</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm text-slate-400 mb-1">Description</label>
                    <input type="text" id="new-desc" placeholder="A beautiful item" 
                        class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-white">
                </div>
                <div class="flex items-center gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="new-premium" class="w-4 h-4">
                        <span class="text-sm text-slate-300">Premium Item</span>
                    </label>
                </div>
                <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                    ⚠️ Note: New items need matching 3D models in furniture.js to display in-game.
                </div>
            </div>
        `;

        const confirmed = await this.showFormModal({
            title: 'Add New Shop Item',
            html: html,
            confirmText: 'Add Item',
            type: 'success'
        });

        if (!confirmed) return;

        const itemId = document.getElementById('new-id').value.trim().toLowerCase().replace(/\s+/g, '_');
        if (!itemId) {
            this.toast('Item ID is required', 'error');
            return;
        }

        if (this.shopCatalog[itemId]) {
            this.toast('Item ID already exists', 'error');
            return;
        }

        const newItem = {
            name: document.getElementById('new-name').value.trim() || 'New Item',
            icon: document.getElementById('new-icon').value.trim() || '📦',
            cost: parseInt(document.getElementById('new-cost').value) || 100,
            currency: document.getElementById('new-currency').value,
            category: document.getElementById('new-category').value,
            desc: document.getElementById('new-desc').value.trim() || 'A new item',
            premium: document.getElementById('new-premium').checked,
            enabled: true,
            unlockLevel: parseInt(document.getElementById('new-level').value) || 0
        };

        if (newItem.unlockLevel === 0) delete newItem.unlockLevel;

        try {
            await this.db.ref(`shop/catalog/${itemId}`).set(newItem);
            this.shopCatalog[itemId] = newItem;
            this.renderShopItems();
            this.updateShopStats();
            this.toast('Item added successfully!', 'success');
        } catch (e) {
            this.toast('Failed to add item: ' + e.message, 'error');
        }
    }

    async deleteShopItem(itemKey) {
        const item = this.shopCatalog[itemKey];
        if (!item) return;

        const confirmed = await this.showConfirmModal({
            title: 'Delete Item',
            message: `Are you sure you want to delete "${item.name}"? This cannot be undone.`,
            confirmText: 'Delete',
            type: 'danger'
        });

        if (!confirmed) return;

        try {
            await this.db.ref(`shop/catalog/${itemKey}`).remove();
            delete this.shopCatalog[itemKey];
            this.renderShopItems();
            this.updateShopStats();
            this.toast('Item deleted', 'success');
        } catch (e) {
            this.toast('Failed to delete: ' + e.message, 'error');
        }
    }

    async syncCatalogToFirebase() {
        const confirmed = await this.showConfirmModal({
            title: 'Sync Catalog',
            message: 'This will sync the current shop catalog to Firebase, making it available to all game clients. Continue?',
            confirmText: 'Sync Now',
            type: 'info'
        });

        if (!confirmed) return;

        try {
            await this.db.ref('shop/catalog').set(this.shopCatalog);
            await this.db.ref('shop/lastUpdated').set(firebase.database.ServerValue.TIMESTAMP);
            this.toast('Catalog synced to cloud!', 'success');
        } catch (e) {
            this.toast('Sync failed: ' + e.message, 'error');
        }
    }

    // Form modal for editing
    showFormModal({ title, html, confirmText = 'Confirm', type = 'info' }) {
        return new Promise(resolve => {
            const colors = {
                info: 'bg-blue-500',
                success: 'bg-emerald-500',
                danger: 'bg-red-500'
            };

            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50';
            overlay.style.animation = 'fadeIn 0.2s ease';
            overlay.innerHTML = `
                <div class="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-lg mx-4 overflow-hidden shadow-2xl" style="animation: scaleIn 0.2s ease">
                    <div class="p-6 border-b border-white/10">
                        <h3 class="text-xl font-bold text-white">${title}</h3>
                    </div>
                    <div class="p-6">${html}</div>
                    <div class="p-4 border-t border-white/10 flex justify-end gap-3">
                        <button id="form-cancel" class="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-all">Cancel</button>
                        <button id="form-confirm" class="px-4 py-2 rounded-lg ${colors[type]} hover:opacity-90 text-white font-medium transition-all">${confirmText}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const cleanup = () => {
                overlay.style.animation = 'fadeOut 0.2s ease forwards';
                setTimeout(() => overlay.remove(), 200);
            };

            overlay.querySelector('#form-cancel').onclick = () => { cleanup(); resolve(false); };
            overlay.querySelector('#form-confirm').onclick = () => { cleanup(); resolve(true); };
            overlay.onclick = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
        });
    }
    // ============================
    // GAME REPORTS MODULE
    // ============================

    async renderReports(el) {
        this.reports = [];
        el.innerHTML = `
            <div class="space-y-6">
                <!-- Stats -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="glass rounded-2xl border border-white/5 p-4">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-xl bg-orange-500/20"><i class="ph-fill ph-flag text-orange-400 text-xl"></i></div>
                            <div><div class="text-2xl font-bold text-white" id="reports-total">0</div><div class="text-xs text-slate-400">Total Reports</div></div>
                        </div>
                    </div>
                    <div class="glass rounded-2xl border border-white/5 p-4">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-xl bg-yellow-500/20"><i class="ph-fill ph-clock text-yellow-400 text-xl"></i></div>
                            <div><div class="text-2xl font-bold text-white" id="reports-pending">0</div><div class="text-xs text-slate-400">Pending</div></div>
                        </div>
                    </div>
                    <div class="glass rounded-2xl border border-white/5 p-4">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-xl bg-blue-500/20"><i class="ph-fill ph-eye text-blue-400 text-xl"></i></div>
                            <div><div class="text-2xl font-bold text-white" id="reports-reviewed">0</div><div class="text-xs text-slate-400">Reviewed</div></div>
                        </div>
                    </div>
                    <div class="glass rounded-2xl border border-white/5 p-4">
                        <div class="flex items-center gap-3">
                            <div class="p-3 rounded-xl bg-green-500/20"><i class="ph-fill ph-check-circle text-green-400 text-xl"></i></div>
                            <div><div class="text-2xl font-bold text-white" id="reports-resolved">0</div><div class="text-xs text-slate-400">Resolved</div></div>
                        </div>
                    </div>
                </div>
                
                <!-- Filters -->
                <div class="glass rounded-2xl border border-white/5 p-4">
                    <div class="flex flex-wrap gap-3 items-center">
                        <select id="reports-filter-type" onchange="admin.filterReports()" class="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                            <option value="all">All Types</option>
                            <option value="bug">🐛 Bug Report</option>
                            <option value="feature">💡 Feature Request</option>
                            <option value="feedback">💬 Feedback</option>
                            <option value="player">🚫 Player Report</option>
                            <option value="other">📝 Other</option>
                        </select>
                        <select id="reports-filter-status" onchange="admin.filterReports()" class="bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="resolved">Resolved</option>
                        </select>
                        <button onclick="admin.loadReports()" class="ml-auto px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 flex items-center gap-2">
                            <i class="ph-bold ph-arrows-clockwise"></i> Refresh
                        </button>
                    </div>
                </div>
                
                <!-- Reports List -->
                <div class="glass rounded-2xl border border-white/5 overflow-hidden">
                    <div class="p-4 border-b border-white/5 bg-slate-900/50">
                        <h3 class="font-bold text-white flex items-center gap-2"><i class="ph-fill ph-list text-orange-400"></i> All Reports</h3>
                    </div>
                    <div id="reports-list" class="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
                        <div class="p-8 text-center text-slate-500">Loading reports...</div>
                    </div>
                </div>
            </div>
        `;
        this.loadReports();
    }

    async loadReports() {
        try {
            const snapshot = await this.db.ref('gameReports').orderByChild('timestamp').once('value');
            const data = snapshot.val() || {};

            this.reports = Object.entries(data).map(([id, r]) => ({ id, ...r })).reverse();

            // Update stats
            const pending = this.reports.filter(r => r.status === 'pending').length;
            const reviewed = this.reports.filter(r => r.status === 'reviewed').length;
            const resolved = this.reports.filter(r => r.status === 'resolved').length;

            document.getElementById('reports-total').textContent = this.reports.length;
            document.getElementById('reports-pending').textContent = pending;
            document.getElementById('reports-reviewed').textContent = reviewed;
            document.getElementById('reports-resolved').textContent = resolved;

            this.filterReports();
        } catch (e) {
            console.error('Failed to load reports:', e);
            document.getElementById('reports-list').innerHTML = '<div class="p-8 text-center text-red-400">Failed to load reports</div>';
        }
    }

    filterReports() {
        const typeFilter = document.getElementById('reports-filter-type')?.value || 'all';
        const statusFilter = document.getElementById('reports-filter-status')?.value || 'all';

        let filtered = this.reports;
        if (typeFilter !== 'all') filtered = filtered.filter(r => r.type === typeFilter);
        if (statusFilter !== 'all') filtered = filtered.filter(r => r.status === statusFilter);

        this.renderReportsList(filtered);
    }

    renderReportsList(reports) {
        const el = document.getElementById('reports-list');
        if (!el) return;

        if (reports.length === 0) {
            el.innerHTML = '<div class="p-8 text-center text-slate-500">No reports found</div>';
            return;
        }

        const typeIcons = {
            bug: '🐛',
            feature: '💡',
            feedback: '💬',
            player: '🚫',
            other: '📝'
        };

        const statusColors = {
            pending: 'bg-yellow-500/20 text-yellow-400',
            reviewed: 'bg-blue-500/20 text-blue-400',
            resolved: 'bg-green-500/20 text-green-400'
        };

        el.innerHTML = reports.map(r => `
            <div class="p-4 hover:bg-white/5 transition-colors">
                <div class="flex items-start gap-4">
                    <div class="text-2xl">${typeIcons[r.type] || '📝'}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold text-white">${this.escapeHtml(r.subject)}</span>
                            <span class="px-2 py-0.5 rounded text-xs ${statusColors[r.status] || statusColors.pending}">${r.status}</span>
                        </div>
                        <p class="text-sm text-slate-400 mb-2 line-clamp-2">${this.escapeHtml(r.description)}</p>
                        <div class="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span><i class="ph-fill ph-user"></i> ${this.escapeHtml(r.userName || 'Unknown')}</span>
                            <span><i class="ph-fill ph-buildings"></i> ${this.escapeHtml(r.clubName || 'N/A')}</span>
                            <span><i class="ph-fill ph-clock"></i> ${r.timestamp ? new Date(r.timestamp).toLocaleString() : 'Unknown'}</span>
                            <span><i class="ph-fill ph-code"></i> ${r.gameVersion || 'N/A'}</span>
                        </div>
                        ${r.adminNotes ? `<div class="mt-2 p-2 rounded bg-indigo-500/10 text-sm text-indigo-300"><i class="ph-fill ph-note"></i> ${this.escapeHtml(r.adminNotes)}</div>` : ''}
                    </div>
                    <div class="flex flex-col gap-2">
                        <button onclick="admin.viewReport('${r.id}')" class="p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600" title="View Details">
                            <i class="ph-bold ph-eye"></i>
                        </button>
                        <button onclick="admin.updateReportStatus('${r.id}')" class="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500" title="Update Status">
                            <i class="ph-bold ph-pencil"></i>
                        </button>
                        <button onclick="admin.deleteReport('${r.id}')" class="p-2 rounded-lg bg-red-600/50 text-red-300 hover:bg-red-600" title="Delete">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async viewReport(id) {
        const report = this.reports.find(r => r.id === id);
        if (!report) return;

        const typeLabels = {
            bug: '🐛 Bug Report',
            feature: '💡 Feature Request',
            feedback: '💬 General Feedback',
            player: '🚫 Player Report',
            other: '📝 Other'
        };

        const html = `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div><span class="text-slate-400">Type:</span> <span class="text-white">${typeLabels[report.type] || report.type}</span></div>
                    <div><span class="text-slate-400">Status:</span> <span class="text-white">${report.status}</span></div>
                    <div><span class="text-slate-400">User:</span> <span class="text-white">${this.escapeHtml(report.userName)}</span></div>
                    <div><span class="text-slate-400">Email:</span> <span class="text-white">${report.userEmail || 'N/A'}</span></div>
                    <div><span class="text-slate-400">Club:</span> <span class="text-white">${this.escapeHtml(report.clubName)}</span></div>
                    <div><span class="text-slate-400">Version:</span> <span class="text-white">${report.gameVersion}</span></div>
                    <div class="col-span-2"><span class="text-slate-400">Platform:</span> <span class="text-white">${report.platform}</span></div>
                    <div class="col-span-2"><span class="text-slate-400">Submitted:</span> <span class="text-white">${new Date(report.timestamp).toLocaleString()}</span></div>
                </div>
                <div class="border-t border-white/10 pt-4">
                    <div class="text-slate-400 text-sm mb-2">Subject:</div>
                    <div class="text-white font-medium">${this.escapeHtml(report.subject)}</div>
                </div>
                <div class="border-t border-white/10 pt-4">
                    <div class="text-slate-400 text-sm mb-2">Description:</div>
                    <div class="text-white whitespace-pre-wrap bg-slate-800/50 p-3 rounded-lg">${this.escapeHtml(report.description)}</div>
                </div>
                ${report.adminNotes ? `
                <div class="border-t border-white/10 pt-4">
                    <div class="text-slate-400 text-sm mb-2">Admin Notes:</div>
                    <div class="text-indigo-300 bg-indigo-500/10 p-3 rounded-lg">${this.escapeHtml(report.adminNotes)}</div>
                </div>
                ` : ''}
            </div>
        `;

        await this.showFormModal('Report Details', html, 'Close', 'info');
    }

    async updateReportStatus(id) {
        const report = this.reports.find(r => r.id === id);
        if (!report) return;

        const html = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm text-slate-400 mb-2">Status</label>
                    <select id="report-new-status" class="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white">
                        <option value="pending" ${report.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="reviewed" ${report.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
                        <option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm text-slate-400 mb-2">Admin Notes</label>
                    <textarea id="report-admin-notes" rows="3" class="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white resize-none" placeholder="Add notes about this report...">${report.adminNotes || ''}</textarea>
                </div>
            </div>
        `;

        const confirmed = await this.showFormModal('Update Report', html, 'Save', 'primary');
        if (!confirmed) return;

        const newStatus = document.getElementById('report-new-status').value;
        const adminNotes = document.getElementById('report-admin-notes').value.trim();

        try {
            await this.db.ref(`gameReports/${id}`).update({
                status: newStatus,
                adminNotes: adminNotes || null,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });

            this.showToast('Report updated', 'success');
            this.loadReports();
        } catch (e) {
            console.error('Failed to update report:', e);
            this.showToast('Failed to update report', 'error');
        }
    }

    async deleteReport(id) {
        const confirmed = await this.showFormModal('Delete Report',
            '<p class="text-slate-400">Are you sure you want to delete this report? This cannot be undone.</p>',
            'Delete', 'danger');

        if (!confirmed) return;

        try {
            await this.db.ref(`gameReports/${id}`).remove();
            this.showToast('Report deleted', 'success');
            this.loadReports();
        } catch (e) {
            console.error('Failed to delete report:', e);
            this.showToast('Failed to delete report', 'error');
        }
    }
}

const admin = new AdminDashboard();
