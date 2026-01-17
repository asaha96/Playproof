/**
 * PlayProof SDK
 * 
 * Game-based human verification with behavior analysis.
 * 
 * @packageDocumentation
 */

// ============================================================================
// Core Exports
// ============================================================================

export { PlayProofClient } from './client';

// ============================================================================
// Types
// ============================================================================

export type {
  // Event types
  EventType,
  InputEvent,
  CoalescedPoint,
  
  // Batch types
  EventBatch,
  SignedBatch,
  
  // Challenge/Result types
  ChallengeResponse,
  AttemptResult,
  AttemptResultResponse,
  
  // Theme types
  PlayProofTheme,
  
  // Configuration types
  PlayProofConfig,
  PlayProofConfigRequired,
  
  // Callback types
  OnEventBatchCallback,
  OnAttemptEndCallback,
  OnRegenerateCallback,
  OnErrorCallback,
  OnProgressCallback,
  OnStartCallback,
  
  // Game types
  GameConfig,
  
  // Lifecycle types
  LifecycleState,
  SDKEventType,
  SDKEvent,
  
  // Logger types
  Logger,
  
  // Verification result
  VerificationResult,
  
  // Web component attributes
  PlayProofGameElementAttributes,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export {
  DEFAULT_THEME,
  DEFAULT_CONFIG,
  validateConfig,
  mergeConfig,
  createConsoleLogger,
  createSilentLogger,
  createDebugLogger,
  isBrowser,
  isNode,
  isWebWorker,
  getEnvironment,
  ensureBrowser,
} from './config';

// ============================================================================
// Errors
// ============================================================================

export {
  PlayProofError,
  NetworkError,
  ConfigurationError,
  TimeoutError,
  ValidationError,
  IntegrityError,
  StateError,
  CompatibilityError,
  ChallengeError,
  isPlayProofError,
  isRecoverableError,
  wrapError,
  networkErrorFromResponse,
} from './errors';

// ============================================================================
// Events
// ============================================================================

export {
  EventEmitter,
  globalEventBus,
  onEvent,
  onceEvent,
  emitEvent,
  onComplete,
  onError,
  onProgress,
  onStart,
  type EventPayloads,
  type EventListener,
  type Unsubscribe,
} from './events';

// ============================================================================
// Collector
// ============================================================================

export {
  RingBuffer,
  InputCollector,
  type RingBufferConfig,
  type InputCollectorConfig,
} from './collector';

// ============================================================================
// Transport
// ============================================================================

export {
  HashChain,
  AsyncHashChain,
  HttpTransport,
  GENESIS_HASH,
  type HttpTransportConfig,
} from './transport';

// ============================================================================
// Accessibility
// ============================================================================

export {
  ARIA_ROLES,
  ARIA_LABELS,
  announcer,
  announce,
  applyContainerA11y,
  applyGameA11y,
  applyButtonA11y,
  applyProgressA11y,
  getStateAnnouncement,
  FocusManager,
  createKeyboardHandler,
  isHighContrastMode,
  prefersReducedMotion,
  type KeyboardNavConfig,
} from './accessibility';

// ============================================================================
// Browser Compatibility
// ============================================================================

export {
  detectFeatures,
  getBrowserInfo,
  checkRequiredFeatures,
  getTimestamp,
  getDevicePixelRatio,
  isTouchDevice,
  isMobile,
  raf,
  cancelRaf,
  getSupportedEventTypes,
  type BrowserFeatures,
  type BrowserInfo,
} from './compat';

// ============================================================================
// Developer Tools
// ============================================================================

export {
  enableDebug,
  disableDebug,
  isDebugEnabled,
  debugLog,
  debugWarn,
  metrics,
  devWarning,
  clearWarnings,
  enableMockMode,
  disableMockMode,
  isMockMode,
  getMockConfig,
  eventInspector,
  batchInspector,
  EventInspector,
  BatchInspector,
  type PerformanceEntry,
  type MockConfig,
} from './devtools';

// ============================================================================
// Web Component
// ============================================================================

export {
  PlayProofGameElement,
  definePlayProofGameElement,
} from './web-component';
