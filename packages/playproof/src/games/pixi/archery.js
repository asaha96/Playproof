/**
 * Archery Game
 * One-arrow precision game inspired by GamePigeon
 * 
 * Controls: Click-hold to draw bow, drag to aim, release to fire
 * Win: Arrow hits within target ring
 */

import { PixiGameBase } from './game-base.js';
import { Vec2 } from './physics.js';
import { Graphics } from 'pixi.js';

/**
 * Hardcoded level spec for v0
 */
const LEVEL_SPEC = {
    version: 1,
    world: { width: 400, height: 280 },
    bow: { x: 60, y: 140 },
    target: { 
        x: 340, 
        y: 140, 
        outerRadius: 50,
        bullseyeRadius: 10,
        rings: 4
    },
    arrow: { speed: 800, length: 40 },
    passThreshold: 0.7 // Hit within 70% of target radius to pass
};

export class ArcheryGame extends PixiGameBase {
    constructor(gameArea, config, hooks) {
        super(gameArea, config, hooks);
        
        this.gameName = 'archery';
        this.instructions = {
            title: 'Archery',
            description: 'Hold to draw, aim at the target, release to fire!'
        };
        
        this.arrow = null;
        this.hasShot = false;
        this.isDrawing = false;
        this.drawStartTime = 0;
        this.shotData = null;
        this.arrowHit = null;
        
        this.gfx = {
            bow: null,
            arrow: null,
            target: null,
            aimLine: null,
            drawIndicator: null
        };
    }

    async setup() {
        const { width, height } = this.host.getSize();
        const spec = LEVEL_SPEC;
        
        this.scaleX = width / spec.world.width;
        this.scaleY = height / spec.world.height;
        
        // Bow position
        this.bowX = spec.bow.x * this.scaleX;
        this.bowY = spec.bow.y * this.scaleY;
        
        // Target position and size
        this.targetX = spec.target.x * this.scaleX;
        this.targetY = spec.target.y * this.scaleY;
        this.targetRadius = spec.target.outerRadius * Math.min(this.scaleX, this.scaleY);
        this.bullseyeRadius = spec.target.bullseyeRadius * Math.min(this.scaleX, this.scaleY);
        this.passRadius = this.targetRadius * spec.passThreshold;
        
        // Arrow initial state
        this.arrow = {
            x: this.bowX,
            y: this.bowY,
            vx: 0,
            vy: 0,
            angle: 0,
            length: spec.arrow.length * Math.min(this.scaleX, this.scaleY),
            speed: spec.arrow.speed * this.scaleX
        };
        
        this._drawScene();
    }

    _drawScene() {
        const { width, height } = this.host.getSize();
        
        // Background (sky gradient effect)
        const bg = new Graphics();
        bg.rect(0, 0, width, height);
        bg.fill({ color: 0x87ceeb });
        this.host.layers.bg.addChild(bg);
        
        // Grass floor
        const grass = new Graphics();
        grass.rect(0, height - 30, width, 30);
        grass.fill({ color: 0x228b22 });
        this.host.layers.bg.addChild(grass);
        
        // Target
        const target = new Graphics();
        const rings = 4;
        const colors = [0xffffff, 0x000000, 0x2196f3, 0xff0000, 0xffeb3b]; // outer to inner
        
        for (let i = 0; i <= rings; i++) {
            const ringRadius = this.targetRadius * (1 - i / (rings + 1));
            target.circle(this.targetX, this.targetY, ringRadius);
            target.fill({ color: colors[i] || 0xffeb3b });
        }
        this.gfx.target = target;
        this.host.layers.world.addChild(target);
        
        // Bow
        this.gfx.bow = new Graphics();
        this.host.layers.world.addChild(this.gfx.bow);
        
        // Arrow
        this.gfx.arrow = new Graphics();
        this.host.layers.world.addChild(this.gfx.arrow);
        
        // Aim line
        this.gfx.aimLine = new Graphics();
        this.host.layers.ui.addChild(this.gfx.aimLine);
        
        // Draw power indicator
        this.gfx.drawIndicator = new Graphics();
        this.host.layers.ui.addChild(this.gfx.drawIndicator);
    }

    _drawBow(drawAmount = 0, aimAngle = 0) {
        this.gfx.bow.clear();
        
        const bowLength = 60 * Math.min(this.scaleX, this.scaleY);
        const drawBack = drawAmount * 20;
        
        // Bow arc
        const startAngle = aimAngle - Math.PI / 3;
        const endAngle = aimAngle + Math.PI / 3;
        
        this.gfx.bow.arc(this.bowX, this.bowY, bowLength / 2, startAngle, endAngle);
        this.gfx.bow.stroke({ color: 0x8b4513, width: 6 });
        
        // Bow string
        const stringStartX = this.bowX + Math.cos(startAngle) * bowLength / 2;
        const stringStartY = this.bowY + Math.sin(startAngle) * bowLength / 2;
        const stringEndX = this.bowX + Math.cos(endAngle) * bowLength / 2;
        const stringEndY = this.bowY + Math.sin(endAngle) * bowLength / 2;
        const stringMidX = this.bowX - Math.cos(aimAngle) * drawBack;
        const stringMidY = this.bowY - Math.sin(aimAngle) * drawBack;
        
        this.gfx.bow.moveTo(stringStartX, stringStartY);
        this.gfx.bow.lineTo(stringMidX, stringMidY);
        this.gfx.bow.lineTo(stringEndX, stringEndY);
        this.gfx.bow.stroke({ color: 0xffffff, width: 2 });
    }

    update(dt) {
        if (!this.hasShot) {
            // Handle bow drawing
            if (this.input.isDragging) {
                if (!this.isDrawing) {
                    this.isDrawing = true;
                    this.drawStartTime = performance.now();
                }
            } else if (this.isDrawing) {
                // Released - fire arrow
                const drag = this.input.getDragInfo();
                if (drag) {
                    const drawDuration = performance.now() - this.drawStartTime;
                    const drawPower = Math.min(drawDuration / 1000, 1); // Max 1 second draw
                    
                    // Aim angle based on drag
                    const dx = drag.currentX - this.bowX;
                    const dy = drag.currentY - this.bowY;
                    const aimAngle = Math.atan2(dy, dx);
                    
                    // Launch arrow
                    this.arrow.vx = Math.cos(aimAngle) * this.arrow.speed * drawPower;
                    this.arrow.vy = Math.sin(aimAngle) * this.arrow.speed * drawPower;
                    this.arrow.angle = aimAngle;
                    
                    this.hasShot = true;
                    this.shotData = {
                        drawDuration,
                        drawPower,
                        aimAngle,
                        aimX: drag.currentX,
                        aimY: drag.currentY,
                        timestamp: performance.now()
                    };
                    
                    this.input.recordHit();
                }
                this.isDrawing = false;
            }
        } else {
            // Arrow in flight
            // Simple trajectory (slight gravity for arc)
            this.arrow.vy += 200 * dt; // Light gravity
            this.arrow.x += this.arrow.vx * dt;
            this.arrow.y += this.arrow.vy * dt;
            this.arrow.angle = Math.atan2(this.arrow.vy, this.arrow.vx);
            
            // Check for target hit
            const distToTarget = Vec2.distance(
                { x: this.arrow.x, y: this.arrow.y },
                { x: this.targetX, y: this.targetY }
            );
            
            if (distToTarget < this.targetRadius) {
                this.arrowHit = {
                    x: this.arrow.x,
                    y: this.arrow.y,
                    distance: distToTarget
                };
                this.arrow.vx = 0;
                this.arrow.vy = 0;
            }
        }
    }

    render(alpha) {
        // Draw bow
        if (!this.hasShot) {
            let drawAmount = 0;
            let aimAngle = 0;
            
            if (this.isDrawing) {
                const drag = this.input.getDragInfo();
                if (drag) {
                    const drawDuration = performance.now() - this.drawStartTime;
                    drawAmount = Math.min(drawDuration / 1000, 1);
                    aimAngle = Math.atan2(drag.currentY - this.bowY, drag.currentX - this.bowX);
                }
            }
            
            this._drawBow(drawAmount, aimAngle);
            
            // Draw power indicator
            this.gfx.drawIndicator.clear();
            if (this.isDrawing) {
                const drag = this.input.getDragInfo();
                if (drag) {
                    const drawDuration = performance.now() - this.drawStartTime;
                    const power = Math.min(drawDuration / 1000, 1);
                    
                    // Power bar
                    const barWidth = 60;
                    const barHeight = 8;
                    const barX = this.bowX - barWidth / 2;
                    const barY = this.bowY + 50;
                    
                    this.gfx.drawIndicator.rect(barX, barY, barWidth, barHeight);
                    this.gfx.drawIndicator.stroke({ color: 0xffffff, width: 1 });
                    
                    this.gfx.drawIndicator.rect(barX, barY, barWidth * power, barHeight);
                    const powerColor = power < 0.5 ? 0x00ff00 : power < 0.8 ? 0xffff00 : 0xff0000;
                    this.gfx.drawIndicator.fill({ color: powerColor });
                }
            }
        }
        
        // Draw arrow
        this.gfx.arrow.clear();
        
        const arrowX = this.arrow.x;
        const arrowY = this.arrow.y;
        const angle = this.arrow.angle;
        
        // Arrow shaft
        const tailX = arrowX - Math.cos(angle) * this.arrow.length;
        const tailY = arrowY - Math.sin(angle) * this.arrow.length;
        
        this.gfx.arrow.moveTo(tailX, tailY);
        this.gfx.arrow.lineTo(arrowX, arrowY);
        this.gfx.arrow.stroke({ color: 0x8b4513, width: 3 });
        
        // Arrowhead
        const headSize = 8;
        const headAngle1 = angle + Math.PI * 0.85;
        const headAngle2 = angle - Math.PI * 0.85;
        
        this.gfx.arrow.moveTo(arrowX, arrowY);
        this.gfx.arrow.lineTo(
            arrowX + Math.cos(headAngle1) * headSize,
            arrowY + Math.sin(headAngle1) * headSize
        );
        this.gfx.arrow.moveTo(arrowX, arrowY);
        this.gfx.arrow.lineTo(
            arrowX + Math.cos(headAngle2) * headSize,
            arrowY + Math.sin(headAngle2) * headSize
        );
        this.gfx.arrow.stroke({ color: 0x333333, width: 3 });
        
        // Fletching
        const fletchX = tailX + Math.cos(angle) * 5;
        const fletchY = tailY + Math.sin(angle) * 5;
        const fletchAngle1 = angle + Math.PI / 2;
        const fletchAngle2 = angle - Math.PI / 2;
        
        this.gfx.arrow.moveTo(fletchX, fletchY);
        this.gfx.arrow.lineTo(
            fletchX + Math.cos(fletchAngle1) * 6,
            fletchY + Math.sin(fletchAngle1) * 6
        );
        this.gfx.arrow.moveTo(fletchX, fletchY);
        this.gfx.arrow.lineTo(
            fletchX + Math.cos(fletchAngle2) * 6,
            fletchY + Math.sin(fletchAngle2) * 6
        );
        this.gfx.arrow.stroke({ color: 0xff0000, width: 2 });
        
        // Aim line while drawing
        this.gfx.aimLine.clear();
        if (!this.hasShot && this.isDrawing) {
            const drag = this.input.getDragInfo();
            if (drag) {
                const aimAngle = Math.atan2(drag.currentY - this.bowY, drag.currentX - this.bowX);
                const lineLength = 150;
                
                this.gfx.aimLine.moveTo(this.bowX, this.bowY);
                this.gfx.aimLine.lineTo(
                    this.bowX + Math.cos(aimAngle) * lineLength,
                    this.bowY + Math.sin(aimAngle) * lineLength
                );
                this.gfx.aimLine.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
            }
        }
    }

    checkWinCondition() {
        if (!this.hasShot) return null;
        
        // Check if arrow hit target
        if (this.arrowHit) {
            const success = this.arrowHit.distance < this.passRadius;
            return { 
                success, 
                reason: success ? 'hit' : 'edge_hit'
            };
        }
        
        // Check if arrow went off screen
        const { width, height } = this.host.getSize();
        if (this.arrow.x > width + 50 || this.arrow.y > height + 50 || 
            this.arrow.x < -50 || this.arrow.y < -50) {
            return { success: false, reason: 'missed' };
        }
        
        return null;
    }

    calculateAccuracy(success, reason) {
        if (!this.arrowHit) {
            return 0.3 + Math.random() * 0.2; // Complete miss: 0.3-0.5
        }
        
        // Map distance to accuracy
        const normalizedDist = this.arrowHit.distance / this.targetRadius;
        
        if (normalizedDist < 0.2) {
            return 0.90 + Math.random() * 0.02; // Bullseye: 0.90-0.92
        } else if (normalizedDist < 0.5) {
            return 0.80 + Math.random() * 0.08; // Close: 0.80-0.88
        } else if (normalizedDist < 0.7) {
            return 0.65 + Math.random() * 0.1; // Medium: 0.65-0.75
        } else {
            return 0.5 + Math.random() * 0.1; // Edge: 0.5-0.6
        }
    }

    getAttemptDetails() {
        return {
            levelSpec: LEVEL_SPEC,
            shot: this.shotData,
            hit: this.arrowHit,
            targetCenter: { x: this.targetX, y: this.targetY },
            targetRadius: this.targetRadius
        };
    }
}

export default ArcheryGame;
