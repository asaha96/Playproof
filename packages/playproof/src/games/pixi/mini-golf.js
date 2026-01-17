/**
 * Mini Golf Game
 * One-stroke putting game inspired by GamePigeon
 * 
 * Controls: Click-drag on ball to aim, release to shoot
 * Win: Ball enters hole before timeout
 */

import { PixiGameBase } from './game-base.js';
import { PhysicsWorld, CircleBody, RectBody, Vec2, Collision } from './physics.js';
import { Graphics } from 'pixi.js';

/**
 * Hardcoded level spec for v0
 * Future: will be generated from seed
 */
const LEVEL_SPEC = {
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

export class MiniGolfGame extends PixiGameBase {
    constructor(gameArea, config, hooks) {
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
        
        // Graphics references
        this.gfx = {
            ball: null,
            hole: null,
            aimLine: null,
            walls: []
        };
    }

    async setup() {
        const { width, height } = this.host.getSize();
        const spec = LEVEL_SPEC;
        
        // Scale factor if canvas differs from spec
        this.scaleX = width / spec.world.width;
        this.scaleY = height / spec.world.height;
        
        // Create physics world
        this.world = new PhysicsWorld({
            gravity: { x: 0, y: 0 } // Top-down, no gravity
        });
        
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

    _drawCourse() {
        const spec = LEVEL_SPEC;
        
        // Draw grass background
        const bg = new Graphics();
        bg.rect(0, 0, this.host.getSize().width, this.host.getSize().height);
        bg.fill({ color: 0x2d5a27 });
        this.host.layers.bg.addChild(bg);
        
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
        this.host.layers.world.addChild(hole);
        
        // Draw walls
        const wallColor = this.host.hexToNumber(this.theme.border || '#5a3d2b');
        for (const rect of this.world.rects) {
            const wall = new Graphics();
            wall.rect(rect.x, rect.y, rect.width, rect.height);
            wall.fill({ color: wallColor });
            this.gfx.walls.push(wall);
            this.host.layers.world.addChild(wall);
        }
        
        // Draw ball
        this.gfx.ball = new Graphics();
        this.host.layers.world.addChild(this.gfx.ball);
        
        // Aim line (hidden initially)
        this.gfx.aimLine = new Graphics();
        this.host.layers.ui.addChild(this.gfx.aimLine);
    }

    update(dt) {
        // Check for shot input
        if (!this.hasShot) {
            const drag = this.input.getDragInfo();
            
            if (drag && !this.input.isDragging) {
                // Drag ended - take shot
                const ballPos = this.ball.position;
                
                // Check if drag started near ball
                const distToBall = Vec2.distance(
                    { x: drag.startX, y: drag.startY },
                    ballPos
                );
                
                if (distToBall < this.ball.radius * 3) {
                    // Calculate impulse (opposite of drag direction)
                    const dx = drag.startX - drag.currentX;
                    const dy = drag.startY - drag.currentY;
                    const power = Math.min(Vec2.length({ x: dx, y: dy }) * 0.15, 25);
                    
                    const impulse = Vec2.scale(Vec2.normalize({ x: dx, y: dy }), power);
                    this.ball.applyImpulse(impulse);
                    
                    this.hasShot = true;
                    this.shotData = {
                        startX: drag.startX,
                        startY: drag.startY,
                        endX: drag.currentX,
                        endY: drag.currentY,
                        power,
                        timestamp: performance.now()
                    };
                    
                    this.input.recordHit(); // Shot taken
                }
            }
        }
        
        // Update physics
        this.world.update(dt);
    }

    render(alpha) {
        // Draw ball at interpolated position
        const pos = this.ball.getInterpolatedPosition(alpha);
        
        this.gfx.ball.clear();
        this.gfx.ball.circle(pos.x, pos.y, this.ball.radius);
        this.gfx.ball.fill({ color: 0xffffff });
        
        // Draw aim line while dragging
        this.gfx.aimLine.clear();
        
        if (!this.hasShot && this.input.isDragging) {
            const drag = this.input.getDragInfo();
            if (drag) {
                const ballPos = this.ball.position;
                
                // Check if dragging from near ball
                const distToBall = Vec2.distance(
                    { x: drag.startX, y: drag.startY },
                    ballPos
                );
                
                if (distToBall < this.ball.radius * 3) {
                    // Draw aim line (opposite direction)
                    const dx = drag.startX - drag.currentX;
                    const dy = drag.startY - drag.currentY;
                    const power = Math.min(Vec2.length({ x: dx, y: dy }) * 0.15, 25);
                    const dir = Vec2.normalize({ x: dx, y: dy });
                    
                    // Line from ball in shot direction
                    const endX = ballPos.x + dir.x * power * 5;
                    const endY = ballPos.y + dir.y * power * 5;
                    
                    this.gfx.aimLine.moveTo(ballPos.x, ballPos.y);
                    this.gfx.aimLine.lineTo(endX, endY);
                    this.gfx.aimLine.stroke({ 
                        color: 0xffffff, 
                        width: 2,
                        alpha: 0.7
                    });
                    
                    // Power indicator dots
                    const numDots = Math.floor(power / 5);
                    for (let i = 1; i <= numDots; i++) {
                        const t = i / (power / 5);
                        const dotX = ballPos.x + dir.x * power * 5 * t;
                        const dotY = ballPos.y + dir.y * power * 5 * t;
                        this.gfx.aimLine.circle(dotX, dotY, 3);
                        this.gfx.aimLine.fill({ color: 0xffffff, alpha: 0.5 });
                    }
                }
            }
        }
    }

    checkWinCondition() {
        if (!this.hasShot) return null;
        
        // Check if ball is in hole
        if (Collision.circleInsideCircle(this.ball, this.holeX, this.holeY, this.holeRadius)) {
            return { success: true, reason: 'holed' };
        }
        
        // Check if ball stopped (miss)
        if (this.ball.isStopped(0.3)) {
            return { success: false, reason: 'missed' };
        }
        
        return null;
    }

    calculateAccuracy(success, reason) {
        if (success) {
            return 0.88 + Math.random() * 0.04; // 0.88-0.92 for hole
        }
        
        // Calculate based on distance to hole
        const dist = Vec2.distance(this.ball.position, { x: this.holeX, y: this.holeY });
        const maxDist = Math.sqrt(
            Math.pow(this.host.getSize().width, 2) + 
            Math.pow(this.host.getSize().height, 2)
        );
        const closeness = 1 - (dist / maxDist);
        
        // Map to 0.5-0.85 range
        return 0.5 + closeness * 0.35;
    }

    getAttemptDetails() {
        return {
            levelSpec: LEVEL_SPEC,
            shot: this.shotData,
            finalBallPosition: this.ball ? { ...this.ball.position } : null
        };
    }
}

export default MiniGolfGame;
