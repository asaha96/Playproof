/**
 * Osu! Rhythm Game
 * Click circles and follow sliders with approach circle timing
 */

import * as THREE from 'three';
import { ThreeBaseGame } from './base-game';
import type { PlayproofConfig, SDKHooks } from '../../types';

// ============================================================================
// Types and Interfaces
// ============================================================================

type CurveType = 'linear' | 'bezier' | 'catmull';

interface TimingWindow {
    perfect: number;
    good: number;
    ok: number;
    miss: number;
}

interface DifficultySettings {
    approachRate: { min: number; max: number };
    circleSize: { min: number; max: number };
    sliderSpeed: { min: number; max: number };
    objectDensity: { min: number; max: number };
    sliderChance: number;
    curvedSliderChance: number;
}

interface HitResult {
    timing: 'perfect' | 'good' | 'ok' | 'miss';
    timeDelta: number;
}

// ============================================================================
// Base Hit Object
// ============================================================================

abstract class HitObject {
    protected scene: THREE.Scene;
    protected position: THREE.Vector2;
    protected size: number;
    protected spawnTime: number;
    protected approachDuration: number;
    protected isActive: boolean = true;
    protected isHit: boolean = false;
    protected group: THREE.Group;

    constructor(
        scene: THREE.Scene,
        position: THREE.Vector2,
        size: number,
        spawnTime: number,
        approachDuration: number
    ) {
        this.scene = scene;
        this.position = position;
        this.size = size;
        this.spawnTime = spawnTime;
        this.approachDuration = approachDuration;
        this.group = new THREE.Group();
        this.group.position.set(position.x, position.y, 0);
        this.scene.add(this.group);
    }

    abstract update(currentTime: number, delta: number): void;
    abstract checkHit(clickPos: THREE.Vector2, currentTime: number): HitResult | null;
    
    getPosition(): THREE.Vector2 {
        return this.position.clone();
    }

    isStillActive(): boolean {
        return this.isActive;
    }

    wasHit(): boolean {
        return this.isHit;
    }

    getTargetTime(): number {
        return this.spawnTime + this.approachDuration;
    }

    destroy(): void {
        this.scene.remove(this.group);
        this.group.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
            if (obj instanceof THREE.Line) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    (obj.material as THREE.Material).dispose();
                }
            }
        });
    }
}

// ============================================================================
// Hit Circle
// ============================================================================

class HitCircle extends HitObject {
    private circleMesh: THREE.Mesh;
    private approachCircle: THREE.Mesh;
    private innerGlow: THREE.Mesh;
    private timingWindows: TimingWindow;
    private color: THREE.Color;

    constructor(
        scene: THREE.Scene,
        position: THREE.Vector2,
        size: number,
        spawnTime: number,
        approachDuration: number,
        color: THREE.Color,
        timingWindows: TimingWindow
    ) {
        super(scene, position, size, spawnTime, approachDuration);
        this.color = color;
        this.timingWindows = timingWindows;

        // Main circle
        const circleGeometry = new THREE.CircleGeometry(size, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
        });
        this.circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);
        this.circleMesh.position.z = 0.1;
        this.group.add(this.circleMesh);

        // Inner glow
        const glowGeometry = new THREE.CircleGeometry(size * 0.6, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
        });
        this.innerGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.innerGlow.position.z = 0.2;
        this.group.add(this.innerGlow);

        // Approach circle (ring)
        const approachGeometry = new THREE.RingGeometry(size * 2 - 0.05, size * 2, 64);
        const approachMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });
        this.approachCircle = new THREE.Mesh(approachGeometry, approachMaterial);
        this.approachCircle.position.z = 0.05;
        this.group.add(this.approachCircle);

        // Border ring on main circle
        const borderGeometry = new THREE.RingGeometry(size - 0.03, size, 64);
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
        });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.z = 0.15;
        this.group.add(border);
    }

    update(currentTime: number, _delta: number): void {
        if (!this.isActive) return;

        const elapsed = currentTime - this.spawnTime;
        const progress = Math.min(elapsed / this.approachDuration, 1);

        // Shrink approach circle from 2x to 1x
        const scale = 2 - progress;
        this.approachCircle.scale.set(scale, scale, 1);

        // Update approach circle geometry to maintain ring thickness
        const currentRadius = this.size * scale;
        this.approachCircle.geometry.dispose();
        this.approachCircle.geometry = new THREE.RingGeometry(
            currentRadius - 0.05,
            currentRadius,
            64
        );

        // Fade in the circle
        const fadeIn = Math.min(elapsed / 200, 1);
        (this.circleMesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * fadeIn;

        // Check if missed (beyond timing window)
        const targetTime = this.getTargetTime();
        if (currentTime > targetTime + this.timingWindows.miss) {
            this.isActive = false;
        }
    }

    checkHit(clickPos: THREE.Vector2, currentTime: number): HitResult | null {
        if (!this.isActive || this.isHit) return null;

        const distance = clickPos.distanceTo(this.position);
        if (distance > this.size * 1.2) return null; // Not clicking on this circle

        const targetTime = this.getTargetTime();
        const timeDelta = Math.abs(currentTime - targetTime);

        let timing: HitResult['timing'];
        if (timeDelta <= this.timingWindows.perfect) {
            timing = 'perfect';
        } else if (timeDelta <= this.timingWindows.good) {
            timing = 'good';
        } else if (timeDelta <= this.timingWindows.ok) {
            timing = 'ok';
        } else if (timeDelta <= this.timingWindows.miss) {
            timing = 'miss';
        } else {
            return null; // Too early or too late
        }

        this.isHit = true;
        this.isActive = false;
        return { timing, timeDelta };
    }
}

// ============================================================================
// Slider
// ============================================================================

class Slider extends HitObject {
    private path: any; // THREE.CurvePath
    private sliderBody: THREE.Mesh;
    private sliderBall: THREE.Mesh;
    private startCircle: THREE.Mesh;
    private endCircle: THREE.Mesh;
    private approachCircle: THREE.Mesh;
    private duration: number;
    private curveType: CurveType;
    private timingWindows: TimingWindow;
    private color: THREE.Color;
    private isFollowing: boolean = false;
    private followProgress: number = 0;
    private followAccuracy: number = 1;
    private sliderStarted: boolean = false;
    private pathPoints3D: THREE.Vector3[];

    constructor(
        scene: THREE.Scene,
        position: THREE.Vector2,
        size: number,
        spawnTime: number,
        approachDuration: number,
        color: THREE.Color,
        timingWindows: TimingWindow,
        path: any, // THREE.CurvePath
        duration: number,
        curveType: CurveType
    ) {
        super(scene, position, size, spawnTime, approachDuration);
        this.path = path;
        this.duration = duration;
        this.curveType = curveType;
        this.color = color;
        this.timingWindows = timingWindows;

        // Convert 2D path to 3D points for rendering
        const points2D = path.getPoints(50);
        this.pathPoints3D = points2D.map(p => new THREE.Vector3(p.x, p.y, 0));

        // Create slider body (thick line)
        this.sliderBody = this.createSliderBody();
        this.group.add(this.sliderBody);

        // Start circle
        const startGeometry = new THREE.CircleGeometry(size, 32);
        const startMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
        });
        this.startCircle = new THREE.Mesh(startGeometry, startMaterial);
        this.startCircle.position.z = 0.1;
        this.group.add(this.startCircle);

        // End circle
        const endPoint = points2D[points2D.length - 1];
        const endGeometry = new THREE.CircleGeometry(size * 0.8, 32);
        const endMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
        });
        this.endCircle = new THREE.Mesh(endGeometry, endMaterial);
        this.endCircle.position.set(endPoint.x - position.x, endPoint.y - position.y, 0.1);
        this.group.add(this.endCircle);

        // Slider ball (follows the path)
        const ballGeometry = new THREE.CircleGeometry(size * 0.5, 32);
        const ballMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
        });
        this.sliderBall = new THREE.Mesh(ballGeometry, ballMaterial);
        this.sliderBall.position.z = 0.3;
        this.group.add(this.sliderBall);

        // Approach circle
        const approachGeometry = new THREE.RingGeometry(size * 2 - 0.05, size * 2, 64);
        const approachMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });
        this.approachCircle = new THREE.Mesh(approachGeometry, approachMaterial);
        this.approachCircle.position.z = 0.05;
        this.group.add(this.approachCircle);

        // Border on start circle
        const borderGeometry = new THREE.RingGeometry(size - 0.03, size, 64);
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide,
        });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.z = 0.15;
        this.group.add(border);
    }

    private createSliderBody(): THREE.Mesh {
        // Create a tube-like shape along the path
        const shape = new THREE.Shape();
        const radius = this.size * 0.8;

        // Get path points relative to group position
        const points = this.path.getPoints(50);
        const relativePoints = points.map(p => 
            new THREE.Vector2(p.x - this.position.x, p.y - this.position.y)
        );

        if (relativePoints.length < 2) {
            // Fallback to simple circle
            shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
            const geometry = new THREE.ShapeGeometry(shape);
            return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: this.color }));
        }

        // Build a rounded rectangle path following the curve
        const geometry = this.buildSliderGeometry(relativePoints, radius);
        const material = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.6,
        });

        return new THREE.Mesh(geometry, material);
    }

    private buildSliderGeometry(points: THREE.Vector2[], radius: number): THREE.BufferGeometry {
        // Create a simple extruded path
        const vertices: number[] = [];
        const indices: number[] = [];

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Direction vector
            const dir = new THREE.Vector2().subVectors(p2, p1).normalize();
            // Perpendicular vector
            const perp = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(radius);

            const baseIndex = vertices.length / 3;

            // Add 4 vertices for this segment
            vertices.push(p1.x + perp.x, p1.y + perp.y, 0);
            vertices.push(p1.x - perp.x, p1.y - perp.y, 0);
            vertices.push(p2.x + perp.x, p2.y + perp.y, 0);
            vertices.push(p2.x - perp.x, p2.y - perp.y, 0);

            // Two triangles for the quad
            indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
            indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
        }

        // Add end caps (circles)
        const segments = 16;
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];

        // Start cap
        const startCenterIndex = vertices.length / 3;
        vertices.push(firstPoint.x, firstPoint.y, 0);
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            vertices.push(
                firstPoint.x + Math.cos(angle) * radius,
                firstPoint.y + Math.sin(angle) * radius,
                0
            );
            if (i > 0) {
                indices.push(startCenterIndex, startCenterIndex + i, startCenterIndex + i + 1);
            }
        }

        // End cap
        const endCenterIndex = vertices.length / 3;
        vertices.push(lastPoint.x, lastPoint.y, 0);
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            vertices.push(
                lastPoint.x + Math.cos(angle) * radius,
                lastPoint.y + Math.sin(angle) * radius,
                0
            );
            if (i > 0) {
                indices.push(endCenterIndex, endCenterIndex + i, endCenterIndex + i + 1);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        return geometry;
    }

    update(currentTime: number, _delta: number): void {
        if (!this.isActive) return;

        const elapsed = currentTime - this.spawnTime;
        const approachProgress = Math.min(elapsed / this.approachDuration, 1);

        // Shrink approach circle
        const scale = 2 - approachProgress;
        this.approachCircle.scale.set(scale, scale, 1);
        this.approachCircle.geometry.dispose();
        this.approachCircle.geometry = new THREE.RingGeometry(
            this.size * scale - 0.05,
            this.size * scale,
            64
        );

        // Fade in
        const fadeIn = Math.min(elapsed / 200, 1);
        (this.sliderBody.material as THREE.MeshBasicMaterial).opacity = 0.6 * fadeIn;

        // After approach, handle slider ball movement
        const targetTime = this.getTargetTime();
        if (currentTime >= targetTime && this.sliderStarted) {
            const sliderElapsed = currentTime - targetTime;
            this.followProgress = Math.min(sliderElapsed / this.duration, 1);

            // Update slider ball position
            const pathPoint = this.path.getPoint(this.followProgress);
            this.sliderBall.position.set(
                pathPoint.x - this.position.x,
                pathPoint.y - this.position.y,
                0.3
            );
            (this.sliderBall.material as THREE.MeshBasicMaterial).opacity = 0.9;

            // Check if slider is complete
            if (this.followProgress >= 1) {
                this.isActive = false;
                this.isHit = true;
            }
        }

        // Check if missed start (beyond timing window)
        if (!this.sliderStarted && currentTime > targetTime + this.timingWindows.miss) {
            this.isActive = false;
        }
    }

    checkHit(clickPos: THREE.Vector2, currentTime: number): HitResult | null {
        if (!this.isActive || this.sliderStarted) return null;

        const distance = clickPos.distanceTo(this.position);
        if (distance > this.size * 1.2) return null;

        const targetTime = this.getTargetTime();
        const timeDelta = Math.abs(currentTime - targetTime);

        let timing: HitResult['timing'];
        if (timeDelta <= this.timingWindows.perfect) {
            timing = 'perfect';
        } else if (timeDelta <= this.timingWindows.good) {
            timing = 'good';
        } else if (timeDelta <= this.timingWindows.ok) {
            timing = 'ok';
        } else if (timeDelta <= this.timingWindows.miss) {
            timing = 'miss';
        } else {
            return null;
        }

        this.sliderStarted = true;
        this.isFollowing = true;
        return { timing, timeDelta };
    }

    updateFollow(mousePos: THREE.Vector2, isHolding: boolean): void {
        if (!this.sliderStarted || !this.isActive) return;

        if (!isHolding) {
            this.isFollowing = false;
            this.followAccuracy *= 0.8; // Penalty for releasing
            return;
        }

        // Check if mouse is close to slider ball
        const ballWorldPos = new THREE.Vector2(
            this.sliderBall.position.x + this.position.x,
            this.sliderBall.position.y + this.position.y
        );
        const distance = mousePos.distanceTo(ballWorldPos);
        
        if (distance > this.size * 2) {
            this.followAccuracy *= 0.95; // Gradual penalty for being off track
        }
    }

    getFollowAccuracy(): number {
        return this.followAccuracy;
    }

    isSliderActive(): boolean {
        return this.sliderStarted && this.isActive;
    }
}

// ============================================================================
// Path Generator
// ============================================================================

class PathGenerator {
    private bounds: { minX: number; maxX: number; minY: number; maxY: number };
    private lastPosition: THREE.Vector2;
    private momentum: THREE.Vector2;
    private noiseOffset: number;

    constructor(bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
        this.bounds = bounds;
        this.noiseOffset = Math.random() * 1000;
        this.lastPosition = new THREE.Vector2(0, 0);
        this.momentum = new THREE.Vector2(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ).normalize();
    }

    private simpleNoise(x: number): number {
        // Simple pseudo-random noise function
        const sin = Math.sin(x * 12.9898 + this.noiseOffset) * 43758.5453;
        return sin - Math.floor(sin);
    }

    generateNextPosition(minDist: number, maxDist: number): THREE.Vector2 {
        this.noiseOffset += 0.1;

        // Random distance
        const distance = minDist + this.simpleNoise(this.noiseOffset) * (maxDist - minDist);

        // Random angle change with momentum
        const angleNoise = (this.simpleNoise(this.noiseOffset + 100) - 0.5) * Math.PI * 1.2;
        const currentAngle = Math.atan2(this.momentum.y, this.momentum.x);
        const newAngle = currentAngle + angleNoise;

        // Calculate new position
        const offset = new THREE.Vector2(
            Math.cos(newAngle) * distance,
            Math.sin(newAngle) * distance
        );

        let newPos = this.lastPosition.clone().add(offset);

        // Clamp to bounds with padding
        const padding = 0.5;
        newPos.x = Math.max(this.bounds.minX + padding, Math.min(this.bounds.maxX - padding, newPos.x));
        newPos.y = Math.max(this.bounds.minY + padding, Math.min(this.bounds.maxY - padding, newPos.y));

        // If we hit a boundary, bounce the momentum
        if (newPos.x <= this.bounds.minX + padding || newPos.x >= this.bounds.maxX - padding) {
            this.momentum.x *= -1;
        }
        if (newPos.y <= this.bounds.minY + padding || newPos.y >= this.bounds.maxY - padding) {
            this.momentum.y *= -1;
        }

        // Update momentum towards new direction
        const newDir = new THREE.Vector2().subVectors(newPos, this.lastPosition).normalize();
        this.momentum.lerp(newDir, 0.3);

        this.lastPosition = newPos;
        return newPos;
    }

    generateSliderPath(
        startPos: THREE.Vector2,
        curveType: CurveType,
        length: number,
        curveIntensity: number
    ): any {
        const path = new THREE.CurvePath();

        // Direction based on momentum with some randomness
        const baseAngle = Math.atan2(this.momentum.y, this.momentum.x);
        const angleOffset = (this.simpleNoise(this.noiseOffset + 200) - 0.5) * Math.PI * 0.5;
        const direction = baseAngle + angleOffset;

        const endPos = new THREE.Vector2(
            startPos.x + Math.cos(direction) * length,
            startPos.y + Math.sin(direction) * length
        );

        // Clamp end position to bounds
        const padding = 0.5;
        endPos.x = Math.max(this.bounds.minX + padding, Math.min(this.bounds.maxX - padding, endPos.x));
        endPos.y = Math.max(this.bounds.minY + padding, Math.min(this.bounds.maxY - padding, endPos.y));

        if (curveType === 'linear') {
            path.add(new THREE.LineCurve(startPos, endPos));
        } else if (curveType === 'bezier') {
            // Quadratic bezier with control point
            const midPoint = new THREE.Vector2().addVectors(startPos, endPos).multiplyScalar(0.5);
            const perpendicular = new THREE.Vector2(
                -(endPos.y - startPos.y),
                endPos.x - startPos.x
            ).normalize();
            
            const controlOffset = (this.simpleNoise(this.noiseOffset + 300) - 0.5) * 2 * curveIntensity * length;
            const controlPoint = midPoint.clone().add(perpendicular.multiplyScalar(controlOffset));

            path.add(new THREE.QuadraticBezierCurve(startPos, controlPoint, endPos));
        } else if (curveType === 'catmull') {
            // Catmull-Rom through multiple points
            const numPoints = 3 + Math.floor(this.simpleNoise(this.noiseOffset + 400) * 2);
            const points: THREE.Vector2[] = [startPos];

            for (let i = 1; i < numPoints - 1; i++) {
                const t = i / (numPoints - 1);
                const basePoint = new THREE.Vector2().lerpVectors(startPos, endPos, t);
                
                const perpendicular = new THREE.Vector2(
                    -(endPos.y - startPos.y),
                    endPos.x - startPos.x
                ).normalize();
                
                const offset = (this.simpleNoise(this.noiseOffset + 500 + i * 100) - 0.5) * 2 * curveIntensity * length * 0.5;
                basePoint.add(perpendicular.multiplyScalar(offset));
                
                points.push(basePoint);
            }
            points.push(endPos);

            path.add(new THREE.SplineCurve(points));
        }

        // Update last position for next object
        this.lastPosition = endPos;

        return path;
    }

    setPosition(pos: THREE.Vector2): void {
        this.lastPosition = pos.clone();
    }
}

// ============================================================================
// Main Osu Game Class
// ============================================================================

export class OsuGame extends ThreeBaseGame {
    private hitObjects: HitObject[] = [];
    private pathGenerator!: PathGenerator;
    private spawnTimer: number = 0;
    private gameTime: number = 0;
    private isHolding: boolean = false;
    private currentSlider: Slider | null = null;
    private mousePos: THREE.Vector2 = new THREE.Vector2();
    private orthoCamera!: THREE.OrthographicCamera;

    private combo: number = 0;
    private maxCombo: number = 0;
    private score: number = 0;
    private perfectHits: number = 0;
    private goodHits: number = 0;
    private okHits: number = 0;
    private missCount: number = 0;

    private comboDisplay: HTMLDivElement | null = null;
    private scoreDisplay: HTMLDivElement | null = null;

    private particles: THREE.Points[] = [];

    private readonly COLORS = [
        new THREE.Color(0x6366f1), // Indigo
        new THREE.Color(0x8b5cf6), // Purple
        new THREE.Color(0x22d3ee), // Cyan
        new THREE.Color(0xf472b6), // Pink
        new THREE.Color(0x34d399), // Emerald
        new THREE.Color(0xfbbf24), // Amber
    ];

    private readonly TIMING_WINDOWS: TimingWindow = {
        perfect: 50,
        good: 100,
        ok: 150,
        miss: 200,
    };

    private readonly DIFFICULTY: DifficultySettings = {
        approachRate: { min: 800, max: 1500 },
        circleSize: { min: 0.4, max: 0.8 },
        sliderSpeed: { min: 0.8, max: 1.5 },
        objectDensity: { min: 1200, max: 2000 },
        sliderChance: 0.35,
        curvedSliderChance: 0.7,
    };

    private viewSize: number = 5;
    private aspect: number = 1;

    constructor(gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks = {} as SDKHooks) {
        super(gameArea, config, hooks);
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

        // Replace perspective camera with orthographic
        (this as any).camera = this.orthoCamera;

        // Initialize path generator with bounds
        const bounds = {
            minX: -this.aspect * this.viewSize + 1,
            maxX: this.aspect * this.viewSize - 1,
            minY: -this.viewSize + 1,
            maxY: this.viewSize - 1,
        };
        this.pathGenerator = new PathGenerator(bounds);

        // Set initial position near center
        this.pathGenerator.setPosition(new THREE.Vector2(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ));

        // Create background
        this.createBackground();

        // Create UI overlays
        this.createUI();
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
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2, 256);

        const texture = new THREE.CanvasTexture(canvas);
        const bgMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: false,
        });

        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        background.position.z = -5;
        this.scene.add(background);

        // Add subtle grid lines
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0x3f3f5a,
            transparent: true,
            opacity: 0.2,
        });

        for (let x = -10; x <= 10; x += 1) {
            const points = [
                new THREE.Vector3(x, -10, -4),
                new THREE.Vector3(x, 10, -4),
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            this.scene.add(line);
        }

        for (let y = -10; y <= 10; y += 1) {
            const points = [
                new THREE.Vector3(-10, y, -4),
                new THREE.Vector3(10, y, -4),
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, gridMaterial);
            this.scene.add(line);
        }
    }

    private createUI(): void {
        // Combo display
        this.comboDisplay = document.createElement('div');
        this.comboDisplay.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            color: white;
            font-size: 24px;
            font-weight: 700;
            font-family: 'Inter', sans-serif;
            text-shadow: 0 2px 10px rgba(0,0,0,0.5);
            opacity: 0;
            transition: opacity 0.2s;
        `;
        this.container.appendChild(this.comboDisplay);

        // Score display
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
        this.container.appendChild(this.scoreDisplay);
        this.updateUI();
    }

    private updateUI(): void {
        if (this.comboDisplay) {
            if (this.combo > 0) {
                this.comboDisplay.textContent = `${this.combo}x`;
                this.comboDisplay.style.opacity = '1';
            } else {
                this.comboDisplay.style.opacity = '0';
            }
        }

        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = `Score: ${this.score}`;
        }
    }

    private random(min: number, max: number): number {
        return min + Math.random() * (max - min);
    }

    private spawnHitObject(): void {
        const isSlider = Math.random() < this.DIFFICULTY.sliderChance;
        const size = this.random(this.DIFFICULTY.circleSize.min, this.DIFFICULTY.circleSize.max);
        const approachDuration = this.random(
            this.DIFFICULTY.approachRate.min,
            this.DIFFICULTY.approachRate.max
        );
        const color = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
        const position = this.pathGenerator.generateNextPosition(0.5, 3.0);

        if (isSlider) {
            // Determine curve type
            let curveType: CurveType = 'linear';
            if (Math.random() < this.DIFFICULTY.curvedSliderChance) {
                curveType = Math.random() < 0.5 ? 'bezier' : 'catmull';
            }

            const sliderLength = this.random(1.5, 4.0);
            const curveIntensity = this.random(0.2, 0.8);
            const path = this.pathGenerator.generateSliderPath(
                position,
                curveType,
                sliderLength,
                curveIntensity
            );

            const sliderSpeed = this.random(
                this.DIFFICULTY.sliderSpeed.min,
                this.DIFFICULTY.sliderSpeed.max
            );
            const duration = (sliderLength / sliderSpeed) * 1000;

            const slider = new Slider(
                this.scene,
                position,
                size,
                this.gameTime,
                approachDuration,
                color,
                this.TIMING_WINDOWS,
                path,
                duration,
                curveType
            );

            this.hitObjects.push(slider);
        } else {
            const circle = new HitCircle(
                this.scene,
                position,
                size,
                this.gameTime,
                approachDuration,
                color,
                this.TIMING_WINDOWS
            );

            this.hitObjects.push(circle);
        }
    }

    protected update(delta: number): void {
        const deltaMs = delta * 1000;
        this.gameTime += deltaMs;

        // Spawn new hit objects
        this.spawnTimer += deltaMs;
        const spawnInterval = this.random(
            this.DIFFICULTY.objectDensity.min,
            this.DIFFICULTY.objectDensity.max
        );

        if (this.spawnTimer >= spawnInterval) {
            this.spawnHitObject();
            this.spawnTimer = 0;
        }

        // Update all hit objects
        for (let i = this.hitObjects.length - 1; i >= 0; i--) {
            const obj = this.hitObjects[i];
            obj.update(this.gameTime, deltaMs);

            // Update slider following
            if (obj instanceof Slider && obj.isSliderActive()) {
                obj.updateFollow(this.mousePos, this.isHolding);
            }

            // Check for missed objects
            if (!obj.isStillActive()) {
                if (!obj.wasHit()) {
                    this.onMiss();
                }
                obj.destroy();
                this.hitObjects.splice(i, 1);
            }
        }

        // Update particles
        this.updateParticles(delta);

        // Render with orthographic camera
        this.renderer.render(this.scene, this.orthoCamera);
    }

    private updateParticles(delta: number): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            const positions = p.geometry.attributes.position.array as Float32Array;

            // Expand outward
            for (let j = 0; j < positions.length; j += 3) {
                const dx = positions[j];
                const dy = positions[j + 1];
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
                positions[j] += (dx / dist) * delta * 3;
                positions[j + 1] += (dy / dist) * delta * 3;
            }
            p.geometry.attributes.position.needsUpdate = true;

            (p.material as THREE.PointsMaterial).opacity -= delta * 3;
            if ((p.material as THREE.PointsMaterial).opacity <= 0) {
                this.scene.remove(p);
                p.geometry.dispose();
                (p.material as THREE.Material).dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    private createHitParticles(position: THREE.Vector2, color: THREE.Color): void {
        const particleCount = 15;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const dist = 0.1;
            positions[i * 3] = Math.cos(angle) * dist;
            positions[i * 3 + 1] = Math.sin(angle) * dist;
            positions[i * 3 + 2] = 0.5;

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
            opacity: 1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
        });

        const particles = new THREE.Points(geometry, material);
        particles.position.set(position.x, position.y, 0);
        this.scene.add(particles);
        this.particles.push(particles);
    }

    private onHit(result: HitResult, position: THREE.Vector2, color: THREE.Color): void {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.behaviorData.hits++;

        // Score based on timing
        let points = 0;
        switch (result.timing) {
            case 'perfect':
                points = 300;
                this.perfectHits++;
                break;
            case 'good':
                points = 100;
                this.goodHits++;
                break;
            case 'ok':
                points = 50;
                this.okHits++;
                break;
            case 'miss':
                points = 0;
                this.onMiss();
                return;
        }

        this.score += points * (1 + this.combo * 0.1);
        this.createHitParticles(position, color);
        this.updateUI();
    }

    private onMiss(): void {
        this.combo = 0;
        this.missCount++;
        this.behaviorData.misses++;
        this.updateUI();
    }

    protected onClick(x: number, y: number): void {
        // Convert screen coordinates to world coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndcX = ((x / rect.width) * 2 - 1) * this.aspect * this.viewSize;
        const ndcY = (-(y / rect.height) * 2 + 1) * this.viewSize;
        const clickPos = new THREE.Vector2(ndcX, ndcY);

        this.isHolding = true;

        // Find the hit object closest to its target time that can be hit
        let bestObject: HitObject | null = null;
        let bestResult: HitResult | null = null;

        for (const obj of this.hitObjects) {
            const result = obj.checkHit(clickPos, this.gameTime);
            if (result) {
                if (!bestObject || obj.getTargetTime() < bestObject.getTargetTime()) {
                    bestObject = obj;
                    bestResult = result;
                }
            }
        }

        if (bestObject && bestResult) {
            const color = this.COLORS[Math.floor(Math.random() * this.COLORS.length)];
            this.onHit(bestResult, bestObject.getPosition(), color);

            if (bestObject instanceof Slider) {
                this.currentSlider = bestObject;
            }
        }
    }

    protected onMouseMove(x: number, y: number): void {
        // Convert to world coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndcX = ((x / rect.width) * 2 - 1) * this.aspect * this.viewSize;
        const ndcY = (-(y / rect.height) * 2 + 1) * this.viewSize;
        this.mousePos.set(ndcX, ndcY);
    }

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

    private handleMouseUp = (): void => {
        this.isHolding = false;
        this.currentSlider = null;
    };

    protected onTouchStart(touch: Touch): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.isHolding = true;
        this.onClick(x, y);
    }

    protected onTouchMove(touch: Touch): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.onMouseMove(x, y);
    }

    protected onTouchEnd(): void {
        this.isHolding = false;
        this.currentSlider = null;
    }

    start(onComplete: (data: any) => void): void {
        // Spawn initial object
        this.spawnHitObject();
        
        super.start(onComplete);
    }

    protected endGame(): void {
        // Calculate final accuracy for behavior data
        const totalHits = this.perfectHits + this.goodHits + this.okHits;
        const total = totalHits + this.missCount;
        this.behaviorData.clickAccuracy = total > 0 ? totalHits / total : 0;

        super.endGame();
    }

    destroy(): void {
        const canvas = this.renderer.domElement;
        canvas.removeEventListener('mousedown', this.handleMouseDown);
        canvas.removeEventListener('mouseup', this.handleMouseUp);

        // Clean up UI
        if (this.comboDisplay && this.comboDisplay.parentNode) {
            this.comboDisplay.parentNode.removeChild(this.comboDisplay);
        }
        if (this.scoreDisplay && this.scoreDisplay.parentNode) {
            this.scoreDisplay.parentNode.removeChild(this.scoreDisplay);
        }

        // Clean up hit objects
        for (const obj of this.hitObjects) {
            obj.destroy();
        }
        this.hitObjects = [];

        // Clean up particles
        for (const p of this.particles) {
            this.scene.remove(p);
            p.geometry.dispose();
            (p.material as THREE.Material).dispose();
        }
        this.particles = [];

        super.destroy();
    }
}

export default OsuGame;
