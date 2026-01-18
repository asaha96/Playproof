"use client"

import * as React from "react"
import { useId, useRef, useEffect, useState, useCallback } from "react"

export interface PlayproofCaptchaResult {
    passed: boolean
    score: number
    threshold: number
    timestamp: number
    details: {
        mouseMovementCount: number
        clickCount: number
        accuracy: number
    }
}

// Available font families
export const PLAYPROOF_FONTS = [
    'Inter',
    'Nunito Sans',
    'Poppins',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Source Sans 3',
    'Raleway',
    'Work Sans',
] as const

export type PlayproofFontFamily = typeof PLAYPROOF_FONTS[number]

export interface PlayproofCaptchaProps {
    /** Threshold for verification success (0-1) */
    confidenceThreshold?: number
    /** Game type: 'bubble-pop', 'archery', or 'random' */
    gameType?: "bubble-pop" | "archery" | "random"
    /** Difficulty level - affects game duration */
    difficulty?: "easy" | "normal" | "hard"
    /** Game timer in seconds */
    timer?: number
    /** Border radius in pixels */
    borderRadius?: number
    /** Spacing in pixels */
    spacing?: number
    /** Font family */
    fontFamily?: PlayproofFontFamily
    // Core colors
    /** Primary theme color */
    primaryColor?: string
    /** Secondary theme color */
    secondaryColor?: string
    /** Background color */
    backgroundColor?: string
    /** Surface color for game area */
    surfaceColor?: string
    // Text colors
    /** Text color */
    textColor?: string
    /** Muted text color */
    textMutedColor?: string
    // UI colors
    /** Accent color */
    accentColor?: string
    /** Success color */
    successColor?: string
    /** Error color */
    errorColor?: string
    /** Border color */
    borderColor?: string
    /** Called when verification passes */
    onSuccess?: (result: PlayproofCaptchaResult) => void
    /** Called when verification fails */
    onFailure?: (result: PlayproofCaptchaResult) => void
    /** Called with telemetry data when game completes */
    onTelemetry?: (telemetry: {
        movements: Array<{ x: number; y: number; timestamp: number }>;
        clicks: Array<{ x: number; y: number; timestamp: number; targetHit: boolean }>;
        hits: number;
        misses: number;
        durationMs: number;
    }) => Promise<{ decision: "pass" | "review" | "fail"; anomalyScore: number } | null>
    /** Called with real-time telemetry events during gameplay */
    onRealTimeTelemetry?: (events: Array<{
        x: number;
        y: number;
        timestamp: number;
        eventType: string;
    }>) => void
    /** Called with batched pointer telemetry events (same as observability page) */
    onTelemetryBatch?: (batch: Array<{
        timestampMs: number;
        tMs: number;
        x: number;
        y: number;
        clientX: number;
        clientY: number;
        isDown: boolean;
        eventType: 'move' | 'down' | 'up' | 'enter' | 'leave';
        pointerType: string;
        pointerId: number;
        isTrusted: boolean;
    }>) => void
    /** Callback to get SDK instance reference */
    onInstanceReady?: (instance: any) => void
    /** Unique key to force re-render/reset */
    resetKey?: number
}

const DIFFICULTY_DURATION: Record<string, number> = {
    easy: 15000,
    normal: 10000,
    hard: 6000,
}

export function PlayproofCaptcha({
    confidenceThreshold = 0.7,
    gameType = "bubble-pop",
    difficulty = "normal",
    timer,
    borderRadius = 12,
    spacing = 16,
    fontFamily = "Inter",
    // Core colors
    primaryColor = "#6366f1",
    secondaryColor = "#8b5cf6",
    backgroundColor = "#1e1e2e",
    surfaceColor = "#2a2a3e",
    // Text colors
    textColor = "#f5f5f5",
    textMutedColor = "#a1a1aa",
    // UI colors
    accentColor = "#22d3ee",
    successColor = "#10b981",
    errorColor = "#ef4444",
    borderColor = "#3f3f5a",
    onSuccess,
    onFailure,
    onTelemetry,
    onRealTimeTelemetry,
    onTelemetryBatch: onTelemetryBatchHook,
    onInstanceReady,
    resetKey = 0,
}: PlayproofCaptchaProps) {
    const uniqueId = useId()
    const containerId = `playproof-${uniqueId.replace(/:/g, "-")}`
    const containerRef = useRef<HTMLDivElement>(null)
    const playproofInstanceRef = useRef<any>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Calculate game duration
    const gameDuration = timer ? timer * 1000 : DIFFICULTY_DURATION[difficulty] || 10000

    // Cleanup function
    const cleanup = useCallback(() => {
        if (playproofInstanceRef.current) {
            try {
                playproofInstanceRef.current.destroy()
            } catch (e) {
                // Ignore cleanup errors
            }
            playproofInstanceRef.current = null
        }
        // Clear container
        if (containerRef.current) {
            containerRef.current.innerHTML = ""
        }
        setIsLoaded(false)
    }, [])

    // Initialize SDK
    useEffect(() => {
        let mounted = true

        const initPlayproof = async () => {
            try {
                cleanup()

                // Dynamic import to avoid SSR issues
                const { Playproof } = await import("playproof")

                if (!mounted || !containerRef.current) return

                // Ensure container has the ID
                containerRef.current.id = containerId

                // Create Playproof instance with full theme support
                const instance = new Playproof({
                    containerId,
                    confidenceThreshold,
                    gameId: gameType,
                    gameDuration,
                    theme: {
                        primary: primaryColor,
                        secondary: secondaryColor,
                        background: backgroundColor,
                        surface: surfaceColor,
                        text: textColor,
                        textMuted: textMutedColor,
                        accent: accentColor,
                        success: successColor,
                        error: errorColor,
                        border: borderColor,
                        borderRadius,
                        spacing,
                        fontFamily,
                    },
                    hooks: {
                        onTelemetryBatch: async (batch: any) => {
                            // First, handle pointer telemetry events if hook is provided (for observability-style tracking)
                            // The SDK calls this with PointerTelemetryEvent[] during gameplay
                            if (onTelemetryBatchHook && Array.isArray(batch) && batch.length > 0 && batch[0]?.eventType) {
                                // This is a batch of PointerTelemetryEvent[] from the pointer tracker
                                onTelemetryBatchHook(batch);
                                return; // Don't process arrays as BehaviorData
                            }
                            
                            // When game completes, batch will be BehaviorData (not an array)
                            // SDK waits 100ms for Woodwide result, so we need to process quickly
                            if (batch && onTelemetry && !Array.isArray(batch)) {
                                    try {
                                        const behaviorData = batch as any;
                                        console.log("Processing telemetry batch:", {
                                            movements: behaviorData.mouseMovements?.length || 0,
                                            clicks: behaviorData.clickTimings?.length || 0,
                                            hits: behaviorData.hits || 0,
                                            misses: behaviorData.misses || 0,
                                        });
                                        
                                        if (behaviorData.mouseMovements && behaviorData.mouseMovements.length > 0) {
                                            // Convert BehaviorData to telemetry format
                                            const startTime = behaviorData.mouseMovements[0]?.timestamp || Date.now();
                                            const endTime = behaviorData.mouseMovements[behaviorData.mouseMovements.length - 1]?.timestamp || Date.now();
                                            
                                            // Map click timings to click events
                                            const clicks = behaviorData.clickTimings?.map((timestamp: number, index: number) => {
                                                // Find nearest movement for click position
                                                const movement = behaviorData.mouseMovements.find((m: any) => 
                                                    Math.abs(m.timestamp - timestamp) < 100
                                                ) || behaviorData.mouseMovements[Math.floor(index * behaviorData.mouseMovements.length / (behaviorData.clickTimings.length || 1))];
                                                
                                                return {
                                                    x: movement?.x || 0,
                                                    y: movement?.y || 0,
                                                    timestamp: timestamp - startTime,
                                                    targetHit: index < (behaviorData.hits || 0),
                                                };
                                            }) || [];

                                            const telemetry = {
                                                movements: behaviorData.mouseMovements.map((m: any) => ({
                                                    x: m.x,
                                                    y: m.y,
                                                    timestamp: m.timestamp - startTime,
                                                })),
                                                clicks,
                                                hits: behaviorData.hits || 0,
                                                misses: behaviorData.misses || 0,
                                                durationMs: endTime - startTime,
                                            };

                                        // Get Woodwide result and store it for the SDK to use
                                        // SDK will wait up to 100ms and then check config.woodwideResult
                                        const woodwideResult = await onTelemetry(telemetry);
                                        if (woodwideResult && instance) {
                                            // Store result in config - SDK will use it in evaluateResult
                                            (instance as any).config.woodwideResult = woodwideResult;
                                        }
                                    }
                                } catch (error) {
                                    console.error("Error processing telemetry:", error);
                                }
                            }
                        },
                        onAttemptEnd: null,
                        regenerate: null,
                    },
                    onSuccess: (result: PlayproofCaptchaResult) => {
                        onSuccess?.(result)
                    },
                    onFailure: (result: PlayproofCaptchaResult) => {
                        onFailure?.(result)
                    },
                })

                playproofInstanceRef.current = instance

                // Expose instance to parent
                if (onInstanceReady) {
                    onInstanceReady(instance);
                }

                // Hook into real-time telemetry via the SDK's onTelemetryBatch hook
                // This will be called in real-time as events come in
                if (onRealTimeTelemetry) {
                    const originalOnTelemetryBatch = instance.config.hooks?.onTelemetryBatch;
                    instance.config.hooks = instance.config.hooks || {};
                    instance.config.hooks.onTelemetryBatch = (batch: any) => {
                        // Call original hook if it exists
                        if (originalOnTelemetryBatch) {
                            originalOnTelemetryBatch(batch);
                        }
                        // Only process if batch is an array of PointerTelemetryEvent (during gameplay)
                        // When game completes, batch will be BehaviorData (not an array)
                        if (Array.isArray(batch) && batch.length > 0 && batch[0]?.eventType) {
                            // Convert PointerTelemetryEvent[] to simplified format
                            const simplified = batch.map((e: any) => ({
                                x: e.x,
                                y: e.y,
                                timestamp: e.timestampMs,
                                eventType: e.eventType,
                            }));
                            onRealTimeTelemetry(simplified);
                        }
                    };
                }

                // Start verification UI
                await instance.verify()

                if (mounted) {
                    setIsLoaded(true)
                    setError(null)
                }
            } catch (err) {
                console.error("Failed to initialize Playproof:", err)
                if (mounted) {
                    setError("Failed to load captcha")
                }
            }
        }

        initPlayproof()

        return () => {
            mounted = false
            cleanup()
        }
    }, [
        containerId,
        confidenceThreshold,
        gameType,
        gameDuration,
        borderRadius,
        spacing,
        fontFamily,
        primaryColor,
        secondaryColor,
        backgroundColor,
        surfaceColor,
        textColor,
        textMutedColor,
        accentColor,
        successColor,
        errorColor,
        borderColor,
        onSuccess,
        onFailure,
        onRealTimeTelemetry,
        onTelemetryBatchHook,
        onInstanceReady,
        resetKey,
        cleanup,
    ])

    // Apply custom layout properties via style
    const containerStyle: React.CSSProperties = {
        "--playproof-border-radius": `${borderRadius}px`,
        "--playproof-spacing": `${spacing}px`,
        "--playproof-font-family": `'${fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
    } as React.CSSProperties

    return (
        <>
            {error ? (
                <div className="flex items-center justify-center min-h-[320px] bg-slate-900/50 rounded-lg border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            ) : (
                <div
                    ref={containerRef}
                    id={containerId}
                    style={containerStyle}
                    className="w-full"
                />
            )}
        </>
    )
}

export default PlayproofCaptcha
