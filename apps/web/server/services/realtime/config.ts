/**
 * Real-time AI Agent Configuration
 * =================================
 * Configuration for the windowed scoring and agent decision system.
 */

export const agentConfig = {
  // Window configuration
  windowDurationMs: parseInt(process.env.AGENT_WINDOW_DURATION_MS ?? "500", 10),
  windowOverlapMs: parseInt(process.env.AGENT_WINDOW_OVERLAP_MS ?? "100", 10),
  minEventsPerWindow: parseInt(process.env.AGENT_MIN_EVENTS_PER_WINDOW ?? "5", 10),

  // Agent invocation configuration
  agentInvokeIntervalMs: parseInt(process.env.AGENT_INVOKE_INTERVAL_MS ?? "3000", 10),
  minWindowsForDecision: parseInt(process.env.AGENT_MIN_WINDOWS ?? "4", 10),
  maxSessionMs: parseInt(process.env.AGENT_MAX_SESSION_MS ?? "30000", 10),

  // Scoring thresholds (same as main scoring service)
  thresholdPass: parseFloat(process.env.AGENT_THRESHOLD_PASS ?? "1.0"),
  thresholdReview: parseFloat(process.env.AGENT_THRESHOLD_REVIEW ?? "2.0"),

  // LLM configuration (Azure OpenAI)
  llm: {
    apiKey: process.env.AZURE_OPENAI_API_KEY ?? "",
    endpoint: process.env.AZURE_OPENAI_ENDPOINT ?? "",
    deploymentName: process.env.AZURE_OPENAI_MODEL ?? "gpt-4o",
    apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-08-01-preview",
  },

  // Retry configuration
  llmRetryAttempts: parseInt(process.env.AGENT_LLM_RETRY_ATTEMPTS ?? "3", 10),
  llmRetryDelayMs: parseInt(process.env.AGENT_LLM_RETRY_DELAY_MS ?? "1000", 10),

  // Control topic for session end messages
  controlTopic: "playproof.control.v1",

  // Reconnection grace period
  reconnectionGraceMs: parseInt(process.env.AGENT_RECONNECTION_GRACE_MS ?? "5000", 10),
} as const;

export type AgentConfig = typeof agentConfig;
