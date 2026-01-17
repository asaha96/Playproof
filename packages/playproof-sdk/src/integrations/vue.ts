/**
 * PlayProof Vue 3 Integration
 * 
 * Vue 3 Composition API hook for easy integration.
 * 
 * @packageDocumentation
 */

import type {
  PlayProofConfig,
  VerificationResult,
  LifecycleState,
} from '../types';
import { PlayProofClient } from '../client';

// Note: We use a minimal type-only approach to avoid requiring Vue as a dependency
// Users should have Vue 3 installed in their project

/**
 * Vue 3 ref type (minimal definition)
 */
interface Ref<T> {
  value: T;
}

/**
 * Vue 3 template ref type
 */
type TemplateRef<T> = Ref<T | null>;

/**
 * Hook configuration
 */
export interface UsePlayproofVueConfig extends Omit<PlayProofConfig, 'apiUrl'> {
  /** API URL (optional if using default) */
  apiUrl?: string;
  /** Auto-start on mount */
  autoStart?: boolean;
}

/**
 * Hook return value
 */
export interface UsePlayproofVueReturn {
  /** Canvas template ref */
  canvasRef: TemplateRef<HTMLCanvasElement>;
  /** Current lifecycle state */
  state: Ref<LifecycleState>;
  /** Current progress (0-1) */
  progress: Ref<number>;
  /** Time remaining in ms */
  timeRemaining: Ref<number>;
  /** Verification result (when complete) */
  result: Ref<VerificationResult | null>;
  /** Current error (if any) */
  error: Ref<Error | null>;
  /** Start verification */
  start: () => Promise<void>;
  /** Stop/cancel verification */
  stop: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Whether currently processing */
  isProcessing: Ref<boolean>;
  /** Whether verification passed */
  isPassed: Ref<boolean | null>;
  /** Initialize with canvas element */
  init: (canvas: HTMLCanvasElement) => Promise<void>;
}

/**
 * Create a usePlayproof composable for Vue 3
 * 
 * This factory function creates the composable using the Vue 3 Composition API.
 * Pass in the Vue composition functions to avoid bundling Vue.
 * 
 * @example
 * ```ts
 * // In your Vue project
 * import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
 * import { createUsePlayproof } from 'playproof-sdk/vue';
 * 
 * const usePlayproof = createUsePlayproof({ ref, computed, onMounted, onUnmounted, watch });
 * 
 * // In your component
 * const { canvasRef, state, start, result } = usePlayproof({
 *   apiUrl: 'https://api.playproof.dev'
 * });
 * ```
 */
export function createUsePlayproof(vue: {
  ref: <T>(value: T) => Ref<T>;
  computed: <T>(fn: () => T) => Ref<T>;
  onMounted: (fn: () => void) => void;
  onUnmounted: (fn: () => void) => void;
  watch: (source: Ref<unknown>, cb: (value: unknown) => void) => void;
}) {
  const { ref, computed, onMounted, onUnmounted, watch } = vue;

  return function usePlayproof(config: UsePlayproofVueConfig): UsePlayproofVueReturn {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const clientRef = ref<PlayProofClient | null>(null);

    const state = ref<LifecycleState>('idle');
    const progress = ref(0);
    const timeRemaining = ref(config.gameDuration ?? 3000);
    const result = ref<VerificationResult | null>(null);
    const error = ref<Error | null>(null);

    const isProcessing = computed(() => 
      state.value === 'processing' || state.value === 'initializing'
    );
    
    const isPassed = computed(() => 
      result.value ? result.value.passed : null
    );

    const init = async (canvas: HTMLCanvasElement) => {
      const apiUrl = config.apiUrl ?? 'http://localhost:3000';

      const client = new PlayProofClient({
        apiUrl,
        gameDuration: config.gameDuration,
        batchInterval: config.batchInterval,
        bufferDuration: config.bufferDuration,
        confidenceThreshold: config.confidenceThreshold,
        theme: config.theme,
        debug: config.debug,
        logger: config.logger,
      });

      clientRef.value = client;

      // Subscribe to events
      client.on('ready', () => {
        state.value = 'ready';
      });

      client.on('start', () => {
        state.value = 'playing';
      });

      client.on('progress', (event) => {
        if (event.data) {
          progress.value = event.data.progress;
          timeRemaining.value = event.data.timeRemaining;
        }
      });

      client.on('complete', (event) => {
        state.value = 'complete';
        if (event.data) {
          result.value = event.data;
        }
      });

      client.on('error', (event) => {
        state.value = 'error';
        if (event.data) {
          error.value = event.data;
        }
      });

      try {
        await client.init(canvas);
      } catch (err) {
        error.value = err as Error;
        state.value = 'error';
      }
    };

    const start = async () => {
      if (!clientRef.value) return;
      error.value = null;
      result.value = null;
      await clientRef.value.start();
    };

    const stop = () => {
      clientRef.value?.stop();
      state.value = 'idle';
    };

    const reset = () => {
      clientRef.value?.reset();
      progress.value = 0;
      timeRemaining.value = config.gameDuration ?? 3000;
      result.value = null;
      error.value = null;
      state.value = 'ready';
    };

    // Auto-init when canvas ref is set
    onMounted(() => {
      if (canvasRef.value) {
        init(canvasRef.value);
      }
    });

    // Watch for canvas ref changes
    watch(canvasRef, (canvas) => {
      if (canvas && state.value === 'idle') {
        init(canvas as HTMLCanvasElement);
      }
    });

    // Auto-start
    watch(state, (newState) => {
      if (config.autoStart && newState === 'ready' && clientRef.value) {
        clientRef.value.start().catch((err) => {
          error.value = err;
        });
      }
    });

    // Cleanup
    onUnmounted(() => {
      clientRef.value?.destroy();
    });

    return {
      canvasRef,
      state,
      progress,
      timeRemaining,
      result,
      error,
      start,
      stop,
      reset,
      isProcessing,
      isPassed,
      init,
    };
  };
}

/**
 * Default export for convenience
 */
export default createUsePlayproof;
