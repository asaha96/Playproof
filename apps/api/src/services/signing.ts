/**
 * Level Signing Service
 * HMAC signature for level integrity
 */

import { createHmac } from 'node:crypto';
import type { GridLevel } from '@playproof/shared';

function getSecret(): string {
  const secret = process.env.LEVEL_SIGNING_SECRET;
  if (!secret) {
    throw new Error('LEVEL_SIGNING_SECRET environment variable not set');
  }
  return secret;
}

/**
 * Create HMAC signature for a GridLevel
 */
export function signLevel(level: GridLevel): string {
  const secret = getSecret();
  const payload = JSON.stringify({
    schema: level.schema,
    gameId: level.gameId,
    version: level.version,
    seed: level.seed,
    grid: level.grid,
    entities: level.entities
  });
  
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Verify HMAC signature for a GridLevel
 */
export function verifyLevel(level: GridLevel, signature: string): boolean {
  try {
    const expected = signLevel(level);
    // Constant-time comparison to prevent timing attacks
    if (expected.length !== signature.length) {
      return false;
    }
    let result = 0;
    for (let i = 0; i < expected.length; i++) {
      result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}
