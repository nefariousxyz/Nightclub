// World Scene - Open World with WASD Controls & Physics
import * as THREE from 'three';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getDatabase, ref, onValue, set, update, onDisconnect, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyB9Bx0t7LIrhWiAGULGjhNh1BI-S6qrFC8",
    authDomain: "nightparty-city.firebaseapp.com",
    databaseURL: "https://nightparty-city-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "nightparty-city",
    storageBucket: "nightparty-city.firebasestorage.app",
    messagingSenderId: "816223229032",
    appId: "1:816223229032:web:63a3c47a2a8310109b57dd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// World constants
const WORLD_SIZE = 300;
const CITY_SIZE = 250;

class WorldScene {
    constructor(serverName = 'roleplay', targetFPS = 20) {
        this.serverName = serverName;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        // Multiplayer
        this.players = new Map();
        this.localPlayer = null;
        this.playerLimbs = {};
        this.user = null;
        this.unsubscribers = [];
        
        // Input state
        this.keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
        this.chatOpen = false;
        
        // Player physics
        this.velocity = { x: 0, y: 0, z: 0 };
        this.playerRotation = 0;
        this.isGrounded = true;
        this.walkCycle = 0;
        
        // Camera
        this.cameraAngle = 0;
        this.cameraDist = 10;
        this.cameraHeight = 6;
        
        // Stats
        this.health = 100;
        this.stamina = 100;
        this.cash = 5000;
        this.diamonds = 100;
        
        // Colliders
        this.colliders = [];
        
        // Minimap
        this.minimapCtx = null;
        
        // Frame limiting (from settings)
        this.targetFPS = targetFPS;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = 0;
        this.updateCounter = 0;
        
        // Time system (synced across players)
        this.worldTime = 12; // 0-24 hours
        this.timeSpeed = 1; // 1 = real time, 60 = 1 min = 1 hour
        this.sun = null;
        this.moon = null;
        this.sunLight = null;
        this.ambientLight = null;
        this.hemiLight = null;
    }

    async init() {
        console.log('🌍 Initializing World Scene...');
        this.updateLoadingStatus('Connecting...');
        
        try {
            const user = await new Promise((resolve) => {
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    unsubscribe();
                    resolve(user);
                });
            });
            
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            
            this.user = user;
            this.updateLoadingStatus('Building world...');

            this.setupScene();
            this.setupLighting();
            this.updateLoadingStatus('Creating environment...');
            this.createEnvironment();
            this.updateLoadingStatus('Spawning player...');
            this.createLocalPlayer();
            this.setupInputs();
            this.setupMinimap();
            this.setupMultiplayer();
            this.setupChat();
            this.animate();
            
            // Hide loading screen
            setTimeout(() => {
                const loadingEl = document.getElementById('loading-overlay');
                if (loadingEl) loadingEl.classList.add('hidden');
            }, 500);
            
            console.log('🌍 World Scene ready!');
        } catch (error) {
            console.error('🌍 World Scene init error:', error);
            this.updateLoadingStatus('Error: ' + error.message);
        }
    }

    updateLoadingStatus(text) {
        const status = document.getElementById('loading-status');
        if (status) status.textContent = text;
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a15);
        this.scene.fog = new THREE.Fog(0x0a0a15, 50, 200); // Linear fog, cheaper

        // Reduced far plane for performance
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 300);
        this.camera.position.set(0, 10, 15);

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: false,
            powerPreference: 'low-power', // Prefer battery saving
            precision: 'lowp' // Lower precision for performance
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)); // Cap at 1
        this.renderer.shadowMap.enabled = false; // DISABLE shadows completely
        this.renderer.toneMapping = THREE.NoToneMapping; // Disable tone mapping
        
        const container = document.getElementById('world-container');
        if (container) {
            container.appendChild(this.renderer.domElement);
        }

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    setupInputs() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (this.chatOpen) {
                if (e.key === 'Escape' || e.key === 'Enter') {
                    if (e.key === 'Enter') this.sendChatFromInput();
                    window.toggleChat(false);
                    this.chatOpen = false;
                }
                return;
            }
            
            const k = e.key.toLowerCase();
            if (k === 'w') this.keys.w = true;
            if (k === 'a') this.keys.a = true;
            if (k === 's') this.keys.s = true;
            if (k === 'd') this.keys.d = true;
            if (k === ' ') { this.keys.space = true; e.preventDefault(); }
            if (k === 'shift') this.keys.shift = true;
            if (k === 't') {
                e.preventDefault();
                window.toggleChat(true);
                this.chatOpen = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w') this.keys.w = false;
            if (k === 'a') this.keys.a = false;
            if (k === 's') this.keys.s = false;
            if (k === 'd') this.keys.d = false;
            if (k === ' ') this.keys.space = false;
            if (k === 'shift') this.keys.shift = false;
        });

        // Mouse look
        document.addEventListener('mousemove', (e) => {
            if (this.chatOpen) return;
            this.cameraAngle -= e.movementX * 0.003;
        });

        // Pointer lock for better mouse control
        this.renderer.domElement.addEventListener('click', () => {
            if (!this.chatOpen) {
                this.renderer.domElement.requestPointerLock?.();
            }
        });
    }

    setupMinimap() {
        const canvas = document.getElementById('minimap-canvas');
        if (canvas) {
            this.minimapCtx = canvas.getContext('2d');
        }
    }

    setupLighting() {
        // SIMPLIFIED LIGHTING - just 2 lights total for performance
        
        // Single ambient light (adjusted by time of day)
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(this.ambientLight);

        // Single directional light (no shadows)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.sunLight.position.set(50, 100, 50);
        this.scene.add(this.sunLight);

        // Sun sphere (low poly)
        const sunGeo = new THREE.SphereGeometry(15, 8, 8); // Reduced segments
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.scene.add(this.sun);

        // Moon sphere (low poly)
        const moonGeo = new THREE.SphereGeometry(10, 8, 8); // Reduced segments
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xccccff });
        this.moon = new THREE.Mesh(moonGeo, moonMat);
        this.scene.add(this.moon);

        // Minimal stars
        this.createStars();

        // Initialize time
        this.syncWorldTime();
    }

    createStars() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 100; // Drastically reduced
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            const radius = 250;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.4;
            
            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.cos(phi);
            positions[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
        }
        
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
        this.stars = new THREE.Points(starGeo, starMat);
        this.scene.add(this.stars);
    }

    syncWorldTime() {
        // Use real-world time synced via Firebase (server-specific)
        const timeRef = ref(db, `servers/${this.serverName}/serverTime`);
        
        onValue(timeRef, (snapshot) => {
            const serverTime = snapshot.val();
            if (serverTime) {
                const now = Date.now();
                const elapsed = (now - serverTime.startTime) / 1000;
                this.worldTime = (serverTime.baseHour + (elapsed / 60) * this.timeSpeed) % 24;
            }
        });

        // Set initial time if not exists
        set(ref(db, `servers/${this.serverName}/serverTime`), {
            startTime: Date.now(),
            baseHour: new Date().getHours() + new Date().getMinutes() / 60
        });
    }

    updateTimeOfDay() {
        // Update time based on real world (synced)
        const now = new Date();
        this.worldTime = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
        
        const hour = this.worldTime;
        const sunAngle = ((hour - 6) / 12) * Math.PI; // Sun rises at 6, sets at 18
        
        // Sun position
        const sunDist = 300;
        const sunX = Math.cos(sunAngle) * sunDist;
        const sunY = Math.sin(sunAngle) * sunDist;
        this.sun.position.set(sunX, sunY, 0);
        this.sunLight.position.copy(this.sun.position);
        
        // Moon opposite to sun
        this.moon.position.set(-sunX, -sunY + 50, 0);
        
        // Calculate daylight factor (0 = midnight, 1 = noon)
        let dayFactor;
        if (hour >= 6 && hour <= 18) {
            // Daytime
            dayFactor = Math.sin((hour - 6) / 12 * Math.PI);
        } else {
            // Nighttime
            dayFactor = 0;
        }
        
        // Sunrise/sunset colors (5-7 and 17-19)
        let skyColor, fogColor, sunColor;
        
        if (hour >= 5 && hour < 7) {
            // Sunrise
            const t = (hour - 5) / 2;
            skyColor = this.lerpColor(0x1a1a2e, 0xff7b54, t);
            fogColor = this.lerpColor(0x0a0a15, 0xffb347, t);
            sunColor = 0xff6b35;
        } else if (hour >= 7 && hour < 17) {
            // Daytime
            skyColor = 0x87ceeb;
            fogColor = 0xc9e9f6;
            sunColor = 0xffffff;
        } else if (hour >= 17 && hour < 19) {
            // Sunset
            const t = (hour - 17) / 2;
            skyColor = this.lerpColor(0x87ceeb, 0xff6b35, t);
            fogColor = this.lerpColor(0xc9e9f6, 0x2d1b4e, t);
            sunColor = this.lerpColor(0xffffff, 0xff4500, t);
        } else {
            // Night
            skyColor = 0x0a0a1a;
            fogColor = 0x0a0a15;
            sunColor = 0x6688cc;
        }

        // Apply colors
        this.scene.background = new THREE.Color(skyColor);
        this.scene.fog = new THREE.FogExp2(fogColor, 0.004);
        
        // Lighting intensity based on time
        this.sunLight.intensity = Math.max(0.1, dayFactor * 1.2);
        this.sunLight.color.setHex(sunColor);
        this.ambientLight.intensity = 0.1 + dayFactor * 0.4;
        this.hemiLight.intensity = 0.2 + dayFactor * 0.5;
        
        // Sun/moon visibility
        this.sun.visible = hour >= 5 && hour <= 19;
        this.sun.material.color.setHex(sunColor);
        this.moon.visible = hour < 6 || hour > 18;
        
        // Stars visibility (fade in/out)
        if (this.stars) {
            this.stars.material.opacity = hour < 6 || hour > 19 ? 1 : Math.max(0, 1 - dayFactor * 2);
            this.stars.material.transparent = true;
        }

        // Update time display
        this.updateTimeDisplay(hour);
    }

    lerpColor(color1, color2, t) {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);
        return new THREE.Color().lerpColors(c1, c2, t).getHex();
    }

    updateTimeDisplay(hour) {
        const timeEl = document.getElementById('world-time');
        const weatherEl = document.getElementById('weather-icon');
        
        if (timeEl) {
            const h = Math.floor(hour);
            const m = Math.floor((hour % 1) * 60);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            timeEl.textContent = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
        }
        
        if (weatherEl) {
            // Update weather icon based on time
            if (hour >= 6 && hour < 7) {
                weatherEl.textContent = '🌅'; // Sunrise
            } else if (hour >= 7 && hour < 17) {
                weatherEl.textContent = '☀️'; // Day
            } else if (hour >= 17 && hour < 19) {
                weatherEl.textContent = '🌇'; // Sunset
            } else {
                weatherEl.textContent = '🌙'; // Night
            }
        }
    }

    createStreetLight(x, z) {
        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 6, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(x, 3, z);
        pole.castShadow = true;
        this.scene.add(pole);

        // Light fixture (no actual point light - too expensive)
        const fixtureGeo = new THREE.SphereGeometry(0.4, 6, 6); // Low poly
        const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 }); // Basic material
        const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
        fixture.position.set(x, 6.2, z);
        this.scene.add(fixture);
    }

    createEnvironment() {
        // Create environment based on server type
        switch(this.serverName) {
            case 'roleplay':
                this.createRoleplayWorld();
                break;
            case 'carmeet':
                this.createCarMeetWorld();
                break;
            case 'office':
                this.createOfficeWorld();
                break;
            case 'cafe':
                this.createCafeWorld();
                break;
            case 'nightclub':
                this.createNightclubWorld();
                break;
            case 'beach':
                this.createBeachWorld();
                break;
            default:
                this.createRoleplayWorld();
        }
        
        // Common elements
        this.createClouds();
    }

    // ==========================================
    // SERVER-SPECIFIC WORLD ENVIRONMENTS
    // ==========================================

    createRoleplayWorld() {
        // City environment with roads and buildings
        this.createGround(0x3d6b3d); // Grass
        this.createRoads();
        this.createCentralPlaza();
        this.createParkArea();
        this.createShoppingDistrict();
        this.createClubStrip();
        this.createTrees();
        this.createStreetLamps();
        this.createSurroundingBuildings();
    }

    createCarMeetWorld() {
        // Large parking lot with car displays
        this.createGround(0x2a2a2a); // Asphalt
        
        // Main parking lot
        const lotGeo = new THREE.PlaneGeometry(200, 200);
        const lotMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
        const lot = new THREE.Mesh(lotGeo, lotMat);
        lot.rotation.x = -Math.PI / 2;
        lot.position.y = 0.01;
        lot.receiveShadow = true;
        this.scene.add(lot);

        // Parking lines
        for (let x = -80; x <= 80; x += 10) {
            for (let z = -80; z <= 80; z += 20) {
                const lineGeo = new THREE.PlaneGeometry(0.3, 8);
                const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(x, 0.02, z);
                this.scene.add(line);
            }
        }

        // Display platforms
        const platformPositions = [
            { x: 0, z: 0 }, { x: 30, z: 0 }, { x: -30, z: 0 },
            { x: 0, z: 40 }, { x: 30, z: 40 }, { x: -30, z: 40 }
        ];
        platformPositions.forEach(pos => {
            const platGeo = new THREE.CylinderGeometry(8, 8, 0.5, 32);
            const platMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, metalness: 0.8 });
            const plat = new THREE.Mesh(platGeo, platMat);
            plat.position.set(pos.x, 0.25, pos.z);
            plat.receiveShadow = true;
            this.scene.add(plat);
        });

        // Garage building
        this.createBuilding(-80, 0, 30, 20, 15, 0x444444, 'GARAGE');
        
        // Spectator stands
        this.createSpectatorStand(0, -60);
        
        this.createStreetLamps();
    }

    createOfficeWorld() {
        // Business district with tall buildings
        this.createGround(0x555555); // Concrete
        
        // Main plaza
        const plazaGeo = new THREE.PlaneGeometry(100, 100);
        const plazaMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7 });
        const plaza = new THREE.Mesh(plazaGeo, plazaMat);
        plaza.rotation.x = -Math.PI / 2;
        plaza.position.y = 0.01;
        plaza.receiveShadow = true;
        this.scene.add(plaza);

        // Office towers
        const towers = [
            { x: -40, z: -40, w: 25, d: 25, h: 60, color: 0x4a5568 },
            { x: 40, z: -40, w: 20, d: 20, h: 50, color: 0x2d3748 },
            { x: -40, z: 40, w: 22, d: 22, h: 55, color: 0x1a202c },
            { x: 40, z: 40, w: 28, d: 28, h: 70, color: 0x374151 },
            { x: 0, z: 0, w: 15, d: 15, h: 40, color: 0x6366f1 }
        ];
        towers.forEach(t => this.createOfficeTower(t.x, t.z, t.w, t.d, t.h, t.color));

        // Fountain in center
        this.createFountain(0, 0);
        
        // Benches
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.createBench(Math.cos(angle) * 20, Math.sin(angle) * 20, angle + Math.PI);
        }
        
        this.createStreetLamps();
    }

    createCafeWorld() {
        // Cozy cafe area with outdoor seating
        this.createGround(0x5d4037); // Brown earth
        
        // Wooden deck area
        const deckGeo = new THREE.PlaneGeometry(80, 80);
        const deckMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.rotation.x = -Math.PI / 2;
        deck.position.y = 0.1;
        deck.receiveShadow = true;
        this.scene.add(deck);

        // Main cafe building
        this.createBuilding(0, -30, 40, 20, 8, 0xd4a574, 'COFFEE HOUSE');

        // Outdoor tables with umbrellas
        const tablePositions = [
            { x: -20, z: 10 }, { x: 0, z: 10 }, { x: 20, z: 10 },
            { x: -20, z: 25 }, { x: 0, z: 25 }, { x: 20, z: 25 }
        ];
        tablePositions.forEach(pos => this.createCafeTable(pos.x, pos.z));

        // Decorative plants
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 20;
            this.createTree(Math.cos(angle) * dist, Math.sin(angle) * dist);
        }

        // String lights
        this.createStringLights(-30, 30, -10, 40);
        
        this.createStreetLamps();
    }

    createNightclubWorld() {
        // Party atmosphere - simplified for performance
        this.createGround(0x1a1a2e);
        
        // Dance floor
        const floorGeo = new THREE.PlaneGeometry(50, 50);
        const floorMat = new THREE.MeshBasicMaterial({ color: 0x2d1b4e }); // Basic material
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0.01;
        this.scene.add(floor);

        // Main club building
        this.createBuilding(0, -40, 60, 30, 15, 0x2d1b4e, 'METRO CLUB');

        // DJ booth (no emissive)
        const boothGeo = new THREE.BoxGeometry(10, 3, 5);
        const boothMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
        const booth = new THREE.Mesh(boothGeo, boothMat);
        booth.position.set(0, 1.5, -20);
        this.scene.add(booth);

        // Simplified VIP area (just one)
        this.createVIPArea(0, 20);

        // Bar
        this.createBar(0, 40);
    }

    createBeachWorld() {
        // Beach resort environment
        this.createGround(0xf4d03f); // Sand
        
        // Ocean
        const oceanGeo = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE);
        const oceanMat = new THREE.MeshStandardMaterial({ 
            color: 0x1e90ff, 
            roughness: 0.2,
            metalness: 0.3,
            transparent: true,
            opacity: 0.8
        });
        const ocean = new THREE.Mesh(oceanGeo, oceanMat);
        ocean.rotation.x = -Math.PI / 2;
        ocean.position.set(0, -0.2, -WORLD_SIZE / 2 - 50);
        this.scene.add(ocean);

        // Beach umbrellas
        const umbrellaPositions = [
            { x: -30, z: -20 }, { x: -10, z: -25 }, { x: 10, z: -20 },
            { x: 30, z: -25 }, { x: -20, z: -35 }, { x: 20, z: -35 }
        ];
        umbrellaPositions.forEach(pos => this.createBeachUmbrella(pos.x, pos.z));

        // Palm trees
        for (let i = 0; i < 10; i++) {
            const x = (Math.random() - 0.5) * 150;
            const z = Math.random() * 50 + 20;
            this.createPalmTree(x, z);
        }

        // Beach hut/bar
        this.createBuilding(0, 50, 20, 15, 6, 0x8b7355, 'BEACH BAR');

        // Lifeguard tower
        this.createLifeguardTower(-50, -10);
        
        // Beach chairs
        for (let i = 0; i < 8; i++) {
            const x = (i - 4) * 12;
            this.createBeachChair(x, -30);
        }
    }

    // ==========================================
    // HELPER FUNCTIONS FOR ENVIRONMENTS
    // ==========================================

    createGround(color) {
        const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2);
        const groundMat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'ground';
        this.scene.add(ground);
    }

    createOfficeTower(x, z, w, d, h, color) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7 });
        const tower = new THREE.Mesh(geo, mat);
        tower.position.set(x, h / 2, z);
        tower.castShadow = true;
        tower.receiveShadow = true;
        this.scene.add(tower);
        this.colliders.push({ x, z, radius: Math.max(w, d) / 2 + 2 });

        // Windows
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x87ceeb });
        for (let y = 2; y < h - 2; y += 4) {
            for (let wx = -w/2 + 2; wx < w/2 - 1; wx += 4) {
                const winGeo = new THREE.PlaneGeometry(2, 2);
                const win = new THREE.Mesh(winGeo, windowMat);
                win.position.set(x + wx, y, z + d/2 + 0.01);
                this.scene.add(win);
            }
        }
    }

    createCafeTable(x, z) {
        // Table
        const tableGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 16);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.set(x, 1, z);
        this.scene.add(table);

        // Leg
        const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        const leg = new THREE.Mesh(legGeo, tableMat);
        leg.position.set(x, 0.5, z);
        this.scene.add(leg);

        // Umbrella
        const umbGeo = new THREE.ConeGeometry(2.5, 1, 8);
        const umbMat = new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0xe74c3c : 0x3498db });
        const umb = new THREE.Mesh(umbGeo, umbMat);
        umb.position.set(x, 3, z);
        this.scene.add(umb);

        // Chairs
        [[-1.5, 0], [1.5, 0], [0, -1.5], [0, 1.5]].forEach(([dx, dz]) => {
            const chairGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            const chairMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
            const chair = new THREE.Mesh(chairGeo, chairMat);
            chair.position.set(x + dx, 0.4, z + dz);
            this.scene.add(chair);
        });
    }

    createStringLights(x1, x2, z1, z2) {
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        for (let i = 0; i < 20; i++) {
            const t = i / 20;
            const x = x1 + (x2 - x1) * t;
            const z = z1 + (z2 - z1) * t;
            const y = 4 + Math.sin(t * Math.PI) * 0.5;
            
            const bulbGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const bulb = new THREE.Mesh(bulbGeo, lightMat);
            bulb.position.set(x, y, z);
            this.scene.add(bulb);
        }
    }

    createNeonLights() {
        const colors = [0xff00ff, 0x00ffff, 0xff0080, 0x8000ff];
        for (let i = 0; i < 8; i++) {
            const color = colors[i % colors.length];
            const light = new THREE.PointLight(color, 2, 20);
            light.position.set(
                (Math.random() - 0.5) * 60,
                3,
                (Math.random() - 0.5) * 60
            );
            this.scene.add(light);

            // Neon tube
            const tubeGeo = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
            const tubeMat = new THREE.MeshBasicMaterial({ color });
            const tube = new THREE.Mesh(tubeGeo, tubeMat);
            tube.position.copy(light.position);
            tube.rotation.z = Math.PI / 2;
            this.scene.add(tube);
        }
    }

    createVIPArea(x, z) {
        // Rope barrier
        const postMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
        const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
        
        [[-5, -5], [5, -5], [5, 5], [-5, 5]].forEach(([dx, dz]) => {
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(x + dx, 0.75, z + dz);
            this.scene.add(post);
        });

        // Lounge seating
        const couchGeo = new THREE.BoxGeometry(8, 1, 3);
        const couchMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6 });
        const couch = new THREE.Mesh(couchGeo, couchMat);
        couch.position.set(x, 0.5, z);
        this.scene.add(couch);
    }

    createBar(x, z) {
        const barGeo = new THREE.BoxGeometry(15, 1.2, 3);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x2d1b4e, roughness: 0.3 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(x, 0.6, z);
        this.scene.add(bar);
        this.colliders.push({ x, z, radius: 8 });

        // Bar stools
        for (let i = -6; i <= 6; i += 3) {
            const stoolGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8);
            const stoolMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
            const stool = new THREE.Mesh(stoolGeo, stoolMat);
            stool.position.set(x + i, 0.4, z + 2.5);
            this.scene.add(stool);
        }
    }

    createBeachUmbrella(x, z) {
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(x, 1.5, z);
        this.scene.add(pole);

        const umbGeo = new THREE.ConeGeometry(3, 1.5, 8);
        const colors = [0xe74c3c, 0x3498db, 0xf39c12, 0x2ecc71];
        const umbMat = new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * 4)] });
        const umb = new THREE.Mesh(umbGeo, umbMat);
        umb.position.set(x, 3.5, z);
        this.scene.add(umb);
    }

    createPalmTree(x, z) {
        // Trunk (curved)
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 8, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(x, 4, z);
        trunk.rotation.z = 0.1;
        this.scene.add(trunk);

        // Leaves
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const leafGeo = new THREE.ConeGeometry(0.5, 4, 4);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.set(x + Math.cos(angle) * 1.5, 8, z + Math.sin(angle) * 1.5);
            leaf.rotation.z = Math.cos(angle) * 0.5;
            leaf.rotation.x = Math.sin(angle) * 0.5;
            this.scene.add(leaf);
        }
    }

    createLifeguardTower(x, z) {
        // Legs
        const legMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
        [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([dx, dz]) => {
            const legGeo = new THREE.CylinderGeometry(0.2, 0.2, 6, 8);
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(x + dx, 3, z + dz);
            this.scene.add(leg);
        });

        // Platform
        const platGeo = new THREE.BoxGeometry(6, 0.3, 6);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
        const plat = new THREE.Mesh(platGeo, platMat);
        plat.position.set(x, 6, z);
        this.scene.add(plat);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(4, 3, 4);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(x, 7.5, z);
        this.scene.add(cabin);
    }

    createBeachChair(x, z) {
        const chairGeo = new THREE.BoxGeometry(2, 0.5, 4);
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x3498db });
        const chair = new THREE.Mesh(chairGeo, chairMat);
        chair.position.set(x, 0.25, z);
        chair.rotation.x = -0.3;
        this.scene.add(chair);
    }

    createSpectatorStand(x, z) {
        for (let row = 0; row < 4; row++) {
            const standGeo = new THREE.BoxGeometry(40, 1, 3);
            const standMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
            const stand = new THREE.Mesh(standGeo, standMat);
            stand.position.set(x, row * 1.2 + 0.5, z - row * 2);
            this.scene.add(stand);
        }
    }

    createBuilding(x, z, w, d, h, color, label = '') {
        // Main building
        const buildGeo = new THREE.BoxGeometry(w, h, d);
        const buildMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
        const building = new THREE.Mesh(buildGeo, buildMat);
        building.position.set(x, h / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);
        this.colliders.push({ x, z, radius: Math.max(w, d) / 2 + 2 });

        // Roof
        const roofGeo = new THREE.BoxGeometry(w + 2, 0.5, d + 2);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(x, h + 0.25, z);
        this.scene.add(roof);

        // Door
        const doorGeo = new THREE.PlaneGeometry(3, 4);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3020 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(x, 2, z + d / 2 + 0.01);
        this.scene.add(door);

        // Label sign if provided
        if (label) {
            const signGeo = new THREE.PlaneGeometry(w * 0.8, 2);
            const signMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
            const sign = new THREE.Mesh(signGeo, signMat);
            sign.position.set(x, h - 1, z + d / 2 + 0.02);
            this.scene.add(sign);
        }
    }

    createRoads() {
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
        
        // Main roads
        const roads = [
            { x: 0, z: 0, w: 10, d: WORLD_SIZE * 2 }, // North-South main road
            { x: 0, z: 0, w: WORLD_SIZE * 2, d: 10 }, // East-West main road
            { x: -60, z: -40, w: 80, d: 8 }, // Club strip road
            { x: 70, z: 0, w: 8, d: 60 } // Park road
        ];

        roads.forEach(road => {
            const geo = new THREE.PlaneGeometry(road.w, road.d);
            const mesh = new THREE.Mesh(geo, roadMat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(road.x, 0.01, road.z);
            mesh.receiveShadow = true;
            this.scene.add(mesh);

            // Road lines
            const lineGeo = new THREE.PlaneGeometry(road.w > road.d ? road.w : 0.3, road.d > road.w ? road.d : 0.3);
            const lineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(road.x, 0.02, road.z);
            this.scene.add(line);
        });
    }

    createClouds() {
        // Minimal clouds - just 3 simple ones (no animation)
        const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
        const cloudGeo = new THREE.SphereGeometry(15, 4, 4);

        for (let i = 0; i < 3; i++) {
            const cloud = new THREE.Mesh(cloudGeo, cloudMat);
            cloud.scale.set(2, 0.5, 1);
            cloud.position.set((i - 1) * 100, 100, (Math.random() - 0.5) * 100);
            this.scene.add(cloud);
        }
    }

    createGrassPatches() {
        // Removed individual grass patches for performance
        // Ground color already provides grass appearance
    }

    createCentralPlaza() {
        // Main plaza floor
        const plazaGeo = new THREE.CircleGeometry(30, 64);
        const plazaMat = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a4a,
            roughness: 0.7
        });
        const plaza = new THREE.Mesh(plazaGeo, plazaMat);
        plaza.rotation.x = -Math.PI / 2;
        plaza.position.y = 0.02;
        plaza.receiveShadow = true;
        this.scene.add(plaza);

        // Decorative tile pattern
        const tileSize = 5;
        for (let x = -25; x <= 25; x += tileSize) {
            for (let z = -25; z <= 25; z += tileSize) {
                if (Math.sqrt(x*x + z*z) > 28) continue;
                const isAccent = (Math.abs(x) + Math.abs(z)) % 10 === 0;
                const tileGeo = new THREE.PlaneGeometry(tileSize - 0.2, tileSize - 0.2);
                const tileMat = new THREE.MeshStandardMaterial({ 
                    color: isAccent ? 0x5a4a7a : 0x4a4a5a,
                    roughness: 0.6
                });
                const tile = new THREE.Mesh(tileGeo, tileMat);
                tile.rotation.x = -Math.PI / 2;
                tile.position.set(x, 0.03, z);
                tile.receiveShadow = true;
                this.scene.add(tile);
            }
        }

        // Central fountain
        this.createFountain(0, 0);
        
        // Benches around plaza
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const x = Math.cos(angle) * 20;
            const z = Math.sin(angle) * 20;
            this.createBench(x, z, angle + Math.PI);
        }
    }

    createParkArea() {
        // Park located to the east
        const parkX = 70;
        const parkZ = 0;
        
        // Grass area
        const grassGeo = new THREE.CircleGeometry(35, 32);
        const grassMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a3a1a,
            roughness: 0.95
        });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(parkX, 0.01, parkZ);
        grass.receiveShadow = true;
        this.scene.add(grass);

        // Pathway through park
        const pathGeo = new THREE.PlaneGeometry(4, 60);
        const pathMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 });
        const path = new THREE.Mesh(pathGeo, pathMat);
        path.rotation.x = -Math.PI / 2;
        path.position.set(parkX, 0.02, parkZ);
        this.scene.add(path);

        // Park benches
        this.createBench(parkX + 10, parkZ - 10, 0);
        this.createBench(parkX + 10, parkZ + 10, Math.PI);
        this.createBench(parkX - 10, parkZ, Math.PI / 2);

        // Pond
        const pondGeo = new THREE.CircleGeometry(8, 32);
        const pondMat = new THREE.MeshStandardMaterial({ 
            color: 0x2244aa,
            roughness: 0.1,
            metalness: 0.8
        });
        const pond = new THREE.Mesh(pondGeo, pondMat);
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(parkX - 15, 0.02, parkZ + 15);
        this.scene.add(pond);
    }

    createShoppingDistrict() {
        // Shopping area to the west
        const shopX = -70;
        const shopZ = 0;
        
        // Paved area
        const pavedGeo = new THREE.PlaneGeometry(50, 80);
        const pavedMat = new THREE.MeshStandardMaterial({ 
            color: 0x3a3a3a,
            roughness: 0.8
        });
        const paved = new THREE.Mesh(pavedGeo, pavedMat);
        paved.rotation.x = -Math.PI / 2;
        paved.position.set(shopX, 0.01, shopZ);
        this.scene.add(paved);

        // Shop buildings
        for (let i = -2; i <= 2; i++) {
            const buildingX = shopX - 15;
            const buildingZ = shopZ + i * 15;
            this.createShopBuilding(buildingX, buildingZ);
        }
    }

    createShopBuilding(x, z) {
        const width = 10;
        const height = 8 + Math.random() * 4;
        const depth = 8;
        
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(Math.random() * 0.2 + 0.6, 0.3, 0.3),
            roughness: 0.7
        });
        const building = new THREE.Mesh(geo, mat);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);

        // Neon sign
        const signGeo = new THREE.BoxGeometry(6, 1.5, 0.2);
        const signMat = new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 0.5
        });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(x, height + 1, z + depth / 2 + 0.2);
        this.scene.add(sign);
    }

    createClubStrip() {
        // Club area to the north
        const stripX = 0;
        const stripZ = -70;
        
        // Road
        const roadGeo = new THREE.PlaneGeometry(80, 15);
        const roadMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            roughness: 0.9
        });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(stripX, 0.01, stripZ);
        this.scene.add(road);

        // Sidewalk
        const sidewalkGeo = new THREE.PlaneGeometry(80, 6);
        const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.8 });
        const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
        sidewalk.rotation.x = -Math.PI / 2;
        sidewalk.position.set(stripX, 0.02, stripZ + 10);
        this.scene.add(sidewalk);

        // Club buildings with neon
        const clubColors = [0xff0066, 0x00ffff, 0xffff00, 0xff00ff, 0x00ff00];
        for (let i = -2; i <= 2; i++) {
            const clubX = stripX + i * 15;
            const clubZ = stripZ - 12;
            
            // Building
            const height = 15 + Math.random() * 10;
            const geo = new THREE.BoxGeometry(12, height, 10);
            const mat = new THREE.MeshStandardMaterial({ 
                color: 0x1a1a2a,
                roughness: 0.7
            });
            const building = new THREE.Mesh(geo, mat);
            building.position.set(clubX, height / 2, clubZ);
            building.castShadow = true;
            this.scene.add(building);

            // Big neon sign
            const color = clubColors[i + 2];
            const signGeo = new THREE.BoxGeometry(10, 3, 0.3);
            const signMat = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 1
            });
            const sign = new THREE.Mesh(signGeo, signMat);
            sign.position.set(clubX, height - 2, clubZ + 5.2);
            this.scene.add(sign);

            // Point light
            const light = new THREE.PointLight(color, 2, 20);
            light.position.set(clubX, 5, clubZ + 8);
            this.scene.add(light);
        }
    }

    createSkybox() {
        // Starry sky dome
        const skyGeo = new THREE.SphereGeometry(500, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x0a0a1a,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        // Stars
        const starCount = 500;
        const starGeo = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.5;
            const r = 400;
            starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = r * Math.cos(phi) + 100;
            starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        const starMat = new THREE.PointsMaterial({ 
            color: 0xffffff, 
            size: 2,
            sizeAttenuation: true
        });
        const stars = new THREE.Points(starGeo, starMat);
        this.scene.add(stars);

        // Moon
        const moonGeo = new THREE.SphereGeometry(15, 32, 32);
        const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
        const moon = new THREE.Mesh(moonGeo, moonMat);
        moon.position.set(100, 200, -200);
        this.scene.add(moon);
    }

    createTrees() {
        // Scattered trees around the world
        const treePositions = [];
        
        // Park trees
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * 20;
            treePositions.push({
                x: 70 + Math.cos(angle) * dist,
                z: Math.sin(angle) * dist
            });
        }
        
        // Random trees around world
        for (let i = 0; i < 15; i++) { // Reduced from 30
            const x = (Math.random() - 0.5) * WORLD_SIZE;
            const z = (Math.random() - 0.5) * WORLD_SIZE;
            // Avoid central areas
            if (Math.abs(x) < 40 && Math.abs(z) < 40) continue;
            if (Math.abs(x + 70) < 30 && Math.abs(z) < 40) continue;
            treePositions.push({ x, z });
        }

        treePositions.forEach(pos => this.createTree(pos.x, pos.z));
    }

    createTree(x, z) {
        const group = new THREE.Group();
        
        // Trunk
        const trunkHeight = 3 + Math.random() * 2;
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3020 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        group.add(trunk);

        // Foliage (cone shape)
        const foliageHeight = 4 + Math.random() * 2;
        const foliageGeo = new THREE.ConeGeometry(2 + Math.random(), foliageHeight, 8);
        const foliageMat = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(0.3, 0.6 + Math.random() * 0.2, 0.2 + Math.random() * 0.1)
        });
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = trunkHeight + foliageHeight / 2 - 0.5;
        foliage.castShadow = true;
        group.add(foliage);

        group.position.set(x, 0, z);
        this.scene.add(group);
    }

    createStreetLamps() {
        const lampPositions = [
            // Central plaza
            [-15, -15], [15, -15], [-15, 15], [15, 15],
            [0, -25], [0, 25], [-25, 0], [25, 0],
            // Park path
            [55, 0], [85, 0], [70, -25], [70, 25],
            // Shopping area
            [-55, -30], [-55, 0], [-55, 30],
            // Club strip
            [-30, -60], [0, -60], [30, -60]
        ];

        lampPositions.forEach(([x, z]) => this.createStreetLight(x, z));
    }

    createFountain() {
        // Base
        const baseGeo = new THREE.CylinderGeometry(5, 6, 1, 32);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x555566 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.5;
        base.castShadow = true;
        this.scene.add(base);

        // Water
        const waterGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.5, 32);
        const waterMat = new THREE.MeshStandardMaterial({ 
            color: 0x4488ff,
            transparent: true,
            opacity: 0.7
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.y = 0.8;
        this.scene.add(water);

        // Central pillar
        const pillarGeo = new THREE.CylinderGeometry(0.5, 0.8, 4, 16);
        const pillar = new THREE.Mesh(pillarGeo, baseMat);
        pillar.position.y = 2.5;
        pillar.castShadow = true;
        this.scene.add(pillar);

        // Top bowl
        const bowlGeo = new THREE.SphereGeometry(1.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const bowl = new THREE.Mesh(bowlGeo, baseMat);
        bowl.position.y = 4.5;
        bowl.rotation.x = Math.PI;
        this.scene.add(bowl);
    }

    createBenches() {
        const benchPositions = [
            { x: 12, z: 0, rot: Math.PI / 2 },
            { x: -12, z: 0, rot: -Math.PI / 2 },
            { x: 0, z: 12, rot: 0 },
            { x: 0, z: -12, rot: Math.PI },
            { x: 8, z: 8, rot: Math.PI / 4 },
            { x: -8, z: 8, rot: -Math.PI / 4 },
            { x: 8, z: -8, rot: -Math.PI / 4 },
            { x: -8, z: -8, rot: Math.PI / 4 }
        ];

        benchPositions.forEach(pos => {
            this.createBench(pos.x, pos.z, pos.rot);
        });
    }

    createBench(x, z, rotation) {
        const group = new THREE.Group();

        // Seat
        const seatGeo = new THREE.BoxGeometry(3, 0.2, 0.8);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const seat = new THREE.Mesh(seatGeo, woodMat);
        seat.position.y = 0.6;
        seat.castShadow = true;
        group.add(seat);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.15, 0.6, 0.6);
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        const leg1 = new THREE.Mesh(legGeo, metalMat);
        leg1.position.set(-1.2, 0.3, 0);
        group.add(leg1);
        
        const leg2 = new THREE.Mesh(legGeo, metalMat);
        leg2.position.set(1.2, 0.3, 0);
        group.add(leg2);

        // Backrest
        const backGeo = new THREE.BoxGeometry(3, 0.8, 0.1);
        const back = new THREE.Mesh(backGeo, woodMat);
        back.position.set(0, 1.1, -0.35);
        back.castShadow = true;
        group.add(back);

        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        this.scene.add(group);
    }

    createSurroundingBuildings() {
        const buildingData = [
            { x: -35, z: 0, w: 15, h: 25, d: 20, color: 0x2a2a3a },
            { x: 35, z: 0, w: 15, h: 30, d: 20, color: 0x3a2a3a },
            { x: 0, z: -35, w: 20, h: 20, d: 15, color: 0x2a3a3a },
            { x: 0, z: 35, w: 20, h: 35, d: 15, color: 0x3a3a2a },
            { x: -30, z: -30, w: 12, h: 22, d: 12, color: 0x2a2a4a },
            { x: 30, z: -30, w: 12, h: 28, d: 12, color: 0x4a2a2a },
            { x: -30, z: 30, w: 12, h: 18, d: 12, color: 0x2a4a2a },
            { x: 30, z: 30, w: 12, h: 32, d: 12, color: 0x4a2a4a }
        ];

        buildingData.forEach(b => {
            this.createBuilding(b.x, b.z, b.w, b.h, b.d, b.color);
        });
    }

    createBuilding(x, z, width, height, depth, color) {
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({ color });
        const building = new THREE.Mesh(geo, mat);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);

        // Windows
        const windowMat = new THREE.MeshStandardMaterial({ 
            color: 0xffff88,
            emissive: 0xffff44,
            emissiveIntensity: 0.3
        });
        
        const windowSize = 1;
        const spacing = 3;
        
        for (let wy = 3; wy < height - 2; wy += spacing) {
            for (let wx = -width/2 + 2; wx < width/2 - 1; wx += spacing) {
                if (Math.random() > 0.3) {
                    const windowGeo = new THREE.PlaneGeometry(windowSize, windowSize * 1.5);
                    const win = new THREE.Mesh(windowGeo, windowMat);
                    win.position.set(x + wx, wy, z + depth/2 + 0.01);
                    this.scene.add(win);
                }
            }
        }
    }

    createNeonSigns() {
        const signs = [
            { text: 'CLUB DISTRICT', x: 0, z: -30, color: 0xff00ff },
            { text: 'SOCIAL PLAZA', x: -25, z: 0, color: 0x00ffff },
            { text: 'MEET & GREET', x: 25, z: 0, color: 0xffff00 }
        ];

        // Using simple glowing boxes as placeholder for text
        signs.forEach(sign => {
            const geo = new THREE.BoxGeometry(10, 2, 0.3);
            const mat = new THREE.MeshStandardMaterial({
                color: sign.color,
                emissive: sign.color,
                emissiveIntensity: 1
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(sign.x, 8, sign.z);
            if (sign.x !== 0) mesh.rotation.y = sign.x > 0 ? -Math.PI/2 : Math.PI/2;
            this.scene.add(mesh);
        });
    }

    createLocalPlayer() {
        const playerData = {
            id: this.user.uid,
            name: this.user.displayName || 'Player',
            color: this.getPlayerColor(this.user.uid),
            x: 0,
            z: 10
        };

        this.localPlayer = this.createPlayerMesh(playerData, true);
        this.localPlayer.userData = playerData;
        this.scene.add(this.localPlayer);

        // Name label
        this.createNameLabel(this.localPlayer, playerData.name, true);
    }

    createPlayerMesh(data, isLocal = false) {
        const group = new THREE.Group();
        const skinColor = 0xdeb887; // Skin tone
        const clothColor = data.color;

        // Materials
        const skinMat = new THREE.MeshStandardMaterial({ 
            color: skinColor,
            roughness: 0.8
        });
        const clothMat = new THREE.MeshStandardMaterial({ 
            color: clothColor,
            metalness: 0.1,
            roughness: 0.7
        });
        const pantsMat = new THREE.MeshStandardMaterial({ 
            color: 0x2a2a4a,
            roughness: 0.8
        });
        const shoeMat = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            roughness: 0.6
        });

        // === TORSO ===
        const torsoGeo = new THREE.BoxGeometry(0.6, 0.8, 0.35);
        const torso = new THREE.Mesh(torsoGeo, clothMat);
        torso.position.y = 1.3;
        torso.castShadow = true;
        torso.name = 'torso';
        group.add(torso);

        // === HEAD ===
        const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
        const head = new THREE.Mesh(headGeo, skinMat);
        head.position.y = 1.95;
        head.castShadow = true;
        head.name = 'head';
        group.add(head);

        // Hair
        const hairGeo = new THREE.SphereGeometry(0.27, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const hairMat = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(Math.random() * 0.1, 0.5, 0.2 + Math.random() * 0.3)
        });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 2.0;
        hair.castShadow = true;
        group.add(hair);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.08, 1.98, 0.22);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.08, 1.98, 0.22);
        group.add(rightEye);

        // === ARMS ===
        // Left arm group
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.35, 1.65, 0);
        leftArmGroup.name = 'leftUpperArm';
        group.add(leftArmGroup);

        const armGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.28, 8);
        const leftUpperArm = new THREE.Mesh(armGeo, clothMat);
        leftUpperArm.position.y = -0.14;
        leftUpperArm.castShadow = true;
        leftArmGroup.add(leftUpperArm);

        const forearmGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.25, 8);
        const leftForearm = new THREE.Mesh(forearmGeo, skinMat);
        leftForearm.position.y = -0.4;
        leftForearm.castShadow = true;
        leftArmGroup.add(leftForearm);

        const handGeo = new THREE.BoxGeometry(0.05, 0.08, 0.03);
        const leftHand = new THREE.Mesh(handGeo, skinMat);
        leftHand.position.y = -0.57;
        leftHand.castShadow = true;
        leftArmGroup.add(leftHand);

        // Right arm group
        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.35, 1.65, 0);
        rightArmGroup.name = 'rightUpperArm';
        group.add(rightArmGroup);

        const rightUpperArm = new THREE.Mesh(armGeo, clothMat);
        rightUpperArm.position.y = -0.14;
        rightUpperArm.castShadow = true;
        rightArmGroup.add(rightUpperArm);

        const rightForearm = new THREE.Mesh(forearmGeo, skinMat);
        rightForearm.position.y = -0.4;
        rightForearm.castShadow = true;
        rightArmGroup.add(rightForearm);

        const rightHand = new THREE.Mesh(handGeo, skinMat);
        rightHand.position.y = -0.57;
        rightHand.castShadow = true;
        rightArmGroup.add(rightHand);

        // === LEGS (using Groups for proper animation) ===
        // Left leg group
        const leftLegGroup = new THREE.Group();
        leftLegGroup.position.set(-0.15, 0.9, 0);
        leftLegGroup.name = 'leftUpperLeg';
        group.add(leftLegGroup);

        const legGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.4, 8);
        const leftUpperLeg = new THREE.Mesh(legGeo, pantsMat);
        leftUpperLeg.position.y = -0.2;
        leftUpperLeg.castShadow = true;
        leftLegGroup.add(leftUpperLeg);

        const lowerLegGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.4, 8);
        const leftLowerLeg = new THREE.Mesh(lowerLegGeo, pantsMat);
        leftLowerLeg.position.y = -0.6;
        leftLowerLeg.castShadow = true;
        leftLegGroup.add(leftLowerLeg);

        const footGeo = new THREE.BoxGeometry(0.1, 0.06, 0.2);
        const leftFoot = new THREE.Mesh(footGeo, shoeMat);
        leftFoot.position.set(0, -0.85, 0.03);
        leftFoot.castShadow = true;
        leftLegGroup.add(leftFoot);

        // Right leg group
        const rightLegGroup = new THREE.Group();
        rightLegGroup.position.set(0.15, 0.9, 0);
        rightLegGroup.name = 'rightUpperLeg';
        group.add(rightLegGroup);

        const rightUpperLeg = new THREE.Mesh(legGeo, pantsMat);
        rightUpperLeg.position.y = -0.2;
        rightUpperLeg.castShadow = true;
        rightLegGroup.add(rightUpperLeg);

        const rightLowerLeg = new THREE.Mesh(lowerLegGeo, pantsMat);
        rightLowerLeg.position.y = -0.6;
        rightLowerLeg.castShadow = true;
        rightLegGroup.add(rightLowerLeg);

        const rightFoot = new THREE.Mesh(footGeo, shoeMat);
        rightFoot.position.set(0, -0.85, 0.03);
        rightFoot.castShadow = true;
        rightLegGroup.add(rightFoot);

        // Glow ring for local player
        if (isLocal) {
            const ringGeo = new THREE.RingGeometry(0.5, 0.65, 32);
            const ringMat = new THREE.MeshBasicMaterial({ 
                color: 0x00ff88,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.6
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.02;
            ring.name = 'ring';
            group.add(ring);
        }

        // Store animation state
        group.userData.walkPhase = Math.random() * Math.PI * 2;
        group.userData.isMoving = false;

        group.position.set(data.x || 0, 0, data.z || 0);
        return group;
    }

    // Animate player limbs when walking
    animatePlayerLimbs(player, isMoving, delta) {
        if (!player) return;
        
        const speed = 8;
        if (isMoving) {
            player.userData.walkPhase += delta * speed;
        }
        
        const phase = player.userData.walkPhase;
        const amplitude = isMoving ? 0.4 : 0;
        
        // Find limbs
        player.children.forEach(child => {
            const swing = Math.sin(phase) * amplitude;
            const swingAlt = Math.sin(phase + Math.PI) * amplitude;
            
            switch(child.name) {
                // Arms swing opposite to legs
                case 'leftUpperArm':
                case 'leftForearm':
                    child.rotation.x = swingAlt * 0.8;
                    break;
                case 'leftHand':
                    child.position.z = swingAlt * 0.1;
                    break;
                case 'rightUpperArm':
                case 'rightForearm':
                    child.rotation.x = swing * 0.8;
                    break;
                case 'rightHand':
                    child.position.z = swing * 0.1;
                    break;
                    
                // Legs
                case 'leftUpperLeg':
                    child.rotation.x = swing * 0.6;
                    child.position.z = swing * 0.1;
                    break;
                case 'leftLowerLeg':
                    child.rotation.x = Math.max(0, swing) * 0.4;
                    break;
                case 'leftFoot':
                    child.position.z = 0.05 + swing * 0.08;
                    child.rotation.x = swing * 0.2;
                    break;
                case 'rightUpperLeg':
                    child.rotation.x = swingAlt * 0.6;
                    child.position.z = swingAlt * 0.1;
                    break;
                case 'rightLowerLeg':
                    child.rotation.x = Math.max(0, swingAlt) * 0.4;
                    break;
                case 'rightFoot':
                    child.position.z = 0.05 + swingAlt * 0.08;
                    child.rotation.x = swingAlt * 0.2;
                    break;
                    
                // Body bob
                case 'torso':
                case 'head':
                    if (isMoving) {
                        child.position.y += Math.abs(Math.sin(phase * 2)) * 0.02 - 0.01;
                    }
                    break;
            }
        });
    }

    createNameLabel(playerMesh, name, isLocal = false) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        ctx.fillStyle = isLocal ? 'rgba(0, 255, 100, 0.8)' : 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(name.substring(0, 12), 128, 42);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(2, 0.5, 1);
        sprite.position.y = 2.8;
        playerMesh.add(sprite);
    }

    getPlayerColor(id) {
        // Generate consistent color from user ID
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return new THREE.Color(`hsl(${hue}, 70%, 50%)`).getHex();
    }

    setupControls() {
        // Simple camera follow - no orbit controls
        this.cameraOffset = new THREE.Vector3(0, 15, 20);
    }

    onGroundClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const ground = this.scene.getObjectByName('ground');
        if (ground) {
            const intersects = raycaster.intersectObject(ground);
            if (intersects.length > 0) {
                const point = intersects[0].point;
                // Clamp to world bounds
                const clampedX = Math.max(-WALKABLE_AREA, Math.min(WALKABLE_AREA, point.x));
                const clampedZ = Math.max(-WALKABLE_AREA, Math.min(WALKABLE_AREA, point.z));
                
                this.targetPosition = new THREE.Vector3(clampedX, 0, clampedZ);
                this.isMoving = true;
                
                // Show click indicator
                this.showClickIndicator(clampedX, clampedZ);
            }
        }
    }

    showClickIndicator(x, z) {
        const geo = new THREE.RingGeometry(0.3, 0.5, 32);
        const mat = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const indicator = new THREE.Mesh(geo, mat);
        indicator.rotation.x = -Math.PI / 2;
        indicator.position.set(x, 0.1, z);
        this.scene.add(indicator);

        // Animate and remove
        let scale = 1;
        const animate = () => {
            scale += 0.05;
            indicator.scale.set(scale, scale, scale);
            indicator.material.opacity -= 0.02;
            if (indicator.material.opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(indicator);
                indicator.geometry.dispose();
                indicator.material.dispose();
            }
        };
        animate();
    }

    setupMultiplayer() {
        const user = this.user;
        if (!user) return;

        // Use server-specific paths for isolation
        this.playersRef = ref(db, `servers/${this.serverName}/players`);
        const myRef = ref(db, `servers/${this.serverName}/players/${user.uid}`);

        // Set my initial position
        set(myRef, {
            id: user.uid,
            name: user.displayName || 'Player',
            color: this.getPlayerColor(user.uid),
            x: this.localPlayer.position.x,
            z: this.localPlayer.position.z,
            lastUpdate: serverTimestamp()
        });

        // Remove on disconnect
        onDisconnect(myRef).remove();

        // Listen for other players
        onValue(this.playersRef, (snapshot) => {
            const data = snapshot.val() || {};
            
            // Remove players who left
            this.players.forEach((mesh, id) => {
                if (!data[id] && id !== user.uid) {
                    this.scene.remove(mesh);
                    this.players.delete(id);
                }
            });

            // Add/update other players
            Object.entries(data).forEach(([id, playerData]) => {
                if (id === user.uid) return; // Skip self

                if (this.players.has(id)) {
                    // Update existing player position smoothly
                    const mesh = this.players.get(id);
                    mesh.userData.targetX = playerData.x;
                    mesh.userData.targetZ = playerData.z;
                } else {
                    // Create new player
                    const mesh = this.createPlayerMesh(playerData);
                    mesh.userData = { ...playerData, targetX: playerData.x, targetZ: playerData.z };
                    this.createNameLabel(mesh, playerData.name);
                    this.scene.add(mesh);
                    this.players.set(id, mesh);
                }
            });
            
            // Update UI - player count
            const countEl = document.getElementById('online-count');
            if (countEl) countEl.textContent = Object.keys(data).length;
            
            // Update UI - player list
            const listEl = document.getElementById('player-list-items');
            if (listEl) {
                listEl.innerHTML = Object.values(data).map(p => `
                    <div class="player-item">
                        <div class="player-dot" style="background: hsl(${this.getPlayerColor(p.id) % 360}, 70%, 50%);"></div>
                        ${p.name || 'Player'}${p.id === user.uid ? ' (You)' : ''}
                    </div>
                `).join('');
            }
        });

        this.unsubscribers.push(() => {
            set(myRef, null);
        });
    }

    setupChat() {
        const chatInput = document.getElementById('world-chat-input');
        const sendBtn = document.getElementById('world-chat-send');
        const chatMessages = document.getElementById('world-chat-messages');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendChatMessage());
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChatMessage();
            });
        }

        // Listen for chat messages (server-specific)
        const chatRef = ref(db, `servers/${this.serverName}/chat`);
        onValue(chatRef, (snapshot) => {
            const messages = snapshot.val() || {};
            const sorted = Object.values(messages)
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(-50); // Last 50 messages
            
            if (chatMessages) {
                chatMessages.innerHTML = sorted.map(msg => `
                    <div class="chat-message">
                        <span class="chat-name" style="color: ${msg.color || '#fff'}">${msg.name}:</span>
                        <span class="chat-text">${this.escapeHtml(msg.text)}</span>
                    </div>
                `).join('');
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        });
    }

    sendChatMessage() {
        const input = document.getElementById('world-chat-input');
        if (!input || !input.value.trim()) return;

        const user = this.user;
        if (!user) return;

        const chatRef = ref(db, `servers/${this.serverName}/chat/${Date.now()}_${user.uid}`);
        set(chatRef, {
            uid: user.uid,
            name: user.displayName || 'Player',
            text: input.value.trim().substring(0, 200),
            color: `hsl(${this.getPlayerColor(user.uid) % 360}, 70%, 60%)`,
            timestamp: Date.now()
        });

        input.value = '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sendChatFromInput() {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim() || !this.user) return;
        
        const chatRef = ref(db, `world/chat/${Date.now()}_${this.user.uid}`);
        set(chatRef, {
            uid: this.user.uid,
            name: this.user.displayName || 'Player',
            text: input.value.trim().substring(0, 200),
            color: `hsl(${this.getPlayerColor(this.user.uid) % 360}, 70%, 60%)`,
            timestamp: Date.now()
        });
        
        // Also show locally via window function
        if (window.addChatMessage) {
            window.addChatMessage(this.user.displayName || 'You', input.value.trim(), '#3b82f6');
        }
        
        input.value = '';
    }

    updateLocalPlayer(delta) {
        if (!this.localPlayer || this.chatOpen) return;
        
        const moveSpeed = this.keys.shift && this.stamina > 0 ? 0.018 : 0.01;
        const friction = 0.88;
        const maxSpeed = this.keys.shift && this.stamina > 0 ? 0.35 : 0.15;
        const gravity = 0.02;
        const jumpForce = 0.35;

        // Stamina drain/regen
        if (this.keys.shift && (this.keys.w || this.keys.a || this.keys.s || this.keys.d)) {
            this.stamina = Math.max(0, this.stamina - 0.5);
        } else {
            this.stamina = Math.min(100, this.stamina + 0.25);
        }

        // Gravity
        if (!this.isGrounded) {
            this.velocity.y -= gravity;
        }

        // Jump
        if (this.keys.space && this.isGrounded) {
            this.velocity.y = jumpForce;
            this.isGrounded = false;
        }

        // Apply vertical velocity
        this.localPlayer.position.y += this.velocity.y;

        // Ground check
        if (this.localPlayer.position.y <= 0) {
            this.localPlayer.position.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
        }

        // Get camera direction for movement
        const camDir = new THREE.Vector3();
        camDir.x = Math.sin(this.cameraAngle);
        camDir.z = Math.cos(this.cameraAngle);
        
        const sideDir = new THREE.Vector3(-camDir.z, 0, camDir.x);

        // WASD movement
        if (this.keys.w) {
            this.velocity.x += camDir.x * moveSpeed;
            this.velocity.z += camDir.z * moveSpeed;
        }
        if (this.keys.s) {
            this.velocity.x -= camDir.x * moveSpeed;
            this.velocity.z -= camDir.z * moveSpeed;
        }
        if (this.keys.a) {
            this.velocity.x -= sideDir.x * moveSpeed;
            this.velocity.z -= sideDir.z * moveSpeed;
        }
        if (this.keys.d) {
            this.velocity.x += sideDir.x * moveSpeed;
            this.velocity.z += sideDir.z * moveSpeed;
        }

        // Speed cap
        const currentSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        if (currentSpeed > maxSpeed) {
            const ratio = maxSpeed / currentSpeed;
            this.velocity.x *= ratio;
            this.velocity.z *= ratio;
        }

        // Friction
        this.velocity.x *= friction;
        this.velocity.z *= friction;

        // Apply movement with collision check
        const newX = this.localPlayer.position.x + this.velocity.x;
        const newZ = this.localPlayer.position.z + this.velocity.z;
        
        if (!this.checkCollision(newX, newZ, 0.5)) {
            this.localPlayer.position.x = newX;
            this.localPlayer.position.z = newZ;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }

        // Clamp to world bounds
        this.localPlayer.position.x = Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, this.localPlayer.position.x));
        this.localPlayer.position.z = Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, this.localPlayer.position.z));

        // Rotation & Animation
        const isMoving = currentSpeed > 0.01;
        
        if (isMoving) {
            const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
            let rotDiff = targetRotation - this.playerRotation;
            if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            this.playerRotation += rotDiff * 0.15;
            this.localPlayer.rotation.y = this.playerRotation;
            
            // Walk animation
            if (this.isGrounded) {
                this.walkCycle += currentSpeed * 5;
                this.animateWalk(this.localPlayer, this.walkCycle);
            }
        } else {
            // Idle animation
            this.animateIdle(this.localPlayer);
        }

        // Sync position to server
        this.syncPosition();
    }

    checkCollision(x, z, radius) {
        for (const c of this.colliders) {
            if (x > c.x - c.w - radius && x < c.x + c.w + radius &&
                z > c.z - c.d - radius && z < c.z + c.d + radius) {
                return true;
            }
        }
        return false;
    }

    animateWalk(player, cycle) {
        const swing = Math.sin(cycle) * 0.6;
        const swingAlt = Math.sin(cycle + Math.PI) * 0.6;
        
        player.children.forEach(child => {
            switch(child.name) {
                case 'leftUpperArm':
                    // Left arm swings opposite to left leg
                    child.rotation.x = swingAlt * 0.8;
                    break;
                case 'rightUpperArm':
                    // Right arm swings opposite to right leg
                    child.rotation.x = swing * 0.8;
                    break;
                case 'leftUpperLeg':
                    child.rotation.x = swing * 0.5;
                    break;
                case 'rightUpperLeg':
                    child.rotation.x = swingAlt * 0.5;
                    break;
            }
        });
    }

    animateIdle(player) {
        player.children.forEach(child => {
            if (['leftUpperArm', 'rightUpperArm', 'leftUpperLeg', 'rightUpperLeg'].includes(child.name)) {
                child.rotation.x *= 0.9; // Smooth return to idle
            }
        });
    }

    syncPosition() {
        const user = this.user;
        if (!user || !this.localPlayer) return;

        const myRef = ref(db, `world/players/${user.uid}`);
        update(myRef, {
            x: this.localPlayer.position.x,
            z: this.localPlayer.position.z,
            lastUpdate: serverTimestamp()
        });
    }

    updateOtherPlayers(delta) {
        this.players.forEach((mesh, id) => {
            if (mesh.userData.targetX !== undefined) {
                const dx = mesh.userData.targetX - mesh.position.x;
                const dz = mesh.userData.targetZ - mesh.position.z;
                const isMoving = Math.abs(dx) > 0.05 || Math.abs(dz) > 0.05;
                
                // Smooth interpolation
                mesh.position.x += dx * 5 * delta;
                mesh.position.z += dz * 5 * delta;

                // Face movement direction smoothly
                if (isMoving) {
                    const targetRotation = Math.atan2(dx, dz);
                    const currentRotation = mesh.rotation.y;
                    let rotationDiff = targetRotation - currentRotation;
                    if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
                    if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
                    mesh.rotation.y += rotationDiff * 8 * delta;
                }
                
                // Animate limbs for other players
                this.animatePlayerLimbs(mesh, isMoving, delta);
            }
        });
    }

    updateCamera() {
        if (!this.localPlayer) return;

        // Third-person camera following player with mouse orbit
        const px = this.localPlayer.position.x;
        const py = this.localPlayer.position.y;
        const pz = this.localPlayer.position.z;

        const targetX = px - Math.sin(this.cameraAngle) * this.cameraDist;
        const targetZ = pz - Math.cos(this.cameraAngle) * this.cameraDist;
        const targetY = py + this.cameraHeight;

        // Smooth camera follow
        this.camera.position.x += (targetX - this.camera.position.x) * 0.08;
        this.camera.position.y += (targetY - this.camera.position.y) * 0.08;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.08;

        // Look at player
        this.camera.lookAt(px, py + 1.5, pz);
    }

    animate(currentTime = 0) {
        requestAnimationFrame((t) => this.animate(t));

        // Frame rate limiting
        const elapsed = currentTime - this.lastFrameTime;
        if (elapsed < this.frameInterval) return;
        this.lastFrameTime = currentTime - (elapsed % this.frameInterval);

        const delta = Math.min(this.clock.getDelta(), 0.1);

        // Core updates every frame
        this.updateLocalPlayer(delta);
        this.updateCamera();
        
        // Less frequent updates to save CPU
        this.updateCounter++;
        
        // Other players every 3 frames
        if (this.updateCounter % 3 === 0) {
            this.updateOtherPlayers(delta);
        }
        
        // Time/HUD every 30 frames (~1 second at 30fps)
        if (this.updateCounter % 30 === 0) {
            this.updateTimeOfDay();
            this.updateHUD();
        }
        
        // Minimap every 15 frames
        if (this.updateCounter % 15 === 0) {
            this.drawMinimap();
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateHUD() {
        if (window.updateHUD) {
            window.updateHUD(this.health, this.stamina, this.cash, this.diamonds);
        }
    }

    drawMinimap() {
        if (!this.minimapCtx || !this.localPlayer) return;

        const ctx = this.minimapCtx;
        const size = 280;
        const range = 100;

        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.translate(size / 2, size / 2);

        // Rotate with player
        ctx.rotate(this.playerRotation);

        const px = this.localPlayer.position.x;
        const pz = this.localPlayer.position.z;
        const scale = size / (range * 2);

        ctx.scale(scale, scale);
        ctx.translate(-px, -pz);

        // Draw roads
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 14;
        ctx.beginPath();
        for (let x = -CITY_SIZE / 2; x < CITY_SIZE / 2; x += 50) {
            ctx.moveTo(x, -CITY_SIZE);
            ctx.lineTo(x, CITY_SIZE);
            ctx.moveTo(-CITY_SIZE, x);
            ctx.lineTo(CITY_SIZE, x);
        }
        ctx.stroke();

        // Draw buildings
        ctx.fillStyle = '#666';
        for (const c of this.colliders) {
            if (Math.abs(c.x - px) < range && Math.abs(c.z - pz) < range) {
                ctx.fillRect(c.x - c.w, c.z - c.d, c.w * 2, c.d * 2);
            }
        }

        // Draw other players
        ctx.fillStyle = '#ff6666';
        this.players.forEach(mesh => {
            const dist = Math.sqrt((mesh.position.x - px) ** 2 + (mesh.position.z - pz) ** 2);
            if (dist < range) {
                ctx.beginPath();
                ctx.arc(mesh.position.x, mesh.position.z, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.restore();
    }

    cleanup() {
        console.log('🌍 Cleaning up World Scene...');
        
        // Remove from Firebase
        const user = this.user;
        if (user) {
            const myRef = ref(db, `world/players/${user.uid}`);
            set(myRef, null);
        }

        // Cleanup listeners
        this.unsubscribers.forEach(unsub => unsub());

        // Dispose Three.js
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Wait for lobby selection before starting
let worldScene = null;

window.startWorld = function() {
    // Get settings from lobby
    const settings = window.gameSettings || { server: 'roleplay', fps: 20 };
    
    // Create world scene with selected settings
    worldScene = new WorldScene(settings.server, settings.fps);
    window.worldScene = worldScene;
    
    // Initialize
    worldScene.init();
};

// If world was already started (page refresh), auto-start with defaults
if (window.worldStarted) {
    window.startWorld();
}

export { worldScene };
