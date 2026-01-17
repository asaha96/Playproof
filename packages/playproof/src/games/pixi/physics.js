/**
 * Lightweight 2D Physics
 * Simple, deterministic physics for verification games
 * 
 * Avoids external dependencies; designed for easy server replay
 */

/**
 * 2D Vector utilities
 */
export const Vec2 = {
    create(x = 0, y = 0) {
        return { x, y };
    },
    
    add(a, b) {
        return { x: a.x + b.x, y: a.y + b.y };
    },
    
    sub(a, b) {
        return { x: a.x - b.x, y: a.y - b.y };
    },
    
    scale(v, s) {
        return { x: v.x * s, y: v.y * s };
    },
    
    length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    },
    
    normalize(v) {
        const len = Vec2.length(v);
        if (len === 0) return { x: 0, y: 0 };
        return { x: v.x / len, y: v.y / len };
    },
    
    dot(a, b) {
        return a.x * b.x + a.y * b.y;
    },
    
    reflect(v, normal) {
        const dot = Vec2.dot(v, normal);
        return {
            x: v.x - 2 * dot * normal.x,
            y: v.y - 2 * dot * normal.y
        };
    },
    
    distance(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
};

/**
 * Simple circle body for physics simulation
 */
export class CircleBody {
    constructor(x, y, radius, options = {}) {
        this.position = Vec2.create(x, y);
        this.prevPosition = Vec2.create(x, y);
        this.velocity = Vec2.create(0, 0);
        this.radius = radius;
        
        this.friction = options.friction ?? 0.98;
        this.restitution = options.restitution ?? 0.8;
        this.mass = options.mass ?? 1;
        this.isStatic = options.isStatic ?? false;
    }

    /**
     * Apply impulse to body
     */
    applyImpulse(impulse) {
        if (this.isStatic) return;
        this.velocity = Vec2.add(this.velocity, Vec2.scale(impulse, 1 / this.mass));
    }

    /**
     * Update position (Verlet-style)
     */
    update(dt, gravity = { x: 0, y: 0 }) {
        if (this.isStatic) return;
        
        // Save previous position for interpolation
        this.prevPosition = { ...this.position };
        
        // Apply gravity
        this.velocity = Vec2.add(this.velocity, Vec2.scale(gravity, dt));
        
        // Apply friction
        this.velocity = Vec2.scale(this.velocity, this.friction);
        
        // Update position
        this.position = Vec2.add(this.position, Vec2.scale(this.velocity, dt));
    }

    /**
     * Get interpolated position for rendering
     */
    getInterpolatedPosition(alpha) {
        return {
            x: this.prevPosition.x + (this.position.x - this.prevPosition.x) * alpha,
            y: this.prevPosition.y + (this.position.y - this.prevPosition.y) * alpha
        };
    }

    /**
     * Check if body is effectively stopped
     */
    isStopped(threshold = 0.5) {
        return Vec2.length(this.velocity) < threshold;
    }
}

/**
 * Axis-aligned rectangle for walls/obstacles
 */
export class RectBody {
    constructor(x, y, width, height, options = {}) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.restitution = options.restitution ?? 0.9;
    }

    /**
     * Get bounds
     */
    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
}

/**
 * Collision detection and resolution
 */
export const Collision = {
    /**
     * Circle vs Circle collision
     */
    circleVsCircle(a, b) {
        const dist = Vec2.distance(a.position, b.position);
        const minDist = a.radius + b.radius;
        return dist < minDist;
    },

    /**
     * Circle vs Rect collision with resolution
     */
    circleVsRect(circle, rect) {
        const bounds = rect.getBounds();
        
        // Find closest point on rect to circle center
        const closestX = Math.max(bounds.left, Math.min(circle.position.x, bounds.right));
        const closestY = Math.max(bounds.top, Math.min(circle.position.y, bounds.bottom));
        
        const distX = circle.position.x - closestX;
        const distY = circle.position.y - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        
        if (distance < circle.radius) {
            // Collision detected - calculate normal
            let normal;
            if (distance === 0) {
                // Circle center is inside rect - push out via shortest axis
                const overlapLeft = circle.position.x - bounds.left;
                const overlapRight = bounds.right - circle.position.x;
                const overlapTop = circle.position.y - bounds.top;
                const overlapBottom = bounds.bottom - circle.position.y;
                
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                
                if (minOverlap === overlapLeft) normal = { x: -1, y: 0 };
                else if (minOverlap === overlapRight) normal = { x: 1, y: 0 };
                else if (minOverlap === overlapTop) normal = { x: 0, y: -1 };
                else normal = { x: 0, y: 1 };
            } else {
                normal = Vec2.normalize({ x: distX, y: distY });
            }
            
            return { collided: true, normal, penetration: circle.radius - distance };
        }
        
        return { collided: false };
    },

    /**
     * Resolve circle vs rect collision
     */
    resolveCircleVsRect(circle, rect, collision) {
        if (!collision.collided || circle.isStatic) return;
        
        // Push circle out of rect
        circle.position = Vec2.add(
            circle.position,
            Vec2.scale(collision.normal, collision.penetration)
        );
        
        // Reflect velocity
        circle.velocity = Vec2.scale(
            Vec2.reflect(circle.velocity, collision.normal),
            circle.restitution * rect.restitution
        );
    },

    /**
     * Check if circle is inside another circle (for hole detection)
     */
    circleInsideCircle(inner, outerX, outerY, outerRadius) {
        const dist = Vec2.distance(inner.position, { x: outerX, y: outerY });
        return dist + inner.radius * 0.5 < outerRadius;
    },

    /**
     * Check if point is inside circle
     */
    pointInCircle(px, py, cx, cy, radius) {
        const dx = px - cx;
        const dy = py - cy;
        return dx * dx + dy * dy <= radius * radius;
    },

    /**
     * Check if point is inside rect
     */
    pointInRect(px, py, rx, ry, rw, rh) {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    }
};

/**
 * Simple physics world
 */
export class PhysicsWorld {
    constructor(options = {}) {
        this.gravity = options.gravity ?? { x: 0, y: 0 };
        this.bodies = [];
        this.rects = [];
    }

    addCircle(circle) {
        this.bodies.push(circle);
        return circle;
    }

    addRect(rect) {
        this.rects.push(rect);
        return rect;
    }

    /**
     * Step the physics simulation
     */
    update(dt) {
        // Update all bodies
        for (const body of this.bodies) {
            body.update(dt, this.gravity);
        }

        // Resolve collisions with rects
        for (const body of this.bodies) {
            for (const rect of this.rects) {
                const collision = Collision.circleVsRect(body, rect);
                if (collision.collided) {
                    Collision.resolveCircleVsRect(body, rect, collision);
                }
            }
        }

        // Resolve circle vs circle
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                if (Collision.circleVsCircle(this.bodies[i], this.bodies[j])) {
                    // Simple separation - push apart
                    const a = this.bodies[i];
                    const b = this.bodies[j];
                    const normal = Vec2.normalize(Vec2.sub(b.position, a.position));
                    const overlap = (a.radius + b.radius) - Vec2.distance(a.position, b.position);
                    
                    if (!a.isStatic) a.position = Vec2.sub(a.position, Vec2.scale(normal, overlap / 2));
                    if (!b.isStatic) b.position = Vec2.add(b.position, Vec2.scale(normal, overlap / 2));
                }
            }
        }
    }

    clear() {
        this.bodies = [];
        this.rects = [];
    }
}

export default { Vec2, CircleBody, RectBody, Collision, PhysicsWorld };
