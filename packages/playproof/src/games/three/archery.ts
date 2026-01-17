/**
 * 3D Archery Game
 * Beautiful 3D bow and arrow with physics-based trajectory
 */

import * as THREE from 'three';
import { ThreeBaseGame } from './base-game';
import type { PlayproofConfig, SDKHooks } from '../../types';

interface Arrow {
    group: THREE.Group;
    velocity: THREE.Vector3;
    active: boolean;
    trail: THREE.Line;
}

export class ArcheryGame extends ThreeBaseGame {
    private bow!: THREE.Group;
    private target!: THREE.Group;
    private arrows: Arrow[] = [];
    private isDrawing: boolean = false;
    private drawStart: THREE.Vector2 = new THREE.Vector2();
    private drawPower: number = 0;
    private aimAngle: number = 0;
    private drawStartTime: number = 0;
    private aimLine: THREE.Line | null = null;
    private readonly GRAVITY = -9.8;
    private readonly MAX_POWER = 25;
    private readonly TARGET_RINGS = 5;
    private shotsRemaining: number = 5;
    private score: number = 0;
    private scoreDisplay: HTMLDivElement | null = null;

    constructor(gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks = {} as SDKHooks) {
        super(gameArea, config, hooks);
    }

    protected async setupGame(): Promise<void> {
        // Camera setup for side view archery
        this.camera.position.set(0, 2, 15);
        this.camera.lookAt(0, 1, 0);

        // Create bow
        this.createBow();

        // Create target
        this.createTarget();

        // Create ground
        this.createGround();

        // Create sky gradient
        this.createSkybox();

        // Create score display
        this.createScoreDisplay();
    }

    private createBow(): void {
        this.bow = new THREE.Group();

        // Bow limb curve
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(0, -1.2, 0),
            new THREE.Vector3(-0.5, 0, 0),
            new THREE.Vector3(0, 1.2, 0)
        );

        const tubeGeometry = new THREE.TubeGeometry(curve, 32, 0.05, 8, false);
        const bowMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.6,
            metalness: 0.1,
        });
        const bowMesh = new THREE.Mesh(tubeGeometry, bowMaterial);
        this.bow.add(bowMesh);

        // Bowstring
        const stringGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -1.2, 0),
            new THREE.Vector3(-0.1, 0, 0), // Resting position
            new THREE.Vector3(0, 1.2, 0),
        ]);
        const stringMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const bowstring = new THREE.Line(stringGeometry, stringMaterial);
        bowstring.name = 'bowstring';
        this.bow.add(bowstring);

        // Grip
        const gripGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8);
        const gripMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d1b0e,
            roughness: 0.8,
        });
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.rotation.z = Math.PI / 2;
        grip.position.x = -0.1;
        this.bow.add(grip);

        this.bow.position.set(-6, 1.5, 0);
        this.scene.add(this.bow);
        this.gameObjects.push(this.bow);
    }

    private createTarget(): void {
        this.target = new THREE.Group();

        const ringColors = [
            0xffd700, // Gold center (bullseye)
            0xef4444, // Red
            0x3b82f6, // Blue
            0x22c55e, // Green
            0xffffff, // White
        ];

        const maxRadius = 1.5;
        const ringWidth = maxRadius / this.TARGET_RINGS;

        for (let i = this.TARGET_RINGS - 1; i >= 0; i--) {
            const radius = ringWidth * (i + 1);
            const ringGeometry = new THREE.CircleGeometry(radius, 32);
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: ringColors[i],
                side: THREE.DoubleSide,
                roughness: 0.8,
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.z = i * 0.01; // Slight offset to prevent z-fighting
            this.target.add(ring);
        }

        // Target stand
        const standGeometry = new THREE.BoxGeometry(0.2, 3, 0.3);
        const standMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.7,
        });
        const stand = new THREE.Mesh(standGeometry, standMaterial);
        stand.position.y = -1.5;
        stand.position.z = -0.2;
        this.target.add(stand);

        this.target.position.set(6, 2, 0);
        this.target.rotation.y = -0.1; // Slight angle for visual interest
        this.scene.add(this.target);
        this.gameObjects.push(this.target);
    }

    private createGround(): void {
        const groundGeometry = new THREE.PlaneGeometry(30, 10);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3d6b3d,
            roughness: 1,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.5;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.gameObjects.push(ground);
    }

    private createSkybox(): void {
        // Gradient background
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;
        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2, 256);

        const texture = new THREE.CanvasTexture(canvas);
        this.scene.background = texture;
    }

    private createScoreDisplay(): void {
        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            background: rgba(0,0,0,0.5);
            padding: 8px 12px;
            border-radius: 6px;
            font-family: 'Inter', sans-serif;
        `;
        this.updateScoreDisplay();
        this.container.appendChild(this.scoreDisplay);
    }

    private updateScoreDisplay(): void {
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = `Arrows: ${this.shotsRemaining} | Score: ${this.score}`;
        }
    }

    private createArrow(): THREE.Group {
        const arrow = new THREE.Group();

        // Shaft
        const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8);
        const shaftMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.5,
        });
        const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
        shaft.rotation.z = Math.PI / 2;
        arrow.add(shaft);

        // Arrowhead
        const headGeometry = new THREE.ConeGeometry(0.05, 0.15, 8);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.8,
            roughness: 0.2,
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.z = -Math.PI / 2;
        head.position.x = 0.65;
        arrow.add(head);

        // Fletching
        const fletchGeometry = new THREE.PlaneGeometry(0.15, 0.08);
        const fletchMaterial = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            side: THREE.DoubleSide,
        });

        for (let i = 0; i < 3; i++) {
            const fletch = new THREE.Mesh(fletchGeometry, fletchMaterial);
            fletch.position.x = -0.5;
            fletch.rotation.x = (i * Math.PI * 2) / 3;
            arrow.add(fletch);
        }

        return arrow;
    }

    private createAimLine(): void {
        if (this.aimLine) return;

        const material = new THREE.LineDashedMaterial({
            color: 0xffff00,
            dashSize: 0.2,
            gapSize: 0.1,
            transparent: true,
            opacity: 0.7,
        });

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(1, 0, 0),
        ]);

        this.aimLine = new THREE.Line(geometry, material);
        this.aimLine.computeLineDistances();
        this.scene.add(this.aimLine);
    }

    private updateAimLine(power: number, angle: number): void {
        if (!this.aimLine) this.createAimLine();

        const points: THREE.Vector3[] = [];
        const startPos = this.bow.position.clone();
        startPos.x += 0.5;

        const velocity = power;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        // Simulate trajectory
        for (let t = 0; t < 2; t += 0.05) {
            const x = startPos.x + vx * t;
            const y = startPos.y + vy * t + 0.5 * this.GRAVITY * t * t;

            if (y < -0.5) break;
            points.push(new THREE.Vector3(x, y, 0));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        this.aimLine!.geometry.dispose();
        this.aimLine!.geometry = geometry;
        this.aimLine!.computeLineDistances();
    }

    private shootArrow(): void {
        if (this.shotsRemaining <= 0) return;

        const arrowGroup = this.createArrow();
        arrowGroup.position.copy(this.bow.position);
        arrowGroup.position.x += 0.5;

        // Calculate velocity from draw power and angle
        const speed = this.drawPower;
        const velocity = new THREE.Vector3(
            Math.cos(this.aimAngle) * speed,
            Math.sin(this.aimAngle) * speed,
            0
        );

        // Create trail
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.5,
        });
        const trailGeometry = new THREE.BufferGeometry().setFromPoints([
            arrowGroup.position.clone(),
            arrowGroup.position.clone(),
        ]);
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(trail);

        const arrow: Arrow = {
            group: arrowGroup,
            velocity,
            active: true,
            trail,
        };

        this.arrows.push(arrow);
        this.scene.add(arrowGroup);
        this.gameObjects.push(arrowGroup);

        this.shotsRemaining--;
        this.updateScoreDisplay();

        // Record shot data
        this.behaviorData.trajectories.push([{
            x: this.drawStart.x,
            y: this.drawStart.y,
            timestamp: this.drawStartTime,
        }]);
    }

    protected update(delta: number): void {
        // Update arrows
        for (const arrow of this.arrows) {
            if (!arrow.active) continue;

            // Apply gravity
            arrow.velocity.y += this.GRAVITY * delta;

            // Update position
            arrow.group.position.add(arrow.velocity.clone().multiplyScalar(delta));

            // Rotate arrow to face velocity direction
            const angle = Math.atan2(arrow.velocity.y, arrow.velocity.x);
            arrow.group.rotation.z = angle;

            // Update trail
            const positions = arrow.trail.geometry.attributes.position.array as Float32Array;
            positions[3] = arrow.group.position.x;
            positions[4] = arrow.group.position.y;
            positions[5] = arrow.group.position.z;
            arrow.trail.geometry.attributes.position.needsUpdate = true;

            // Check target collision
            const targetPos = this.target.position;
            const dist = arrow.group.position.distanceTo(targetPos);

            if (dist < 1.8 && arrow.group.position.x > targetPos.x - 0.5) {
                // Hit target!
                arrow.active = false;

                // Calculate score based on distance from center
                const hitDist = new THREE.Vector2(
                    arrow.group.position.y - targetPos.y,
                    arrow.group.position.z - targetPos.z
                ).length();

                const ringWidth = 1.5 / this.TARGET_RINGS;
                const ring = Math.min(Math.floor(hitDist / ringWidth), this.TARGET_RINGS - 1);
                const points = (this.TARGET_RINGS - ring) * 10;
                this.score += points;
                this.behaviorData.hits++;
                this.updateScoreDisplay();
            }

            // Check ground collision
            if (arrow.group.position.y < -0.3) {
                arrow.active = false;
                this.behaviorData.misses++;
            }

            // Out of bounds
            if (arrow.group.position.x > 10 || arrow.group.position.x < -10) {
                arrow.active = false;
                this.behaviorData.misses++;
            }
        }

        // Update bowstring when drawing
        if (this.isDrawing) {
            this.updateBowstring();
        }
    }

    private updateBowstring(): void {
        const bowstring = this.bow.getObjectByName('bowstring') as THREE.Line;
        if (!bowstring) return;

        const pullBack = Math.min(this.drawPower / this.MAX_POWER * 0.5, 0.5);
        const points = [
            new THREE.Vector3(0, -1.2, 0),
            new THREE.Vector3(-0.1 - pullBack, 0, 0),
            new THREE.Vector3(0, 1.2, 0),
        ];

        bowstring.geometry.dispose();
        bowstring.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }

    private resetBowstring(): void {
        const bowstring = this.bow.getObjectByName('bowstring') as THREE.Line;
        if (!bowstring) return;

        const points = [
            new THREE.Vector3(0, -1.2, 0),
            new THREE.Vector3(-0.1, 0, 0),
            new THREE.Vector3(0, 1.2, 0),
        ];

        bowstring.geometry.dispose();
        bowstring.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }

    protected onClick(x: number, y: number): void {
        if (this.shotsRemaining <= 0) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.drawStart.set(x, y);
        this.drawStartTime = Date.now();
        this.isDrawing = true;
        this.drawPower = 0;
        this.aimAngle = 0;
    }

    protected onMouseMove(x: number, y: number): void {
        if (!this.isDrawing) return;

        const dx = x - this.drawStart.x;
        const dy = y - this.drawStart.y;

        // Power based on pull distance (pulling left)
        this.drawPower = Math.min(Math.abs(dx) * 0.15, this.MAX_POWER);

        // Angle based on vertical movement (inverted for natural aiming)
        this.aimAngle = -dy * 0.005;
        this.aimAngle = Math.max(-0.5, Math.min(0.5, this.aimAngle));

        this.updateAimLine(this.drawPower, this.aimAngle);
    }

    protected onTouchStart(touch: Touch): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.onClick(x, y);
    }

    protected onTouchMove(touch: Touch): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.onMouseMove(x, y);
    }

    protected onTouchEnd(_touch: Touch): void {
        if (this.isDrawing && this.drawPower > 2) {
            this.shootArrow();
        }
        this.isDrawing = false;
        this.resetBowstring();
        if (this.aimLine) {
            this.scene.remove(this.aimLine);
            this.aimLine.geometry.dispose();
            (this.aimLine.material as THREE.Material).dispose();
            this.aimLine = null;
        }
    }

    // Override click to use mouseup for shooting
    protected handleClick = (event: MouseEvent): void => {
        // Don't use the normal click - we use mousedown/up
    };

    protected bindEvents(): void {
        super.bindEvents();

        const canvas = this.renderer.domElement;
        canvas.addEventListener('mousedown', this.handleMouseDown);
        canvas.addEventListener('mouseup', this.handleMouseUp);
    }

    private handleMouseDown = (event: MouseEvent): void => {
        if (!this.isRunning) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        this.onClick(x, y);
    };

    private handleMouseUp = (_event: MouseEvent): void => {
        if (!this.isRunning) return;
        if (this.isDrawing && this.drawPower > 2) {
            this.shootArrow();
            this.behaviorData.clickTimings.push(Date.now());
        }
        this.isDrawing = false;
        this.resetBowstring();
        if (this.aimLine) {
            this.scene.remove(this.aimLine);
            this.aimLine.geometry.dispose();
            (this.aimLine.material as THREE.Material).dispose();
            this.aimLine = null;
        }
    };

    destroy(): void {
        const canvas = this.renderer.domElement;
        canvas.removeEventListener('mousedown', this.handleMouseDown);
        canvas.removeEventListener('mouseup', this.handleMouseUp);

        if (this.scoreDisplay && this.scoreDisplay.parentNode) {
            this.scoreDisplay.parentNode.removeChild(this.scoreDisplay);
        }

        this.arrows.forEach(arrow => {
            this.scene.remove(arrow.group);
            this.scene.remove(arrow.trail);
            arrow.trail.geometry.dispose();
            (arrow.trail.material as THREE.Material).dispose();
        });
        this.arrows = [];

        if (this.aimLine) {
            this.scene.remove(this.aimLine);
            this.aimLine.geometry.dispose();
            (this.aimLine.material as THREE.Material).dispose();
        }

        super.destroy();
    }
}

export default ArcheryGame;
