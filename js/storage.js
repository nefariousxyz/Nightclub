// Save/Load System with LocalStorage
const SAVE_KEY = 'nightclub_city_save';
const SAVE_VERSION = 1;

export const storage = {
    save(gameState) {
        const saveData = {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            cash: gameState.cash,
            hype: gameState.hype,
            barStock: gameState.barStock,
            level: gameState.level,
            xp: gameState.xp,
            clubName: gameState.clubName,
            clubTier: gameState.clubTier,
            ownerName: gameState.ownerName,
            maxVisitors: gameState.maxVisitors,
            spawnRate: gameState.spawnRate,
            stats: { ...gameState.stats },
            staff: { ...gameState.staff },
            achievements: [...gameState.achievements],
            totalEarnings: gameState.totalEarnings,
            totalDrinksServed: gameState.totalDrinksServed,
            totalVisitors: gameState.totalVisitors,
            playTime: gameState.playTime,
            furniture: gameState.furniture.map(f => ({
                type: f.userData.type,
                x: f.position.x,
                z: f.position.z,
                rotation: f.rotation.y
            })),
            tutorialComplete: gameState.tutorialComplete,
            soundEnabled: gameState.soundEnabled,
            musicEnabled: gameState.musicEnabled,
            challenges: window.challengeSystem?.save?.() || null
        };

        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    },

    load() {
        try {
            const data = localStorage.getItem(SAVE_KEY);
            if (!data) return null;
            
            const saveData = JSON.parse(data);
            
            // Version migration if needed
            if (saveData.version < SAVE_VERSION) {
                return this.migrate(saveData);
            }
            
            return saveData;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    },

    migrate(oldData) {
        // Handle save version migrations
        // For now, just return the data as-is
        return oldData;
    },

    hasSave() {
        return localStorage.getItem(SAVE_KEY) !== null;
    },

    deleteSave() {
        localStorage.removeItem(SAVE_KEY);
    },

    getLastSaveTime() {
        const data = this.load();
        if (data && data.timestamp) {
            return new Date(data.timestamp);
        }
        return null;
    }
};
