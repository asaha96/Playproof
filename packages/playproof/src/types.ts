/**
 * PlayProof SDK Type Definitions
 */

// Available font families in the SDK
export const PLAYPROOF_FONTS = [
    'Inter',
    'Nunito Sans',
    'Poppins',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Source Sans 3',
    'Raleway',
    'Work Sans',
] as const;

export type PlayproofFontFamily = typeof PLAYPROOF_FONTS[number];

// Theme configuration
export interface PlayproofTheme {
    primary?: string;
    secondary?: string;
    background?: string;
    surface?: string;
    text?: string;
    textMuted?: string;
    accent?: string;
    success?: string;
    error?: string;
    border?: string;
    // Layout
    borderRadius?: number;
    spacing?: number;
    fontFamily?: PlayproofFontFamily;
}

// Behavior data collected during verification
export interface BehaviorData {
    mouseMovements: MouseMovement[];
    clickTimings: number[];
    trajectories: MouseMovement[][];
    hits: number;
    misses: number;
    clickAccuracy: number;
}

export interface MouseMovement {
    x: number;
    y: number;
    timestamp: number;
}

// Pointer telemetry event - captured for all games
export interface PointerTelemetryEvent {
    timestampMs: number;      // Absolute timestamp (Date.now())
    tMs: number;              // Relative time since tracking started (high-res)
    x: number;                // X position relative to game area
    y: number;                // Y position relative to game area
    clientX: number;          // Absolute X position
    clientY: number;          // Absolute Y position
    isDown: boolean;          // Whether pointer is pressed
    eventType: 'move' | 'down' | 'up' | 'enter' | 'leave';
    pointerType: string;      // 'mouse', 'touch', 'pen'
    pointerId: number;        // Unique pointer ID
    isTrusted: boolean;       // Whether event was user-generated
}

// Extended telemetry for future SDK
export interface ExtendedTelemetry {
    coalescedCount: number;
    untrustedCount: number;
    pointerTypes: Record<string, number>;
    dragPaths: DragPath[];
}

export interface DragPath {
    start: PointerCoords;
    end: PointerCoords;
    path: PointerCoords[];
    duration: number;
}

export interface PointerCoords {
    x: number;
    y: number;
    timestamp: number;
    isTrusted: boolean;
}

// Drag information
export interface DragInfo {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    dx: number;
    dy: number;
    duration: number;
    path: PointerCoords[];
}

export interface CompletedDrag {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    dx: number;
    dy: number;
    duration: number;
    path: PointerCoords[];
}

// Verification result
export interface VerificationResult {
    passed: boolean;
    score: number;
    threshold: number;
    timestamp: number;
    details: {
        mouseMovementCount: number;
        clickCount: number;
        accuracy: number;
    };
}

// SDK Configuration
export interface PlayproofConfig {
    containerId: string;
    theme: PlayproofTheme;
    confidenceThreshold: number;
    gameDuration: number | null;
    gameId: GameId;
    logTelemetry: boolean;    // Whether to console.log telemetry events (default: false)
    onSuccess: ((result: VerificationResult) => void) | null;
    onFailure: ((result: VerificationResult) => void) | null;
    onStart: (() => void) | null;
    onProgress: ((progress: number) => void) | null;
    hooks: SDKHooks;
}

export interface SDKHooks {
    onTelemetryBatch: ((batch: PointerTelemetryEvent[]) => void) | null;
    onAttemptEnd: ((attempt: AttemptData) => void) | null;
    regenerate: (() => void) | null;
}

export interface AttemptData {
    game: string;
    success: boolean;
    reason: string;
    duration: number;
    timestamp: number;
    [key: string]: unknown;
}

// Game types
export type GameId = 'bubble-pop' | 'archery' | 'random';

export interface GameInfo {
    GameClass: new (gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks) => BaseGame;
    name: string;
    description: string;
    duration: number;
    isThree: boolean;
}

export interface BaseGame {
    start(onComplete: (behaviorData: BehaviorData) => void): void;
    destroy(): void;
    init?(): Promise<void>;
}

export interface GameResult {
    success: boolean;
    reason: string;
}

// Physics types
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

// Level specifications
export interface MiniGolfLevelSpec {
    version: number;
    world: { width: number; height: number; friction: number };
    ball: { x: number; y: number; radius: number };
    hole: { x: number; y: number; radius: number };
    walls: { x: number; y: number; w: number; h: number }[];
}

export interface BasketballLevelSpec {
    version: number;
    world: { width: number; height: number; gravity: number };
    ball: { x: number; y: number; radius: number };
    hoop: {
        x: number;
        y: number;
        rimWidth: number;
        rimThickness: number;
        backboardHeight: number;
        backboardWidth: number;
    };
    shootZone: { x: number; y: number; w: number; h: number };
}

export interface ArcheryLevelSpec {
    version: number;
    world: { width: number; height: number };
    bow: { x: number; y: number };
    target: {
        x: number;
        y: number;
        outerRadius: number;
        bullseyeRadius: number;
        rings: number;
    };
    arrow: { speed: number; length: number };
    passThreshold: number;
}

// Shot data types
export interface ShotData {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    power: number;
    timestamp: number;
    angle?: number;
}

export interface ArcheryShotData {
    drawDuration: number;
    drawPower: number;
    aimAngle: number;
    aimX: number;
    aimY: number;
    timestamp: number;
}

export interface ArrowHit {
    x: number;
    y: number;
    distance: number;
}

// Arrow state
export interface ArrowState {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    length: number;
    speed: number;
}

// Hoop sensor for basketball
export interface HoopSensor {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Shoot zone
export interface ShootZone {
    x: number;
    y: number;
    w: number;
    h: number;
}
