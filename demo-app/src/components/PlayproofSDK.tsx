'use client';

import { useEffect, useRef, useState } from 'react';

// Types
export interface PlayproofTheme {
    primary?: string;
    secondary?: string;
    background?: string;
    surface?: string;
    text?: string;
    textMuted?: string;
    accent?: string;
    success?: string;
    error?: string;
    border?: string;
}

export interface VerificationResult {
    passed: boolean;
    score: number;
    threshold: number;
    timestamp: number;
    details: {
        mouseMovementCount: number;
        clickCount: number;
        accuracy: number;
    };
}

export type GameId = 'bubble-pop' | 'mini-golf' | 'basketball' | 'archery' | 'random';

export interface PlayproofSDKProps {
    theme?: PlayproofTheme;
    confidenceThreshold?: number;
    gameDuration?: number;
    gameId?: GameId;
    onSuccess?: (result: VerificationResult) => void;
    onFailure?: (result: VerificationResult) => void;
    onStart?: () => void;
    className?: string;
}

const DEFAULT_THEME: PlayproofTheme = {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: '#1e1e2e',
    surface: '#2a2a3e',
    text: '#f5f5f5',
    textMuted: '#a1a1aa',
    accent: '#22d3ee',
    success: '#10b981',
    error: '#ef4444',
    border: '#3f3f5a'
};

/**
 * React wrapper for the PlayProof SDK with Pixi games
 * Uses the actual SDK package for verification
 */
export default function PlayproofSDK({
    theme = {},
    confidenceThreshold = 0.7,
    gameDuration,
    gameId = 'mini-golf',
    onSuccess,
    onFailure,
    onStart,
    className = ''
}: PlayproofSDKProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const containerId = useRef(`playproof-${Math.random().toString(36).slice(2, 9)}`);
    const sdkInstanceRef = useRef<any>(null);
    const [mounted, setMounted] = useState(false);

    const mergedTheme = { ...DEFAULT_THEME, ...theme };

    useEffect(() => {
        setMounted(true);
        return () => {
            if (sdkInstanceRef.current) {
                sdkInstanceRef.current.destroy();
                sdkInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!mounted || !containerRef.current) return;

        // Dynamic import to avoid SSR issues
        const initSDK = async () => {
            try {
                // Import the SDK
                const { Playproof } = await import('playproof');

                // Clean up previous instance
                if (sdkInstanceRef.current) {
                    sdkInstanceRef.current.destroy();
                }

                // Create new instance
                const instance = new Playproof({
                    containerId: containerId.current,
                    theme: mergedTheme,
                    confidenceThreshold,
                    gameDuration,
                    gameId,
                    onSuccess,
                    onFailure,
                    onStart
                });

                sdkInstanceRef.current = instance;
                instance.verify();
            } catch (error) {
                console.error('Failed to load PlayProof SDK:', error);
            }
        };

        initSDK();
    }, [mounted, gameId, confidenceThreshold, gameDuration]);

    return (
        <div
            ref={containerRef}
            id={containerId.current}
            className={className}
            style={{
                maxWidth: '400px',
                width: '100%'
            }}
        />
    );
}
