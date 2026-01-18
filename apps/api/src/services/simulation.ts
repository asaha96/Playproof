/**
 * Simulation Service
 * Brute-force sampling to verify level solvability
 */

import type { GridLevel, GridLevelSimulationReport } from '@playproof/shared';
import {
  compileMiniGolfGridLevel,
  CircleBody,
  RectBody,
  Collision,
  Vec2,
  type MiniGolfLevelSpec
} from '@playproof/shared';

interface SimulationConfig {
  maxSteps: number;
  angleSteps: number;
  powerSteps: number;
  dt: number;
  stoppedThreshold: number;
  stoppedFrames: number;
}

const DEFAULT_CONFIG: SimulationConfig = {
  maxSteps: 600,        // 10 seconds at 60fps
  angleSteps: 36,       // 10-degree increments
  powerSteps: 10,       // Power from 0.1 to 1.0
  dt: 1 / 60,
  stoppedThreshold: 0.5,
  stoppedFrames: 30
};

interface ShotResult {
  angleRad: number;
  power: number;
  steps: number;
  distanceToHole: number;
  holed: boolean;
}

/**
 * Simulate a single shot with given angle and power
 */
function simulateShot(
  spec: MiniGolfLevelSpec,
  angleRad: number,
  power: number,
  config: SimulationConfig
): ShotResult {
  const ball = new CircleBody(spec.ball.x, spec.ball.y, spec.ball.radius, {
    friction: spec.world.friction,
    restitution: 0.8
  });

  // Build walls
  const walls: RectBody[] = spec.walls.map(
    w => new RectBody(w.x, w.y, w.w, w.h, { restitution: 0.9 })
  );

  // Add border walls (8px thick)
  const borderThickness = 8;
  walls.push(new RectBody(0, 0, spec.world.width, borderThickness)); // top
  walls.push(new RectBody(0, spec.world.height - borderThickness, spec.world.width, borderThickness)); // bottom
  walls.push(new RectBody(0, 0, borderThickness, spec.world.height)); // left
  walls.push(new RectBody(spec.world.width - borderThickness, 0, borderThickness, spec.world.height)); // right

  // Apply initial impulse
  const maxImpulse = 15;
  const impulseStrength = power * maxImpulse;
  const impulse = {
    x: Math.cos(angleRad) * impulseStrength,
    y: Math.sin(angleRad) * impulseStrength
  };
  ball.applyImpulse(impulse);

  let stoppedCount = 0;
  let steps = 0;

  for (steps = 0; steps < config.maxSteps; steps++) {
    // Update ball position
    ball.velocity = Vec2.scale(ball.velocity, ball.friction);
    ball.position = Vec2.add(ball.position, Vec2.scale(ball.velocity, config.dt));

    // Apply sand friction
    if (spec.sand) {
      for (const sand of spec.sand) {
        if (Collision.pointInRect(ball.position.x, ball.position.y, sand.x, sand.y, sand.w, sand.h)) {
          ball.velocity = Vec2.scale(ball.velocity, 0.95);
        }
      }
    }

    // Apply currents
    if (spec.currents) {
      for (const current of spec.currents) {
        if (Collision.pointInRect(ball.position.x, ball.position.y, current.x, current.y, current.w, current.h)) {
          const driftForce = 0.05;
          switch (current.direction) {
            case 'up': ball.velocity.y -= driftForce; break;
            case 'down': ball.velocity.y += driftForce; break;
            case 'left': ball.velocity.x -= driftForce; break;
            case 'right': ball.velocity.x += driftForce; break;
          }
        }
      }
    }

    // Check water hazard (instant fail for this shot)
    if (spec.water) {
      for (const water of spec.water) {
        if (Collision.pointInRect(ball.position.x, ball.position.y, water.x, water.y, water.w, water.h)) {
          return {
            angleRad,
            power,
            steps,
            distanceToHole: Infinity,
            holed: false
          };
        }
      }
    }

    // Check wall collisions
    for (const wall of walls) {
      const collision = Collision.circleVsRect(ball, wall);
      if (collision.collided) {
        Collision.resolveCircleVsRect(ball, wall, collision);
      }
    }

    // Check if ball is in hole
    const distToHole = Vec2.distance(ball.position, { x: spec.hole.x, y: spec.hole.y });
    if (distToHole < spec.hole.radius - ball.radius * 0.5) {
      return {
        angleRad,
        power,
        steps,
        distanceToHole: 0,
        holed: true
      };
    }

    // Check if stopped
    if (ball.isStopped(config.stoppedThreshold)) {
      stoppedCount++;
      if (stoppedCount >= config.stoppedFrames) {
        break;
      }
    } else {
      stoppedCount = 0;
    }
  }

  const distanceToHole = Vec2.distance(ball.position, { x: spec.hole.x, y: spec.hole.y });
  return {
    angleRad,
    power,
    steps,
    distanceToHole,
    holed: false
  };
}

/**
 * Simulate a level with brute-force angle/power sampling
 * Returns the best shot found and whether the level is solvable
 */
export function simulateMiniGolfLevel(
  level: GridLevel,
  configOverrides?: Partial<SimulationConfig>
): GridLevelSimulationReport {
  const config = { ...DEFAULT_CONFIG, ...configOverrides };
  
  let spec: MiniGolfLevelSpec;
  try {
    spec = compileMiniGolfGridLevel(level);
  } catch {
    return {
      passed: false,
      attempts: 0,
      note: 'Failed to compile level'
    };
  }

  let bestShot: ShotResult | null = null;
  let attempts = 0;

  // Sample angles from 0 to 2*PI
  for (let ai = 0; ai < config.angleSteps; ai++) {
    const angleRad = (ai / config.angleSteps) * Math.PI * 2;

    // Sample power from 0.1 to 1.0
    for (let pi = 1; pi <= config.powerSteps; pi++) {
      const power = pi / config.powerSteps;
      attempts++;

      const result = simulateShot(spec, angleRad, power, config);

      // Track best shot
      if (!bestShot || result.distanceToHole < bestShot.distanceToHole) {
        bestShot = result;
      }

      // Early exit if we found a solution
      if (result.holed) {
        return {
          passed: true,
          attempts,
          bestShot: {
            angleRad: result.angleRad,
            power: result.power,
            steps: result.steps,
            distanceToHole: result.distanceToHole,
            holed: true
          }
        };
      }
    }
  }

  // No solution found, return best attempt
  return {
    passed: false,
    attempts,
    note: `No solution found. Best shot got within ${bestShot?.distanceToHole.toFixed(1)}px of hole.`,
    bestShot: bestShot ? {
      angleRad: bestShot.angleRad,
      power: bestShot.power,
      steps: bestShot.steps,
      distanceToHole: bestShot.distanceToHole,
      holed: false
    } : undefined
  };
}

/**
 * Quick solvability check with reduced sampling
 * For use during LLM retry loop
 */
export function quickSolvabilityCheck(level: GridLevel): boolean {
  const result = simulateMiniGolfLevel(level, {
    angleSteps: 18,  // 20-degree increments
    powerSteps: 5,   // Fewer power levels
    maxSteps: 300    // Shorter simulation
  });
  return result.passed;
}
