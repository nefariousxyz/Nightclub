// Furniture Factory Module
import * as THREE from 'three';
import { game } from './game.js';
import { CONFIG } from './config.js';

// Shared materials
const materials = {
    wood: new THREE.MeshStandardMaterial({ color: 0x3e2723 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
    redLeather: new THREE.MeshStandardMaterial({ color: 0x8b0000 }),
    purpleNeon: new THREE.MeshStandardMaterial({ 
        color: 0x9c27b0, 
        emissive: 0x4a148c, 
        emissiveIntensity: 0.3 
    }),
    chrome: new THREE.MeshStandardMaterial({ 
        color: 0xcccccc, 
        metalness: 0.9, 
        roughness: 0.1 
    }),
    glass: new THREE.MeshStandardMaterial({ 
        color: 0xaaddff, 
        transparent: true, 
        opacity: 0.4 
    })
};

export function createFurniture(scene, type, x, z, rot = 0) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rot;
    group.userData = { type, isFurniture: true };

    switch (type) {
        case 'dancefloor':
            createDancefloor(group);
            break;
        case 'bar':
            createBar(group);
            break;
        case 'dj':
            createDJBooth(group);
            break;
        case 'booth':
            createVIPBooth(group);
            break;
        case 'table':
            createTable(group);
            break;
        case 'pooltable':
            createPoolTable(group);
            break;
        case 'speaker':
            createSpeaker(group);
            break;
        case 'plant':
            createPlant(group);
            break;
        case 'discoball':
            createDiscoBall(group);
            break;
        case 'laser':
            createLaser(group);
            break;
        case 'statue':
            createStatue(group);
            break;
        case 'fountain':
            createFountain(group);
            break;
        case 'stage':
            createStage(group);
            break;
        case 'viparea':
            createVIPArea(group);
            break;
        case 'aquarium':
            createAquarium(group);
            break;
        case 'helicopter':
            createHelipad(group);
            break;
        // Floor tiles
        case 'tile_wood':
            createFloorTile(group, 0x8B4513, 'wood');
            break;
        case 'tile_marble':
            createFloorTile(group, 0xf5f5f5, 'marble');
            break;
        case 'tile_checker':
            createFloorTile(group, 0x222222, 'checker');
            break;
        case 'tile_carpet':
            createFloorTile(group, 0x8b0000, 'carpet');
            break;
        case 'tile_concrete':
            createFloorTile(group, 0x555555, 'concrete');
            break;
        case 'tile_disco':
            createFloorTile(group, 0xff00ff, 'disco');
            break;
        case 'tile_gold':
            createFloorTile(group, 0xffd700, 'gold');
            break;
        case 'tile_neon':
            createFloorTile(group, 0x9900ff, 'neon');
            break;
        case 'tile_hologram':
            createFloorTile(group, 0x00ffff, 'hologram');
            break;
        case 'tile_lava':
            createFloorTile(group, 0xff4500, 'lava');
            break;
        case 'tile_galaxy':
            createFloorTile(group, 0x191970, 'galaxy');
            break;
        // New furniture
        case 'sofa':
            createSofa(group);
            break;
        case 'barstool':
            createBarstool(group);
            break;
        case 'lounge_chair':
            createLoungeChair(group);
            break;
        case 'bean_bag':
            createBeanBag(group);
            break;
        case 'neon_sign':
            createNeonSign(group);
            break;
        case 'palm_tree':
            createPalmTree(group);
            break;
        case 'rope_barrier':
            createRopeBarrier(group);
            break;
        case 'champagne_tower':
            createChampagneTower(group);
            break;
        case 'ice_sculpture':
            createIceSculpture(group);
            break;
        case 'fire_pit':
            createFirePit(group);
            break;
        case 'photo_booth':
            createPhotoBooth(group);
            break;
        case 'throne':
            createThrone(group);
            break;
        case 'led_wall':
            createLEDWall(group);
            break;
        case 'smoke_machine':
            createSmokeMachine(group);
            break;
        case 'multi_laser':
            createMultiLaser(group);
            break;
        case 'strobe':
            createStrobe(group);
            break;
        case 'effects_light':
            createEffectsLight(group);
            break;
        case 'wall_light':
            createWallLight(group);
            break;
        case 'moving_head':
            createMovingHead(group);
            break;
    }

    scene.add(group);
    game.furniture.push(group);
    return group;
}

function createDancefloor(group) {
    // Smaller, sleeker base platform - raised above club floor
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.15, 10),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.3 })
    );
    base.position.y = 0.25; // Raised to be above platform (0.2)
    base.receiveShadow = true;
    group.add(base);

    // LED tiles - 3x3 grid
    group.leds = [];
    const tileSize = 3.0;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const isOdd = (r + c) % 2 === 0;
            const tileMat = new THREE.MeshStandardMaterial({
                color: isOdd ? CONFIG.COLORS.FLOOR_TILE_1 : CONFIG.COLORS.FLOOR_TILE_2,
                emissive: isOdd ? 0x220000 : 0x000022,
                emissiveIntensity: 0.4,
                metalness: 0.5,
                roughness: 0.3
            });
            
            const tile = new THREE.Mesh(
                new THREE.BoxGeometry(tileSize - 0.1, 0.08, tileSize - 0.1),
                tileMat
            );
            tile.position.set(
                (c - 1) * tileSize,
                0.35, // Raised to be visible above base
                (r - 1) * tileSize
            );
            tile.receiveShadow = true;
            group.add(tile);
            group.leds.push(tileMat);
        }
    }

    // Slim neon edge trim
    const trimMat = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 0.6
    });
    
    const trimSize = 5;
    [[-trimSize, 0], [trimSize, 0], [0, -trimSize], [0, trimSize]].forEach(([x, z], i) => {
        const trim = new THREE.Mesh(
            new THREE.BoxGeometry(i < 2 ? 0.08 : 10, 0.12, i < 2 ? 10 : 0.08),
            trimMat
        );
        trim.position.set(x, 0.32, z); // Raised to be above platform
        group.add(trim);
    });
}

function createBar(group) {
    // Sleek bar counter with rounded edges
    const counterMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a1810, 
        roughness: 0.4,
        metalness: 0.1
    });
    
    // Main counter body
    const counter = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.1, 6),
        counterMat
    );
    counter.position.y = 0.55;
    counter.castShadow = true;
    group.add(counter);

    // Polished counter top
    const counterTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.08, 6.2),
        new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            metalness: 0.8,
            roughness: 0.2
        })
    );
    counterTop.position.y = 1.15;
    group.add(counterTop);

    // Foot rail
    const footRail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 5.8, 8),
        materials.chrome
    );
    footRail.rotation.x = Math.PI / 2;
    footRail.position.set(0.5, 0.2, 0);
    group.add(footRail);

    // Back bar shelving
    const backBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 1.8, 5.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    backBar.position.set(-1, 0.9, 0);
    group.add(backBar);
    
    // Bottle shelf
    const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.05, 5),
        materials.glass
    );
    shelf.position.set(-1, 1.4, 0);
    group.add(shelf);

    // Neon underglow
    const neonTrim = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.04, 5.8),
        new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.8
        })
    );
    neonTrim.position.y = 0.25; // Raised above platform
    group.add(neonTrim);

    // Subtle bar light
    const barLight = new THREE.PointLight(0x00ffff, 0.5, 5);
    barLight.position.set(0, 1.5, 0);
    group.add(barLight);
}

function createDJBooth(group) {
    // Compact modern DJ desk
    const deskMat = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a2e,
        metalness: 0.3,
        roughness: 0.6
    });
    
    const desk = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1, 1.5),
        deskMat
    );
    desk.position.y = 0.5;
    desk.castShadow = true;
    group.add(desk);

    // Equipment surface
    const surface = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.05, 1.3),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 })
    );
    surface.position.y = 1.03;
    group.add(surface);

    // Turntables (smaller)
    for (let i = -1; i <= 1; i += 2) {
        const turntable = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16),
            new THREE.MeshStandardMaterial({ color: 0x111111 })
        );
        turntable.position.set(i * 0.8, 1.08, 0);
        group.add(turntable);
        
        // Platter
        const platter = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 0.02, 12),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        platter.position.set(i * 0.8, 1.11, 0);
        group.add(platter);
    }

    // Mixer (center)
    const mixer = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.06, 0.6),
        new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            emissive: 0x002200,
            emissiveIntensity: 0.3
        })
    );
    mixer.position.set(0, 1.08, 0);
    group.add(mixer);

    // Small speaker monitors
    for (let i = -1; i <= 1; i += 2) {
        const speaker = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.8, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        speaker.position.set(i * 1.6, 0.9, -0.4);
        group.add(speaker);
    }

    // LED strip on front
    const led = new THREE.Mesh(
        new THREE.BoxGeometry(2.9, 0.05, 0.05),
        new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 0.8
        })
    );
    led.position.set(0, 0.02, 0.75);
    group.add(led);

    // Subtle DJ light
    const djLight = new THREE.PointLight(0xff00ff, 0.8, 6);
    djLight.position.set(0, 2, 0);
    group.add(djLight);
}

function createVIPBooth(group) {
    // Modern curved booth - smaller and sleeker
    const leatherMat = new THREE.MeshStandardMaterial({ 
        color: 0x6a1b1b,
        roughness: 0.7,
        metalness: 0.1
    });
    
    // Back cushion (curved using multiple segments)
    const back = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.9, 0.3),
        leatherMat
    );
    back.position.set(0, 0.7, -0.6);
    back.castShadow = true;
    group.add(back);

    // Seat cushion
    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.25, 0.9),
        leatherMat
    );
    seat.position.set(0, 0.35, 0);
    seat.castShadow = true;
    group.add(seat);

    // Base frame
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.2, 1),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    base.position.y = 0.1;
    group.add(base);

    // Side armrests
    for (let i = -1; i <= 1; i += 2) {
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.5, 0.9),
            leatherMat
        );
        arm.position.set(i * 1.3, 0.5, 0);
        group.add(arm);
    }

    // Subtle neon underglow
    const neon = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.03, 0.03),
        new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 0.6
        })
    );
    neon.position.set(0, 0.02, 0.5);
    group.add(neon);
}

function createTable(group) {
    // Sleek cocktail table
    const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12),
        new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,
            metalness: 0.6,
            roughness: 0.3
        })
    );
    top.position.y = 0.75;
    top.castShadow = true;
    group.add(top);

    // Slim chrome pedestal
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8),
        materials.chrome
    );
    stem.position.y = 0.4;
    group.add(stem);

    // Base plate
    const basePlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.35, 0.05, 10),
        materials.chrome
    );
    basePlate.position.y = 0.025;
    group.add(basePlate);

    // Small candle/light
    const candle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8),
        new THREE.MeshStandardMaterial({ 
            color: 0xffeecc,
            emissive: 0xffaa00,
            emissiveIntensity: 0.3
        })
    );
    candle.position.y = 0.83;
    group.add(candle);

    // Warm glow
    const candleLight = new THREE.PointLight(0xffaa00, 0.3, 2);
    candleLight.position.set(0, 0.9, 0);
    group.add(candleLight);
}

function createPoolTable(group) {
    // Realistic pool table - proper proportions
    const woodMat = new THREE.MeshStandardMaterial({ 
        color: 0x3e2723,
        roughness: 0.6
    });
    
    // Table body/frame
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.8, 1.5),
        woodMat
    );
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2a1810 });
    [[1.2, 0.6], [1.2, -0.6], [-1.2, 0.6], [-1.2, -0.6]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.08, 0.4, 8),
            legMat
        );
        leg.position.set(x, -0.2, z);
        group.add(leg);
    });

    // Green felt surface
    const felt = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 })
    );
    felt.rotation.x = -Math.PI / 2;
    felt.position.y = 0.81;
    group.add(felt);

    // Rails (cushions)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    [[0, -0.65, 2.5, 0.1], [0, 0.65, 2.5, 0.1], [-1.3, 0, 0.1, 1.4], [1.3, 0, 0.1, 1.4]].forEach(([x, z, w, d]) => {
        const rail = new THREE.Mesh(
            new THREE.BoxGeometry(w, 0.08, d),
            railMat
        );
        rail.position.set(x, 0.85, z);
        group.add(rail);
    });

    // Overhead light
    const tableLight = new THREE.PointLight(0xffffee, 0.4, 3);
    tableLight.position.set(0, 1.5, 0);
    group.add(tableLight);
}

function createSpeaker(group) {
    // Compact floor speaker
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.2, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
    );
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Speaker cones
    [0.35, 0.75].forEach(y => {
        const cone = new THREE.Mesh(
            new THREE.CircleGeometry(0.18, 12),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        cone.position.set(0, y, 0.26);
        group.add(cone);
    });

    // Tweeter
    const tweeter = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    tweeter.position.set(0, 1.0, 0.26);
    group.add(tweeter);

    // LED indicator
    const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.03, 0.03),
        new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.8
        })
    );
    led.position.set(0, 1.15, 0.26);
    group.add(led);
}

function createPlant(group) {
    // Sleek modern pot
    const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.15, 0.35, 10),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.4 })
    );
    pot.position.y = 0.175;
    pot.castShadow = true;
    group.add(pot);

    // Soil
    const soil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.03, 8),
        new THREE.MeshStandardMaterial({ color: 0x3d2817 })
    );
    soil.position.y = 0.34;
    group.add(soil);

    // Plant leaves - small decorative plant
    const leafMat = new THREE.MeshStandardMaterial({
        color: 0x228b22,
        roughness: 0.7
    });

    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const leaf = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 0.4, 4),
            leafMat
        );
        leaf.position.set(
            Math.sin(angle) * 0.08,
            0.55,
            Math.cos(angle) * 0.08
        );
        leaf.rotation.x = 0.3;
        leaf.rotation.y = angle;
        group.add(leaf);
    }
}

function createDiscoBall(group) {
    // Thin chain
    const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 2, 6),
        materials.chrome
    );
    chain.position.y = 4;
    group.add(chain);

    // Disco ball - smaller
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 12),
        new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            metalness: 1,
            roughness: 0.05
        })
    );
    ball.position.y = 3;
    group.add(ball);

    // Disco ball light with color cycling
    const discoLight = new THREE.PointLight(0xffaa00, 2, 15);
    discoLight.position.y = 3;
    group.add(discoLight);

    // Store for animation
    group.userData.discoBall = ball;
    group.userData.discoBallLight = discoLight;
}

function createLaser(group) {
    // Ceiling mount bracket
    const mount = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.3, 1.2),
        materials.darkMetal
    );
    mount.position.y = 6;
    group.add(mount);
    
    // Hanging rod
    const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 1, 8),
        materials.darkMetal
    );
    rod.position.y = 5.35;
    group.add(rod);
    
    // Main fixture body (moving head light style)
    const fixtureBody = new THREE.Group();
    fixtureBody.position.y = 4.5;
    group.add(fixtureBody);
    
    // Yoke arms
    const yokeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.3 });
    const leftYoke = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), yokeMat);
    leftYoke.position.set(-0.5, 0, 0);
    fixtureBody.add(leftYoke);
    const rightYoke = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), yokeMat);
    rightYoke.position.set(0.5, 0, 0);
    fixtureBody.add(rightYoke);
    
    // Light head (rotatable part)
    const lightHead = new THREE.Group();
    lightHead.position.y = -0.3;
    fixtureBody.add(lightHead);
    
    // Head housing
    const headHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.6, 0.8, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 })
    );
    headHousing.rotation.x = Math.PI / 2;
    lightHead.add(headHousing);
    
    // Lens (glowing)
    const lensMat = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.9
    });
    const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.45, 16),
        lensMat
    );
    lens.position.z = 0.41;
    lightHead.add(lens);
    
    // Create single main beam coming FROM the head
    const beamColors = [0xff00ff, 0x00ffff, 0xff0066, 0x00ff00, 0xff6600];
    const beams = [];
    
    // Main beam - comes directly from lens
    const beamMat = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    
    // Cone beam starting at lens and going outward
    const beam = new THREE.Mesh(
        new THREE.ConeGeometry(2.5, 10, 16, 1, true),
        beamMat
    );
    // Position so cone starts at lens (z=0.41) and extends outward
    beam.position.z = 5.5; // Center of cone, extends from ~0.5 to ~10.5
    beam.rotation.x = Math.PI / 2; // Point forward (along Z axis)
    
    beam.userData.baseRotation = 0;
    beam.userData.colorIndex = 0;
    beam.userData.beamMat = beamMat;
    beams.push(beam);
    lightHead.add(beam);
    
    // Store references for animation
    group.userData.laserBeams = beams;
    group.userData.lightHead = lightHead;
    group.userData.lensMat = lensMat;
    group.userData.fixtureBody = fixtureBody;
    group.userData.beamColors = beamColors;
    group.userData.isLaser = true;
    
    // Spotlight (actual light)
    const spotlight = new THREE.SpotLight(0xff00ff, 2, 20, Math.PI / 6, 0.5, 1);
    spotlight.position.set(0, 0, 0.5);
    spotlight.target.position.set(0, -10, 5);
    lightHead.add(spotlight);
    lightHead.add(spotlight.target);
    group.userData.spotlight = spotlight;
    
    // Point light for glow effect
    const glowLight = new THREE.PointLight(0xff00ff, 0.5, 8);
    glowLight.position.y = 4;
    group.add(glowLight);
    group.userData.glowLight = glowLight;
}

function createStatue(group) {
    // Base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    base.position.y = 0.25;
    group.add(base);

    // Pedestal
    const pedestal = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 2, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    pedestal.position.y = 1.5;
    group.add(pedestal);

    // Trophy/statue
    const trophy = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 2.5, 6),
        new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.9,
            roughness: 0.1
        })
    );
    trophy.position.y = 4;
    trophy.castShadow = true;
    group.add(trophy);

    // Spotlight
    const spotlight = new THREE.PointLight(0xffd700, 1, 8);
    spotlight.position.y = 6;
    group.add(spotlight);
}

function createFountain(group) {
    // Base pool
    const pool = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3.5, 0.8, 32),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    pool.position.y = 0.4;
    group.add(pool);

    // Water
    const water = new THREE.Mesh(
        new THREE.CylinderGeometry(2.8, 2.8, 0.2, 32),
        new THREE.MeshStandardMaterial({
            color: 0x4fc3f7,
            transparent: true,
            opacity: 0.7
        })
    );
    water.position.y = 0.9;
    group.add(water);

    // Center column
    const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 3, 16),
        new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.8,
            roughness: 0.2
        })
    );
    column.position.y = 2.3;
    group.add(column);

    // Champagne bottle on top
    const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.3, 1.5, 16),
        new THREE.MeshStandardMaterial({
            color: 0x2e7d32,
            metalness: 0.5,
            roughness: 0.3
        })
    );
    bottle.position.y = 4.5;
    group.add(bottle);

    // Light
    const fountainLight = new THREE.PointLight(0x4fc3f7, 1, 8);
    fountainLight.position.y = 1;
    group.add(fountainLight);
}

function createStage(group) {
    // Main platform
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(12, 1.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    platform.position.y = 0.75;
    platform.castShadow = true;
    platform.receiveShadow = true;
    group.add(platform);

    // Stage edge lights
    const edgeLight = new THREE.Mesh(
        new THREE.BoxGeometry(12, 0.2, 0.2),
        new THREE.MeshStandardMaterial({
            color: 0xff00ff,
            emissive: 0xff00ff,
            emissiveIntensity: 1
        })
    );
    edgeLight.position.set(0, 0.1, 4);
    group.add(edgeLight);

    // Back curtain
    const curtain = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 6),
        new THREE.MeshStandardMaterial({ 
            color: 0x8b0000,
            side: THREE.DoubleSide
        })
    );
    curtain.position.set(0, 4.5, -3.9);
    group.add(curtain);

    // Spotlights
    for (let i = -1; i <= 1; i++) {
        const spotLight = new THREE.SpotLight(0xffffff, 1, 15, Math.PI / 6, 0.5);
        spotLight.position.set(i * 4, 8, 2);
        spotLight.target.position.set(i * 2, 0, 0);
        group.add(spotLight);
        group.add(spotLight.target);
    }
}

function createVIPArea(group) {
    // Raised platform
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(10, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x2d2d2d })
    );
    platform.position.y = 0.25;
    platform.receiveShadow = true;
    group.add(platform);

    // Velvet rope posts
    const postMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.8,
        roughness: 0.2
    });

    for (let i = -1; i <= 1; i += 2) {
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 2, 16),
            postMat
        );
        post.position.set(i * 4, 1.25, 4);
        group.add(post);
    }

    // Rope
    const rope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x8b0000 })
    );
    rope.rotation.z = Math.PI / 2;
    rope.position.set(0, 1.8, 4);
    group.add(rope);

    // VIP sign (glowing)
    const signLight = new THREE.PointLight(0xffd700, 1, 6);
    signLight.position.set(0, 3, 4);
    group.add(signLight);

    // Couch
    const couch = new THREE.Mesh(
        new THREE.BoxGeometry(6, 1.5, 2.5),
        new THREE.MeshStandardMaterial({ color: 0x4a148c })
    );
    couch.position.set(0, 1, -2);
    couch.castShadow = true;
    group.add(couch);

    // Coffee table
    const table = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.8, 1.5),
        materials.chrome
    );
    table.position.set(0, 0.9, 1);
    group.add(table);
}

function createAquarium(group) {
    // Glass tank
    const tank = new THREE.Mesh(
        new THREE.BoxGeometry(8, 5, 3),
        new THREE.MeshStandardMaterial({
            color: 0x4fc3f7,
            transparent: true,
            opacity: 0.3
        })
    );
    tank.position.y = 3;
    group.add(tank);

    // Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const framePositions = [
        [0, 0.25, 0, 8.2, 0.5, 3.2],
        [0, 5.75, 0, 8.2, 0.5, 3.2],
        [-4.1, 3, 0, 0.2, 5, 3.2],
        [4.1, 3, 0, 0.2, 5, 3.2]
    ];

    framePositions.forEach(([x, y, z, w, h, d]) => {
        const frame = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            frameMat
        );
        frame.position.set(x, y, z);
        group.add(frame);
    });

    // Interior light
    const aquaLight = new THREE.PointLight(0x4fc3f7, 1.5, 10);
    aquaLight.position.set(0, 3, 0);
    group.add(aquaLight);

    // Decorative coral/rocks
    const coralMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b });
    for (let i = 0; i < 3; i++) {
        const coral = new THREE.Mesh(
            new THREE.ConeGeometry(0.3, 1, 5),
            coralMat
        );
        coral.position.set((i - 1) * 2, 1.2, 0);
        group.add(coral);
    }
}

function createHelipad(group) {
    // Platform
    const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(6, 6, 0.5, 32),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    platform.position.y = 0.25;
    platform.receiveShadow = true;
    group.add(platform);

    // H marking
    const hMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 3), hMat);
    hBar1.position.set(-1, 0.55, 0);
    group.add(hBar1);

    const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 3), hMat);
    hBar2.position.set(1, 0.55, 0);
    group.add(hBar2);

    const hBar3 = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.5), hMat);
    hBar3.position.set(0, 0.55, 0);
    group.add(hBar3);

    // Circle marking
    const circle = new THREE.Mesh(
        new THREE.RingGeometry(4.5, 5, 32),
        new THREE.MeshStandardMaterial({ color: 0xffff00, side: THREE.DoubleSide })
    );
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.52;
    group.add(circle);

    // Landing lights
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const light = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0x00ff00,
                emissive: 0x00ff00,
                emissiveIntensity: 1
            })
        );
        light.position.set(Math.cos(angle) * 5.5, 0.5, Math.sin(angle) * 5.5);
        group.add(light);
    }

    // Beacon light
    const beacon = new THREE.PointLight(0x00ff00, 1, 15);
    beacon.position.y = 2;
    group.add(beacon);
}

// ============== FLOOR TILES ==============
function createFloorTile(group, color, style) {
    const size = 4;
    let mat;
    
    switch(style) {
        case 'checker':
            // Create checker pattern
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    const isWhite = (i + j) % 2 === 0;
                    const tile = new THREE.Mesh(
                        new THREE.BoxGeometry(1, 0.1, 1),
                        new THREE.MeshStandardMaterial({ color: isWhite ? 0xffffff : 0x111111 })
                    );
                    tile.position.set(i - 1.5, 0.05, j - 1.5);
                    tile.receiveShadow = true;
                    group.add(tile);
                }
            }
            return;
        case 'disco':
        case 'neon':
        case 'hologram':
            mat = new THREE.MeshStandardMaterial({ 
                color: color, 
                emissive: color, 
                emissiveIntensity: 0.5 
            });
            break;
        case 'lava':
            mat = new THREE.MeshStandardMaterial({ 
                color: 0xff4500, 
                emissive: 0xff2200, 
                emissiveIntensity: 0.8 
            });
            break;
        case 'galaxy':
            mat = new THREE.MeshStandardMaterial({ 
                color: 0x191970, 
                emissive: 0x4400ff, 
                emissiveIntensity: 0.3 
            });
            break;
        case 'gold':
            mat = new THREE.MeshStandardMaterial({ 
                color: 0xffd700, 
                metalness: 0.8, 
                roughness: 0.2 
            });
            break;
        case 'marble':
            mat = new THREE.MeshStandardMaterial({ 
                color: 0xf5f5f5, 
                metalness: 0.1, 
                roughness: 0.3 
            });
            break;
        default:
            mat = new THREE.MeshStandardMaterial({ color: color });
    }
    
    const tile = new THREE.Mesh(
        new THREE.BoxGeometry(size, 0.1, size),
        mat
    );
    tile.position.y = 0.28; // Raised above platform
    tile.receiveShadow = true;
    group.add(tile);
    
    // Add border
    const border = new THREE.Mesh(
        new THREE.BoxGeometry(size + 0.1, 0.05, size + 0.1),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    border.position.y = 0.22; // Raised above platform
    group.add(border);
}

// ============== NEW FURNITURE ==============
function createSofa(group) {
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a0080 });
    
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 2), baseMat);
    seat.position.set(0, 0.5, 0);
    group.add(seat);
    
    // Back
    const back = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 0.4), baseMat);
    back.position.set(0, 1.1, -0.8);
    group.add(back);
    
    // Arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 2), baseMat);
    armL.position.set(-1.8, 0.8, 0);
    group.add(armL);
    
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 2), baseMat);
    armR.position.set(1.8, 0.8, 0);
    group.add(armR);
}

function createBarstool(group) {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    
    // Seat
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.15, 16), seatMat);
    seat.position.y = 1.8;
    group.add(seat);
    
    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), metalMat);
    pole.position.y = 1;
    group.add(pole);
    
    // Base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.1, 16), metalMat);
    base.position.y = 0.05;
    group.add(base);
    
    // Footrest
    const footrest = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 16), metalMat);
    footrest.rotation.x = Math.PI / 2;
    footrest.position.y = 0.6;
    group.add(footrest);
}

function createLoungeChair(group) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x2d1b4e });
    
    // Base cushion (angled)
    const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.4, 4), mat);
    base.position.set(0, 0.5, 0);
    base.rotation.x = -0.1;
    group.add(base);
    
    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.4), mat);
    back.position.set(0, 0.8, -1.8);
    back.rotation.x = -0.4;
    group.add(back);
}

function createBeanBag(group) {
    const mat = new THREE.MeshStandardMaterial({ color: 0xff6600 });
    
    const bag = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat);
    bag.scale.set(1, 0.6, 1);
    bag.position.y = 0.6;
    group.add(bag);
}

function createNeonSign(group) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const neonMat = new THREE.MeshStandardMaterial({ 
        color: 0xff00ff, 
        emissive: 0xff00ff, 
        emissiveIntensity: 1 
    });
    
    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.1), frameMat);
    frame.position.y = 2.5;
    group.add(frame);
    
    // Neon tubes (CLUB text approximation)
    const tubeGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    for (let i = 0; i < 4; i++) {
        const tube = new THREE.Mesh(tubeGeo, neonMat);
        tube.position.set(-1 + i * 0.7, 2.5, 0.1);
        group.add(tube);
    }
    
    // Glow light
    const light = new THREE.PointLight(0xff00ff, 1, 5);
    light.position.set(0, 2.5, 0.5);
    group.add(light);
}

function createPalmTree(group) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    
    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 8), trunkMat);
    trunk.position.y = 1.5;
    group.add(trunk);
    
    // Leaves
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 2), leafMat);
        leaf.position.set(Math.cos(angle) * 0.5, 3.2, Math.sin(angle) * 0.5);
        leaf.rotation.set(-0.3, angle, 0);
        group.add(leaf);
    }
}

function createRopeBarrier(group) {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
    
    // Posts
    for (let i = 0; i < 2; i++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.2, 16), postMat);
        post.position.set(i * 2 - 1, 0.6, 0);
        group.add(post);
        
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), postMat);
        top.position.set(i * 2 - 1, 1.25, 0);
        group.add(top);
    }
    
    // Rope (curved)
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), ropeMat);
    rope.rotation.z = Math.PI / 2;
    rope.position.set(0, 1, 0);
    group.add(rope);
}

function createChampagneTower(group) {
    const glassMat = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.5 
    });
    const champMat = new THREE.MeshStandardMaterial({ color: 0xffd700 });
    
    // Table
    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 16), materials.chrome);
    table.position.y = 1;
    group.add(table);
    
    // Glasses pyramid
    const levels = [9, 4, 1];
    let y = 1.2;
    levels.forEach((count, level) => {
        const rows = Math.sqrt(count);
        for (let i = 0; i < count; i++) {
            const glass = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 8), glassMat);
            const x = (i % rows - rows/2 + 0.5) * 0.35;
            const z = (Math.floor(i / rows) - rows/2 + 0.5) * 0.35;
            glass.position.set(x, y, z);
            group.add(glass);
        }
        y += 0.35;
    });
}

function createIceSculpture(group) {
    const iceMat = new THREE.MeshStandardMaterial({ 
        color: 0xaaddff, 
        transparent: true, 
        opacity: 0.7,
        metalness: 0.1,
        roughness: 0.1
    });
    
    // Abstract sculpture shape
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), iceMat);
    base.position.y = 0.15;
    group.add(base);
    
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.5, 6), iceMat);
    body.position.y = 1.5;
    group.add(body);
    
    const top = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), iceMat);
    top.position.y = 3;
    group.add(top);
}

function createFirePit(group) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const fireMat = new THREE.MeshStandardMaterial({ 
        color: 0xff4500, 
        emissive: 0xff2200, 
        emissiveIntensity: 1 
    });
    
    // Stone ring
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.3, 8, 16), stoneMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    group.add(ring);
    
    // Fire (animated sphere)
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 8), fireMat);
    fire.position.y = 0.8;
    group.add(fire);
    
    // Light
    const fireLight = new THREE.PointLight(0xff4500, 2, 8);
    fireLight.position.y = 1;
    group.add(fireLight);
}

function createPhotoBooth(group) {
    const boothMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
    const curtainMat = new THREE.MeshStandardMaterial({ color: 0x4a0000 });
    
    // Frame
    const back = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.1), boothMat);
    back.position.set(0, 1.5, -1);
    group.add(back);
    
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 2), boothMat);
    left.position.set(-1.5, 1.5, 0);
    group.add(left);
    
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 2), boothMat);
    right.position.set(1.5, 1.5, 0);
    group.add(right);
    
    // Curtain
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.5, 0.05), curtainMat);
    curtain.position.set(0, 1.5, 0.9);
    group.add(curtain);
    
    // Flash light
    const flash = new THREE.PointLight(0xffffff, 0.5, 4);
    flash.position.set(0, 2.5, 0);
    group.add(flash);
}

function createThrone(group) {
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
    const velvetMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
    
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 2), velvetMat);
    seat.position.y = 1;
    group.add(seat);
    
    // Back (tall)
    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.3), velvetMat);
    back.position.set(0, 2.25, -0.85);
    group.add(back);
    
    // Gold frame
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 0.4), goldMat);
    frameTop.position.set(0, 3.6, -0.85);
    group.add(frameTop);
    
    // Crown decoration
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 5), goldMat);
    crown.position.set(0, 4, -0.85);
    group.add(crown);
    
    // Arms
    for (let i = -1; i <= 1; i += 2) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 2), goldMat);
        arm.position.set(i * 1.1, 1.4, 0);
        group.add(arm);
    }
}

function createLEDWall(group) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const screenMat = new THREE.MeshStandardMaterial({ 
        color: 0x0088ff, 
        emissive: 0x0044ff, 
        emissiveIntensity: 0.5 
    });
    
    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6, 4, 0.2), frameMat);
    frame.position.y = 2.5;
    group.add(frame);
    
    // Screen
    const screen = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.6, 0.1), screenMat);
    screen.position.set(0, 2.5, 0.1);
    group.add(screen);
    
    // Glow
    const light = new THREE.PointLight(0x0088ff, 1, 8);
    light.position.set(0, 2.5, 2);
    group.add(light);
}

function createSmokeMachine(group) {
    const machineMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
    
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1), machineMat);
    body.position.y = 0.4;
    group.add(body);
    
    // Nozzle
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.4, 8), nozzleMat);
    nozzle.position.set(0, 0.9, 0.4);
    nozzle.rotation.x = -0.3;
    group.add(nozzle);
    
    // Control panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), 
        new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.3 })
    );
    panel.position.set(0, 0.5, 0.53);
    group.add(panel);
}

// ===================== NEW CLUB LIGHTS =====================

function createMultiLaser(group) {
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.2 });
    
    // Ceiling mount truss (T-bar style)
    const truss = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 0.15), darkMetal);
    truss.position.y = 5.9;
    group.add(truss);
    
    // Center support rod
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), darkMetal);
    rod.position.y = 5.6;
    group.add(rod);
    
    // Main control box
    const controlBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.4, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
    );
    controlBox.position.y = 5.2;
    group.add(controlBox);
    
    // LED display on control box
    const display = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.15, 0.05),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    display.position.set(0.3, 5.25, 0.43);
    group.add(display);
    
    // Create 5 laser heads spread across the truss
    const laserColors = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0x00ffff];
    const laserHeads = [];
    const beams = [];
    
    for (let i = 0; i < 5; i++) {
        const xPos = (i - 2) * 0.8;
        const color = laserColors[i];
        
        // Create a pivot point for each laser unit at truss level
        const laserUnit = new THREE.Group();
        laserUnit.position.set(xPos, 5.75, 0);
        group.add(laserUnit);
        
        // Hanging arm from pivot
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), darkMetal);
        arm.position.y = -0.2;
        laserUnit.add(arm);
        
        // Laser head housing at bottom of arm
        const head = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.13, 0.18, 12),
            new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
        );
        head.position.y = -0.5;
        laserUnit.add(head);
        
        // Glowing lens at bottom of head
        const lens = new THREE.Mesh(
            new THREE.CircleGeometry(0.08, 16),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.95 })
        );
        lens.position.y = -0.6;
        lens.rotation.x = -Math.PI / 2; // Face down
        laserUnit.add(lens);
        
        // Laser beam - simple cylinder from head to floor
        const beamMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.08, // Very low for realism
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        
        // Cylinder beam: BIGGER - starts at head (-0.6), goes down 5 units
        const beamLength = 5;
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.8, beamLength, 12, 1, true), // Bigger spread
            beamMat
        );
        beam.position.y = -0.6 - beamLength / 2; // Center of beam below head
        beam.userData.phaseOffset = i * 0.4;
        beams.push(beam);
        laserUnit.add(beam);
        
        laserHeads.push(laserUnit);
    }
    
    group.userData.isMultiLaser = true;
    group.userData.laserBeams = beams;
    group.userData.laserHeads = laserHeads;
}

function createStrobe(group) {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.9, roughness: 0.2 });
    
    // Ceiling mount bracket
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), metalMat);
    mount.position.y = 5.9;
    group.add(mount);
    
    // Hanging chain (simplified as cylinder)
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), metalMat);
    chain.position.y = 5.5;
    group.add(chain);
    
    // Main strobe housing (deeper for one-way design)
    const housing = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.6, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8 })
    );
    housing.position.y = 5.0;
    group.add(housing);
    
    // Back panel (solid black)
    const backPanel = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.5, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
    );
    backPanel.position.set(0, 5.0, -0.43);
    group.add(backPanel);
    
    // Strobe flash panel (FRONT ONLY - one way)
    const flashMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.5 
    });
    
    const flashFront = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.05), flashMat);
    flashFront.position.set(0, 5.0, 0.43);
    group.add(flashFront);
    
    // Reflector behind flash panel
    const reflector = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.35, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 })
    );
    reflector.position.set(0, 5.0, 0.3);
    group.add(reflector);
    
    // Heat vents on sides
    for (let i = -1; i <= 1; i += 2) {
        const vent = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.4, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        vent.position.set(i * 0.63, 5.0, 0);
        group.add(vent);
    }
    
    // Power indicator LED
    const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    led.position.set(0.5, 5.25, 0.41);
    group.add(led);
    
    // Strobe spotlight (one direction, MUCH brighter)
    const strobeLight = new THREE.SpotLight(0xffffff, 0, 25, Math.PI / 3, 0.3, 1);
    strobeLight.position.set(0, 5.0, 0.5);
    strobeLight.target.position.set(0, 0, 5);
    group.add(strobeLight);
    group.add(strobeLight.target);
    
    group.userData.isStrobe = true;
    group.userData.strobeLight = strobeLight;
    group.userData.flashPanels = [flashFront];
    group.userData.flashMat = flashMat;
}

function createEffectsLight(group) {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.2 });
    
    // Ceiling mount plate
    const mountPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), metalMat);
    mountPlate.position.y = 5.95;
    group.add(mountPlate);
    
    // Articulated arm segments
    const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), metalMat);
    arm1.position.y = 5.45;
    group.add(arm1);
    
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), metalMat);
    joint.position.y = 5.0;
    group.add(joint);
    
    const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), metalMat);
    arm2.position.y = 4.6;
    arm2.rotation.z = 0.3;
    group.add(arm2);
    
    // Effects light head (flower/derby style)
    const headGroup = new THREE.Group();
    headGroup.position.y = 4.1;
    group.add(headGroup);
    
    // Main body - dome shape
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
    );
    dome.rotation.x = Math.PI;
    headGroup.add(dome);
    
    // Multi-colored lens segments (like a derby light)
    const lensColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    const lenses = [];
    
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const lensMat = new THREE.MeshBasicMaterial({ 
            color: lensColors[i], 
            transparent: true, 
            opacity: 0.8 
        });
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), lensMat);
        lens.position.set(Math.cos(angle) * 0.3, -0.1, Math.sin(angle) * 0.3);
        lens.rotation.x = Math.PI / 2;
        lens.userData.color = lensColors[i];
        lenses.push(lens);
        headGroup.add(lens);
    }
    
    // Center lens
    const centerLens = new THREE.Mesh(
        new THREE.CircleGeometry(0.15, 16),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
    );
    centerLens.position.y = -0.15;
    centerLens.rotation.x = Math.PI / 2;
    headGroup.add(centerLens);
    
    // Multiple colored beams projecting down
    const beams = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const beamMat = new THREE.MeshBasicMaterial({
            color: lensColors[i],
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(
            new THREE.ConeGeometry(0.8, 6, 8, 1, true),
            beamMat
        );
        beam.position.set(Math.cos(angle) * 0.3, -3.2, Math.sin(angle) * 0.3);
        beam.userData.angle = angle;
        beam.userData.colorIndex = i;
        beams.push(beam);
        headGroup.add(beam);
    }
    
    // Point lights for effect
    const light = new THREE.PointLight(0xffffff, 1, 10);
    light.position.y = -0.5;
    headGroup.add(light);
    
    group.userData.isEffectsLight = true;
    group.userData.effectsHead = headGroup;
    group.userData.effectsBeams = beams;
    group.userData.effectsLenses = lenses;
}

function createWallLight(group) {
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.9, roughness: 0.3 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.1 });
    
    // Wall mount bracket (decorative back plate)
    const backPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 })
    );
    backPlate.position.set(0, 2.5, -0.05);
    group.add(backPlate);
    
    // Decorative frame
    const frameGeo = new THREE.BoxGeometry(0.7, 0.9, 0.05);
    const frame = new THREE.Mesh(frameGeo, chromeMat);
    frame.position.set(0, 2.5, 0);
    group.add(frame);
    
    // Main light housing
    const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.4, 12),
        metalMat
    );
    housing.position.set(0, 2.5, 0.25);
    housing.rotation.x = Math.PI / 2;
    group.add(housing);
    
    // Glass dome cover
    const domeMat = new THREE.MeshStandardMaterial({
        color: 0xaaddff,
        transparent: true,
        opacity: 0.4,
        metalness: 0.2,
        roughness: 0.1
    });
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        domeMat
    );
    dome.position.set(0, 2.5, 0.45);
    dome.rotation.x = -Math.PI / 2;
    group.add(dome);
    
    // RGB LED ring inside
    const ringColors = [0xff0066, 0x00ffff, 0xff00ff];
    const ringMat = new THREE.MeshBasicMaterial({ 
        color: 0xff00ff, 
        transparent: true, 
        opacity: 0.8 
    });
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.03, 8, 16),
        ringMat
    );
    ring.position.set(0, 2.5, 0.35);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    
    // Center LED
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), ledMat);
    led.position.set(0, 2.5, 0.4);
    group.add(led);
    
    // Accent lights above and below
    const accentMat = new THREE.MeshBasicMaterial({ 
        color: 0xff00ff, 
        transparent: true, 
        opacity: 0.6 
    });
    
    const accentUp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.1), accentMat);
    accentUp.position.set(0, 3.0, 0.1);
    group.add(accentUp);
    
    const accentDown = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.1), accentMat);
    accentDown.position.set(0, 2.0, 0.1);
    group.add(accentDown);
    
    // Light source - BRIGHTER
    const wallLight = new THREE.PointLight(0xff00ff, 8, 15);
    wallLight.position.set(0, 2.5, 1.5);
    group.add(wallLight);
    
    // Uplight and downlight spots - BRIGHTER
    const spotUp = new THREE.SpotLight(0xff00ff, 5, 10, Math.PI / 4, 0.3);
    spotUp.position.set(0, 2.5, 0.3);
    spotUp.target.position.set(0, 6, 0);
    group.add(spotUp);
    group.add(spotUp.target);
    
    const spotDown = new THREE.SpotLight(0xff00ff, 5, 10, Math.PI / 4, 0.3);
    spotDown.position.set(0, 2.5, 0.3);
    spotDown.target.position.set(0, 0, 0);
    group.add(spotDown);
    group.add(spotDown.target);
    
    group.userData.isWallLight = true;
    group.userData.wallLight = wallLight;
    group.userData.ringMat = ringMat;
    group.userData.ledMat = ledMat;
    group.userData.accentMats = [accentMat];
}

function createMovingHead(group) {
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.2 });
    const yokeMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
    
    // Ceiling mount
    const mount = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.2), darkMetal);
    mount.position.y = 5.9;
    group.add(mount);
    
    // Base unit
    const base = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), darkMetal);
    base.position.y = 5.7;
    group.add(base);
    
    // Yoke (U-shape holder that pans)
    const yoke = new THREE.Group();
    yoke.position.y = 5.5;
    group.add(yoke);
    
    const yokeL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), yokeMat);
    yokeL.position.set(-0.5, -0.3, 0);
    yoke.add(yokeL);
    
    const yokeR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1, 0.15), yokeMat);
    yokeR.position.set(0.5, -0.3, 0);
    yoke.add(yokeR);
    
    // Head (the light source that tilts)
    const head = new THREE.Group();
    head.position.y = -0.8;
    yoke.add(head);
    
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.3), darkMetal);
    head.add(headMesh);
    
    // Lens face (emissive, random color)
    const colors = [0xffaa44, 0x44aaff, 0xff44aa, 0x44ffaa];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const lensMat = new THREE.MeshStandardMaterial({ 
        color: color, 
        emissive: color, 
        emissiveIntensity: 2 
    });
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1), lensMat);
    lens.position.z = 0.7;
    head.add(lens);
    
    // Spotlight
    const beamLight = new THREE.SpotLight(color, 8, 60, 0.4, 0.5, 1);
    beamLight.position.set(0, 0, 0.7);
    beamLight.target.position.set(0, 0, 15);
    head.add(beamLight);
    head.add(beamLight.target);
    
    // Volumetric cone beam
    const coneMat = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.06, 
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending 
    });
    const cone = new THREE.Mesh(
        new THREE.ConeGeometry(2.5, 25, 24, 1, true),
        coneMat
    );
    cone.rotation.x = -Math.PI / 2;
    cone.position.z = 13;
    head.add(cone);
    
    // Store for animation
    group.userData.isMovingHead = true;
    group.userData.yoke = yoke;
    group.userData.head = head;
    group.userData.beamLight = beamLight;
    group.userData.lensMat = lensMat;
    group.userData.coneMat = coneMat;
    group.userData.lightColor = color;
}
