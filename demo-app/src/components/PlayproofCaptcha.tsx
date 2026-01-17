'use client';

import { useEffect, useRef, useState } from 'react';

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
    const bubbles = useRef<HTMLDivElement[]>([]);
    const intervals = useRef<{ bubble?: NodeJS.Timeout; progress?: NodeJS.Timeout; game?: NodeJS.Timeout }>({});
    const startTimeRef = useRef<number>(0);

    const startGame = () => {
        if (!gameAreaRef.current) return;

        setGameState('playing');
        onStart?.();

        // Reset behavior data
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

        // Clear game area
        if (gameAreaRef.current) {
            gameAreaRef.current.innerHTML = '';
        }
        bubbles.current = [];

        startTimeRef.current = Date.now();

        // Spawn bubbles
        const spawnBubble = () => {
            if (!gameAreaRef.current || bubbles.current.length >= 5) return;

            const bubble = document.createElement('div');
            bubble.className = 'playproof-bubble';

            const size = 40 + Math.random() * 30;
            const maxX = gameAreaRef.current.offsetWidth - size;
            const maxY = gameAreaRef.current.offsetHeight - size;

            // Convert hex colors to RGB for rgba shadow
            const primaryRgb = hexToRgb(mergedTheme.primary);
            
            bubble.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * maxX}px;
        top: ${Math.random() * maxY}px;
        background: linear-gradient(135deg, ${mergedTheme.primary}, ${mergedTheme.secondary});
        border-radius: 50%;
        cursor: pointer;
        animation: bubbleAppear 0.3s ease;
        transition: transform 0.1s ease;
        box-shadow: 0 4px 15px rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3), 
          inset 0 -2px 10px rgba(0,0,0,0.2),
          inset 0 2px 10px rgba(255,255,255,0.3);
        z-index: 10;
      `;
            
            // Add hover effect
            bubble.addEventListener('mouseenter', () => {
                bubble.style.transform = 'scale(1.1)';
            });
            bubble.addEventListener('mouseleave', () => {
                bubble.style.transform = 'scale(1)';
            });
            
            // Add click handler directly to bubble for better responsiveness
            bubble.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent double-triggering
            });

            gameAreaRef.current.appendChild(bubble);
            bubbles.current.push(bubble);

            // Auto-remove after 3 seconds
            setTimeout(() => {
                const idx = bubbles.current.indexOf(bubble);
                if (idx > -1) {
                    bubbles.current.splice(idx, 1);
                    bubble.remove();
                }
            }, 3000);
        };

        // Initial spawn
        spawnBubble();
        
        // Spawn bubbles periodically
        intervals.current.bubble = setInterval(() => {
            if (gameAreaRef.current && bubbles.current.length < 5) {
                spawnBubble();
            }
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
    };

    const endGame = () => {
        // Clear intervals
        if (intervals.current.bubble) clearInterval(intervals.current.bubble);
        if (intervals.current.progress) clearInterval(intervals.current.progress);
        if (intervals.current.game) clearTimeout(intervals.current.game);

        // Calculate accuracy
        const total = behaviorData.current.hits + behaviorData.current.misses;
        behaviorData.current.clickAccuracy = total > 0 ? behaviorData.current.hits / total : 0;

        // Calculate confidence score
        const score = calculateConfidence(behaviorData.current);
        const passed = score >= confidenceThreshold;

        const result: VerificationResult = {
            passed,
            score,
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
    };

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

    // Mouse/click handlers - use ref to track game state
    const gameStateRef = useRef(gameState);
    
    useEffect(() => {
        gameStateRef.current = gameState;
    }, [gameState]);

    useEffect(() => {
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (gameStateRef.current !== 'playing') return;
            const rect = gameArea.getBoundingClientRect();
            const movement = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                timestamp: performance.now() // Use performance.now() for better precision
            };
            behaviorData.current.mouseMovements.push(movement);
            currentTrajectory.current.push(movement);
        };

        const handleClick = (e: MouseEvent) => {
            if (gameStateRef.current !== 'playing') return;

            behaviorData.current.clickTimings.push(performance.now());

            // Check bubble hit
            const rect = gameArea.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            let hit = false;
            for (const bubble of bubbles.current) {
                if (!bubble.parentElement) continue; // Skip if already removed
                
                const bRect = bubble.getBoundingClientRect();
                const bX = bRect.left - rect.left;
                const bY = bRect.top - rect.top;
                const bRadius = bRect.width / 2;
                const bCenterX = bX + bRadius;
                const bCenterY = bY + bRadius;

                // Check if click is within circle (more accurate than rectangle)
                const distance = Math.sqrt(
                    Math.pow(x - bCenterX, 2) + Math.pow(y - bCenterY, 2)
                );

                if (distance <= bRadius) {
                    // Pop bubble with visual feedback
                    bubble.style.animation = 'bubblePop 0.2s ease forwards';
                    bubble.style.pointerEvents = 'none';
                    
                    // Update score immediately for visual feedback
                    setScore(prev => prev + 10);
                    
                    setTimeout(() => {
                        const idx = bubbles.current.indexOf(bubble);
                        if (idx > -1) bubbles.current.splice(idx, 1);
                        if (bubble.parentElement) {
                            bubble.remove();
                        }
                    }, 200);
                    hit = true;
                    break;
                }
            }

            if (hit) behaviorData.current.hits++;
            else behaviorData.current.misses++;

            // Save trajectory
            if (currentTrajectory.current.length > 2) {
                behaviorData.current.trajectories.push([...currentTrajectory.current]);
            }
            currentTrajectory.current = [];
        };

        gameArea.addEventListener('mousemove', handleMouseMove);
        gameArea.addEventListener('click', handleClick);

        return () => {
            gameArea.removeEventListener('mousemove', handleMouseMove);
            gameArea.removeEventListener('click', handleClick);
        };
    }, []); // Empty deps - handlers use refs

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervals.current.bubble) clearInterval(intervals.current.bubble);
            if (intervals.current.progress) clearInterval(intervals.current.progress);
            if (intervals.current.game) clearTimeout(intervals.current.game);
        };
    }, []);

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
                    Verify you're human
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
            >
                {/* Score display during gameplay */}
                {gameState === 'playing' && (
                    <div
                        className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-sm font-bold"
                        style={{
                            background: `linear-gradient(135deg, ${mergedTheme.primary}88, ${mergedTheme.secondary}88)`,
                            color: mergedTheme.text,
                            backdropFilter: 'blur(8px)',
                            zIndex: 20
                        }}
                    >
                        Score: {score}
                    </div>
                )}
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
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
      `}</style>
        </div>
    );
}
