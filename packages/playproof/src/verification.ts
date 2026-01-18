/**
 * PlayProof Verification Module
 * Handles behavior analysis and confidence scoring
 */

import type { BehaviorData, MouseMovement, VerificationResult } from './types';

interface ScoreComponent {
  weight: number;
  score: number;
}

/**
 * Calculates confidence score from behavior data
 */
export function calculateConfidence(behaviorData: BehaviorData): number {
  const scores: ScoreComponent[] = [];

  // Mouse movement analysis (natural movements vs. linear bot movements)
  if (behaviorData.mouseMovements && behaviorData.mouseMovements.length > 0) {
    const movementScore = analyzeMouseMovements(behaviorData.mouseMovements);
    scores.push({ weight: 0.3, score: movementScore });
  }

  // Click timing analysis (human reaction times vs. bot precision)
  if (behaviorData.clickTimings && behaviorData.clickTimings.length > 0) {
    const timingScore = analyzeClickTimings(behaviorData.clickTimings);
    scores.push({ weight: 0.3, score: timingScore });
  }

  // Click accuracy analysis - only include if there were actual clicks
  // If clickAccuracy is 0, it means no clicks happened, so don't include it
  const totalClicks = (behaviorData.hits || 0) + (behaviorData.misses || 0);
  if (behaviorData.clickAccuracy !== undefined && totalClicks > 0) {
    const accuracyScore = analyzeClickAccuracy(behaviorData.clickAccuracy);
    scores.push({ weight: 0.2, score: accuracyScore });
  }

  // Trajectory smoothness (bezier-like human movements)
  if (behaviorData.trajectories && behaviorData.trajectories.length > 0) {
    const trajectoryScore = analyzeTrajectories(behaviorData.trajectories);
    scores.push({ weight: 0.2, score: trajectoryScore });
  }

  // Weighted average
  if (scores.length === 0) {
    // No data collected - return neutral score
    return 0.5;
  }

  // Require at least some mouse movement data for a valid score
  // If we only have one component, the score might not be reliable
  if (scores.length === 1 && scores[0].weight < 0.3) {
    // Only have accuracy or trajectory, which alone isn't enough
    return 0.5;
  }

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + (s.weight * s.score), 0);

  // Debug logging (can be removed in production)
  if (typeof window !== 'undefined' && (window as any).__PLAYPROOF_DEBUG__) {
    console.log('[PlayProof Verification]', {
      movementCount: behaviorData.mouseMovements?.length || 0,
      clickCount: behaviorData.clickTimings?.length || 0,
      hits: behaviorData.hits || 0,
      misses: behaviorData.misses || 0,
      clickAccuracy: behaviorData.clickAccuracy,
      trajectoryCount: behaviorData.trajectories?.length || 0,
      scores: scores.map(s => ({ component: getComponentName(s.weight), weight: s.weight, score: s.score.toFixed(3) })),
      totalWeight: totalWeight.toFixed(2),
      finalScore: (weightedSum / totalWeight).toFixed(3),
    });
  }

  return weightedSum / totalWeight;
}

/**
 * Helper to identify component type for debugging
 */
function getComponentName(weight: number): string {
  if (weight === 0.3) return 'movement/timing';
  if (weight === 0.2) return 'accuracy/trajectory';
  return 'unknown';
}

/**
 * Analyzes mouse movement patterns
 * Humans have curved, slightly jittery movements; bots are linear
 */
function analyzeMouseMovements(movements: MouseMovement[]): number {
  if (movements.length < 3) {
    // Not enough data - return neutral score
    return 0.5;
  }

  let totalVariance = 0;
  let totalSpeed = 0;
  let validSpeedCount = 0;
  let validVarianceCount = 0;

  for (let i = 1; i < movements.length; i++) {
    const dx = movements[i].x - movements[i - 1].x;
    const dy = movements[i].y - movements[i - 1].y;
    const dt = movements[i].timestamp - movements[i - 1].timestamp;

    // Only process if there's a meaningful time difference (at least 1ms)
    if (dt > 0) {
      const speed = Math.sqrt(dx * dx + dy * dy) / dt;
      totalSpeed += speed;
      validSpeedCount++;

      // Check for direction changes (humans change direction more)
      if (i > 1) {
        const prevDx = movements[i - 1].x - movements[i - 2].x;
        const prevDy = movements[i - 1].y - movements[i - 2].y;
        const prevDt = movements[i - 1].timestamp - movements[i - 2].timestamp;
        
        // Only calculate angle change if previous movement had valid timing
        if (prevDt > 0) {
          const angleChange = Math.abs(Math.atan2(dy, dx) - Math.atan2(prevDy, prevDx));
          // Normalize angle to [0, PI] range
          const normalizedAngle = Math.min(angleChange, Math.PI * 2 - angleChange);
          totalVariance += normalizedAngle;
          validVarianceCount++;
        }
      }
    }
  }

  // Calculate averages only if we have valid data
  if (validSpeedCount === 0 || validVarianceCount === 0) {
    return 0.5; // Not enough valid data
  }

  const avgVariance = totalVariance / validVarianceCount;
  const avgSpeed = totalSpeed / validSpeedCount;

  // Humans typically have variance between 0.1 and 1.5 radians
  // and reasonable speeds
  const varianceScore = Math.min(1, Math.max(0, avgVariance / 0.5));
  const speedScore = avgSpeed > 0.01 && avgSpeed < 5 ? 0.8 : 0.3;

  return (varianceScore * 0.6 + speedScore * 0.4);
}

/**
 * Analyzes click timing patterns
 * Humans have variable reaction times; bots are too consistent
 */
function analyzeClickTimings(timings: number[]): number {
  if (timings.length < 2) {
    // Not enough clicks for timing analysis
    return 0.5;
  }

  const intervals: number[] = [];
  for (let i = 1; i < timings.length; i++) {
    const interval = timings[i] - timings[i - 1];
    // Only include positive intervals
    if (interval > 0) {
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) {
    return 0.5; // No valid intervals
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation - humans typically have 20-80% variation
  const cv = mean > 0 ? stdDev / mean : 0;

  // Too consistent (bot-like) or too erratic scores lower
  if (cv < 0.1) return 0.2; // Too consistent - likely bot
  if (cv > 1.5) return 0.4; // Too erratic - might be random
  if (cv >= 0.2 && cv <= 0.8) return 0.9; // Human-like variation

  return 0.6;
}

/**
 * Analyzes click accuracy
 * Humans miss sometimes; perfect accuracy is suspicious
 */
function analyzeClickAccuracy(accuracy: number): number {
  // Perfect accuracy (1.0) is suspicious
  if (accuracy >= 0.98) return 0.5;
  // Very low accuracy might be random clicking
  if (accuracy < 0.3) return 0.3;
  // Human-like accuracy (60-95%)
  if (accuracy >= 0.6 && accuracy <= 0.95) return 0.9;

  return 0.6;
}

/**
 * Analyzes movement trajectories
 * Humans have smooth curves; bots have straight lines
 */
function analyzeTrajectories(trajectories: MouseMovement[][]): number {
  if (trajectories.length < 1) return 0.5;

  let curvatureScore = 0;
  let validTrajectoryCount = 0;

  for (const trajectory of trajectories) {
    if (trajectory.length < 3) continue;

    let totalCurvature = 0;
    let validPoints = 0;
    
    for (let i = 1; i < trajectory.length - 1; i++) {
      // Calculate curvature at each point
      const v1 = {
        x: trajectory[i].x - trajectory[i - 1].x,
        y: trajectory[i].y - trajectory[i - 1].y
      };
      const v2 = {
        x: trajectory[i + 1].x - trajectory[i].x,
        y: trajectory[i + 1].y - trajectory[i].y
      };

      // Check if vectors have meaningful magnitude
      const v1Mag = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const v2Mag = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      
      if (v1Mag > 0.1 && v2Mag > 0.1) {
        const cross = v1.x * v2.y - v1.y * v2.x;
        const dot = v1.x * v2.x + v1.y * v2.y;
        const angle = Math.abs(Math.atan2(cross, dot));
        // Normalize angle to [0, PI] range
        const normalizedAngle = Math.min(angle, Math.PI * 2 - angle);
        totalCurvature += normalizedAngle;
        validPoints++;
      }
    }

    if (validPoints === 0) continue;

    const avgCurvature = totalCurvature / validPoints;
    // Natural human movements have some curvature
    if (avgCurvature > 0.05 && avgCurvature < 0.5) {
      curvatureScore += 1;
    } else if (avgCurvature < 0.02) {
      // Too straight - likely bot
      curvatureScore += 0.2;
    } else {
      curvatureScore += 0.5;
    }
    validTrajectoryCount++;
  }

  if (validTrajectoryCount === 0) return 0.5;

  return curvatureScore / validTrajectoryCount;
}

/**
 * Checks if score meets threshold
 */
export function meetsThreshold(score: number, threshold: number): boolean {
  return score >= threshold;
}

/**
 * Creates verification result object
 */
export function createVerificationResult(
  score: number,
  threshold: number,
  behaviorData: BehaviorData
): VerificationResult {
  const passed = meetsThreshold(score, threshold);

  return {
    passed,
    score,
    threshold,
    timestamp: Date.now(),
    details: {
      mouseMovementCount: behaviorData.mouseMovements?.length || 0,
      clickCount: behaviorData.clickTimings?.length || 0,
      accuracy: behaviorData.clickAccuracy || 0
    }
  };
}
