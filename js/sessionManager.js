/**
 * Session Manager - Enforces single login per account
 * When user logs in, all other sessions are automatically disconnected
 */

class SessionManager {
    constructor() {
        this.sessionId = null;
        this.userId = null;
        this.sessionRef = null;
        this.sessionListener = null;
        this.isActive = true;
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get device info
     */
    getDeviceInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let os = 'Unknown';

        // Detect browser
        if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
        else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
        else if (ua.indexOf('Safari') > -1) browser = 'Safari';
        else if (ua.indexOf('Edge') > -1) browser = 'Edge';

        // Detect OS
        if (ua.indexOf('Windows') > -1) os = 'Windows';
        else if (ua.indexOf('Mac') > -1) os = 'macOS';
        else if (ua.indexOf('Linux') > -1) os = 'Linux';
        else if (ua.indexOf('Android') > -1) os = 'Android';
        else if (ua.indexOf('iOS') > -1) os = 'iOS';

        return `${browser} on ${os}`;
    }

    /**
     * Initialize session tracking
     */
    async initialize(userId) {
        if (!userId) {
            console.error('SessionManager: No userId provided');
            return;
        }

        this.userId = userId;
        this.sessionId = this.generateSessionId();
        this.isActive = true;

        console.log(`🔐 Session Manager initialized for user ${userId}`);
        console.log(`📱 Session ID: ${this.sessionId}`);

        try {
            const db = firebase.database();

            // First, disconnect ALL other sessions
            await this.disconnectOtherSessions();

            // Then create our session
            this.sessionRef = db.ref(`activeSessions/${userId}/${this.sessionId}`);

            await this.sessionRef.set({
                sessionId: this.sessionId,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                deviceInfo: this.getDeviceInfo(),
                userAgent: navigator.userAgent.substring(0, 200), // Limit length
                lastActivity: firebase.database.ServerValue.TIMESTAMP
            });

            // Setup auto-cleanup on disconnect
            await this.sessionRef.onDisconnect().remove();

            // Listen for other sessions trying to login (we'll get kicked out)
            this.listenForOtherSessions();

            console.log('✅ Session tracking active');
        } catch (error) {
            console.error('❌ Failed to initialize session:', error);
        }
    }

    /**
     * Disconnect all other sessions for this user
     */
    async disconnectOtherSessions() {
        if (!this.userId) return;

        try {
            const db = firebase.database();
            const sessionsRef = db.ref(`activeSessions/${this.userId}`);
            const snapshot = await sessionsRef.once('value');
            const sessions = snapshot.val();

            if (sessions) {
                console.log(`🔄 Disconnecting ${Object.keys(sessions).length} existing session(s)`);

                // Remove all existing sessions
                await sessionsRef.remove();

                console.log('✅ All previous sessions disconnected');
            }
        } catch (error) {
            console.error('❌ Failed to disconnect other sessions:', error);
        }
    }

    /**
     * Listen for other sessions (we get kicked out if someone else logs in)
     */
    listenForOtherSessions() {
        if (!this.userId || !this.sessionId) return;

        const db = firebase.database();
        const sessionsRef = db.ref(`activeSessions/${this.userId}`);

        // Use 'child_added' but only after we've set up our session
        // Add a small delay to prevent detecting our own session
        setTimeout(() => {
            this.sessionListener = sessionsRef.on('child_added', (snapshot) => {
                const sessionData = snapshot.val();
                const otherSessionId = snapshot.key;

                // If it's not our session and we're still active, we got kicked out
                if (otherSessionId !== this.sessionId && this.isActive) {
                    console.warn('⚠️ Another session detected - you have been logged out');
                    this.handleKickedOut(sessionData);
                }
            });
        }, 1000); // Wait 1 second after our session is created
    }

    /**
     * Handle being kicked out by another session
     */
    async handleKickedOut(newSessionData) {
        this.isActive = false;

        // Show notification
        if (window.ui && window.ui.notify) {
            window.ui.notify('⚠️ Account logged in from another device. You have been disconnected.', 'error');
        }

        // Wait a bit for user to see notification
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Force logout
        if (window.authSystem && window.authSystem.logout) {
            await window.authSystem.logout();
        }

        // Reload page to reset state
        window.location.reload();
    }

    /**
     * Update last activity timestamp
     */
    async updateActivity() {
        if (!this.sessionRef || !this.isActive) return;

        try {
            await this.sessionRef.update({
                lastActivity: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            // Silently fail - not critical
        }
    }

    /**
     * Clean up session
     */
    async cleanup() {
        console.log('🧹 Cleaning up session');

        this.isActive = false;

        // Remove listener
        if (this.sessionListener && this.userId) {
            const db = firebase.database();
            db.ref(`activeSessions/${this.userId}`).off('child_added', this.sessionListener);
            this.sessionListener = null;
        }

        // Remove session from database
        if (this.sessionRef) {
            try {
                await this.sessionRef.remove();
            } catch (error) {
                console.error('Failed to remove session:', error);
            }
            this.sessionRef = null;
        }

        this.userId = null;
        this.sessionId = null;
    }
}

// Create global instance
window.sessionManager = new SessionManager();

// Update activity periodically (every 30 seconds)
setInterval(() => {
    if (window.sessionManager && window.sessionManager.isActive) {
        window.sessionManager.updateActivity();
    }
}, 30000);

console.log('📦 Session Manager loaded');
