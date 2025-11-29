// Staff System
import * as THREE from 'three';
import { ui } from './ui.js';
import { game } from './game.js';

// Staff positions - fallback if no furniture found
const STAFF_POSITIONS = {
    bartender: [
        { x: -15, z: -20 }, { x: -12, z: -20 }, { x: -9, z: -20 }, 
        { x: -6, z: -20 }, { x: -3, z: -20 }
    ],
    dj: [
        { x: 0, z: -24 }, { x: 3, z: -24 }, { x: -3, z: -24 }
    ],
    bouncer: [
        { x: -6, z: 28 }, { x: 6, z: 28 }, { x: -10, z: 32 }, { x: 10, z: 32 }
    ],
    promoter: [
        { x: -15, z: 40 }, { x: 15, z: 40 }, { x: 0, z: 45 }
    ],
    manager: [
        { x: 18, z: -15 }, { x: 20, z: -18 }
    ]
};

// Map staff types to furniture types they work at
const STAFF_FURNITURE_MAP = {
    bartender: 'bar',
    dj: 'dj',
    manager: 'bar',  // Manager hangs around bar area
    bouncer: null,   // Bouncer stays at entrance
    promoter: null   // Promoter stays outside
};

// Offset positions for staff relative to their furniture
const STAFF_FURNITURE_OFFSET = {
    bartender: [
        { x: 0, z: 1.5 }, { x: 1.5, z: 1.5 }, { x: -1.5, z: 1.5 },
        { x: 2.5, z: 1.5 }, { x: -2.5, z: 1.5 }
    ],
    dj: [
        { x: 0, z: 1.2 }, { x: 1, z: 1.2 }, { x: -1, z: 1.2 }
    ],
    manager: [
        { x: 2, z: 0 }, { x: -2, z: 0 }
    ]
};

// Staff uniform colors
const STAFF_COLORS = {
    bartender: 0x000000,  // Black vest
    dj: 0x9900ff,         // Purple
    bouncer: 0x111111,    // Dark suit
    promoter: 0xff6600,   // Orange
    manager: 0x1a1a8a     // Navy blue
};

export const STAFF_TYPES = {
    bartender: {
        name: 'Bartender',
        icon: '🍸',
        baseCost: 500,
        costMultiplier: 1.5,
        maxCount: 5,
        effect: 'Auto-serves drinks (+$5/sec per bartender)',
        perks: [
            { level: 1, desc: 'Basic drink service' },
            { level: 2, desc: '+10% drink profits' },
            { level: 3, desc: '+20% drink profits' },
            { level: 4, desc: 'Premium cocktails unlocked' },
            { level: 5, desc: '+50% drink profits' }
        ]
    },
    dj: {
        name: 'DJ',
        icon: '🎧',
        baseCost: 800,
        costMultiplier: 1.8,
        maxCount: 3,
        effect: 'Increases hype (+2/sec per DJ)',
        perks: [
            { level: 1, desc: 'Basic beats' },
            { level: 2, desc: '+25% hype gain' },
            { level: 3, desc: 'Light show unlocked' }
        ]
    },
    bouncer: {
        name: 'Bouncer',
        icon: '💪',
        baseCost: 400,
        costMultiplier: 1.4,
        maxCount: 4,
        effect: 'Increases max capacity (+3 per bouncer)',
        perks: [
            { level: 1, desc: '+3 max guests' },
            { level: 2, desc: '+6 max guests' },
            { level: 3, desc: '+9 max guests' },
            { level: 4, desc: '+12 max guests, VIP handling' }
        ]
    },
    promoter: {
        name: 'Promoter',
        icon: '📢',
        baseCost: 600,
        costMultiplier: 1.6,
        maxCount: 3,
        effect: 'Faster guest arrivals (-15% spawn time)',
        perks: [
            { level: 1, desc: '-15% spawn time' },
            { level: 2, desc: '-30% spawn time' },
            { level: 3, desc: '-45% spawn time, celebrity chance +10%' }
        ]
    },
    manager: {
        name: 'Manager',
        icon: '👔',
        baseCost: 1500,
        costMultiplier: 2.0,
        maxCount: 2,
        effect: 'All staff 20% more effective',
        perks: [
            { level: 1, desc: '+20% staff efficiency' },
            { level: 2, desc: '+40% staff efficiency, auto-restock at 20%' }
        ]
    }
};

// Staff names pool - unique names for each role
const STAFF_NAMES = {
    bartender: [
        'Tony "The Mixer"', 'Scarlett Shaker', 'Jack Daniels Jr', 'Martini Mike', 
        'Cocktail Carlos', 'Whiskey Wendy', 'Bourbon Betty', 'Mojito Marco'
    ],
    dj: [
        'DJ Nova', 'DJ Pulse', 'DJ Thunderbolt', 'DJ Neon', 'DJ Blaze',
        'DJ Elektra', 'DJ Bassline', 'DJ Hypnotic'
    ],
    bouncer: [
        'Big Max', 'Bruno "The Wall"', 'Viktor Stone', 'Duke "Iron Fist"', 
        'Tank Thompson', 'Crusher Carlos', 'Rocky Reyes', 'The Gatekeeper'
    ],
    promoter: [
        'Sparkle Mia', 'Glitter Sofia', 'Starlight Luna', 'Neon Zara', 
        'Party Bella', 'Hype Hannah', 'Flash Fiona', 'Vibe Veronica'
    ],
    manager: [
        'Mr. Goldstein', 'Ms. Executive', 'Mr. VIP', 'The Boss', 
        'Ms. Prestige', 'Director Davis'
    ]
};

// Staff Entity - visible 3D character
class StaffEntity {
    constructor(scene, type, position, index = 0) {
        this.scene = scene;
        this.type = type;
        this.index = index;
        this.mesh = new THREE.Group();
        this.mesh.userData.isStaff = true;
        this.mesh.userData.staffEntity = this;
        
        // Generate name
        const names = STAFF_NAMES[type] || ['Staff'];
        this.name = names[index % names.length];
        
        // Stats
        this.morale = 80 + Math.random() * 20; // 80-100
        this.efficiency = 0.8 + Math.random() * 0.2; // 0.8-1.0
        this.tips = 0;
        this.shiftsWorked = Math.floor(Math.random() * 50);
        
        // ═══════════════════════════════════════════════════════════════
        // SIMS-STYLE STAFF CHARACTER SYSTEM
        // ═══════════════════════════════════════════════════════════════
        
        const uniformColor = STAFF_COLORS[type] || 0x333333;
        const skinTones = [0xffe0bd, 0xffcd94, 0xeac086, 0xd8a47f, 0xc68642, 0x8d5524];
        const skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];
        
        const skinMat = new THREE.MeshStandardMaterial({ 
            color: skinColor,
            roughness: 0.6,
            metalness: 0.1
        });
        const uniformMat = new THREE.MeshStandardMaterial({ 
            color: uniformColor,
            roughness: 0.4,
            metalness: 0.2
        });
        
        // Helper: Create capsule geometry - LOW POLY
        const createCapsule = (radius, height) => {
            return new THREE.CapsuleGeometry(radius, height, 4, 8);
        };
        
        // Hip pivot for body animation
        this.hip = new THREE.Group();
        this.hip.position.y = 2.0;
        this.mesh.add(this.hip);
        
        // ═══ TORSO (Simplified) ═══
        const torso = new THREE.Mesh(createCapsule(0.4, 0.8), uniformMat);
        torso.position.y = 0.4;
        torso.scale.z = 0.7;
        this.hip.add(torso);
        this.torso = torso;
        
        // ═══ HEAD (Simplified) ═══
        this.headPivot = new THREE.Group();
        this.headPivot.position.y = 1.0;
        this.hip.add(this.headPivot);
        
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), skinMat);
        head.position.y = 0.25;
        this.headPivot.add(head);
        
        // Hair
        const hairColors = [0x1a1a1a, 0x4a2f20, 0x8b4513];
        const hairMat = new THREE.MeshStandardMaterial({ 
            color: hairColors[Math.floor(Math.random() * hairColors.length)]
        });
        const hair = new THREE.Mesh(
            new THREE.SphereGeometry(0.32, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5),
            hairMat
        );
        hair.position.y = 0.32;
        this.headPivot.add(hair);
        
        // ═══ LEGS (Simplified) ═══
        const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e });
        
        this.leftLegPivot = new THREE.Group();
        this.leftLegPivot.position.set(-0.15, -0.15, 0);
        this.hip.add(this.leftLegPivot);
        const leftLeg = new THREE.Mesh(createCapsule(0.1, 0.8), legMat);
        leftLeg.position.y = -0.55;
        this.leftLegPivot.add(leftLeg);
        
        this.rightLegPivot = new THREE.Group();
        this.rightLegPivot.position.set(0.15, -0.15, 0);
        this.hip.add(this.rightLegPivot);
        const rightLeg = new THREE.Mesh(createCapsule(0.1, 0.8), legMat);
        rightLeg.position.y = -0.55;
        this.rightLegPivot.add(rightLeg);
        
        // ═══ ARMS (Simplified) ═══
        this.leftArmPivot = new THREE.Group();
        this.leftArmPivot.position.set(-0.42, 0.7, 0);
        this.hip.add(this.leftArmPivot);
        const leftArm = new THREE.Mesh(createCapsule(0.07, 0.5), skinMat);
        leftArm.position.y = -0.35;
        this.leftArmPivot.add(leftArm);
        
        this.rightArmPivot = new THREE.Group();
        this.rightArmPivot.position.set(0.42, 0.7, 0);
        this.hip.add(this.rightArmPivot);
        const rightArm = new THREE.Mesh(createCapsule(0.07, 0.5), skinMat);
        rightArm.position.y = -0.35;
        this.rightArmPivot.add(rightArm);
        
        // Type-specific accessories
        if (type === 'dj') {
            // Headphones on head pivot
            const headphones = new THREE.Mesh(
                new THREE.TorusGeometry(0.35, 0.06, 8, 16, Math.PI),
                new THREE.MeshStandardMaterial({ color: 0x222222 })
            );
            headphones.position.set(0, 0.45, 0);
            headphones.rotation.x = Math.PI / 2;
            this.headPivot.add(headphones);
            
            // Ear cups
            [-0.32, 0.32].forEach(x => {
                const cup = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.08, 0.08, 0.06, 8),
                    new THREE.MeshStandardMaterial({ color: 0x333333 })
                );
                cup.position.set(x, 0.28, 0);
                cup.rotation.z = Math.PI / 2;
                this.headPivot.add(cup);
            });
        } else if (type === 'bouncer') {
            // Sunglasses on head (wraparound style)
            const glassesMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
            const glassLeft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glassesMat);
            glassLeft.position.set(-0.1, 0.3, 0.28);
            glassLeft.scale.set(1.2, 0.6, 0.3);
            this.headPivot.add(glassLeft);
            
            const glassRight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glassesMat);
            glassRight.position.set(0.1, 0.3, 0.28);
            glassRight.scale.set(1.2, 0.6, 0.3);
            this.headPivot.add(glassRight);
        } else if (type === 'manager') {
            // Tie on torso (triangular)
            const tieMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
            const tieKnot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), tieMat);
            tieKnot.position.set(0, 0.9, 0.32);
            this.hip.add(tieKnot);
            
            const tieBody = new THREE.Mesh(
                new THREE.ConeGeometry(0.08, 0.4, 4),
                tieMat
            );
            tieBody.position.set(0, 0.6, 0.32);
            tieBody.rotation.z = Math.PI;
            this.hip.add(tieBody);
            
            // Clipboard (rounded)
            const clipboard = new THREE.Mesh(
                createCapsule(0.12, 0.25),
                new THREE.MeshStandardMaterial({ color: 0x8b4513 })
            );
            clipboard.position.y = -0.4;
            clipboard.scale.z = 0.2;
            this.leftArmPivot.add(clipboard);
        } else if (type === 'bartender') {
            // Bottle in hand (sleek)
            const bottleMat = new THREE.MeshStandardMaterial({ color: 0x228b22, metalness: 0.3 });
            const bottleBody = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8),
                bottleMat
            );
            bottleBody.position.y = -0.55;
            this.rightArmPivot.add(bottleBody);
            
            const bottleNeck = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.05, 0.1, 8),
                bottleMat
            );
            bottleNeck.position.y = -0.35;
            this.rightArmPivot.add(bottleNeck);
        } else if (type === 'promoter') {
            // Phone/tablet
            const phone = new THREE.Mesh(
                createCapsule(0.08, 0.15),
                new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 })
            );
            phone.position.y = -0.45;
            phone.scale.z = 0.15;
            this.rightArmPivot.add(phone);
            
            // Screen glow
            const screen = new THREE.Mesh(
                new THREE.PlaneGeometry(0.1, 0.12),
                new THREE.MeshBasicMaterial({ color: 0x00aaff })
            );
            screen.position.set(0, -0.45, 0.02);
            this.rightArmPivot.add(screen);
        }
        
        // Name tag on torso (pill shaped)
        const tagMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const tag = new THREE.Mesh(createCapsule(0.06, 0.12), tagMat);
        tag.position.set(0.25, 0.85, 0.32);
        tag.rotation.z = Math.PI / 2;
        tag.scale.z = 0.3;
        this.hip.add(tag);
        
        // Position
        this.mesh.position.set(position.x, 0, position.z);
        this.mesh.lookAt(0, 0, 0); // Face center
        
        this.animPhase = Math.random() * Math.PI * 2;
        
        scene.add(this.mesh);
    }
    
    update(time) {
        const t = time + this.animPhase;
        
        // ═══ FOLLOW FURNITURE POSITION ═══
        this.updatePositionFromFurniture();
        
        // Jump animation from tips/praise
        if (this.jumpAnim && this.jumpAnim > 0) {
            this.hip.position.y = 1.8 + Math.sin(this.jumpAnim * Math.PI) * 0.5;
            this.jumpAnim -= 0.05;
            if (this.jumpAnim <= 0) {
                this.hip.position.y = 1.8;
                this.jumpAnim = 0;
            }
            return;
        }
        
        if (this.type === 'dj') {
            // DJ - EPIC DJ ANIMATION!
            const beatPhase = Math.floor(t * 2) % 4; // 4-beat cycle
            
            // Body bounce to the beat
            this.hip.position.y = 1.8 + Math.abs(Math.sin(t * 8)) * 0.2;
            
            // Head bobbing intensely
            this.headPivot.rotation.y = Math.sin(t * 4) * 0.3;
            this.headPivot.rotation.x = Math.sin(t * 8) * 0.15 - 0.1;
            
            // Switch between actions
            if (beatPhase === 0) {
                // Scratch left turntable
                this.leftArmPivot.rotation.x = -1.2 + Math.sin(t * 20) * 0.4;
                this.leftArmPivot.rotation.z = 0.5;
                this.rightArmPivot.rotation.x = -0.8;
                this.rightArmPivot.rotation.z = -0.3;
            } else if (beatPhase === 1) {
                // Scratch right turntable
                this.rightArmPivot.rotation.x = -1.2 + Math.sin(t * 20) * 0.4;
                this.rightArmPivot.rotation.z = -0.5;
                this.leftArmPivot.rotation.x = -0.8;
                this.leftArmPivot.rotation.z = 0.3;
            } else if (beatPhase === 2) {
                // Hands up! Pump the crowd
                this.leftArmPivot.rotation.x = -2.8 + Math.sin(t * 6) * 0.3;
                this.leftArmPivot.rotation.z = 0.4;
                this.rightArmPivot.rotation.x = -2.8 + Math.sin(t * 6) * 0.3;
                this.rightArmPivot.rotation.z = -0.4;
                this.hip.position.y = 1.8 + Math.abs(Math.sin(t * 4)) * 0.3;
            } else {
                // Work the faders/mixer
                this.leftArmPivot.rotation.x = -1.0 + Math.sin(t * 8) * 0.2;
                this.leftArmPivot.rotation.z = 0.2;
                this.rightArmPivot.rotation.x = -1.0 + Math.cos(t * 8) * 0.2;
                this.rightArmPivot.rotation.z = -0.2;
            }
            
            // Body sway to the music
            this.hip.rotation.y = Math.sin(t * 2) * 0.15;
            this.hip.rotation.z = Math.sin(t * 4) * 0.05;
            
        } else if (this.type === 'bouncer') {
            // Bouncer - CHECKING PEOPLE AT ENTRANCE
            const checkCycle = Math.floor(t * 0.3) % 5; // 5-phase cycle
            
            if (checkCycle < 2) {
                // Arms crossed - intimidating stance
                this.leftArmPivot.rotation.x = -1.4;
                this.leftArmPivot.rotation.z = 0.5;
                this.rightArmPivot.rotation.x = -1.4;
                this.rightArmPivot.rotation.z = -0.5;
                // Look left and right scanning
                this.headPivot.rotation.y = Math.sin(t * 0.8) * 0.6;
                // Slight weight shift
                this.hip.position.x = Math.sin(t * 0.5) * 0.1;
            } else if (checkCycle === 2) {
                // Check ID - lean forward, arm extended
                this.rightArmPivot.rotation.x = -1.0;
                this.rightArmPivot.rotation.z = -0.2;
                this.leftArmPivot.rotation.x = -0.3;
                this.leftArmPivot.rotation.z = 0.2;
                // Lean forward to inspect
                this.hip.rotation.x = 0.15;
                this.headPivot.rotation.x = -0.2;
                this.headPivot.rotation.y = 0;
            } else if (checkCycle === 3) {
                // Point to entrance - you're in!
                this.rightArmPivot.rotation.x = -1.5;
                this.rightArmPivot.rotation.z = -0.8;
                this.leftArmPivot.rotation.x = -0.3;
                this.leftArmPivot.rotation.z = 0.3;
                this.headPivot.rotation.y = -0.4;
                this.hip.rotation.x = 0;
            } else {
                // Nod and reset
                this.headPivot.rotation.x = Math.sin(t * 4) * 0.2;
                this.leftArmPivot.rotation.x = -1.2;
                this.leftArmPivot.rotation.z = 0.4;
                this.rightArmPivot.rotation.x = -1.2;
                this.rightArmPivot.rotation.z = -0.4;
            }
            // Subtle breathing
            this.torso.scale.z = 1 + Math.sin(t * 1.5) * 0.02;
            
        } else if (this.type === 'bartender') {
            // Bartender - SERVING DRINKS TO CUSTOMERS
            const serveCycle = Math.floor(t * 0.5) % 6; // 6-phase cycle
            
            if (serveCycle === 0) {
                // Take order - lean toward customer
                this.hip.rotation.x = 0.15;
                this.headPivot.rotation.y = Math.sin(t) * 0.3;
                this.headPivot.rotation.x = -0.15;
                this.leftArmPivot.rotation.x = -0.5;
                this.rightArmPivot.rotation.x = -0.5;
            } else if (serveCycle === 1) {
                // Grab bottle from shelf - reach up
                this.rightArmPivot.rotation.x = -2.8;
                this.rightArmPivot.rotation.z = -0.3;
                this.leftArmPivot.rotation.x = -0.3;
                this.hip.rotation.x = 0;
                this.headPivot.rotation.x = -0.3;
            } else if (serveCycle === 2 || serveCycle === 3) {
                // Shake cocktail vigorously
                this.rightArmPivot.rotation.x = -2.5 + Math.sin(t * 20) * 0.4;
                this.rightArmPivot.rotation.z = 0.2 + Math.sin(t * 20) * 0.1;
                this.leftArmPivot.rotation.x = -2.3 + Math.sin(t * 20) * 0.4;
                this.leftArmPivot.rotation.z = -0.2;
                this.hip.position.y = 1.8 + Math.abs(Math.sin(t * 20)) * 0.08;
                this.headPivot.rotation.y = Math.sin(t * 10) * 0.1;
            } else if (serveCycle === 4) {
                // Pour drink - tilt forward
                this.rightArmPivot.rotation.x = -1.2;
                this.rightArmPivot.rotation.z = -0.5 + Math.sin(t * 3) * 0.2;
                this.leftArmPivot.rotation.x = -0.8;
                this.hip.rotation.x = 0.1;
            } else {
                // Slide drink to customer - push forward
                this.rightArmPivot.rotation.x = -0.8 - Math.sin(t * 2) * 0.3;
                this.rightArmPivot.rotation.z = 0;
                this.leftArmPivot.rotation.x = -0.3;
                this.hip.rotation.x = 0.05;
                // Smile/nod
                this.headPivot.rotation.x = Math.sin(t * 3) * 0.1;
            }
            this.hip.position.y = 1.8;
            
        } else if (this.type === 'promoter') {
            // Promoter - waving, handing out flyers energetically
            const promoPhase = Math.floor(t * 0.8) % 3;
            
            if (promoPhase === 0) {
                // Wave enthusiastically
                this.rightArmPivot.rotation.x = -2.8 + Math.sin(t * 8) * 0.5;
                this.rightArmPivot.rotation.z = 0.3 + Math.sin(t * 8) * 0.3;
                this.leftArmPivot.rotation.x = -0.5;
            } else if (promoPhase === 1) {
                // Hand out flyer - extend arm
                this.rightArmPivot.rotation.x = -1.2;
                this.rightArmPivot.rotation.z = -0.5;
                this.leftArmPivot.rotation.x = -0.8 + Math.sin(t * 2) * 0.2;
                this.hip.rotation.y = -0.3;
            } else {
                // Both arms up - excited!
                this.rightArmPivot.rotation.x = -2.5 + Math.sin(t * 6) * 0.3;
                this.rightArmPivot.rotation.z = -0.4;
                this.leftArmPivot.rotation.x = -2.5 + Math.sin(t * 6) * 0.3;
                this.leftArmPivot.rotation.z = 0.4;
            }
            
            // Bouncy energy
            this.hip.position.y = 1.8 + Math.abs(Math.sin(t * 5)) * 0.15;
            // Turn to "talk" to people
            this.headPivot.rotation.y = Math.sin(t * 2) * 0.5;
            this.hip.rotation.y = Math.sin(t * 1) * 0.25;
            // Walking in place
            this.leftLegPivot.rotation.x = Math.sin(t * 4) * 0.2;
            this.rightLegPivot.rotation.x = -Math.sin(t * 4) * 0.2;
            
        } else if (this.type === 'manager') {
            // Manager - supervising, checking clipboard, walking around
            const managePhase = Math.floor(t * 0.4) % 4;
            
            if (managePhase === 0) {
                // Check clipboard intently
                this.leftArmPivot.rotation.x = -1.8;
                this.leftArmPivot.rotation.z = 0.3;
                this.rightArmPivot.rotation.x = -1.5;
                this.rightArmPivot.rotation.z = -0.2;
                this.headPivot.rotation.x = -0.3;
                this.headPivot.rotation.y = 0;
            } else if (managePhase === 1) {
                // Look around surveying
                this.headPivot.rotation.y = Math.sin(t * 1.5) * 0.6;
                this.headPivot.rotation.x = 0;
                this.leftArmPivot.rotation.x = -1.5;
                this.rightArmPivot.rotation.x = -0.3;
            } else if (managePhase === 2) {
                // Point and give instructions
                this.rightArmPivot.rotation.x = -1.2;
                this.rightArmPivot.rotation.z = -0.6;
                this.leftArmPivot.rotation.x = -1.5;
                this.headPivot.rotation.y = -0.3;
            } else {
                // Nod approvingly
                this.headPivot.rotation.x = Math.sin(t * 4) * 0.15;
                this.headPivot.rotation.y = Math.sin(t * 0.5) * 0.3;
                this.rightArmPivot.rotation.x = -0.3;
            }
            
            // Subtle pacing
            this.leftLegPivot.rotation.x = Math.sin(t * 2) * 0.12;
            this.rightLegPivot.rotation.x = -Math.sin(t * 2) * 0.12;
            this.hip.position.y = 1.8 + Math.abs(Math.sin(t * 2)) * 0.02;
        }
    }
    
    getInfo() {
        const staffType = STAFF_TYPES[this.type];
        return {
            name: this.name,
            type: this.type,
            typeName: staffType.name,
            icon: staffType.icon,
            morale: Math.round(this.morale),
            efficiency: Math.round(this.efficiency * 100),
            tips: this.tips,
            shiftsWorked: this.shiftsWorked
        };
    }
    
    giveTip(amount) {
        this.tips += amount;
        this.morale = Math.min(100, this.morale + 5);
        this.efficiency = Math.min(1.0, this.efficiency + 0.02);
        
        // Visual feedback - jump animation
        this.jumpAnim = 1.0;
    }
    
    praise() {
        this.morale = Math.min(100, this.morale + 10);
        this.jumpAnim = 0.5;
    }
    
    getMoraleEmoji() {
        if (this.morale >= 90) return '😄';
        if (this.morale >= 70) return '🙂';
        if (this.morale >= 50) return '😐';
        return '😔';
    }
    
    // Update staff position to follow their assigned furniture
    updatePositionFromFurniture() {
        const furnitureType = STAFF_FURNITURE_MAP[this.type];
        if (!furnitureType || !game.furniture) return;
        
        // Find the furniture this staff works at
        const furniture = game.furniture.find(f => f.userData?.type === furnitureType);
        if (!furniture) return;
        
        // Get offset for this staff member
        const offsets = STAFF_FURNITURE_OFFSET[this.type];
        if (!offsets) return;
        
        const offset = offsets[this.index % offsets.length];
        
        // Calculate position relative to furniture with rotation
        const furnitureRotation = furniture.rotation.y;
        const rotatedX = offset.x * Math.cos(furnitureRotation) - offset.z * Math.sin(furnitureRotation);
        const rotatedZ = offset.x * Math.sin(furnitureRotation) + offset.z * Math.cos(furnitureRotation);
        
        const targetX = furniture.position.x + rotatedX;
        const targetZ = furniture.position.z + rotatedZ;
        
        // Smoothly move to target position
        this.mesh.position.x += (targetX - this.mesh.position.x) * 0.1;
        this.mesh.position.z += (targetZ - this.mesh.position.z) * 0.1;
        
        // Face the furniture
        const lookX = furniture.position.x - this.mesh.position.x;
        const lookZ = furniture.position.z - this.mesh.position.z;
        if (Math.abs(lookX) > 0.1 || Math.abs(lookZ) > 0.1) {
            const targetRotation = Math.atan2(lookX, lookZ);
            // Smooth rotation
            let diff = targetRotation - this.mesh.rotation.y;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.mesh.rotation.y += diff * 0.1;
        }
    }
    
    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
    }
}

// Show staff info popup
export function showStaffPopup(staffEntity, gameState) {
    const info = staffEntity.getInfo();
    
    // Remove existing popup
    const existing = document.getElementById('staff-popup');
    if (existing) existing.remove();
    
    const popup = document.createElement('div');
    popup.id = 'staff-popup';
    popup.className = 'staff-popup show';
    popup.innerHTML = `
        <div class="staff-popup-header">
            <span class="staff-popup-icon">${info.icon}</span>
            <span class="staff-popup-name">${info.name}</span>
            <button class="staff-popup-close" onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>
        <div class="staff-popup-role">${info.typeName}</div>
        <div class="staff-popup-stats">
            <div class="staff-stat">
                <span class="staff-stat-label">Morale</span>
                <span class="staff-stat-value">${staffEntity.getMoraleEmoji()} ${info.morale}%</span>
            </div>
            <div class="staff-stat">
                <span class="staff-stat-label">Efficiency</span>
                <span class="staff-stat-value">⚡ ${info.efficiency}%</span>
            </div>
            <div class="staff-stat">
                <span class="staff-stat-label">Tips Earned</span>
                <span class="staff-stat-value">💰 $${info.tips}</span>
            </div>
            <div class="staff-stat">
                <span class="staff-stat-label">Shifts</span>
                <span class="staff-stat-value">📅 ${info.shiftsWorked}</span>
            </div>
        </div>
        <div class="staff-popup-actions">
            <button class="staff-action-btn tip-btn" onclick="window.tipStaff('${staffEntity.name}')">
                💵 Tip $10
            </button>
            <button class="staff-action-btn praise-btn" onclick="window.praiseStaff('${staffEntity.name}')">
                👏 Praise
            </button>
        </div>
    `;
    document.body.appendChild(popup);
    
    // Position near center of screen
    popup.style.left = '50%';
    popup.style.top = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    
    // Auto-close after 10 seconds
    setTimeout(() => {
        if (popup.parentElement) popup.remove();
    }, 10000);
}

export class StaffManager {
    constructor() {
        this.staff = {
            bartenders: 0,
            djs: 0,
            bouncers: 0,
            promoters: 0,
            managers: 0
        };
        this.lastTick = 0;
        this.staffEntities = []; // Visible staff
        this.scene = null;
    }
    
    setScene(scene) {
        this.scene = scene;
    }

    loadStaff(staffData) {
        if (staffData) {
            this.staff = { ...this.staff, ...staffData };
        }
    }

    getHireCost(type) {
        const staffType = STAFF_TYPES[type];
        const currentCount = this.getCount(type);
        return Math.floor(staffType.baseCost * Math.pow(staffType.costMultiplier, currentCount));
    }

    getCount(type) {
        const key = type + 's';
        return this.staff[key] || 0;
    }

    canHire(type, cash) {
        const staffType = STAFF_TYPES[type];
        const currentCount = this.getCount(type);
        return currentCount < staffType.maxCount && cash >= this.getHireCost(type);
    }

    hire(type, gameState) {
        const cost = this.getHireCost(type);
        
        if (!this.canHire(type, gameState.cash)) {
            ui.notify("Can't hire right now!", "error");
            return false;
        }

        gameState.cash -= cost;
        const key = type + 's';
        this.staff[key]++;

        // Apply immediate effects
        if (type === 'bouncer') {
            gameState.maxVisitors += 3;
        }
        if (type === 'promoter') {
            gameState.spawnRate *= 0.85;
        }

        // Spawn visible staff entity
        this.spawnStaffEntity(type);

        ui.notify(`Hired ${STAFF_TYPES[type].name}!`, 'success');
        return true;
    }
    
    spawnStaffEntity(type) {
        if (!this.scene) return;
        
        const positions = STAFF_POSITIONS[type];
        const currentCount = this.staffEntities.filter(s => s.type === type).length;
        
        if (currentCount < positions.length) {
            const pos = positions[currentCount];
            const entity = new StaffEntity(this.scene, type, pos, currentCount);
            this.staffEntities.push(entity);
        }
    }
    
    getStaffByName(name) {
        return this.staffEntities.find(s => s.name === name);
    }
    
    tipStaff(name, amount, gameState) {
        const staff = this.getStaffByName(name);
        if (staff && gameState.cash >= amount) {
            gameState.cash -= amount;
            staff.giveTip(amount);
            ui.notify(`Tipped ${name} $${amount}! 💵`, 'success');
            return true;
        }
        return false;
    }
    
    praiseStaff(name) {
        const staff = this.getStaffByName(name);
        if (staff) {
            staff.praise();
            ui.notify(`${name} appreciated the praise! 👏`, 'success');
            return true;
        }
        return false;
    }
    
    // Recreate all staff entities (after load)
    recreateStaffEntities() {
        if (!this.scene) return;
        
        // Clear existing
        this.staffEntities.forEach(e => e.dispose());
        this.staffEntities = [];
        
        // Spawn based on current staff counts
        for (let i = 0; i < this.staff.bartenders; i++) {
            this.spawnStaffEntity('bartender');
        }
        for (let i = 0; i < this.staff.djs; i++) {
            this.spawnStaffEntity('dj');
        }
        for (let i = 0; i < this.staff.bouncers; i++) {
            this.spawnStaffEntity('bouncer');
        }
        for (let i = 0; i < this.staff.promoters; i++) {
            this.spawnStaffEntity('promoter');
        }
        for (let i = 0; i < this.staff.managers; i++) {
            this.spawnStaffEntity('manager');
        }
    }

    update(delta, gameState, time = 0) {
        this.lastTick += delta;
        
        // Animate staff entities
        this.staffEntities.forEach(entity => entity.update(time));
        
        // Process every second
        if (this.lastTick >= 1) {
            this.lastTick = 0;
            
            const managerBonus = 1 + (this.staff.managers * 0.2);

            // Bartenders auto-earn
            if (this.staff.bartenders > 0 && gameState.barStock > 0) {
                const earnings = 5 * this.staff.bartenders * managerBonus;
                gameState.cash += Math.floor(earnings);
                gameState.barStock = Math.max(0, gameState.barStock - this.staff.bartenders * 0.5);
                gameState.totalDrinksServed += this.staff.bartenders;
            }

            // DJs increase hype
            if (this.staff.djs > 0) {
                const hypeGain = 2 * this.staff.djs * managerBonus;
                gameState.hype = Math.min(1000, gameState.hype + hypeGain);
            }

            // Manager auto-restock
            if (this.staff.managers >= 2 && gameState.barStock <= 20 && gameState.cash >= 100) {
                gameState.cash -= 100;
                gameState.barStock = 100;
                ui.notify("Manager auto-restocked bar!", "info");
            }
        }
    }

    getStaffEffects() {
        return {
            drinkBonus: 1 + (this.staff.bartenders * 0.1),
            hypeBonus: this.staff.djs * 2,
            capacityBonus: this.staff.bouncers * 3,
            spawnBonus: Math.pow(0.85, this.staff.promoters),
            efficiencyBonus: 1 + (this.staff.managers * 0.2)
        };
    }

    getTotalStaff() {
        return Object.values(this.staff).reduce((a, b) => a + b, 0);
    }
}

export const staffManager = new StaffManager();
