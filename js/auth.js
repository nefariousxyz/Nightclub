// Authentication System - Firebase Auth
import { firebaseConfig } from './firebase-config.js';
import { ui } from './ui.js';

class AuthSystem {
    constructor() {
        this.user = null;
        this.isInitialized = false;
        this.onAuthChangeCallbacks = [];
        this.auth = null;
        this.db = null;
    }
    
    async init() {
        try {
            // Check if Firebase SDK is loaded
            if (typeof firebase === 'undefined') {
                console.warn('Firebase SDK not loaded, auth disabled');
                this.isInitialized = true;
                return this;
            }
            
            // Initialize Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.auth = firebase.auth();
            
            // Ensure persistence is set to LOCAL
            await this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            
            this.db = firebase.firestore();
            
            // Listen for auth state changes
            this.auth.onAuthStateChanged(async (user) => {
                console.log('Auth state changed:', user ? 'Logged In (' + user.uid + ')' : 'Logged Out');
                
                // Fallback: If user is null but we have saved credentials, try to re-login
                if (!user) {
                    const savedCreds = localStorage.getItem('nc_auth_fallback');
                    if (savedCreds) {
                        try {
                            const { e, p } = JSON.parse(atob(savedCreds));
                            console.log('Attempting fallback login...');
                            const result = await this.auth.signInWithEmailAndPassword(e, p);
                            user = result.user;
                            console.log('Fallback login successful');
                        } catch (err) {
                            console.warn('Fallback login failed:', err);
                            localStorage.removeItem('nc_auth_fallback');
                        }
                    }
                }
                
                this.user = user;
                this.isInitialized = true;
                this.onAuthChangeCallbacks.forEach(cb => cb(user));
                this.updateUI();
            });
            
            // Set initialized after a short timeout in case onAuthStateChanged doesn't fire
            setTimeout(() => {
                this.isInitialized = true;
            }, 2000);
            
        } catch (error) {
            console.error('Firebase init error:', error);
            this.isInitialized = true; // Allow game to continue
        }
        
        return this;
    }
    
    onAuthChange(callback) {
        this.onAuthChangeCallbacks.push(callback);
        if (this.isInitialized) {
            callback(this.user);
        }
    }
    
    // Email/Password Registration
    async register(email, password, displayName) {
        try {
            if (!this.auth) {
                ui.notify('Auth not initialized. Please refresh.', 'error');
                return { success: false, error: 'Auth not initialized' };
            }
            
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            
            // Update local user reference immediately
            this.user = result.user;
            
            // Update display name
            await result.user.updateProfile({ displayName });
            
            // Create user document in Firestore
            await this.createUserDocument(result.user);
            
            // Save credentials for fallback
            localStorage.setItem('nc_auth_fallback', btoa(JSON.stringify({ e: email, p: password })));
            
            // Clear any existing localStorage data for new account
            localStorage.removeItem('nightclub_city_save');
            console.log('Cleared localStorage for new account');
            
            // Mark this as a new registration
            this.isNewRegistration = true;
            
            ui.notify(`Welcome, ${displayName}! Account created.`, 'success');
            return { success: true, user: result.user, isNewAccount: true };
        } catch (error) {
            console.error('Registration error:', error.code, error.message);
            const errorMsg = this.getErrorMessage(error.code) || error.message || 'Registration failed';
            ui.notify(errorMsg, 'error');
            alert('Registration Error: ' + errorMsg);
            return { success: false, error: error.message };
        }
    }
    
    // Email/Password Login
    async login(email, password) {
        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            this.user = result.user; // Update immediately
            // Save credentials for fallback
            localStorage.setItem('nc_auth_fallback', btoa(JSON.stringify({ e: email, p: password })));
            
            ui.notify(`Welcome back, ${result.user.displayName || 'Player'}!`, 'success');
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Login error:', error);
            const errorMsg = this.getErrorMessage(error.code);
            ui.notify(errorMsg, 'error');
            alert('Login Failed: ' + errorMsg);
            return { success: false, error: error.message };
        }
    }
    
    // Google Sign In
    async loginWithGoogle() {
        try {
            if (!this.auth) {
                ui.notify('Auth not initialized. Please refresh.', 'error');
                return { success: false, error: 'Auth not initialized' };
            }
            
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await this.auth.signInWithPopup(provider);
            
            // Update local user reference immediately
            this.user = result.user;
            
            // Check if new user
            if (result.additionalUserInfo?.isNewUser) {
                await this.createUserDocument(result.user);
                ui.notify(`Welcome, ${result.user.displayName}!`, 'success');
            } else {
                ui.notify(`Welcome back, ${result.user.displayName}!`, 'success');
            }
            
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Google login error:', error.code, error.message, error);
            const errorMsg = this.getErrorMessage(error.code) || error.message || 'Google sign-in failed';
            ui.notify(errorMsg, 'error');
            alert('Google Login Error: ' + errorMsg + '\n\nMake sure Google Sign-In is enabled in Firebase Console > Authentication > Sign-in method');
            return { success: false, error: error.message };
        }
    }
    
    // Logout
    async logout() {
        try {
            // Clear fallback credentials to prevent auto-login loop
            localStorage.removeItem('nc_auth_fallback');
            
            await this.auth.signOut();
            ui.notify('Logged out successfully', 'info');
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Create user document in Firestore
    async createUserDocument(user) {
        const userDoc = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Player',
            photoURL: user.photoURL || null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            
            // Premium status
            isVIP: false,
            vipExpiry: null,
            coins: 100, // Starting bonus
            totalCoinsSpent: 0,
            
            // Purchases
            purchases: [],
            ownedItems: [],
            
            // Stats
            totalPlayTime: 0,
            highestLevel: 1,
            totalCashEarned: 0
        };
        
        await this.db.collection('users').doc(user.uid).set(userDoc, { merge: true });
        return userDoc;
    }
    
    // Get user data from Firestore
    async getUserData() {
        if (!this.user) return null;
        
        const doc = await this.db.collection('users').doc(this.user.uid).get();
        return doc.exists ? doc.data() : null;
    }
    
    // Update user data
    async updateUserData(data) {
        if (!this.user) return false;
        
        // Use set with merge: true instead of update to prevent "not-found" errors
        // if the document somehow doesn't exist
        await this.db.collection('users').doc(this.user.uid).set({
            ...data,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
    }
    
    // Password reset
    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            ui.notify('Password reset email sent!', 'success');
            return { success: true };
        } catch (error) {
            ui.notify(this.getErrorMessage(error.code), 'error');
            return { success: false, error: error.message };
        }
    }
    
    // Update UI based on auth state
    async updateUI() {
        const loginBtn = document.getElementById('account-btn');
        const userInfo = document.getElementById('user-info'); // Legacy container
        
        // Target the specific elements found in index.html
        const accountName = document.getElementById('account-name');
        const accountAvatar = document.getElementById('account-avatar');
        const accountEmail = document.getElementById('account-email');
        
        if (this.user) {
            // Try to get avatar from DB if Auth one is missing or default
            let avatarUrl = this.user.photoURL;
            if (!avatarUrl && this.db) {
                try {
                    const snap = await this.db.collection('users').doc(this.user.uid).get(); // Try Firestore first as per original design
                    // Or try Realtime DB if that's where we are saving now
                    if (!snap.exists || !snap.data().photoURL) {
                         // Check Realtime DB profile path
                         if (firebase.apps.length) {
                             try {
                                 const rtdbSnap = await firebase.database().ref(`profiles/${this.user.uid}/avatarUrl`).once('value');
                                 if (rtdbSnap.exists()) avatarUrl = rtdbSnap.val();
                             } catch (e) {
                                 console.warn('RTDB Avatar check failed:', e);
                             }
                         }
                    }
                } catch (e) {
                    console.warn('Failed to fetch avatar from DB', e);
                }
            }

            // Update new account UI
            if (accountName) accountName.textContent = this.user.displayName || this.user.email?.split('@')[0] || 'Player';
            if (accountEmail) accountEmail.textContent = this.user.email;
            if (accountAvatar) {
                accountAvatar.src = avatarUrl || 'assets/logo.png';
                if (!avatarUrl) {
                     // Fallback to generated avatar if no photo
                     accountAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(accountName?.textContent || 'Player')}&background=random`;
                }
            }

            if (loginBtn) loginBtn.style.display = 'none';
            
            // Legacy support just in case
            if (userInfo) {
                userInfo.style.display = 'flex';
                const avatar = userInfo.querySelector('.user-avatar');
                const name = userInfo.querySelector('.user-name');
                if (avatar) avatar.src = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.displayName || 'Player')}&background=random`;
                if (name) name.textContent = this.user.displayName || 'Player';
            }
            
            // Sync with chat if available
            if (window.chatSystem && typeof window.chatSystem.syncUserProfile === 'function') {
                window.chatSystem.syncUserProfile(this.user);
            }
            
        } else {
            if (loginBtn) loginBtn.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
            
            // Reset account UI elements to default/hidden state if needed
            if (accountName) accountName.textContent = 'Player';
            if (accountAvatar) accountAvatar.src = 'assets/logo.png';
        }
    }
    
    getErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'Email already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/weak-password': 'Password too weak (min 6 chars)',
            'auth/user-not-found': 'Account not found',
            'auth/wrong-password': 'Incorrect password',
            'auth/invalid-credential': 'Wrong email or password',
            'auth/invalid-login-credentials': 'Wrong email or password',
            'auth/user-disabled': 'This account has been disabled',
            'auth/too-many-requests': 'Too many failed attempts. Try again later',
            'auth/popup-closed-by-user': 'Login cancelled',
            'auth/network-request-failed': 'Network error, try again',
            'auth/operation-not-allowed': 'This sign-in method is not enabled',
            'auth/requires-recent-login': 'Please log in again to continue'
        };
        return messages[code] || 'An error occurred';
    }
    
    get isLoggedIn() {
        return !!this.user;
    }
    
    get userId() {
        return this.user?.uid || null;
    }
    
    get userName() {
        return this.user?.displayName || 'Guest';
    }
}

export const authSystem = new AuthSystem();
