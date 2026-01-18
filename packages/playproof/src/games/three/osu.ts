/**
 * Osu! Rhythm Game (Revamped)
 * Beautiful, smooth hit circles and sliders running at 60fps
 * Features: Scale-based animations, pooled particles, enhanced feedback
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
// Pre-cached Geometries and Materials
// ============================================================================

const circleGeometryCache: Map<string, InstanceType<typeof THREE.CircleGeometry>> = new Map();
const ringGeometryCache: Map<string, InstanceType<typeof THREE.RingGeometry>> = new Map();

function getCachedCircleGeometry(radius: number, segments: number = 32): InstanceType<typeof THREE.CircleGeometry> {
    const key = `${radius.toFixed(3)}_${segments}`;
    if (!circleGeometryCache.has(key)) {
        circleGeometryCache.set(key, new THREE.CircleGeometry(radius, segments));
    }
    return circleGeometryCache.get(key)!;
}

function getCachedRingGeometry(inner: number, outer: number, segments: number = 48): InstanceType<typeof THREE.RingGeometry> {
    const key = `${inner.toFixed(3)}_${outer.toFixed(3)}_${segments}`;
    if (!ringGeometryCache.has(key)) {
        ringGeometryCache.set(key, new THREE.RingGeometry(inner, outer, segments));
    }
    return ringGeometryCache.get(key)!;
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
    protected hitScale: number = 1;
    protected hitAnimating: boolean = false;

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

    getColor(): THREE.Color {
        return new THREE.Color(0x6366f1);
    }

    destroy(): void {
        this.scene.remove(this.group);
        this.group.traverse((obj: THREE.Object3D) => {
            if (obj instanceof THREE.Mesh) {
                // Don't dispose cached geometries
                if (Array.isArray(obj.material)) {
                    obj.material.forEach((m: THREE.Material) => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
            if (obj instanceof THREE.Line) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach((m: THREE.Material) => m.dispose());
                } else {
                    (obj.material as THREE.Material).dispose();
                }
            }
        });
    }
}

// ============================================================================
// Hit Circle - Optimized with scale-based approach animation
// ============================================================================

class HitCircle extends HitObject {
    private circleMesh: THREE.Mesh;
    private approachCircle: THREE.Mesh;
    private innerGlow: THREE.Mesh;
    private outerGlow: THREE.Mesh;
    private timingWindows: TimingWindow;
    private color: THREE.Color;
    private baseApproachScale: number = 2.5;
    private hitPopScale: number = 1;
    private opacity: number = 0;

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

        // Outer glow
        const outerGlowGeometry = new THREE.CircleGeometry(size * 1.8, 32);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
        });
        this.outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
        this.outerGlow.position.z = 0.02;
        this.group.add(this.outerGlow);

        // Main circle
        const circleGeometry = new THREE.CircleGeometry(size, 32);
        const circleMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
        });
        this.circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);
        this.circleMesh.position.z = 0.1;
        this.group.add(this.circleMesh);

        // Inner glow/highlight
        const innerGlowGeometry = new THREE.CircleGeometry(size * 0.5, 32);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
        });
        this.innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        this.innerGlow.position.z = 0.2;
        this.group.add(this.innerGlow);

        // White border ring using a single ring geometry
        const borderGeometry = getCachedRingGeometry(size - 0.04, size, 48);
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.z = 0.15;
        this.group.add(border);

        // Approach circle - use scale-based animation instead of recreating geometry
        const approachGeometry = getCachedRingGeometry(size - 0.04, size, 48);
        const approachMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        });
        this.approachCircle = new THREE.Mesh(approachGeometry, approachMaterial);
        this.approachCircle.position.z = 0.05;
        this.approachCircle.scale.setScalar(this.baseApproachScale);
        this.group.add(this.approachCircle);
    }

    override getColor(): THREE.Color {
        return this.color;
    }

    update(currentTime: number, _delta: number): void {
        if (!this.isActive) return;

        const elapsed = currentTime - this.spawnTime;
        const progress = Math.min(elapsed / this.approachDuration, 1);

        // Smooth eased fade in
        const fadeProgress = Math.min(elapsed / 150, 1);
        const easedFade = this.easeOutQuad(fadeProgress);
        this.opacity = 0.95 * easedFade;

        // Update all material opacities
        (this.circleMesh.material as THREE.MeshBasicMaterial).opacity = this.opacity;
        (this.outerGlow.material as THREE.MeshBasicMaterial).opacity = this.opacity * 0.2;
        (this.innerGlow.material as THREE.MeshBasicMaterial).opacity = this.opacity * 0.35;
        (this.group.children[3].material as THREE.MeshBasicMaterial).opacity = this.opacity;
        (this.approachCircle.material as THREE.MeshBasicMaterial).opacity = this.opacity * 0.85;

        // Scale-based approach circle animation (no geometry recreation!)
        const approachScale = this.baseApproachScale - (this.baseApproachScale - 1) * this.easeOutQuad(progress);
        this.approachCircle.scale.setScalar(approachScale);

        // Hit pop animation
        if (this.hitAnimating) {
            this.hitPopScale += (1.4 - this.hitPopScale) * 0.3;
            this.opacity *= 0.85;
            this.group.scale.setScalar(this.hitPopScale);

            if (this.opacity < 0.1) {
                this.isActive = false;
            }
        }

        // Check if missed (beyond timing window)
        const targetTime = this.getTargetTime();
        if (currentTime > targetTime + this.timingWindows.miss) {
            this.isActive = false;
        }
    }

    private easeOutQuad(t: number): number {
        return 1 - (1 - t) * (1 - t);
    }

    checkHit(clickPos: THREE.Vector2, currentTime: number): HitResult | null {
        if (!this.isActive || this.isHit) return null;

        const distance = clickPos.distanceTo(this.position);
        if (distance > this.size * 1.3) return null;

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

        this.isHit = true;
        this.hitAnimating = true;
        return { timing, timeDelta };
    }
}

// ============================================================================
// Slider - Optimized
// ============================================================================

class Slider extends HitObject {
    private path: any;
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
    private baseApproachScale: number = 2.5;
    private opacity: number = 0;

    constructor(
        scene: THREE.Scene,
        position: THREE.Vector2,
        size: number,
        spawnTime: number,
        approachDuration: number,
        color: THREE.Color,
        timingWindows: TimingWindow,
        path: any,
        duration: number,
        curveType: CurveType
    ) {
        super(scene, position, size, spawnTime, approachDuration);
        this.path = path;
        this.duration = duration;
        this.curveType = curveType;
        this.color = color;
        this.timingWindows = timingWindows;

        const points2D = path.getPoints(50);
        this.pathPoints3D = points2D.map((p: THREE.Vector2) => new THREE.Vector3(p.x, p.y, 0));

        // Create slider body
        this.sliderBody = this.createSliderBody();
        this.group.add(this.sliderBody);

        // Start circle with glow
        const startGlowGeometry = new THREE.CircleGeometry(size * 1.5, 32);
        const startGlowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
        });
        const startGlow = new THREE.Mesh(startGlowGeometry, startGlowMaterial);
        startGlow.position.z = 0.05;
        this.group.add(startGlow);

        const startGeometry = new THREE.CircleGeometry(size, 32);
        const startMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
        });
        this.startCircle = new THREE.Mesh(startGeometry, startMaterial);
        this.startCircle.position.z = 0.1;
        this.group.add(this.startCircle);

        // End circle
        const endPoint = points2D[points2D.length - 1];
        const endGeometry = new THREE.CircleGeometry(size * 0.75, 32);
        const endMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
        });
        this.endCircle = new THREE.Mesh(endGeometry, endMaterial);
        this.endCircle.position.set(endPoint.x - position.x, endPoint.y - position.y, 0.1);
        this.group.add(this.endCircle);

        // Slider ball
        const ballGeometry = new THREE.CircleGeometry(size * 0.45, 32);
        const ballMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
        });
        this.sliderBall = new THREE.Mesh(ballGeometry, ballMaterial);
        this.sliderBall.position.z = 0.3;
        this.group.add(this.sliderBall);

        // Approach circle - scale-based
        const approachGeometry = getCachedRingGeometry(size - 0.04, size, 48);
        const approachMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        });
        this.approachCircle = new THREE.Mesh(approachGeometry, approachMaterial);
        this.approachCircle.position.z = 0.05;
        this.approachCircle.scale.setScalar(this.baseApproachScale);
        this.group.add(this.approachCircle);

        // White border on start circle
        const borderGeometry = getCachedRingGeometry(size - 0.04, size, 48);
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.z = 0.15;
        this.group.add(border);
    }

    override getColor(): THREE.Color {
        return this.color;
    }

    private createSliderBody(): THREE.Mesh {
        const shape = new THREE.Shape();
        const radius = this.size * 0.75;

        const points = this.path.getPoints(50);
        const relativePoints = points.map((p: THREE.Vector2) =>
            new THREE.Vector2(p.x - this.position.x, p.y - this.position.y)
        );

        if (relativePoints.length < 2) {
            shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
            const geometry = new THREE.ShapeGeometry(shape);
            return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
                color: this.color,
                transparent: true,
                opacity: 0,
            }));
        }

        const geometry = this.buildSliderGeometry(relativePoints, radius);
        const material = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0,
        });

        return new THREE.Mesh(geometry, material);
    }

    private buildSliderGeometry(points: THREE.Vector2[], radius: number): THREE.BufferGeometry {
        const vertices: number[] = [];
        const indices: number[] = [];

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            const dir = new THREE.Vector2().subVectors(p2, p1).normalize();
            const perp = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(radius);

            const baseIndex = vertices.length / 3;

            vertices.push(p1.x + perp.x, p1.y + perp.y, 0);
            vertices.push(p1.x - perp.x, p1.y - perp.y, 0);
            vertices.push(p2.x + perp.x, p2.y + perp.y, 0);
            vertices.push(p2.x - perp.x, p2.y - perp.y, 0);

            indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
            indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2);
        }

        // End caps
        const segments = 16;
        const firstPoint = points[0];
        const lastPoint = points[points.length - 1];

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

    private easeOutQuad(t: number): number {
        return 1 - (1 - t) * (1 - t);
    }

    update(currentTime: number, _delta: number): void {
        if (!this.isActive) return;

        const elapsed = currentTime - this.spawnTime;
        const approachProgress = Math.min(elapsed / this.approachDuration, 1);

        // Smooth fade in
        const fadeProgress = Math.min(elapsed / 150, 1);
        this.opacity = 0.95 * this.easeOutQuad(fadeProgress);

        // Update opacities
        (this.sliderBody.material as THREE.MeshBasicMaterial).opacity = this.opacity * 0.5;
        (this.startCircle.material as THREE.MeshBasicMaterial).opacity = this.opacity;
        (this.endCircle.material as THREE.MeshBasicMaterial).opacity = this.opacity * 0.7;
        (this.approachCircle.material as THREE.MeshBasicMaterial).opacity = this.opacity * 0.85;

        // Start glow
        if (this.group.children[1]) {
            (this.group.children[1].material as THREE.MeshBasicMaterial).opacity = this.opacity * 0.2;
        }
        // Border
        if (this.group.children[7]) {
            (this.group.children[7].material as THREE.MeshBasicMaterial).opacity = this.opacity;
        }

        // Scale-based approach circle animation
        const approachScale = this.baseApproachScale - (this.baseApproachScale - 1) * this.easeOutQuad(approachProgress);
        this.approachCircle.scale.setScalar(approachScale);

        // Handle slider ball movement after approach
        const targetTime = this.getTargetTime();
        if (currentTime >= targetTime && this.sliderStarted) {
            const sliderElapsed = currentTime - targetTime;
            this.followProgress = Math.min(sliderElapsed / this.duration, 1);

            const pathPoint = this.path.getPoint(this.followProgress);
            this.sliderBall.position.set(
                pathPoint.x - this.position.x,
                pathPoint.y - this.position.y,
                0.3
            );
            (this.sliderBall.material as THREE.MeshBasicMaterial).opacity = 0.95;

            // Pulsing ball
            const pulse = Math.sin(currentTime * 0.01) * 0.1 + 1;
            this.sliderBall.scale.setScalar(pulse);

            if (this.followProgress >= 1) {
                this.isActive = false;
                this.isHit = true;
            }
        }

        if (!this.sliderStarted && currentTime > targetTime + this.timingWindows.miss) {
            this.isActive = false;
        }
    }

    checkHit(clickPos: THREE.Vector2, currentTime: number): HitResult | null {
        if (!this.isActive || this.sliderStarted) return null;

        const distance = clickPos.distanceTo(this.position);
        if (distance > this.size * 1.3) return null;

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
            this.followAccuracy *= 0.8;
            return;
        }

        const ballWorldPos = new THREE.Vector2(
            this.sliderBall.position.x + this.position.x,
            this.sliderBall.position.y + this.position.y
        );
        const distance = mousePos.distanceTo(ballWorldPos);

        if (distance > this.size * 2.5) {
            this.followAccuracy *= 0.95;
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
        const sin = Math.sin(x * 12.9898 + this.noiseOffset) * 43758.5453;
        return sin - Math.floor(sin);
    }

    generateNextPosition(minDist: number, maxDist: number): THREE.Vector2 {
        this.noiseOffset += 0.1;

        const distance = minDist + this.simpleNoise(this.noiseOffset) * (maxDist - minDist);
        const angleNoise = (this.simpleNoise(this.noiseOffset + 100) - 0.5) * Math.PI * 1.2;
        const currentAngle = Math.atan2(this.momentum.y, this.momentum.x);
        const newAngle = currentAngle + angleNoise;

        const offset = new THREE.Vector2(
            Math.cos(newAngle) * distance,
            Math.sin(newAngle) * distance
        );

        let newPos = this.lastPosition.clone().add(offset);

        const padding = 0.6;
        newPos.x = Math.max(this.bounds.minX + padding, Math.min(this.bounds.maxX - padding, newPos.x));
        newPos.y = Math.max(this.bounds.minY + padding, Math.min(this.bounds.maxY - padding, newPos.y));

        if (newPos.x <= this.bounds.minX + padding || newPos.x >= this.bounds.maxX - padding) {
            this.momentum.x *= -1;
        }
        if (newPos.y <= this.bounds.minY + padding || newPos.y >= this.bounds.maxY - padding) {
            this.momentum.y *= -1;
        }

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

        const baseAngle = Math.atan2(this.momentum.y, this.momentum.x);
        const angleOffset = (this.simpleNoise(this.noiseOffset + 200) - 0.5) * Math.PI * 0.5;
        const direction = baseAngle + angleOffset;

        const endPos = new THREE.Vector2(
            startPos.x + Math.cos(direction) * length,
            startPos.y + Math.sin(direction) * length
        );

        const padding = 0.6;
        endPos.x = Math.max(this.bounds.minX + padding, Math.min(this.bounds.maxX - padding, endPos.x));
        endPos.y = Math.max(this.bounds.minY + padding, Math.min(this.bounds.maxY - padding, endPos.y));

        if (curveType === 'linear') {
            path.add(new THREE.LineCurve(startPos, endPos));
        } else if (curveType === 'bezier') {
            const midPoint = new THREE.Vector2().addVectors(startPos, endPos).multiplyScalar(0.5);
            const perpendicular = new THREE.Vector2(
                -(endPos.y - startPos.y),
                endPos.x - startPos.x
            ).normalize();

            const controlOffset = (this.simpleNoise(this.noiseOffset + 300) - 0.5) * 2 * curveIntensity * length;
            const controlPoint = midPoint.clone().add(perpendicular.multiplyScalar(controlOffset));

            path.add(new THREE.QuadraticBezierCurve(startPos, controlPoint, endPos));
        } else if (curveType === 'catmull') {
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

        this.lastPosition = endPos;

        return path;
    }

    setPosition(pos: THREE.Vector2): void {
        this.lastPosition = pos.clone();
    }
}

// ============================================================================
// Pooled Particle System
// ============================================================================

interface OsuParticle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    life: number;
    color: THREE.Color;
}

class ParticlePool {
    private pool: OsuParticle[] = [];
    private active: OsuParticle[] = [];
    private mesh: THREE.Points;
    private maxParticles: number;
    private positions: Float32Array;
    private colors: Float32Array;

    constructor(scene: THREE.Scene, maxParticles: number = 300) {
        this.maxParticles = maxParticles;
        this.positions = new Float32Array(maxParticles * 3);
        this.colors = new Float32Array(maxParticles * 3);

        for (let i = 0; i < maxParticles; i++) {
            this.pool.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                life: 0,
                color: new THREE.Color(),
            });
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.14,
            transparent: true,
            opacity: 1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
        });

        this.mesh = new THREE.Points(geometry, material);
        this.mesh.frustumCulled = false;
        scene.add(this.mesh);
    }

    emit(position: THREE.Vector2, color: THREE.Color, count: number = 20): void {
        for (let i = 0; i < count; i++) {
            const particle = this.pool.find(p => p.life <= 0);
            if (!particle) continue;

            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            const speed = 3 + Math.random() * 4;

            particle.position.set(position.x, position.y, 0.6);
            particle.velocity.set(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Math.random() * 2
            );
            particle.life = 1;
            particle.color.copy(color);

            this.active.push(particle);
        }
    }

    update(delta: number): void {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const p = this.active[i];

            p.life -= delta * 2.8;
            if (p.life <= 0) {
                this.active.splice(i, 1);
                continue;
            }

            p.position.add(p.velocity.clone().multiplyScalar(delta));
            p.velocity.multiplyScalar(0.94);
        }

        // Update buffers
        for (let i = 0; i < this.maxParticles; i++) {
            if (i < this.active.length) {
                const p = this.active[i];
                this.positions[i * 3] = p.position.x;
                this.positions[i * 3 + 1] = p.position.y;
                this.positions[i * 3 + 2] = p.position.z;

                this.colors[i * 3] = p.color.r * p.life;
                this.colors[i * 3 + 1] = p.color.g * p.life;
                this.colors[i * 3 + 2] = p.color.b * p.life;
            } else {
                this.positions[i * 3 + 2] = -100; // Hide unused particles
            }
        }

        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.geometry.attributes.color.needsUpdate = true;
    }

    destroy(): void {
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
    }
}

// ============================================================================
// Main Osu Game Class
// ============================================================================

export class OsuGame extends ThreeBaseGame {
    private hitObjects: HitObject[] = [];
    private pathGenerator!: PathGenerator;
    private particlePool!: ParticlePool;
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
    private feedbackDisplay: HTMLDivElement | null = null;

    // Modern vibrant colors
    private readonly COLORS = [
        new THREE.Color(0x00f5d4), // Cyan
        new THREE.Color(0x9b5de5), // Purple
        new THREE.Color(0xf15bb5), // Pink
        new THREE.Color(0xfee440), // Yellow
        new THREE.Color(0x00bbf9), // Blue
    ];

    private readonly TIMING_WINDOWS: TimingWindow = {
        perfect: 50,
        good: 100,
        ok: 150,
        miss: 200,
    };

    private readonly DIFFICULTY: DifficultySettings = {
        approachRate: { min: 900, max: 1400 },
        circleSize: { min: 0.45, max: 0.75 },
        sliderSpeed: { min: 0.9, max: 1.4 },
        objectDensity: { min: 1400, max: 2200 },
        sliderChance: 0.3,
        curvedSliderChance: 0.65,
    };

    private viewSize: number = 5;
    private aspect: number = 1;

    constructor(gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks = {} as SDKHooks) {
        super(gameArea, config, hooks);
    }

    protected async setupGame(): Promise<void> {
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

        const bounds = {
            minX: -this.aspect * this.viewSize + 1,
            maxX: this.aspect * this.viewSize - 1,
            minY: -this.viewSize + 1,
            maxY: this.viewSize - 1,
        };
        this.pathGenerator = new PathGenerator(bounds);

        this.pathGenerator.setPosition(new THREE.Vector2(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ));

        // Initialize particle pool
        this.particlePool = new ParticlePool(this.scene, 300);

        this.createBackground();
        this.createUI();
    }

    private createBackground(): void {
        const bgGeometry = new THREE.PlaneGeometry(
            this.aspect * this.viewSize * 3,
            this.viewSize * 3
        );

        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#0d0221');
        gradient.addColorStop(0.3, '#150a2e');
        gradient.addColorStop(0.6, '#1a0a3a');
        gradient.addColorStop(1, '#0d0221');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2, 512);

        const texture = new THREE.CanvasTexture(canvas);
        const bgMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: false,
        });

        const background = new THREE.Mesh(bgGeometry, bgMaterial);
        background.position.z = -5;
        this.scene.add(background);

        // Subtle grid
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0x3a1a5a,
            transparent: true,
            opacity: 0.15,
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
            font-size: 32px;
            font-weight: 800;
            font-family: 'Inter', -apple-system, sans-serif;
            text-shadow: 0 4px 20px rgba(155, 93, 229, 0.6);
            opacity: 0;
            transition: all 0.15s ease-out;
            transform: scale(1);
        `;
        this.container.appendChild(this.comboDisplay);

        // Score display
        this.scoreDisplay = document.createElement('div');
        this.scoreDisplay.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            color: white;
            font-size: 16px;
            font-weight: 700;
            background: linear-gradient(135deg, rgba(155, 93, 229, 0.4), rgba(241, 91, 181, 0.4));
            padding: 10px 16px;
            border-radius: 12px;
            font-family: 'Inter', -apple-system, sans-serif;
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        this.container.appendChild(this.scoreDisplay);

        // Hit feedback display
        this.feedbackDisplay = document.createElement('div');
        this.feedbackDisplay.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            color: white;
            font-size: 28px;
            font-weight: 800;
            font-family: 'Inter', -apple-system, sans-serif;
            text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            pointer-events: none;
            transition: all 0.2s ease-out;
            opacity: 0;
        `;
        this.container.appendChild(this.feedbackDisplay);

        this.updateUI();
    }

    private updateUI(): void {
        if (this.comboDisplay) {
            if (this.combo > 1) {
                this.comboDisplay.textContent = `${this.combo}x`;
                this.comboDisplay.style.opacity = '1';
                this.comboDisplay.style.transform = 'scale(1.15)';
                setTimeout(() => {
                    if (this.comboDisplay) {
                        this.comboDisplay.style.transform = 'scale(1)';
                    }
                }, 100);
            } else {
                this.comboDisplay.style.opacity = '0';
            }
        }

        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = `Score: ${Math.floor(this.score)}`;
        }
    }

    private showFeedback(timing: string, color: string): void {
        if (!this.feedbackDisplay) return;

        const labels: Record<string, string> = {
            perfect: '★ PERFECT',
            good: 'GOOD',
            ok: 'OK',
            miss: 'MISS',
        };

        this.feedbackDisplay.textContent = labels[timing] || timing;
        this.feedbackDisplay.style.color = color;
        this.feedbackDisplay.style.opacity = '1';
        this.feedbackDisplay.style.transform = 'translate(-50%, -50%) scale(1.2)';

        setTimeout(() => {
            if (this.feedbackDisplay) {
                this.feedbackDisplay.style.opacity = '0';
                this.feedbackDisplay.style.transform = 'translate(-50%, -50%) scale(0.8)';
            }
        }, 300);
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
        const position = this.pathGenerator.generateNextPosition(0.6, 3.5);

        if (isSlider) {
            let curveType: CurveType = 'linear';
            if (Math.random() < this.DIFFICULTY.curvedSliderChance) {
                curveType = Math.random() < 0.5 ? 'bezier' : 'catmull';
            }

            const sliderLength = this.random(1.5, 3.5);
            const curveIntensity = this.random(0.2, 0.7);
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

            if (obj instanceof Slider && obj.isSliderActive()) {
                obj.updateFollow(this.mousePos, this.isHolding);
            }

            if (!obj.isStillActive()) {
                if (!obj.wasHit()) {
                    this.onMiss();
                }
                obj.destroy();
                this.hitObjects.splice(i, 1);
            }
        }

        // Update particles
        this.particlePool.update(delta);

        this.renderer.render(this.scene, this.orthoCamera);
    }

    private onHit(result: HitResult, position: THREE.Vector2, color: THREE.Color): void {
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.behaviorData.hits++;

        let points = 0;
        let feedbackColor = '#ffffff';

        switch (result.timing) {
            case 'perfect':
                points = 300;
                this.perfectHits++;
                feedbackColor = '#00f5d4';
                break;
            case 'good':
                points = 100;
                this.goodHits++;
                feedbackColor = '#fee440';
                break;
            case 'ok':
                points = 50;
                this.okHits++;
                feedbackColor = '#ff9f1c';
                break;
            case 'miss':
                points = 0;
                this.onMiss();
                return;
        }

        this.score += points * (1 + this.combo * 0.08);
        this.particlePool.emit(position, color, 25);
        this.showFeedback(result.timing, feedbackColor);
        this.updateUI();
    }

    private onMiss(): void {
        this.combo = 0;
        this.missCount++;
        this.behaviorData.misses++;
        this.showFeedback('miss', '#ff6b6b');
        this.updateUI();
    }

    protected onClick(x: number, y: number): void {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndcX = ((x / rect.width) * 2 - 1) * this.aspect * this.viewSize;
        const ndcY = (-(y / rect.height) * 2 + 1) * this.viewSize;
        const clickPos = new THREE.Vector2(ndcX, ndcY);

        this.isHolding = true;

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
            const color = bestObject.getColor();
            this.onHit(bestResult, bestObject.getPosition(), color);

            if (bestObject instanceof Slider) {
                this.currentSlider = bestObject;
            }
        }
    }

    protected onMouseMove(x: number, y: number): void {
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
        this.spawnHitObject();
        super.start(onComplete);
    }

    protected endGame(): void {
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
        if (this.comboDisplay?.parentNode) {
            this.comboDisplay.parentNode.removeChild(this.comboDisplay);
        }
        if (this.scoreDisplay?.parentNode) {
            this.scoreDisplay.parentNode.removeChild(this.scoreDisplay);
        }
        if (this.feedbackDisplay?.parentNode) {
            this.feedbackDisplay.parentNode.removeChild(this.feedbackDisplay);
        }

        // Clean up hit objects
        for (const obj of this.hitObjects) {
            obj.destroy();
        }
        this.hitObjects = [];

        // Clean up particles
        this.particlePool.destroy();

        super.destroy();
    }
}

export default OsuGame;
