/**
 * Snake Game - Mouse Controlled (Revamped)
 * A beautiful, smooth, theme-aware snake game running at 60fps
 * Features: Lerp-based movement, object pooling, enhanced particles
 */

import * as THREE from 'three';
import { ThreeBaseGame } from './base-game';
import type { PlayproofConfig, SDKHooks } from '../../types';

interface SnakeSegment {
    mesh: THREE.Mesh;
    position: THREE.Vector2;
    velocity: THREE.Vector2;
    scale: number;
    targetScale: number;
}

interface Food {
    mesh: THREE.Group;
    position: THREE.Vector2;
    spawnTime: number;
    collected: boolean;
    pulsePhase: number;
}

interface Particle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    life: number;
    color: THREE.Color;
    size: number;
}

// Pre-allocated geometry and material caches for performance
const geometryCache: Map<string, THREE.BufferGeometry> = new Map();
const materialCache: Map<string, THREE.Material> = new Map();

function getCircleGeometry(radius: number, segments: number = 32): InstanceType<typeof THREE.CircleGeometry> {
    const key = `circle_${radius}_${segments}`;
    if (!geometryCache.has(key)) {
        geometryCache.set(key, new THREE.CircleGeometry(radius, segments));
    }
    return geometryCache.get(key) as InstanceType<typeof THREE.CircleGeometry>;
}

function getRingGeometry(inner: number, outer: number, segments: number = 32): InstanceType<typeof THREE.RingGeometry> {
    const key = `ring_${inner}_${outer}_${segments}`;
    if (!geometryCache.has(key)) {
        geometryCache.set(key, new THREE.RingGeometry(inner, outer, segments));
    }
    return geometryCache.get(key) as InstanceType<typeof THREE.RingGeometry>;
}

export class SnakeGame extends ThreeBaseGame {
    private snake: SnakeSegment[] = [];
    private foods: Food[] = [];
    private mousePos: THREE.Vector2 = new THREE.Vector2(0, 0);
    private smoothMousePos: THREE.Vector2 = new THREE.Vector2(0, 0);
    private orthoCamera!: THREE.OrthographicCamera;
    private viewSize: number = 5;
    private aspect: number = 1;

    // Game settings - tuned for smoothness
    private readonly SEGMENT_SIZE = 0.28;
    private readonly SEGMENT_SPACING = 0.32;
    private readonly SNAKE_SPEED = 12;
    private readonly MOUSE_SMOOTHING = 0.15;
    private readonly MOVEMENT_SMOOTHING = 0.08;
    private readonly INITIAL_LENGTH = 6;
    private readonly MAX_FOOD = 5;
    private readonly FOOD_SIZE = 0.22;
    private readonly FOOD_SPAWN_INTERVAL = 1200;

    // Modern vibrant color palette
    private snakeHeadColor: THREE.Color = new THREE.Color(0x00f5d4);
    private snakeBodyColor: THREE.Color = new THREE.Color(0x9b5de5);
    private snakeTailColor: THREE.Color = new THREE.Color(0xf15bb5);
    private foodColors: THREE.Color[] = [
        new THREE.Color(0x00bbf9),
        new THREE.Color(0xfee440),
        new THREE.Color(0x00f5d4),
        new THREE.Color(0xf15bb5),
        new THREE.Color(0x9b5de5),
    ];

    // Particle pool for performance
    private particlePool: Particle[] = [];
    private activeParticles: Particle[] = [];
    private particleMesh: THREE.Points | null = null;
    private readonly MAX_PARTICLES = 200;

    private foodSpawnTimer: number = 0;
    private score: number = 0;
    private scoreDisplay: HTMLDivElement | null = null;
    private frameCounter: number = 0;

    // Trail effect with optimization
    private trailPoints: THREE.Points | null = null;
    private trailPositions: Float32Array = new Float32Array(150 * 3); // 50 points * 3 coords
    private trailColors: Float32Array = new Float32Array(150 * 3);
    private trailSizes: Float32Array = new Float32Array(50);
    private trailIndex: number = 0;
    private trailUpdateCounter: number = 0;

    // Background stars
    private backgroundStars: THREE.Points | null = null;
    private starPositions: Float32Array | null = null;

    constructor(gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks = {} as SDKHooks) {
        super(gameArea, config, hooks);

        // Extract theme colors if provided
        if (config.theme) {
            if (config.theme.primary) {
                this.snakeHeadColor = new THREE.Color(config.theme.primary);
            }
            if (config.theme.secondary) {
                this.snakeBodyColor = new THREE.Color(config.theme.secondary);
            }
            if (config.theme.accent) {
                this.foodColors[0] = new THREE.Color(config.theme.accent);
            }
            if (config.theme.success) {
                this.foodColors[2] = new THREE.Color(config.theme.success);
            }
        }

        // Initialize particle pool
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            this.particlePool.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                life: 0,
                color: new THREE.Color(),
                size: 0.1,
            });
        }
    }

    protected async setupGame(): Promise<void> {
        // Setup orthographic camera for 2D rendering
        const width = this.container.clientWidth || 400;
        const height = this.container.clientHeight || 280;
        this.aspect = width / height;
        this.viewSize = 5;

        this.orthoCamera = new THREE.OrthographicCamera(
            -this.aspect * this.viewSize,
            this.aspect * this.viewSize,
            this.viewSize,
            -this.viewSize,
            0.1,
            100
        );
        this.orthoCamera.position.z = 10;
        (this as any).camera = this.orthoCamera;

        // Create beautiful background
        this.createBackground();

        // Create particle system
        this.createParticleSystem();

        // Create trail effect
        this.createTrailEffect();

        // Create initial snake
        this.createSnake();

        // Create UI
        this.createUI();

        // Spawn initial food
        for (let i = 0; i < 3; i++) {
            this.spawnFood();
        }
    }

    private createBackground(): void {
        // Gradient background plane
        const bgGeometry = new THREE.PlaneGeometry(
            this.aspect * this.viewSize * 3,
            this.viewSize * 3
        );

        // Create beautiful gradient texture
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;

        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#0d0221');
        gradient.addColorStop(0.3, '#0f0a1e');
        gradient.addColorStop(0.5, '#150a2e');
        gradient.addColorStop(0.7, '#1a0a3a');
        gradient.addColorStop(1, '#0d0221');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2, 512);

        const texture = new THREE.CanvasTexture(canvas);
        const bgMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        const bg = new THREE.Mesh(bgGeometry, bgMaterial);
        bg.position.z = -5;
        this.scene.add(bg);
        this.gameObjects.push(bg);

        // Add animated stars background
        this.createStars();

        // Add subtle grid pattern
        const gridHelper = this.createGridPattern();
        this.scene.add(gridHelper);
        this.gameObjects.push(gridHelper);
    }

    private createStars(): void {
        const starCount = 60;
        this.starPositions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            this.starPositions[i * 3] = (Math.random() - 0.5) * this.aspect * this.viewSize * 2.5;
            this.starPositions[i * 3 + 1] = (Math.random() - 0.5) * this.viewSize * 2.5;
            this.starPositions[i * 3 + 2] = -3 + Math.random() * 1.5;

            const brightness = 0.3 + Math.random() * 0.5;
            colors[i * 3] = brightness * 0.6;
            colors[i * 3 + 1] = brightness * 0.7;
            colors[i * 3 + 2] = brightness;

            sizes[i] = 0.03 + Math.random() * 0.05;
        }

        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const starMat = new THREE.PointsMaterial({
            size: 0.06,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            sizeAttenuation: true,
        });

        this.backgroundStars = new THREE.Points(starGeo, starMat);
        this.scene.add(this.backgroundStars);
        this.gameObjects.push(this.backgroundStars);
    }

    private createGridPattern(): THREE.Object3D {
        const group = new THREE.Group();
        const gridSize = Math.max(this.aspect * this.viewSize, this.viewSize) * 2;
        const divisions = 16;
        const step = gridSize / divisions;

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x3a1a5a,
            transparent: true,
            opacity: 0.2
        });

        for (let i = -divisions / 2; i <= divisions / 2; i++) {
            // Horizontal lines
            const hPoints = [
                new THREE.Vector3(-gridSize / 2, i * step, -2),
                new THREE.Vector3(gridSize / 2, i * step, -2)
            ];
            const hGeometry = new THREE.BufferGeometry().setFromPoints(hPoints);
            const hLine = new THREE.Line(hGeometry, lineMaterial);
            group.add(hLine);

            // Vertical lines
            const vPoints = [
                new THREE.Vector3(i * step, -gridSize / 2, -2),
                new THREE.Vector3(i * step, gridSize / 2, -2)
            ];
            const vGeometry = new THREE.BufferGeometry().setFromPoints(vPoints);
            const vLine = new THREE.Line(vGeometry, lineMaterial);
            group.add(vLine);
        }

        return group;
    }

    private createParticleSystem(): void {
        const positions = new Float32Array(this.MAX_PARTICLES * 3);
        const colors = new Float32Array(this.MAX_PARTICLES * 3);
        const sizes = new Float32Array(this.MAX_PARTICLES);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.12,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            sizeAttenuation: true,
        });

        this.particleMesh = new THREE.Points(geometry, material);
        this.particleMesh.frustumCulled = false;
        this.scene.add(this.particleMesh);
    }

    private createTrailEffect(): void {
        // Initialize trail arrays with gradient colors
        for (let i = 0; i < 50; i++) {
            this.trailPositions[i * 3] = 0;
            this.trailPositions[i * 3 + 1] = 0;
            this.trailPositions[i * 3 + 2] = 0;

            const t = i / 50;
            const color = this.snakeHeadColor.clone().lerp(this.snakeTailColor, t);
            this.trailColors[i * 3] = color.r * (1 - t * 0.7);
            this.trailColors[i * 3 + 1] = color.g * (1 - t * 0.7);
            this.trailColors[i * 3 + 2] = color.b * (1 - t * 0.7);

            this.trailSizes[i] = 0.08 * (1 - t * 0.5);
        }

        const trailGeometry = new THREE.BufferGeometry();
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

        const trailMaterial = new THREE.PointsMaterial({
            size: 0.08,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
        });

        this.trailPoints = new THREE.Points(trailGeometry, trailMaterial);
        this.scene.add(this.trailPoints);
        this.gameObjects.push(this.trailPoints);
    }

    private createSnake(): void {
        // Create snake head with glow
        const headGroup = new THREE.Group();

        // Outer glow
        const glowGeometry = new THREE.CircleGeometry(this.SEGMENT_SIZE * 1.8, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.snakeHeadColor,
            transparent: true,
            opacity: 0.15,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.z = -0.1;
        headGroup.add(glow);

        // Main head circle
        const headGeometry = new THREE.CircleGeometry(this.SEGMENT_SIZE * 1.2, 32);
        const headMaterial = new THREE.MeshBasicMaterial({
            color: this.snakeHeadColor,
            transparent: true,
            opacity: 1,
        });
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        headMesh.position.z = 0.1;
        headGroup.add(headMesh);

        // Inner highlight
        const highlightGeometry = new THREE.CircleGeometry(this.SEGMENT_SIZE * 0.6, 24);
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.25,
        });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.position.set(-0.05, 0.05, 0.15);
        headGroup.add(highlight);

        // Eye decorations
        this.addEyesToHead(headGroup);

        headGroup.position.set(0, 0, 1);

        this.snake.push({
            mesh: headGroup as unknown as THREE.Mesh,
            position: new THREE.Vector2(0, 0),
            velocity: new THREE.Vector2(0, 0),
            scale: 1,
            targetScale: 1,
        });
        this.scene.add(headGroup);
        this.gameObjects.push(headGroup);

        // Create initial body segments with staggered spawn
        for (let i = 1; i < this.INITIAL_LENGTH; i++) {
            this.addBodySegment(new THREE.Vector2(-i * this.SEGMENT_SPACING, 0), 1);
        }
    }

    private addEyesToHead(headMesh: THREE.Object3D): void {
        const eyeGeometry = new THREE.CircleGeometry(0.07, 16);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilGeometry = new THREE.CircleGeometry(0.035, 16);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 0.12, 0.2);
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(0.01, 0.01, 0.01);
        leftEye.add(leftPupil);
        headMesh.add(leftEye);

        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 0.12, 0.2);
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.01, 0.01, 0.01);
        rightEye.add(rightPupil);
        headMesh.add(rightEye);
    }

    private addBodySegment(position: THREE.Vector2, initialScale: number = 0): void {
        const segmentIndex = this.snake.length;
        const t = Math.min(segmentIndex / (this.INITIAL_LENGTH + 15), 1);

        // Gradient color from head to tail through body color
        const color = this.snakeHeadColor.clone()
            .lerp(this.snakeBodyColor, Math.min(t * 2, 1))
            .lerp(this.snakeTailColor, Math.max(0, t * 2 - 1));

        const baseSize = this.SEGMENT_SIZE * (1 - t * 0.4);

        const segmentGroup = new THREE.Group();

        // Outer glow
        const glowGeometry = new THREE.CircleGeometry(baseSize * 1.4, 24);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.12 * (1 - t * 0.5),
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.z = -0.05;
        segmentGroup.add(glow);

        // Main segment
        const geometry = new THREE.CircleGeometry(baseSize, 24);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.95 - t * 0.35,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = 0.05;
        segmentGroup.add(mesh);

        segmentGroup.position.set(position.x, position.y, 0.5 - segmentIndex * 0.01);
        segmentGroup.scale.setScalar(initialScale);

        this.snake.push({
            mesh: segmentGroup as unknown as THREE.Mesh,
            position: position.clone(),
            velocity: new THREE.Vector2(0, 0),
            scale: initialScale,
            targetScale: 1,
        });
        this.scene.add(segmentGroup);
        this.gameObjects.push(segmentGroup);
    }

    private createUI(): void {
        // Score display with modern styling
        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.style.cssText = `
            position: absolute;
            top: 12px;
            right: 12px;
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.95);
            background: linear-gradient(135deg, rgba(155, 93, 229, 0.4), rgba(241, 91, 181, 0.4));
            padding: 8px 16px;
            border-radius: 12px;
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            z-index: 10;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;
        this.scoreDisplay.textContent = 'Score: 0';
        this.container.style.position = 'relative';
        this.container.appendChild(this.scoreDisplay);
    }

    private spawnFood(): void {
        if (this.foods.filter(f => !f.collected).length >= this.MAX_FOOD) return;

        const padding = 0.6;
        const x = (Math.random() - 0.5) * (this.aspect * this.viewSize * 2 - padding * 2);
        const y = (Math.random() - 0.5) * (this.viewSize * 2 - padding * 2);
        const position = new THREE.Vector2(x, y);

        // Check if too close to snake
        for (const segment of this.snake) {
            if (position.distanceTo(segment.position) < 1.0) {
                return; // Skip spawning
            }
        }

        const color = this.foodColors[Math.floor(Math.random() * this.foodColors.length)];

        // Create food with beautiful glow effect
        const foodGroup = new THREE.Group();

        // Outer glow (large, soft)
        const outerGlowGeometry = new THREE.CircleGeometry(this.FOOD_SIZE * 2.5, 32);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.1,
        });
        const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
        outerGlow.position.z = -0.02;
        foodGroup.add(outerGlow);

        // Inner glow
        const innerGlowGeometry = new THREE.CircleGeometry(this.FOOD_SIZE * 1.5, 32);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.25,
        });
        const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        innerGlow.position.z = -0.01;
        foodGroup.add(innerGlow);

        // Decorative ring
        const ringGeometry = new THREE.RingGeometry(this.FOOD_SIZE * 0.8, this.FOOD_SIZE * 1.1, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.z = 0.01;
        foodGroup.add(ring);

        // Core
        const coreGeometry = new THREE.CircleGeometry(this.FOOD_SIZE * 0.7, 32);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.95,
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.z = 0.02;
        foodGroup.add(core);

        // Highlight
        const highlightGeometry = new THREE.CircleGeometry(this.FOOD_SIZE * 0.3, 24);
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.35,
        });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.position.set(-0.03, 0.03, 0.03);
        foodGroup.add(highlight);

        foodGroup.position.set(x, y, 0.3);
        foodGroup.scale.setScalar(0);

        this.foods.push({
            mesh: foodGroup,
            position: position,
            spawnTime: Date.now(),
            collected: false,
            pulsePhase: Math.random() * Math.PI * 2,
        });

        this.scene.add(foodGroup);
        this.gameObjects.push(foodGroup);
    }

    protected onMouseMove(x: number, y: number): void {
        // Convert screen coordinates to world coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        const normalizedX = (x / rect.width) * 2 - 1;
        const normalizedY = -(y / rect.height) * 2 + 1;

        this.mousePos.set(
            normalizedX * this.aspect * this.viewSize,
            normalizedY * this.viewSize
        );
    }

    protected update(delta: number): void {
        const now = Date.now();
        this.frameCounter++;

        // Smooth mouse position (reduces jitter)
        this.smoothMousePos.lerp(this.mousePos, this.MOUSE_SMOOTHING);

        // Update snake head position with smooth following
        if (this.snake.length > 0) {
            const head = this.snake[0];
            const direction = new THREE.Vector2()
                .subVectors(this.smoothMousePos, head.position);
            const distance = direction.length();

            if (distance > 0.05) {
                direction.normalize();

                // Smooth velocity-based movement
                const targetVelocity = direction.multiplyScalar(
                    Math.min(this.SNAKE_SPEED * delta, distance)
                );
                head.velocity.lerp(targetVelocity, this.MOVEMENT_SMOOTHING);
                head.position.add(head.velocity);

                // Smooth rotation
                const targetAngle = Math.atan2(head.velocity.y, head.velocity.x) - Math.PI / 2;
                const currentRotation = head.mesh.rotation.z;
                let angleDiff = targetAngle - currentRotation;

                // Normalize angle difference
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                head.mesh.rotation.z += angleDiff * 0.15;
            }

            head.mesh.position.set(head.position.x, head.position.y, 1);

            // Add pulsing glow to head
            const headGlow = head.mesh.children[0] as THREE.Mesh;
            if (headGlow) {
                const pulse = Math.sin(now * 0.004) * 0.05 + 1;
                headGlow.scale.setScalar(pulse);
            }

            // Update trail (every 2 frames for performance)
            this.trailUpdateCounter++;
            if (this.trailUpdateCounter >= 2) {
                this.trailUpdateCounter = 0;
                this.trailIndex = (this.trailIndex + 1) % 50;
                this.trailPositions[this.trailIndex * 3] = head.position.x;
                this.trailPositions[this.trailIndex * 3 + 1] = head.position.y;
                this.trailPositions[this.trailIndex * 3 + 2] = 0;
                if (this.trailPoints) {
                    this.trailPoints.geometry.attributes.position.needsUpdate = true;
                }
            }

            // Update body segments with smooth following
            for (let i = 1; i < this.snake.length; i++) {
                const segment = this.snake[i];
                const leader = this.snake[i - 1];

                const dir = new THREE.Vector2()
                    .subVectors(leader.position, segment.position);
                const dist = dir.length();

                if (dist > this.SEGMENT_SPACING) {
                    dir.normalize();
                    const moveAmount = (dist - this.SEGMENT_SPACING) * 0.35;
                    segment.velocity.lerp(dir.multiplyScalar(moveAmount), 0.2);
                    segment.position.add(segment.velocity);
                }

                // Animate scale (for spawn animation)
                segment.scale += (segment.targetScale - segment.scale) * 0.12;
                segment.mesh.scale.setScalar(segment.scale);

                segment.mesh.position.set(
                    segment.position.x,
                    segment.position.y,
                    0.5 - i * 0.01
                );
            }

            // Check food collision
            for (const food of this.foods) {
                if (food.collected) continue;

                const dist = head.position.distanceTo(food.position);
                if (dist < this.SEGMENT_SIZE + this.FOOD_SIZE) {
                    this.collectFood(food);
                }
            }
        }

        // Animate foods with smooth pulsing
        for (const food of this.foods) {
            if (food.collected) continue;

            const age = (now - food.spawnTime) / 1000;
            const spawnScale = Math.min(age * 3, 1); // Pop-in animation
            const pulse = Math.sin(now * 0.004 + food.pulsePhase) * 0.08 + 1;
            food.mesh.scale.setScalar(spawnScale * pulse);
            food.mesh.rotation.z += delta * 0.3;
        }

        // Spawn food periodically
        this.foodSpawnTimer += delta * 1000;
        if (this.foodSpawnTimer >= this.FOOD_SPAWN_INTERVAL) {
            this.foodSpawnTimer = 0;
            this.spawnFood();
        }

        // Update particle effects
        this.updateParticles(delta);

        // Animate background stars
        if (this.backgroundStars && this.starPositions) {
            for (let i = 0; i < this.starPositions.length / 3; i++) {
                const twinkle = Math.sin(now * 0.002 + i * 0.5) * 0.3 + 0.7;
                (this.backgroundStars.material as THREE.PointsMaterial).opacity = twinkle * 0.8;
            }
        }

        // Clamp snake to bounds
        if (this.snake.length > 0) {
            const head = this.snake[0];
            const maxX = this.aspect * this.viewSize - 0.3;
            const maxY = this.viewSize - 0.3;
            head.position.x = Math.max(-maxX, Math.min(maxX, head.position.x));
            head.position.y = Math.max(-maxY, Math.min(maxY, head.position.y));
        }
    }

    private collectFood(food: Food): void {
        food.collected = true;
        this.score += 10;
        this.behaviorData.hits++;

        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = `Score: ${this.score}`;
            // Flash animation
            this.scoreDisplay.style.transform = 'scale(1.1)';
            setTimeout(() => {
                if (this.scoreDisplay) {
                    this.scoreDisplay.style.transform = 'scale(1)';
                }
            }, 100);
        }

        // Get color from food
        const foodCore = food.mesh.children[3] as THREE.Mesh;
        const color = foodCore?.material && 'color' in foodCore.material
            ? (foodCore.material as THREE.MeshBasicMaterial).color
            : this.foodColors[0];

        // Create satisfying particle burst
        this.createParticleBurst(food.position.clone(), color);

        // Add new segment to snake with pop-in animation
        const lastSegment = this.snake[this.snake.length - 1];
        this.addBodySegment(lastSegment.position.clone(), 0);

        // Remove food from scene with fade
        this.scene.remove(food.mesh);
        const idx = this.gameObjects.indexOf(food.mesh);
        if (idx > -1) this.gameObjects.splice(idx, 1);
    }

    private createParticleBurst(position: THREE.Vector2, color: THREE.Color): void {
        const particleCount = 20;

        for (let i = 0; i < particleCount; i++) {
            const particle = this.particlePool.find(p => p.life <= 0);
            if (!particle) continue;

            const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 2.5 + Math.random() * 3;

            particle.position.set(position.x, position.y, 0.5);
            particle.velocity.set(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Math.random() * 1.5
            );
            particle.life = 1;
            particle.color.copy(color);
            particle.size = 0.08 + Math.random() * 0.08;

            this.activeParticles.push(particle);
        }
    }

    private updateParticles(delta: number): void {
        if (!this.particleMesh) return;

        const positions = this.particleMesh.geometry.attributes.position.array as Float32Array;
        const colors = this.particleMesh.geometry.attributes.color.array as Float32Array;
        const sizes = this.particleMesh.geometry.attributes.size?.array as Float32Array;

        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const p = this.activeParticles[i];

            p.life -= delta * 2.5;

            if (p.life <= 0) {
                this.activeParticles.splice(i, 1);
                continue;
            }

            // Update position
            p.position.add(p.velocity.clone().multiplyScalar(delta));
            p.velocity.multiplyScalar(0.96);

            // Update buffer
            positions[i * 3] = p.position.x;
            positions[i * 3 + 1] = p.position.y;
            positions[i * 3 + 2] = p.position.z;

            colors[i * 3] = p.color.r * p.life;
            colors[i * 3 + 1] = p.color.g * p.life;
            colors[i * 3 + 2] = p.color.b * p.life;

            if (sizes) {
                sizes[i] = p.size * p.life;
            }
        }

        // Clear unused particle slots
        for (let i = this.activeParticles.length; i < this.MAX_PARTICLES; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = -100; // Move off-screen
        }

        this.particleMesh.geometry.attributes.position.needsUpdate = true;
        this.particleMesh.geometry.attributes.color.needsUpdate = true;
        if (sizes) {
            (this.particleMesh.geometry.attributes.size as { needsUpdate: boolean }).needsUpdate = true;
        }
    }

    start(onComplete: (data: any) => void): void {
        super.start(onComplete);

        // Initialize mouse position to center
        this.mousePos.set(0, 0);
        this.smoothMousePos.set(0, 0);
    }

    destroy(): void {
        // Clean up score display
        if (this.scoreDisplay && this.scoreDisplay.parentNode) {
            this.scoreDisplay.parentNode.removeChild(this.scoreDisplay);
        }
        this.scoreDisplay = null;

        // Clean up particle mesh
        if (this.particleMesh) {
            this.scene.remove(this.particleMesh);
            this.particleMesh.geometry.dispose();
            (this.particleMesh.material as THREE.Material).dispose();
        }

        // Clean up snake
        this.snake.forEach(segment => {
            this.scene.remove(segment.mesh);
        });
        this.snake = [];

        // Clean up foods
        this.foods.forEach(food => {
            this.scene.remove(food.mesh);
        });
        this.foods = [];

        // Clear caches on final cleanup
        this.particlePool = [];
        this.activeParticles = [];

        super.destroy();
    }
}

export default SnakeGame;
