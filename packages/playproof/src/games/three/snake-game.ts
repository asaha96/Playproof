/**
 * Snake Game - Mouse Controlled
 * A beautiful, theme-aware snake game where the snake follows the mouse cursor
 */

import * as THREE from 'three';
import { ThreeBaseGame } from './base-game';
import type { PlayproofConfig, SDKHooks } from '../../types';

interface SnakeSegment {
    mesh: THREE.Mesh;
    position: THREE.Vector2;
    targetPosition: THREE.Vector2;
}

interface Food {
    mesh: THREE.Mesh;
    position: THREE.Vector2;
    spawnTime: number;
    collected: boolean;
    pulsePhase: number;
}

export class SnakeGame extends ThreeBaseGame {
    private snake: SnakeSegment[] = [];
    private foods: Food[] = [];
    private mousePos: THREE.Vector2 = new THREE.Vector2(0, 0);
    private orthoCamera!: THREE.OrthographicCamera;
    private viewSize: number = 5;
    private aspect: number = 1;

    // Game settings
    private readonly SEGMENT_SIZE = 0.25;
    private readonly SEGMENT_SPACING = 0.35;
    private readonly SNAKE_SPEED = 8;
    private readonly INITIAL_LENGTH = 5;
    private readonly MAX_FOOD = 4;
    private readonly FOOD_SIZE = 0.2;
    private readonly FOOD_SPAWN_INTERVAL = 1500;

    // Visual colors from theme or defaults
    private snakeHeadColor: THREE.Color = new THREE.Color(0x6366f1);
    private snakeBodyColor: THREE.Color = new THREE.Color(0x8b5cf6);
    private foodColors: THREE.Color[] = [
        new THREE.Color(0x22d3ee),
        new THREE.Color(0xf472b6),
        new THREE.Color(0x34d399),
        new THREE.Color(0xfbbf24),
    ];

    // Particles for collecting food
    private particles: THREE.Points[] = [];
    private foodSpawnTimer: number = 0;
    private score: number = 0;
    private scoreDisplay: HTMLDivElement | null = null;

    // Trail effect
    private trailPoints: THREE.Points | null = null;
    private trailPositions: Float32Array = new Float32Array(300);
    private trailColors: Float32Array = new Float32Array(300);
    private trailIndex: number = 0;

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

        // Create trail effect
        this.createTrailEffect();

        // Create initial snake
        this.createSnake();

        // Create UI
        this.createUI();

        // Spawn initial food
        for (let i = 0; i < 2; i++) {
            this.spawnFood();
        }
    }

    private createBackground(): void {
        // Gradient background plane
        const bgGeometry = new THREE.PlaneGeometry(
            this.aspect * this.viewSize * 3,
            this.viewSize * 3
        );

        // Create gradient texture
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#0f0f23');
        gradient.addColorStop(0.5, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2, 256);

        const texture = new THREE.CanvasTexture(canvas);
        const bgMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide
        });
        const bg = new THREE.Mesh(bgGeometry, bgMaterial);
        bg.position.z = -5;
        this.scene.add(bg);
        this.gameObjects.push(bg);

        // Add subtle grid pattern
        const gridHelper = this.createGridPattern();
        this.scene.add(gridHelper);
        this.gameObjects.push(gridHelper);

        // Add floating particles in background
        const particleCount = 30;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.aspect * this.viewSize * 2;
            positions[i * 3 + 1] = (Math.random() - 0.5) * this.viewSize * 2;
            positions[i * 3 + 2] = -3 + Math.random() * 2;

            const brightness = 0.2 + Math.random() * 0.3;
            colors[i * 3] = brightness * 0.4;
            colors[i * 3 + 1] = brightness * 0.4;
            colors[i * 3 + 2] = brightness * 0.8;
        }

        const bgGeo = new THREE.BufferGeometry();
        bgGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        bgGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const bgMat = new THREE.PointsMaterial({
            size: 0.08,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
        });

        const bgPoints = new THREE.Points(bgGeo, bgMat);
        this.scene.add(bgPoints);
        this.gameObjects.push(bgPoints);
    }

    private createGridPattern(): THREE.Object3D {
        const group = new THREE.Group();
        const gridSize = Math.max(this.aspect * this.viewSize, this.viewSize) * 2;
        const divisions = 20;
        const step = gridSize / divisions;

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x2a2a4a,
            transparent: true,
            opacity: 0.3
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

    private createTrailEffect(): void {
        // Initialize trail arrays
        for (let i = 0; i < 100; i++) {
            this.trailPositions[i * 3] = 0;
            this.trailPositions[i * 3 + 1] = 0;
            this.trailPositions[i * 3 + 2] = 0;

            const t = i / 100;
            this.trailColors[i * 3] = this.snakeHeadColor.r * (1 - t);
            this.trailColors[i * 3 + 1] = this.snakeHeadColor.g * (1 - t);
            this.trailColors[i * 3 + 2] = this.snakeHeadColor.b * (1 - t);
        }

        const trailGeometry = new THREE.BufferGeometry();
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

        const trailMaterial = new THREE.PointsMaterial({
            size: 0.1,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
        });

        this.trailPoints = new THREE.Points(trailGeometry, trailMaterial);
        this.scene.add(this.trailPoints);
        this.gameObjects.push(this.trailPoints);
    }

    private createSnake(): void {
        // Create snake head
        const headGeometry = new THREE.CircleGeometry(this.SEGMENT_SIZE * 1.2, 32);
        const headMaterial = new THREE.MeshBasicMaterial({
            color: this.snakeHeadColor,
            transparent: true,
            opacity: 1,
        });
        const headMesh = new THREE.Mesh(headGeometry, headMaterial);
        headMesh.position.set(0, 0, 1);

        // Add glow ring to head
        const glowGeometry = new THREE.RingGeometry(
            this.SEGMENT_SIZE * 1.2,
            this.SEGMENT_SIZE * 1.5,
            32
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.snakeHeadColor,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.z = 0.05;
        headMesh.add(glowMesh);

        // Add eye decorations
        this.addEyesToHead(headMesh);

        this.snake.push({
            mesh: headMesh,
            position: new THREE.Vector2(0, 0),
            targetPosition: new THREE.Vector2(0, 0),
        });
        this.scene.add(headMesh);
        this.gameObjects.push(headMesh);

        // Create initial body segments
        for (let i = 1; i < this.INITIAL_LENGTH; i++) {
            this.addBodySegment(new THREE.Vector2(-i * this.SEGMENT_SPACING, 0));
        }
    }

    private addEyesToHead(headMesh: THREE.Mesh): void {
        const eyeGeometry = new THREE.CircleGeometry(0.06, 16);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilGeometry = new THREE.CircleGeometry(0.03, 16);
        const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.08, 0.1, 0.1);
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(0, 0.01, 0.01);
        leftEye.add(leftPupil);
        headMesh.add(leftEye);

        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.08, 0.1, 0.1);
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0, 0.01, 0.01);
        rightEye.add(rightPupil);
        headMesh.add(rightEye);
    }

    private addBodySegment(position: THREE.Vector2): void {
        const segmentIndex = this.snake.length;
        const t = segmentIndex / (this.INITIAL_LENGTH + 10);

        // Gradient color from head to tail
        const color = this.snakeHeadColor.clone().lerp(this.snakeBodyColor, t);
        const size = this.SEGMENT_SIZE * (1 - t * 0.3);

        const geometry = new THREE.CircleGeometry(size, 24);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9 - t * 0.3,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x, position.y, 0.5 - segmentIndex * 0.01);

        this.snake.push({
            mesh,
            position: position.clone(),
            targetPosition: position.clone(),
        });
        this.scene.add(mesh);
        this.gameObjects.push(mesh);
    }

    private createUI(): void {
        // Score display
        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.style.cssText = `
            position: absolute;
            top: 12px;
            right: 12px;
            font-family: 'Inter', sans-serif;
            font-size: 16px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            background: rgba(0, 0, 0, 0.3);
            padding: 6px 12px;
            border-radius: 8px;
            backdrop-filter: blur(4px);
            z-index: 10;
        `;
        this.scoreDisplay.textContent = 'Score: 0';
        this.container.style.position = 'relative';
        this.container.appendChild(this.scoreDisplay);
    }

    private spawnFood(): void {
        if (this.foods.filter(f => !f.collected).length >= this.MAX_FOOD) return;

        const padding = 0.5;
        const x = (Math.random() - 0.5) * (this.aspect * this.viewSize * 2 - padding * 2);
        const y = (Math.random() - 0.5) * (this.viewSize * 2 - padding * 2);
        const position = new THREE.Vector2(x, y);

        // Check if too close to snake
        for (const segment of this.snake) {
            if (position.distanceTo(segment.position) < 0.8) {
                return; // Skip spawning
            }
        }

        const color = this.foodColors[Math.floor(Math.random() * this.foodColors.length)];

        // Create food with glow effect
        const foodGroup = new THREE.Group();

        // Outer glow
        const glowGeometry = new THREE.CircleGeometry(this.FOOD_SIZE * 2, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.2,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.z = -0.01;
        foodGroup.add(glow);

        // Inner ring
        const ringGeometry = new THREE.RingGeometry(this.FOOD_SIZE * 0.7, this.FOOD_SIZE, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        foodGroup.add(ring);

        // Core
        const coreGeometry = new THREE.CircleGeometry(this.FOOD_SIZE * 0.6, 32);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        core.position.z = 0.01;
        foodGroup.add(core);

        foodGroup.position.set(x, y, 0.3);

        this.foods.push({
            mesh: foodGroup as unknown as THREE.Mesh,
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

        // Update snake head position - follow mouse
        if (this.snake.length > 0) {
            const head = this.snake[0];
            const direction = new THREE.Vector2()
                .subVectors(this.mousePos, head.position);
            const distance = direction.length();

            if (distance > 0.1) {
                direction.normalize();
                const moveSpeed = Math.min(this.SNAKE_SPEED * delta, distance);
                head.position.add(direction.multiplyScalar(moveSpeed));

                // Rotate head to face movement direction
                const angle = Math.atan2(direction.y, direction.x) - Math.PI / 2;
                head.mesh.rotation.z = angle;
            }

            head.mesh.position.set(head.position.x, head.position.y, 1);

            // Update trail
            this.trailIndex = (this.trailIndex + 1) % 100;
            this.trailPositions[this.trailIndex * 3] = head.position.x;
            this.trailPositions[this.trailIndex * 3 + 1] = head.position.y;
            this.trailPositions[this.trailIndex * 3 + 2] = 0;
            if (this.trailPoints) {
                this.trailPoints.geometry.attributes.position.needsUpdate = true;
            }

            // Update body segments - follow the segment in front
            for (let i = 1; i < this.snake.length; i++) {
                const segment = this.snake[i];
                const leader = this.snake[i - 1];

                const dir = new THREE.Vector2()
                    .subVectors(leader.position, segment.position);
                const dist = dir.length();

                if (dist > this.SEGMENT_SPACING) {
                    dir.normalize();
                    const moveAmount = (dist - this.SEGMENT_SPACING) * 0.5;
                    segment.position.add(dir.multiplyScalar(moveAmount));
                }

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

        // Animate foods - pulsing effect
        for (const food of this.foods) {
            if (food.collected) continue;

            const pulse = Math.sin(now * 0.005 + food.pulsePhase) * 0.1 + 1;
            food.mesh.scale.setScalar(pulse);
            food.mesh.rotation.z += delta * 0.5;
        }

        // Spawn food periodically
        this.foodSpawnTimer += delta * 1000;
        if (this.foodSpawnTimer >= this.FOOD_SPAWN_INTERVAL) {
            this.foodSpawnTimer = 0;
            this.spawnFood();
        }

        // Update particle effects
        this.updateParticles(delta);

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
        }

        // Get color from food
        const foodColor = (food.mesh.children[2] as THREE.Mesh)?.material;
        const color = foodColor && 'color' in foodColor
            ? (foodColor as THREE.MeshBasicMaterial).color
            : this.foodColors[0];

        // Create particle burst
        this.createParticleBurst(food.position.clone(), color);

        // Add new segment to snake
        const lastSegment = this.snake[this.snake.length - 1];
        this.addBodySegment(lastSegment.position.clone());

        // Remove food from scene
        this.scene.remove(food.mesh);
        const idx = this.gameObjects.indexOf(food.mesh);
        if (idx > -1) this.gameObjects.splice(idx, 1);
    }

    private createParticleBurst(position: THREE.Vector2, color: THREE.Color): void {
        const particleCount = 15;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = 0.5;

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            velocities.push(new THREE.Vector3(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Math.random() * 2
            ));
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
        });

        const particles = new THREE.Points(geometry, material);
        (particles as any).velocities = velocities;
        (particles as any).life = 1;

        this.scene.add(particles);
        this.particles.push(particles);
    }

    private updateParticles(delta: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const velocities = (p as any).velocities as THREE.Vector3[];
            const positions = p.geometry.attributes.position.array as Float32Array;

            (p as any).life -= delta * 2;

            for (let j = 0; j < velocities.length; j++) {
                positions[j * 3] += velocities[j].x * delta;
                positions[j * 3 + 1] += velocities[j].y * delta;
                positions[j * 3 + 2] += velocities[j].z * delta;
                velocities[j].multiplyScalar(0.95);
            }

            p.geometry.attributes.position.needsUpdate = true;
            (p.material as THREE.PointsMaterial).opacity = (p as any).life;

            if ((p as any).life <= 0) {
                this.scene.remove(p);
                p.geometry.dispose();
                (p.material as THREE.Material).dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    start(onComplete: (data: any) => void): void {
        super.start(onComplete);

        // Initialize mouse position to center
        this.mousePos.set(0, 0);
    }

    destroy(): void {
        // Clean up score display
        if (this.scoreDisplay && this.scoreDisplay.parentNode) {
            this.scoreDisplay.parentNode.removeChild(this.scoreDisplay);
        }
        this.scoreDisplay = null;

        // Clean up particles
        this.particles.forEach(p => {
            this.scene.remove(p);
            p.geometry.dispose();
            (p.material as THREE.Material).dispose();
        });
        this.particles = [];

        // Clean up snake
        this.snake.forEach(segment => {
            this.scene.remove(segment.mesh);
            segment.mesh.geometry.dispose();
            (segment.mesh.material as THREE.Material).dispose();
        });
        this.snake = [];

        // Clean up foods
        this.foods.forEach(food => {
            this.scene.remove(food.mesh);
        });
        this.foods = [];

        super.destroy();
    }
}

export default SnakeGame;
