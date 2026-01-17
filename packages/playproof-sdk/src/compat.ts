/**
 * Browser Compatibility
 * 
 * Feature detection and polyfills for cross-browser support.
 * 
 * @packageDocumentation
 */

import { CompatibilityError } from './errors';

/**
 * Feature detection results
 */
export interface BrowserFeatures {
  /** Performance.now() available */
  performanceNow: boolean;
  /** PointerEvents supported */
  pointerEvents: boolean;
  /** getCoalescedEvents() supported */
  coalescedEvents: boolean;
  /** ResizeObserver supported */
  resizeObserver: boolean;
  /** Web Crypto API available */
  webCrypto: boolean;
  /** Custom Elements supported */
  customElements: boolean;
  /** requestAnimationFrame available */
  requestAnimationFrame: boolean;
  /** Canvas 2D supported */
  canvas2D: boolean;
  /** AbortController supported */
  abortController: boolean;
}

/**
 * Browser info
 */
export interface BrowserInfo {
  name: string;
  version: string | undefined;
  userAgent: string;
}

/**
 * Detect browser features
 */
export function detectFeatures(): BrowserFeatures {
  const isBrowserEnv = typeof window !== 'undefined';

  if (!isBrowserEnv) {
    return {
      performanceNow: false,
      pointerEvents: false,
      coalescedEvents: false,
      resizeObserver: false,
      webCrypto: false,
      customElements: false,
      requestAnimationFrame: false,
      canvas2D: false,
      abortController: false,
    };
  }

  // Check coalesced events support
  let coalescedSupported = false;
  try {
    const event = new PointerEvent('pointermove');
    coalescedSupported = typeof event.getCoalescedEvents === 'function';
  } catch {
    coalescedSupported = false;
  }

  // Check canvas 2D support
  let canvas2DSupported = false;
  try {
    const canvas = document.createElement('canvas');
    canvas2DSupported = !!canvas.getContext('2d');
  } catch {
    canvas2DSupported = false;
  }

  return {
    performanceNow: typeof performance !== 'undefined' && typeof performance.now === 'function',
    pointerEvents: typeof PointerEvent !== 'undefined',
    coalescedEvents: coalescedSupported,
    resizeObserver: typeof ResizeObserver !== 'undefined',
    webCrypto: typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined',
    customElements: typeof customElements !== 'undefined',
    requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
    canvas2D: canvas2DSupported,
    abortController: typeof AbortController !== 'undefined',
  };
}

/**
 * Parse browser info from user agent
 */
export function getBrowserInfo(): BrowserInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  // Simple browser detection
  let name = 'Unknown';
  let version: string | undefined;

  if (ua.includes('Firefox')) {
    name = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1];
  } else if (ua.includes('Chrome') && !ua.includes('Edg')) {
    name = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1];
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    name = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1];
  } else if (ua.includes('Edg')) {
    name = 'Edge';
    version = ua.match(/Edg\/(\d+)/)?.[1];
  }

  return { name, version, userAgent: ua };
}

/**
 * Check if required features are available
 * @throws {CompatibilityError} if required features are missing
 */
export function checkRequiredFeatures(): void {
  const features = detectFeatures();
  const browser = getBrowserInfo();

  const required: (keyof BrowserFeatures)[] = [
    'canvas2D',
    'pointerEvents',
    'requestAnimationFrame',
  ];

  for (const feature of required) {
    if (!features[feature]) {
      throw new CompatibilityError(feature, browser.name);
    }
  }
}

/**
 * Get a high-precision timestamp
 * Uses performance.now() with Date.now() fallback
 */
export function getTimestamp(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Get device pixel ratio with fallback
 */
export function getDevicePixelRatio(): number {
  if (typeof window !== 'undefined' && window.devicePixelRatio) {
    return window.devicePixelRatio;
  }
  return 1;
}

/**
 * Check if touch is the primary input
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
  );
}

/**
 * Check if running on mobile
 */
export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Request animation frame with fallback
 */
export function raf(callback: FrameRequestCallback): number {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  // Fallback to setTimeout at ~60fps
  return setTimeout(() => callback(Date.now()), 16) as unknown as number;
}

/**
 * Cancel animation frame with fallback
 */
export function cancelRaf(handle: number): void {
  if (typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle);
  }
}

/**
 * Get supported event types for the current browser
 */
export function getSupportedEventTypes(): string[] {
  const features = detectFeatures();
  const types: string[] = [];

  if (features.pointerEvents) {
    types.push('pointerdown', 'pointermove', 'pointerup', 'pointerleave');
  } else {
    // Fallback to mouse events
    types.push('mousedown', 'mousemove', 'mouseup', 'mouseleave');
  }

  types.push('wheel', 'keydown', 'keyup');

  return types;
}
