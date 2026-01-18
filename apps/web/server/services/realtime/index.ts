/**
 * Real-time AI Agent Module
 * ==========================
 * Exports all components for real-time bot detection.
 */

export { agentConfig, type AgentConfig } from "./config";
export {
  WindowedScorer,
  scoreWindow,
  extractWindowEvents,
  type WindowScore,
  type PointerTelemetryEvent,
} from "./windowed-scorer";
export {
  TelemetryProcessor,
  type SessionState,
} from "./telemetry-processor";
export {
  AgentScheduler,
  calculateSummary,
  heuristicDecision,
  type AgentDecision,
  type AgentInput,
  type AgentToolResult,
  type ScoreSummary,
  type SessionEndMessage,
} from "./agent-scheduler";
