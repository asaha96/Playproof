/**
 * Basketball Game
 * One-shot basketball game inspired by GamePigeon
 * 
 * Controls: Click-drag upward to shoot, release to throw
 * Win: Ball goes through the hoop
 */

import { PixiGameBase } from './game-base.js';
import { PhysicsWorld, CircleBody, RectBody, Vec2, Collision } from './physics.js';
import { Graphics } from 'pixi.js';

/**
 * Hardcoded level spec for v0
 */
const LEVEL_SPEC = {
    version: 1,
    world: { width: 400, height: 280, gravity: 600 },
    ball: { x: 80, y: 220, radius: 15 },
    hoop: { 
        x: 300, 
        y: 100, 
        rimWidth: 50,
        rimThickness: 4,
        backboardHeight: 60,
        backboardWidth: 8
    },
    shootZone: { x: 20, y: 160, w: 120, h: 120 }
};

export class BasketballGame extends PixiGameBase {
    constructor(gameArea, config, hooks) {
        super(gameArea, config, hooks);
        
        this.gameName = 'basketball';
        this.instructions = {
            title: 'Basketball',
            description: 'Swipe up to shoot the ball through the hoop!'
        };
        
        this.world = null;
        this.ball = null;
        this.hasShot = false;
        this.shotData = null;
        this.hoopSensor = null;
        this.ballPassedThroughHoop = false;
        this.ballWasAboveRim = false;
        
        this.gfx = {
            ball: null,
            hoop: null,
            backboard: null,
            aimLine: null
        };
    }

    async setup() {
        const { width, height } = this.host.getSize();
        const spec = LEVEL_SPEC;
        
        this.scaleX = width / spec.world.width;
        this.scaleY = height / spec.world.height;
        
        // Create physics world with gravity
        this.world = new PhysicsWorld({
            gravity: { x: 0, y: spec.world.gravity * this.scaleY }
        });
        
        // Create ball
        this.ball = new CircleBody(
            spec.ball.x * this.scaleX,
            spec.ball.y * this.scaleY,
            spec.ball.radius * Math.min(this.scaleX, this.scaleY),
            { friction: 0.99, restitution: 0.6 }
        );
        this.world.addCircle(this.ball);
        
        // Store hoop dimensions
        this.hoopX = spec.hoop.x * this.scaleX;
        this.hoopY = spec.hoop.y * this.scaleY;
        this.rimWidth = spec.hoop.rimWidth * this.scaleX;
        this.rimThickness = spec.hoop.rimThickness;
        
        // Left rim (collision)
        this.world.addRect(new RectBody(
            this.hoopX - this.rimWidth / 2,
            this.hoopY,
            this.rimThickness * 2,
            this.rimThickness * 2,
            { restitution: 0.5 }
        ));
        
        // Right rim (collision)
        this.world.addRect(new RectBody(
            this.hoopX + this.rimWidth / 2 - this.rimThickness * 2,
            this.hoopY,
            this.rimThickness * 2,
            this.rimThickness * 2,
            { restitution: 0.5 }
        ));
        
        // Backboard
        this.world.addRect(new RectBody(
            this.hoopX + this.rimWidth / 2 + 5,
            this.hoopY - spec.hoop.backboardHeight * this.scaleY / 2,
            spec.hoop.backboardWidth * this.scaleX,
            spec.hoop.backboardHeight * this.scaleY,
            { restitution: 0.7 }
        ));
        
        // Floor
        this.world.addRect(new RectBody(
            0, height - 10, width, 20, { restitution: 0.5 }
        ));
        
        // Hoop sensor for scoring
        this.hoopSensor = {
            x: this.hoopX - this.rimWidth / 2 + this.rimThickness * 2,
            y: this.hoopY + this.rimThickness,
            width: this.rimWidth - this.rimThickness * 4,
            height: this.ball.radius * 2
        };
        
        // Store shoot zone
        this.shootZone = {
            x: spec.shootZone.x * this.scaleX,
            y: spec.shootZone.y * this.scaleY,
            w: spec.shootZone.w * this.scaleX,
            h: spec.shootZone.h * this.scaleY
        };
        
        this._drawCourt();
    }

    _drawCourt() {
        const { width, height } = this.host.getSize();
        
        // Court background
        const bg = new Graphics();
        bg.rect(0, 0, width, height);
        bg.fill({ color: 0x1a2634 });
        this.host.layers.bg.addChild(bg);
        
        // Floor
        const floor = new Graphics();
        floor.rect(0, height - 15, width, 20);
        floor.fill({ color: 0x3d2817 });
        this.host.layers.bg.addChild(floor);
        
        // Backboard
        const backboard = new Graphics();
        const bbX = this.hoopX + this.rimWidth / 2 + 5;
        const bbY = this.hoopY - 30 * this.scaleY;
        const bbW = 8 * this.scaleX;
        const bbH = 60 * this.scaleY;
        backboard.rect(bbX, bbY, bbW, bbH);
        backboard.fill({ color: 0xffffff });
        backboard.stroke({ color: 0xff0000, width: 2 });
        this.gfx.backboard = backboard;
        this.host.layers.world.addChild(backboard);
        
        // Hoop/Rim
        const hoop = new Graphics();
        // Rim ring
        hoop.moveTo(this.hoopX - this.rimWidth / 2, this.hoopY + this.rimThickness);
        hoop.lineTo(this.hoopX + this.rimWidth / 2, this.hoopY + this.rimThickness);
        hoop.stroke({ color: 0xff6600, width: this.rimThickness });
        // Net (simple lines)
        const netSegments = 5;
        for (let i = 0; i <= netSegments; i++) {
            const t = i / netSegments;
            const x = this.hoopX - this.rimWidth / 2 + this.rimWidth * t;
            hoop.moveTo(x, this.hoopY + this.rimThickness);
            hoop.lineTo(this.hoopX, this.hoopY + 30 * this.scaleY);
            hoop.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
        }
        this.gfx.hoop = hoop;
        this.host.layers.world.addChild(hoop);
        
        // Ball
        this.gfx.ball = new Graphics();
        this.host.layers.world.addChild(this.gfx.ball);
        
        // Aim line
        this.gfx.aimLine = new Graphics();
        this.host.layers.ui.addChild(this.gfx.aimLine);
    }

    update(dt) {
        // Check for shot input
        if (!this.hasShot) {
            // Check if a drag just completed
            const completedDrag = this.input.consumeCompletedDrag();
            
            if (completedDrag) {
                // Check if drag started in shoot zone
                const startInZone = Collision.pointInRect(
                    completedDrag.startX, completedDrag.startY,
                    this.shootZone.x, this.shootZone.y,
                    this.shootZone.w, this.shootZone.h
                );
                
                if (startInZone) {
                    // Upward swipe = shot
                    const dx = completedDrag.endX - completedDrag.startX;
                    const dy = completedDrag.startY - completedDrag.endY; // Invert Y (up is negative in screen coords)
                    
                    if (dy > 20) { // Minimum upward swipe
                        const power = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.4, 20);
                        const angle = Math.atan2(dy, dx);
                        
                        const impulseX = Math.cos(angle) * power;
                        const impulseY = -Math.sin(angle) * power; // Negative for upward
                        
                        this.ball.applyImpulse({ x: impulseX, y: impulseY });
                        
                        this.hasShot = true;
                        this.shotData = {
                            startX: completedDrag.startX,
                            startY: completedDrag.startY,
                            endX: completedDrag.endX,
                            endY: completedDrag.endY,
                            power,
                            angle,
                            timestamp: performance.now()
                        };
                        
                        this.input.recordHit();
                    }
                }
            }
        }
        
        // Update physics
        this.world.update(dt);
        
        // Track ball position for hoop detection
        if (this.hasShot) {
            const ballY = this.ball.position.y;
            const ballX = this.ball.position.x;
            
            // Check if ball is above rim
            if (ballY < this.hoopY) {
                this.ballWasAboveRim = true;
            }
            
            // Check if ball passes through hoop sensor (coming from above)
            if (this.ballWasAboveRim && !this.ballPassedThroughHoop) {
                if (ballX > this.hoopSensor.x && 
                    ballX < this.hoopSensor.x + this.hoopSensor.width &&
                    ballY > this.hoopSensor.y &&
                    ballY < this.hoopSensor.y + this.hoopSensor.height) {
                    this.ballPassedThroughHoop = true;
                }
            }
        }
    }

    render(alpha) {
        const pos = this.ball.getInterpolatedPosition(alpha);
        
        // Draw ball
        this.gfx.ball.clear();
        this.gfx.ball.circle(pos.x, pos.y, this.ball.radius);
        this.gfx.ball.fill({ color: 0xff6b35 });
        // Ball lines
        this.gfx.ball.moveTo(pos.x - this.ball.radius, pos.y);
        this.gfx.ball.lineTo(pos.x + this.ball.radius, pos.y);
        this.gfx.ball.stroke({ color: 0x333333, width: 2 });
        this.gfx.ball.moveTo(pos.x, pos.y - this.ball.radius);
        this.gfx.ball.lineTo(pos.x, pos.y + this.ball.radius);
        this.gfx.ball.stroke({ color: 0x333333, width: 2 });
        
        // Draw aim line while dragging
        this.gfx.aimLine.clear();
        
        if (!this.hasShot && this.input.isDragging) {
            const drag = this.input.getDragInfo();
            if (drag) {
                const startInZone = Collision.pointInRect(
                    drag.startX, drag.startY,
                    this.shootZone.x, this.shootZone.y,
                    this.shootZone.w, this.shootZone.h
                );
                
                if (startInZone) {
                    const ballPos = this.ball.position;
                    
                    // Draw trajectory preview
                    const dx = drag.currentX - drag.startX;
                    const dy = drag.startY - drag.currentY;
                    
                    if (dy > 10) {
                        const power = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.4, 20);
                        const angle = Math.atan2(dy, dx);
                        
                        // Simple arc preview
                        const vx = Math.cos(angle) * power * 30;
                        const vy = -Math.sin(angle) * power * 30;
                        
                        this.gfx.aimLine.moveTo(ballPos.x, ballPos.y);
                        
                        for (let t = 0; t < 1; t += 0.1) {
                            const px = ballPos.x + vx * t;
                            const py = ballPos.y + vy * t + 0.5 * 600 * this.scaleY * t * t * 0.01;
                            this.gfx.aimLine.lineTo(px, py);
                        }
                        
                        this.gfx.aimLine.stroke({ color: 0xffffff, width: 2, alpha: 0.5 });
                    }
                }
            }
        }
    }

    checkWinCondition() {
        if (!this.hasShot) return null;
        
        // Success if ball passed through hoop
        if (this.ballPassedThroughHoop) {
            return { success: true, reason: 'scored' };
        }
        
        // Fail if ball hit ground or stopped
        const { height } = this.host.getSize();
        if (this.ball.position.y > height - 20 && this.ball.isStopped(1)) {
            return { success: false, reason: 'missed' };
        }
        
        // Fail if ball goes off screen
        if (this.ball.position.x < -50 || this.ball.position.x > this.host.getSize().width + 50) {
            return { success: false, reason: 'out_of_bounds' };
        }
        
        return null;
    }

    calculateAccuracy(success, reason) {
        if (success) {
            return 0.85 + Math.random() * 0.07; // 0.85-0.92
        }
        
        // Calculate based on how close to hoop
        const distToHoop = Vec2.distance(this.ball.position, { x: this.hoopX, y: this.hoopY });
        const maxDist = 300;
        const closeness = 1 - Math.min(distToHoop / maxDist, 1);
        
        return 0.4 + closeness * 0.4; // 0.4-0.8
    }

    getAttemptDetails() {
        return {
            levelSpec: LEVEL_SPEC,
            shot: this.shotData,
            scored: this.ballPassedThroughHoop,
            finalBallPosition: this.ball ? { ...this.ball.position } : null
        };
    }
}

export default BasketballGame;
