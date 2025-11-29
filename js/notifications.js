// Notification System for Nightclub Empire
// Handles friend requests, followers, gifts, celebrity visits, etc.

const NotificationSystem = {
    notifications: [],
    maxNotifications: 50,
    
    // Notification types with icons and colors
    types: {
        friend_request: { icon: '👋', color: 'from-blue-500 to-cyan-500', label: 'Friend Request' },
        new_follower: { icon: '⭐', color: 'from-purple-500 to-pink-500', label: 'New Follower' },
        gift: { icon: '🎁', color: 'from-amber-500 to-orange-500', label: 'Gift Received' },
        celebrity: { icon: '🌟', color: 'from-yellow-400 to-amber-500', label: 'Celebrity Visit' },
        achievement: { icon: '🏆', color: 'from-green-500 to-emerald-500', label: 'Achievement' },
        level_up: { icon: '⬆️', color: 'from-violet-500 to-purple-500', label: 'Level Up' },
        message: { icon: '💬', color: 'from-gray-500 to-gray-600', label: 'Message' },
        event: { icon: '🎉', color: 'from-pink-500 to-rose-500', label: 'Event' },
        reward: { icon: '💰', color: 'from-green-400 to-emerald-500', label: 'Reward' },
        system: { icon: '📢', color: 'from-gray-600 to-gray-700', label: 'System' }
    },
    
    // Initialize the notification system
    init() {
        // Load saved notifications from localStorage
        const saved = localStorage.getItem('nightclub_notifications');
        if (saved) {
            try {
                this.notifications = JSON.parse(saved);
                this.updateUI();
            } catch (e) {
                this.notifications = [];
            }
        }
        
        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notification-panel');
            const bell = document.getElementById('notification-bell');
            if (panel && bell && !panel.contains(e.target) && !bell.contains(e.target)) {
                panel.classList.add('hidden');
            }
        });
        
        console.log('Notification system initialized');
    },
    
    // Add a new notification
    add(type, title, message, data = {}) {
        const typeInfo = this.types[type] || this.types.system;
        
        const notification = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            type: type,
            icon: typeInfo.icon,
            color: typeInfo.color,
            label: typeInfo.label,
            title: title,
            message: message,
            data: data,
            timestamp: Date.now(),
            read: false
        };
        
        // Add to beginning of array
        this.notifications.unshift(notification);
        
        // Limit notifications
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }
        
        // Save and update UI
        this.save();
        this.updateUI();
        
        // Play sound if available
        this.playSound();
        
        // Show toast notification
        this.showToast(notification);
        
        return notification;
    },
    
    // Mark notification as read
    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.save();
            this.updateUI();
        }
    },
    
    // Mark all as read
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.save();
        this.updateUI();
    },
    
    // Remove a notification
    remove(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.save();
        this.updateUI();
    },
    
    // Clear all notifications
    clearAll() {
        this.notifications = [];
        this.save();
        this.updateUI();
    },
    
    // Get unread count
    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    },
    
    // Save to localStorage
    save() {
        localStorage.setItem('nightclub_notifications', JSON.stringify(this.notifications));
    },
    
    // Update the UI
    updateUI() {
        const badge = document.getElementById('notification-badge');
        const list = document.getElementById('notification-list');
        
        // Update badge
        const unreadCount = this.getUnreadCount();
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        
        // Update list
        if (list) {
            if (this.notifications.length === 0) {
                list.innerHTML = '<div class="text-center text-gray-500 text-sm py-8">No notifications yet</div>';
            } else {
                list.innerHTML = this.notifications.map(n => this.renderNotification(n)).join('');
            }
        }
    },
    
    // Render a single notification
    renderNotification(n) {
        const timeAgo = this.getTimeAgo(n.timestamp);
        const unreadDot = n.read ? '' : '<div class="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>';
        
        return `
            <div class="relative p-3 rounded-xl ${n.read ? 'bg-white/5' : 'bg-white/10'} hover:bg-white/15 transition-all mb-2 cursor-pointer group" onclick="NotificationSystem.handleClick('${n.id}')">
                ${unreadDot}
                <div class="flex items-start gap-3 ${n.read ? '' : 'pl-3'}">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br ${n.color} flex items-center justify-center text-lg flex-shrink-0">
                        ${n.icon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <span class="text-white font-semibold text-sm truncate">${n.title}</span>
                            <button onclick="event.stopPropagation(); NotificationSystem.remove('${n.id}')" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all">
                                <i class="ph ph-x text-sm"></i>
                            </button>
                        </div>
                        <p class="text-gray-400 text-xs mt-0.5 line-clamp-2">${n.message}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-gray-500 text-[10px]">${n.label}</span>
                            <span class="text-gray-600 text-[10px]">•</span>
                            <span class="text-gray-500 text-[10px]">${timeAgo}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Handle notification click
    handleClick(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;
        
        // Mark as read
        this.markAsRead(id);
        
        // Handle different types
        switch (notification.type) {
            case 'friend_request':
                if (notification.data.userId) {
                    // Open friends panel or handle friend request
                    if (window.game && window.game.openModal) {
                        window.game.openModal('friends');
                    }
                }
                break;
            case 'gift':
                // Maybe open inventory or show gift details
                break;
            case 'celebrity':
                // Maybe highlight the celebrity in the club
                break;
            case 'achievement':
                if (window.game && window.game.openModal) {
                    window.game.openModal('achievements');
                }
                break;
        }
    },
    
    // Show toast notification
    showToast(notification) {
        const container = document.getElementById('notification-area');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'animate-slide-in-down bg-black/90 backdrop-blur-xl rounded-xl border border-white/20 p-3 flex items-center gap-3 shadow-2xl max-w-sm';
        toast.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-gradient-to-br ${notification.color} flex items-center justify-center text-lg flex-shrink-0">
                ${notification.icon}
            </div>
            <div class="flex-1 min-w-0">
                <div class="text-white font-semibold text-sm truncate">${notification.title}</div>
                <p class="text-gray-400 text-xs truncate">${notification.message}</p>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Remove after 4 seconds
        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },
    
    // Play notification sound
    playSound() {
        // You can add a notification sound here
        // const audio = new Audio('/sounds/notification.mp3');
        // audio.volume = 0.3;
        // audio.play().catch(() => {});
    },
    
    // Get time ago string
    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return new Date(timestamp).toLocaleDateString();
    }
};

// Toggle notification panel
function toggleNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    if (panel) {
        panel.classList.toggle('hidden');
        
        // Mark all as read when opening panel
        if (!panel.classList.contains('hidden')) {
            setTimeout(() => NotificationSystem.markAllAsRead(), 1000);
        }
    }
}

// Clear all notifications
function clearAllNotifications() {
    NotificationSystem.clearAll();
}

// Expose to window for global access
window.NotificationSystem = NotificationSystem;
window.toggleNotificationPanel = toggleNotificationPanel;
window.clearAllNotifications = clearAllNotifications;

// Helper function to send notifications easily
window.sendNotification = (type, title, message, data = {}) => {
    return NotificationSystem.add(type, title, message, data);
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    NotificationSystem.init();
});

// Example notifications for testing (remove in production)
// setTimeout(() => {
//     sendNotification('friend_request', 'DJ Mike', 'wants to be your friend!', { userId: '123' });
//     sendNotification('new_follower', 'Party Queen', 'started following your club', {});
//     sendNotification('gift', 'VIP Gift! 🎁', 'Someone sent you a Disco Ball decoration', { item: 'disco_ball' });
//     sendNotification('celebrity', 'Celebrity Alert! 🌟', 'Famous DJ is visiting your club tonight!', {});
// }, 3000);
