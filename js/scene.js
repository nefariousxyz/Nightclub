// Three.js Scene Setup and Game Loop - Enhanced Graphics
import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { game } from './game.js';
import { ui } from './ui.js';
import { Human } from './entities.js';
import { createFurniture } from './furniture.js';
import { CONFIG } from './config.js';
import { ParticleSystem } from './particles.js';
import { staffManager, showStaffPopup } from './staff.js';
import { djSystem } from './djSystem.js';

// Scene globals
let currentMusicColor = 0x8b5cf6; // Default purple
let scene, camera, renderer, controls;
let composer, bloomPass;
let clock;
let highlightBox;
let particleSystem;
const visitors = [];
const queue = [];
const floaters = [];

// Performance settings
const perfSettings = {
    quality: localStorage.getItem('graphics_quality') || 'high', // low, medium, high
    targetFPS: 30,
    frameInterval: 1000 / 30,
    lastFrameTime: 0,
    enableBloom: true,
    enableShadows: true,
    enableAnimations: true,
    enableRain: true,
    pixelRatio: 1
};

// Apply quality preset
function applyQualitySettings(quality) {
    perfSettings.quality = quality;
    localStorage.setItem('graphics_quality', quality);
    
    switch(quality) {
        case 'low':
            perfSettings.targetFPS = 24;
            perfSettings.enableBloom = false;
            perfSettings.enableShadows = false;
            perfSettings.enableAnimations = false;
            perfSettings.enableRain = false;
            perfSettings.pixelRatio = 0.75;
            break;
        case 'medium':
            perfSettings.targetFPS = 30;
            perfSettings.enableBloom = false;
            perfSettings.enableShadows = true;
            perfSettings.enableAnimations = true;
            perfSettings.enableRain = false;
            perfSettings.pixelRatio = 1;
            break;
        case 'high':
            perfSettings.targetFPS = 60;
            perfSettings.enableBloom = true;
            perfSettings.enableShadows = true;
            perfSettings.enableAnimations = true;
            perfSettings.enableRain = true;
            perfSettings.pixelRatio = Math.min(window.devicePixelRatio, 1.5);
            break;
    }
    
    perfSettings.frameInterval = 1000 / perfSettings.targetFPS;
    
    // Apply to renderer if exists
    if (renderer) {
        renderer.setPixelRatio(perfSettings.pixelRatio);
        renderer.shadowMap.enabled = perfSettings.enableShadows;
    }
    
    // Toggle bloom
    if (bloomPass) {
        bloomPass.enabled = perfSettings.enableBloom;
    }
    
    // Toggle rain
    if (typeof rainParticles !== 'undefined' && rainParticles) {
        rainParticles.visible = perfSettings.enableRain;
    }
    
    console.log(`Graphics quality set to: ${quality}`);
}

// Expose quality settings globally
window.setGraphicsQuality = applyQualitySettings;
window.getGraphicsQuality = () => perfSettings.quality;

// Tile placement state (advanced mode)
let tilePlacementMode = {
    active: false,
    tileType: null,
    tileCost: 0,
    startPos: null,
    currentPos: null,
    previewTiles: [],
    costDisplay: null
};

// Global rebuild function for club upgrades
window.rebuildClub = function() {
    // Show message and reload to apply the new club size
    ui.notify('🏗️ Club expanded! Reloading to apply changes...', 'success');
    
    // Wait longer for save to complete (especially cloud save)
    setTimeout(() => {
        location.reload();
    }, 2500);
};

// Pulse dance floor based on music beat
window.pulseDanceFloor = function(colorHex) {
    const color = parseInt(colorHex.replace('#', ''), 16);
    currentMusicColor = color;
    
    // Flash the dance floor
    const floors = game.getFurniture('dancefloor');
    floors.forEach(floor => {
        if (floor.leds) {
            floor.leds.forEach(mat => {
                mat.emissive.setHex(color);
                mat.emissiveIntensity = 3;
            });
        }
    });
    
    // Reset after flash
    setTimeout(() => {
        floors.forEach(floor => {
            if (floor.leds) {
                floor.leds.forEach(mat => {
                    mat.emissiveIntensity = 1;
                });
            }
        });
    }, 100);
};

// Handle music genre change
window.triggerMusicChange = function(genreInfo) {
    if (!genreInfo) return;
    currentMusicColor = parseInt(genreInfo.color.replace('#', ''), 16);
};

// Animated lights (now furniture-based - no free lights)

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// Rain system
let rainParticles = null;
let rainGeometry = null;

function setupSkybox() {
    // Procedural night sky with stars - OPTIMIZED: reduced count
    const starCount = 150;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        // Position stars in a dome
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.4; // Upper hemisphere
        const radius = 200 + Math.random() * 100;

        starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = radius * Math.cos(phi) + 50;
        starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

        // Varying star colors (white to slight blue/yellow)
        const brightness = 0.5 + Math.random() * 0.5;
        starColors[i * 3] = brightness;
        starColors[i * 3 + 1] = brightness;
        starColors[i * 3 + 2] = brightness + Math.random() * 0.2;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Moon (OPTIMIZED: no point light, reduced segments)
    const moonGeometry = new THREE.CircleGeometry(8, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffee,
        transparent: true,
        opacity: 0.9
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(-100, 120, -150);
    moon.lookAt(0, 0, 0);
    scene.add(moon);
}

export function initScene() {
    console.log('Starting initScene...');
    try {
        if (typeof THREE === 'undefined') throw new Error('THREE is not defined');
        console.log('THREE is ready');

        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2a); // Night sky
        scene.fog = new THREE.FogExp2(0x1a1a2a, 0.008); // Foggy atmosphere
        console.log('Scene created');

        // Camera (isometric view)
        const aspect = window.innerWidth / window.innerHeight;
        const d = CONFIG.CAMERA_DISTANCE;
        camera = new THREE.OrthographicCamera(
            -d * aspect, d * aspect, d, -d, 1, 1000
        );
        camera.position.set(50, 50, 50);
        camera.lookAt(0, 0, 0);
        console.log('Camera created');

        // Renderer with optimized settings for cartoon style
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance",
            alpha: false,
            stencil: false,
            depth: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Apply saved quality settings
        applyQualitySettings(perfSettings.quality);
        
        renderer.setPixelRatio(perfSettings.pixelRatio);
        renderer.shadowMap.enabled = perfSettings.enableShadows;
        renderer.shadowMap.type = THREE.BasicShadowMap; // Faster than PCFSoft
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        
        const container = document.getElementById('canvas-container');
        if (container) {
            container.innerHTML = ''; // Clear previous canvas if any
            container.appendChild(renderer.domElement);
        } else {
            console.error('Canvas container not found!');
            return;
        }
        console.log('Renderer created');

        // Post-processing - Bloom effect
        try {
            composer = new EffectComposer(renderer);
            const renderPass = new RenderPass(scene, camera);
            composer.addPass(renderPass);

            bloomPass = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.5,   // strength
                0.3,   // radius
                0.9    // threshold
            );
            composer.addPass(bloomPass);
            console.log('Post-processing setup');
        } catch (e) {
            console.warn('Post-processing failed (skipping):', e);
        }

        // Controls
        controls = new MapControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minZoom = 0.9; // Limit zoom out
        controls.maxZoom = 2.0; // Limit zoom in
        controls.enableRotate = false; // No rotation - keeps isometric angle
        controls.enablePan = true; // Allow moving around
        controls.screenSpacePanning = false; // Pan parallel to ground
        controls.target.set(0, 0, 0); // Start at center

        // Set game references
        game.scene = scene;
        game.controls = controls;

        // Create highlight box
        highlightBox = new THREE.BoxHelper(new THREE.Mesh(), 0x00ff00);
        scene.add(highlightBox);
        highlightBox.visible = false;
        game.highlightBox = highlightBox;
        
        // Create furniture action buttons (delete, rotate)
        createFurnitureActionButtons();

        // Clock
        clock = new THREE.Clock();

        // Particle system
        particleSystem = new ParticleSystem(scene);
        particleSystem.createSmoke({ x: 0, y: 0.5, z: 0 });
        // particleSystem.createSparkles({ x: 0, y: 12, z: -10 }); // Disabled
        console.log('Systems initialized');

        // Setup world
        console.log('Setting up world...');
        setupSkybox(); console.log('- Skybox done');
        createWorld(); console.log('- World done');
        createCityBuildings(); console.log('- City done');
        createClubExterior(); console.log('- Exterior done');
        // createRain(); // Disabled for performance
        createLights(); console.log('- Lights done');
        createAnimatedLights(); console.log('- Animated lights done');
        createInitialFurniture(); console.log('- Furniture done');
        createInitialVisitors(); console.log('- Visitors done');

        // Setup staff visibility
        staffManager.setScene(scene);
        
        // Ensure at least 1 DJ, 1 bartender, 1 bouncer exist by default
        if (staffManager.staff.djs === 0) staffManager.staff.djs = 1;
        if (staffManager.staff.bartenders === 0) staffManager.staff.bartenders = 1;
        if (staffManager.staff.bouncers === 0) staffManager.staff.bouncers = 1;
        
        // Sync to game state
        game.staff = { ...staffManager.staff };
        
        staffManager.recreateStaffEntities();
        console.log('Staff entities created:', staffManager.staffEntities.length);
        
        // Global staff interaction functions
        window.tipStaff = (name) => {
            if (staffManager.tipStaff(name, 10, game)) {
                game.updateUI();
                // Refresh popup
                const staff = staffManager.getStaffByName(name);
                if (staff) showStaffPopup(staff, game);
            } else {
                ui.notify("Not enough cash!", "error");
            }
        };
        window.praiseStaff = (name) => {
            staffManager.praiseStaff(name);
            // Refresh popup
            const staff = staffManager.getStaffByName(name);
            if (staff) showStaffPopup(staff, game);
        };

        // Setup callbacks
        window.createFurnitureCallback = (type, x, z) => createFurniture(scene, type, x, z);
        game.createFloatingText = createFloatingText;
        window.triggerConfetti = () => particleSystem.triggerConfetti();
        
        // Setup move offsets for newly purchased furniture
        window.setupMoveOffsets = (items) => {
            if (!items || items.length === 0) return;
            const basePos = items[0].position.clone();
            moveOffsets = items.map(obj => ({
                obj: obj,
                offsetX: obj.position.x - basePos.x,
                offsetZ: obj.position.z - basePos.z
            }));
            // Ensure highlight box is visible and tracking
            highlightBox.setFromObject(items[0]);
            highlightBox.material.color.setHex(0x00ff00);
            highlightBox.visible = true;
        };
        
        // Celebrity spawning function
        window.spawnCelebrity = (celebrityType) => {
            const celebrity = new Human(scene, true, celebrityType);
            // Place at entrance
            celebrity.setPosition(0, 28);
            celebrity.pickActivity();
            visitors.push(celebrity);
            game.visitors = visitors;
            // Trigger confetti for celebrity arrival
            if (particleSystem) particleSystem.triggerConfetti();
            // Return the celebrity's name for the notification
            return celebrity.name;
        };

        // Event listeners
        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('resize', onResize);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('contextmenu', onRightClick);

        // Initialize UI
        ui.init();
        game.updateUI();

        // Start animation loop
        animate();
        console.log('Scene initialized successfully');
    } catch (err) {
        console.error('CRITICAL: Scene init failed:', err);
        console.error(err.stack);
        alert('Failed to load 3D scene: ' + err.message);
    }
}

// Get club size based on tier
function getClubSize() {
    const tier = game.getClubTierInfo ? game.getClubTierInfo() : null;
    const size = tier?.size || 15;
    
    console.log('=== CLUB SIZE DEBUG ===');
    console.log('game.clubTier:', game.clubTier);
    console.log('tier info:', tier);
    console.log('final size:', size);
    
    return {
        width: size * 2,
        depth: size * 1.6,
        halfW: size,
        halfD: size * 0.8
    };
}

function createWorld() {
    const clubSize = getClubSize();
    
    // === GROUND (flat at y=0 for consistent elevation) ===
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a2a2a,
        roughness: 0.9
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);
    
    // === CLUB FLOOR (slightly raised platform, thin) ===
    const platformMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.8
    });
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(clubSize.width + 20, 0.2, clubSize.depth + 20),
        platformMat
    );
    platform.position.set(0, 0.1, 0);
    platform.receiveShadow = true;
    platform.name = 'club-platform';
    platform.userData.clubElement = true;
    scene.add(platform);
    
    // === CLUB WALLS (brownish brick style) ===
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x4a3528, // Brownish brick color
        roughness: 0.85
    });
    
    const wallHeight = 10;
    
    // Back wall
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(clubSize.width + 12, wallHeight, 0.6),
        wallMat
    );
    backWall.position.set(0, wallHeight / 2, -clubSize.halfD - 5);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    backWall.name = 'club-back-wall';
    backWall.userData.clubElement = true;
    scene.add(backWall);
    
    // Left wall
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, wallHeight, clubSize.depth + 12),
        wallMat
    );
    leftWall.position.set(-clubSize.halfW - 5, wallHeight / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    leftWall.name = 'club-left-wall';
    leftWall.userData.clubElement = true;
    scene.add(leftWall);
    
    
    // === SIDEWALK around club (concrete gray) ===
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.8 });
    
    // Front sidewalk
    const frontSidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(clubSize.width + 40, 0.15, 8),
        sidewalkMat
    );
    frontSidewalk.position.set(0, 0.08, clubSize.halfD + 10);
    frontSidewalk.receiveShadow = true;
    frontSidewalk.name = 'club-front-sidewalk';
    frontSidewalk.userData.clubElement = true;
    scene.add(frontSidewalk);
    
    // Left sidewalk
    const leftSidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.15, clubSize.depth + 20),
        sidewalkMat
    );
    leftSidewalk.position.set(-clubSize.halfW - 10, 0.08, 0);
    leftSidewalk.receiveShadow = true;
    leftSidewalk.name = 'club-left-sidewalk';
    leftSidewalk.userData.clubElement = true;
    scene.add(leftSidewalk);
    
    // Right sidewalk  
    const rightSidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.15, clubSize.depth + 20),
        sidewalkMat
    );
    rightSidewalk.position.set(clubSize.halfW + 10, 0.08, 0);
    rightSidewalk.receiveShadow = true;
    rightSidewalk.name = 'club-right-sidewalk';
    rightSidewalk.userData.clubElement = true;
    scene.add(rightSidewalk);
    
    // === METAL FRAME (thin dark beams on top) ===
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    
    // Corner posts
    const postPositions = [
        [-clubSize.halfW - 5, -clubSize.halfD - 5],
        [clubSize.halfW + 5, -clubSize.halfD - 5],
        [-clubSize.halfW - 5, clubSize.halfD + 5],
        [clubSize.halfW + 5, clubSize.halfD + 5]
    ];
    
    postPositions.forEach(([x, z], i) => {
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, wallHeight + 1, 0.4),
            frameMat
        );
        post.position.set(x, wallHeight / 2 + 0.5, z);
        post.castShadow = true;
        post.name = `club-post-${i}`;
        post.userData.clubElement = true;
        scene.add(post);
    });
    
    // Top frame beams
    const topY = wallHeight + 1;
    const beamW = clubSize.width + 10.4;
    const beamD = clubSize.depth + 10.4;
    
    const topBeam1 = new THREE.Mesh(new THREE.BoxGeometry(beamW, 0.3, 0.3), frameMat);
    topBeam1.position.set(0, topY, -clubSize.halfD - 5);
    topBeam1.name = 'club-beam-1';
    topBeam1.userData.clubElement = true;
    scene.add(topBeam1);
    
    const topBeam2 = new THREE.Mesh(new THREE.BoxGeometry(beamW, 0.3, 0.3), frameMat);
    topBeam2.position.set(0, topY, clubSize.halfD + 5);
    topBeam2.name = 'club-beam-2';
    topBeam2.userData.clubElement = true;
    scene.add(topBeam2);
    
    const topBeam3 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, beamD), frameMat);
    topBeam3.position.set(-clubSize.halfW - 5, topY, 0);
    topBeam3.name = 'club-beam-3';
    topBeam3.userData.clubElement = true;
    scene.add(topBeam3);
    
    const topBeam4 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, beamD), frameMat);
    topBeam4.position.set(clubSize.halfW + 5, topY, 0);
    topBeam4.name = 'club-beam-4';
    topBeam4.userData.clubElement = true;
    scene.add(topBeam4);
    
    // === CLUB FLOOR (for furniture placement, at ground level) ===
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.6
    });
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(clubSize.width + 8, clubSize.depth + 8),
        floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.02, 0);
    floor.receiveShadow = true;
    floor.name = 'club-floor';
    floor.userData.clubElement = true;
    scene.add(floor);
}

// Global function to rebuild club structure (walls, floor, etc.) for visit mode
window.rebuildClubStructure = function() {
    console.log('Rebuilding club structure for tier:', game.clubTier);
    
    // Remove existing club elements
    const toRemove = [];
    scene.traverse((obj) => {
        if (obj.userData && obj.userData.clubElement) {
            toRemove.push(obj);
        }
    });
    
    toRemove.forEach(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
        scene.remove(obj);
    });
    
    console.log('Removed', toRemove.length, 'club elements');
    
    // Recreate club structure with new size
    const clubSize = getClubSize();
    console.log('New club size:', clubSize);
    
    // === CLUB FLOOR (slightly raised platform, thin) ===
    const platformMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.8
    });
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(clubSize.width + 20, 0.2, clubSize.depth + 20),
        platformMat
    );
    platform.position.set(0, 0.1, 0);
    platform.receiveShadow = true;
    platform.name = 'club-platform';
    platform.userData.clubElement = true;
    scene.add(platform);
    
    // === CLUB WALLS ===
    const wallMat = new THREE.MeshStandardMaterial({
        color: 0x4a3528,
        roughness: 0.85
    });
    const wallHeight = 10;
    
    // Back wall
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(clubSize.width + 12, wallHeight, 0.6),
        wallMat
    );
    backWall.position.set(0, wallHeight / 2, -clubSize.halfD - 5);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    backWall.name = 'club-back-wall';
    backWall.userData.clubElement = true;
    scene.add(backWall);
    
    // Left wall
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, wallHeight, clubSize.depth + 12),
        wallMat
    );
    leftWall.position.set(-clubSize.halfW - 5, wallHeight / 2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    leftWall.name = 'club-left-wall';
    leftWall.userData.clubElement = true;
    scene.add(leftWall);
    
    // === SIDEWALKS ===
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.8 });
    
    const frontSidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(clubSize.width + 40, 0.15, 8),
        sidewalkMat
    );
    frontSidewalk.position.set(0, 0.08, clubSize.halfD + 10);
    frontSidewalk.receiveShadow = true;
    frontSidewalk.name = 'club-front-sidewalk';
    frontSidewalk.userData.clubElement = true;
    scene.add(frontSidewalk);
    
    const leftSidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.15, clubSize.depth + 20),
        sidewalkMat
    );
    leftSidewalk.position.set(-clubSize.halfW - 10, 0.08, 0);
    leftSidewalk.receiveShadow = true;
    leftSidewalk.name = 'club-left-sidewalk';
    leftSidewalk.userData.clubElement = true;
    scene.add(leftSidewalk);
    
    const rightSidewalk = new THREE.Mesh(
        new THREE.BoxGeometry(8, 0.15, clubSize.depth + 20),
        sidewalkMat
    );
    rightSidewalk.position.set(clubSize.halfW + 10, 0.08, 0);
    rightSidewalk.receiveShadow = true;
    rightSidewalk.name = 'club-right-sidewalk';
    rightSidewalk.userData.clubElement = true;
    scene.add(rightSidewalk);
    
    // === METAL FRAME ===
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    const postPositions = [
        [-clubSize.halfW - 5, -clubSize.halfD - 5],
        [clubSize.halfW + 5, -clubSize.halfD - 5],
        [-clubSize.halfW - 5, clubSize.halfD + 5],
        [clubSize.halfW + 5, clubSize.halfD + 5]
    ];
    
    postPositions.forEach(([x, z], i) => {
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, wallHeight + 1, 0.4),
            frameMat
        );
        post.position.set(x, wallHeight / 2 + 0.5, z);
        post.castShadow = true;
        post.name = `club-post-${i}`;
        post.userData.clubElement = true;
        scene.add(post);
    });
    
    const topY = wallHeight + 1;
    const beamW = clubSize.width + 10.4;
    const beamD = clubSize.depth + 10.4;
    
    [[0, -clubSize.halfD - 5, beamW, 'club-beam-1'],
     [0, clubSize.halfD + 5, beamW, 'club-beam-2']].forEach(([x, z, w, name]) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, 0.3), frameMat);
        beam.position.set(x, topY, z);
        beam.name = name;
        beam.userData.clubElement = true;
        scene.add(beam);
    });
    
    [[-clubSize.halfW - 5, 0, beamD, 'club-beam-3'],
     [clubSize.halfW + 5, 0, beamD, 'club-beam-4']].forEach(([x, z, d, name]) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, d), frameMat);
        beam.position.set(x, topY, z);
        beam.name = name;
        beam.userData.clubElement = true;
        scene.add(beam);
    });
    
    // === CLUB FLOOR ===
    const floorMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        roughness: 0.6
    });
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(clubSize.width + 8, clubSize.depth + 8),
        floorMat
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.02, 0);
    floor.receiveShadow = true;
    floor.name = 'club-floor';
    floor.userData.clubElement = true;
    scene.add(floor);
    
    console.log('Club structure rebuilt for tier', game.clubTier);
};

function createSkybox() {
    // Procedural night sky with stars - OPTIMIZED: reduced count
    const starCount = 150;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        // Position stars in a dome
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.4; // Upper hemisphere
        const radius = 200 + Math.random() * 100;

        starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = radius * Math.cos(phi) + 50;
        starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

        // Varying star colors (white to slight blue/yellow)
        const brightness = 0.5 + Math.random() * 0.5;
        starColors[i * 3] = brightness;
        starColors[i * 3 + 1] = brightness;
        starColors[i * 3 + 2] = brightness + Math.random() * 0.2;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Moon (OPTIMIZED: no point light, reduced segments)
    const moonGeometry = new THREE.CircleGeometry(8, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffee,
        transparent: true,
        opacity: 0.9
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(-100, 120, -150);
    moon.lookAt(0, 0, 0);
    scene.add(moon);
}

// Store city objects for dynamic repositioning
let cityObjects = [];

function createCityBuildings() {
    const clubSize = getClubSize();
    const offset = clubSize.halfW + 25;
    
    // Clear existing city objects
    cityObjects.forEach(obj => scene.remove(obj));
    cityObjects = [];
    
    // === STREET ELEMENTS (roads, traffic lights, cars) ===
    createStreetElements(clubSize);
    
    // === STORE FRONTS (low buildings with storefronts) ===
    const storeMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.8 });
    const awningColors = [0xcc4444, 0x44cc44, 0x4444cc, 0xcccc44, 0xcc44cc, 0x44cccc];
    
    // Helper to create a store
    function createStore(x, z, w, d, color, rotation = 0) {
        const storeGroup = new THREE.Group();
        const storeHeight = 6;
        
        // Main building
        const building = new THREE.Mesh(
            new THREE.BoxGeometry(w, storeHeight, d),
            storeMat
        );
        building.position.y = storeHeight / 2;
        building.castShadow = true;
        building.receiveShadow = true;
        storeGroup.add(building);
        
        // Storefront window (glass)
        const glassMat = new THREE.MeshStandardMaterial({ 
            color: 0x88ccff, 
            transparent: true, 
            opacity: 0.6,
            roughness: 0.1
        });
        const windowMesh = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.7, 3, 0.1),
            glassMat
        );
        windowMesh.position.set(0, 2.5, d / 2 + 0.1);
        storeGroup.add(windowMesh);
        
        // Awning
        const awningMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
        const awning = new THREE.Mesh(
            new THREE.BoxGeometry(w + 1, 0.2, 2),
            awningMat
        );
        awning.position.set(0, 5, d / 2 + 1);
        awning.castShadow = true;
        storeGroup.add(awning);
        
        // Store light
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
        const storeLight = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.3, 0.5),
            lightMat
        );
        storeLight.position.set(0, 5.5, d / 2 + 0.5);
        storeGroup.add(storeLight);
        
        storeGroup.position.set(x, 0, z);
        storeGroup.rotation.y = rotation;
        scene.add(storeGroup);
        cityObjects.push(storeGroup);
        
        return storeGroup;
    }
    
    // Back row stores (behind club)
    for (let i = -2; i <= 2; i++) {
        const color = awningColors[Math.abs(i) % awningColors.length];
        createStore(i * 18, -offset - 18, 15, 10, color, 0);
    }
    
    // Left side stores
    for (let i = -1; i <= 2; i++) {
        const color = awningColors[(i + 3) % awningColors.length];
        createStore(-offset - 18, i * 16, 10, 14, color, Math.PI / 2);
    }
    
    // Front left corner store
    createStore(-offset - 10, offset + 18, 16, 10, awningColors[0], 0);
    
    // Front right side stores (visible from camera)
    for (let i = 0; i <= 1; i++) {
        const color = awningColors[(i + 2) % awningColors.length];
        createStore(offset + 22, -offset / 2 + i * 20, 10, 14, color, -Math.PI / 2);
    }
    
    // === BACKGROUND BUILDINGS (tall, behind stores, fade into fog) ===
    const bgBuildingMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.95 });
    const bgWindowMat = new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.6 });
    
    // Helper to create background building with lit windows
    function createBgBuilding(x, z, w, h, d) {
        const building = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            bgBuildingMat
        );
        building.position.set(x, h / 2, z);
        building.castShadow = true;
        scene.add(building);
        cityObjects.push(building);
        
        // Add scattered lit windows
        const windowRows = Math.floor(h / 4);
        const windowCols = Math.floor(w / 3);
        for (let row = 1; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                if (Math.random() > 0.4) { // 60% chance of lit window
                    const win = new THREE.Mesh(
                        new THREE.PlaneGeometry(1.2, 1.5),
                        bgWindowMat
                    );
                    win.position.set(
                        x - w/2 + 2 + col * 3,
                        row * 4,
                        z + d/2 + 0.1
                    );
                    scene.add(win);
                    cityObjects.push(win);
                }
            }
        }
    }
    
    // Far back row of tall buildings (behind back stores)
    for (let i = -4; i <= 4; i++) {
        const h = 40 + Math.random() * 60;
        createBgBuilding(i * 25, -offset - 50 - Math.random() * 20, 20, h, 15);
    }
    
    // Far left row of tall buildings (behind left stores)
    for (let i = -2; i <= 3; i++) {
        const h = 35 + Math.random() * 50;
        createBgBuilding(-offset - 50 - Math.random() * 15, i * 22, 15, h, 18);
    }
    
    // Distant skyline buildings (very far, very tall)
    for (let i = -6; i <= 6; i++) {
        const h = 60 + Math.random() * 80;
        createBgBuilding(i * 30, -offset - 100 - Math.random() * 30, 25, h, 20);
    }
}

// Store moving cars for animation
let movingCars = [];

function createStreetElements(clubSize) {
    const offset = clubSize.halfW + 15;
    
    // === ROAD SURFACES (visible gray asphalt) ===
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow road lines
    const whiteLine = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White edge lines
    
    // Main roads around club
    const roadWidth = 14;
    
    // Left road
    const leftRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(roadWidth, 200),
        roadMat
    );
    leftRoad.rotation.x = -Math.PI / 2;
    leftRoad.position.set(-offset - roadWidth/2 - 4, 0.01, 0);
    leftRoad.receiveShadow = true;
    scene.add(leftRoad);
    cityObjects.push(leftRoad);
    
    // Left road center line
    for (let z = -80; z < 80; z += 15) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 6), lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(-offset - roadWidth/2 - 4, 0.02, z);
        scene.add(line);
        cityObjects.push(line);
    }
    
    // Right road
    const rightRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(roadWidth, 200),
        roadMat
    );
    rightRoad.rotation.x = -Math.PI / 2;
    rightRoad.position.set(offset + roadWidth/2 + 4, 0.01, 0);
    rightRoad.receiveShadow = true;
    scene.add(rightRoad);
    cityObjects.push(rightRoad);
    
    // Right road center line
    for (let z = -80; z < 80; z += 15) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 6), lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(offset + roadWidth/2 + 4, 0.02, z);
        scene.add(line);
        cityObjects.push(line);
    }
    
    // Front road
    const frontRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(200, roadWidth),
        roadMat
    );
    frontRoad.rotation.x = -Math.PI / 2;
    frontRoad.position.set(0, 0.01, offset + roadWidth/2 + 8);
    frontRoad.receiveShadow = true;
    scene.add(frontRoad);
    cityObjects.push(frontRoad);
    
    // Front road center line
    for (let x = -80; x < 80; x += 15) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.3), lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(x, 0.02, offset + roadWidth/2 + 8);
        scene.add(line);
        cityObjects.push(line);
    }
    
    // === TRAFFIC LIGHTS (Reference style) ===
    createTrafficLight(-offset - 3, 35);
    createTrafficLight(offset + 3, 35);
    createTrafficLight(-offset - 3, -30);
    createTrafficLight(offset + 3, -30);
    
    // === MOVING CARS ===
    const carColors = [0xff3333, 0x3333ff, 0x33cc33, 0xffff33, 0xff33ff, 0x333333, 0xffffff];
    
    // Cars on left road (moving down)
    for (let i = 0; i < 2; i++) {
        const car = createSimpleCar(carColors[Math.floor(Math.random() * carColors.length)]);
        car.position.set(-offset - roadWidth/2 - 6, 0.5, -60 + i * 70);
        car.rotation.y = Math.PI;
        car.userData.speed = 10 + Math.random() * 5;
        car.userData.direction = 1;
        scene.add(car);
        movingCars.push(car);
        cityObjects.push(car);
    }
    
    // Cars on right road (moving up)
    for (let i = 0; i < 2; i++) {
        const car = createSimpleCar(carColors[Math.floor(Math.random() * carColors.length)]);
        car.position.set(offset + roadWidth/2 + 6, 0.5, 60 - i * 70);
        car.rotation.y = 0;
        car.userData.speed = 10 + Math.random() * 5;
        car.userData.direction = -1;
        scene.add(car);
        movingCars.push(car);
        cityObjects.push(car);
    }
    
    // Cars on front road (moving left)
    for (let i = 0; i < 2; i++) {
        const car = createSimpleCar(carColors[Math.floor(Math.random() * carColors.length)]);
        car.position.set(60 - i * 70, 0.5, offset + roadWidth/2 + 8);
        car.rotation.y = Math.PI / 2;
        car.userData.speed = 10 + Math.random() * 5;
        car.userData.direction = -1;
        car.userData.axis = 'x'; // Move along X axis
        scene.add(car);
        movingCars.push(car);
        cityObjects.push(car);
    }
}

function createTrafficLight(x, z) {
    const group = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
    
    // Pole
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 8, 0.3), poleMat);
    pole.position.y = 4;
    pole.castShadow = true;
    group.add(pole);
    
    // Light housing
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.5, 0.8), poleMat);
    housing.position.y = 7.5;
    group.add(housing);
    
    // Lights (red, yellow, green)
    const lightColors = [0xff0000, 0xffff00, 0x00ff00];
    const lightMats = lightColors.map(c => new THREE.MeshBasicMaterial({ color: c }));
    
    for (let i = 0; i < 3; i++) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), lightMats[i]);
        light.position.set(0, 8.2 - i * 0.7, 0.4);
        group.add(light);
    }
    
    group.position.set(x, 0, z);
    scene.add(group);
    cityObjects.push(group);
}

function createSimpleCar(color) {
    const carGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    
    // Simple blocky body
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4), bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    carGroup.add(body);
    
    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2), bodyMat);
    cabin.position.set(0, 1.1, -0.3);
    cabin.castShadow = true;
    carGroup.add(cabin);
    
    // Wheels (simple boxes for blocky style)
    const wheelPositions = [[-0.9, 0.25, 1.2], [0.9, 0.25, 1.2], [-0.9, 0.25, -1.2], [0.9, 0.25, -1.2]];
    wheelPositions.forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.5), darkMat);
        wheel.position.set(wx, wy, wz);
        carGroup.add(wheel);
    });
    
    // Headlights
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), headlightMat);
    hl1.position.set(-0.6, 0.5, 2.05);
    carGroup.add(hl1);
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), headlightMat);
    hl2.position.set(0.6, 0.5, 2.05);
    carGroup.add(hl2);
    
    // Taillights
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), taillightMat);
    tl1.position.set(-0.6, 0.5, -2.05);
    carGroup.add(tl1);
    const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), taillightMat);
    tl2.position.set(0.6, 0.5, -2.05);
    carGroup.add(tl2);
    
    return carGroup;
}

// Refresh city when club expands
function refreshCityBuildings() {
    createCityBuildings();
}

// Expose to window for external access
window.refreshCityBuildings = refreshCityBuildings;

function addGridWindows(building, width, height, depth) {
    // Reference style: Grid of lit windows (yellow or cyan)
    const windowColors = [0xffcc00, 0x00ccff]; // Yellow and cyan like reference
    const windowColor = windowColors[Math.floor(Math.random() * windowColors.length)];
    const windowMat = new THREE.MeshBasicMaterial({ color: windowColor });
    
    const windowW = 1.2;
    const windowH = 1.5;
    const spacingX = 4;
    const spacingY = 5;
    const startY = 6;
    
    // Front face windows
    for (let y = startY; y < height - 4; y += spacingY) {
        for (let x = -width/2 + 3; x < width/2 - 2; x += spacingX) {
            if (Math.random() > 0.3) { // 70% chance of lit window
                const win = new THREE.Mesh(
                    new THREE.PlaneGeometry(windowW, windowH),
                    windowMat
                );
                win.position.set(
                    building.position.x + x,
                    y,
                    building.position.z + depth/2 + 0.1
                );
                scene.add(win);
                cityObjects.push(win);
            }
        }
    }
    
    // Side face windows (left or right depending on building position)
    const sideX = building.position.x > 0 ? -width/2 - 0.1 : width/2 + 0.1;
    for (let y = startY; y < height - 4; y += spacingY) {
        for (let z = -depth/2 + 3; z < depth/2 - 2; z += spacingX) {
            if (Math.random() > 0.4) {
                const win = new THREE.Mesh(
                    new THREE.PlaneGeometry(windowW, windowH),
                    windowMat
                );
                win.rotation.y = Math.PI / 2;
                win.position.set(
                    building.position.x + sideX,
                    y,
                    building.position.z + z
                );
                scene.add(win);
                cityObjects.push(win);
            }
        }
    }
}

function createClubExterior() {
    // Simple entrance area - no neon, matches reference style
    const clubSize = getClubSize();
    const entranceZ = clubSize.halfD + 10;
    
    // Queue line area (people waiting in line)
    createBouncerArea(entranceZ);
}

function createBouncerArea(entranceZ = 38) {
    // Extended queue area with barriers - positions based on entrance
    const baseZ = entranceZ + 3;
    
    const postMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.1
    });
    
    // Queue barrier posts - dynamic positions
    const postPositions = [
        [-10, baseZ], [-10, baseZ + 4], [-10, baseZ + 8],
        [-6, baseZ], [-6, baseZ + 8],
        [6, baseZ], [6, baseZ + 8],
        [10, baseZ], [10, baseZ + 4], [10, baseZ + 8]
    ];
    
    postPositions.forEach(([x, z]) => {
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 3, 16),
            postMat
        );
        post.position.set(x, 1.5, z);
        post.castShadow = true;
        scene.add(post);
        
        // Gold ball on top
        const ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 16, 16),
            postMat
        );
        ball.position.set(x, 3.1, z);
        scene.add(ball);
    });
    
    // Velvet ropes
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
    const ropeConnections = [
        [[-10, baseZ], [-10, baseZ + 4]], [[-10, baseZ + 4], [-10, baseZ + 8]],
        [[-10, baseZ + 8], [-6, baseZ + 8]], [[-6, baseZ + 8], [6, baseZ + 8]],
        [[6, baseZ + 8], [10, baseZ + 8]], [[10, baseZ + 8], [10, baseZ + 4]],
        [[10, baseZ + 4], [10, baseZ]]
    ];
    
    ropeConnections.forEach(([[x1, z1], [x2, z2]]) => {
        const length = Math.sqrt((x2-x1)**2 + (z2-z1)**2);
        const rope = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, length, 8),
            ropeMat
        );
        rope.position.set((x1+x2)/2, 2.5, (z1+z2)/2);
        rope.rotation.z = Math.PI / 2;
        rope.rotation.y = Math.atan2(z2-z1, x2-x1);
        scene.add(rope);
    });
}

function createRain() {
    const rainCount = 800; // Reduced for lighter rain
    rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);
    const velocities = [];
    
    for (let i = 0; i < rainCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 150;
        positions[i * 3 + 1] = Math.random() * 60;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
        
        velocities.push({
            y: -25 - Math.random() * 15,
            drift: (Math.random() - 0.5) * 1
        });
    }
    
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const rainMaterial = new THREE.PointsMaterial({
        color: 0x6688aa,
        size: 0.2,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    });
    
    rainParticles = new THREE.Points(rainGeometry, rainMaterial);
    rainParticles.userData.velocities = velocities;
    scene.add(rainParticles);
}

function createLights() {
    // === MODERN CLUB LIGHTING (brighter, neutral) ===
    
    // Strong ambient light for overall visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // Hemisphere light for natural fill
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Main directional light with shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(-20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 150;
    scene.add(dirLight);
    
    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(30, 30, -20);
    scene.add(fillLight);
}

function createAnimatedLights() {
    const clubSize = getClubSize();
    const trussH = 14;
    
    // === LIGHTING TRUSS SYSTEM (at wall edges, not inside party area) ===
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    
    // Horizontal Beams only (no vertical posts inside club)
    const beamWidth = clubSize.width + 8;
    const beamDepth = clubSize.depth + 8;
    
    // Top frame beams for lights to hang from
    const hBeam1 = new THREE.Mesh(new THREE.BoxGeometry(beamWidth, 0.3, 0.3), trussMat);
    hBeam1.position.set(0, trussH, -clubSize.halfD - 2);
    scene.add(hBeam1);
    
    const hBeam2 = new THREE.Mesh(new THREE.BoxGeometry(beamWidth, 0.3, 0.3), trussMat);
    hBeam2.position.set(0, trussH, clubSize.halfD + 2);
    scene.add(hBeam2);
    
    const vBeam1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, beamDepth), trussMat);
    vBeam1.position.set(-clubSize.halfW - 4, trussH, 0);
    scene.add(vBeam1);
    
    const vBeam2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, beamDepth), trussMat);
    vBeam2.position.set(clubSize.halfW + 4, trussH, 0);
    scene.add(vBeam2);
    
    // Central Cross Beam (for disco ball)
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(beamWidth, 0.3, 0.3), trussMat);
    crossBeam.position.set(0, trussH, 0);
    scene.add(crossBeam);
    
    // === DISCO BALL, MOVING HEADS, LASERS - REMOVED (now purchasable furniture) ===
    // Players can buy these from the Lights shop category
    
}

function createInitialFurniture() {
    // Restore furniture from cloud save (game.savedFurniture is set by loadFromSave)
    console.log('=== FURNITURE RESTORE ===');
    console.log('game.savedFurniture:', game.savedFurniture);
    console.log('game.furniture before restore:', game.furniture?.length || 0);
    
    if (game.savedFurniture && game.savedFurniture.length > 0) {
        console.log('Restoring furniture from cloud:', game.savedFurniture.length, 'items');
        game.savedFurniture.forEach((item, index) => {
            console.log(`Creating furniture ${index}:`, item.type, 'at', item.x, item.z);
            if (item.type) {
                const furniture = createFurniture(scene, item.type, item.x || 0, item.z || 0, item.rotationY || 0);
                if (furniture) {
                    if (item.y) furniture.position.y = item.y;
                    furniture.visible = true; // Ensure visible
                    console.log(`  ✓ Created:`, furniture.uuid);
                } else {
                    console.error(`  ✗ Failed to create:`, item.type);
                }
            }
        });
    } else {
        // No saved furniture - create some defaults for testing
        console.log('No saved furniture - creating defaults for testing');
        createFurniture(scene, 'dancefloor', 0, 0, 0);
        createFurniture(scene, 'bar', 5, -5, 0);
        createFurniture(scene, 'dj', -5, -8, 0);
    }
    
    console.log('game.furniture after restore:', game.furniture?.length || 0);
}

function createInitialVisitors() {
    // Get club size to position queue appropriately
    const tierInfo = game.getClubTierInfo();
    const size = tierInfo?.size || 15;
    const queueZ = size + 8; // Queue just outside the club
    
    // Restore saved visitors first
    if (game.savedVisitors && game.savedVisitors.length > 0) {
        console.log('Restoring', game.savedVisitors.length, 'visitors');
        game.savedVisitors.forEach(saved => {
            const visitor = new Human(scene, saved.isCelebrity || false);
            visitor.setPosition(saved.x || 0, saved.z || 0);
            visitor.mood = saved.mood || 70;
            visitor.timeInClub = saved.timeInClub || 0;
            visitor.frustration = saved.frustration || 0;
            visitors.push(visitor);
            
            // Make them pick an activity so they start moving!
            setTimeout(() => {
                if (!visitor.isLeaving) {
                    visitor.pickActivity();
                }
            }, Math.random() * 2000); // Stagger the activity picks
        });
    }
    
    // Create queue
    for (let i = 0; i < 5; i++) {
        const visitor = new Human(scene, false);
        visitor.setPosition(-10 - (i * 2), queueZ);
        queue.push(visitor);
    }
    game.queue = queue;
    game.visitors = visitors;
}

// Multi-selection support
let selectedFurniture = []; // Array of selected furniture objects

function createFurnitureActionButtons() {
    // Expose functions to window for onclick handlers
    window.furnitureMove = startMovingFurniture;
    window.furnitureRotate = rotateFurniture;
    window.furnitureDelete = deleteFurniture;
    window.furnitureCancel = cancelFurnitureEdit;
}

function updateSelectionCount() {
    const countEl = document.getElementById('selection-count');
    if (countEl) {
        const count = selectedFurniture.length;
        countEl.textContent = count === 1 ? '1 selected' : `${count} selected`;
    }
}

function selectFurniture(obj, addToSelection = false) {
    console.log('selectFurniture called, addToSelection:', addToSelection, 'current count:', selectedFurniture.length);
    
    if (addToSelection) {
        // Shift+Click - toggle selection
        const idx = selectedFurniture.indexOf(obj);
        if (idx > -1) {
            // Already selected - remove it
            selectedFurniture.splice(idx, 1);
            console.log('Removed from selection, new count:', selectedFurniture.length);
        } else {
            // Not selected - add it
            selectedFurniture.push(obj);
            console.log('Added to selection, new count:', selectedFurniture.length);
        }
    } else {
        // Normal click - single selection (replace all)
        selectedFurniture = [obj];
        console.log('Single selection, count:', selectedFurniture.length);
    }
    
    // Update legacy game.selectedObject for compatibility
    game.selectedObject = selectedFurniture.length > 0 ? selectedFurniture[0] : null;
    
    // Update highlight box for first selected
    if (selectedFurniture.length > 0) {
        highlightBox.setFromObject(selectedFurniture[0]);
        highlightBox.material.color.setHex(0x8b5cf6); // Purple = selected
        highlightBox.visible = true;
        
        // Apply selection highlight to all selected furniture
        selectedFurniture.forEach(obj => {
            applySelectionHighlight(obj);
        });
    } else {
        highlightBox.visible = false;
    }
    
    updateSelectionCount();
    showFurnitureActions();
}

// Apply purple selection highlight to furniture
function applySelectionHighlight(obj) {
    if (!obj) return;
    
    obj.traverse((child) => {
        if (child.isMesh && child.material) {
            // Store original emissive if not already stored
            if (!child.userData.originalEmissive) {
                child.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000);
                child.userData.originalEmissiveIntensity = child.material.emissiveIntensity || 0;
            }
            // Apply purple selection glow
            if (child.material.emissive) {
                child.material.emissive.setHex(0x8b5cf6); // Purple
                child.material.emissiveIntensity = 0.3;
            }
        }
    });
}

function clearSelection() {
    // Reset visual effects on all selected furniture
    selectedFurniture.forEach(obj => {
        resetFurnitureEffects(obj);
    });
    if (game.selectedObject) {
        resetFurnitureEffects(game.selectedObject);
    }
    
    selectedFurniture = [];
    moveOffsets = [];
    game.selectedObject = null;
    game.isMovingFurniture = false;
    highlightBox.visible = false;
    hideFurnitureActions();
    
    // Hide edit mode overlay
    if (game.hideEditModeEffect) game.hideEditModeEffect();
}

// Reset furniture visual effects (scale, glow)
function resetFurnitureEffects(obj) {
    if (!obj) return;
    
    // Reset scale
    if (obj.userData.originalScale) {
        obj.scale.copy(obj.userData.originalScale);
        delete obj.userData.originalScale;
    }
    
    // Reset emissive glow on all meshes
    obj.traverse((child) => {
        if (child.isMesh && child.material) {
            if (child.userData.originalEmissive) {
                // Restore original emissive
                if (child.material.emissive) {
                    child.material.emissive.copy(child.userData.originalEmissive);
                    child.material.emissiveIntensity = child.userData.originalEmissiveIntensity || 0;
                }
                delete child.userData.originalEmissive;
                delete child.userData.originalEmissiveIntensity;
            } else {
                // Force reset to no glow if no original was stored
                if (child.material.emissive) {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        }
    });
}

function deleteFurniture() {
    if (selectedFurniture.length === 0) return;
    
    // Delete all selected furniture
    const count = selectedFurniture.length;
    selectedFurniture.forEach(obj => {
        const idx = game.furniture.indexOf(obj);
        if (idx > -1) {
            game.furniture.splice(idx, 1);
        }
        scene.remove(obj);
    });
    
    clearSelection();
    ui.notify(`Deleted ${count} item${count > 1 ? 's' : ''}`, 'info');
    game.autoSave();
}

function rotateFurniture() {
    if (selectedFurniture.length === 0) return;
    
    // Rotate all selected furniture
    selectedFurniture.forEach(obj => {
        obj.rotation.y += Math.PI / 2;
    });
    
    if (selectedFurniture.length > 0) {
        highlightBox.setFromObject(selectedFurniture[0]);
    }
}

// Store offsets for multi-move
let moveOffsets = [];

function startMovingFurniture() {
    if (selectedFurniture.length === 0) return;
    
    // Calculate offsets from the first selected item for group moving
    const basePos = selectedFurniture[0].position.clone();
    moveOffsets = selectedFurniture.map(obj => ({
        obj: obj,
        offsetX: obj.position.x - basePos.x,
        offsetZ: obj.position.z - basePos.z
    }));
    
    game.selectedObject = selectedFurniture[0];
    game.isMovingFurniture = true;
    
    // Show and update highlight box
    highlightBox.setFromObject(game.selectedObject);
    highlightBox.material.color.setHex(0x00ff00); // Green = ready to place
    highlightBox.visible = true;
    
    hideFurnitureActions();
    
    // Show edit mode effect
    if (game.showEditModeEffect) game.showEditModeEffect();
    
    const count = selectedFurniture.length;
    ui.notify(`Moving ${count} item${count > 1 ? 's' : ''} - click to place`, 'info');
}

function cancelFurnitureEdit() {
    clearSelection();
}

function showFurnitureActions() {
    const bar = document.getElementById('furniture-edit-bar');
    if (bar) {
        bar.classList.remove('hidden');
    }
}

function hideFurnitureActions() {
    const bar = document.getElementById('furniture-edit-bar');
    if (bar) {
        bar.classList.add('hidden');
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Frame limiting for performance
    const now = performance.now();
    const elapsed = now - perfSettings.lastFrameTime;
    
    if (elapsed < perfSettings.frameInterval) {
        return; // Skip this frame
    }
    perfSettings.lastFrameTime = now - (elapsed % perfSettings.frameInterval);
    
    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    if (game.mode === 'play') {
        controls.update();
        
        // Clamp movement to stay within city bounds
        controls.target.x = Math.max(-50, Math.min(50, controls.target.x));
        controls.target.z = Math.max(-50, Math.min(50, controls.target.z));
        
        // Lock camera to isometric angle (maintain fixed offset from target)
        const isoOffset = new THREE.Vector3(50, 50, 50);
        camera.position.copy(controls.target).add(isoOffset);
        camera.lookAt(controls.target);
    }

    // Spawn visitors
    if (time - game.lastSpawn > (game.spawnRate / 1000)) {
        if (visitors.length < game.maxVisitors && queue.length > 0) {
            const visitor = queue.shift();
            visitor.pickActivity();
            visitors.push(visitor);
            
            // Notify when celebrity enters (show their name)
            if (visitor.isCelebrity) {
                ui.notify(`⭐ ${visitor.name || 'A CELEBRITY'} has arrived! 👑`, "success");
                game.hype = Math.min(100, game.hype + 10);
                game.updateUI();
            }
            
            // Add new person to queue (regular visitors only - celebrities are hired)
            const newVisitor = new Human(scene, false);
            newVisitor.setPosition(-30, 38);
            queue.push(newVisitor);
            
            game.lastSpawn = time;
        }
    }

    // Update queue movement
    queue.forEach((visitor, i) => {
        const targetX = -14 - (i * 2);
        if (visitor.mesh.position.x < targetX) {
            visitor.mesh.position.x += 3 * delta;
            visitor.hip.position.y = 1.8 + Math.sin(time * 15) * 0.1;
        }
    });

    // Update visitors
    visitors.forEach(visitor => visitor.update(delta, time));

    // Update staff animations directly (ensure time is passed)
    staffManager.staffEntities.forEach(staff => staff.update(time));

    // Update game systems (staff, friends, etc.)
    game.update(delta, time);
    
    // Update DJ system
    if (djSystem) {
        djSystem.update(delta, game);
    }

    // Animate LED dance floor with music-reactive colors (skip on low quality)
    if (perfSettings.enableAnimations) {
        const floors = game.getFurniture('dancefloor');
        const ledColors = [0xff0066, 0x00ffff, 0x00ff00, 0xff00ff, 0xffff00];
        floors.forEach(floor => {
            if (floor.leds) {
                floor.leds.forEach((mat, i) => {
                    const val = Math.sin(i * 0.5 + time * 5);
                    if (val > 0.2) {
                        const colorIndex = Math.floor((i + time * 2) % ledColors.length);
                        mat.emissive.setHex(ledColors[colorIndex]);
                        mat.emissiveIntensity = 1.5;
                    } else {
                        mat.emissive.setHex(0x110011);
                        mat.emissiveIntensity = 0.2;
                    }
                });
            }
        });
    } // end enableAnimations check for dance floor

    // Animate laser light fixtures (purchased) - skip on low quality
    if (!perfSettings.enableAnimations) {
        // Skip expensive laser animations
    } else {
    const laserLights = game.getFurniture('laser');
    laserLights.forEach((laser, idx) => {
        if (laser.userData.isLaser) {
            // Rotate the light head (pan effect)
            if (laser.userData.lightHead) {
                laser.userData.lightHead.rotation.y = Math.sin(time * 0.8 + idx) * 0.6;
                laser.userData.lightHead.rotation.x = Math.sin(time * 0.5 + idx * 0.5) * 0.3 - 0.5;
            }
            
            // Rotate fixture body slightly
            if (laser.userData.fixtureBody) {
                laser.userData.fixtureBody.rotation.y = Math.sin(time * 0.3 + idx * 2) * 0.8;
            }
            
            // Animate beams - color cycling and pulsing
            if (laser.userData.laserBeams) {
                laser.userData.laserBeams.forEach((beam, i) => {
                    // Pulse opacity
                    const pulse = 0.1 + Math.sin(time * 6 + i * 2) * 0.08;
                    beam.material.opacity = pulse;
                    
                    // Color cycling
                    const colorIdx = Math.floor((time * 2 + i) % laser.userData.beamColors.length);
                    beam.material.color.setHex(laser.userData.beamColors[colorIdx]);
                });
            }
            
            // Flash the lens
            if (laser.userData.lensMat) {
                const flash = Math.sin(time * 8 + idx) > 0.3;
                laser.userData.lensMat.opacity = flash ? 1 : 0.5;
                const colorIdx = Math.floor((time * 3) % laser.userData.beamColors.length);
                laser.userData.lensMat.color.setHex(laser.userData.beamColors[colorIdx]);
            }
            
            // Animate spotlight color
            if (laser.userData.spotlight) {
                const colorIdx = Math.floor((time * 2) % laser.userData.beamColors.length);
                laser.userData.spotlight.color.setHex(laser.userData.beamColors[colorIdx]);
            }
            
            // Animate glow light
            if (laser.userData.glowLight) {
                laser.userData.glowLight.intensity = 0.3 + Math.sin(time * 5 + idx) * 0.3;
                const colorIdx = Math.floor((time * 2) % laser.userData.beamColors.length);
                laser.userData.glowLight.color.setHex(laser.userData.beamColors[colorIdx]);
            }
        }
    });
    
    // Animate Multi-Laser lights
    const multiLasers = game.getFurniture('multi_laser');
    multiLasers.forEach((laser, idx) => {
        if (laser.userData.isMultiLaser && laser.userData.laserHeads) {
            // Rotate entire laser units (head + beam move together)
            laser.userData.laserHeads.forEach((unit, i) => {
                // Smooth wave motion - each laser slightly offset
                const swing = Math.sin(time * 1.5 + i * 0.6) * 0.5;
                const tilt = Math.sin(time * 1.0 + i * 0.4) * 0.3;
                unit.rotation.z = swing;
                unit.rotation.x = tilt;
            });
            
            // Blinking effect - each beam blinks at different times
            laser.userData.laserBeams.forEach((beam, i) => {
                // Random-ish blink pattern
                const blink = Math.sin(time * 8 + i * 2.5) > 0.3;
                beam.material.opacity = blink ? 0.1 : 0.02; // On/off blinking
                beam.visible = Math.sin(time * 6 + i * 1.7) > -0.8; // Occasional full off
            });
        }
    });
    
    // Animate Strobe lights
    const strobeLights = game.getFurniture('strobe');
    strobeLights.forEach((strobe, idx) => {
        if (strobe.userData.isStrobe) {
            // Fast flash effect - intense bursts
            const flash = Math.sin(time * 20 + idx * 10) > 0.85;
            
            if (strobe.userData.strobeLight) {
                strobe.userData.strobeLight.intensity = flash ? 50 : 0; // MUCH brighter
            }
            
            if (strobe.userData.flashMat) {
                strobe.userData.flashMat.opacity = flash ? 1 : 0.3;
            }
        }
    });
    
    // Animate Effects lights (Derby style)
    const effectsLights = game.getFurniture('effects_light');
    effectsLights.forEach((fx, idx) => {
        if (fx.userData.isEffectsLight) {
            // Rotate the head
            if (fx.userData.effectsHead) {
                fx.userData.effectsHead.rotation.y = time * 0.5;
            }
            
            // Animate beams
            if (fx.userData.effectsBeams) {
                fx.userData.effectsBeams.forEach((beam, i) => {
                    const pulse = 0.1 + Math.sin(time * 3 + i * 1.5) * 0.1;
                    beam.material.opacity = pulse;
                });
            }
        }
    });
    
    // Animate Wall lights
    const wallLights = game.getFurniture('wall_light');
    wallLights.forEach((wall, idx) => {
        if (wall.userData.isWallLight) {
            // Color cycling
            const colors = [0xff0066, 0x00ffff, 0xff00ff, 0x00ff66, 0xffff00];
            const colorIdx = Math.floor((time * 0.5 + idx * 0.3) % colors.length);
            const color = colors[colorIdx];
            
            if (wall.userData.wallLight) {
                wall.userData.wallLight.color.setHex(color);
            }
            if (wall.userData.ringMat) {
                wall.userData.ringMat.color.setHex(color);
            }
            if (wall.userData.accentMats) {
                wall.userData.accentMats.forEach(mat => mat.color.setHex(color));
            }
            
            // Pulse LED brightness
            if (wall.userData.ledMat) {
                const pulse = Math.sin(time * 4 + idx) > 0 ? 0xffffff : color;
                wall.userData.ledMat.color.setHex(pulse);
            }
        }
    });
    
    // Animate Disco balls (purchased)
    const discoBalls = game.getFurniture('discoball');
    discoBalls.forEach((disco, idx) => {
        // Rotate the disco ball
        disco.rotation.y += delta * 0.5;
        
        // Color cycling for the light
        if (disco.userData.discoBallLight) {
            const colors = [0xffaa00, 0xff00ff, 0x00ffff, 0xff0066, 0x00ff66];
            const colorIdx = Math.floor((time * 0.3 + idx) % colors.length);
            disco.userData.discoBallLight.color.setHex(colors[colorIdx]);
            disco.userData.discoBallLight.intensity = 2 + Math.sin(time * 3 + idx) * 1;
        }
    });
    
    // Animate Moving Head Spotlights (purchased)
    const movingHeads = game.getFurniture('moving_head');
    movingHeads.forEach((mh, idx) => {
        if (mh.userData.isMovingHead) {
            // Pan (yoke rotation around Y)
            if (mh.userData.yoke) {
                mh.userData.yoke.rotation.y = Math.sin(time * 0.5 + idx) * 1;
            }
            
            // Tilt (head rotation around X)
            if (mh.userData.head) {
                mh.userData.head.rotation.x = Math.sin(time * 1 + idx) * 0.5 - 0.5;
            }
            
            // Pulse beam opacity
            if (mh.userData.coneMat) {
                mh.userData.coneMat.opacity = 0.04 + Math.sin(time * 3 + idx) * 0.03;
            }
        }
    });
    } // end enableAnimations check for lights
    
    // Animate moving cars
    movingCars.forEach(car => {
        if (car.userData.axis === 'x') {
            // Move along X axis (front road)
            car.position.x += car.userData.speed * car.userData.direction * delta;
            if (car.userData.direction > 0 && car.position.x > 100) {
                car.position.x = -100;
            } else if (car.userData.direction < 0 && car.position.x < -100) {
                car.position.x = 100;
            }
        } else {
            // Move along Z axis (side roads)
            car.position.z += car.userData.speed * car.userData.direction * delta;
            if (car.userData.direction > 0 && car.position.z > 100) {
                car.position.z = -100;
            } else if (car.userData.direction < 0 && car.position.z < -100) {
                car.position.z = 100;
            }
        }
    });


    // Update particle system
    if (particleSystem) {
        particleSystem.update(delta, time);
    }

    // Animate rain (only if enabled)
    if (perfSettings.enableRain && rainParticles && rainGeometry) {
        const positions = rainGeometry.attributes.position.array;
        const velocities = rainParticles.userData.velocities;
        
        for (let i = 0; i < velocities.length; i++) {
            positions[i * 3] += velocities[i].drift * delta;
            positions[i * 3 + 1] += velocities[i].y * delta;
            
            // Reset rain drop when it hits ground
            if (positions[i * 3 + 1] < -1) {
                positions[i * 3] = (Math.random() - 0.5) * 200;
                positions[i * 3 + 1] = 80 + Math.random() * 20;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            }
        }
        rainGeometry.attributes.position.needsUpdate = true;
    }

    // Update highlight box and furniture effects when moving
    if (game.selectedObject && game.isMovingFurniture) {
        highlightBox.setFromObject(game.selectedObject);
        highlightBox.visible = true;
        
        // Pulsing scale effect on the furniture
        const pulse = 1 + Math.sin(time * 5) * 0.03;
        if (!game.selectedObject.userData.originalScale) {
            game.selectedObject.userData.originalScale = game.selectedObject.scale.clone();
        }
        const origScale = game.selectedObject.userData.originalScale;
        game.selectedObject.scale.set(origScale.x * pulse, origScale.y * pulse, origScale.z * pulse);
        
        // Add glow effect to furniture meshes
        game.selectedObject.traverse((child) => {
            if (child.isMesh && child.material) {
                if (!child.userData.originalEmissive) {
                    child.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000);
                    child.userData.originalEmissiveIntensity = child.material.emissiveIntensity || 0;
                }
                const glowIntensity = 0.3 + Math.sin(time * 4) * 0.2;
                if (child.material.emissive) {
                    child.material.emissive.setHex(0x00ff00);
                    child.material.emissiveIntensity = glowIntensity;
                }
            }
        });
    } else if (selectedFurniture.length > 0) {
        // Selected but not moving - show purple pulsing highlight
        highlightBox.setFromObject(selectedFurniture[0]);
        highlightBox.material.color.setHex(0x8b5cf6); // Purple
        highlightBox.visible = true;
        
        // Subtle pulsing glow on all selected furniture
        const glowIntensity = 0.2 + Math.sin(time * 3) * 0.15;
        selectedFurniture.forEach(obj => {
            obj.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (!child.userData.originalEmissive) {
                        child.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000);
                        child.userData.originalEmissiveIntensity = child.material.emissiveIntensity || 0;
                    }
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x8b5cf6); // Purple
                        child.material.emissiveIntensity = glowIntensity;
                    }
                }
            });
        });
    }

    // Update floaters
    updateFloaters(delta);

    // Update visitor count
    game.visitors = visitors;

    // Hide loading after scene is ready
    if (time > 1) {
        ui.showLoading(false);
    }

    // Render with post-processing (bloom)
    composer.render();
}

// === TILE PLACEMENT SYSTEM ===
function startTilePlacement(tileType, cost) {
    console.log('Starting tile placement:', tileType, 'at $' + cost + '/tile');
    
    tilePlacementMode.active = true;
    tilePlacementMode.tileType = tileType;
    tilePlacementMode.tileCost = cost;
    tilePlacementMode.previewTiles = [];
    tilePlacementMode.startPos = null;
    tilePlacementMode.currentPos = null;
    
    // Create cost display
    if (!tilePlacementMode.costDisplay) {
        const display = document.createElement('div');
        display.id = 'tile-cost-display';
        display.style.cssText = `
            position: fixed; top: 20%; left: 50%; transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.9); color: #4caf50; padding: 15px 25px;
            border-radius: 10px; font-family: 'Fredoka One', cursive; font-size: 1.2rem;
            z-index: 9999; pointer-events: none; border: 3px solid #4caf50; text-align: center;
        `;
        document.body.appendChild(display);
        tilePlacementMode.costDisplay = display;
    }
    
    // Show initial message
    tilePlacementMode.costDisplay.style.display = 'block';
    const tileName = tileType.replace('tile_', '').toUpperCase();
    const isDiamonds = cost < 0;
    const displayCost = Math.abs(cost);
    const currencySymbol = isDiamonds ? '💎' : '$';
    tilePlacementMode.costDisplay.innerHTML = `🧱 ${tileName} TILES<br><small>${currencySymbol}${displayCost}/tile - Click & drag to place!</small>`;
    
    ui.notify('🖱️ Click & drag on floor to place tiles!', 'info');
    game.mode = 'edit';
    document.body.style.cursor = 'cell'; // Show placement-ready cursor
}

function updateTilePreview() {
    if (!tilePlacementMode.active || !tilePlacementMode.startPos || !tilePlacementMode.currentPos) return;
    
    // Clear old previews
    tilePlacementMode.previewTiles.forEach(tile => scene.remove(tile));
    tilePlacementMode.previewTiles = [];
    
    const start = tilePlacementMode.startPos;
    const end = tilePlacementMode.currentPos;
    const tileSize = 4; // Tile size from furniture.js
    
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);
    
    const countX = Math.floor((maxX - minX) / tileSize) + 1;
    const countZ = Math.floor((maxZ - minZ) / tileSize) + 1;
    const totalTiles = countX * countZ;
    
    // Handle diamond cost (negative) or cash cost (positive)
    const isDiamonds = tilePlacementMode.tileCost < 0;
    const costPerTile = Math.abs(tilePlacementMode.tileCost);
    const totalCost = totalTiles * costPerTile;
    const canAfford = isDiamonds ? game.diamonds >= totalCost : game.cash >= totalCost;
    const currencySymbol = isDiamonds ? '💎' : '$';
    
    // Create preview tiles
    const previewMat = new THREE.MeshBasicMaterial({
        color: canAfford ? 0x00ff00 : 0xff0000,
        transparent: true,
        opacity: 0.5
    });
    
    for (let x = 0; x < countX; x++) {
        for (let z = 0; z < countZ; z++) {
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(tileSize - 0.2, 0.15, tileSize - 0.2),
                previewMat
            );
            tile.position.set(
                minX + x * tileSize,
                0.35,
                minZ + z * tileSize
            );
            scene.add(tile);
            tilePlacementMode.previewTiles.push(tile);
        }
    }
    
    // Update cost display
    if (tilePlacementMode.costDisplay) {
        tilePlacementMode.costDisplay.style.display = 'block';
        tilePlacementMode.costDisplay.style.borderColor = canAfford ? '#4caf50' : '#f44336';
        tilePlacementMode.costDisplay.style.color = canAfford ? '#4caf50' : '#f44336';
        const notEnoughMsg = isDiamonds ? 'NOT ENOUGH DIAMONDS!' : 'NOT ENOUGH CASH!';
        tilePlacementMode.costDisplay.innerHTML = `
            ${totalTiles} tiles = ${currencySymbol}${totalCost}<br>
            <small style="color: ${canAfford ? '#aaa' : '#ff6666'}">
                ${canAfford ? 'Release to place' : notEnoughMsg}
            </small>
        `;
    }
}

function confirmTilePlacement() {
    if (!tilePlacementMode.active || !tilePlacementMode.startPos) {
        cancelTilePlacement();
        return;
    }
    
    const start = tilePlacementMode.startPos;
    const end = tilePlacementMode.currentPos || start;
    const tileSize = 4;
    
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);
    
    const countX = Math.floor((maxX - minX) / tileSize) + 1;
    const countZ = Math.floor((maxZ - minZ) / tileSize) + 1;
    const totalTiles = countX * countZ;
    
    // Check if diamond cost (negative) or cash cost (positive)
    const isDiamonds = tilePlacementMode.tileCost < 0;
    const costPerTile = Math.abs(tilePlacementMode.tileCost);
    const totalCost = totalTiles * costPerTile;
    
    if (isDiamonds) {
        if (game.diamonds < totalCost) {
            ui.notify('Not enough diamonds! 💎', 'error');
            cancelTilePlacement();
            return;
        }
        game.diamonds -= totalCost;
    } else {
        if (game.cash < totalCost) {
            ui.notify('Not enough cash!', 'error');
            cancelTilePlacement();
            return;
        }
        game.cash -= totalCost;
    }
    game.updateUI();
    
    // Clear preview tiles
    tilePlacementMode.previewTiles.forEach(tile => scene.remove(tile));
    tilePlacementMode.previewTiles = [];
    
    // Place actual tiles (skip positions that already have tiles)
    let placedCount = 0;
    let skippedCount = 0;
    
    for (let x = 0; x < countX; x++) {
        for (let z = 0; z < countZ; z++) {
            const posX = minX + x * tileSize;
            const posZ = minZ + z * tileSize;
            
            // Check if there's already a tile at this position
            const existingTile = game.furniture.find(f => {
                if (!f.userData || !f.userData.type) return false;
                if (!f.userData.type.startsWith('tile_') && f.userData.type !== 'dancefloor') return false;
                const dx = Math.abs(f.position.x - posX);
                const dz = Math.abs(f.position.z - posZ);
                return dx < 2 && dz < 2; // Within 2 units = same tile spot
            });
            
            if (existingTile) {
                skippedCount++;
                // Refund cost for skipped tile
                if (isDiamonds) {
                    game.diamonds += costPerTile;
                } else {
                    game.cash += costPerTile;
                }
            } else {
                createFurniture(scene, tilePlacementMode.tileType, posX, posZ);
                placedCount++;
            }
        }
    }
    
    game.updateUI();
    
    const currencySymbol = isDiamonds ? '💎' : '$';
    if (skippedCount > 0) {
        ui.notify(`Placed ${placedCount} tiles (${skippedCount} skipped - already exist)`, 'info');
    } else {
        ui.notify(`Placed ${placedCount} tiles for ${currencySymbol}${placedCount * costPerTile}!`, 'success');
    }
    cancelTilePlacement();
    game.autoSave();
}

function cancelTilePlacement() {
    // Clear preview tiles
    tilePlacementMode.previewTiles.forEach(tile => scene.remove(tile));
    tilePlacementMode.previewTiles = [];
    
    // Hide cost display
    if (tilePlacementMode.costDisplay) {
        tilePlacementMode.costDisplay.style.display = 'none';
    }
    
    // Reset state
    tilePlacementMode.active = false;
    tilePlacementMode.startPos = null;
    tilePlacementMode.currentPos = null;
    tilePlacementMode.tileType = null;
    
    // Re-enable camera controls
    controls.enabled = true;
    document.body.style.cursor = 'default'; // Reset cursor
}

// Expose tile placement to window for shop
window.startTilePlacement = startTilePlacement;

function onPointerDown(e) {
    // Ignore if clicking UI elements or furniture action buttons
    if (e.target.closest('#ui-layer') || e.target.closest('.modal-overlay') || e.target.closest('#furniture-edit-bar')) {
        return;
    }

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Handle tile placement mode
    if (tilePlacementMode.active) {
        const target = new THREE.Vector3();
        const result = raycaster.ray.intersectPlane(plane, target);
        if (result) {
            const tileSize = 4;
            tilePlacementMode.startPos = {
                x: Math.round(target.x / tileSize) * tileSize,
                z: Math.round(target.z / tileSize) * tileSize
            };
            tilePlacementMode.currentPos = { ...tilePlacementMode.startPos };
            controls.enabled = false; // Lock camera while dragging
            document.body.style.cursor = 'crosshair'; // Show drag cursor
            console.log('Tile drag started at:', tilePlacementMode.startPos);
            updateTilePreview();
        }
        return;
    }

    if (game.mode !== 'edit') {
        // Play mode - click on visitors, staff, or interactive furniture
        const hits = raycaster.intersectObjects(scene.children, true);
        for (let hit of hits) {
            let obj = hit.object;
            // Check all parents including the root group
            while (obj) {
                // Check for DJ booth click
                if (obj.userData && obj.userData.isFurniture && obj.userData.type === 'dj') {
                    console.log('DJ booth clicked!');
                    if (window.openDJBooth) {
                        window.openDJBooth();
                    } else {
                        // Fallback if openDJBooth not loaded yet
                        game.openModal('dj');
                    }
                    return;
                }
                // Check for staff click
                if (obj.userData && obj.userData.isStaff && obj.userData.staffEntity) {
                    showStaffPopup(obj.userData.staffEntity, game);
                    return;
                }
                // Check for visitor click
                if (obj.userData && obj.userData.owner) {
                    showThought(obj.userData.owner);
                    return;
                }
                // Move to parent
                if (obj.parent && obj.parent !== scene) {
                    obj = obj.parent;
                } else {
                    break;
                }
            }
        }
        return;
    }

    // Edit mode - check what we clicked
    const hits = raycaster.intersectObjects(scene.children, true);
    let clickedFurniture = null;
    
    for (let hit of hits) {
        let obj = hit.object;
        while (obj && obj !== scene) {
            if (obj.userData && obj.userData.isFurniture) {
                clickedFurniture = obj;
                break;
            }
            obj = obj.parent;
        }
        if (clickedFurniture) break;
    }
    
    // If we have selected furniture and we're moving it
    if (game.selectedObject && game.isMovingFurniture) {
        // Place the furniture
        if (game.selectedObject.userData.canPlace !== false) {
            console.log('Placed furniture:', game.selectedObject.userData.type);
            clearSelection();
            game.autoSave();
        } else {
            ui.notify("Can't place here!", "error");
        }
        return;
    }
    
    // If clicked on furniture
    if (clickedFurniture) {
        // Check if shift is held for multi-select
        const isShiftHeld = e.shiftKey;
        
        // Select the furniture (with or without adding to selection)
        selectFurniture(clickedFurniture, isShiftHeld);
        controls.enabled = false;
        console.log('Selected furniture:', clickedFurniture.userData.type, isShiftHeld ? '(added to selection)' : '', 'Total:', selectedFurniture.length);
        return;
    }
    
    // Clicked on nothing - deselect all
    if (selectedFurniture.length > 0) {
        clearSelection();
    }
}

function onPointerMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    // Handle tile placement drag
    if (tilePlacementMode.active && tilePlacementMode.startPos) {
        const target = new THREE.Vector3();
        const result = raycaster.ray.intersectPlane(plane, target);
        
        if (result) {
            const tileSize = 4;
            tilePlacementMode.currentPos = {
                x: Math.round(target.x / tileSize) * tileSize,
                z: Math.round(target.z / tileSize) * tileSize
            };
            updateTilePreview();
        }
        return;
    }
    
    // Only move furniture if in moving mode (not just selected)
    if (game.mode === 'edit' && game.selectedObject && game.isMovingFurniture) {
        const target = new THREE.Vector3();
        const result = raycaster.ray.intersectPlane(plane, target);
        
        if (result) {
            const baseX = Math.round(target.x / 2) * 2;
            const baseZ = Math.round(target.z / 2) * 2;
            
            // Move ALL selected items using their offsets
            let canPlaceAll = true;
            const clubSize = getClubSize();
            
            moveOffsets.forEach(item => {
                const newX = baseX + item.offsetX;
                const newZ = baseZ + item.offsetZ;
                // Preserve Y position for lights, otherwise set to 0
                const newY = isLightFurniture(item.obj) ? item.obj.position.y : 0;
                item.obj.position.set(newX, newY, newZ);
                
                // Check bounds for each item
                const isOutOfBounds = Math.abs(newX) > clubSize.halfW || newZ < -clubSize.halfD || newZ > 30;
                if (isOutOfBounds) canPlaceAll = false;
            });
            
            // Check for collisions
            const hasCollision = checkFurnitureCollision(game.selectedObject);
            
            if (hasCollision || !canPlaceAll) {
                highlightBox.material.color.setHex(0xff0000); // Red = can't place
                game.selectedObject.userData.canPlace = false;
            } else {
                highlightBox.material.color.setHex(0x00ff00); // Green = can place
                game.selectedObject.userData.canPlace = true;
            }
            highlightBox.setFromObject(game.selectedObject);
        }
    }
}

// Check if furniture is a light category
function isLightFurniture(obj) {
    if (!obj || !obj.userData || !obj.userData.type) return false;
    const lightTypes = ['laser', 'multi_laser', 'strobe', 'effects_light', 'wall_light', 'discoball', 'moving_head'];
    return lightTypes.includes(obj.userData.type);
}

// Check if furniture is a floor/tile type (no collision)
function isFloorFurniture(obj) {
    if (!obj || !obj.userData || !obj.userData.type) return false;
    const type = obj.userData.type;
    // Floor tiles and dance floors have no collision
    return type.startsWith('tile_') || type === 'dancefloor';
}

// Check if furniture collides with other furniture
function checkFurnitureCollision(obj) {
    if (!obj) return false;
    
    // Lights have NO collision - they can be placed anywhere
    if (isLightFurniture(obj)) return false;
    
    // Floors/tiles have NO collision - they layer on ground
    if (isFloorFurniture(obj)) return false;
    
    // Get bounding box of the moving object
    const box1 = new THREE.Box3().setFromObject(obj);
    // Shrink more to allow closer placement (was 0.5, now 0.8)
    box1.min.addScalar(0.8);
    box1.max.subScalar(0.8);
    
    // Check against all other furniture (skip lights and floors)
    for (const other of game.furniture) {
        if (other === obj) continue;
        if (isLightFurniture(other)) continue; // Skip collision with lights
        if (isFloorFurniture(other)) continue; // Skip collision with floors
        
        const box2 = new THREE.Box3().setFromObject(other);
        if (box1.intersectsBox(box2)) {
            return true;
        }
    }
    
    // Check against walls - more lenient bounds
    const clubSize = getClubSize();
    const margin = 1; // Allow placement closer to walls
    if (box1.min.x < -clubSize.halfW - margin || box1.max.x > clubSize.halfW + margin) return true;
    if (box1.min.z < -clubSize.halfD - margin) return true;
    
    return false;
}

function onPointerUp() {
    // Handle tile placement confirmation
    if (tilePlacementMode.active && tilePlacementMode.startPos) {
        confirmTilePlacement();
        return;
    }
    
    if (game.mode === 'edit' && game.selectedObject) {
        const obj = game.selectedObject;
        
        // Check if placement is valid
        if (obj.userData.canPlace === false) {
            ui.notify("Can't place here! Collision detected.", "error");
            return; // Don't place, keep selected
        }
        
        // Place the furniture - save its new position
        console.log('Placed furniture:', obj.userData.type, 'at', obj.position.x, obj.position.z);
        
        // Reset visual effects before clearing selection
        resetFurnitureEffects(obj);
        
        // Clear selection to stop following mouse
        game.selectedObject = null;
        game.isMovingFurniture = false;
        highlightBox.visible = false;
        controls.enabled = false;
        
        // Hide edit mode overlay
        if (game.hideEditModeEffect) game.hideEditModeEffect();
        
        // Auto-save after placing furniture
        game.autoSave();
    }
}

function onKeyDown(e) {
    // Rotate furniture with R key (rotates all selected)
    if (game.mode === 'edit' && selectedFurniture.length > 0 && (e.key === 'r' || e.key === 'R')) {
        rotateFurniture();
        console.log('Rotated furniture');
    }
    
    // Delete furniture with Delete or Backspace key (deletes all selected)
    if (game.mode === 'edit' && selectedFurniture.length > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
        deleteFurniture();
        console.log('Deleted furniture');
    }
    
    // Up/Down arrow keys to adjust light height (lights only)
    if (game.mode === 'edit' && selectedFurniture.length > 0) {
        const lightItems = selectedFurniture.filter(obj => isLightFurniture(obj));
        if (lightItems.length > 0) {
            const step = e.shiftKey ? 1 : 0.25; // Hold Shift for bigger steps
            
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                lightItems.forEach(obj => {
                    obj.position.y = Math.min(obj.position.y + step, 10); // Max height 10
                });
                if (selectedFurniture.length > 0) {
                    highlightBox.setFromObject(selectedFurniture[0]);
                }
                console.log('Moved lights UP, Y:', lightItems[0].position.y.toFixed(2));
            }
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                lightItems.forEach(obj => {
                    obj.position.y = Math.max(obj.position.y - step, -2); // Min height -2
                });
                if (selectedFurniture.length > 0) {
                    highlightBox.setFromObject(selectedFurniture[0]);
                }
                console.log('Moved lights DOWN, Y:', lightItems[0].position.y.toFixed(2));
            }
        }
    }
    
    // Cancel selection with Escape
    if (e.key === 'Escape') {
        // Cancel tile placement mode
        if (tilePlacementMode.active) {
            cancelTilePlacement();
            ui.notify('Tile placement cancelled', 'info');
            return;
        }
        // Cancel furniture selection
        if (game.mode === 'edit' && selectedFurniture.length > 0) {
            clearSelection();
        }
    }
}

function onRightClick(e) {
    // Right-click to rotate furniture in edit mode
    if (game.mode === 'edit' && selectedFurniture.length > 0) {
        e.preventDefault();
        rotateFurniture();
        console.log('Rotated furniture (right-click)');
    }
}

function onResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const d = CONFIG.CAMERA_DISTANCE;
    
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.setSize(window.innerWidth, window.innerHeight);
}

async function showThought(human) {
    if (human.isThinking) return;
    human.isThinking = true;

    // Show name with celebrity indicator
    const namePrefix = human.isCelebrity ? '👑 ' : '';
    const nameDisplay = `${namePrefix}${human.name || 'Guest'}`;
    const bubble = createBubble(`${nameDisplay}\n...`, human.mesh.position);

    try {
        const prompt = `Nightclub guest named ${human.name} is ${human.state}. Club hype ${game.hype}. Short funny thought (max 6 words):`;
        const thought = await game.callGemini(prompt);
        bubble.el.innerHTML = `<strong>${nameDisplay}</strong><br>${thought}`;
    } catch (e) {
        const thoughts = human.isCelebrity ? [
            "I love my fans! 💖",
            "This club is lit! 🔥",
            "VIP treatment only!",
            "Where's my champagne?",
            "Time to make memories!",
            "Security, clear a path!"
        ] : [
            "This DJ is 🔥!",
            "Need more drinks!",
            "Best party ever!",
            "Where's the VIP?",
            "Dance all night!",
            "Love this song!"
        ];
        bubble.el.innerHTML = `<strong>${nameDisplay}</strong><br>${thoughts[Math.floor(Math.random() * thoughts.length)]}`;
    }

    setTimeout(() => {
        bubble.remove();
        human.isThinking = false;
    }, 4000);
}

function createFloatingText(text, pos, color) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.color = color;
    document.body.appendChild(el);
    
    floaters.push({
        el,
        pos: new THREE.Vector3(pos.x, pos.y, pos.z),
        age: 0
    });
}

function createBubble(text, pos) {
    const el = document.createElement('div');
    el.className = 'thought-bubble show';
    el.innerText = text;
    document.body.appendChild(el);

    const bubble = {
        el,
        pos: new THREE.Vector3(pos.x, pos.y + 3, pos.z),
        remove: function() {
            el.remove();
            const idx = floaters.indexOf(bubble);
            if (idx > -1) floaters.splice(idx, 1);
        }
    };

    floaters.push(bubble);
    return bubble;
}

function updateFloaters(delta) {
    for (let i = floaters.length - 1; i >= 0; i--) {
        const floater = floaters[i];

        if (floater.age !== undefined) {
            floater.age += delta;
            floater.pos.y += delta * 2;
            floater.el.style.opacity = 1 - floater.age;

            if (floater.age > 1) {
                floater.el.remove();
                floaters.splice(i, 1);
                continue;
            }
        }

        const screenPos = floater.pos.clone().project(camera);
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
        
        floater.el.style.left = `${x}px`;
        floater.el.style.top = `${y}px`;
    }
}

// Global function to rebuild scene furniture (for visit mode)
window.rebuildSceneFurniture = function() {
    console.log('Rebuilding scene furniture...');
    
    // Remove existing furniture from scene
    if (game.furniture && game.furniture.length > 0) {
        game.furniture.forEach(item => {
            if (item.mesh && scene) {
                scene.remove(item.mesh);
            } else if (item && scene) {
                scene.remove(item);
            }
        });
        game.furniture = [];
    }
    
    // Rebuild from savedFurniture
    if (game.savedFurniture && game.savedFurniture.length > 0) {
        console.log('Rebuilding', game.savedFurniture.length, 'furniture items');
        game.savedFurniture.forEach((item, index) => {
            if (item.type) {
                const furniture = createFurniture(scene, item.type, item.x || 0, item.z || 0, item.rotationY || 0);
                if (furniture && item.y) {
                    furniture.position.y = item.y;
                }
            }
        });
    }
    
    console.log('Rebuilt furniture count:', game.furniture?.length || 0);
};
