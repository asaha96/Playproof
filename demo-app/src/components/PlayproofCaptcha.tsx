'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Theme configuration type
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

// Verification result type
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

// Component props
export interface PlayproofCaptchaProps {
    theme?: PlayproofTheme;
    confidenceThreshold?: number;
    gameDuration?: number;
    onSuccess?: (result: VerificationResult) => void;
    onFailure?: (result: VerificationResult) => void;
    onStart?: () => void;
    className?: string;
}

// Bubble type
interface Bubble {
    id: string;
    x: number;
    y: number;
    size: number;
    popping: boolean;
}

// Inline all SDK code for the demo to avoid import issues
const DEFAULT_THEME = {
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

// Helper function to convert hex to RGB
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 99, g: 102, b: 241 };
};

export default function PlayproofCaptcha({
    theme = {},
    confidenceThreshold = 0.7,
    gameDuration = 10000,
    onSuccess,
    onFailure,
    onStart,
    className = ''
}: PlayproofCaptchaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const [gameState, setGameState] = useState<'idle' | 'playing' | 'success' | 'failure'>('idle');
    const [progress, setProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState(gameDuration / 1000);
    const [score, setScore] = useState(0);
    const [bubbles, setBubbles] = useState<Bubble[]>([]);

    // Merge theme with defaults
    const mergedTheme = { ...DEFAULT_THEME, ...theme };

    // Behavior tracking refs
    const behaviorData = useRef({
        mouseMovements: [] as { x: number; y: number; timestamp: number }[],
        clickTimings: [] as number[],
        trajectories: [] as { x: number; y: number; timestamp: number }[][],
        hits: 0,
        misses: 0,
        clickAccuracy: 0
    });
    const currentTrajectory = useRef<{ x: number; y: number; timestamp: number }[]>([]);
    const intervals = useRef<{ spawn?: NodeJS.Timeout; progress?: NodeJS.Timeout; game?: NodeJS.Timeout }>({});
    const startTimeRef = useRef<number>(0);
    const gameStateRef = useRef(gameState);

    // Update gameStateRef when gameState changes
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    const spawnBubble = useCallback(() => {
        if (!gameAreaRef.current) return;
        
        const size = 40 + Math.random() * 30;
        const maxX = gameAreaRef.current.offsetWidth - size;
        const maxY = gameAreaRef.current.offsetHeight - size;

        const newBubble: Bubble = {
            id: `bubble-${Date.now()}-${Math.random()}`,
            x: Math.random() * maxX,
            y: Math.random() * maxY,
            size,
            popping: false
        };

        setBubbles(prev => {
            if (prev.length >= 5) return prev;
            return [...prev, newBubble];
        });

        // Auto-remove after 3 seconds
        setTimeout(() => {
            setBubbles(prev => prev.filter(b => b.id !== newBubble.id));
        }, 3000);
    }, []);

    const startGame = useCallback(() => {
        if (!gameAreaRef.current) return;

        setGameState('playing');
        onStart?.();

        // Reset everything
        behaviorData.current = {
            mouseMovements: [],
            clickTimings: [],
            trajectories: [],
            hits: 0,
            misses: 0,
            clickAccuracy: 0
        };
        currentTrajectory.current = [];
        setScore(0);
        setProgress(0);
        setBubbles([]);

        startTimeRef.current = Date.now();

        // Spawn first bubble
        spawnBubble();

        // Spawn bubbles periodically
        intervals.current.spawn = setInterval(() => {
            spawnBubble();
        }, 800);

        // Progress tracking
        intervals.current.progress = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const prog = Math.min(100, (elapsed / gameDuration) * 100);
            setProgress(prog);
            setTimeLeft(Math.max(0, Math.ceil((gameDuration - elapsed) / 1000)));
        }, 100);

        // End game
        intervals.current.game = setTimeout(() => endGame(), gameDuration);
    }, [gameDuration, onStart, spawnBubble]);

    const endGame = useCallback(() => {
        // Clear intervals
        if (intervals.current.spawn) {
            clearInterval(intervals.current.spawn);
            intervals.current.spawn = undefined;
        }
        if (intervals.current.progress) {
            clearInterval(intervals.current.progress);
            intervals.current.progress = undefined;
        }
        if (intervals.current.game) {
            clearTimeout(intervals.current.game);
            intervals.current.game = undefined;
        }

        // Clear bubbles
        setBubbles([]);

        // Calculate accuracy
        const total = behaviorData.current.hits + behaviorData.current.misses;
        behaviorData.current.clickAccuracy = total > 0 ? behaviorData.current.hits / total : 0;

        // Calculate confidence score
        const scoreValue = calculateConfidence(behaviorData.current);
        const passed = scoreValue >= confidenceThreshold;

        const result: VerificationResult = {
            passed,
            score: scoreValue,
            threshold: confidenceThreshold,
            timestamp: Date.now(),
            details: {
                mouseMovementCount: behaviorData.current.mouseMovements.length,
                clickCount: behaviorData.current.clickTimings.length,
                accuracy: behaviorData.current.clickAccuracy
            }
        };

        setGameState(passed ? 'success' : 'failure');

        if (passed) {
            onSuccess?.(result);
        } else {
            onFailure?.(result);
        }
    }, [confidenceThreshold, onSuccess, onFailure]);

    const calculateConfidence = (data: typeof behaviorData.current): number => {
        const scores: { weight: number; score: number }[] = [];

        // Mouse movement analysis
        if (data.mouseMovements.length > 2) {
            let totalVariance = 0;
            for (let i = 2; i < data.mouseMovements.length; i++) {
                const dx = data.mouseMovements[i].x - data.mouseMovements[i - 1].x;
                const dy = data.mouseMovements[i].y - data.mouseMovements[i - 1].y;
                const prevDx = data.mouseMovements[i - 1].x - data.mouseMovements[i - 2].x;
                const prevDy = data.mouseMovements[i - 1].y - data.mouseMovements[i - 2].y;
                const angleChange = Math.abs(Math.atan2(dy, dx) - Math.atan2(prevDy, prevDx));
                totalVariance += angleChange;
            }
            const avgVariance = totalVariance / (data.mouseMovements.length - 2);
            scores.push({ weight: 0.3, score: Math.min(1, avgVariance / 0.5) });
        }

        // Click timing analysis
        if (data.clickTimings.length > 1) {
            const intervals: number[] = [];
            for (let i = 1; i < data.clickTimings.length; i++) {
                intervals.push(data.clickTimings[i] - data.clickTimings[i - 1]);
            }
            const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / intervals.length;
            const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

            let timingScore = 0.6;
            if (cv < 0.1) timingScore = 0.2;
            else if (cv > 1.5) timingScore = 0.4;
            else if (cv >= 0.2 && cv <= 0.8) timingScore = 0.9;

            scores.push({ weight: 0.3, score: timingScore });
        }

        // Click accuracy
        let accuracyScore = 0.6;
        if (data.clickAccuracy >= 0.98) accuracyScore = 0.5;
        else if (data.clickAccuracy < 0.3) accuracyScore = 0.3;
        else if (data.clickAccuracy >= 0.6 && data.clickAccuracy <= 0.95) accuracyScore = 0.9;
        scores.push({ weight: 0.4, score: accuracyScore });

        if (scores.length === 0) return 0;

        const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
        return scores.reduce((sum, s) => sum + (s.weight * s.score), 0) / totalWeight;
    };

    // Handle bubble click
    const handleBubbleClick = useCallback((bubbleId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (gameStateRef.current !== 'playing') return;

        behaviorData.current.clickTimings.push(Date.now());
        behaviorData.current.hits++;
        setScore(prev => prev + 10);

        // Save trajectory
        if (currentTrajectory.current.length > 2) {
            behaviorData.current.trajectories.push([...currentTrajectory.current]);
        }
        currentTrajectory.current = [];

        // Mark bubble as popping then remove
        setBubbles(prev => prev.map(b => 
            b.id === bubbleId ? { ...b, popping: true } : b
        ));

        setTimeout(() => {
            setBubbles(prev => prev.filter(b => b.id !== bubbleId));
        }, 200);
    }, []);

    // Handle game area click (miss)
    const handleGameAreaClick = useCallback((e: React.MouseEvent) => {
        if (gameStateRef.current !== 'playing') return;

        // Only count as miss if not clicking a bubble
        const target = e.target as HTMLElement;
        if (target.classList.contains('playproof-bubble')) return;

        behaviorData.current.clickTimings.push(Date.now());
        behaviorData.current.misses++;

        // Save trajectory
        if (currentTrajectory.current.length > 2) {
            behaviorData.current.trajectories.push([...currentTrajectory.current]);
        }
        currentTrajectory.current = [];
    }, []);

    // Handle mouse move
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (gameStateRef.current !== 'playing') return;
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const movement = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            timestamp: Date.now()
        };
        behaviorData.current.mouseMovements.push(movement);
        currentTrajectory.current.push(movement);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervals.current.spawn) clearInterval(intervals.current.spawn);
            if (intervals.current.progress) clearInterval(intervals.current.progress);
            if (intervals.current.game) clearTimeout(intervals.current.game);
        };
    }, []);

    const primaryRgb = hexToRgb(mergedTheme.primary);

    return (
        <div
            ref={containerRef}
            className={`playproof-container ${className}`}
            style={{
                '--playproof-primary': mergedTheme.primary,
                '--playproof-secondary': mergedTheme.secondary,
                '--playproof-background': mergedTheme.background,
                '--playproof-surface': mergedTheme.surface,
                '--playproof-text': mergedTheme.text,
                '--playproof-text-muted': mergedTheme.textMuted,
                '--playproof-accent': mergedTheme.accent,
                '--playproof-success': mergedTheme.success,
                '--playproof-error': mergedTheme.error,
                '--playproof-border': mergedTheme.border,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                background: mergedTheme.background,
                border: `1px solid ${mergedTheme.border}`,
                borderRadius: '12px',
                padding: '16px',
                maxWidth: '400px',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden'
            } as React.CSSProperties}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: mergedTheme.text }}>
                    <span
                        className="w-6 h-6 rounded-md flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${mergedTheme.primary}, ${mergedTheme.secondary})` }}
                    >
                        <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                    </span>
                    Verify you&apos;re human
                </h2>
                <span className="text-xs font-medium" style={{ color: mergedTheme.textMuted }}>
                    {timeLeft}s
                </span>
            </div>

            {/* Game Area */}
            <div
                ref={gameAreaRef}
                className="rounded-lg min-h-[250px] relative overflow-hidden select-none"
                style={{
                    background: mergedTheme.surface,
                    cursor: gameState === 'playing' ? 'crosshair' : 'default'
                }}
                onClick={handleGameAreaClick}
                onMouseMove={handleMouseMove}
            >
                {/* Score display during gameplay */}
                {gameState === 'playing' && (
                    <div
                        className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-sm font-bold z-20"
                        style={{
                            background: `linear-gradient(135deg, ${mergedTheme.primary}88, ${mergedTheme.secondary}88)`,
                            color: mergedTheme.text,
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        Score: {score}
                    </div>
                )}

                {/* Bubbles */}
                {bubbles.map((bubble) => (
                    <div
                        key={bubble.id}
                        className={`playproof-bubble absolute rounded-full cursor-pointer transition-transform hover:scale-110 ${bubble.popping ? 'animate-pop' : 'animate-appear'}`}
                        style={{
                            width: bubble.size,
                            height: bubble.size,
                            left: bubble.x,
                            top: bubble.y,
                            background: `linear-gradient(135deg, ${mergedTheme.primary}, ${mergedTheme.secondary})`,
                            boxShadow: `0 4px 15px rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3), 
                                inset 0 -2px 10px rgba(0,0,0,0.2),
                                inset 0 2px 10px rgba(255,255,255,0.3)`,
                            zIndex: 10,
                            opacity: bubble.popping ? 0 : 1,
                            transform: bubble.popping ? 'scale(1.3)' : 'scale(1)',
                        }}
                        onClick={(e) => handleBubbleClick(bubble.id, e)}
                    />
                ))}

                {gameState === 'idle' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5">
                        <h3 className="text-base font-semibold mb-2" style={{ color: mergedTheme.text }}>
                            🎮 Quick Game Challenge
                        </h3>
                        <p className="text-sm mb-4" style={{ color: mergedTheme.textMuted }}>
                            Pop the bubbles as fast as you can!
                        </p>
                        <button
                            onClick={startGame}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
                            style={{
                                background: `linear-gradient(135deg, ${mergedTheme.primary}, ${mergedTheme.secondary})`,
                                boxShadow: `0 4px 12px ${mergedTheme.primary}66`
                            }}
                        >
                            Start Verification
                        </button>
                    </div>
                )}

                {(gameState === 'success' || gameState === 'failure') && (
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center animate-fadeIn"
                        style={{ background: mergedTheme.surface }}
                    >
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                            style={{
                                background: gameState === 'success'
                                    ? `${mergedTheme.success}33`
                                    : `${mergedTheme.error}33`,
                                color: gameState === 'success' ? mergedTheme.success : mergedTheme.error
                            }}
                        >
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                {gameState === 'success' ? (
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                ) : (
                                    <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                                )}
                            </svg>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: mergedTheme.text }}>
                            {gameState === 'success' ? 'Verification Complete!' : 'Verification Failed'}
                        </span>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
                <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: mergedTheme.surface }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-100"
                        style={{
                            width: `${progress}%`,
                            background: `linear-gradient(90deg, ${mergedTheme.primary}, ${mergedTheme.accent})`
                        }}
                    />
                </div>
            </div>

            {/* Footer */}
            <div
                className="flex items-center justify-between mt-3 pt-3"
                style={{ borderTop: `1px solid ${mergedTheme.border}` }}
            >
                <span className="text-xs" style={{ color: mergedTheme.textMuted }}>
                    Protected by <a href="#" style={{ color: mergedTheme.accent }} className="no-underline hover:underline">Playproof</a>
                </span>
                {(gameState === 'success' || gameState === 'failure') && (
                    <span
                        className="text-xs font-medium flex items-center gap-1.5"
                        style={{ color: gameState === 'success' ? mergedTheme.success : mergedTheme.error }}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            {gameState === 'success' ? (
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            ) : (
                                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                            )}
                        </svg>
                        {gameState === 'success' ? 'Verified' : 'Not Verified'}
                    </span>
                )}
            </div>

            {/* Keyframe animations */}
            <style jsx global>{`
        @keyframes bubbleAppear {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes bubblePop {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-appear {
          animation: bubbleAppear 0.3s ease forwards;
        }
        .animate-pop {
          animation: bubblePop 0.2s ease forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
      `}</style>
        </div>
    );
}
