/**
 * Lightweight 2D Physics
 */

export interface Vec2Type {
  x: number;
  y: number;
}

export interface CircleBodyOptions {
  friction?: number;
  restitution?: number;
  mass?: number;
  isStatic?: boolean;
}

export interface RectBodyOptions {
  restitution?: number;
  id?: string;
  kind?: string;
}

export interface CollisionResult {
  collided: boolean;
  normal?: Vec2Type;
  penetration?: number;
}

export interface RectBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface PhysicsCollisionEvent {
  circle: CircleBody;
  rect: RectBody;
  collision: CollisionResult;
}

export const Vec2 = {
  create(x = 0, y = 0): Vec2Type {
    return { x, y };
  },

  add(a: Vec2Type, b: Vec2Type): Vec2Type {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  sub(a: Vec2Type, b: Vec2Type): Vec2Type {
    return { x: a.x - b.x, y: a.y - b.y };
  },

  scale(v: Vec2Type, s: number): Vec2Type {
    return { x: v.x * s, y: v.y * s };
  },

  length(v: Vec2Type): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  normalize(v: Vec2Type): Vec2Type {
    const len = Vec2.length(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  },

  dot(a: Vec2Type, b: Vec2Type): number {
    return a.x * b.x + a.y * b.y;
  },

  reflect(v: Vec2Type, normal: Vec2Type): Vec2Type {
    const dot = Vec2.dot(v, normal);
    return {
      x: v.x - 2 * dot * normal.x,
      y: v.y - 2 * dot * normal.y
    };
  },

  distance(a: Vec2Type, b: Vec2Type): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
};

export class CircleBody {
  position: Vec2Type;
  prevPosition: Vec2Type;
  velocity: Vec2Type;
  radius: number;
  friction: number;
  restitution: number;
  mass: number;
  isStatic: boolean;

  constructor(x: number, y: number, radius: number, options: CircleBodyOptions = {}) {
    this.position = Vec2.create(x, y);
    this.prevPosition = Vec2.create(x, y);
    this.velocity = Vec2.create(0, 0);
    this.radius = radius;

    this.friction = options.friction ?? 0.98;
    this.restitution = options.restitution ?? 0.8;
    this.mass = options.mass ?? 1;
    this.isStatic = options.isStatic ?? false;
  }

  applyImpulse(impulse: Vec2Type): void {
    if (this.isStatic) return;
    this.velocity = Vec2.add(this.velocity, Vec2.scale(impulse, 1 / this.mass));
  }

  update(dt: number, gravity: Vec2Type = { x: 0, y: 0 }): void {
    if (this.isStatic) return;

    this.prevPosition = { ...this.position };

    this.velocity = Vec2.add(this.velocity, Vec2.scale(gravity, dt));
    this.velocity = Vec2.scale(this.velocity, this.friction);
    this.position = Vec2.add(this.position, Vec2.scale(this.velocity, dt));
  }

  getInterpolatedPosition(alpha: number): Vec2Type {
    return {
      x: this.prevPosition.x + (this.position.x - this.prevPosition.x) * alpha,
      y: this.prevPosition.y + (this.position.y - this.prevPosition.y) * alpha
    };
  }

  isStopped(threshold = 0.5): boolean {
    return Vec2.length(this.velocity) < threshold;
  }
}

export class RectBody {
  x: number;
  y: number;
  width: number;
  height: number;
  restitution: number;
  id: string | null;
  kind: string | null;

  constructor(x: number, y: number, width: number, height: number, options: RectBodyOptions = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.restitution = options.restitution ?? 0.9;
    this.id = options.id ?? null;
    this.kind = options.kind ?? null;
  }

  getBounds(): RectBounds {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    };
  }
}

export const Collision = {
  circleVsCircle(a: CircleBody, b: CircleBody): boolean {
    const dist = Vec2.distance(a.position, b.position);
    const minDist = a.radius + b.radius;
    return dist < minDist;
  },

  circleVsRect(circle: CircleBody, rect: RectBody): CollisionResult {
    const bounds = rect.getBounds();

    const closestX = Math.max(bounds.left, Math.min(circle.position.x, bounds.right));
    const closestY = Math.max(bounds.top, Math.min(circle.position.y, bounds.bottom));

    const distX = circle.position.x - closestX;
    const distY = circle.position.y - closestY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    if (distance < circle.radius) {
      let normal: Vec2Type;
      if (distance === 0) {
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

  resolveCircleVsRect(circle: CircleBody, rect: RectBody, collision: CollisionResult): void {
    if (!collision.collided || circle.isStatic || !collision.normal || collision.penetration === undefined) return;

    circle.position = Vec2.add(
      circle.position,
      Vec2.scale(collision.normal, collision.penetration)
    );

    circle.velocity = Vec2.scale(
      Vec2.reflect(circle.velocity, collision.normal),
      circle.restitution * rect.restitution
    );
  },

  circleInsideCircle(inner: CircleBody, outerX: number, outerY: number, outerRadius: number): boolean {
    const dist = Vec2.distance(inner.position, { x: outerX, y: outerY });
    return dist + inner.radius * 0.5 < outerRadius;
  },

  pointInCircle(px: number, py: number, cx: number, cy: number, radius: number): boolean {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
  },

  pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }
};

export class PhysicsWorld {
  gravity: Vec2Type;
  bodies: CircleBody[];
  rects: RectBody[];
  onCollision: ((event: PhysicsCollisionEvent) => void) | null;

  constructor(options: { gravity?: Vec2Type; onCollision?: (event: PhysicsCollisionEvent) => void } = {}) {
    this.gravity = options.gravity ?? { x: 0, y: 0 };
    this.bodies = [];
    this.rects = [];
    this.onCollision = options.onCollision ?? null;
  }

  addCircle(circle: CircleBody): CircleBody {
    this.bodies.push(circle);
    return circle;
  }

  addRect(rect: RectBody): RectBody {
    this.rects.push(rect);
    return rect;
  }

  update(dt: number): void {
    for (const body of this.bodies) {
      body.update(dt, this.gravity);
    }

    for (const body of this.bodies) {
      for (const rect of this.rects) {
        const collision = Collision.circleVsRect(body, rect);
        if (collision.collided) {
          if (this.onCollision) {
            this.onCollision({ circle: body, rect, collision });
          }
          Collision.resolveCircleVsRect(body, rect, collision);
        }
      }
    }

    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        if (Collision.circleVsCircle(this.bodies[i], this.bodies[j])) {
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

  clear(): void {
    this.bodies = [];
    this.rects = [];
  }
}

export default { Vec2, CircleBody, RectBody, Collision, PhysicsWorld };
