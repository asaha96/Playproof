/**
 * 3D Bubble Pop Game
 * Beautiful 3D bubbles with glossy materials and particle effects
 */

import * as THREE from 'three';
import { ThreeBaseGame } from './base-game';
import type { PlayproofConfig, SDKHooks } from '../../types';

interface Bubble {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    spawnTime: number;
    popping: boolean;
    popProgress: number;
}

export class BubblePopGame extends ThreeBaseGame {
    private bubbles: Bubble[] = [];
    private bubbleGeometry!: THREE.SphereGeometry;
    private particleGeometry!: THREE.BufferGeometry;
    private particleMaterial!: THREE.PointsMaterial;
    private particles: THREE.Points[] = [];
    private spawnInterval: ReturnType<typeof setInterval> | null = null;
    private readonly BUBBLE_LIFETIME = 4000;
    private readonly MAX_BUBBLES = 6;
    private readonly BUBBLE_COLORS = [
        0x6366f1, // Indigo
        0x8b5cf6, // Purple
        0x22d3ee, // Cyan
        0xf472b6, // Pink
        0x34d399, // Emerald
        0xfbbf24, // Amber
    ];

    constructor(gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks = {} as SDKHooks) {
        super(gameArea, config, hooks);
    }

    protected async setupGame(): Promise<void> {
        // Camera position for bubble popping
        this.camera.position.set(0, 0, 12);
        this.camera.lookAt(0, 0, 0);

        // Create shared geometry
        this.bubbleGeometry = new THREE.SphereGeometry(1, 32, 32);

        // Particle system for pop effects
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleMaterial = new THREE.PointsMaterial({
            size: 0.15,
            transparent: true,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
        });

        // Add subtle background elements
        this.addBackgroundEffects();
    }

    private addBackgroundEffects(): void {
        // Floating particles in background
        const bgParticleCount = 50;
        const positions = new Float32Array(bgParticleCount * 3);
        const colors = new Float32Array(bgParticleCount * 3);

        for (let i = 0; i < bgParticleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 5 - 5;

            const color = new THREE.Color(0x6366f1);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const bgGeometry = new THREE.BufferGeometry();
        bgGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        bgGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const bgMaterial = new THREE.PointsMaterial({
            size: 0.1,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
        });

        const bgParticles = new THREE.Points(bgGeometry, bgMaterial);
        this.scene.add(bgParticles);
        this.gameObjects.push(bgParticles);
    }

    private createBubbleMaterial(color: number): THREE.MeshPhysicalMaterial {
        return new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.0,
            roughness: 0.1,
            transmission: 0.7,
            thickness: 0.5,
            transparent: true,
            opacity: 0.85,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            ior: 1.4,
            envMapIntensity: 1.0,
            side: THREE.DoubleSide,
        });
    }

    private spawnBubble(): void {
        if (this.bubbles.length >= this.MAX_BUBBLES) return;

        const size = 0.5 + Math.random() * 0.5;
        const color = this.BUBBLE_COLORS[Math.floor(Math.random() * this.BUBBLE_COLORS.length)];
        const material = this.createBubbleMaterial(color);

        const mesh = new THREE.Mesh(this.bubbleGeometry, material);
        mesh.scale.setScalar(size);

        // Random position within view
        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 6;
        const z = (Math.random() - 0.5) * 2;
        mesh.position.set(x, y, z);

        // Gentle floating velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            Math.random() * 0.2 + 0.1,
            (Math.random() - 0.5) * 0.1
        );

        const bubble: Bubble = {
            mesh,
            velocity,
            spawnTime: Date.now(),
            popping: false,
            popProgress: 0,
        };

        this.bubbles.push(bubble);
        this.scene.add(mesh);
        this.gameObjects.push(mesh);

        // Add spawn animation
        mesh.scale.setScalar(0);
        this.animateSpawn(bubble, size);
    }

    private animateSpawn(bubble: Bubble, targetSize: number): void {
        const startTime = Date.now();
        const duration = 300;

        const animate = () => {
            if (bubble.popping) return;

            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Elastic easing
            const eased = progress < 1
                ? 1 - Math.pow(2, -10 * progress) * Math.cos(progress * Math.PI * 2)
                : 1;

            bubble.mesh.scale.setScalar(targetSize * eased);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    protected update(delta: number): void {
        const now = Date.now();

        // Update bubbles
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const bubble = this.bubbles[i];

            if (bubble.popping) {
                // Pop animation
                bubble.popProgress += delta * 5;
                if (bubble.popProgress >= 1) {
                    this.removeBubble(i);
                } else {
                    const scale = 1 + bubble.popProgress * 0.5;
                    bubble.mesh.scale.setScalar(bubble.mesh.scale.x * scale);
                    (bubble.mesh.material as THREE.MeshPhysicalMaterial).opacity = 1 - bubble.popProgress;
                }
            } else {
                // Float movement
                bubble.mesh.position.add(bubble.velocity.clone().multiplyScalar(delta));

                // Gentle wobble
                const wobble = Math.sin(now * 0.003 + i) * 0.002;
                bubble.mesh.position.x += wobble;
                bubble.mesh.rotation.y += delta * 0.5;
                bubble.mesh.rotation.z += delta * 0.3;

                // Bounce off edges
                if (Math.abs(bubble.mesh.position.x) > 6) {
                    bubble.velocity.x *= -1;
                    bubble.mesh.position.x = Math.sign(bubble.mesh.position.x) * 6;
                }
                if (bubble.mesh.position.y > 4) {
                    bubble.velocity.y *= -1;
                    bubble.mesh.position.y = 4;
                }
                if (bubble.mesh.position.y < -4) {
                    bubble.velocity.y *= -1;
                    bubble.mesh.position.y = -4;
                }

                // Auto-remove after lifetime
                if (now - bubble.spawnTime > this.BUBBLE_LIFETIME) {
                    this.removeBubble(i);
                }
            }
        }

        // Update particle effects
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const positions = p.geometry.attributes.position.array as Float32Array;

            for (let j = 0; j < positions.length; j += 3) {
                positions[j + 1] += delta * 2; // Rise up
            }
            p.geometry.attributes.position.needsUpdate = true;

            (p.material as THREE.PointsMaterial).opacity -= delta * 2;
            if ((p.material as THREE.PointsMaterial).opacity <= 0) {
                this.scene.remove(p);
                p.geometry.dispose();
                (p.material as THREE.Material).dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    protected onClick(_x: number, _y: number): void {
        // Raycast to find clicked bubbles
        const intersects = this.raycast(this.bubbles.map(b => b.mesh));

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object as THREE.Mesh;
            const bubble = this.bubbles.find(b => b.mesh === hitMesh);

            if (bubble && !bubble.popping) {
                this.popBubble(bubble);
                this.behaviorData.hits++;
            }
        } else {
            this.behaviorData.misses++;
        }
    }

    private popBubble(bubble: Bubble): void {
        bubble.popping = true;
        this.createPopParticles(bubble.mesh.position,
            (bubble.mesh.material as THREE.MeshPhysicalMaterial).color);
    }

    private createPopParticles(position: THREE.Vector3, color: THREE.Color): void {
        const particleCount = 20;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x + (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.2,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
        });

        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        this.particles.push(particles);
    }

    private removeBubble(index: number): void {
        const bubble = this.bubbles[index];
        this.scene.remove(bubble.mesh);
        (bubble.mesh.material as THREE.Material).dispose();

        const objIndex = this.gameObjects.indexOf(bubble.mesh);
        if (objIndex > -1) {
            this.gameObjects.splice(objIndex, 1);
        }

        this.bubbles.splice(index, 1);
    }

    start(onComplete: (data: any) => void): void {
        super.start(onComplete);

        // Spawn initial bubbles
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.spawnBubble(), i * 200);
        }

        // Continuously spawn bubbles
        this.spawnInterval = setInterval(() => {
            if (this.bubbles.length < this.MAX_BUBBLES) {
                this.spawnBubble();
            }
        }, 700);
    }

    protected endGame(): void {
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        super.endGame();
    }

    destroy(): void {
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
        }

        this.bubbles.forEach(b => {
            (b.mesh.material as THREE.Material).dispose();
        });
        this.bubbles = [];

        this.particles.forEach(p => {
            p.geometry.dispose();
            (p.material as THREE.Material).dispose();
        });
        this.particles = [];

        this.bubbleGeometry?.dispose();
        this.particleGeometry?.dispose();
        this.particleMaterial?.dispose();

        super.destroy();
    }
}

export default BubblePopGame;
