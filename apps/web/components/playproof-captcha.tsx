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
    /** Primary theme color */
    primaryColor?: string
    /** Secondary theme color */
    secondaryColor?: string
    /** Background color */
    backgroundColor?: string
    /** Surface color for game area */
    surfaceColor?: string
    /** Text color */
    textColor?: string
    /** Muted text color */
    textMutedColor?: string
    /** Accent color */
    accentColor?: string
    /** Success color */
    successColor?: string
    /** Error color */
    errorColor?: string
    /** Border color */
    borderColor?: string
    /** Spacing in pixels */
    spacing?: number
    /** Font family */
    fontFamily?: string
    /** Called when verification passes */
    onSuccess?: (result: PlayproofCaptchaResult) => void
    /** Called when verification fails */
    onFailure?: (result: PlayproofCaptchaResult) => void
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
    primaryColor = "#6366f1",
    secondaryColor = "#8b5cf6",
    backgroundColor = "#1e1e2e",
    surfaceColor = "#2a2a3e",
    textColor = "#f5f5f5",
    textMutedColor = "#a1a1aa",
    accentColor = "#22d3ee",
    successColor = "#10b981",
    errorColor = "#ef4444",
    borderColor = "#3f3f5a",
    spacing = 10,
    fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    onSuccess,
    onFailure,
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

                // Create Playproof instance
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
                    },
                    onSuccess: (result: PlayproofCaptchaResult) => {
                        onSuccess?.(result)
                    },
                    onFailure: (result: PlayproofCaptchaResult) => {
                        onFailure?.(result)
                    },
                })

                playproofInstanceRef.current = instance

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
        resetKey,
        cleanup,
    ])

    // Apply custom border radius via style
    const containerStyle: React.CSSProperties = {
        "--playproof-border-radius": `${borderRadius}px`,
        "--playproof-spacing": `${spacing}px`,
        "--playproof-font-family": fontFamily,
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
