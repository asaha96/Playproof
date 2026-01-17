/**
 * PlayProof Web Component
 * 
 * Custom element for easy integration without framework dependencies.
 * 
 * @packageDocumentation
 */

import type {
  PlayProofTheme,
  VerificationResult,
  LifecycleState,
} from './types';
import { PlayProofClient } from './client';
import { DEFAULT_THEME } from './config';
import {
  applyContainerA11y,
  applyGameA11y,
  announce,
  getStateAnnouncement,
} from './accessibility';

/**
 * Observed attributes for the web component
 */
const OBSERVED_ATTRIBUTES = [
  'api-url',
  'game-duration',
  'confidence-threshold',
  'width',
  'height',
  'theme-primary',
  'theme-secondary',
  'theme-background',
  'theme-surface',
  'theme-text',
  'theme-accent',
  'theme-success',
  'theme-error',
  'theme-border',
  'debug',
  'auto-start',
] as const;

type ObservedAttribute = typeof OBSERVED_ATTRIBUTES[number];

/**
 * Custom events dispatched by the component
 */
interface PlayProofGameEvents {
  'playproof:ready': CustomEvent<void>;
  'playproof:start': CustomEvent<{ attemptId: string }>;
  'playproof:progress': CustomEvent<{ progress: number; timeRemaining: number }>;
  'playproof:complete': CustomEvent<VerificationResult>;
  'playproof:error': CustomEvent<Error>;
}

/**
 * Augment HTMLElementEventMap for TypeScript
 */
declare global {
  interface HTMLElementEventMap extends PlayProofGameEvents {}
}

/**
 * PlayProof Game Web Component
 * 
 * @example
 * ```html
 * <play-proof-game
 *   api-url="https://api.playproof.dev"
 *   confidence-threshold="0.7"
 *   theme-primary="#6366f1"
 * ></play-proof-game>
 * 
 * <script>
 *   document.querySelector('play-proof-game')
 *     .addEventListener('playproof:complete', (e) => {
 *       console.log('Verification result:', e.detail);
 *     });
 * </script>
 * ```
 */
export class PlayProofGameElement extends HTMLElement {
  private shadow: ShadowRoot;
  private client: PlayProofClient | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private container: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;
  private progressBar: HTMLDivElement | null = null;
  private statusText: HTMLParagraphElement | null = null;

  private state: LifecycleState = 'idle';
  private _theme: PlayProofTheme = { ...DEFAULT_THEME };

  static get observedAttributes(): readonly ObservedAttribute[] {
    return OBSERVED_ATTRIBUTES;
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.render();
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  connectedCallback(): void {
    this.initClient();
  }

  disconnectedCallback(): void {
    this.client?.destroy();
    this.client = null;
  }

  attributeChangedCallback(
    name: ObservedAttribute,
    _oldValue: string | null,
    newValue: string | null
  ): void {
    // Handle theme attributes
    if (name.startsWith('theme-')) {
      const themeKey = name.replace('theme-', '') as keyof PlayProofTheme;
      if (newValue) {
        this._theme[themeKey] = newValue;
        this.updateStyles();
      }
    }

    // Re-initialize if API URL changes
    if (name === 'api-url' && this.client) {
      this.initClient();
    }
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /**
   * Start verification
   */
  async start(): Promise<void> {
    await this.client?.start();
  }

  /**
   * Stop verification
   */
  stop(): void {
    this.client?.stop();
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.client?.reset();
  }

  /**
   * Get current state
   */
  getState(): LifecycleState {
    return this.state;
  }

  /**
   * Get/set theme
   */
  get theme(): PlayProofTheme {
    return { ...this._theme };
  }

  set theme(value: PlayProofTheme) {
    this._theme = { ...DEFAULT_THEME, ...value };
    this.updateStyles();
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  private async initClient(): Promise<void> {
    // Clean up existing client
    this.client?.destroy();

    const apiUrl = this.getAttribute('api-url') ?? 'http://localhost:3000';
    const gameDuration = parseInt(this.getAttribute('game-duration') ?? '3000', 10);
    const confidenceThreshold = parseFloat(
      this.getAttribute('confidence-threshold') ?? '0.7'
    );
    const debug = this.hasAttribute('debug');

    this.client = new PlayProofClient({
      apiUrl,
      gameDuration,
      confidenceThreshold,
      theme: this._theme,
      debug,
    });

    // Subscribe to events
    this.client.on('ready', () => {
      this.setState('ready');
      this.dispatchEvent(new CustomEvent('playproof:ready'));
    });

    this.client.on('start', (event) => {
      this.setState('playing');
      this.dispatchEvent(
        new CustomEvent('playproof:start', { detail: event.data })
      );
    });

    this.client.on('progress', (event) => {
      if (event.data) {
        this.updateProgress(event.data.progress);
        this.dispatchEvent(
          new CustomEvent('playproof:progress', { detail: event.data })
        );
      }
    });

    this.client.on('complete', (event) => {
      this.setState('complete');
      if (event.data) {
        this.showResult(event.data);
        this.dispatchEvent(
          new CustomEvent('playproof:complete', { detail: event.data })
        );
      }
    });

    this.client.on('error', (event) => {
      this.setState('error');
      if (event.data) {
        this.showError(event.data);
        this.dispatchEvent(
          new CustomEvent('playproof:error', { detail: event.data })
        );
      }
    });

    // Initialize with canvas
    if (this.canvas) {
      try {
        await this.client.init(this.canvas);

        // Auto-start if attribute is set
        if (this.hasAttribute('auto-start')) {
          await this.client.start();
        }
      } catch (error) {
        this.showError(error as Error);
      }
    }
  }

  private setState(state: LifecycleState): void {
    this.state = state;
    this.updateUI();
    announce(getStateAnnouncement(state));
  }

  private updateUI(): void {
    if (!this.button || !this.statusText || !this.progressBar) return;

    switch (this.state) {
      case 'idle':
      case 'initializing':
        this.button.textContent = 'Loading...';
        this.button.disabled = true;
        this.statusText.textContent = '';
        this.progressBar.style.display = 'none';
        break;

      case 'ready':
        this.button.textContent = 'Start Verification';
        this.button.disabled = false;
        this.statusText.textContent = '';
        this.progressBar.style.display = 'none';
        break;

      case 'playing':
        this.button.textContent = 'Verifying...';
        this.button.disabled = true;
        this.statusText.textContent = 'Interact with the game area';
        this.progressBar.style.display = 'block';
        break;

      case 'processing':
        this.button.textContent = 'Processing...';
        this.button.disabled = true;
        this.statusText.textContent = 'Processing your verification';
        break;

      case 'complete':
        this.button.textContent = 'Try Again';
        this.button.disabled = false;
        this.progressBar.style.display = 'none';
        break;

      case 'error':
        this.button.textContent = 'Retry';
        this.button.disabled = false;
        this.progressBar.style.display = 'none';
        break;
    }
  }

  private updateProgress(progress: number): void {
    const progressInner = this.progressBar?.querySelector(
      '.progress-inner'
    ) as HTMLDivElement;
    if (progressInner) {
      progressInner.style.width = `${progress * 100}%`;
    }
  }

  private showResult(result: VerificationResult): void {
    if (!this.statusText) return;

    if (result.passed) {
      this.statusText.textContent = '✓ Verification Successful!';
      this.statusText.style.color = this._theme.success ?? DEFAULT_THEME.success;
    } else {
      this.statusText.textContent = '✗ Verification Failed';
      this.statusText.style.color = this._theme.error ?? DEFAULT_THEME.error;
    }
  }

  private showError(error: Error): void {
    if (!this.statusText) return;

    this.statusText.textContent = `Error: ${error.message}`;
    this.statusText.style.color = this._theme.error ?? DEFAULT_THEME.error;
  }

  private updateStyles(): void {
    const style = this.shadow.querySelector('style');
    if (style) {
      style.textContent = this.getStyles();
    }
  }

  private getStyles(): string {
    const t = this._theme;
    return `
      :host {
        display: block;
        font-family: system-ui, -apple-system, sans-serif;
      }

      .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 24px;
        border-radius: 12px;
        background: ${t.background ?? DEFAULT_THEME.background};
        border: 1px solid ${t.border ?? DEFAULT_THEME.border};
      }

      canvas {
        border-radius: 8px;
        background: ${t.surface ?? DEFAULT_THEME.surface};
        cursor: crosshair;
      }

      .button {
        padding: 12px 24px;
        font-size: 16px;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        background: ${t.primary ?? DEFAULT_THEME.primary};
        color: #fff;
      }

      .button:hover:not(:disabled) {
        transform: translateY(-1px);
        filter: brightness(1.1);
      }

      .button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .progress {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: ${t.border ?? DEFAULT_THEME.border};
        overflow: hidden;
        display: none;
      }

      .progress-inner {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, ${t.primary ?? DEFAULT_THEME.primary}, ${t.secondary ?? DEFAULT_THEME.secondary});
        transition: width 0.1s linear;
      }

      .status {
        color: ${t.textMuted ?? DEFAULT_THEME.textMuted};
        margin: 0;
        font-size: 14px;
        text-align: center;
        min-height: 20px;
      }
    `;
  }

  private render(): void {
    const width = parseInt(this.getAttribute('width') ?? '400', 10);
    const height = parseInt(this.getAttribute('height') ?? '300', 10);

    this.shadow.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="container">
        <canvas width="${width}" height="${height}"></canvas>
        <div class="progress">
          <div class="progress-inner"></div>
        </div>
        <button class="button" disabled>Loading...</button>
        <p class="status"></p>
      </div>
    `;

    // Get references
    this.container = this.shadow.querySelector('.container');
    this.canvas = this.shadow.querySelector('canvas');
    this.button = this.shadow.querySelector('.button');
    this.progressBar = this.shadow.querySelector('.progress');
    this.statusText = this.shadow.querySelector('.status');

    // Apply a11y attributes
    if (this.container) {
      applyContainerA11y(this.container);
    }
    if (this.canvas) {
      applyGameA11y(this.canvas);
    }

    // Button click handler
    this.button?.addEventListener('click', async () => {
      if (this.state === 'ready') {
        await this.start();
      } else if (this.state === 'complete' || this.state === 'error') {
        this.reset();
      }
    });
  }
}

/**
 * Define the custom element
 */
export function definePlayProofGameElement(
  tagName = 'play-proof-game'
): void {
  if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
    customElements.define(tagName, PlayProofGameElement);
  }
}

// Auto-register if in browser
if (typeof window !== 'undefined') {
  definePlayProofGameElement();
}
