/**
 * PlayProof React Integration
 * 
 * React hook and component for easy integration.
 * 
 * @packageDocumentation
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';
import type {
  PlayProofConfig,
  PlayProofTheme,
  VerificationResult,
  LifecycleState,
} from '../types';
import { PlayProofClient } from '../client';
import { DEFAULT_THEME } from '../config';

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Hook configuration
 */
export interface UsePlayproofConfig extends Omit<PlayProofConfig, 'apiUrl'> {
  /** API URL (optional if using default) */
  apiUrl?: string;
  /** Auto-start on mount */
  autoStart?: boolean;
}

/**
 * Hook return value
 */
export interface UsePlayproofReturn {
  /** Canvas ref to attach to your canvas element */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Current lifecycle state */
  state: LifecycleState;
  /** Current progress (0-1) */
  progress: number;
  /** Time remaining in ms */
  timeRemaining: number;
  /** Verification result (when complete) */
  result: VerificationResult | null;
  /** Current error (if any) */
  error: Error | null;
  /** Start verification */
  start: () => Promise<void>;
  /** Stop/cancel verification */
  stop: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Whether currently processing */
  isProcessing: boolean;
  /** Whether verification passed */
  isPassed: boolean | null;
}

// ============================================================================
// usePlayproof Hook
// ============================================================================

/**
 * React hook for PlayProof verification
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { canvasRef, state, start, result } = usePlayproof({
 *     apiUrl: 'https://api.playproof.dev'
 *   });
 *   
 *   return (
 *     <div>
 *       <canvas ref={canvasRef} width={400} height={300} />
 *       <button onClick={start} disabled={state !== 'ready'}>
 *         Start Verification
 *       </button>
 *       {result && <p>Result: {result.passed ? 'Pass' : 'Fail'}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlayproof(config: UsePlayproofConfig): UsePlayproofReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clientRef = useRef<PlayProofClient | null>(null);

  const [state, setState] = useState<LifecycleState>('idle');
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(config.gameDuration ?? 3000);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Create client on mount
  useEffect(() => {
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

    clientRef.current = client;

    // Subscribe to events
    const unsubscribeReady = client.on('ready', () => setState('ready'));
    const unsubscribeStart = client.on('start', () => setState('playing'));
    const unsubscribeProgress = client.on('progress', (event) => {
      if (event.data) {
        setProgress(event.data.progress);
        setTimeRemaining(event.data.timeRemaining);
      }
    });
    const unsubscribeComplete = client.on('complete', (event) => {
      setState('complete');
      if (event.data) {
        setResult(event.data);
      }
    });
    const unsubscribeError = client.on('error', (event) => {
      setState('error');
      if (event.data) {
        setError(event.data);
      }
    });

    // Initialize when canvas is available
    if (canvasRef.current) {
      client.init(canvasRef.current).catch((err) => {
        setError(err);
        setState('error');
      });
    }

    return () => {
      unsubscribeReady();
      unsubscribeStart();
      unsubscribeProgress();
      unsubscribeComplete();
      unsubscribeError();
      client.destroy();
    };
  }, [
    config.apiUrl,
    config.gameDuration,
    config.batchInterval,
    config.bufferDuration,
    config.confidenceThreshold,
    config.debug,
  ]);

  // Initialize client when canvas becomes available
  useEffect(() => {
    if (canvasRef.current && clientRef.current && state === 'idle') {
      clientRef.current.init(canvasRef.current).catch((err) => {
        setError(err);
        setState('error');
      });
    }
  }, [state]);

  // Auto-start
  useEffect(() => {
    if (config.autoStart && state === 'ready' && clientRef.current) {
      clientRef.current.start().catch((err) => {
        setError(err);
      });
    }
  }, [config.autoStart, state]);

  const start = useCallback(async () => {
    if (!clientRef.current) return;
    setError(null);
    setResult(null);
    await clientRef.current.start();
  }, []);

  const stop = useCallback(() => {
    clientRef.current?.stop();
    setState('idle');
  }, []);

  const reset = useCallback(() => {
    clientRef.current?.reset();
    setProgress(0);
    setTimeRemaining(config.gameDuration ?? 3000);
    setResult(null);
    setError(null);
    setState('ready');
  }, [config.gameDuration]);

  const isProcessing = state === 'processing' || state === 'initializing';
  const isPassed = result ? result.passed : null;

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
  };
}

// ============================================================================
// PlayProofGame Component
// ============================================================================

/**
 * Component props
 */
export interface PlayProofGameProps {
  /** API URL */
  apiUrl?: string;
  /** Game duration in ms */
  gameDuration?: number;
  /** Confidence threshold (0-1) */
  confidenceThreshold?: number;
  /** Theme customization */
  theme?: PlayProofTheme;
  /** Canvas width */
  width?: number;
  /** Canvas height */
  height?: number;
  /** Called on successful verification */
  onSuccess?: (result: VerificationResult) => void;
  /** Called on failed verification */
  onFailure?: (result: VerificationResult) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Custom className */
  className?: string;
  /** Custom style */
  style?: CSSProperties;
  /** Debug mode */
  debug?: boolean;
  /** Children to render in the container */
  children?: ReactNode;
}

/**
 * PlayProof verification game component
 * 
 * @example
 * ```tsx
 * <PlayProofGame
 *   apiUrl="https://api.playproof.dev"
 *   confidenceThreshold={0.7}
 *   onSuccess={(result) => console.log('Verified!', result)}
 *   onFailure={(result) => console.log('Failed', result)}
 * />
 * ```
 */
export function PlayProofGame({
  apiUrl = 'http://localhost:3000',
  gameDuration = 3000,
  confidenceThreshold = 0.7,
  theme,
  width = 400,
  height = 300,
  onSuccess,
  onFailure,
  onError,
  className,
  style,
  debug,
}: PlayProofGameProps): ReactNode {
  const {
    canvasRef,
    state,
    progress,
    result,
    error,
    start,
    reset,
    isProcessing,
  } = usePlayproof({
    apiUrl,
    gameDuration,
    confidenceThreshold,
    theme,
    debug,
  });

  // Effect for callbacks
  useEffect(() => {
    if (result) {
      if (result.passed) {
        onSuccess?.(result);
      } else {
        onFailure?.(result);
      }
    }
  }, [result, onSuccess, onFailure]);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Theme styles
  const themeColors = useMemo(() => ({ ...DEFAULT_THEME, ...theme }), [theme]);

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '24px',
    borderRadius: '12px',
    background: themeColors.background,
    border: `1px solid ${themeColors.border}`,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    ...style,
  };

  const canvasStyle: CSSProperties = {
    borderRadius: '8px',
    background: themeColors.surface,
    cursor: state === 'playing' ? 'crosshair' : 'default',
  };

  const buttonStyle: CSSProperties = {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: state === 'complete' && result?.passed
      ? themeColors.success
      : themeColors.primary,
    color: '#fff',
    opacity: isProcessing ? 0.7 : 1,
  };

  const progressStyle: CSSProperties = {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    background: themeColors.border,
    overflow: 'hidden',
  };

  const progressBarStyle: CSSProperties = {
    height: '100%',
    width: `${progress * 100}%`,
    background: `linear-gradient(90deg, ${themeColors.primary}, ${themeColors.secondary})`,
    transition: 'width 0.1s linear',
  };

  return (
    <div className={className} style={containerStyle}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={canvasStyle}
        aria-label="PlayProof verification game"
        role="application"
        tabIndex={0}
      />

      {state === 'playing' && (
        <div style={progressStyle}>
          <div style={progressBarStyle} />
        </div>
      )}

      {state === 'ready' && (
        <button
          onClick={start}
          style={buttonStyle}
          aria-label="Start verification"
        >
          Start Verification
        </button>
      )}

      {state === 'playing' && (
        <p style={{ color: themeColors.textMuted, margin: 0 }}>
          Interact with the game area...
        </p>
      )}

      {isProcessing && (
        <p style={{ color: themeColors.textMuted, margin: 0 }}>
          Processing...
        </p>
      )}

      {state === 'complete' && result && (
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              color: result.passed ? themeColors.success : themeColors.error,
              margin: '0 0 8px 0',
              fontWeight: 600,
            }}
          >
            {result.passed ? '✓ Verified!' : '✗ Verification Failed'}
          </p>
          <button
            onClick={reset}
            style={{ ...buttonStyle, background: themeColors.border }}
          >
            Try Again
          </button>
        </div>
      )}

      {state === 'error' && error && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: themeColors.error, margin: '0 0 8px 0' }}>
            Error: {error.message}
          </p>
          <button
            onClick={reset}
            style={{ ...buttonStyle, background: themeColors.error }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default PlayProofGame;
