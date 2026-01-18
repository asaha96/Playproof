"use client";

/**
 * Playproof React Component
 * Fetches deployment config and renders the verification game
 */

import React, { useEffect, useRef, useState, useCallback, useId, useContext } from 'react';
import { PlayproofContext } from './context';
import { Playproof as PlayproofCore } from '../playproof';
import { PLAYPROOF_API_URL, DEFAULT_THEME } from '../config';
import type { VerificationResult, PlayproofTheme, GameId, PointerTelemetryEvent, BehaviorData } from '../types';

export interface PlayproofProps {
  /**
   * Deployment ID from your Playproof dashboard
   * The game type and theme will be fetched based on this ID
   * Optional if gameId and theme are both provided (preview mode)
   */
  deploymentId?: string;

  /**
   * API key for LiveKit telemetry + agent control.
   * Overrides any PlayproofProvider client_key.
   */
  apiKey?: string;

  /**
   * Base URL for Playproof API requests.
   * Defaults to https://playproof.app unless overridden.
   */
  apiBaseUrl?: string;
  
  /**
   * Called when verification succeeds
   */
  onSuccess?: (result: VerificationResult) => void;
  
  /**
   * Called when verification fails
   */
  onFailure?: (result: VerificationResult) => void;
  
  /**
   * Called when the game starts
   */
  onStart?: () => void;
  
  /**
   * Called with progress updates (0-1)
   */
  onProgress?: (progress: number) => void;
  
  /**
   * Called with batches of telemetry events during gameplay
   * Receives PointerTelemetryEvent[] batches in real-time
   */
  onTelemetryBatch?: (batch: PointerTelemetryEvent[]) => void;
  
  /**
   * Called when the game completes with final telemetry data
   * Receives converted telemetry data in Woodwide-compatible format
   */
  onTelemetry?: (telemetry: {
    movements: Array<{ x: number; y: number; timestamp: number }>;
    clicks: Array<{ x: number; y: number; timestamp: number; targetHit: boolean }>;
    hits: number;
    misses: number;
    durationMs: number;
  }) => void | Promise<{ decision?: string; anomalyScore?: number } | null>;
  
  /**
   * Override the game ID (optional - usually fetched from deployment)
   * Required if deploymentId is not provided
   */
  gameId?: GameId;
  
  /**
   * Override theme settings (optional - usually fetched from deployment)
   */
  theme?: Partial<PlayproofTheme>;
  
  /**
   * Confidence threshold for passing verification (0-1, default: 0.7)
   */
  confidenceThreshold?: number;
  
  /**
   * Game duration in milliseconds (optional - uses game default)
   */
  gameDuration?: number;
  
  /**
   * Key to force re-render/reset the component
   */
  resetKey?: number;
  
  /**
   * Additional CSS class name
   */
  className?: string;
}

interface DeploymentConfig {
  gameId: GameId;
  theme: PlayproofTheme;
}

type LoadingState = 'loading' | 'ready' | 'error';

/**
 * Playproof verification component
 * 
 * Fetches deployment configuration and renders the appropriate verification game.
 * Must be used within a PlayproofProvider.
 * 
 * @example
 * ```tsx
 * import { Playproof } from 'playproof/react';
 * 
 * export default function VerificationPage() {
 *   return (
 *     <Playproof
 *       deploymentId="k1234567890abcdef"
 *       onSuccess={(result) => {
 *         console.log('Verified!', result);
 *       }}
 *       onFailure={(result) => {
 *         console.log('Failed', result);
 *       }}
 *     />
 *   );
 * }
 * ```
 */
export function Playproof({
  deploymentId,
  apiKey: apiKeyOverride,
  apiBaseUrl: apiBaseUrlOverride,
  onSuccess,
  onFailure,
  onStart,
  onProgress,
  onTelemetryBatch,
  onTelemetry,
  gameId: gameIdOverride,
  theme: themeOverride,
  confidenceThreshold = 0.7,
  gameDuration,
  resetKey = 0,
  className,
}: PlayproofProps) {
  // Get context (optional for preview mode)
  const context = useContext(PlayproofContext);
  const client_key = context?.client_key ?? '';
  const uniqueId = useId();
  const containerId = `playproof-${uniqueId.replace(/:/g, '-')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<PlayproofCore | null>(null);
  
  const [state, setState] = useState<LoadingState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<DeploymentConfig | null>(null);

  // Store callbacks in refs to avoid triggering re-initialization when they change
  // This is critical because parent components often pass inline callbacks
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);
  const onStartRef = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  const onTelemetryBatchRef = useRef(onTelemetryBatch);
  const onTelemetryRef = useRef(onTelemetry);
  
  // Stable theme reference - serialize to compare by value, not reference
  const themeKey = JSON.stringify(themeOverride ?? {});
  const stableThemeRef = useRef(themeOverride);
  useEffect(() => {
    stableThemeRef.current = themeOverride;
  }, [themeKey]); // Only update when serialized value changes

  // Keep refs in sync with latest props
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onFailureRef.current = onFailure;
    onStartRef.current = onStart;
    onProgressRef.current = onProgress;
    onTelemetryBatchRef.current = onTelemetryBatch;
    onTelemetryRef.current = onTelemetry;
  }, [onSuccess, onFailure, onStart, onProgress, onTelemetryBatch, onTelemetry]);

  // Check if we're in preview mode (no deployment ID, using overrides)
  const isPreviewMode = !deploymentId && !!gameIdOverride;
  const apiBaseUrl = apiBaseUrlOverride ?? PLAYPROOF_API_URL;

  // Fetch deployment configuration
  const fetchConfig = useCallback(async (): Promise<DeploymentConfig | null> => {
    if (!deploymentId) {
      return null;
    }
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'deployments:getBrandingByCredentials',
          args: { apiKey: apiKeyOverride ?? client_key, deploymentId },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deployment config: ${response.status}`);
      }

      const rawData = await response.json();
      
      // Handle Convex error responses
      if (rawData.errorMessage) {
        throw new Error(rawData.errorMessage);
      }

      // Extract value from Convex response format
      const data = rawData.value !== undefined ? rawData.value : rawData;

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.success) {
        throw new Error('Invalid deployment configuration');
      }

      // Build theme from response
      const theme: PlayproofTheme = {
        ...DEFAULT_THEME,
        primary: data.theme?.primary || DEFAULT_THEME.primary,
        secondary: data.theme?.secondary || DEFAULT_THEME.secondary,
        background: data.theme?.background || DEFAULT_THEME.background,
        surface: data.theme?.surface || DEFAULT_THEME.surface,
        text: data.theme?.text || DEFAULT_THEME.text,
        textMuted: data.theme?.textMuted || DEFAULT_THEME.textMuted,
        accent: data.theme?.accent || DEFAULT_THEME.accent,
        success: data.theme?.success || DEFAULT_THEME.success,
        error: data.theme?.error || DEFAULT_THEME.error,
        border: data.theme?.border || DEFAULT_THEME.border,
        borderRadius: data.theme?.borderRadius,
        spacing: data.theme?.spacing,
        fontFamily: data.theme?.fontFamily,
      };

      return {
        gameId: data.gameId || 'bubble-pop',
        theme,
      };
    } catch (err) {
      console.error('[Playproof] Error fetching deployment config:', err);
      return null;
    }
  }, [apiBaseUrl, apiKeyOverride, client_key, deploymentId]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (instanceRef.current) {
      try {
        instanceRef.current.destroy();
      } catch {
        // Ignore cleanup errors
      }
      instanceRef.current = null;
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, []);

  // Initialize the game
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setState('loading');
      setError(null);
      cleanup();

      // Validate: either deploymentId or gameIdOverride must be provided
      if (!deploymentId && !gameIdOverride) {
        if (mounted) {
          setError('Either deploymentId or gameId must be provided');
          setState('error');
        }
        return;
      }

      // Fetch configuration if not in preview mode (using overrides)
      let deploymentConfig: DeploymentConfig | null = null;
      
      if (!isPreviewMode && !gameIdOverride) {
        deploymentConfig = await fetchConfig();
        if (!mounted) return;

        if (!deploymentConfig) {
          // Use defaults if fetch fails
          deploymentConfig = {
            gameId: 'bubble-pop',
            theme: DEFAULT_THEME,
          };
        }
      }

      if (!containerRef.current) {
        if (mounted) {
          setError('Container not found');
          setState('error');
        }
        return;
      }

      // Merge theme with overrides (use stableThemeRef for consistent reference)
      const finalTheme: PlayproofTheme = {
        ...(deploymentConfig?.theme || DEFAULT_THEME),
        ...stableThemeRef.current,
      };

      const finalGameId = gameIdOverride || deploymentConfig?.gameId || 'bubble-pop';

      if (mounted) {
        setConfig({
          gameId: finalGameId,
          theme: finalTheme,
        });
      }

      // Convert BehaviorData to telemetry format for onTelemetry callback
      const convertBehaviorDataToTelemetry = (behaviorData: BehaviorData, startTime: number, durationMs: number) => {
        const movements = behaviorData.mouseMovements.map(m => ({
          x: m.x,
          y: m.y,
          timestamp: m.timestamp - startTime,
        }));

        const clicks = behaviorData.clickTimings.map((timestamp, index) => {
          // Find the movement closest to the click timing
          const movement = behaviorData.mouseMovements.find(m => 
            Math.abs(m.timestamp - timestamp) < 100
          ) || behaviorData.mouseMovements[Math.floor(index * behaviorData.mouseMovements.length / (behaviorData.clickTimings.length || 1))] || { x: 0, y: 0 };
          
          return {
            x: movement.x,
            y: movement.y,
            timestamp: timestamp - startTime,
            targetHit: index < (behaviorData.hits || 0),
          };
        });

        return {
          movements,
          clicks,
          hits: behaviorData.hits || 0,
          misses: behaviorData.misses || 0,
          durationMs,
        };
      };

      try {
        // Ensure container has the ID
        containerRef.current.id = containerId;

        // Create Playproof instance
        let instance: PlayproofCore | null = null;
        
        instance = new PlayproofCore({
          containerId,
          confidenceThreshold,
          gameId: finalGameId,
          gameDuration: gameDuration || null,
          theme: finalTheme,
          apiKey: apiKeyOverride ?? (client_key || undefined),
          deploymentId: deploymentId || undefined,
          apiBaseUrl: apiBaseUrlOverride,
          onSuccess: (result: VerificationResult) => {
            onSuccessRef.current?.(result);
          },
          onFailure: (result: VerificationResult) => {
            onFailureRef.current?.(result);
          },
          onStart: () => {
            onStartRef.current?.();
          },
          onProgress: (progress: number) => {
            onProgressRef.current?.(progress);
          },
          hooks: {
            // Handle telemetry batches during gameplay and after completion
            onTelemetryBatch: (batch: any) => {
              // During gameplay: batch is PointerTelemetryEvent[]
              if (Array.isArray(batch) && batch.length > 0) {
                // Check if it's PointerTelemetryEvent[] (has eventType property)
                if (batch[0]?.eventType) {
                  onTelemetryBatchRef.current?.(batch as PointerTelemetryEvent[]);
                }
              }
              // After game completes: batch is BehaviorData (not an array, has mouseMovements)
              else if (batch && !Array.isArray(batch) && batch.mouseMovements) {
                const behaviorData = batch as BehaviorData;
                if (behaviorData.mouseMovements && behaviorData.mouseMovements.length > 0) {
                  // Use actual game timing from BehaviorData, fall back to movement timestamps
                  const startTime = behaviorData.startTime || behaviorData.mouseMovements[0]?.timestamp || Date.now();
                  const endTime = behaviorData.endTime || behaviorData.mouseMovements[behaviorData.mouseMovements.length - 1]?.timestamp || Date.now();
                  const durationMs = behaviorData.durationMs || (endTime - startTime);
                  
                  const telemetry = convertBehaviorDataToTelemetry(behaviorData, startTime, durationMs);
                  
                  // Call onTelemetry with converted data
                  const onTelemetryCurrent = onTelemetryRef.current;
                  if (onTelemetryCurrent) {
                    const result = onTelemetryCurrent(telemetry);
                    // If onTelemetry returns a promise, handle it (for Woodwide integration)
                    if (result && typeof result === 'object' && 'then' in result) {
                      result.then(woodwideResult => {
                        // Store Woodwide result if provided (the SDK expects this)
                        if (woodwideResult && instance) {
                          (instance as any).config.woodwideResult = {
                            decision: woodwideResult.decision || 'review',
                            anomalyScore: woodwideResult.anomalyScore || 0,
                          };
                        }
                      }).catch(err => {
                        console.error('[Playproof] onTelemetry error:', err);
                      });
                    }
                  }
                }
              }
            },
            onAttemptEnd: null,
            regenerate: null,
          },
        });

        instanceRef.current = instance;

        // Start verification UI (don't await - it waits for game completion)
        instance.verify().catch((err) => {
          console.error('[Playproof] Verification error:', err);
        });

        if (mounted) {
          setState('ready');
        }
      } catch (err) {
        console.error('[Playproof] Initialization error:', err);
        if (mounted) {
          setError('Failed to initialize verification');
          setState('error');
        }
      }
    };

    init();

    return () => {
      mounted = false;
      cleanup();
    };
    // Note: Callbacks are intentionally excluded from deps and stored in refs
    // to prevent game re-initialization when parent re-renders with new callback refs.
    // themeKey is used instead of themeOverride for stable object comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    containerId,
    client_key,
    apiKeyOverride,
    apiBaseUrlOverride,
    deploymentId,
    gameIdOverride,
    isPreviewMode,
    themeKey,
    confidenceThreshold,
    gameDuration,
    resetKey,
    fetchConfig,
    cleanup,
  ]);

  if (state === 'error') {
    return (
      <div 
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '320px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '8px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          fontSize: '14px',
          padding: '16px',
        }}
      >
        {error || 'Failed to load verification'}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id={containerId}
      className={className}
      style={{ width: '100%' }}
    />
  );
}

export default Playproof;
