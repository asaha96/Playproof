/**
 * PlayProof SDK Testing Utilities
 * 
 * Test helpers, mocks, and fixtures for unit/integration tests.
 * 
 * @packageDocumentation
 */

import type {
  InputEvent,
  SignedBatch,
  EventBatch,
  ChallengeResponse,
  AttemptResultResponse,
  VerificationResult,
  PlayProofConfig,
} from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock input event
 */
export function createMockInputEvent(
  overrides: Partial<InputEvent> = {}
): InputEvent {
  return {
    type: 'pointermove',
    timestamp: performance.now(),
    x: Math.random() * 400,
    y: Math.random() * 300,
    ...overrides,
  };
}

/**
 * Create multiple mock input events
 */
export function createMockInputEvents(
  count: number,
  options: { startTime?: number; interval?: number } = {}
): InputEvent[] {
  const { startTime = performance.now(), interval = 16 } = options;
  const events: InputEvent[] = [];

  for (let i = 0; i < count; i++) {
    events.push(
      createMockInputEvent({
        timestamp: startTime + i * interval,
        x: Math.sin(i * 0.1) * 100 + 200,
        y: Math.cos(i * 0.1) * 100 + 150,
      })
    );
  }

  return events;
}

/**
 * Create a mock event batch
 */
export function createMockEventBatch(
  overrides: Partial<EventBatch> = {}
): EventBatch {
  const events = createMockInputEvents(10);
  return {
    attemptId: `test-${Date.now()}`,
    batchIndex: 0,
    events,
    startTime: events[0].timestamp,
    endTime: events[events.length - 1].timestamp,
    ...overrides,
  };
}

/**
 * Create a mock signed batch
 */
export function createMockSignedBatch(
  overrides: Partial<SignedBatch> = {}
): SignedBatch {
  const batch = createMockEventBatch(overrides.batch);
  return {
    batch,
    hash: 'mock-hash-' + Math.random().toString(36).slice(2),
    prevHash: '0'.repeat(64),
    ...overrides,
  };
}

/**
 * Create a mock challenge response
 */
export function createMockChallengeResponse(
  overrides: Partial<ChallengeResponse> = {}
): ChallengeResponse {
  return {
    attemptId: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    challengeToken: 'mock-token-' + Math.random().toString(36).slice(2),
    seed: Math.floor(Math.random() * 1000000),
    rulesetId: 'default',
    ttl: 300,
    ingestUrl: '/v1/batches',
    ...overrides,
  };
}

/**
 * Create a mock attempt result
 */
export function createMockAttemptResult(
  overrides: Partial<AttemptResultResponse> = {}
): AttemptResultResponse {
  const score = overrides.score ?? 0.5 + Math.random() * 0.5;
  return {
    attemptId: `test-${Date.now()}`,
    result: score >= 0.7 ? 'pass' : 'fail',
    score,
    reason: score >= 0.7 ? 'Verification passed' : 'Score below threshold',
    ...overrides,
  };
}

/**
 * Create a mock verification result
 */
export function createMockVerificationResult(
  overrides: Partial<VerificationResult> = {}
): VerificationResult {
  const score = overrides.score ?? 0.85;
  return {
    passed: score >= 0.7,
    score,
    threshold: 0.7,
    timestamp: Date.now(),
    details: {
      mouseMovementCount: 150,
      clickCount: 8,
      accuracy: score,
    },
    ...overrides,
  };
}

/**
 * Create a mock SDK config
 */
export function createMockConfig(
  overrides: Partial<PlayProofConfig> = {}
): PlayProofConfig {
  return {
    apiUrl: 'http://localhost:3000',
    gameDuration: 3000,
    confidenceThreshold: 0.7,
    debug: false,
    ...overrides,
  };
}

// ============================================================================
// Mock Classes
// ============================================================================

/**
 * Mock canvas for testing
 */
export class MockCanvas {
  width: number;
  height: number;
  private context: MockContext2D;

  constructor(width = 400, height = 300) {
    this.width = width;
    this.height = height;
    this.context = new MockContext2D();
  }

  getContext(type: string): MockContext2D | null {
    if (type === '2d') {
      return this.context;
    }
    return null;
  }

  getBoundingClientRect(): DOMRect {
    return {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      top: 0,
      right: this.width,
      bottom: this.height,
      left: 0,
      toJSON: () => ({}),
    };
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  setAttribute(): void {}
}

/**
 * Mock 2D context for testing
 */
export class MockContext2D {
  fillStyle = '#000';
  strokeStyle = '#000';
  lineWidth = 1;
  font = '16px sans-serif';

  fillRect(): void {}
  strokeRect(): void {}
  clearRect(): void {}
  fillText(): void {}
  strokeText(): void {}
  beginPath(): void {}
  closePath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  arc(): void {}
  fill(): void {}
  stroke(): void {}
  save(): void {}
  restore(): void {}
  translate(): void {}
  rotate(): void {}
  scale(): void {}
}

/**
 * Mock HTTP transport for testing
 */
export class MockHttpTransport {
  private responses: {
    challenge?: ChallengeResponse;
    result?: AttemptResultResponse;
    error?: Error;
  } = {};

  setChallenge(response: ChallengeResponse): void {
    this.responses.challenge = response;
  }

  setResult(response: AttemptResultResponse): void {
    this.responses.result = response;
  }

  setError(error: Error): void {
    this.responses.error = error;
  }

  async createChallenge(): Promise<ChallengeResponse> {
    if (this.responses.error) {
      throw this.responses.error;
    }
    return this.responses.challenge ?? createMockChallengeResponse();
  }

  async sendBatch(): Promise<void> {
    if (this.responses.error) {
      throw this.responses.error;
    }
  }

  async getResult(): Promise<AttemptResultResponse> {
    if (this.responses.error) {
      throw this.responses.error;
    }
    return this.responses.result ?? createMockAttemptResult();
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timeout exceeded');
    }
    await sleep(interval);
  }
}

/**
 * Wait for a specific amount of time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulate a mouse move path
 */
export function simulateMousePath(
  points: Array<{ x: number; y: number }>,
  options: { startTime?: number; duration?: number } = {}
): InputEvent[] {
  const { startTime = performance.now(), duration = 1000 } = options;
  const events: InputEvent[] = [];
  const interval = duration / (points.length - 1);

  for (let i = 0; i < points.length; i++) {
    events.push({
      type: 'pointermove',
      timestamp: startTime + i * interval,
      x: points[i].x,
      y: points[i].y,
    });
  }

  return events;
}

/**
 * Simulate a click event
 */
export function simulateClick(
  x: number,
  y: number,
  timestamp = performance.now()
): InputEvent[] {
  return [
    { type: 'pointerdown', timestamp, x, y, button: 0 },
    { type: 'pointerup', timestamp: timestamp + 50, x, y, button: 0 },
  ];
}

/**
 * Create a circular mouse movement path
 */
export function createCircularPath(
  centerX: number,
  centerY: number,
  radius: number,
  points: number
): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    path.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }

  return path;
}

/**
 * Create a random mouse movement path
 */
export function createRandomPath(
  width: number,
  height: number,
  points: number
): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  let x = Math.random() * width;
  let y = Math.random() * height;

  for (let i = 0; i < points; i++) {
    // Random walk with momentum
    x += (Math.random() - 0.5) * 50;
    y += (Math.random() - 0.5) * 50;

    // Keep in bounds
    x = Math.max(0, Math.min(width, x));
    y = Math.max(0, Math.min(height, y));

    path.push({ x, y });
  }

  return path;
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a batch is valid
 */
export function assertValidBatch(batch: EventBatch): void {
  if (!batch.attemptId) {
    throw new Error('Batch missing attemptId');
  }
  if (typeof batch.batchIndex !== 'number') {
    throw new Error('Batch missing batchIndex');
  }
  if (!Array.isArray(batch.events)) {
    throw new Error('Batch events must be an array');
  }
  if (batch.events.length === 0) {
    throw new Error('Batch must have at least one event');
  }
  if (typeof batch.startTime !== 'number') {
    throw new Error('Batch missing startTime');
  }
  if (typeof batch.endTime !== 'number') {
    throw new Error('Batch missing endTime');
  }
}

/**
 * Assert that a signed batch has valid hash chain
 */
export function assertValidSignedBatch(signedBatch: SignedBatch): void {
  assertValidBatch(signedBatch.batch);

  if (!signedBatch.hash) {
    throw new Error('SignedBatch missing hash');
  }
  if (!signedBatch.prevHash) {
    throw new Error('SignedBatch missing prevHash');
  }
}

/**
 * Assert that an input event is valid
 */
export function assertValidInputEvent(event: InputEvent): void {
  const validTypes = ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown', 'keyup'];
  
  if (!validTypes.includes(event.type)) {
    throw new Error(`Invalid event type: ${event.type}`);
  }
  if (typeof event.timestamp !== 'number') {
    throw new Error('Event missing timestamp');
  }
}
