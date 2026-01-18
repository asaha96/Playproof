/**
 * PlayProof SDK Type Definitions
 */

import type {
    BehaviorData,
    MovementPoint,
    PlayproofTheme,
    TelemetryBatch,
    TelemetryRow,
    MiniGolfLevelSpec
} from '@playproof/shared';

export type { BehaviorData, MovementPoint, PlayproofTheme, TelemetryBatch, TelemetryRow, MiniGolfLevelSpec };

export type MouseMovement = MovementPoint;

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
    onSuccess: ((result: VerificationResult) => void) | null;
    onFailure: ((result: VerificationResult) => void) | null;
    onStart: (() => void) | null;
    onProgress: ((progress: number) => void) | null;
    hooks: SDKHooks;
}

export interface SDKHooks {
    onTelemetryBatch: ((batch: TelemetryBatch) => void) | null;
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


// Level specifications

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
