/**
 * 3D Snake Game
 * Beautiful 3D snake with glossy materials and theme-aware colors
 */

import * as THREE from 'three';
import { ThreeBaseGame } from './base-game';
import type { PlayproofConfig, SDKHooks } from '../../types';

interface SnakeSegment {
    mesh: THREE.Mesh;
    position: { x: number; z: number };
}

interface FoodItem {
    mesh: THREE.Mesh;
    glowMesh: THREE.Mesh;
    position: { x: number; z: number };
}

type Direction = 'up' | 'down' | 'left' | 'right';

export class SnakeGame extends ThreeBaseGame {
    private snake: SnakeSegment[] = [];
    private food: FoodItem | null = null;
    private direction: Direction = 'right';
    private nextDirection: Direction = 'right';
    private moveTimer: number = 0;
    private readonly MOVE_INTERVAL = 0.15; // Seconds between moves
    private readonly GRID_SIZE = 12;
    private readonly CELL_SIZE = 0.8;
    private score: number = 0;
    private scoreDisplay: HTMLDivElement | null = null;
    private particles: THREE.Points[] = [];
    private gridPlane: THREE.Mesh | null = null;
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private gameOver: boolean = false;

    // Theme colors converted to hex
    private primaryColor: number = 0x6366f1;
    private secondaryColor: number = 0x8b5cf6;
    private accentColor: number = 0x22d3ee;

    constructor(gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks = {} as SDKHooks) {
        super(gameArea, config, hooks);
        this.parseThemeColors();
    }

    private parseThemeColors(): void {
        const theme = this.config.theme;
        if (theme.primary) {
            this.primaryColor = this.hexStringToNumber(theme.primary);
        }
        if (theme.secondary) {
            this.secondaryColor = this.hexStringToNumber(theme.secondary);
        }
        if (theme.accent) {
            this.accentColor = this.hexStringToNumber(theme.accent);
        }
    }

    private hexStringToNumber(hex: string): number {
        // Remove # if present
        const cleaned = hex.replace('#', '');
        return parseInt(cleaned, 16);
    }

    protected async setupGame(): Promise<void> {
        // Camera setup for top-down view with slight angle
        this.camera.position.set(0, 12, 8);
        this.camera.lookAt(0, 0, 0);

        // Create ambient lighting
        this.setupEnhancedLighting();

        // Create game grid
        this.createGrid();

        // Create boundaries
        this.createBoundaries();

        // Add background particles
        this.addBackgroundParticles();

        // Create score display
        this.createScoreDisplay();

        // Initialize snake
        this.initSnake();

        // Spawn first food
        this.spawnFood();

        // Bind keyboard events
        this.bindKeyboardEvents();
    }

    private setupEnhancedLighting(): void {
        // Clear default lighting and add custom
        const accentLight = new THREE.PointLight(this.accentColor, 0.8, 30);
        accentLight.position.set(5, 8, 5);
        this.scene.add(accentLight);

        const primaryLight = new THREE.PointLight(this.primaryColor, 0.5, 25);
        primaryLight.position.set(-5, 6, -5);
        this.scene.add(primaryLight);
    }

    private createGrid(): void {
        const gridSize = this.GRID_SIZE * this.CELL_SIZE;

        // Create a subtle grid plane
        const geometry = new THREE.PlaneGeometry(gridSize, gridSize);
        const material = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.8,
            metalness: 0.2,
            transparent: true,
            opacity: 0.9,
        });

        this.gridPlane = new THREE.Mesh(geometry, material);
        this.gridPlane.rotation.x = -Math.PI / 2;
        this.gridPlane.position.y = -0.1;
        this.gridPlane.receiveShadow = true;
        this.scene.add(this.gridPlane);
        this.gameObjects.push(this.gridPlane);

        // Add grid lines
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x2a2a3e,
            transparent: true,
            opacity: 0.5
        });

        const halfGrid = this.GRID_SIZE / 2;
        for (let i = -halfGrid; i <= halfGrid; i++) {
            const points1 = [
                new THREE.Vector3(i * this.CELL_SIZE, 0, -halfGrid * this.CELL_SIZE),
                new THREE.Vector3(i * this.CELL_SIZE, 0, halfGrid * this.CELL_SIZE)
            ];
            const points2 = [
                new THREE.Vector3(-halfGrid * this.CELL_SIZE, 0, i * this.CELL_SIZE),
                new THREE.Vector3(halfGrid * this.CELL_SIZE, 0, i * this.CELL_SIZE)
            ];

            const line1 = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(points1),
                lineMaterial
            );
            const line2 = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints(points2),
                lineMaterial
            );

            this.scene.add(line1, line2);
            this.gameObjects.push(line1, line2);
        }
    }

    private createBoundaries(): void {
        const halfGrid = (this.GRID_SIZE / 2) * this.CELL_SIZE;
        const wallHeight = 0.3;
        const wallThickness = 0.1;

        const wallMaterial = new THREE.MeshPhysicalMaterial({
            color: this.primaryColor,
            metalness: 0.3,
            roughness: 0.4,
            transparent: true,
            opacity: 0.7,
            clearcoat: 0.5,
        });

        // Create 4 walls
        const createWall = (width: number, height: number, depth: number, x: number, y: number, z: number) => {
            const geometry = new THREE.BoxGeometry(width, height, depth);
            const wall = new THREE.Mesh(geometry, wallMaterial);
            wall.position.set(x, y, z);
            wall.castShadow = true;
            this.scene.add(wall);
            this.gameObjects.push(wall);
        };

        const length = this.GRID_SIZE * this.CELL_SIZE + wallThickness * 2;

        // Top and bottom walls
        createWall(length, wallHeight, wallThickness, 0, wallHeight / 2, -halfGrid - wallThickness / 2);
        createWall(length, wallHeight, wallThickness, 0, wallHeight / 2, halfGrid + wallThickness / 2);

        // Left and right walls
        createWall(wallThickness, wallHeight, length, -halfGrid - wallThickness / 2, wallHeight / 2, 0);
        createWall(wallThickness, wallHeight, length, halfGrid + wallThickness / 2, wallHeight / 2, 0);
    }

    private addBackgroundParticles(): void {
        const particleCount = 80;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const themeColors = [
            new THREE.Color(this.primaryColor),
            new THREE.Color(this.secondaryColor),
            new THREE.Color(this.accentColor),
        ];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = Math.random() * 8 + 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

            const color = themeColors[Math.floor(Math.random() * themeColors.length)];
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
        });

        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        this.gameObjects.push(particles);
    }

    private createScoreDisplay(): void {
        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            font-size: 16px;
            font-weight: 700;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(139, 92, 246, 0.8));
            padding: 10px 20px;
            border-radius: 20px;
            font-family: 'Inter', sans-serif;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        this.updateScoreDisplay();
        this.container.appendChild(this.scoreDisplay);
    }

    private updateScoreDisplay(): void {
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = `🐍 Score: ${this.score}`;
        }
    }

    private initSnake(): void {
        // Start with 3 segments in the center
        const startPositions = [
            { x: 0, z: 0 },
            { x: -1, z: 0 },
            { x: -2, z: 0 },
        ];

        for (let i = 0; i < startPositions.length; i++) {
            const isHead = i === 0;
            const segment = this.createSnakeSegment(startPositions[i], isHead, i);
            this.snake.push(segment);
        }
    }

    private createSnakeSegment(position: { x: number; z: number }, isHead: boolean, index: number): SnakeSegment {
        const size = isHead ? 0.35 : 0.3;

        // Create geometry - spheres for smooth look
        const geometry = new THREE.SphereGeometry(size, 24, 24);

        // Calculate color gradient from primary to secondary
        const color = isHead ? this.primaryColor : this.lerpColor(
            this.primaryColor,
            this.secondaryColor,
            Math.min(index / 8, 1)
        );

        const material = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0.2,
            roughness: 0.3,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            envMapIntensity: 0.8,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            position.x * this.CELL_SIZE,
            size,
            position.z * this.CELL_SIZE
        );
        mesh.castShadow = true;

        // Add eyes to head
        if (isHead) {
            this.addEyesToHead(mesh);
        }

        this.scene.add(mesh);
        this.gameObjects.push(mesh);

        return { mesh, position: { ...position } };
    }

    private addEyesToHead(headMesh: THREE.Mesh): void {
        const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pupilGeometry = new THREE.SphereGeometry(0.04, 12, 12);
        const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

        const eyeOffsets = [
            { x: 0.15, y: 0.15, z: 0.25 },
            { x: -0.15, y: 0.15, z: 0.25 },
        ];

        eyeOffsets.forEach(offset => {
            const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            eye.position.set(offset.x, offset.y, offset.z);
            headMesh.add(eye);

            const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
            pupil.position.set(0, 0, 0.05);
            eye.add(pupil);
        });
    }

    private lerpColor(color1: number, color2: number, t: number): number {
        const c1 = new THREE.Color(color1);
        const c2 = new THREE.Color(color2);
        c1.lerp(c2, t);
        return c1.getHex();
    }

    private spawnFood(): void {
        // Find empty position
        let position: { x: number; z: number };
        const halfGrid = Math.floor(this.GRID_SIZE / 2) - 1;

        do {
            position = {
                x: Math.floor(Math.random() * (this.GRID_SIZE - 2)) - halfGrid,
                z: Math.floor(Math.random() * (this.GRID_SIZE - 2)) - halfGrid,
            };
        } while (this.isPositionOccupied(position));

        // Create food mesh with glow
        const geometry = new THREE.SphereGeometry(0.25, 12, 12);
        const material = new THREE.MeshPhysicalMaterial({
            color: this.accentColor,
            metalness: 0.4,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0,
            emissive: this.accentColor,
            emissiveIntensity: 0.3,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            position.x * this.CELL_SIZE,
            0.4,
            position.z * this.CELL_SIZE
        );
        mesh.castShadow = true;

        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.accentColor,
            transparent: true,
            opacity: 0.15,
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.copy(mesh.position);

        this.scene.add(mesh, glowMesh);
        this.gameObjects.push(mesh, glowMesh);

        this.food = { mesh, glowMesh, position };
    }

    private isPositionOccupied(position: { x: number; z: number }): boolean {
        return this.snake.some(
            segment => segment.position.x === position.x && segment.position.z === position.z
        );
    }

    private bindKeyboardEvents(): void {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!this.isRunning || this.gameOver) return;

            switch (event.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.direction !== 'down') this.nextDirection = 'up';
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.direction !== 'up') this.nextDirection = 'down';
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.direction !== 'right') this.nextDirection = 'left';
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.direction !== 'left') this.nextDirection = 'right';
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        (this as any)._keydownHandler = handleKeyDown;
    }

    protected onTouchStart(touch: Touch): void {
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    protected onTouchEnd(touch: Touch): void {
        if (!this.isRunning || this.gameOver) return;

        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        const minSwipe = 30;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (Math.abs(dx) > minSwipe) {
                if (dx > 0 && this.direction !== 'left') {
                    this.nextDirection = 'right';
                } else if (dx < 0 && this.direction !== 'right') {
                    this.nextDirection = 'left';
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(dy) > minSwipe) {
                if (dy > 0 && this.direction !== 'up') {
                    this.nextDirection = 'down';
                } else if (dy < 0 && this.direction !== 'down') {
                    this.nextDirection = 'up';
                }
            }
        }
    }

    protected update(delta: number): void {
        if (this.gameOver) return;

        // Animate food
        if (this.food) {
            this.food.mesh.rotation.y += delta * 2;
            this.food.mesh.rotation.x += delta * 0.5;
            this.food.mesh.position.y = 0.4 + Math.sin(Date.now() * 0.005) * 0.1;
            this.food.glowMesh.position.y = this.food.mesh.position.y;
            this.food.glowMesh.scale.setScalar(1 + Math.sin(Date.now() * 0.008) * 0.2);
        }

        // Update particles
        this.updateParticles(delta);

        // Move snake on interval
        this.moveTimer += delta;
        if (this.moveTimer >= this.MOVE_INTERVAL) {
            this.moveTimer = 0;
            this.moveSnake();
        }

        // Animate snake segments (subtle bobbing)
        this.snake.forEach((segment, index) => {
            const bobOffset = Math.sin(Date.now() * 0.01 + index * 0.5) * 0.02;
            const baseY = index === 0 ? 0.35 : 0.3;
            segment.mesh.position.y = baseY + bobOffset;
        });
    }

    private moveSnake(): void {
        this.direction = this.nextDirection;

        // Calculate new head position
        const head = this.snake[0];
        const newPosition = { ...head.position };

        switch (this.direction) {
            case 'up':
                newPosition.z -= 1;
                break;
            case 'down':
                newPosition.z += 1;
                break;
            case 'left':
                newPosition.x -= 1;
                break;
            case 'right':
                newPosition.x += 1;
                break;
        }

        // Check wall collision
        const halfGrid = Math.floor(this.GRID_SIZE / 2);
        if (
            newPosition.x < -halfGrid || newPosition.x >= halfGrid ||
            newPosition.z < -halfGrid || newPosition.z >= halfGrid
        ) {
            this.handleGameOver('wall');
            return;
        }

        // Check self collision
        if (this.isPositionOccupied(newPosition)) {
            this.handleGameOver('self');
            return;
        }

        // Check food collision
        let ateFood = false;
        if (this.food &&
            newPosition.x === this.food.position.x &&
            newPosition.z === this.food.position.z) {
            ateFood = true;
            this.score += 10;
            this.behaviorData.hits++;
            this.updateScoreDisplay();
            this.createFoodParticles(this.food.mesh.position);

            // Remove food
            this.scene.remove(this.food.mesh, this.food.glowMesh);
            this.food = null;

            // Spawn new food
            this.spawnFood();
        }

        // Move snake: add new head
        const newHead = this.createSnakeSegment(newPosition, true, 0);

        // Update old head to body appearance
        const oldHead = this.snake[0];
        (oldHead.mesh.material as THREE.MeshPhysicalMaterial).color.setHex(this.primaryColor);

        // Insert new head
        this.snake.unshift(newHead);

        // Remove tail if didn't eat (snake grows when eating)
        if (!ateFood) {
            const tail = this.snake.pop()!;
            this.scene.remove(tail.mesh);
            const objIndex = this.gameObjects.indexOf(tail.mesh);
            if (objIndex > -1) {
                this.gameObjects.splice(objIndex, 1);
            }
            tail.mesh.geometry.dispose();
            (tail.mesh.material as THREE.Material).dispose();
        }

        // Rotate head based on direction
        this.updateHeadRotation();

        // Update segment colors
        this.updateSegmentColors();
    }

    private updateHeadRotation(): void {
        const head = this.snake[0].mesh;
        switch (this.direction) {
            case 'up':
                head.rotation.y = Math.PI;
                break;
            case 'down':
                head.rotation.y = 0;
                break;
            case 'left':
                head.rotation.y = Math.PI / 2;
                break;
            case 'right':
                head.rotation.y = -Math.PI / 2;
                break;
        }
    }

    private updateSegmentColors(): void {
        for (let i = 1; i < this.snake.length; i++) {
            const segment = this.snake[i];
            const color = this.lerpColor(
                this.primaryColor,
                this.secondaryColor,
                Math.min(i / 8, 1)
            );
            (segment.mesh.material as THREE.MeshPhysicalMaterial).color.setHex(color);
        }
    }

    private createFoodParticles(position: THREE.Vector3): void {
        const particleCount = 25;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];

        const color = new THREE.Color(this.accentColor);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 4 + 1,
                (Math.random() - 0.5) * 3
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
        (particles as any).life = 1.0;

        this.scene.add(particles);
        this.particles.push(particles);
    }

    private updateParticles(delta: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const velocities = (p as any).velocities as THREE.Vector3[];
            const positions = p.geometry.attributes.position.array as Float32Array;

            for (let j = 0; j < velocities.length; j++) {
                positions[j * 3] += velocities[j].x * delta;
                positions[j * 3 + 1] += velocities[j].y * delta;
                positions[j * 3 + 2] += velocities[j].z * delta;
                velocities[j].y -= 9.8 * delta; // Gravity
            }
            p.geometry.attributes.position.needsUpdate = true;

            (p as any).life -= delta * 2;
            (p.material as THREE.PointsMaterial).opacity = Math.max(0, (p as any).life);

            if ((p as any).life <= 0) {
                this.scene.remove(p);
                p.geometry.dispose();
                (p.material as THREE.Material).dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    private handleGameOver(reason: 'wall' | 'self'): void {
        this.gameOver = true;
        this.behaviorData.misses++;

        // Flash effect on collision
        this.snake.forEach(segment => {
            const material = segment.mesh.material as THREE.MeshPhysicalMaterial;
            material.emissive.setHex(0xff0000);
            material.emissiveIntensity = 0.5;
        });

        // End game after short delay
        setTimeout(() => this.endGame(), 500);
    }

    start(onComplete: (data: any) => void): void {
        super.start(onComplete);
        this.gameOver = false;
        this.score = 0;
        this.updateScoreDisplay();
    }

    destroy(): void {
        // Remove keyboard listener
        if ((this as any)._keydownHandler) {
            window.removeEventListener('keydown', (this as any)._keydownHandler);
        }

        // Remove score display
        if (this.scoreDisplay && this.scoreDisplay.parentNode) {
            this.scoreDisplay.parentNode.removeChild(this.scoreDisplay);
        }

        // Clean up snake
        this.snake.forEach(segment => {
            this.scene.remove(segment.mesh);
            segment.mesh.geometry.dispose();
            (segment.mesh.material as THREE.Material).dispose();
        });
        this.snake = [];

        // Clean up food
        if (this.food) {
            this.scene.remove(this.food.mesh, this.food.glowMesh);
            this.food.mesh.geometry.dispose();
            (this.food.mesh.material as THREE.Material).dispose();
            this.food = null;
        }

        // Clean up particles
        this.particles.forEach(p => {
            this.scene.remove(p);
            p.geometry.dispose();
            (p.material as THREE.Material).dispose();
        });
        this.particles = [];

        super.destroy();
    }
}

export default SnakeGame;
