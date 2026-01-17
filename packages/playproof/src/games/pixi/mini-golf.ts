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
import type { PlayproofConfig, SDKHooks, GameResult, MiniGolfLevelSpec, ShotData, Vec2Type } from '../../types';

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

        this.gfx = {
            ball: null,
            hole: null,
            aimLine: null,
            walls: []
        };
    }

    async setup(): Promise<void> {
        const { width, height } = this.host!.getSize();
        const spec = LEVEL_SPEC;

        // Scale factor if canvas differs from spec
        this.scaleX = width / spec.world.width;
        this.scaleY = height / spec.world.height;

        // Create physics world
        this.world = new PhysicsWorld({
            gravity: { x: 0, y: 0 } // Top-down, no gravity
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
                { restitution: 0.8 }
            ));
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
            const wall = new Graphics();
            wall.rect(rect.x, rect.y, rect.width, rect.height);
            wall.fill({ color: wallColor });
            this.gfx.walls.push(wall);
            this.host!.layers.world.addChild(wall);
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
        if (!this.hasShot) {
            // Check if a drag just completed
            const completedDrag = this.input!.consumeCompletedDrag();

            if (completedDrag) {
                log('Got completedDrag:', completedDrag);
                const ballPos = this.ball!.position;
                log('Ball position:', ballPos);

                // Check if drag started near ball
                const distToBall = Vec2.distance(
                    { x: completedDrag.startX, y: completedDrag.startY },
                    ballPos
                );
                log('Distance to ball:', distToBall, 'threshold:', this.ball!.radius * 3);

                if (distToBall < this.ball!.radius * 3) {
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
                        this.ball!.applyImpulse(impulse);

                        this.hasShot = true;
                        this.shotData = {
                            startX: completedDrag.startX,
                            startY: completedDrag.startY,
                            endX: completedDrag.endX,
                            endY: completedDrag.endY,
                            power,
                            timestamp: performance.now()
                        };

                        this.input!.recordHit(); // Shot taken
                        log('Shot taken! velocity:', { ...this.ball!.velocity });
                    } else {
                        log('Power too low:', power);
                    }
                } else {
                    log('Drag not near ball');
                }
            }
        }

        // Update physics
        this.world!.update(dt);
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

    checkWinCondition(): GameResult | null {
        if (!this.hasShot) return null;

        // Check if ball is in hole
        if (Collision.circleInsideCircle(this.ball!, this.holeX, this.holeY, this.holeRadius)) {
            return { success: true, reason: 'holed' };
        }

        // Check if ball stopped (miss)
        if (this.ball!.isStopped(3)) {
            return { success: false, reason: 'missed' };
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
            levelSpec: LEVEL_SPEC,
            shot: this.shotData,
            finalBallPosition: this.ball ? { ...this.ball.position } : null
        };
    }
}

export default MiniGolfGame;
