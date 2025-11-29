// Cloud Save System - Firebase Firestore
import { authSystem } from './auth.js';
import { ui } from './ui.js';

class CloudSaveSystem {
    constructor() {
        this.db = null;
        this.lastSaveTime = 0;
        this.saveInterval = 60000; // Auto-save every 60 seconds
        this.isSaving = false;
        this.blockSaves = false; // Only set to true during visit mode
    }
    
    init() {
        try {
            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                this.db = firebase.firestore();
            }
        } catch (err) {
            console.warn('Cloud save init error:', err);
        }
        
        // Start auto-save interval
        setInterval(() => this.autoSave(), this.saveInterval);
        
        // Save on window close
        window.addEventListener('beforeunload', () => {
            if (authSystem.isLoggedIn) {
                this.saveGame(window.game?.getSaveData?.() || {});
            }
        });
    }
    
    async saveGame(gameData, force = false) {
        if (!authSystem.isLoggedIn || !this.db) return false;
        if (this.isSaving && !force) return false;
        
        // Check if saves are blocked (during visit mode)
        if (this.blockSaves && !force) {
            console.log('Saves blocked (visit mode)');
            return false;
        }
        
        this.isSaving = true;
        
        try {
            const saveData = {
                ...gameData,
                savedAt: firebase.firestore.FieldValue.serverTimestamp(),
                version: '1.0.0',
                platform: 'web'
            };
            
            await this.db.collection('saves')
                .doc(authSystem.userId)
                .set(saveData);
            
            // Update user stats
            await authSystem.updateUserData({
                highestLevel: Math.max(gameData.level || 1, 1),
                totalPlayTime: firebase.firestore.FieldValue.increment(
                    (Date.now() - this.lastSaveTime) / 1000
                )
            });
            
            this.lastSaveTime = Date.now();
            this.isSaving = false;
            
            return true;
        } catch (error) {
            console.error('Cloud save error:', error);
            this.isSaving = false;
            return false;
        }
    }
    
    async loadGame() {
        console.log('=== CLOUD LOAD ===');
        console.log('User ID:', authSystem.userId);
        
        if (!authSystem.isLoggedIn || !this.db) {
            console.log('Not logged in or no db');
            return null;
        }
        
        try {
            const doc = await this.db.collection('saves')
                .doc(authSystem.userId)
                .get();
            
            if (doc.exists) {
                const data = doc.data();
                console.log('Cloud save found - Level:', data.level, 'Cash:', data.cash);
                this.lastSaveTime = Date.now();
                return data;
            }
            
            console.log('No cloud save for this user - will start fresh');
            return null;
        } catch (error) {
            console.error('Cloud load error:', error);
            return null;
        }
    }
    
    async autoSave() {
        // Block auto-save during registration
        if (this.blockSaves) {
            console.log('Auto-save blocked (registration in progress)');
            return;
        }
        
        if (!authSystem.isLoggedIn || !window.game) return;
        
        const saveData = window.game.getSaveData?.();
        if (saveData) {
            const success = await this.saveGame(saveData);
            if (success) {
                console.log('Auto-saved to cloud');
            }
        }
    }
    
    async deleteSave() {
        if (!authSystem.isLoggedIn || !this.db) return false;
        
        try {
            await this.db.collection('saves')
                .doc(authSystem.userId)
                .delete();
            
            ui.notify('Cloud save deleted', 'info');
            return true;
        } catch (error) {
            console.error('Delete save error:', error);
            return false;
        }
    }
    
    // Manual save with notification
    async saveNow() {
        if (!authSystem.isLoggedIn) {
            ui.notify('Login to save to cloud', 'error');
            return false;
        }
        
        const saveData = window.game?.getSaveData?.();
        if (saveData) {
            const success = await this.saveGame(saveData);
            if (success) {
                ui.notify('☁️ Saved to cloud!', 'success');
            } else {
                ui.notify('Save failed, try again', 'error');
            }
            return success;
        }
        return false;
    }
    
    // Check if cloud save exists
    async hasSave() {
        if (!authSystem.isLoggedIn || !this.db) return false;
        
        try {
            const doc = await this.db.collection('saves')
                .doc(authSystem.userId)
                .get();
            return doc.exists;
        } catch {
            return false;
        }
    }
    
    // Compare local and cloud saves
    async getSaveInfo() {
        const cloudSave = await this.loadGame();
        const localSave = localStorage.getItem('nightclub_save');
        
        return {
            hasCloud: !!cloudSave,
            hasLocal: !!localSave,
            cloudDate: cloudSave?.savedAt?.toDate?.() || null,
            localDate: localSave ? new Date(JSON.parse(localSave).savedAt) : null
        };
    }
}

export const cloudSave = new CloudSaveSystem();

// Expose to window for global access
window.cloudSave = cloudSave;
