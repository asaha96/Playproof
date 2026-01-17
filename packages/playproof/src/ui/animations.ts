/**
 * Playproof Animation Utilities
 * Reusable animation keyframes and CSS helpers
 */

import { transitions } from './design-tokens';

// Keyframe definitions as CSS strings
export const keyframes = {
    fadeIn: `
    @keyframes playproof-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
    fadeOut: `
    @keyframes playproof-fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `,
    slideUp: `
    @keyframes playproof-slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
    slideDown: `
    @keyframes playproof-slideDown {
      from { opacity: 0; transform: translateY(-12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
    scaleIn: `
    @keyframes playproof-scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
  `,
    scaleOut: `
    @keyframes playproof-scaleOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.9); }
    }
  `,
    pulse: `
    @keyframes playproof-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `,
    float: `
    @keyframes playproof-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
  `,
    shimmer: `
    @keyframes playproof-shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `,
    spin: `
    @keyframes playproof-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
    bubblePop: `
    @keyframes playproof-bubblePop {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); }
      100% { transform: scale(0); opacity: 0; }
    }
  `,
    bubbleAppear: `
    @keyframes playproof-bubbleAppear {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
  `,
    successPop: `
    @keyframes playproof-successPop {
      0% { transform: scale(0); opacity: 0; }
      60% { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
  `,
    glowPulse: `
    @keyframes playproof-glowPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
      50% { box-shadow: 0 0 30px rgba(99, 102, 241, 0.5); }
    }
  `,
};

// Get all keyframes as a single CSS string
export function getAllKeyframes(): string {
    return Object.values(keyframes).join('\n');
}

// Animation class helpers
export const animations = {
    fadeIn: 'playproof-fadeIn 300ms ease forwards',
    fadeOut: 'playproof-fadeOut 200ms ease forwards',
    slideUp: 'playproof-slideUp 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
    slideDown: 'playproof-slideDown 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
    scaleIn: 'playproof-scaleIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
    scaleOut: 'playproof-scaleOut 200ms ease forwards',
    pulse: 'playproof-pulse 2s ease-in-out infinite',
    float: 'playproof-float 3s ease-in-out infinite',
    shimmer: 'playproof-shimmer 2s ease-in-out infinite',
    spin: 'playproof-spin 1s linear infinite',
    bubblePop: 'playproof-bubblePop 200ms ease forwards',
    bubbleAppear: 'playproof-bubbleAppear 300ms ease forwards',
    successPop: 'playproof-successPop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
    glowPulse: 'playproof-glowPulse 2s ease-in-out infinite',
};

// Apply animation to element
export function animate(
    element: HTMLElement,
    animation: keyof typeof animations,
    onComplete?: () => void
): void {
    element.style.animation = animations[animation];

    if (onComplete) {
        const handleEnd = () => {
            element.removeEventListener('animationend', handleEnd);
            onComplete();
        };
        element.addEventListener('animationend', handleEnd);
    }
}

// Transition helpers
export function transition(properties: string | string[], speed: keyof typeof transitions = 'normal'): string {
    const props = Array.isArray(properties) ? properties : [properties];
    return props.map(p => `${p} ${transitions[speed]}`).join(', ');
}

// Create a staggered delay for multiple elements
export function staggerDelay(index: number, baseDelay = 50): string {
    return `${index * baseDelay}ms`;
}

export default {
    keyframes,
    getAllKeyframes,
    animations,
    animate,
    transition,
    staggerDelay,
};
