/**
 * Telemetry Module
 * Exports telemetry tracking utilities
 */

export { PointerTelemetryTracker } from './pointer-tracker';
export type { PointerTrackerConfig } from './pointer-tracker';

// Telemetry sinks
export { HookSink, CompositeSink } from './sink';
export type { TelemetrySink } from './sink';
export { LiveKitSink, POINTER_TOPIC, CONTROL_TOPIC } from './livekit-sink';
export type { LiveKitSinkConfig } from './livekit-sink';

// Session controller (for agent-driven session management)
export { SessionController, CONTROL_TOPIC as SESSION_CONTROL_TOPIC } from './session-controller';
export type { SessionControllerConfig, SessionEndResult } from './session-controller';
