/**
 * Framework Integrations
 * @packageDocumentation
 */

// Re-export React integration
export {
  usePlayproof,
  PlayProofGame,
  type UsePlayproofConfig,
  type UsePlayproofReturn,
  type PlayProofGameProps,
} from './react';

// Re-export Vue integration
export {
  createUsePlayproof,
  type UsePlayproofVueConfig,
  type UsePlayproofVueReturn,
} from './vue';
