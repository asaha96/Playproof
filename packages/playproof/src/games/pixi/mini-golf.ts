/**
 * Mini Golf Game
 * One-stroke putting game inspired by GamePigeon
 *
 * Controls: Click-drag on ball to aim, release to shoot
 * Win: Ball enters hole before timeout
 */

import { PixiGameBase } from './game-base';
import { PhysicsWorld, CircleBody, RectBody, Vec2, Collision } from './physics';
import { Graphics } from 'pixi.js';
import type { PlayproofConfig, SDKHooks, GameResult, MiniGolfLevelSpec, ShotData } from '../../types';
import type { GridLevel } from '@playproof/shared/gridlevel';
import { compileMiniGolfGridLevel, validateMiniGolfGridLevel, lintMiniGolfGridLevel } from '@playproof/shared/mini-golf-grid';
import { MINI_GOLF_LEVELS } from '@playproof/shared/mini-golf-levels';

// Debug logging (dev-only)
const DEBUG = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
    ?.process?.env?.NODE_ENV === 'development';
const log = (...args: unknown[]): void => {
    if (DEBUG) console.log('[MiniGolf]', ...args);
};

/**
 * Hardcoded level spec for v0
 */
const LEVEL_SPEC: MiniGolfLevelSpec = {
    version: 1,
    world: { width: 400, height: 280, friction: 0.985 },
    ball: { x: 80, y: 200, radius: 10 },
    hole: { x: 320, y: 80, radius: 18 },
    walls: [
        // Border walls
        { x: 0, y: 0, w: 400, h: 10 },      // top
        { x: 0, y: 270, w: 400, h: 10 },    // bottom
        { x: 0, y: 0, w: 10, h: 280 },      // left
        { x: 390, y: 0, w: 10, h: 280 },    // right
        // Obstacle
        { x: 180, y: 100, w: 20, h: 100 },
    ]
};

const DEFAULT_GRID_LEVEL: GridLevel = MINI_GOLF_LEVELS[0];

interface MiniGolfGraphics {
    ball: Graphics | null;
    hole: Graphics | null;
    aimLine: Graphics | null;
    walls: Graphics[];
}

export class MiniGolfGame extends PixiGameBase {
    private world: PhysicsWorld | null;
    private ball: CircleBody | null;
    private hasShot: boolean;
    private shotData: ShotData | null;
    private holeX: number;
    private holeY: number;
    private holeRadius: number;
    private scaleX: number;
    private scaleY: number;
    private gfx: MiniGolfGraphics;
    private _lastDebugTime: number;
    private maxPullDistance: number;
    private powerScale: number;
    private maxPower: number;
    private levelSpec: MiniGolfLevelSpec;
    private strokes: number;
    private lastSafeRest: { x: number; y: number } | null;
    private stoppedFrames: number;
    private lastPortalUse: Record<string, number>;

    constructor(gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks) {
        super(gameArea, config, hooks);

        this.gameName = 'mini-golf';
        this.instructions = {
            title: 'Mini Golf',
            description: 'Drag from the ball to aim, release to putt!'
        };

        this.world = null;
        this.ball = null;
        this.hasShot = false;
        this.shotData = null;
        this.holeX = 0;
        this.holeY = 0;
        this.holeRadius = 0;
        this.scaleX = 1;
        this.scaleY = 1;
        this._lastDebugTime = 0;
        this.maxPullDistance = 0;
        this.powerScale = 0;
        this.maxPower = 0;
        this.levelSpec = LEVEL_SPEC;
        this.strokes = 0;
        this.lastSafeRest = null;
        this.stoppedFrames = 0;
        this.lastPortalUse = {};

        this.gfx = {
            ball: null,
            hole: null,
            aimLine: null,
            walls: []
        };
    }

    async setup(): Promise<void> {
        const { width, height } = this.host!.getSize();

        const validated = validateMiniGolfGridLevel(DEFAULT_GRID_LEVEL);
        if (!validated.valid) {
            console.warn('[MiniGolf] Invalid grid level, falling back to legacy spec', validated.errors);
            this.levelSpec = LEVEL_SPEC;
        } else {
            this.levelSpec = compileMiniGolfGridLevel(DEFAULT_GRID_LEVEL);
            const lint = lintMiniGolfGridLevel(DEFAULT_GRID_LEVEL);
            if (lint.issues.length) {
                console.warn('[MiniGolf] Lint issues', lint.issues);
            }
        }

        const spec = this.levelSpec;
        this.telemetryContext = { levelId: 'gridlevel-default', seed: DEFAULT_GRID_LEVEL.seed };

        // Scale factor if canvas differs from spec
        this.scaleX = width / spec.world.width;
        this.scaleY = height / spec.world.height;

        // Create physics world
        this.world = new PhysicsWorld({
            gravity: { x: 0, y: 0 },
            onCollision: (event) => {
                if (!this.ball) return;
                if (event.circle !== this.ball) return;
                const collisionEvent = event.rect.kind === 'moving-block'
                    ? 'collision_moving_block'
                    : 'collision_wall';
                this.recordTelemetryEvent({
                    event: collisionEvent,
                    frame: this.input ? this.input.getFrameIndex() : 0,
                    t: performance.now(),
                    x: this.ball.position.x,
                    y: this.ball.position.y,
                    vx: this.ball.velocity.x,
                    vy: this.ball.velocity.y,
                    meta: {
                        normal: event.collision.normal,
                        penetration: event.collision.penetration,
                        wallId: event.rect.id,
                        wallKind: event.rect.kind
                    }
                });
            }
        });

        const minScale = Math.min(this.scaleX, this.scaleY);
        this.maxPullDistance = 160 * minScale;
        this.powerScale = 4.2 * minScale;
        this.maxPower = 420 * minScale;

        // Create ball
        this.ball = new CircleBody(
            spec.ball.x * this.scaleX,
            spec.ball.y * this.scaleY,
            spec.ball.radius * Math.min(this.scaleX, this.scaleY),
            { friction: spec.world.friction, restitution: 0.7 }
        );
        this.world.addCircle(this.ball);
        this.lastSafeRest = { ...this.ball.position };

        if (spec.portals && spec.portals.length > 0) {
            this.lastPortalUse = {};
        }

        // Store hole position
        this.holeX = spec.hole.x * this.scaleX;
        this.holeY = spec.hole.y * this.scaleY;
        this.holeRadius = spec.hole.radius * Math.min(this.scaleX, this.scaleY);

        // Create walls
        for (const w of spec.walls) {
            this.world.addRect(new RectBody(
                w.x * this.scaleX,
                w.y * this.scaleY,
                w.w * this.scaleX,
                w.h * this.scaleY,
                { restitution: 0.8, kind: 'wall' }
            ));
        }

        // Border walls
        const worldW = spec.world.width * this.scaleX;
        const worldH = spec.world.height * this.scaleY;
        this.world.addRect(new RectBody(0, 0, worldW, 8, { restitution: 0.8, kind: 'wall', id: 'border-top' }));
        this.world.addRect(new RectBody(0, worldH - 8, worldW, 8, { restitution: 0.8, kind: 'wall', id: 'border-bottom' }));
        this.world.addRect(new RectBody(0, 0, 8, worldH, { restitution: 0.8, kind: 'wall', id: 'border-left' }));
        this.world.addRect(new RectBody(worldW - 8, 0, 8, worldH, { restitution: 0.8, kind: 'wall', id: 'border-right' }));

        if (spec.movingBlocks) {
            for (const block of spec.movingBlocks) {
                this.world.addRect(new RectBody(
                    block.x,
                    block.y,
                    block.w,
                    block.h,
                    { restitution: 0.8, kind: 'moving-block', id: block.id }
                ));
            }
        }

        // Draw static elements
        this._drawCourse();
    }

    private _drawCourse(): void {
        const { width, height } = this.host!.getSize();

        // Draw grass background
        const bg = new Graphics();
        bg.rect(0, 0, width, height);
        bg.fill({ color: 0x2d5a27 });
        this.host!.layers.bg.addChild(bg);

        // Draw hole (dark circle with flag)
        const hole = new Graphics();
        hole.circle(this.holeX, this.holeY, this.holeRadius);
        hole.fill({ color: 0x1a1a1a });
        // Flag pole
        hole.moveTo(this.holeX, this.holeY);
        hole.lineTo(this.holeX, this.holeY - 35);
        hole.stroke({ color: 0xffffff, width: 2 });
        // Flag
        hole.moveTo(this.holeX, this.holeY - 35);
        hole.lineTo(this.holeX + 20, this.holeY - 28);
        hole.lineTo(this.holeX, this.holeY - 21);
        hole.fill({ color: 0xff4444 });
        this.gfx.hole = hole;
        this.host!.layers.world.addChild(hole);

        // Draw walls
        const wallColor = this.host!.hexToNumber(this.theme.border || '#5a3d2b');
        for (const rect of this.world!.rects) {
            if (rect.kind !== 'wall') continue;
            const wall = new Graphics();
            wall.rect(rect.x, rect.y, rect.width, rect.height);
            wall.fill({ color: wallColor });
            this.gfx.walls.push(wall);
            this.host!.layers.world.addChild(wall);
        }

        // Draw sand
        if (this.levelSpec.sand) {
            for (const rect of this.levelSpec.sand) {
                const sand = new Graphics();
                sand.rect(rect.x, rect.y, rect.w, rect.h);
                sand.fill({ color: 0xd2b48c });
                this.host!.layers.world.addChild(sand);
            }
        }

        if (this.levelSpec.movingBlocks) {
            for (const block of this.levelSpec.movingBlocks) {
                const moving = new Graphics();
                moving.rect(block.x, block.y, block.w, block.h);
                moving.fill({ color: 0x8b4513, alpha: 0.8 });
                this.host!.layers.world.addChild(moving);
            }
        }

        if (this.levelSpec.portals) {
            for (const portal of this.levelSpec.portals) {
                const entrance = new Graphics();
                entrance.circle(portal.entrance.x, portal.entrance.y, 8);
                entrance.fill({ color: 0x8f00ff, alpha: 0.7 });
                const exit = new Graphics();
                exit.circle(portal.exit.x, portal.exit.y, 8);
                exit.fill({ color: 0x00c2ff, alpha: 0.7 });
                this.host!.layers.world.addChild(entrance);
                this.host!.layers.world.addChild(exit);
            }
        }

        // Draw water
        if (this.levelSpec.water) {
            for (const rect of this.levelSpec.water) {
                const water = new Graphics();
                water.rect(rect.x, rect.y, rect.w, rect.h);
                water.fill({ color: 0x1e90ff, alpha: 0.6 });
                this.host!.layers.world.addChild(water);
            }
        }

        // Draw ball
        this.gfx.ball = new Graphics();
        this.host!.layers.world.addChild(this.gfx.ball);

        // Aim line (hidden initially)
        this.gfx.aimLine = new Graphics();
        this.host!.layers.ui.addChild(this.gfx.aimLine);
    }

    update(dt: number): void {
        // Log once per second for debugging
        if (DEBUG && (!this._lastDebugTime || performance.now() - this._lastDebugTime > 1000)) {
            log('update() running, hasShot:', this.hasShot, 'isCollecting:', this.input?.isCollecting, 'isDragging:', this.input?.isDragging);
            this._lastDebugTime = performance.now();
        }

        // Check for shot input
        if (this.ball && !this.ball.isStopped(1)) {
            this.hasShot = true;
        }

        const completedDrag = this.input!.consumeCompletedDrag();
        if (completedDrag && this.ball && this.ball.isStopped(1)) {
            log('Got completedDrag:', completedDrag);
            const ballPos = this.ball.position;
            log('Ball position:', ballPos);

            // Check if drag started near ball
            const distToBall = Vec2.distance(
                { x: completedDrag.startX, y: completedDrag.startY },
                ballPos
            );
            log('Distance to ball:', distToBall, 'threshold:', this.ball.radius * 3);

            if (distToBall < this.ball.radius * 3) {
                // Calculate impulse (opposite of drag direction)
                const dx = completedDrag.startX - completedDrag.endX;
                const dy = completedDrag.startY - completedDrag.endY;
                const pullLength = Vec2.length({ x: dx, y: dy });
                const clampedPull = Math.min(pullLength, this.maxPullDistance);
                const power = Math.min(clampedPull * this.powerScale, this.maxPower);
                log('Drag vector dx:', dx, 'dy:', dy, 'pull:', pullLength, 'power:', power);

                if (power > 8) {
                    const impulse = Vec2.scale(Vec2.normalize({ x: dx, y: dy }), power);
                    log('Applying impulse:', impulse);
                    this.ball.applyImpulse(impulse);

                    this.hasShot = true;
                    this.strokes += 1;
                    this.shotData = {
                        startX: completedDrag.startX,
                        startY: completedDrag.startY,
                        endX: completedDrag.endX,
                        endY: completedDrag.endY,
                        power,
                        timestamp: performance.now()
                    };

                    const angle = Math.atan2(impulse.y, impulse.x);
                    this.recordTelemetryEvent({
                        event: 'shot_committed',
                        frame: this.input ? this.input.getFrameIndex() : 0,
                        t: performance.now(),
                        x: ballPos.x,
                        y: ballPos.y,
                        vx: impulse.x,
                        vy: impulse.y,
                        meta: {
                            startX: completedDrag.startX,
                            startY: completedDrag.startY,
                            endX: completedDrag.endX,
                            endY: completedDrag.endY,
                            power,
                            angle,
                            impulseX: impulse.x,
                            impulseY: impulse.y,
                            strokeIndex: this.strokes
                        }
                    });

                    this.input!.recordHit(); // Shot taken
                    log('Shot taken! velocity:', { ...this.ball!.velocity });
                } else {
                    log('Power too low:', power);
                }
            } else {
                log('Drag not near ball');
            }
        }

        // Update physics
        this.world!.update(dt);

        this.updateMovingBlocks(dt);
        this.applyCurrents(dt);

        if (this.ball) {
            const frame = this.input ? this.input.getFrameIndex() : 0;
            const friction = this.levelSpec.world.friction;
            const inSand = this.levelSpec.sand?.some(rect =>
                Collision.pointInRect(this.ball!.position.x, this.ball!.position.y, rect.x, rect.y, rect.w, rect.h)
            );
            if (inSand) {
                this.ball.velocity = Vec2.scale(this.ball.velocity, Math.min(1, friction - 0.02));
            }

            this.recordTelemetryEvent({
                event: 'physics_tick',
                frame,
                t: performance.now(),
                dt,
                x: this.ball.position.x,
                y: this.ball.position.y,
                vx: this.ball.velocity.x,
                vy: this.ball.velocity.y,
                meta: {
                    speed: Vec2.length(this.ball.velocity),
                    holeDistance: Vec2.distance(this.ball.position, { x: this.holeX, y: this.holeY }),
                    inSand
                }
            });

            for (const rect of this.world?.rects || []) {
                if (rect.kind === 'moving-block') {
                    this.recordTelemetryEvent({
                        event: 'moving_block_tick',
                        frame,
                        t: performance.now(),
                        x: rect.x,
                        y: rect.y,
                        meta: {
                            id: rect.id,
                            w: rect.width,
                            h: rect.height
                        }
                    });
                }
            }

            if (this.ball.isStopped(0.6)) {
                this.stoppedFrames += 1;
            } else {
                this.stoppedFrames = 0;
            }

            if (this.stoppedFrames > 12) {
                this.hasShot = false;
                this.stoppedFrames = 0;
                this.lastSafeRest = { ...this.ball.position };
                this.recordTelemetryEvent({
                    event: 'ball_stopped',
                    frame,
                    t: performance.now(),
                    x: this.ball.position.x,
                    y: this.ball.position.y,
                    meta: {
                        lastSafeRest: this.lastSafeRest,
                        strokeIndex: this.strokes
                    }
                });
            }

        if (this.levelSpec.water && this.levelSpec.water.length > 0) {
            const inWater = this.levelSpec.water.some(rect =>
                Collision.pointInRect(
                    this.ball!.position.x,
                    this.ball!.position.y,
                    rect.x,
                    rect.y,
                    rect.w,
                    rect.h
                )
            );

            if (inWater && this.lastSafeRest) {
                const from = { ...this.ball.position };
                this.recordTelemetryEvent({
                    event: 'hazard_enter_water',
                    frame,
                    t: performance.now(),
                    x: from.x,
                    y: from.y
                });
                const safe = this.findSafeRest();
                this.ball.position = { ...safe };
                this.ball.velocity = { x: 0, y: 0 };
                this.recordTelemetryEvent({
                    event: 'respawn',
                    frame,
                    t: performance.now(),
                    x: safe.x,
                    y: safe.y,
                    meta: {
                        fromX: from.x,
                        fromY: from.y,
                        toX: safe.x,
                        toY: safe.y
                    }
                });
            }
        }

        if (this.levelSpec.portals && this.levelSpec.portals.length > 0) {
            for (const portal of this.levelSpec.portals) {
                const dist = Vec2.distance(this.ball.position, portal.entrance);
                if (dist <= this.ball.radius * 1.2) {
                    const lastUsed = this.lastPortalUse[portal.id] || 0;
                    if (performance.now() - lastUsed < (portal.cooldownMs ?? 300)) {
                        continue;
                    }
                    this.lastPortalUse[portal.id] = performance.now();
                    const from = { ...this.ball.position };
                    this.recordTelemetryEvent({
                        event: 'portal_enter',
                        frame,
                        t: performance.now(),
                        x: from.x,
                        y: from.y,
                        meta: { id: portal.id }
                    });
                    this.ball.position = { ...portal.exit };
                    if (portal.exitVelocityMultiplier !== undefined) {
                        this.ball.velocity = Vec2.scale(this.ball.velocity, portal.exitVelocityMultiplier);
                    }
                    this.recordTelemetryEvent({
                        event: 'portal_exit',
                        frame,
                        t: performance.now(),
                        x: this.ball.position.x,
                        y: this.ball.position.y,
                        meta: { id: portal.id }
                    });
                }
            }
        }

        }
    }

    render(alpha: number): void {
        // Draw ball at interpolated position
        const pos = this.ball!.getInterpolatedPosition(alpha);

        this.gfx.ball!.clear();
        this.gfx.ball!.circle(pos.x, pos.y, this.ball!.radius);
        this.gfx.ball!.fill({ color: 0xffffff });

        // Draw aim line while dragging
        this.gfx.aimLine!.clear();

        if (!this.hasShot && this.input!.isDragging) {
            const drag = this.input!.getDragInfo();
            if (drag) {
                const ballPos = this.ball!.position;

                // Check if dragging from near ball
                const distToBall = Vec2.distance(
                    { x: drag.startX, y: drag.startY },
                    ballPos
                );

                if (distToBall < this.ball!.radius * 3) {
                    // Draw aim line (opposite direction)
                    const dx = drag.startX - drag.currentX;
                    const dy = drag.startY - drag.currentY;
                    const pullLength = Vec2.length({ x: dx, y: dy });
                    const clampedPull = Math.min(pullLength, this.maxPullDistance);
                    const power = Math.min(clampedPull * this.powerScale, this.maxPower);
                    const dir = Vec2.normalize({ x: dx, y: dy });

                    // Line from ball in shot direction
                    const endX = ballPos.x + dir.x * power * 0.6;
                    const endY = ballPos.y + dir.y * power * 0.6;

                    this.gfx.aimLine!.moveTo(ballPos.x, ballPos.y);
                    this.gfx.aimLine!.lineTo(endX, endY);
                    this.gfx.aimLine!.stroke({
                        color: 0xffffff,
                        width: 2,
                        alpha: 0.7
                    });

                    // Power indicator dots
                    const numDots = Math.max(3, Math.floor(power / 40));
                    for (let i = 1; i <= numDots; i++) {
                        const t = i / numDots;
                        const dotX = ballPos.x + dir.x * power * 0.6 * t;
                        const dotY = ballPos.y + dir.y * power * 0.6 * t;
                        this.gfx.aimLine!.circle(dotX, dotY, 3);
                        this.gfx.aimLine!.fill({ color: 0xffffff, alpha: 0.5 });
                    }
                }
            }
        }
    }

    private applyCurrents(dt: number): void {
        if (!this.ball || !this.levelSpec.currents) return;
        for (const current of this.levelSpec.currents) {
            const rectX = current.x;
            const rectY = current.y;
            const rectW = current.w;
            const rectH = current.h;
            if (Collision.pointInRect(this.ball.position.x, this.ball.position.y, rectX, rectY, rectW, rectH)) {
                const force = 60 * dt;
                if (current.direction === 'up') this.ball.velocity.y -= force;
                if (current.direction === 'down') this.ball.velocity.y += force;
                if (current.direction === 'left') this.ball.velocity.x -= force;
                if (current.direction === 'right') this.ball.velocity.x += force;
            }
        }
    }

    private updateMovingBlocks(dt: number): void {
        if (!this.levelSpec.movingBlocks || !this.world) return;
        for (const block of this.levelSpec.movingBlocks) {
            const rect = this.world.rects.find(item => item.kind === 'moving-block' && item.id === block.id);
            if (!rect) continue;
            const range = block.motion.range;
            const phase = (block.motion.phase ?? 0) + performance.now() / 1000;
            let offset = 0;

            if (block.motion.mode === 'pingpong') {
                const cycle = (Math.sin(phase * Math.PI * 2) + 1) / 2;
                offset = (cycle * 2 - 1) * range;
            } else {
                const cycle = (phase % 1) * 2 - 1;
                offset = cycle * range;
            }

            if (block.motion.axis === 'x') {
                rect.x = block.x + offset;
            } else {
                rect.y = block.y + offset;
            }
        }
    }

    private findSafeRest(): { x: number; y: number } {
        if (!this.ball) {
            return { x: 0, y: 0 };
        }
        if (!this.lastSafeRest) {
            return { ...this.ball.position };
        }

        const offsets = [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
            { x: -10, y: 0 },
            { x: 0, y: 10 },
            { x: 0, y: -10 },
            { x: 10, y: 10 },
            { x: -10, y: -10 }
        ];

        for (const offset of offsets) {
            const candidate = { x: this.lastSafeRest.x + offset.x, y: this.lastSafeRest.y + offset.y };
            const collides = this.world?.rects.some(rect =>
                Collision.pointInRect(candidate.x, candidate.y, rect.x, rect.y, rect.width, rect.height)
            );
            if (!collides) return candidate;
        }

        return { ...this.ball.position };
    }

    protected showResult(success: boolean, callback: () => void): void {
        if (!success) {
            callback();
            return;
        }
        super.showResult(success, callback);
    }

    checkWinCondition(): GameResult | null {
        if (!this.ball) return null;

        // Check if ball is in hole
        if (Collision.circleInsideCircle(this.ball, this.holeX, this.holeY, this.holeRadius)) {
            return { success: true, reason: 'holed' };
        }

        return null;
    }

    protected calculateAccuracy(success: boolean, _reason: string): number {
        if (success) {
            return 0.88 + Math.random() * 0.04; // 0.88-0.92 for hole
        }

        // Calculate based on distance to hole
        const dist = Vec2.distance(this.ball!.position, { x: this.holeX, y: this.holeY });
        const { width, height } = this.host!.getSize();
        const maxDist = Math.sqrt(width * width + height * height);
        const closeness = 1 - (dist / maxDist);

        // Map to 0.5-0.85 range
        return 0.5 + closeness * 0.35;
    }

    protected getAttemptDetails(): Record<string, unknown> {
        return {
            levelSpec: this.levelSpec,
            shot: this.shotData,
            strokes: this.strokes,
            finalBallPosition: this.ball ? { ...this.ball.position } : null
        };
    }
}

export default MiniGolfGame;
