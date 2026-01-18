/**
 * Telemetry Module
 * Exports telemetry tracking utilities
 */

export { PointerTelemetryTracker } from './pointer-tracker';
export type { PointerTrackerConfig } from './pointer-tracker';

// Telemetry sinks
export { HookSink, CompositeSink } from './sink';
export type { TelemetrySink } from './sink';
export { LiveKitSink, POINTER_TOPIC } from './livekit-sink';
export type { LiveKitSinkConfig } from './livekit-sink';
