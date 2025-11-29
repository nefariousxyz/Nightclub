// Main Entry Point
import { initScene } from './scene.js';
import { game, FURNITURE_CATALOG } from './game.js';
import { CONFIG } from './config.js';
import { tutorialSystem } from './tutorial.js';
import { achievementSystem, ACHIEVEMENTS } from './achievements.js';
import { STAFF_TYPES, staffManager } from './staff.js';
import { friendsSystem } from './friends.js';
import { audioManager } from './audio.js';
import { storage } from './storage.js';
import { challengeSystem } from './challenges.js';
import { statisticsSystem } from './statistics.js';
import { timeSystem } from './timeSystem.js';
import { authSystem } from './auth.js';
import { cloudSave } from './cloudSave.js';
import { premiumSystem } from './premium.js';

// Expose systems globally for inline scripts
window.authSystem = authSystem;
window.game = game;
window.ui = ui;
window.tutorialSystem = tutorialSystem;

import { djSystem, MUSIC_GENRES } from './djSystem.js';
import { ui } from './ui.js';
import chatSystem from './chat.js';
import adminPanel from './admin.js';

// Global error handler
window.onerror = function(msg, url, line) {
    const errorLog = document.getElementById('error-log');
    if (errorLog) {
        errorLog.style.display = 'block';
        errorLog.innerHTML += `Error: ${msg} at line ${line}<br>`;
    }
    console.error(msg, url, line);
};

// Track if game has been initialized
let gameInitialized = false;

// Initialize game systems (called after login)
async function initializeGame() {
    if (gameInitialized) return;
    gameInitialized = true;
    
    // Initialize game (loads save if exists)
    await game.init();
    
    // Populate all dynamic content
    populateShop();
    populateStaffModal();
    try {
        populateFriendsModal();
    } catch (e) {
        console.warn('Friends modal population skipped:', e.message);
    }
    populateAchievementsModal();
    
    // Initialize Three.js scene
    initScene();
    
    // Initialize chat system (wait longer for Firebase)
    setTimeout(() => {
        chatSystem.init();
    }, 3000);
    
    // Initialize friends system (auto-initializes on import)
    
    // Show tutorial for new players
    if (!game.tutorialComplete && !storage.hasSave()) {
        setTimeout(() => {
            tutorialSystem.start(() => {
                game.tutorialComplete = true;
                game.autoSave();
            });
        }, 1000);
    }
}

// Hide session loader and show appropriate screen
function hideSessionLoader(showLoginGate = true) {
    const sessionLoader = document.getElementById('session-loader');
    const loginGate = document.getElementById('login-gate');
    
    if (sessionLoader) {
        sessionLoader.style.opacity = '0';
        setTimeout(() => {
            sessionLoader.style.display = 'none';
        }, 500);
    }
    
    if (showLoginGate && loginGate) {
        loginGate.classList.remove('hidden');
        loginGate.style.display = 'flex';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const loginGate = document.getElementById('login-gate');
    const sessionLoader = document.getElementById('session-loader');
    
    // Keep login gate hidden initially - session loader is visible
    if (loginGate) {
        loginGate.classList.add('hidden');
        loginGate.style.display = 'none';
    }
    
    // Safety timeout - never stay on session loader for more than 8 seconds
    const safetyTimeout = setTimeout(() => {
        console.warn('Session check timeout - forcing show login');
        hideSessionLoader(true);
    }, 8000);
    
    try {
        // Initialize Firebase Auth
        await authSystem.init();
        
        // Initialize Premium system (non-blocking)
        premiumSystem.init().catch(err => console.warn('Premium init failed:', err));
        
        // Initialize Cloud Save
        cloudSave.init();
        
        // Clear safety timeout since init succeeded
        clearTimeout(safetyTimeout);
        
        // Check if already logged in
        if (authSystem.user) {
            console.log('User already logged in:', authSystem.user.email);
            // User is logged in - hide loader without showing login gate
            hideSessionLoader(false);
            await initializeGame();
            startGameAfterLogin();
        } else {
            // Not logged in - show login gate
            hideSessionLoader(true);
        }
        
        // Listen for auth changes
        authSystem.onAuthChange(async (user) => {
            if (user && !gameInitialized) {
                // Check if this is a brand new account (just registered)
                const isNewAccount = localStorage.getItem('nightclub_new_account') || authSystem.isNewRegistration;
                if (isNewAccount) {
                    console.log('New account detected in auth callback - will start fresh');
                }
                
                await initializeGame();
                
                // Remove flag AFTER game.init() has read it
                if (isNewAccount) {
                    localStorage.removeItem('nightclub_new_account');
                }
                
                startGameAfterLogin(!!isNewAccount);
            }
            updateAccountUI();
        });
    } catch (err) {
        console.error('Firebase init error:', err);
        // Hide session loader and show login gate with error
        hideSessionLoader(true);
        const errorEl = document.querySelector('.gate-error');
        if (errorEl) {
            errorEl.textContent = 'Connection error. Please refresh.';
            errorEl.style.display = 'block';
        }
    }
});

// Expose hideSessionLoader globally for inline scripts
window.hideSessionLoader = hideSessionLoader;

// Music is now handled by YouTube DJ system
// Old audio system disabled - using YouTube instead
// document.addEventListener('click', () => {
//     if (game.musicEnabled && !audioManager.isMusicPlaying) {
//         audioManager.startMusic();
//     }
// }, { once: true });

// Backup click handlers for critical buttons
setTimeout(() => {
    const profileBtn = document.getElementById('account-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.game) window.game.openModal('profile');
        });
    }
    
    const partyBtn = document.getElementById('btn-event');
    if (partyBtn) {
        partyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.game && !partyBtn.disabled) window.game.planEvent();
        });
    }
    
    // Click outside modal to close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (window.game) window.game.closeModals();
            }
        });
    });
}, 1000);

// Current active furniture tab
let currentFurnitureTab = 'floors';

function populateShop(category = 'floors') {
    const shopGrid = document.getElementById('shop-grid');
    if (!shopGrid) return;
    
    // Update currency display
    const cashDisplay = document.getElementById('shop-cash');
    const diamondDisplay = document.getElementById('shop-diamonds');
    if (cashDisplay) cashDisplay.textContent = game.cash.toLocaleString();
    if (diamondDisplay) diamondDisplay.textContent = game.diamonds;

    shopGrid.innerHTML = '';
    currentFurnitureTab = category;
    
    // Filter items by category
    const items = Object.entries(FURNITURE_CATALOG).filter(([key, item]) => {
        if (category === 'premium') {
            return item.premium === true;
        }
        return item.category === category;
    });
    
    if (items.length === 0) {
        shopGrid.innerHTML = '<div class="shop-empty">No items in this category</div>';
        return;
    }
    
    items.forEach(([type, item]) => {
        const locked = item.unlockLevel && game.level < item.unlockLevel;
        const isDiamond = item.currency === 'diamonds';
        
        // Apply sale discount for cash items
        const isSaleActive = game.isSaleActive && game.isSaleActive();
        const originalCost = item.cost;
        const finalCost = (!isDiamond && isSaleActive) ? game.getSalePrice(originalCost) : originalCost;
        
        const canAfford = isDiamond ? game.diamonds >= finalCost : game.cash >= finalCost;
        
        const itemEl = document.createElement('div');
        itemEl.className = `shop-item ${locked ? 'locked' : ''} ${isDiamond ? 'premium' : ''} ${!canAfford && !locked ? 'unaffordable' : ''} ${isSaleActive && !isDiamond ? 'on-sale' : ''}`;
        itemEl.onclick = () => {
            if (locked) {
                ui.notify(`Unlock at level ${item.unlockLevel}!`, 'error');
                return;
            }
            game.buyFromCatalog(type);
            populateShop(currentFurnitureTab); // Refresh display
        };
        
        // Show sale price with strikethrough original
        let costDisplay;
        if (locked) {
            costDisplay = `🔒 Lvl ${item.unlockLevel}`;
        } else if (isDiamond) {
            costDisplay = `💎 ${finalCost}`;
        } else if (isSaleActive) {
            costDisplay = `<span class="original-price">$${originalCost.toLocaleString()}</span> <span class="sale-price">$${finalCost.toLocaleString()}</span>`;
        } else {
            costDisplay = `$${finalCost.toLocaleString()}`;
        }
        
        const saleBadge = (isSaleActive && !isDiamond && !locked) ? '<span class="sale-badge">50% OFF</span>' : '';
        
        itemEl.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <div class="item-name">${item.name}${saleBadge}</div>
            <div class="item-cost ${isDiamond ? 'diamond' : 'cash'}">${costDisplay}</div>
            <div class="item-desc">${item.desc}</div>
        `;
        
        shopGrid.appendChild(itemEl);
    });
}

// Expose populateShop to window for game.js
window.populateShop = populateShop;

// Switch furniture shop tab
window.switchFurnitureTab = function(category) {
    // Update active tab styling
    const tabs = document.querySelectorAll('#furniture-tabs .shop-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        // Check if this tab's onclick contains the category
        const onclick = tab.getAttribute('onclick') || '';
        if (onclick.includes(`'${category}'`)) {
            tab.classList.add('active');
        }
    });
    
    populateShop(category);
};

function populateStaffModal() {
    const staffList = document.getElementById('staff-list');
    if (!staffList) return;
    
    staffList.innerHTML = '';
    
    Object.entries(STAFF_TYPES).forEach(([type, data]) => {
        const row = document.createElement('div');
        row.className = 'staff-row';
        row.innerHTML = `
            <div class="staff-info">
                <div class="staff-icon">${data.icon}</div>
                <div class="staff-details">
                    <div class="staff-name">${data.name}</div>
                    <div class="staff-effect">${data.effect}</div>
                    <div class="staff-count">Hired: <span id="${type}-count">0</span>/${data.maxCount}</div>
                </div>
            </div>
            <button class="hire-btn" onclick="game.hireStaff('${type}')">
                Hire <span id="${type}-cost">$${data.baseCost}</span>
            </button>
        `;
        staffList.appendChild(row);
    });
}

function populateFriendsModal() {
    const friendsList = document.getElementById('friends-list');
    if (!friendsList) return;
    
    friendsList.innerHTML = '';
    
    // Check if method exists
    if (!friendsSystem || typeof friendsSystem.getAvailableClubs !== 'function') {
        console.log('Friends system not ready yet');
        return;
    }
    
    const clubs = friendsSystem.getAvailableClubs();
    
    clubs.forEach(club => {
        const row = document.createElement('div');
        row.className = `friend-row ${club.visited ? 'visited' : ''}`;
        row.innerHTML = `
            <div class="friend-info">
                <div class="friend-avatar">🏢</div>
                <div class="friend-details">
                    <div class="friend-name">${club.name}</div>
                    <div class="friend-owner">by ${club.owner} (Lvl ${club.level})</div>
                </div>
            </div>
            <button class="visit-btn" ${club.visited ? 'disabled' : ''} onclick="game.visitFriend('${club.id}')">
                ${club.visited ? '✓ Visited' : `Visit (+$${club.reward})`}
            </button>
        `;
        friendsList.appendChild(row);
    });
    
    // Add invite button
    const inviteRow = document.createElement('div');
    inviteRow.className = 'friend-row invite-row';
    inviteRow.innerHTML = `
        <button class="invite-btn" onclick="game.inviteFriends()">
            📢 Invite Friends (+10 Hype)
        </button>
        <button class="collect-btn" onclick="game.collectGifts()">
            🎁 Collect Gifts <span id="gift-badge" class="badge" style="display:none">0</span>
        </button>
    `;
    friendsList.appendChild(inviteRow);
}

function populateAchievementsModal() {
    const achievementsList = document.getElementById('achievements-list');
    if (!achievementsList) return;
    
    achievementsList.innerHTML = '';
    
    const allAchievements = achievementSystem.getAllAchievements();
    const progress = achievementSystem.getProgress();
    
    // Progress header
    const header = document.createElement('div');
    header.className = 'achievements-header';
    header.innerHTML = `
        <div class="achievements-progress">
            ${progress.unlocked}/${progress.total} Unlocked (${progress.percentage}%)
        </div>
        <div class="achievements-bar">
            <div class="achievements-bar-fill" style="width: ${progress.percentage}%"></div>
        </div>
    `;
    achievementsList.appendChild(header);
    
    allAchievements.forEach(achievement => {
        const row = document.createElement('div');
        row.className = `achievement-row ${achievement.unlocked ? 'unlocked' : 'locked'}`;
        row.innerHTML = `
            <div class="achievement-icon">${achievement.unlocked ? achievement.icon : '🔒'}</div>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.desc}</div>
            </div>
            ${achievement.unlocked ? '<div class="achievement-check">✓</div>' : ''}
        `;
        achievementsList.appendChild(row);
    });
}

// Populate Challenges Modal
function populateChallengesModal() {
    const challengesList = document.getElementById('challenges-list');
    if (!challengesList) return;
    
    challengesList.innerHTML = '';
    
    const challenges = challengeSystem.getChallenges();
    
    if (challenges.length === 0) {
        challengesList.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">No challenges available</div>';
        return;
    }
    
    challenges.forEach(challenge => {
        const progressPercent = Math.min(100, (challenge.progress / challenge.target) * 100);
        const row = document.createElement('div');
        row.className = `challenge-row ${challenge.completed ? 'completed' : ''}`;
        row.innerHTML = `
            <div class="challenge-row-icon">${challenge.icon}</div>
            <div class="challenge-row-info">
                <div class="challenge-row-name">${challenge.name}</div>
                <div class="challenge-row-desc">${challenge.desc}</div>
                <div class="challenge-row-progress">
                    <div class="challenge-row-progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
            <div class="challenge-row-reward">${challenge.completed ? '✓' : `$${challenge.reward}`}</div>
        `;
        challengesList.appendChild(row);
    });
}

// Populate Statistics Modal
function populateStatsModal() {
    const statsContent = document.getElementById('stats-content');
    if (!statsContent) return;
    
    statsContent.innerHTML = statisticsSystem.renderStatsModal(game);
}

// Challenge system is initialized when cloud data loads via game.loadFromSave()
// Do NOT call challengeSystem.init() here as it runs before cloud data arrives

// Refresh functions for dynamic updates
window.refreshShop = populateShop;
window.refreshFriends = populateFriendsModal;
window.refreshAchievements = populateAchievementsModal;
window.refreshChallenges = populateChallengesModal;
window.refreshStats = populateStatsModal;

// ========== AUTH & ACCOUNT FUNCTIONS ==========

// Update account UI elements
async function updateAccountUI() {
    const user = authSystem.user;
    
    // Update coins display
    const coinsDisplay = document.getElementById('coins-display');
    const shopCoinsDisplay = document.getElementById('shop-coins-display');
    const accountCoins = document.getElementById('account-coins');
    
    if (coinsDisplay) coinsDisplay.textContent = premiumSystem.coins.toLocaleString();
    if (shopCoinsDisplay) shopCoinsDisplay.textContent = premiumSystem.coins.toLocaleString();
    if (accountCoins) accountCoins.textContent = premiumSystem.coins.toLocaleString();
    
    // Update account modal
    if (user) {
        const avatar = document.getElementById('account-avatar');
        const name = document.getElementById('account-name');
        const email = document.getElementById('account-email');
        const level = document.getElementById('account-level');
        const hype = document.getElementById('account-hype');
        const cash = document.getElementById('account-cash');
        
        // Load avatar from localStorage or use default
        const savedAvatar = localStorage.getItem('nc_avatar');
        const defaultAvatar = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23667eea"/><text x="50" y="65" text-anchor="middle" fill="white" font-size="50">' + (user.displayName?.[0] || '?') + '</text></svg>';
        if (avatar) avatar.src = savedAvatar || defaultAvatar;
        
        if (name) name.textContent = user.displayName || 'Player';
        if (email) email.textContent = user.email;
        if (level) level.textContent = game.level;
        if (hype) hype.textContent = Math.floor(game.hype || 0);
        if (cash) cash.textContent = '$' + (game.cash || 0).toLocaleString();
        
        // Load Cover Photo from localStorage
        const cover = document.getElementById('profile-cover');
        const savedCover = localStorage.getItem('nc_cover');
        if (cover && savedCover) {
            cover.style.backgroundImage = `url('${savedCover}')`;
        }
    }
    
    premiumSystem.updateUI();
    
    // Update Facebook-style profile modal
    if (typeof updateFBProfileModal === 'function') {
        updateFBProfileModal();
    }
}

// ========== PROFILE FUNCTIONS ==========

// Update profile modal (Redesigned)
window.updateProfileModal = function() {
    updateFBProfileModal();
};

// Profile Edit Functions - File Upload

// Current avatar/cover URLs for cleanup
let currentAvatarPath = null;
let currentCoverPath = null;

// Trigger avatar file upload
window.triggerAvatarUpload = function() {
    const input = document.getElementById('avatar-upload-input') || document.getElementById('avatar-file-input');
    if (input) {
        input.click();
    } else {
        // Create dynamically
        const newInput = document.createElement('input');
        newInput.type = 'file';
        newInput.id = 'avatar-upload-input';
        newInput.accept = 'image/*';
        newInput.style.display = 'none';
        newInput.onchange = handleAvatarUpload;
        document.body.appendChild(newInput);
        newInput.click();
    }
};

// Trigger cover file upload
window.triggerCoverUpload = function() {
    const input = document.getElementById('cover-upload-input') || document.getElementById('cover-file-input');
    if (input) {
        input.click();
    } else {
        // Create dynamically
        const newInput = document.createElement('input');
        newInput.type = 'file';
        newInput.id = 'cover-upload-input';
        newInput.accept = 'image/*';
        newInput.style.display = 'none';
        newInput.onchange = handleCoverUpload;
        document.body.appendChild(newInput);
        newInput.click();
    }
};

// Initialize file input listeners
document.addEventListener('DOMContentLoaded', () => {
    // Handled by inline onchange events in index.html
    /*
    const avatarInput = document.getElementById('avatar-upload-input') || document.getElementById('avatar-file-input');
    const coverInput = document.getElementById('cover-upload-input') || document.getElementById('cover-file-input');
    
    if (avatarInput) {
        avatarInput.addEventListener('change', handleAvatarUpload);
    }
    if (coverInput) {
        coverInput.addEventListener('change', handleCoverUpload);
    }
    */
});

// Avatar upload handling - DEPRECATED: Handled by index.html server upload
/*
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        ui.notify('Image too large. Maximum size is 5MB.', 'error');
        return;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        ui.notify('Invalid file type. Use JPEG, PNG, GIF, or WebP.', 'error');
        return;
    }
    
    ui.notify('Uploading avatar...', 'info');
    
    try {
        // Convert to base64 data URL
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dataURL = e.target.result;
                
                // Store in localStorage
                localStorage.setItem('nc_avatar', dataURL);
                
                currentAvatarPath = dataURL;
                
                // Update UI
                const avatarImg = document.getElementById('account-avatar');
                const postAvatarImg = document.getElementById('create-post-avatar');
                if (avatarImg) avatarImg.src = dataURL;
                if (postAvatarImg) postAvatarImg.src = dataURL;
                
                ui.notify('Profile picture updated!', 'success');
            } catch (err) {
                console.error('Avatar save error:', err);
                ui.notify('Failed to save avatar', 'error');
            }
        };
        reader.onerror = () => {
            ui.notify('Failed to read file', 'error');
        };
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('Avatar upload error:', error);
        ui.notify('Upload failed: ' + (error.message || 'Unknown error'), 'error');
    }
    
    // Reset input
    event.target.value = '';
}
*/

// Handle cover file upload - DEPRECATED: Handled by index.html server upload
/*
async function handleCoverUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        ui.notify('Image too large. Maximum size is 10MB.', 'error');
        return;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        ui.notify('Invalid file type. Use JPEG, PNG, GIF, or WebP.', 'error');
        return;
    }
    
    ui.notify('Uploading cover photo...', 'info');
    
    try {
        // Convert to base64 data URL
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const dataURL = e.target.result;
                
                // Store in localStorage
                localStorage.setItem('nc_cover', dataURL);
                
                currentCoverPath = dataURL;
                
                // Update UI
                const cover = document.getElementById('profile-cover');
                if (cover) cover.style.backgroundImage = `url('${dataURL}')`;
                
                ui.notify('Cover photo updated!', 'success');
            } catch (err) {
                console.error('Cover save error:', err);
                ui.notify('Failed to save cover', 'error');
            }
        };
        reader.onerror = () => {
            ui.notify('Failed to read file', 'error');
        };
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error('Cover upload error:', error);
        ui.notify('Upload failed: ' + (error.message || 'Unknown error'), 'error');
    }
    
    // Reset input
    event.target.value = '';
}
*/

// Legacy functions (fallback to URL if needed)
window.editProfileAvatar = async function() {
    const url = prompt('Enter URL for new profile picture:', authSystem.user?.photoURL || '');
    if (url && url.startsWith('http')) {
        try {
            await authSystem.updateUserData({ photoURL: url });
            document.getElementById('account-avatar').src = url;
            ui.notify('Profile picture updated!', 'success');
        } catch (e) {
            ui.notify('Failed to update profile picture', 'error');
        }
    }
};

window.editProfileCover = async function() {
    const currentData = await authSystem.getUserData();
    const url = prompt('Enter URL for cover photo:', currentData?.coverURL || '');
    if (url && url.startsWith('http')) {
        try {
            await authSystem.updateUserData({ coverURL: url });
            const cover = document.getElementById('profile-cover');
            if (cover) cover.style.backgroundImage = `url('${url}')`;
            ui.notify('Cover photo updated!', 'success');
        } catch (e) {
            ui.notify('Failed to update cover photo', 'error');
        }
    }
};

window.editProfileName = async function() {
    const name = prompt('Enter new display name:', authSystem.user?.displayName || '');
    if (name && name.length > 0) {
        try {
            await authSystem.user.updateProfile({ displayName: name });
            await authSystem.updateUserData({ displayName: name });
            document.getElementById('account-name').textContent = name;
            ui.notify('Name updated!', 'success');
        } catch (e) {
            ui.notify('Failed to update name', 'error');
        }
    }
};

// ========== FACEBOOK PROFILE FUNCTIONS ==========

// Profile posts storage
let profilePosts = [];

// Switch profile tabs
window.switchProfileTab = function(tab) {
    const tabs = document.querySelectorAll('.fb-tab');
    const postsTab = document.getElementById('profile-posts-tab');
    const aboutTab = document.getElementById('profile-about-tab');
    const achievementsTab = document.getElementById('profile-achievements-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    postsTab.style.display = tab === 'posts' ? 'block' : 'none';
    aboutTab.style.display = tab === 'about' ? 'block' : 'none';
    achievementsTab.style.display = tab === 'achievements' ? 'block' : 'none';
    
    if (tab === 'achievements') loadProfileAchievements();
};

// Create a profile post
window.createProfilePost = function() {
    const input = document.getElementById('new-post-input');
    const content = input.value.trim();
    
    if (!content) {
        ui.notify('Write something first!', 'error');
        return;
    }
    
    const post = {
        id: Date.now(),
        content: content,
        author: authSystem.user?.displayName || game.ownerName || 'Player',
        avatar: authSystem.user?.photoURL || '',
        time: new Date(),
        likes: 0,
        liked: false
    };
    
    profilePosts.unshift(post);
    input.value = '';
    renderProfilePosts();
    ui.notify('Post created!', 'success');
};

// Toggle post like
window.togglePostLike = function(postId) {
    const post = profilePosts.find(p => p.id === postId);
    if (post) {
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
        renderProfilePosts();
    }
};

// Render profile posts
function renderProfilePosts() {
    const feed = document.getElementById('profile-posts-feed');
    if (!feed) return;
    
    if (profilePosts.length === 0) {
        feed.innerHTML = `
            <div class="fb-empty-state">
                <div class="icon">📝</div>
                <p>No posts yet. Share what's happening at your club!</p>
            </div>
        `;
        return;
    }
    
    feed.innerHTML = profilePosts.map(post => {
        const timeAgo = getTimeAgo(post.time);
        return `
            <div class="fb-post">
                <div class="fb-post-header">
                    <img class="fb-post-author-avatar" src="${post.avatar}" alt="" onerror="this.style.background='linear-gradient(135deg, #3b82f6, #8b5cf6)'">
                    <div class="fb-post-author-info">
                        <div class="fb-post-author-name">${post.author}</div>
                        <div class="fb-post-time">${timeAgo}</div>
                    </div>
                </div>
                <div class="fb-post-body">${post.content}</div>
                <div class="fb-post-actions">
                    <button class="fb-reaction-btn ${post.liked ? 'liked' : ''}" onclick="togglePostLike(${post.id})">
                        ${post.liked ? '❤️' : '🤍'} <span class="count">${post.likes}</span> Like
                    </button>
                    <button class="fb-reaction-btn">💬 Comment</button>
                    <button class="fb-reaction-btn">🔗 Share</button>
                </div>
            </div>
        `;
    }).join('');
}

// Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
}

// Load achievements
function loadProfileAchievements() {
    const grid = document.getElementById('fb-achievements-list');
    if (!grid) return;
    
    const achievements = [
        { icon: '🎉', name: 'First Night', desc: 'Open your club', unlocked: true },
        { icon: '💰', name: 'Big Spender', desc: 'Earn $10,000', unlocked: (game.totalEarnings || 0) >= 10000 },
        { icon: '🏆', name: 'Level 5', desc: 'Reach level 5', unlocked: game.level >= 5 },
        { icon: '🌟', name: 'Level 10', desc: 'Reach level 10', unlocked: game.level >= 10 },
        { icon: '👑', name: 'VIP Owner', desc: 'Become a VIP', unlocked: premiumSystem?.isVIP },
        { icon: '🍸', name: 'Bartender', desc: 'Serve 100 drinks', unlocked: (game.totalDrinksServed || 0) >= 100 },
        { icon: '🎪', name: 'Event Host', desc: 'Host 10 events', unlocked: (game.eventsHosted || 0) >= 10 },
        { icon: '🏢', name: 'Upgrader', desc: 'Upgrade your club', unlocked: game.clubTier > 0 },
        { icon: '👥', name: 'Popular', desc: '50 visitors', unlocked: (game.totalVisitors || 0) >= 50 },
        { icon: '🔥', name: 'On Fire', desc: 'Reach 100 hype', unlocked: game.hype >= 100 },
        { icon: '💎', name: 'Rich', desc: 'Earn $100,000', unlocked: (game.totalEarnings || 0) >= 100000 },
        { icon: '🎵', name: 'DJ Master', desc: 'Play 50 tracks', unlocked: false }
    ];
    
    grid.innerHTML = achievements.map(a => `
        <div class="fb-achievement ${a.unlocked ? 'unlocked' : 'locked'}">
            <span class="fb-achievement-icon">${a.icon}</span>
            <div class="fb-achievement-name">${a.name}</div>
            <div class="fb-achievement-desc">${a.desc}</div>
        </div>
    `).join('');
}

// Update Facebook-style profile modal
window.updateFBProfileModal = function() {
    const user = authSystem.user;
    
    // Avatar
    const avatar = document.getElementById('account-avatar');
    const postAvatar = document.getElementById('create-post-avatar');
    if (avatar) avatar.src = user?.photoURL || '';
    if (postAvatar) postAvatar.src = user?.photoURL || '';
    
    // Name and email
    const name = document.getElementById('account-name');
    const email = document.getElementById('account-email');
    if (name) name.textContent = user?.displayName || game.ownerName || 'Player';
    if (email) email.textContent = user?.email || '';
    
    // VIP Status
    const vipBadge = document.getElementById('vip-status');
    if (vipBadge) {
        if (premiumSystem?.isVIP) {
            vipBadge.textContent = '👑 VIP';
            vipBadge.className = 'fb-vip-badge active';
        } else {
            vipBadge.textContent = 'Free';
            vipBadge.className = 'fb-vip-badge inactive';
        }
    }
    
    // Joined date
    const joined = document.getElementById('profile-joined');
    if (joined && user?.metadata?.creationTime) {
        const date = new Date(user.metadata.creationTime);
        joined.textContent = 'Joined ' + date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    
    // Stats bar
    document.getElementById('fb-level')?.textContent && (document.getElementById('fb-level').textContent = game.level || 1);
    document.getElementById('fb-cash')?.textContent && (document.getElementById('fb-cash').textContent = '$' + (game.cash || 0).toLocaleString());
    document.getElementById('fb-coins')?.textContent && (document.getElementById('fb-coins').textContent = (premiumSystem?.coins || 0).toLocaleString());
    document.getElementById('fb-hype')?.textContent && (document.getElementById('fb-hype').textContent = Math.floor(game.hype || 0));
    document.getElementById('fb-visitors')?.textContent && (document.getElementById('fb-visitors').textContent = game.visitors?.length || 0);
    
    // About tab - Club info
    const clubName = document.getElementById('fb-club-name');
    const clubTier = document.getElementById('fb-club-tier');
    const capacity = document.getElementById('fb-capacity');
    if (clubName) clubName.textContent = game.clubName || 'My Club';
    if (clubTier && game.getClubTierInfo) {
        const tierInfo = game.getClubTierInfo();
        clubTier.textContent = tierInfo?.name || 'Tiny Bar';
        if (capacity) capacity.textContent = (tierInfo?.maxVisitors || 8) + ' visitors';
    }
    
    // About tab - Lifetime stats
    document.getElementById('fb-total-earnings')?.textContent && (document.getElementById('fb-total-earnings').textContent = '$' + (game.totalEarnings || 0).toLocaleString());
    document.getElementById('fb-total-visitors')?.textContent && (document.getElementById('fb-total-visitors').textContent = (game.totalVisitors || 0).toLocaleString());
    document.getElementById('fb-drinks-served')?.textContent && (document.getElementById('fb-drinks-served').textContent = (game.totalDrinksServed || 0).toLocaleString());
    document.getElementById('fb-events-hosted')?.textContent && (document.getElementById('fb-events-hosted').textContent = (game.eventsHosted || 0).toLocaleString());
    
    // Play time
    document.getElementById('fb-days-played')?.textContent && (document.getElementById('fb-days-played').textContent = game.totalDaysPlayed || 1);
    document.getElementById('fb-current-day')?.textContent && (document.getElementById('fb-current-day').textContent = 'Day ' + (game.day || 1));
    
    // Load cover photo
    authSystem.getUserData?.().then(data => {
        if (data?.coverURL) {
            const cover = document.getElementById('profile-cover');
            if (cover) cover.style.backgroundImage = `url('${data.coverURL}')`;
        }
    }).catch(() => {});
    
    // Render posts
    renderProfilePosts();
};

// Login tab switching
window.switchLoginTab = function(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabs = document.querySelectorAll('.login-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'login') {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
    }
};

// Handle login
window.handleLogin = async function() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = event.currentTarget || event.target;
    
    if (!email || !password) {
        ui.notify('Please fill in all fields', 'error');
        return;
    }
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph-fill ph-circle-notch" style="animation:spin 1s linear infinite"></i> Logging in...';
    
    try {
        const result = await authSystem.login(email, password);
        if (result.success) {
            // Close modals explicitly
            if (typeof game !== 'undefined' && game.closeModals) {
                game.closeModals();
            }
            document.getElementById('login-modal').classList.add('hidden');
            
            // Start game if on landing page
            startGameAfterLogin();
        } else {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (e) {
        console.error('Login error:', e);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// Handle register
window.handleRegister = async function() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const clubName = document.getElementById('register-club-name')?.value || name + "'s Club";
    
    if (!name || !email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    // Set flag BEFORE registration so after reload it starts fresh with club name
    localStorage.setItem('nightclub_new_account', JSON.stringify({ clubName, ownerName: name }));
    
    const result = await authSystem.register(email, password, name);
    if (result.success) {
        // BLOCK saves to prevent old data going to new account
        if (window.cloudSave) {
            window.cloudSave.blockSaves = true;
            
            // DELETE any cloud data that might have been auto-saved
            try {
                await window.cloudSave.deleteSave();
                console.log('Cleared cloud for new account');
            } catch (e) {
                console.warn('Could not clear cloud:', e);
            }
        }
        
        console.log('New account created - reloading');
        
        // Reload - new account has no cloud data so will start fresh
        location.reload();
        return;
    } else {
        // Registration failed, clear the flag
        localStorage.removeItem('nightclub_new_account');
    }
};

// Handle Google login
window.handleGoogleLogin = async function() {
    const result = await authSystem.loginWithGoogle();
    if (result.success) {
        game.closeModals();
    }
};

// Handle forgot password
window.handleForgotPassword = async function() {
    const email = document.getElementById('login-email').value;
    if (!email) {
        alert('Enter your email first');
        return;
    }
    await authSystem.resetPassword(email);
};

// Handle logout
window.handleLogout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        await authSystem.logout();
        game.closeModals();
        // Reload page to show login gate
        setTimeout(() => {
            location.reload();
        }, 500);
    }
};

// RESET GAME - Force fresh start
window.resetGame = async function() {
    if (!confirm('Are you sure you want to RESET your game? This will delete ALL your progress!')) {
        return;
    }
    
    console.log('=== RESETTING GAME ===');
    
    // Block saves
    if (window.cloudSave) {
        window.cloudSave.blockSaves = true;
        
        // Delete cloud save
        try {
            await window.cloudSave.deleteSave();
            console.log('Cloud save deleted');
        } catch (e) {
            console.error('Failed to delete cloud save:', e);
        }
    }
    
    // Clear ALL localStorage
    localStorage.clear();
    console.log('localStorage cleared');
    
    // Clear IndexedDB (Firebase cache)
    try {
        const databases = await indexedDB.databases();
        for (const db of databases) {
            indexedDB.deleteDatabase(db.name);
            console.log('Deleted IndexedDB:', db.name);
        }
    } catch (e) {
        console.warn('Could not clear IndexedDB:', e);
    }
    
    // Set fresh start flag
    localStorage.setItem('nightclub_new_account', JSON.stringify({ reset: true }));
    
    alert('Game reset! Page will reload.');
    location.reload();
};

// Cloud save now
window.cloudSaveNow = async function() {
    await cloudSave.saveNow();
};

// ========== YOUTUBE DJ FUNCTIONS ==========

// Add YouTube track to queue
window.addYouTubeTrack = function() {
    const input = document.getElementById('youtube-url-input');
    if (!input) return;
    
    const url = input.value.trim();
    if (!url) {
        ui.notify('Please enter a YouTube URL', 'warning');
        return;
    }
    
    if (djSystem.addYouTubeToQueue(url)) {
        input.value = ''; // Clear input on success
    }
};

// ========== SHOP FUNCTIONS ==========

// Shop tab switching
window.switchShopTab = function(tab) {
    const tabs = document.querySelectorAll('.shop-tab');
    const sections = document.querySelectorAll('.shop-section');
    
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    sections.forEach(s => s.style.display = 'none');
    document.getElementById(`shop-${tab}`).style.display = 'block';
    
    // Update coins display
    const shopCoins = document.getElementById('shop-coins-display');
    if (shopCoins) shopCoins.textContent = premiumSystem.coins.toLocaleString();
};

// Purchase VIP
window.purchaseVIP = async function(productId) {
    if (!authSystem.isLoggedIn) {
        alert('Please login first to make purchases');
        game.openModal('login');
        return;
    }
    await premiumSystem.purchaseVIP(productId);
    updateAccountUI();
};

// Purchase coins
window.purchaseCoins = async function(productId) {
    if (!authSystem.isLoggedIn) {
        alert('Please login first to make purchases');
        game.openModal('login');
        return;
    }
    await premiumSystem.purchaseCoins(productId);
    updateAccountUI();
};

// Purchase item with coins
window.purchaseItem = async function(itemId) {
    if (!authSystem.isLoggedIn) {
        alert('Please login first');
        game.openModal('login');
        return;
    }
    await premiumSystem.purchaseItem(itemId);
    updateAccountUI();
};

// Make systems available globally
window.authSystem = authSystem;
window.premiumSystem = premiumSystem;
window.cloudSave = cloudSave;
window.updateAccountUI = updateAccountUI;

// ========== LOGIN GATE FUNCTIONS ==========

let gameStarted = false;

// Load login gate stats & leaderboard
async function loadGateStats() {
    // Check if Firebase is initialized
    if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
        console.warn('Firebase not ready for gate stats');
        return;
    }
    
    const db = firebase.database();
    
    try {
        // Load top players
        const usersSnap = await db.ref('userProfiles').orderByChild('level').limitToLast(5).once('value');
        const leaderboardEl = document.getElementById('gate-leaderboard');
        if (leaderboardEl && usersSnap.exists()) {
            const users = [];
            usersSnap.forEach(c => users.push({ uid: c.key, ...c.val() }));
            users.reverse();
            
            leaderboardEl.innerHTML = users.map((u, i) => {
                const rankColors = ['linear-gradient(135deg,#ffd700,#ffaa00)', 'linear-gradient(135deg,#c0c0c0,#a0a0a0)', 'linear-gradient(135deg,#cd7f32,#b5651d)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.1)'];
                const textColor = i < 2 ? '#000' : '#fff';
                return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:10px;">
                    <div style="width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;background:${rankColors[i]};color:${textColor};">${i + 1}</div>
                    <div style="font-size:22px;">${u.avatar || '👤'}</div>
                    <div style="flex:1;">
                        <div style="font-size:12px;font-weight:600;color:white;">${escapeHtml(u.name || 'Player')}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.4);">${escapeHtml(u.clubName || 'Unknown Club')}</div>
                    </div>
                    <div style="background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;">Lv ${u.level || 1}</div>
                </div>`;
            }).join('');
        } else if (leaderboardEl) {
            leaderboardEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;font-size:12px;">No players yet</div>';
        }
        
        // Load top clubs
        const clubsSnap = await db.ref('clubs').orderByChild('likes').limitToLast(4).once('value');
        const clubsEl = document.getElementById('gate-top-clubs');
        if (clubsEl && clubsSnap.exists()) {
            const clubs = [];
            clubsSnap.forEach(c => clubs.push({ uid: c.key, ...c.val() }));
            clubs.reverse();
            
            clubsEl.innerHTML = clubs.map(c => `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:10px;">
                <div style="width:32px;height:32px;background:linear-gradient(135deg,#ff0066,#ff6b6b);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;">🏢</div>
                <div style="flex:1;">
                    <div style="font-size:12px;font-weight:600;color:white;">${escapeHtml(c.name || 'Unnamed Club')}</div>
                    <div style="font-size:10px;color:rgba(255,255,255,0.4);">by ${escapeHtml(c.ownerName || 'Unknown')}</div>
                </div>
                <div style="display:flex;align-items:center;gap:4px;color:#ff0066;font-size:11px;font-weight:600;">❤️ ${c.likes || 0}</div>
            </div>`).join('');
        } else if (clubsEl) {
            clubsEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;font-size:12px;">No clubs yet</div>';
        }
        
        // Load live stats
        const [onlineSnap, totalClubsSnap, msgsSnap] = await Promise.all([
            db.ref('onlineUsers').once('value'),
            db.ref('clubs').once('value'),
            db.ref('globalChat').once('value')
        ]);
        
        const onlineEl = document.getElementById('gate-online-count');
        const clubsCountEl = document.getElementById('gate-total-clubs');
        const msgsCountEl = document.getElementById('gate-total-msgs');
        
        if (onlineEl) onlineEl.textContent = onlineSnap.exists() ? Object.keys(onlineSnap.val()).length : 0;
        if (clubsCountEl) clubsCountEl.textContent = totalClubsSnap.exists() ? Object.keys(totalClubsSnap.val()).length : 0;
        if (msgsCountEl) {
            const msgCount = msgsSnap.exists() ? Object.keys(msgsSnap.val()).length : 0;
            msgsCountEl.textContent = msgCount > 1000 ? (msgCount / 1000).toFixed(1) + 'K' : msgCount;
        }
    } catch (err) {
        console.warn('Failed to load gate stats:', err);
    }
}

// Helper for HTML escaping
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

// Initialize gate stats when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadGateStats, 3000); // Wait for Firebase to init
});

// Switch gate tabs
window.switchGateTab = function(tab) {
    const loginForm = document.getElementById('gate-login-form');
    const registerForm = document.getElementById('gate-register-form');
    const tabs = document.querySelectorAll('.gate-tab');
    
    tabs.forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'login') {
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
    }
};

// Gate login
window.gateLogin = async function() {
    const email = document.getElementById('gate-login-email').value;
    const password = document.getElementById('gate-login-password').value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph-fill ph-circle-notch" style="animation:spin 1s linear infinite"></i> Logging in...';
    
    const result = await authSystem.login(email, password);
    
    if (result.success) {
        startGameAfterLogin();
    } else {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-fill ph-play"></i> Login & Play';
    }
};

// Gate register
window.gateRegister = async function() {
    const name = document.getElementById('gate-register-name')?.value?.trim();
    const clubName = document.getElementById('gate-register-club')?.value?.trim();
    const email = document.getElementById('gate-register-email')?.value?.trim();
    const password = document.getElementById('gate-register-password')?.value;
    
    if (!name || !clubName || !email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    if (!authSystem?.auth) {
        alert('Firebase not ready. Please wait and try again.');
        return;
    }
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph-fill ph-circle-notch" style="animation:spin 1s linear infinite"></i> Creating...';
    
    // Set flag BEFORE registration so auth callback knows this is a new account
    localStorage.setItem('nightclub_new_account', JSON.stringify({ clubName, ownerName: name }));
    
    try {
        const result = await authSystem.register(email, password, name);
        
        if (result.success) {
            // Game init will detect the new account flag and start fresh
            // Set initial club data after game is initialized
            if (gameInitialized) {
                game.clubName = clubName;
                game.ownerName = name;
                game.clubTier = 1;
                game.autoSave();
            }
            
            // If game already started via auth callback, just update display
            if (gameStarted) {
                game.clubName = clubName;
                game.ownerName = name;
                updateClubDisplay();
                game.autoSave();
            } else {
                startGameAfterLogin(true);
            }
        } else {
            // Registration failed, clear the flag
            localStorage.removeItem('nightclub_new_account');
            btn.disabled = false;
            btn.textContent = '🎉 Create Account & Play';
        }
    } catch (err) {
        console.error('Register error:', err);
        // Registration failed, clear the flag
        localStorage.removeItem('nightclub_new_account');
        alert('Error: ' + (err.message || err));
        btn.disabled = false;
        btn.textContent = '🎉 Create Account & Play';
    }
};

// Gate Google login
window.gateGoogleLogin = async function() {
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '<img src="https://www.google.com/favicon.ico" alt="G"> Signing in...';
    
    const result = await authSystem.loginWithGoogle();
    
    if (result.success) {
        startGameAfterLogin();
    } else {
        btn.disabled = false;
        btn.innerHTML = '<img src="https://www.google.com/favicon.ico" alt="G"> Sign in with Google';
    }
};

// Gate forgot password
window.gateForgotPassword = async function() {
    const email = document.getElementById('gate-login-email').value;
    if (!email) {
        alert('Please enter your email first');
        return;
    }
    await authSystem.resetPassword(email);
};

// Start game after successful login
async function startGameAfterLogin(isNewUser = false) {
    if (gameStarted) return;
    gameStarted = true;
    
    // Explicitly close login modal
    const loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.classList.add('hidden');
        loginModal.style.display = 'none';
    }
    if (typeof game !== 'undefined' && game.closeModals) {
        game.closeModals();
    }
    
    // Initialize game if not done yet
    if (!gameInitialized) {
        await initializeGame();
    }
    
    // Hide login gate with animation
    const loginGate = document.getElementById('login-gate');
    if (loginGate) {
        loginGate.style.transition = 'opacity 0.5s ease';
        loginGate.style.opacity = '0';
        
        setTimeout(async () => {
            loginGate.classList.add('hidden');
            loginGate.style.display = 'none';
            
            // Load cloud save if exists (only for returning users)
            if (!isNewUser) {
                await loadCloudSaveOnStart();
            }
            
            // Update UI with club name
            updateClubDisplay();
            
            // Start tutorial for new users
            if (isNewUser && window.tutorialSystem) {
                setTimeout(() => {
                    console.log('Starting tutorial for new user');
                    window.tutorialSystem.start(() => {
                        console.log('Tutorial finished');
                        // Maybe give a starter bonus?
                    });
                }, 1000);
            }
        }, 500);
    }
}

// Update club name display
function updateClubDisplay() {
    const clubNameEl = document.getElementById('club-name-display');
    if (clubNameEl) {
        clubNameEl.textContent = game.clubName || 'My Club';
    }
    
    const clubTierEl = document.getElementById('club-tier-display');
    if (clubTierEl && game.getClubTierInfo) {
        const tierInfo = game.getClubTierInfo();
        clubTierEl.textContent = tierInfo?.name || 'Tiny Bar';
    }
}
window.updateClubDisplay = updateClubDisplay;

// Load cloud save on start
async function loadCloudSaveOnStart() {
    try {
        const cloudData = await cloudSave.loadGame();
        if (cloudData && cloudData.level) {
            game.loadFromData(cloudData);
            updateAccountUI();
        }
    } catch (err) {
        console.warn('Could not load cloud save:', err);
    }
}

// ========== PROFILE FUNCTIONS ==========

// Update profile modal
window.updateProfileModal = function() {
    // Owner info
    const ownerName = document.getElementById('profile-owner-name');
    const profileEmail = document.getElementById('profile-email');
    const ownerDisplay = document.getElementById('owner-name-display');
    
    if (ownerName) ownerName.textContent = game.ownerName || 'Player';
    if (ownerDisplay) ownerDisplay.textContent = game.ownerName || 'Player';
    if (profileEmail && authSystem.user) {
        profileEmail.textContent = authSystem.user.email || '';
    }
    
    // VIP status
    const vipStatus = document.getElementById('profile-vip-status');
    if (vipStatus) {
        vipStatus.textContent = premiumSystem?.isVIP ? '👑 VIP Member' : '';
    }
    
    // Club info
    const clubName = document.getElementById('profile-club-name');
    const clubTier = document.getElementById('profile-club-tier');
    const profileLevel = document.getElementById('profile-level');
    
    if (clubName) clubName.textContent = game.clubName || 'My Club';
    if (clubTier && game.getClubTierInfo) {
        const tierInfo = game.getClubTierInfo();
        clubTier.textContent = tierInfo?.name || 'Tiny Bar';
    }
    if (profileLevel) profileLevel.textContent = game.level;
    
    // Stats
    const totalEarnings = document.getElementById('profile-total-earnings');
    const totalVisitors = document.getElementById('profile-total-visitors');
    const drinksServed = document.getElementById('profile-drinks-served');
    const eventsHosted = document.getElementById('profile-events-hosted');
    
    if (totalEarnings) totalEarnings.textContent = '$' + (game.totalEarnings || 0).toLocaleString();
    if (totalVisitors) totalVisitors.textContent = (game.totalVisitors || 0).toLocaleString();
    if (drinksServed) drinksServed.textContent = (game.totalDrinksServed || 0).toLocaleString();
    if (eventsHosted) eventsHosted.textContent = (game.eventsHosted || 0).toLocaleString();
    
    // Update HUD displays
    updateClubDisplay();
};

// Open club upgrade modal
window.openClubUpgrade = function() {
    game.closeModals();
    
    const currentTier = game.getClubTierInfo();
    const nextTier = game.getNextClubTier();
    
    // Update current tier display
    document.getElementById('upgrade-current-tier').textContent = currentTier?.name || 'Tiny Bar';
    document.getElementById('upgrade-current-capacity').textContent = currentTier?.maxVisitors || 8;
    
    const nextSection = document.getElementById('next-tier-section');
    const maxMessage = document.getElementById('max-tier-message');
    const upgradeBtn = document.getElementById('do-upgrade-btn');
    
    if (nextTier) {
        nextSection.style.display = 'block';
        maxMessage.style.display = 'none';
        
        document.getElementById('upgrade-next-tier').textContent = nextTier.name;
        document.getElementById('upgrade-next-capacity').textContent = nextTier.maxVisitors;
        document.getElementById('upgrade-required-level').textContent = nextTier.unlockLevel;
        document.getElementById('upgrade-cost').textContent = nextTier.cost.toLocaleString();
        
        // Check if can upgrade
        const canUpgrade = game.level >= nextTier.unlockLevel && game.cash >= nextTier.cost;
        upgradeBtn.disabled = !canUpgrade;
        upgradeBtn.style.display = 'block';
        
        if (game.level < nextTier.unlockLevel) {
            upgradeBtn.textContent = `🔒 Reach Level ${nextTier.unlockLevel}`;
        } else if (game.cash < nextTier.cost) {
            upgradeBtn.textContent = `💰 Need $${nextTier.cost.toLocaleString()}`;
        } else {
            upgradeBtn.textContent = '🏗️ Upgrade Now';
        }
    } else {
        nextSection.style.display = 'none';
        maxMessage.style.display = 'block';
        upgradeBtn.style.display = 'none';
    }
    
    document.getElementById('club-upgrade-modal').classList.add('active');
};

// Do club upgrade
window.doClubUpgrade = function() {
    if (game.upgradeClub()) {
        game.closeModals();
        updateProfileModal();
        updateClubDisplay();
        // Save to cloud after upgrade
        cloudSave.saveNow();
    }
};

// Open rename club dialog
window.openRenameClub = function() {
    const currentName = game.clubName || 'My Club';
    const newName = prompt('Enter new club name:', currentName);
    
    if (newName && newName !== currentName) {
        if (game.renameClub(newName)) {
            // Save to cloud after rename
            cloudSave.saveNow();
        }
    }
};

// Extend updateAccountUI to include profile
const originalUpdateAccountUI = window.updateAccountUI;
window.updateAccountUI = function() {
    if (originalUpdateAccountUI) originalUpdateAccountUI();
    updateProfileModal();
    updateClubDisplay();
};

// ========== DJ SYSTEM ==========

// Initialize DJ modal
function initDJModal() {
    // Populate genre grid
    const genreGrid = document.getElementById('genre-grid');
    if (genreGrid) {
        genreGrid.innerHTML = Object.entries(MUSIC_GENRES).map(([key, genre]) => `
            <button class="genre-btn" style="color: ${genre.color}" onclick="playGenre('${key}')">
                <span class="genre-icon">${genre.icon}</span>
                <span class="genre-label">${genre.name}</span>
            </button>
        `).join('');
    }
    
    // Populate library tabs
    const libraryTabs = document.getElementById('library-tabs');
    if (libraryTabs) {
        libraryTabs.innerHTML = Object.entries(MUSIC_GENRES).map(([key, genre], index) => `
            <button class="library-tab ${index === 0 ? 'active' : ''}" 
                    onclick="showLibraryGenre('${key}')" 
                    data-genre="${key}">
                ${genre.icon} ${genre.name}
            </button>
        `).join('');
    }
    
    // Show first genre's tracks
    showLibraryGenre('edm');
    
    // Initialize DJ system
    djSystem.init();
}

// Play a genre immediately
window.playGenre = function(genre) {
    djSystem.playGenre(genre);
};

// Show tracks from a genre
window.showLibraryGenre = function(genre) {
    // Update active tab
    document.querySelectorAll('.library-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.genre === genre);
    });
    
    const trackList = document.getElementById('track-library');
    if (!trackList) return;
    
    const genreInfo = MUSIC_GENRES[genre];
    const tracks = [
        { name: 'Neon Surge', duration: 180, popularity: 90 },
        { name: 'Bass Drop Galaxy', duration: 210, popularity: 95 },
        { name: 'Electric Dreams', duration: 195, popularity: 85 },
        { name: 'Cyber Pulse', duration: 200, popularity: 88 }
    ];
    
    // Different tracks per genre for variety
    const genreTracks = {
        edm: [{ name: 'Neon Surge', duration: 180, popularity: 90 }, { name: 'Bass Drop Galaxy', duration: 210, popularity: 95 }, { name: 'Electric Dreams', duration: 195, popularity: 85 }],
        hiphop: [{ name: 'City Lights Flow', duration: 200, popularity: 88 }, { name: 'Crown & Glory', duration: 185, popularity: 92 }, { name: 'Midnight Hustle', duration: 210, popularity: 85 }],
        house: [{ name: 'Deep in the Night', duration: 240, popularity: 87 }, { name: 'Sunset Groove', duration: 220, popularity: 90 }, { name: 'Disco Revival', duration: 200, popularity: 85 }],
        techno: [{ name: 'Underground Protocol', duration: 250, popularity: 82 }, { name: 'Dark Matter', duration: 230, popularity: 85 }, { name: 'Binary Code', duration: 240, popularity: 80 }],
        pop: [{ name: 'Dance All Night', duration: 195, popularity: 95 }, { name: 'Summer Vibes', duration: 180, popularity: 92 }, { name: 'Heart on Fire', duration: 200, popularity: 90 }],
        latin: [{ name: 'Fuego Latino', duration: 210, popularity: 90 }, { name: 'Ritmo Caliente', duration: 195, popularity: 88 }, { name: 'Baila Conmigo', duration: 200, popularity: 92 }],
        chill: [{ name: 'Moonlight Lounge', duration: 240, popularity: 75 }, { name: 'Ocean Breeze', duration: 220, popularity: 70 }, { name: 'Starlit Cafe', duration: 230, popularity: 72 }],
        throwback: [{ name: '80s Rewind', duration: 200, popularity: 88 }, { name: 'Disco Fever', duration: 210, popularity: 85 }, { name: 'Retro Wave', duration: 195, popularity: 82 }]
    };
    
    const displayTracks = genreTracks[genre] || tracks;
    
    trackList.innerHTML = displayTracks.map((track, index) => `
        <div class="track-item">
            <div class="track-item-info">
                <span style="color: ${genreInfo.color}">${genreInfo.icon}</span>
                <div>
                    <div class="track-item-name">${track.name}</div>
                    <div class="track-item-duration">${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="track-popularity">⭐ ${track.popularity}%</div>
                <button class="add-track-btn" onclick="addTrackToPlaylist('${genre}', ${index})">+ Add</button>
            </div>
        </div>
    `).join('');
};

// Add track to playlist
window.addTrackToPlaylist = function(genre, trackIndex) {
    djSystem.addToPlaylist(genre, trackIndex);
    updatePlaylistCount();
};

// Update playlist count
function updatePlaylistCount() {
    const countEl = document.getElementById('playlist-count');
    if (countEl) {
        countEl.textContent = djSystem.playlist.length;
    }
}

// Open DJ modal from DJ booth
window.openDJBooth = function() {
    game.openModal('dj');
    djSystem.updateNowPlayingUI();
    djSystem.updatePlaylistUI();
    updatePlaylistCount();
};

// Call initDJModal after game starts
setTimeout(() => {
    initDJModal();
}, 2000);

// ==========================================
// BADGE SHOP SYSTEM
// ==========================================

const BADGE_SHOP = [
    { id: 'default', name: 'Classic', price: 0, style: 'badge-default', desc: 'The original look' },
    { id: 'neon-pink', name: 'Neon Pink', price: 50, style: 'badge-neon-pink', desc: 'Glowing pink with neon flicker' },
    { id: 'ice-crystal', name: 'Ice Crystal', price: 60, style: 'badge-ice-crystal', desc: 'Cool ice blue glow' },
    { id: 'toxic', name: 'Toxic Slime', price: 70, style: 'badge-toxic', desc: 'Dripping green goo effect' },
    { id: 'cyber-blue', name: 'Cyber Blue', price: 75, style: 'badge-cyber-blue', desc: 'Scan lines and glitch effect' },
    { id: 'fire', name: 'Fire', price: 80, style: 'badge-fire', desc: 'Flame glow animation' },
    { id: 'retro', name: 'Retro Arcade', price: 85, style: 'badge-retro-arcade', desc: 'Pixel font & CRT scanlines' },
    { id: 'matrix', name: 'Matrix', price: 90, style: 'badge-matrix', desc: 'Digital rain effect' },
    { id: 'circuit', name: 'Circuit Board', price: 95, style: 'badge-circuit', desc: 'High-tech circuitry' },
    { id: 'gold-vip', name: 'Gold VIP', price: 100, style: 'badge-gold-vip', desc: 'Gold shimmer with crown icon' },
    { id: 'metal', name: 'Heavy Metal', price: 100, style: 'badge-metal', desc: 'Spikes & metallic texture' },
    { id: 'vaporwave', name: 'Vaporwave', price: 110, style: 'badge-vaporwave', desc: 'Retro 80s aesthetic' },
    { id: 'galaxy', name: 'Galaxy', price: 120, style: 'badge-galaxy', desc: 'Deep space with twinkling stars' },
    { id: 'cosmic', name: 'Cosmic Horror', price: 130, style: 'badge-cosmic', desc: 'Void with watching eyes' },
    { id: 'glitch', name: 'Glitch Art', price: 140, style: 'badge-glitch-art', desc: 'Chaotic RGB glitch artifacts' },
    { id: 'rainbow', name: 'Rainbow', price: 150, style: 'badge-rainbow', desc: 'Animated rainbow border' },
    { id: 'holo', name: 'Holographic', price: 160, style: 'badge-holo', desc: 'Iridescent shifting foil' },
    { id: 'liquid-gold', name: 'Liquid Gold', price: 180, style: 'badge-liquid-gold', desc: 'Flowing molten gold' },
    { id: 'diamond', name: 'Diamond', price: 200, style: 'badge-diamond', desc: 'Premium diamond shine' },
    { id: 'kawaii', name: 'Kawaii Cloud', price: 65, style: 'badge-kawaii', desc: 'Cute pastel clouds' }
];

// Initialize owned badges (default is owned)
let ownedBadges = JSON.parse(localStorage.getItem('ownedBadges')) || ['default'];
let activeBadge = localStorage.getItem('activeBadge') || 'default';

window.initBadgeShop = function() {
    const list = document.getElementById('badge-list');
    if (!list) return;
    
    list.innerHTML = BADGE_SHOP.map(badge => {
        const isOwned = ownedBadges.includes(badge.id);
        const isActive = activeBadge === badge.id;
        
        return `
            <div class="badge-item p-4 bg-white/5 rounded-xl border border-white/10 ${isActive ? 'active' : ''} ${isOwned ? 'owned' : ''}" onclick="previewBadge('${badge.id}')">
                <div class="flex justify-center mb-3">
                    <div class="club-badge ${badge.style} px-4 py-2 rounded-xl text-center w-full pointer-events-none">
                        <div class="text-[8px] font-bold text-white/70">HYPECLUB</div>
                        <div class="text-sm font-bold text-white truncate">Club</div>
                    </div>
                </div>
                <div class="text-center">
                    <div class="font-bold text-white text-sm">${badge.name}</div>
                    <div class="text-[10px] text-gray-400 mb-2">${badge.desc}</div>
                    ${isActive ? 
                        `<button class="w-full py-1.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-lg border border-green-500/50 cursor-default">EQUIPPED</button>` :
                        (isOwned ? 
                            `<button class="w-full py-1.5 bg-white/10 text-white text-xs font-bold rounded-lg hover:bg-white/20" onclick="equipBadge('${badge.id}')">EQUIP</button>` :
                            `<button class="w-full py-1.5 bg-purple-500 text-white text-xs font-bold rounded-lg hover:bg-purple-600 flex items-center justify-center gap-1" onclick="buyBadge('${badge.id}', ${badge.price})">
                                <i class="ph-fill ph-diamond"></i> ${badge.price}
                             </button>`
                        )
                    }
                </div>
            </div>
        `;
    }).join('');
};

window.buyBadge = function(id, price) {
    event.stopPropagation();
    if (game.diamonds >= price) {
        game.diamonds -= price;
        ownedBadges.push(id);
        localStorage.setItem('ownedBadges', JSON.stringify(ownedBadges));
        
        // Equip automatically
        equipBadge(id);
        
        // Update UI
        if (game.updateUI) game.updateUI();
        if (typeof ui !== 'undefined' && ui.notify) {
            ui.notify(`Bought ${BADGE_SHOP.find(b => b.id === id).name} Badge!`, 'success');
        } else {
            alert(`Bought ${BADGE_SHOP.find(b => b.id === id).name} Badge!`);
        }
        initBadgeShop();
    } else {
        if (typeof ui !== 'undefined' && ui.notify) {
            ui.notify("Not enough diamonds!", "error");
        } else {
            alert("Not enough diamonds!");
        }
    }
};

window.equipBadge = function(id) {
    if (event) event.stopPropagation();
    if (!ownedBadges.includes(id)) return;
    
    activeBadge = id;
    localStorage.setItem('activeBadge', activeBadge);
    
    // Update Main UI Badge
    updateClubBadgeDisplay();
    
    if (typeof ui !== 'undefined' && ui.notify) {
        ui.notify("Badge Equipped!", "success");
    }
    initBadgeShop();
};

window.previewBadge = function(id) {
    // Optional: Preview logic if needed
};

window.updateClubBadgeDisplay = function() {
    const badgeEl = document.getElementById('club-badge');
    if (!badgeEl) return;
    
    // Remove all badge classes
    BADGE_SHOP.forEach(b => badgeEl.classList.remove(b.style));
    
    // Add active badge class
    const badge = BADGE_SHOP.find(b => b.id === activeBadge) || BADGE_SHOP[0];
    badgeEl.classList.add(badge.style);
};

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for game to be ready
    setTimeout(() => {
        updateClubBadgeDisplay();
        
        // Hook into openModal to refresh shop if game exists
        if (window.game && game.openModal) {
            const originalOpenModal = game.openModal;
            game.openModal = function(type) {
                originalOpenModal.call(game, type);
                if (type === 'badge-shop') {
                    initBadgeShop();
                }
            };
        }
    }, 1000);
});
