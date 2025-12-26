// DJ Playlist System - YouTube Music Integration
import { ui } from './ui.js';
import { audioManager } from './audio.js';

// Default background music tracks (play when no YouTube is active)
const BACKGROUND_TRACKS = [
    'assets/music1.mp3',
    'assets/music2.mp3',
    'assets/music3.mp3',
    'assets/music4.mp3'
];

// Default YouTube track - using a popular embeddable track
const DEFAULT_TRACK = {
    videoId: 'dQw4w9WgXcQ',
    title: 'Club Vibes',
    duration: 0,
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
};

// Queue limits
const QUEUE_LIMITS = {
    FREE: 2,
    VIP: 13
};

// Music genres and their effects
export const MUSIC_GENRES = {
    edm: {
        name: 'EDM',
        icon: '⚡',
        color: '#00ffff',
        hypeBoost: 3,
        energyLevel: 90,
        crowdReaction: 'wild',
        bpm: 128,
        description: 'High energy electronic beats'
    },
    hiphop: {
        name: 'Hip Hop',
        icon: '🎤',
        color: '#ff6b6b',
        hypeBoost: 2,
        energyLevel: 75,
        crowdReaction: 'groovy',
        bpm: 95,
        description: 'Urban beats and flow'
    },
    house: {
        name: 'House',
        icon: '🏠',
        color: '#a78bfa',
        hypeBoost: 2.5,
        energyLevel: 80,
        crowdReaction: 'dancing',
        bpm: 120,
        description: 'Classic club vibes'
    },
    techno: {
        name: 'Techno',
        icon: '🤖',
        color: '#22d3ee',
        hypeBoost: 2.8,
        energyLevel: 85,
        crowdReaction: 'intense',
        bpm: 135,
        description: 'Dark underground beats'
    },
    pop: {
        name: 'Pop Hits',
        icon: '⭐',
        color: '#f472b6',
        hypeBoost: 2,
        energyLevel: 70,
        crowdReaction: 'singing',
        bpm: 110,
        description: 'Everyone knows these!'
    },
    latin: {
        name: 'Latin',
        icon: '💃',
        color: '#fbbf24',
        hypeBoost: 2.5,
        energyLevel: 85,
        crowdReaction: 'salsa',
        bpm: 100,
        description: 'Hot rhythms from the south'
    },
    chill: {
        name: 'Chill',
        icon: '🌙',
        color: '#34d399',
        hypeBoost: 1,
        energyLevel: 40,
        crowdReaction: 'relaxed',
        bpm: 85,
        description: 'Smooth vibes for winding down'
    },
    throwback: {
        name: 'Throwbacks',
        icon: '📼',
        color: '#f97316',
        hypeBoost: 2.2,
        energyLevel: 75,
        crowdReaction: 'nostalgic',
        bpm: 105,
        description: 'Classic hits from the past'
    }
};

// Track library
const TRACKS = {
    edm: [
        { name: 'Neon Surge', duration: 180, popularity: 90 },
        { name: 'Bass Drop Galaxy', duration: 210, popularity: 95 },
        { name: 'Electric Dreams', duration: 195, popularity: 85 },
        { name: 'Cyber Pulse', duration: 200, popularity: 88 }
    ],
    hiphop: [
        { name: 'City Lights Flow', duration: 200, popularity: 88 },
        { name: 'Crown & Glory', duration: 185, popularity: 92 },
        { name: 'Midnight Hustle', duration: 210, popularity: 85 },
        { name: 'Street Dreams', duration: 195, popularity: 80 }
    ],
    house: [
        { name: 'Deep in the Night', duration: 240, popularity: 87 },
        { name: 'Sunset Groove', duration: 220, popularity: 90 },
        { name: 'Disco Revival', duration: 200, popularity: 85 },
        { name: 'Feel the Beat', duration: 215, popularity: 88 }
    ],
    techno: [
        { name: 'Underground Protocol', duration: 250, popularity: 82 },
        { name: 'Dark Matter', duration: 230, popularity: 85 },
        { name: 'Binary Code', duration: 240, popularity: 80 },
        { name: 'Machine Soul', duration: 220, popularity: 83 }
    ],
    pop: [
        { name: 'Dance All Night', duration: 195, popularity: 95 },
        { name: 'Summer Vibes', duration: 180, popularity: 92 },
        { name: 'Heart on Fire', duration: 200, popularity: 90 },
        { name: 'Party Anthem', duration: 185, popularity: 93 }
    ],
    latin: [
        { name: 'Fuego Latino', duration: 210, popularity: 90 },
        { name: 'Ritmo Caliente', duration: 195, popularity: 88 },
        { name: 'Baila Conmigo', duration: 200, popularity: 92 },
        { name: 'Tropical Heat', duration: 205, popularity: 85 }
    ],
    chill: [
        { name: 'Moonlight Lounge', duration: 240, popularity: 75 },
        { name: 'Ocean Breeze', duration: 220, popularity: 70 },
        { name: 'Starlit Cafe', duration: 230, popularity: 72 },
        { name: 'Velvet Dreams', duration: 250, popularity: 68 }
    ],
    throwback: [
        { name: '80s Rewind', duration: 200, popularity: 88 },
        { name: 'Disco Fever', duration: 210, popularity: 85 },
        { name: 'Retro Wave', duration: 195, popularity: 82 },
        { name: 'Golden Era', duration: 205, popularity: 86 }
    ]
};

class DJSystem {
    constructor() {
        this.currentTrack = null;
        this.currentGenre = null;
        this.playlist = [];
        this.youtubeQueue = []; // YouTube video queue
        this.maxPlaylistSize = 10;
        this.trackProgress = 0;
        this.isPlaying = false;
        this.crowdMood = 50; // 0-100
        this.djSkillBonus = 1.0;
        this.lastBeat = 0;
        this.beatCallback = null;
        this.visualizerData = [];

        // YouTube player
        this.ytPlayer = null;
        this.ytReady = false;
        this.currentYTVideo = null;
        this.ytVolume = 50;

        // Background music player (default club music)
        this.bgMusic = null;
        this.bgMusicVolume = 0.5;
        this.bgMusicPlaying = false;
        this.currentBgTrackIndex = -1;
    }

    // Get queue limit based on VIP status
    getQueueLimit() {
        // isVIP is a property, not a function
        const isVIP = window.premiumSystem?.isVIP || false;
        return isVIP ? QUEUE_LIMITS.VIP : QUEUE_LIMITS.FREE;
    }

    // Initialize background music (default club music)
    initBackgroundMusic() {
        if (!this.bgMusic) {
            this.bgMusic = new Audio();
            this.bgMusic.volume = this.bgMusicVolume;
            this.bgMusic.loop = false; // We'll handle looping manually

            // When track ends, play next random track
            this.bgMusic.addEventListener('ended', () => {
                this.playRandomBgTrack();
            });

            // Error handling
            this.bgMusic.addEventListener('error', (e) => {
                console.warn('Background music error:', e);
                // Try next track
                setTimeout(() => this.playRandomBgTrack(), 1000);
            });
        }

        // Auto-start music immediately (with fallback)
        console.log('🎵 Starting club music...');
        this.autoStartMusic();
    }

    // Auto-start music with browser compatibility
    autoStartMusic() {
        // Try to start music immediately
        this.playRandomBgTrack();

        // If autoplay fails, setup retry on any user interaction
        if (!this.bgMusicPlaying) {
            this.setupAutoPlayOnInteraction();
        }
    }

    // Play random background track
    playRandomBgTrack() {
        // Don't play if YouTube is active
        if (this.isPlaying && this.currentYTVideo) {
            return;
        }

        // Pick random track (different from current)
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * BACKGROUND_TRACKS.length);
        } while (newIndex === this.currentBgTrackIndex && BACKGROUND_TRACKS.length > 1);

        this.currentBgTrackIndex = newIndex;
        const track = BACKGROUND_TRACKS[newIndex];
        const trackName = `Club Mix ${newIndex + 1}`;

        this.bgMusic.src = track;

        // Try to play with promise handling for all browsers
        const playPromise = this.bgMusic.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.bgMusicPlaying = true;
                console.log('🎵 Auto-playing:', trackName);
                this.updateTrackDisplay(`🎶 ${trackName}`);
                this.updateBgMusicUI(trackName);
            }).catch(err => {
                // Autoplay blocked - wait for user interaction
                console.log('🔇 Autoplay blocked, waiting for interaction...');
                this.updateTrackDisplay('🎵 Click anywhere to start music');
                this.setupAutoPlayOnInteraction();
            });
        }
    }

    // Update UI to show background music is playing
    updateBgMusicUI(trackName) {
        const nowPlaying = document.getElementById('youtube-now-playing');
        if (nowPlaying) {
            nowPlaying.innerHTML = `
                <div class="now-playing-text">🎵 NOW PLAYING</div>
                <div class="track-title" id="current-track-title">🎶 ${trackName}</div>
                <div style="color: #00ff88; font-size: 12px; margin-top: 5px;">Default Club Music</div>
            `;
        }
    }

    // Setup auto-play after user interacts with page
    setupAutoPlayOnInteraction() {
        const startMusic = () => {
            if (!this.bgMusicPlaying && this.bgMusic && this.bgMusic.src) {
                const playPromise = this.bgMusic.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        this.bgMusicPlaying = true;
                        const trackName = `Club Mix ${this.currentBgTrackIndex + 1}`;
                        console.log('🎵 Music started after user interaction');
                        this.updateTrackDisplay(`🎶 ${trackName}`);
                        this.updateBgMusicUI(trackName);
                    }).catch(() => {
                        console.log('🔇 Still blocked, will retry');
                    });
                }
            }
            // Remove listeners after first successful play
            if (this.bgMusicPlaying) {
                document.removeEventListener('click', startMusic);
                document.removeEventListener('keydown', startMusic);
                document.removeEventListener('touchstart', startMusic);
                document.removeEventListener('scroll', startMusic);
            }
        };

        // Listen for any user interaction
        document.addEventListener('click', startMusic, { once: false });
        document.addEventListener('keydown', startMusic, { once: false });
        document.addEventListener('touchstart', startMusic, { once: false });
        document.addEventListener('scroll', startMusic, { once: false });
    }

    // Play specific background track by index
    playBgTrack(index) {
        console.log('🎵 playBgTrack called with index:', index);

        if (index < 0 || index >= BACKGROUND_TRACKS.length) {
            console.error('Invalid track index:', index);
            return;
        }

        // Stop YouTube if playing
        if (this.ytPlayer && this.isPlaying) {
            this.ytPlayer.pauseVideo();
            this.isPlaying = false;
            this.currentYTVideo = null;
        }

        this.currentBgTrackIndex = index;
        const track = BACKGROUND_TRACKS[index];
        const trackName = `Club Mix ${index + 1}`;

        console.log('🎵 Loading track:', track);

        if (!this.bgMusic) {
            this.bgMusic = new Audio();
            this.bgMusic.volume = this.bgMusicVolume;
            this.bgMusic.addEventListener('ended', () => this.playRandomBgTrack());
            this.bgMusic.addEventListener('canplaythrough', () => {
                console.log('🎵 Track ready to play');
            });
            this.bgMusic.addEventListener('error', (e) => {
                console.error('🔇 Audio error:', e.target.error);
            });
        }

        this.bgMusic.src = track;
        this.bgMusic.load();

        const playPromise = this.bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.bgMusicPlaying = true;
                console.log('🎵 Now playing:', trackName);
                this.updateTrackDisplay(`🎶 ${trackName}`);
                this.updateBgMusicUI(trackName);
                ui.notify(`🎵 Playing ${trackName}`, 'success');
            }).catch(err => {
                console.error('🔇 Failed to play:', err.message);
                this.updateTrackDisplay('❌ Click to retry');
                ui.notify('Click a Mix button to play music', 'info');
            });
        }
    }

    // Stop background music
    stopBackgroundMusic() {
        if (this.bgMusic) {
            this.bgMusic.pause();
            this.bgMusicPlaying = false;
            this.updateTrackDisplay('Music stopped');
            console.log('🔇 Background music stopped');
        }
    }

    // Resume background music (if no YouTube playing)
    resumeBackgroundMusic() {
        if (this.bgMusic && !this.bgMusicPlaying && !this.isPlaying) {
            this.bgMusic.play().then(() => {
                this.bgMusicPlaying = true;
                console.log('🎵 Background music resumed');
            }).catch(() => { });
        }
    }

    // Set background music volume
    setBgMusicVolume(volume) {
        this.bgMusicVolume = volume;
        if (this.bgMusic) {
            this.bgMusic.volume = volume;
        }
    }

    // Initialize YouTube player
    initYouTube() {
        // Load YouTube IFrame API
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode.insertBefore(tag, firstScript);

            window.onYouTubeIframeAPIReady = () => {
                this.createYTPlayer();
            };
        } else {
            this.createYTPlayer();
        }
    }

    // Create YouTube player
    createYTPlayer() {
        // Create hidden container for YouTube player
        let container = document.getElementById('yt-player-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'yt-player-container';
            container.style.cssText = 'position:fixed;bottom:10px;right:10px;width:320px;height:180px;z-index:1000;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.5);display:none;';
            document.body.appendChild(container);

            const playerDiv = document.createElement('div');
            playerDiv.id = 'yt-player';
            container.appendChild(playerDiv);
        }

        // Create player without auto-playing (user adds their own tracks)
        this.ytPlayer = new YT.Player('yt-player', {
            height: '180',
            width: '320',
            playerVars: {
                autoplay: 0,
                controls: 1,
                modestbranding: 1,
                rel: 0
            },
            events: {
                onReady: (e) => this.onYTReady(e),
                onStateChange: (e) => this.onYTStateChange(e),
                onError: (e) => this.onYTError(e)
            }
        });
    }

    // YouTube player ready
    onYTReady(event) {
        this.ytReady = true;
        this.ytPlayer.setVolume(this.ytVolume);

        // Try to restore previous music state
        const savedState = this.loadMusicState();
        if (savedState && savedState.currentVideo) {
            // Stop background music if restoring YouTube
            this.stopBackgroundMusic();
            this.restoreMusicState();
            ui.notify('🎧 Music restored!', 'success');
        } else {
            this.currentYTVideo = null;
            this.isPlaying = false;
            ui.notify('🎵 Club music playing!', 'success');
            this.updateTrackDisplay('Playing club music...');
        }
        this.updateYouTubeUI();
    }

    // YouTube state changed
    onYTStateChange(event) {
        if (event.data === YT.PlayerState.ENDED) {
            this.playNextYouTube();
        }
        if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            // Stop background music when YouTube plays
            this.stopBackgroundMusic();
            // Show player when playing
            const container = document.getElementById('yt-player-container');
            if (container) container.style.display = 'block';
            // Save state when playing starts
            this.saveMusicState();
        }
        if (event.data === YT.PlayerState.PAUSED) {
            this.isPlaying = false;
            // Save state when paused (preserves position)
            this.saveMusicState();
        }
    }

    // YouTube error - don't spam, just skip quietly
    onYTError(event) {
        console.warn('YouTube Error:', event.data);
        // Error 150 = embedding disabled, try next track
        if (this.youtubeQueue.length > 0) {
            this.playNextYouTube();
        } else {
            this.isPlaying = false;
            this.updateTrackDisplay('Add a track to play');
        }
    }

    // Update track display
    updateTrackDisplay(text) {
        const titleEl = document.getElementById('current-track-title');
        if (titleEl) titleEl.textContent = text;

        // Update Top Right UI Widget
        const uiTrackEl = document.getElementById('ui-track-name');
        if (uiTrackEl) {
            // Remove icons if present in text for cleaner UI
            const cleanText = text.replace(/^[🎵🎶]\s*/, '');
            uiTrackEl.textContent = cleanText;
        }

        // Show/Hide Widget
        const widget = document.getElementById('now-playing-widget');
        if (widget) {
            if (text && text !== 'None' && text !== 'Music stopped') {
                widget.classList.remove('hidden');
            } else {
                widget.classList.add('hidden');
            }
        }
    }

    // Add YouTube video to queue
    addYouTubeToQueue(url) {
        const videoId = this.extractYouTubeId(url);
        if (!videoId) {
            ui.notify('❌ Invalid YouTube URL', 'error');
            return false;
        }

        const limit = this.getQueueLimit();
        if (this.youtubeQueue.length >= limit) {
            const isVIP = window.premiumSystem?.isVIP || false;
            if (!isVIP) {
                ui.notify(`⭐ Queue full! Upgrade to VIP for ${QUEUE_LIMITS.VIP} slots`, 'warning');
            } else {
                ui.notify(`Queue full! (Max ${limit} tracks)`, 'error');
            }
            return false;
        }

        // Add to queue
        const track = {
            videoId: videoId,
            title: 'Loading...',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            addedBy: 'Player'
        };

        // If nothing is playing, play immediately
        if (!this.isPlaying) {
            this.playYouTube(track.videoId);
            this.currentYTVideo = track;
            this.updateTrackDisplay('Now Playing');
            ui.notify('🎵 Now playing!', 'success');
        } else {
            // Add to queue
            this.youtubeQueue.push(track);
            ui.notify(`🎵 Added to queue (${this.youtubeQueue.length}/${limit})`, 'success');
        }

        this.updateYouTubeUI();
        this.saveMusicState(); // Save queue state
        return true;
    }

    // Extract video ID from YouTube URL
    extractYouTubeId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    // Play specific YouTube video
    playYouTube(videoId) {
        if (!this.ytReady || !this.ytPlayer) {
            ui.notify('YouTube player not ready', 'error');
            return;
        }

        // Stop background music when YouTube plays
        this.stopBackgroundMusic();

        this.ytPlayer.loadVideoById(videoId);
        this.currentYTVideo = { videoId };
        this.isPlaying = true;
        this.updateTrackDisplay('Loading...');
        this.updateYouTubeUI();

        // Show player
        const container = document.getElementById('yt-player-container');
        if (container) container.style.display = 'block';
    }

    // Play next in YouTube queue
    playNextYouTube() {
        if (this.youtubeQueue.length > 0) {
            const next = this.youtubeQueue.shift();
            this.playYouTube(next.videoId);
            this.currentYTVideo = next;
            this.updateTrackDisplay(next.title || 'Now Playing');
            ui.notify('🎵 Playing next track', 'info');
        } else {
            // No more tracks - resume background music
            this.isPlaying = false;
            this.currentYTVideo = null;
            this.updateTrackDisplay('Playing club music...');

            // Resume background music
            this.playRandomBgTrack();
        }
        this.updateYouTubeUI();
        this.saveMusicState(); // Save after queue change
    }

    // Skip current YouTube track
    skipYouTube() {
        ui.notify('⏭️ Skipping...', 'info');
        this.crowdMood = Math.max(0, this.crowdMood - 5);
        this.playNextYouTube();
    }

    // Remove from YouTube queue
    removeFromYouTubeQueue(index) {
        if (index >= 0 && index < this.youtubeQueue.length) {
            this.youtubeQueue.splice(index, 1);
            ui.notify('Removed from queue', 'info');
            this.updateYouTubeUI();
            this.saveMusicState(); // Save after queue change
        }
    }

    // Set YouTube volume
    setYouTubeVolume(volume) {
        this.ytVolume = volume;
        if (this.ytPlayer && this.ytReady) {
            this.ytPlayer.setVolume(volume);
        }
        this.saveMusicState(); // Save volume preference
    }

    // Toggle YouTube player visibility
    toggleYouTubePlayer() {
        const container = document.getElementById('yt-player-container');
        if (container) {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        }
    }

    // Update YouTube queue UI
    updateYouTubeUI() {
        const queueContainer = document.getElementById('youtube-queue');
        const nowPlaying = document.getElementById('youtube-now-playing');
        const limit = this.getQueueLimit();
        const isVIP = window.premiumSystem?.isVIP || false;

        // Update now playing
        if (nowPlaying && this.currentYTVideo) {
            nowPlaying.innerHTML = `
                <div class="yt-now-playing">
                    <img src="${this.currentYTVideo.thumbnail || `https://img.youtube.com/vi/${this.currentYTVideo.videoId}/mqdefault.jpg`}" alt="thumbnail">
                    <div class="yt-track-info">
                        <div class="yt-title">${this.currentYTVideo.title || 'Now Playing'}</div>
                        <div class="yt-controls">
                            <button onclick="djSystem.skipYouTube()" class="yt-btn">⏭️ Skip</button>
                            <button onclick="djSystem.toggleYouTubePlayer()" class="yt-btn">📺 Toggle</button>
                        </div>
                    </div>
                </div>
            `;
        }

        // Update queue
        if (queueContainer) {
            const vipBadge = isVIP ? '<span class="vip-badge">⭐ VIP</span>' : '';
            queueContainer.innerHTML = `
                <div class="queue-header">
                    <span>Queue (${this.youtubeQueue.length}/${limit}) ${vipBadge}</span>
                    ${!isVIP ? '<small class="vip-hint">Upgrade to VIP for 13 slots!</small>' : ''}
                </div>
                ${this.youtubeQueue.length === 0 ?
                    '<div class="empty-queue">No tracks queued</div>' :
                    this.youtubeQueue.map((track, i) => `
                        <div class="queue-item">
                            <img src="${track.thumbnail}" alt="thumb" class="queue-thumb">
                            <span class="queue-title">${track.title}</span>
                            <button onclick="djSystem.removeFromYouTubeQueue(${i})" class="queue-remove">✕</button>
                        </div>
                    `).join('')
                }
            `;
        }
    }

    init() {
        // Stop any old audio system music
        if (window.audioManager && window.audioManager.stopMusic) {
            window.audioManager.stopMusic();
        }

        // Initialize background music player (but don't auto-play yet)
        this.initBackgroundMusic();

        // Initialize YouTube player
        this.initYouTube();

        // Also keep the genre system for mood effects
        const genres = Object.keys(MUSIC_GENRES);
        const randomGenre = genres[Math.floor(Math.random() * genres.length)];
        this.currentGenre = randomGenre;

        console.log('🎵 DJ System initialized - music ready');
    }

    // Start music (called separately after DJ system is ready)
    startBackgroundMusic() {
        if (!this.bgMusicPlaying) {
            console.log('🎵 Starting background music after login...');
            this.autoStartMusic();
        }
    }

    // Get all available tracks
    getAllTracks() {
        const allTracks = [];
        for (const [genre, tracks] of Object.entries(TRACKS)) {
            tracks.forEach(track => {
                allTracks.push({
                    ...track,
                    genre,
                    genreInfo: MUSIC_GENRES[genre]
                });
            });
        }
        return allTracks;
    }

    // Add track to playlist
    addToPlaylist(genre, trackIndex) {
        if (this.playlist.length >= this.maxPlaylistSize) {
            ui.notify('Playlist is full! (Max 10 tracks)', 'error');
            return false;
        }

        const track = TRACKS[genre]?.[trackIndex];
        if (!track) return false;

        this.playlist.push({
            ...track,
            genre,
            genreInfo: MUSIC_GENRES[genre]
        });

        ui.notify(`Added "${track.name}" to playlist`, 'success');
        this.updatePlaylistUI();
        return true;
    }

    // Remove track from playlist
    removeFromPlaylist(index) {
        if (index >= 0 && index < this.playlist.length) {
            const removed = this.playlist.splice(index, 1)[0];
            ui.notify(`Removed "${removed.name}"`, 'info');
            this.updatePlaylistUI();
        }
    }

    // Play a specific genre (random track from that genre)
    playGenre(genre) {
        const genreInfo = MUSIC_GENRES[genre];
        const tracks = TRACKS[genre];

        if (!genreInfo || !tracks) return;

        const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
        this.playTrack(randomTrack, genre, genreInfo);
    }

    // Play specific track
    playTrack(track, genre, genreInfo) {
        this.currentTrack = track;
        this.currentGenre = genre;
        this.trackProgress = 0;
        this.isPlaying = true;

        // Calculate mood boost based on track popularity and DJ skill
        const moodBoost = (track.popularity / 100) * this.djSkillBonus * 10;
        this.crowdMood = Math.min(100, this.crowdMood + moodBoost);

        // Notify
        ui.notify(`🎵 Now Playing: ${track.name} (${genreInfo.name})`, 'info');

        // Update UI
        this.updateNowPlayingUI();
        this.updateTrackDisplay(track.name);

        // Trigger visual effects
        if (window.triggerMusicChange) {
            window.triggerMusicChange(genreInfo);
        }
    }

    // Play next in playlist or random
    playNext() {
        if (this.playlist.length > 0) {
            const nextTrack = this.playlist.shift();
            this.playTrack(nextTrack, nextTrack.genre, nextTrack.genreInfo);
            this.updatePlaylistUI();
        } else {
            // Play random genre if playlist empty
            const genres = Object.keys(MUSIC_GENRES);
            const randomGenre = genres[Math.floor(Math.random() * genres.length)];
            this.playGenre(randomGenre);
        }
    }

    // Skip current track
    skip() {
        ui.notify('⏭️ Skipping track...', 'info');
        this.crowdMood = Math.max(0, this.crowdMood - 5); // Slight mood penalty
        this.playNext();
    }

    // Update method (called every frame)
    update(delta, gameState) {
        if (!this.isPlaying || !this.currentTrack) return;

        // Progress the track
        this.trackProgress += delta;

        // Beat detection (for visual effects)
        if (this.currentGenre) {
            const bpm = MUSIC_GENRES[this.currentGenre].bpm;
            const beatInterval = 60 / bpm;

            if (this.trackProgress - this.lastBeat >= beatInterval) {
                this.lastBeat = this.trackProgress;
                this.onBeat();
            }
        }

        // Check if track ended
        if (this.trackProgress >= this.currentTrack.duration) {
            this.playNext();
        }

        // Update hype based on music
        if (gameState && this.currentGenre) {
            const genreInfo = MUSIC_GENRES[this.currentGenre];
            const hypeGain = (genreInfo.hypeBoost * delta * this.djSkillBonus) * (this.crowdMood / 100);
            gameState.hype = Math.min(100, gameState.hype + hypeGain);
        }

        // Gradually normalize crowd mood
        if (this.crowdMood > 50) {
            this.crowdMood -= delta * 0.5;
        } else if (this.crowdMood < 50) {
            this.crowdMood += delta * 0.3;
        }

        // Update visualizer
        this.updateVisualizer();
    }

    // Called on each beat
    onBeat() {
        if (this.beatCallback) {
            this.beatCallback(this.currentGenre, MUSIC_GENRES[this.currentGenre]);
        }

        // Trigger dance floor pulse
        if (window.pulseDanceFloor) {
            window.pulseDanceFloor(MUSIC_GENRES[this.currentGenre]?.color || '#ffffff');
        }
    }

    // Update visualizer data
    updateVisualizer() {
        // Generate fake visualizer data
        this.visualizerData = [];
        for (let i = 0; i < 16; i++) {
            const base = Math.sin(this.trackProgress * 5 + i) * 0.3 + 0.5;
            const random = Math.random() * 0.3;
            this.visualizerData.push(Math.min(1, base + random));
        }
    }

    // Get crowd reaction text
    getCrowdReaction() {
        if (!this.currentGenre) return 'waiting';

        const genreInfo = MUSIC_GENRES[this.currentGenre];

        if (this.crowdMood >= 80) {
            return `🔥 The crowd is ${genreInfo.crowdReaction}!`;
        } else if (this.crowdMood >= 60) {
            return `😊 People are enjoying the ${genreInfo.name}`;
        } else if (this.crowdMood >= 40) {
            return `😐 Crowd seems neutral`;
        } else {
            return `😒 Try a different genre...`;
        }
    }

    // Update Now Playing UI
    updateNowPlayingUI() {
        const container = document.getElementById('dj-now-playing');
        if (!container || !this.currentTrack) return;

        const genreInfo = MUSIC_GENRES[this.currentGenre];
        const progress = (this.trackProgress / this.currentTrack.duration) * 100;

        container.innerHTML = `
            <div class="now-playing-header">
                <span class="genre-icon" style="color: ${genreInfo.color}">${genreInfo.icon}</span>
                <div class="track-info">
                    <div class="track-name">${this.currentTrack.name}</div>
                    <div class="genre-name">${genreInfo.name}</div>
                </div>
            </div>
            <div class="track-progress-bar">
                <div class="track-progress-fill" style="width: ${progress}%; background: ${genreInfo.color}"></div>
            </div>
            <div class="track-time">
                ${this.formatTime(this.trackProgress)} / ${this.formatTime(this.currentTrack.duration)}
            </div>
            <div class="crowd-reaction" style="color: ${this.crowdMood >= 60 ? '#4ade80' : '#f87171'}">
                ${this.getCrowdReaction()}
            </div>
            <div class="crowd-mood-bar">
                <div class="mood-fill" style="width: ${this.crowdMood}%"></div>
            </div>
        `;
    }

    // Update Playlist UI
    updatePlaylistUI() {
        const container = document.getElementById('dj-playlist');
        if (!container) return;

        if (this.playlist.length === 0) {
            container.innerHTML = '<div class="empty-playlist">No tracks queued. Add some music!</div>';
            return;
        }

        container.innerHTML = this.playlist.map((track, index) => `
            <div class="playlist-item">
                <span class="playlist-icon" style="color: ${track.genreInfo.color}">${track.genreInfo.icon}</span>
                <div class="playlist-track-info">
                    <div class="playlist-track-name">${track.name}</div>
                    <div class="playlist-genre">${track.genreInfo.name} • ${this.formatTime(track.duration)}</div>
                </div>
                <button class="playlist-remove" onclick="djSystem.removeFromPlaylist(${index})">✕</button>
            </div>
        `).join('');
    }

    // Format time as MM:SS
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Upgrade DJ skill
    upgradeDJSkill() {
        this.djSkillBonus += 0.1;
        ui.notify(`DJ Skill upgraded! Bonus: ${Math.round(this.djSkillBonus * 100)}%`, 'success');
    }

    // ========== PERSISTENCE ==========

    // Save music state to localStorage
    saveMusicState() {
        const state = {
            currentVideo: this.currentYTVideo,
            queue: this.youtubeQueue,
            volume: this.ytVolume,
            isPlaying: this.isPlaying,
            currentTime: this.ytPlayer?.getCurrentTime?.() || 0
        };
        localStorage.setItem('nightclub_music_state', JSON.stringify(state));
    }

    // Load music state from localStorage
    loadMusicState() {
        try {
            const saved = localStorage.getItem('nightclub_music_state');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load music state:', e);
        }
        return null;
    }

    // Restore music on page load (called when YT player is ready)
    restoreMusicState() {
        const state = this.loadMusicState();
        if (!state) return;

        // Restore queue
        if (state.queue && state.queue.length > 0) {
            this.youtubeQueue = state.queue;
        }

        // Restore volume
        if (state.volume !== undefined) {
            this.ytVolume = state.volume;
            if (this.ytPlayer) {
                this.ytPlayer.setVolume(this.ytVolume);
            }
        }

        // Restore currently playing track
        if (state.currentVideo && state.currentVideo.videoId) {
            this.currentYTVideo = state.currentVideo;

            // Resume playback
            if (this.ytPlayer && this.ytReady) {
                // Load video and seek to saved position
                this.ytPlayer.loadVideoById({
                    videoId: state.currentVideo.videoId,
                    startSeconds: state.currentTime || 0
                });
                this.isPlaying = true;
                this.updateTrackDisplay(state.currentVideo.title || 'Resuming...');

                // Show player
                const container = document.getElementById('yt-player-container');
                if (container) container.style.display = 'block';
            }
        }

        this.updateYouTubeUI();
    }
}

export const djSystem = new DJSystem();

// Expose to window for UI and other modules
window.djSystem = djSystem;
window.MUSIC_GENRES = MUSIC_GENRES;

// Explicit bindings for HTML onclick handlers
window.playBgTrack = (index) => djSystem.playBgTrack(index);
window.stopBgMusic = () => djSystem.stopBackgroundMusic();
window.setBgVolume = (vol) => djSystem.setBgMusicVolume(vol);

// Save music state before page unload
window.addEventListener('beforeunload', () => {
    if (djSystem.isPlaying || djSystem.youtubeQueue.length > 0) {
        djSystem.saveMusicState();
    }
});

// Periodic save every 10 seconds (to capture playback position)
setInterval(() => {
    if (djSystem.isPlaying && djSystem.currentYTVideo) {
        djSystem.saveMusicState();
    }
}, 10000);
