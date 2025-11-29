// Human/Visitor Entity Classes
import * as THREE from 'three';
import { game } from './game.js';
import { CONFIG } from './config.js';

// NPC Needs and Desires
const DESIRES = {
    DANCE: 'want_to_dance',
    DRINK: 'want_drink', 
    SIT: 'want_to_sit',
    SOCIALIZE: 'want_to_socialize'
};

// Complaint reasons
const COMPLAINTS = {
    NO_DANCEFLOOR: { text: '😤 No dance floor!', impact: -20 },
    NO_BAR: { text: '😤 No bar!', impact: -15 },
    NO_SEATS: { text: '😤 Nowhere to sit!', impact: -10 },
    BORING: { text: '😴 This place is boring!', impact: -15 },
    EMPTY: { text: '😒 Too empty here...', impact: -10 },
    CROWDED: { text: '😫 Too crowded!', impact: -8 },
    NO_MUSIC: { text: '🔇 No music!', impact: -20 },
    BAD_VIBES: { text: '👎 Bad vibes...', impact: -12 }
};

// Leave reasons with emojis
const LEAVE_REASONS = {
    unhappy: { text: '😠 This place sucks!', emoji: '😠' },
    frustrated: { text: '😤 I give up!', emoji: '😤' },
    impatient: { text: '⏰ Too slow!', emoji: '😒' },
    bored: { text: '😴 So boring...', emoji: '😴' },
    angry: { text: '🤬 Never coming back!', emoji: '🤬' },
    tired: { text: '😪 Time to go...', emoji: '😪' },
    satisfied: { text: '😊 Great night!', emoji: '😊' }
};

// Visitor personality types
const PERSONALITIES = [
    { type: 'party_animal', name: 'Party Animal', icon: '🎉', danceBonus: 1.5, drinkRate: 1.0, patience: 0.8, tipBonus: 1.0 },
    { type: 'vip_seeker', name: 'VIP Seeker', icon: '👑', danceBonus: 0.8, drinkRate: 1.2, patience: 0.6, tipBonus: 1.5 },
    { type: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', danceBonus: 1.2, drinkRate: 0.8, patience: 1.2, tipBonus: 1.1 },
    { type: 'drink_lover', name: 'Drink Lover', icon: '🍸', danceBonus: 0.7, drinkRate: 2.0, patience: 1.0, tipBonus: 1.2 },
    { type: 'critic', name: 'Critic', icon: '📝', danceBonus: 1.0, drinkRate: 1.0, patience: 0.5, tipBonus: 2.0 },
    { type: 'casual', name: 'Casual Visitor', icon: '😎', danceBonus: 1.0, drinkRate: 1.0, patience: 1.0, tipBonus: 1.0 }
];

// Mood levels
const MOOD_LEVELS = {
    ecstatic: { min: 90, emoji: '🤩', color: 0x00ff00 },
    happy: { min: 70, emoji: '😊', color: 0x88ff00 },
    content: { min: 50, emoji: '🙂', color: 0xffff00 },
    neutral: { min: 35, emoji: '😐', color: 0xffaa00 },
    annoyed: { min: 20, emoji: '😒', color: 0xff6600 },
    angry: { min: 0, emoji: '😠', color: 0xff0000 }
};

// Random NPC first names
const FIRST_NAMES = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn',
    'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
    'Isabella', 'Lucas', 'Mia', 'Oliver', 'Charlotte', 'Elijah', 'Amelia', 'James',
    'Luna', 'Benjamin', 'Harper', 'Jack', 'Evelyn', 'Henry', 'Aria', 'Sebastian',
    'Chloe', 'Aiden', 'Ella', 'Matthew', 'Scarlett', 'Samuel', 'Grace', 'David',
    'Zoe', 'Carter', 'Lily', 'Jayden', 'Hannah', 'Dylan', 'Nora', 'Leo',
    'Mila', 'Gabriel', 'Layla', 'Julian', 'Riley', 'Anthony', 'Zoey', 'Isaac',
    'Penelope', 'Lincoln', 'Stella', 'Joshua', 'Aurora', 'Andrew', 'Hazel', 'Ryan'
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Thompson', 'White', 'Lopez', 'Clark', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Turner', 'Phillips', 'Parker', 'Evans', 'Edwards', 'Collins'
];

// Iconic celebrity names for hired celebrities
const CELEBRITY_NAMES = {
    local_star: ['DJ Spark', 'MC Flash', 'Neon Nova', 'Starlight Sam', 'Glitter Grace'],
    influencer: ['TikTok Tina', 'Insta Ian', 'Viral Vicky', 'Trending Tom', 'Hashtag Hannah'],
    minor_celeb: ['Reality Rick', 'Soap Star Sarah', 'Voice Actor Vic', 'Podcast Pete', 'YouTuber Yuki'],
    famous_singer: [
        'Lady Java', 'Bruno Mars Jr', 'Ariana Venti', 'The Weekday', 'Ed Cheeran',
        'Doja Kitten', 'Billie Eileen', 'Post Mailone', 'Drake Bell', 'Cardi C'
    ],
    movie_star: [
        'Leonardo DeCaprio', 'Margot Robbin', 'Tom Cruise Jr', 'Zendaya Z', 'Timothée Charm',
        'Jennifer Laurence', 'Chris Hemsworth Jr', 'Scarlett Johanson', 'Ryan Reynolds Jr', 'Emma Stone Jr'
    ],
    superstar: [
        'Beyoncé Belle', 'Taylor Shift', 'Rihanna Rose', 'Justin Beaver', 'Kanye East',
        'Kim K Star', 'Selena Gomex', 'Shakira Shine', 'Madonna Mia', 'Michael J'
    ]
};

function generateNPCName() {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return `${first} ${last}`;
}

function getCelebrityName(type) {
    const names = CELEBRITY_NAMES[type] || CELEBRITY_NAMES.local_star;
    return names[Math.floor(Math.random() * names.length)];
}

export class Human {
    constructor(scene, isCelebrity = false, celebrityType = null) {
        this.scene = scene;
        this.isCelebrity = isCelebrity;
        this.mesh = new THREE.Group();
        this.mesh.userData.owner = this;
        this.isThinking = false;
        
        // Assign name
        if (isCelebrity && celebrityType) {
            this.name = getCelebrityName(celebrityType);
            this.celebrityType = celebrityType;
        } else if (isCelebrity) {
            this.name = getCelebrityName('famous_singer');
        } else {
            this.name = generateNPCName();
        }
        
        // AI Personality & Mood System
        this.personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
        this.mood = 70 + Math.random() * 20; // Start 70-90
        this.patience = 100 * this.personality.patience;
        this.satisfactionFactors = {
            gotDrink: false,
            danced: false,
            waitedTooLong: false,
            barWasEmpty: false
        };
        this.timeInClub = 0;
        this.complainCooldown = Math.random() * 5; // Randomize so not all react at once
        this.isLeaving = false;
        this.drinkTimer = Math.random() * 5;
        this.moodCheckTimer = Math.random() * 8; // Random offset so visitors check at different times
        this.environmentCheckTimer = Math.random() * 10; // Stagger environment checks
        this.frustration = 0; // Builds up when can't do what they want
        this.currentDesire = null;
        this.failedAttempts = 0;
        this.hasComplained = {}; // Track what they've complained about

        // ═══════════════════════════════════════════════════════════════
        // SIMS-STYLE PROCEDURAL VECTOR SPRITE CHARACTER SYSTEM
        // Uses smooth curves, capsules, and anatomical proportions
        // ═══════════════════════════════════════════════════════════════
        
        // Character customization
        this.gender = Math.random() > 0.5 ? 'male' : 'female';
        this.bodyType = ['slim', 'average', 'athletic'][Math.floor(Math.random() * 3)];
        
        // Skin tones (more variety)
        const skinTones = [
            0xffe0bd, 0xffcd94, 0xeac086, 0xffad60, // Light
            0xd8a47f, 0xc68642, 0x8d5524, 0x5c3317, // Medium to dark
            0xf1c27d, 0xe0ac69, 0xc68642, 0xa0522d  // Warm tones
        ];
        
        // Outfit colors (vibrant clubbing colors)
        const outfitColors = [
            0xff0066, 0x00ffff, 0xff00ff, 0x00ff88, // Neon
            0x6600ff, 0xff6600, 0xffff00, 0xff3366, // Bright
            0x0066ff, 0x9900ff, 0xff0099, 0x00ff00, // Electric
            0x1a1a1a, 0x2a2a2a, 0x333333, 0x444444  // Dark/elegant
        ];
        
        const skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];
        let outfitColor = outfitColors[Math.floor(Math.random() * outfitColors.length)];
        
        // Secondary color for outfit details
        const secondaryColor = outfitColors[Math.floor(Math.random() * outfitColors.length)];
        
        const skinMat = new THREE.MeshStandardMaterial({ 
            color: skinColor,
            roughness: 0.6,
            metalness: 0.1
        });
        
        let clothMat = new THREE.MeshStandardMaterial({ 
            color: outfitColor,
            roughness: 0.4,
            metalness: 0.2
        });
        
        const clothMat2 = new THREE.MeshStandardMaterial({ 
            color: secondaryColor,
            roughness: 0.5
        });
        
        if (isCelebrity) {
            clothMat = new THREE.MeshStandardMaterial({ 
                color: 0xffd700, 
                metalness: 0.9, 
                roughness: 0.1,
                emissive: 0x332200,
                emissiveIntensity: 0.3
            });
        }

        // Helper: Create capsule geometry - LOW POLY for performance
        const createCapsule = (radius, height) => {
            return new THREE.CapsuleGeometry(radius, height, 4, 8);
        };

        // Hip (main pivot for animations)
        this.hip = new THREE.Group();
        this.hip.position.y = 2.0;
        this.mesh.add(this.hip);

        // ═══ TORSO (Single capsule) ═══
        const torso = new THREE.Mesh(createCapsule(0.4, 0.8), clothMat);
        torso.position.y = 0.4;
        torso.scale.z = 0.7;
        this.hip.add(torso);

        // ═══ HEAD (Simplified for performance) ═══
        const headSize = 0.35;
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(headSize, 8, 6),
            skinMat
        );
        head.position.y = 1.35;
        head.scale.y = 1.1;
        head.castShadow = true;
        this.hip.add(head);
        this.head = head;
        
        // Neck
        const neck = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.12, 0.2, 6),
            skinMat
        );
        neck.position.y = 1.0;
        this.hip.add(neck);

        // ═══ HAIR (Simplified for performance) ═══
        const hairColors = [0x1a1a1a, 0x4a2f20, 0x8b4513, 0xd4a574, 0xff6347, 0x8b008b];
        const hairMat = new THREE.MeshStandardMaterial({ 
            color: hairColors[Math.floor(Math.random() * hairColors.length)],
            roughness: 0.8
        });
        
        // Simple hair dome
        const hair = new THREE.Mesh(
            new THREE.SphereGeometry(0.36, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.55),
            hairMat
        );
        hair.position.y = 1.45;
        hair.scale.y = 0.7;
        this.hip.add(hair);

        // ═══ LEGS (Simplified - single capsule each) ═══
        const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.6 });
        
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

        // ═══ ARMS (Simplified - single capsule each) ═══
        this.leftArmPivot = new THREE.Group();
        this.leftArmPivot.position.set(-0.45, 0.75, 0);
        this.hip.add(this.leftArmPivot);
        const leftArm = new THREE.Mesh(createCapsule(0.08, 0.5), skinMat);
        leftArm.position.y = -0.35;
        this.leftArmPivot.add(leftArm);

        this.rightArmPivot = new THREE.Group();
        this.rightArmPivot.position.set(0.45, 0.75, 0);
        this.hip.add(this.rightArmPivot);
        const rightArm = new THREE.Mesh(createCapsule(0.08, 0.5), skinMat);
        rightArm.position.y = -0.35;
        this.rightArmPivot.add(rightArm);

        // ═══ CELEBRITY EFFECTS (Simplified) ═══
        if (isCelebrity) {
            // Simple golden crown
            const crownMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
            const crown = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.25, 0.15, 6),
                crownMat
            );
            crown.position.y = 1.7;
            this.hip.add(crown);
            
            // Simple glow
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0xffd700,
                transparent: true,
                opacity: 0.15
            });
            const glow = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), glowMat);
            glow.position.y = 0.5;
            this.hip.add(glow);
            this.celebrityGlow = glow;
            
            if (game.spawnRate > 500) {
                game.spawnRate *= 0.7;
            }
        }

        this.scene.add(this.mesh);
        
        // Animation state
        this.animPhase = Math.random() * Math.PI * 2;

        // State
        this.state = 'queue';
        this.target = new THREE.Vector3();
        this.nextState = 'idle';
        this.needs = {
            energy: 100,
            thirst: 50
        };
        
        // Create mood indicator
        this.createMoodIndicator();
    }
    
    createMoodIndicator() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        this.moodCanvas = canvas;
        this.moodContext = canvas.getContext('2d');
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            depthTest: false
        });
        
        this.moodSprite = new THREE.Sprite(spriteMat);
        this.moodSprite.scale.set(1.5, 1.5, 1);
        this.moodSprite.position.y = 4;
        this.moodSprite.visible = false;
        this.mesh.add(this.moodSprite);
        this.updateMoodIndicator();
    }
    
    updateMoodIndicator() {
        if (!this.moodContext) return;
        const ctx = this.moodContext;
        ctx.clearRect(0, 0, 64, 64);
        const moodLevel = this.getMoodLevel();
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(moodLevel.emoji, 32, 32);
        if (this.moodSprite?.material?.map) {
            this.moodSprite.material.map.needsUpdate = true;
        }
    }
    
    getMoodLevel() {
        for (const [name, level] of Object.entries(MOOD_LEVELS)) {
            if (this.mood >= level.min) return { name, ...level };
        }
        return { name: 'angry', ...MOOD_LEVELS.angry };
    }
    
    changeMood(amount, reason) {
        this.mood = Math.max(0, Math.min(100, this.mood + amount));
        // Only show indicator for big changes, and limit floating text
        if (Math.abs(amount) >= 15) {
            this.showMoodBriefly();
        }
        if (this.mood <= 15 && !this.isLeaving) this.startLeaving('unhappy');
    }
    
    showMoodBriefly() {
        if (this.moodSprite) {
            this.moodSprite.visible = true;
            setTimeout(() => { if (this.moodSprite) this.moodSprite.visible = false; }, 3000);
        }
    }
    
    checkEnvironment() {
        // Bar empty when thirsty (only trigger once)
        if (this.needs.thirst > 70 && game.barStock <= 0 && !this.satisfactionFactors.barWasEmpty) {
            this.satisfactionFactors.barWasEmpty = true;
            this.mood = Math.max(0, this.mood - 10);
            this.updateMoodIndicator();
        }
        
        // Reset bar empty flag when bar is restocked
        if (game.barStock > 0 && this.satisfactionFactors.barWasEmpty) {
            this.satisfactionFactors.barWasEmpty = false;
        }
        
        // Only do other checks occasionally (random chance to reduce load)
        if (Math.random() > 0.3) return;
        
        // Hype affects mood (smaller amounts)
        if (game.hype > 70) {
            this.mood = Math.min(100, this.mood + 0.3);
        } else if (game.hype < 30) {
            this.mood = Math.max(0, this.mood - 0.2);
        }
    }
    
    // Smart AI: Check what's missing in the club
    evaluateClub() {
        const issues = [];
        
        // Check for dance floor
        const hasDancefloor = game.furniture.some(f => f.userData?.type === 'dancefloor');
        if (!hasDancefloor && this.personality.type === 'party_animal') {
            issues.push('NO_DANCEFLOOR');
        }
        
        // Check for bar
        const hasBar = game.furniture.some(f => f.userData?.type === 'bar');
        if (!hasBar && this.needs.thirst > 50) {
            issues.push('NO_BAR');
        }
        
        // Check for seating
        const hasSeating = game.furniture.some(f => 
            f.userData?.type === 'booth' || f.userData?.type === 'table'
        );
        if (!hasSeating && this.needs.energy < 40) {
            issues.push('NO_SEATS');
        }
        
        // Check if club is too empty/boring
        if (game.furniture.length < 2) {
            issues.push('BORING');
        }
        
        // Check visitor count
        if (game.visitors && game.visitors.length <= 2) {
            issues.push('EMPTY');
        }
        
        // Check for music playing (YouTube OR background music)
        const djSystem = window.djSystem;
        const musicPlaying = djSystem && (djSystem.isPlaying || djSystem.bgMusicPlaying);
        if (djSystem && !musicPlaying) {
            issues.push('NO_MUSIC');
        }
        
        // Random chance of bad vibes if mood is already low
        if (this.mood < 40 && Math.random() < 0.1) {
            issues.push('BAD_VIBES');
        }
        
        return issues;
    }
    
    // Check if visitor should leave based on emotions
    checkEmotionalState() {
        // Very low mood = leave angry
        if (this.mood <= 10) {
            this.startLeaving('angry');
            return true;
        }
        
        // High frustration = leave frustrated
        if (this.frustration >= 60) {
            this.startLeaving('frustrated');
            return true;
        }
        
        // Bored for too long = leave bored
        if (this.state === 'idle' && this.timeInClub > 60 && this.mood < 50) {
            this.startLeaving('bored');
            return true;
        }
        
        // Been here too long and satisfied = leave happy
        if (this.timeInClub > 120 && this.mood >= 70) {
            if (Math.random() < 0.1) { // 10% chance per check
                this.startLeaving('satisfied');
                return true;
            }
        }
        
        // Been here way too long = tired
        if (this.timeInClub > 180) {
            this.startLeaving('tired');
            return true;
        }
        
        return false;
    }
    
    // React to club issues
    reactToIssues(issues) {
        for (const issue of issues) {
            if (this.hasComplained[issue]) continue; // Already complained about this
            
            const complaint = COMPLAINTS[issue];
            if (complaint) {
                this.hasComplained[issue] = true;
                this.frustration += 20;
                this.mood = Math.max(0, this.mood + complaint.impact);
                
                // Show complaint
                if (game.createFloatingText) {
                    game.createFloatingText(complaint.text, this.mesh.position, '#ff6666');
                }
                this.showMoodBriefly();
                
                // High frustration = leave
                if (this.frustration >= 50) {
                    this.startLeaving('frustrated');
                    return;
                }
            }
        }
    }
    
    // Get club boundaries for wall collision
    getClubBounds() {
        const tierInfo = game.getClubTierInfo?.() || { size: 15 };
        const halfSize = tierInfo.size / 2;
        return {
            minX: -halfSize + 1,
            maxX: halfSize - 1,
            minZ: -halfSize + 1,
            maxZ: halfSize - 1
        };
    }
    
    // Check if position is inside club walls
    isInsideClub(x, z) {
        const bounds = this.getClubBounds();
        return x >= bounds.minX && x <= bounds.maxX && 
               z >= bounds.minZ && z <= bounds.maxZ;
    }
    
    // Clamp position to stay inside walls
    clampToClub(position) {
        const bounds = this.getClubBounds();
        position.x = Math.max(bounds.minX, Math.min(bounds.maxX, position.x));
        position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, position.z));
        return position;
    }
    
    complain(message) {
        if (this.complainCooldown > 0) return;
        this.complainCooldown = 10;
        if (game.hype > 5) game.hype -= 1;
        this.showMoodBriefly();
    }
    
    startLeaving(reason) {
        if (this.isLeaving) return;
        this.isLeaving = true;
        this.state = 'leaving';
        
        // Get club bounds for exit
        const bounds = this.getClubBounds();
        this.target.set(0, 0, bounds.maxZ + 15);
        
        this.showMoodBriefly();
        
        // Get leave reason info
        const leaveInfo = LEAVE_REASONS[reason] || LEAVE_REASONS.tired;
        
        // Show emotional feedback based on mood
        if (this.mood < 20) {
            // Very unhappy - big impact
            game.hype = Math.max(0, game.hype - 5);
            if (game.createFloatingText) {
                game.createFloatingText(leaveInfo.text, this.mesh.position, '#ff0000');
            }
            console.log('Visitor left ANGRY:', reason);
        } else if (this.mood < 40) {
            // Unhappy
            game.hype = Math.max(0, game.hype - 2);
            if (game.createFloatingText) {
                game.createFloatingText(leaveInfo.text, this.mesh.position, '#ff6600');
            }
        } else if (this.mood >= 70) {
            // Left happy - positive impact!
            game.hype = Math.min(100, game.hype + 1);
            if (game.createFloatingText) {
                game.createFloatingText('😊 Great time!', this.mesh.position, '#00ff00');
            }
        }
    }
    
    calculateTip(basePrice) {
        const moodMult = this.mood / 70;
        const tipMult = this.personality.tipBonus;
        const tip = basePrice * 0.2 * moodMult * tipMult;
        if (this.mood >= 80) return basePrice + tip * 1.5;
        if (this.mood >= 50) return basePrice + tip;
        return basePrice;
    }
    
    bringFriend() {
        // Very happy visitors can attract new visitors
        if (this.mood >= 85 && Math.random() < 0.1) {
            game.hype = Math.min(100, game.hype + 3);
            if (game.createFloatingText) {
                game.createFloatingText('👫 Brought a friend!', this.mesh.position, '#00ffff');
            }
        }
    }

    setPosition(x, z) {
        this.mesh.position.set(x, 0, z);
    }

    pickActivity() {
        this.needs.thirst += 20;
        this.needs.energy -= 15;
        this.activityTimer = 0;

        // Random chance to do different human-like activities
        const rand = Math.random();
        const bounds = this.getClubBounds();
        
        // Sometimes just wander around randomly
        if (rand < 0.15) {
            const randomX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            const randomZ = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
            this.goTo({ x: randomX, y: 0, z: randomZ }, 'wandering');
            return;
        }
        
        // Sometimes socialize with others (move toward another visitor)
        if (rand < 0.25 && game.visitors && game.visitors.length > 1) {
            const others = game.visitors.filter(v => v !== this && !v.isLeaving);
            if (others.length > 0) {
                const target = others[Math.floor(Math.random() * others.length)];
                const offset = (Math.random() - 0.5) * 3;
                this.goTo({ 
                    x: target.mesh.position.x + offset, 
                    y: 0, 
                    z: target.mesh.position.z + offset 
                }, 'socializing');
                return;
            }
        }

        // Determine what NPC wants based on needs
        let choice = 'dance';
        if (this.needs.thirst > 70) {
            choice = 'drink';
            this.currentDesire = DESIRES.DRINK;
        } else if (this.needs.energy < 35) {
            choice = 'sit';
            this.currentDesire = DESIRES.SIT;
        } else if (this.personality.type === 'party_animal') {
            choice = 'dance';
            this.currentDesire = DESIRES.DANCE;
        } else {
            // Mix it up for variety
            const choices = ['dance', 'dance', 'wander', 'socialize'];
            choice = choices[Math.floor(Math.random() * choices.length)];
        }

        // Try to fulfill desire
        if (choice === 'drink') {
            let baseSpot = game.getRandomSpot('bar') || game.getRandomSpot('table');
            if (baseSpot) {
                // Create a copy with random offset so they don't cluster
                const spot = {
                    x: baseSpot.x + (Math.random() - 0.5) * 3,
                    y: baseSpot.y || 0,
                    z: baseSpot.z + (Math.random() - 0.5) * 3
                };
                this.goTo(spot, 'drinking');
                this.failedAttempts = 0;
                return;
            } else {
                this.failedAttempts++;
                if (this.failedAttempts >= 2 && !this.hasComplained['NO_BAR']) {
                    this.reactToIssues(['NO_BAR']);
                }
            }
        }

        if (choice === 'sit') {
            let baseSpot = game.getRandomSpot('booth') || game.getRandomSpot('table');
            if (baseSpot) {
                const spot = {
                    x: baseSpot.x + (Math.random() - 0.5) * 3,
                    y: baseSpot.y || 0,
                    z: baseSpot.z + (Math.random() - 0.5) * 3
                };
                this.goTo(spot, 'sitting');
                this.failedAttempts = 0;
                return;
            } else {
                this.failedAttempts++;
                if (this.failedAttempts >= 2 && !this.hasComplained['NO_SEATS']) {
                    this.reactToIssues(['NO_SEATS']);
                }
            }
        }

        // Try to dance - spread across the dance floor
        let baseSpot = game.getRandomSpot('dancefloor');
        if (baseSpot) {
            // Create copy with large random offset to spread visitors out
            const spot = {
                x: baseSpot.x + (Math.random() - 0.5) * 6,
                y: baseSpot.y || 0,
                z: baseSpot.z + (Math.random() - 0.5) * 6
            };
            this.goTo(spot, 'dancing');
            this.failedAttempts = 0;
        } else {
            this.failedAttempts++;
            if (this.failedAttempts >= 2 && !this.hasComplained['NO_DANCEFLOOR']) {
                this.reactToIssues(['NO_DANCEFLOOR']);
            }
            
            // Wander around or check phone
            const randomX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
            const randomZ = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ);
            this.goTo({ x: randomX, y: 0, z: randomZ }, Math.random() < 0.3 ? 'phone' : 'wandering');
        }
    }

    goTo(pos, nextState) {
        // Clamp target to stay inside club bounds
        const bounds = this.getClubBounds();
        const clampedX = Math.max(bounds.minX + 1, Math.min(bounds.maxX - 1, pos.x));
        const clampedZ = Math.max(bounds.minZ + 1, Math.min(bounds.maxZ - 1, pos.z));
        
        this.target.set(clampedX, pos.y || 0, clampedZ);
        this.state = 'walking';
        this.nextState = nextState;
    }

    update(delta, time) {
        const t = time + this.animPhase;
        
        // Update AI timers
        this.timeInClub += delta;
        this.complainCooldown = Math.max(0, this.complainCooldown - delta);
        this.moodCheckTimer += delta;
        this.drinkTimer += delta;
        
        // PERFORMANCE: Only do AI logic checks every 8 seconds (not every frame)
        if (this.moodCheckTimer >= 8) {
            this.moodCheckTimer = 0;
            this.checkEnvironment();
            
            // Queue patience
            if (this.state === 'queue') {
                this.patience -= 3;
                if (this.patience <= 0 && !this.isLeaving) {
                    this.mood = Math.max(0, this.mood - 15);
                    this.startLeaving('impatient');
                }
            }
            
            // Music mood influence
            if (window.djSystem && this.state === 'dancing') {
                const musicMood = window.djSystem.crowdMood || 50;
                if (musicMood >= 70) {
                    this.mood = Math.min(100, this.mood + 3 * this.personality.danceBonus);
                } else if (musicMood <= 30) {
                    this.mood = Math.max(0, this.mood - 2);
                }
            }
        }
        
        // Evaluate club every 10 seconds
        this.environmentCheckTimer += delta;
        if (this.environmentCheckTimer >= 10) {
            this.environmentCheckTimer = 0;
            
            // Check emotional state first - might leave
            if (this.checkEmotionalState()) {
                return; // Already leaving
            }
            
            const issues = this.evaluateClub();
            if (issues.length > 0) {
                this.reactToIssues(issues);
            }
            
            // Bring friend if very happy
            this.bringFriend();
        }
        
        // Handle leaving
        if (this.state === 'leaving') {
            const dist = this.mesh.position.distanceTo(this.target);
            if (dist < 2) {
                this.dispose();
                const idx = game.visitors.indexOf(this);
                if (idx > -1) game.visitors.splice(idx, 1);
                return;
            }
            const dir = new THREE.Vector3().subVectors(this.target, this.mesh.position).normalize();
            this.mesh.position.add(dir.multiplyScalar(8 * delta));
            this.mesh.lookAt(this.target);
            // Smooth walking out animation
            const leaveSpeed = 10;
            this.hip.position.y = 2.0 + Math.sin(t * leaveSpeed) * 0.04;
            this.leftLegPivot.rotation.x = Math.sin(t * leaveSpeed) * 0.4;
            this.rightLegPivot.rotation.x = -Math.sin(t * leaveSpeed) * 0.4;
            this.leftArmPivot.rotation.x = -Math.sin(t * leaveSpeed) * 0.3;
            this.rightArmPivot.rotation.x = Math.sin(t * leaveSpeed) * 0.3;
            return;
        }
        
        if (this.state === 'walking') {
            const dist = this.mesh.position.distanceTo(this.target);
            
            // Increased threshold so they reliably reach destination
            if (dist < 1.5) {
                this.state = this.nextState;
                this.resetPose();
                
                if (this.state === 'drinking') {
                    if (game.consumeStock()) {
                        const price = this.isCelebrity ? CONFIG.CELEBRITY_DRINK_PRICE : CONFIG.DRINK_PRICE;
                        const baseProfit = price * (1 + (game.stats.profitLevel - 1) * 0.2);
                        const totalPrice = this.calculateTip(baseProfit);
                        game.addCash(totalPrice);
                        this.needs.thirst = 0;
                        this.satisfactionFactors.gotDrink = true;
                        this.mood = Math.min(100, this.mood + 8);
                    } else {
                        this.satisfactionFactors.barWasEmpty = true;
                        this.mood = Math.max(0, this.mood - 10);
                        this.pickActivity();
                    }
                }

                if (this.state === 'sitting') {
                    this.needs.energy = Math.min(100, this.needs.energy + 40);
                }
                // Activity switching is now handled by activityTimer
            } else {
                const dir = new THREE.Vector3()
                    .subVectors(this.target, this.mesh.position)
                    .normalize();
                
                // Calculate new position
                const newPos = this.mesh.position.clone().add(dir.multiplyScalar(6 * delta));
                
                // Wall collision - stay inside club bounds
                this.clampToClub(newPos);
                
                this.mesh.position.copy(newPos);
                this.mesh.lookAt(this.target);

                // Smooth walking animation
                const walkSpeed = 8;
                this.hip.position.y = 2.0 + Math.sin(t * walkSpeed) * 0.04;
                this.leftLegPivot.rotation.x = Math.sin(t * walkSpeed) * 0.35;
                this.rightLegPivot.rotation.x = -Math.sin(t * walkSpeed) * 0.35;
                this.leftArmPivot.rotation.x = -Math.sin(t * walkSpeed) * 0.25;
                this.rightArmPivot.rotation.x = Math.sin(t * walkSpeed) * 0.25;
            }
        } else if (this.state === 'dancing') {
            if (!this.satisfactionFactors.danced) {
                this.satisfactionFactors.danced = true;
                this.mood = Math.min(100, this.mood + 5);
            }
            
            // ═══════════════════════════════════════════════════════════════
            // SMOOTH REALISTIC DANCE ANIMATIONS
            // ═══════════════════════════════════════════════════════════════
            
            const danceStyle = Math.floor(this.animPhase * 10) % 5;
            
            // Dance speed and intensity - more visible now
            let danceSpeed = 5;
            let intensity = 1.2; // Higher intensity for visible movement
            
            if (window.djSystem && window.djSystem.currentGenre) {
                const bpm = window.MUSIC_GENRES?.[window.djSystem.currentGenre]?.bpm || 120;
                danceSpeed = bpm / 24;
                intensity = 1.0 + (window.djSystem.crowdMood || 50) / 100;
            }
            
            danceSpeed *= (0.9 + this.personality.danceBonus * 0.2);
            
            // Base position
            const baseY = 2.0;
            
            if (danceStyle === 0) {
                // Side-to-side groove
                const sway = Math.sin(t * danceSpeed) * 0.15 * intensity;
                this.hip.position.y = baseY - Math.abs(Math.sin(t * danceSpeed * 2)) * 0.2 * intensity;
                this.hip.position.x = sway;
                this.hip.rotation.z = Math.sin(t * danceSpeed) * 0.1 * intensity;
                
                // Arm swing
                this.leftArmPivot.rotation.x = -0.5 + Math.sin(t * danceSpeed) * 0.4 * intensity;
                this.rightArmPivot.rotation.x = -0.5 - Math.sin(t * danceSpeed) * 0.4 * intensity;
                this.leftArmPivot.rotation.z = 0.2 + Math.sin(t * danceSpeed) * 0.2;
                this.rightArmPivot.rotation.z = -0.2 - Math.sin(t * danceSpeed) * 0.2;
                
                // Leg movement
                this.leftLegPivot.rotation.x = Math.sin(t * danceSpeed * 2) * 0.15 * intensity;
                this.rightLegPivot.rotation.x = -Math.sin(t * danceSpeed * 2) * 0.15 * intensity;
                
            } else if (danceStyle === 1) {
                // Bounce dance
                const bounce = Math.abs(Math.sin(t * danceSpeed * 2));
                this.hip.position.y = baseY - bounce * 0.25 * intensity;
                
                // Weight shift
                this.hip.position.x = Math.sin(t * danceSpeed) * 0.1;
                this.hip.rotation.y = Math.sin(t * danceSpeed * 0.5) * 0.2 * intensity;
                
                // Arms pump up and down
                this.leftArmPivot.rotation.x = -0.8 + bounce * 0.5 * intensity;
                this.rightArmPivot.rotation.x = -0.8 + bounce * 0.5 * intensity;
                
                // Knee bends
                this.leftLegPivot.rotation.x = bounce * 0.3 * intensity;
                this.rightLegPivot.rotation.x = bounce * 0.3 * intensity;
                
            } else if (danceStyle === 2) {
                // Groove with body roll
                this.hip.position.y = baseY - Math.abs(Math.sin(t * danceSpeed * 1.5)) * 0.15 * intensity;
                this.hip.rotation.y = Math.sin(t * danceSpeed) * 0.3 * intensity;
                
                // Arm groove
                this.leftArmPivot.rotation.x = -0.6 + Math.sin(t * danceSpeed) * 0.4 * intensity;
                this.rightArmPivot.rotation.x = -0.6 + Math.sin(t * danceSpeed + 1) * 0.4 * intensity;
                this.leftArmPivot.rotation.z = Math.sin(t * danceSpeed * 0.5) * 0.3 * intensity;
                this.rightArmPivot.rotation.z = -Math.sin(t * danceSpeed * 0.5) * 0.3 * intensity;
                
                // Alternating step
                this.leftLegPivot.rotation.x = Math.max(0, Math.sin(t * danceSpeed)) * 0.2 * intensity;
                this.rightLegPivot.rotation.x = Math.max(0, -Math.sin(t * danceSpeed)) * 0.2 * intensity;
                
            } else if (danceStyle === 3) {
                // Two-step with arms up
                const step = Math.sin(t * danceSpeed * 2);
                this.hip.position.y = baseY - Math.abs(step) * 0.2 * intensity;
                this.hip.position.x = step * 0.1;
                
                // Arms raised
                this.leftArmPivot.rotation.x = -2.0 + Math.sin(t * danceSpeed) * 0.3 * intensity;
                this.rightArmPivot.rotation.x = -2.0 + Math.cos(t * danceSpeed) * 0.3 * intensity;
                this.leftArmPivot.rotation.z = 0.3;
                this.rightArmPivot.rotation.z = -0.3;
                
                // Step pattern
                this.leftLegPivot.rotation.x = Math.max(0, step) * 0.25 * intensity;
                this.rightLegPivot.rotation.x = Math.max(0, -step) * 0.25 * intensity;
                
                // Body movement
                this.hip.rotation.x = Math.sin(t * danceSpeed) * 0.1 * intensity;
                
            } else {
                // Head bob and sway
                this.hip.position.y = baseY - Math.abs(Math.sin(t * danceSpeed * 2)) * 0.15 * intensity;
                this.hip.rotation.y = Math.sin(t * danceSpeed * 0.5) * 0.2 * intensity;
                
                // Relaxed arms
                this.leftArmPivot.rotation.x = -0.4 + Math.sin(t * danceSpeed) * 0.25 * intensity;
                this.rightArmPivot.rotation.x = -0.4 + Math.cos(t * danceSpeed) * 0.25 * intensity;
                
                // Weight shift legs
                this.leftLegPivot.rotation.x = Math.sin(t * danceSpeed) * 0.12 * intensity;
                this.rightLegPivot.rotation.x = -Math.sin(t * danceSpeed) * 0.12 * intensity;
                
                // Body sway
                this.hip.rotation.z = Math.sin(t * danceSpeed * 0.5) * 0.08 * intensity;
            }
            
        } else if (this.state === 'sitting') {
            // Relaxed sitting pose
            this.hip.position.y = 1.6;
            this.leftLegPivot.rotation.x = -0.9;
            this.rightLegPivot.rotation.x = -0.9;
            // Slight idle movement
            this.hip.rotation.y = Math.sin(t * 0.3) * 0.05;
            this.leftArmPivot.rotation.x = -0.3;
            this.rightArmPivot.rotation.x = -0.3;
        } else if (this.state === 'drinking') {
            // Drinking animation - smooth
            this.hip.position.y = 2.0;
            this.rightArmPivot.rotation.x = -1.8; // Arm raised with drink
            this.rightArmPivot.rotation.z = -0.2;
            // Slight sipping motion
            this.hip.rotation.x = Math.sin(t * 1.5) * 0.05;
            this.leftArmPivot.rotation.x = -0.2;
        } else if (this.state === 'idle') {
            // Natural idle - subtle weight shifting
            this.hip.position.y = 2.0;
            this.hip.rotation.y = Math.sin(t * 0.4) * 0.15;
            this.leftArmPivot.rotation.z = 0.08;
            this.rightArmPivot.rotation.z = -0.08;
            this.leftArmPivot.rotation.x = -0.15;
            this.rightArmPivot.rotation.x = -0.15;
            
            // Gentle weight shift
            this.hip.position.x = Math.sin(t * 0.6) * 0.03;
            this.leftLegPivot.rotation.x = Math.sin(t * 0.5) * 0.03;
            this.rightLegPivot.rotation.x = -Math.sin(t * 0.5) * 0.03;
            
            this.mood = Math.max(0, this.mood - 0.05);
        } else if (this.state === 'wandering') {
            // Smooth casual walking
            const walkSpeed = 6;
            this.hip.position.y = 2.0 + Math.sin(t * walkSpeed) * 0.03;
            this.leftLegPivot.rotation.x = Math.sin(t * walkSpeed) * 0.25;
            this.rightLegPivot.rotation.x = -Math.sin(t * walkSpeed) * 0.25;
            this.leftArmPivot.rotation.x = -Math.sin(t * walkSpeed) * 0.15;
            this.rightArmPivot.rotation.x = Math.sin(t * walkSpeed) * 0.15;
            // Smooth head turn
            this.hip.rotation.y = Math.sin(t * 0.5) * 0.12;
        } else if (this.state === 'socializing') {
            // Natural talking animation
            this.hip.position.y = 2.0;
            this.hip.rotation.y = Math.sin(t * 0.25) * 0.08;
            // Subtle hand gestures
            this.rightArmPivot.rotation.x = -0.5 + Math.sin(t * 2) * 0.15;
            this.leftArmPivot.rotation.x = -0.4 + Math.cos(t * 1.8) * 0.12;
            this.rightArmPivot.rotation.z = -0.1 + Math.sin(t * 2.5) * 0.08;
            // Gentle nod
            this.hip.rotation.x = Math.sin(t * 1.5) * 0.03;
        } else if (this.state === 'phone') {
            // Looking at phone naturally
            this.hip.position.y = 2.0;
            this.rightArmPivot.rotation.x = -1.5; // Arm holding phone
            this.rightArmPivot.rotation.z = -0.2;
            this.leftArmPivot.rotation.x = -0.3;
            // Slight head tilt down
            this.hip.rotation.x = 0.1;
            // Slight sway
            this.hip.rotation.y = Math.sin(t * 0.3) * 0.1;
            // Occasionally look up
            if (Math.sin(t * 0.2) > 0.8) {
                this.hip.rotation.x = -0.1;
            }
        }
        
        // Auto pick new activity periodically when not walking
        if (this.state !== 'walking' && this.state !== 'leaving') {
            this.activityTimer = (this.activityTimer || 0) + delta;
            // Each visitor has their own activity interval (5-20 seconds)
            const myInterval = 5 + (this.animPhase % 1) * 15;
            if (this.activityTimer > myInterval) {
                this.activityTimer = 0;
                // Random chance to stay put instead of moving
                if (Math.random() > 0.3) {
                    this.pickActivity();
                }
            }
        }
        
        // Celebrity glow pulse animation
        if (this.isCelebrity && this.celebrityGlow) {
            const pulse = 0.2 + Math.sin(t * 3) * 0.1;
            this.celebrityGlow.material.opacity = pulse;
            this.celebrityGlow.scale.setScalar(1 + Math.sin(t * 2) * 0.15);
        }
    }
    
    resetPose() {
        this.hip.position.set(0, 2.0, 0);
        this.hip.rotation.set(0, 0, 0);
        this.leftLegPivot.rotation.set(0, 0, 0);
        this.rightLegPivot.rotation.set(0, 0, 0);
        this.leftArmPivot.rotation.set(-0.15, 0, 0.05);
        this.rightArmPivot.rotation.set(-0.15, 0, -0.05);
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
    }
    
    // Get visitor info for UI display
    getInfo() {
        const moodLevel = this.getMoodLevel();
        return {
            personality: this.personality,
            mood: Math.round(this.mood),
            moodLevel: moodLevel.name,
            moodEmoji: moodLevel.emoji,
            timeInClub: Math.floor(this.timeInClub),
            state: this.state,
            isCelebrity: this.isCelebrity,
            satisfactionFactors: this.satisfactionFactors
        };
    }
}

// Export constants for use elsewhere
export { PERSONALITIES, MOOD_LEVELS };
