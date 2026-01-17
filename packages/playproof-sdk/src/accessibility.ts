/**
 * Accessibility Features
 * 
 * ARIA support, keyboard navigation, and screen reader announcements.
 * 
 * @packageDocumentation
 */

import type { LifecycleState } from './types';

/**
 * ARIA role mappings
 */
export const ARIA_ROLES = {
  container: 'region',
  game: 'application',
  button: 'button',
  status: 'status',
  alert: 'alert',
  progress: 'progressbar',
} as const;

/**
 * ARIA label texts
 */
export const ARIA_LABELS = {
  container: 'PlayProof verification widget',
  game: 'Human verification game - Use mouse to interact',
  startButton: 'Start verification',
  retryButton: 'Retry verification',
  status: 'Verification status',
  progress: 'Verification progress',
  success: 'Verification successful',
  failure: 'Verification failed',
  processing: 'Processing verification results',
} as const;

/**
 * Screen reader announcement queue
 */
class AnnouncementQueue {
  private liveRegion: HTMLElement | null = null;

  /**
   * Initialize the live region
   */
  init(): void {
    if (typeof document === 'undefined') return;
    if (this.liveRegion) return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(this.liveRegion);
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.liveRegion) this.init();
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);
    
    // Clear and set content to trigger announcement
    this.liveRegion.textContent = '';
    requestAnimationFrame(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    });
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
      this.liveRegion = null;
    }
  }
}

/**
 * Global announcement queue
 */
export const announcer = new AnnouncementQueue();

/**
 * Announce a message to screen readers
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  announcer.announce(message, priority);
}

/**
 * Apply ARIA attributes to the container
 */
export function applyContainerA11y(element: HTMLElement): void {
  element.setAttribute('role', ARIA_ROLES.container);
  element.setAttribute('aria-label', ARIA_LABELS.container);
}

/**
 * Apply ARIA attributes to the game canvas
 */
export function applyGameA11y(canvas: HTMLCanvasElement): void {
  canvas.setAttribute('role', ARIA_ROLES.game);
  canvas.setAttribute('aria-label', ARIA_LABELS.game);
  canvas.setAttribute('tabindex', '0');
}

/**
 * Apply ARIA attributes to a button
 */
export function applyButtonA11y(
  button: HTMLElement,
  label: string,
  disabled = false
): void {
  button.setAttribute('role', ARIA_ROLES.button);
  button.setAttribute('aria-label', label);
  button.setAttribute('tabindex', disabled ? '-1' : '0');
  
  if (disabled) {
    button.setAttribute('aria-disabled', 'true');
  } else {
    button.removeAttribute('aria-disabled');
  }
}

/**
 * Apply progress ARIA attributes
 */
export function applyProgressA11y(
  element: HTMLElement,
  progress: number,
  max = 100
): void {
  element.setAttribute('role', ARIA_ROLES.progress);
  element.setAttribute('aria-label', ARIA_LABELS.progress);
  element.setAttribute('aria-valuenow', String(Math.round(progress)));
  element.setAttribute('aria-valuemin', '0');
  element.setAttribute('aria-valuemax', String(max));
}

/**
 * Get status announcement based on state
 */
export function getStateAnnouncement(state: LifecycleState): string {
  switch (state) {
    case 'idle':
      return 'Verification ready. Press Enter or click to start.';
    case 'initializing':
      return 'Initializing verification...';
    case 'ready':
      return 'Verification ready to begin.';
    case 'playing':
      return 'Verification in progress. Interact with the game area.';
    case 'processing':
      return ARIA_LABELS.processing;
    case 'complete':
      return ARIA_LABELS.success;
    case 'error':
      return ARIA_LABELS.failure;
    default:
      return '';
  }
}

/**
 * Focus management helper
 */
export class FocusManager {
  private previousFocus: HTMLElement | null = null;

  /**
   * Save the currently focused element
   */
  save(): void {
    this.previousFocus = document.activeElement as HTMLElement | null;
  }

  /**
   * Restore focus to the previously saved element
   */
  restore(): void {
    if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
      this.previousFocus.focus();
    }
    this.previousFocus = null;
  }

  /**
   * Focus an element
   */
  focus(element: HTMLElement): void {
    if (typeof element.focus === 'function') {
      element.focus();
    }
  }

  /**
   * Trap focus within an element
   */
  trapFocus(container: HTMLElement): () => void {
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return () => {};

    const firstFocusable = focusable[0] as HTMLElement;
    const lastFocusable = focusable[focusable.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstFocusable.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
}

/**
 * Keyboard navigation handler
 */
export interface KeyboardNavConfig {
  onEnter?: () => void;
  onEscape?: () => void;
  onSpace?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

/**
 * Create a keyboard navigation handler
 */
export function createKeyboardHandler(
  config: KeyboardNavConfig
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        if (config.onEnter) {
          e.preventDefault();
          config.onEnter();
        }
        break;
      case 'Escape':
        if (config.onEscape) {
          e.preventDefault();
          config.onEscape();
        }
        break;
      case ' ':
        if (config.onSpace) {
          e.preventDefault();
          config.onSpace();
        }
        break;
      case 'ArrowUp':
        if (config.onArrowUp) {
          e.preventDefault();
          config.onArrowUp();
        }
        break;
      case 'ArrowDown':
        if (config.onArrowDown) {
          e.preventDefault();
          config.onArrowDown();
        }
        break;
      case 'ArrowLeft':
        if (config.onArrowLeft) {
          e.preventDefault();
          config.onArrowLeft();
        }
        break;
      case 'ArrowRight':
        if (config.onArrowRight) {
          e.preventDefault();
          config.onArrowRight();
        }
        break;
    }
  };
}

/**
 * Check if high contrast mode is enabled
 */
export function isHighContrastMode(): boolean {
  if (typeof window === 'undefined') return false;

  // Windows High Contrast Mode
  const mediaQuery = window.matchMedia('(forced-colors: active)');
  return mediaQuery.matches;
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}
