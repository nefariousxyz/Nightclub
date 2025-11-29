// Particle System for Visual Effects
import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleSystems = [];
    }

    // Smoke/fog on dance floor
    createSmoke(position = { x: 0, y: 0, z: 0 }) {
        const particleCount = 150;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        const lifetimes = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x + (Math.random() - 0.5) * 16;
            positions[i * 3 + 1] = position.y + Math.random() * 1;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 16;
            
            velocities.push({
                x: (Math.random() - 0.5) * 0.01,
                y: Math.random() * 0.02 + 0.005,
                z: (Math.random() - 0.5) * 0.01
            });
            lifetimes.push(Math.random() * 4 + 1);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x666688,
            size: 2.5,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particles = new THREE.Points(geometry, material);
        particles.userData = { velocities, lifetimes, baseY: position.y, type: 'smoke' };
        
        this.scene.add(particles);
        this.particleSystems.push(particles);
        return particles;
    }

    // Sparkles for ceiling/VIP areas
    createSparkles(position = { x: 0, y: 12, z: 0 }) {
        const particleCount = 80;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = [];

        const sparkleColors = [0xffffff, 0xffd700, 0x00ffff, 0xff00ff];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x + (Math.random() - 0.5) * 50;
            positions[i * 3 + 1] = position.y + Math.random() * 5;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 40;

            const color = new THREE.Color(sparkleColors[Math.floor(Math.random() * sparkleColors.length)]);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            velocities.push({
                twinkleSpeed: Math.random() * 3 + 2,
                twinkleOffset: Math.random() * Math.PI * 2
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.4,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particles = new THREE.Points(geometry, material);
        particles.userData = { velocities, type: 'sparkles' };

        this.scene.add(particles);
        this.particleSystems.push(particles);
        return particles;
    }

    // Confetti burst for events
    createConfetti(position = { x: 0, y: 15, z: 0 }) {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = [];

        const confettiColors = [0xff0066, 0x00ffff, 0xffff00, 0x00ff00, 0xff00ff, 0xff6600];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x + (Math.random() - 0.5) * 5;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 5;

            const color = new THREE.Color(confettiColors[Math.floor(Math.random() * confettiColors.length)]);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            velocities.push({
                x: (Math.random() - 0.5) * 0.15,
                y: -Math.random() * 0.08 - 0.03,
                z: (Math.random() - 0.5) * 0.15
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 1
        });

        const particles = new THREE.Points(geometry, material);
        particles.userData = { velocities, startY: position.y, type: 'confetti', life: 8 };

        this.scene.add(particles);
        this.particleSystems.push(particles);
        return particles;
    }

    update(delta, time) {
        for (let i = this.particleSystems.length - 1; i >= 0; i--) {
            const system = this.particleSystems[i];
            if (!system.userData) continue;

            const type = system.userData.type;

            if (type === 'smoke') {
                const positions = system.geometry.attributes.position.array;
                const velocities = system.userData.velocities;
                const lifetimes = system.userData.lifetimes;
                const baseY = system.userData.baseY;

                for (let j = 0; j < velocities.length; j++) {
                    positions[j * 3] += velocities[j].x + Math.sin(time + j) * 0.005;
                    positions[j * 3 + 1] += velocities[j].y;
                    positions[j * 3 + 2] += velocities[j].z;

                    lifetimes[j] -= delta;

                    if (positions[j * 3 + 1] > baseY + 4 || lifetimes[j] <= 0) {
                        positions[j * 3] = (Math.random() - 0.5) * 16;
                        positions[j * 3 + 1] = baseY;
                        positions[j * 3 + 2] = (Math.random() - 0.5) * 16;
                        lifetimes[j] = Math.random() * 4 + 1;
                    }
                }
                system.geometry.attributes.position.needsUpdate = true;
            }

            if (type === 'sparkles') {
                const velocities = system.userData.velocities;
                // Twinkle by varying size
                system.material.size = 0.3 + Math.sin(time * 4) * 0.15;
                system.material.opacity = 0.5 + Math.sin(time * 3) * 0.3;
            }

            if (type === 'confetti') {
                const positions = system.geometry.attributes.position.array;
                const velocities = system.userData.velocities;

                system.userData.life -= delta;
                system.material.opacity = Math.max(0, system.userData.life / 8);

                for (let j = 0; j < velocities.length; j++) {
                    positions[j * 3] += velocities[j].x;
                    positions[j * 3 + 1] += velocities[j].y;
                    positions[j * 3 + 2] += velocities[j].z;
                    positions[j * 3] += Math.sin(time * 3 + j) * 0.02;
                }

                system.geometry.attributes.position.needsUpdate = true;

                if (system.userData.life <= 0) {
                    this.scene.remove(system);
                    system.geometry.dispose();
                    system.material.dispose();
                    this.particleSystems.splice(i, 1);
                }
            }
        }
    }

    triggerConfetti() {
        this.createConfetti({ x: 0, y: 15, z: 0 });
    }
}
