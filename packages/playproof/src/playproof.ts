/**
 * Playproof SDK
 * Game-based captcha verification for better human/bot segmentation
 */

import type { BehaviorData, PlayproofConfig, PlayproofUserConfig, PlayproofVerificationResult, PlayproofTheme } from '@playproof/shared';
import { mergeConfig, validateThreshold } from './config.js';
import { calculateConfidence, createVerificationResult } from './verification.js';
import { BubblePopGame } from './games/bubble-pop.js';

// Inline CSS as string
const themeCSS = `
.playproof-container {
  --playproof-primary: #6366f1;
  --playproof-secondary: #8b5cf6;
  --playproof-background: #1e1e2e;
  --playproof-surface: #2a2a3e;
  --playproof-text: #f5f5f5;
  --playproof-text-muted: #a1a1aa;
  --playproof-accent: #22d3ee;
  --playproof-success: #10b981;
  --playproof-error: #ef4444;
  --playproof-border: #3f3f5a;
  --playproof-border-radius: 12px;
  --playproof-spacing: 16px;
  --playproof-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-family: var(--playproof-font-family);
  background: var(--playproof-background);
  border: 1px solid var(--playproof-border);
  border-radius: var(--playproof-border-radius);
  padding: var(--playproof-spacing);
  max-width: 400px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}
.playproof-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--playproof-spacing); }
.playproof-title { color: var(--playproof-text); font-size: 14px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
.playproof-logo { width: 24px; height: 24px; background: linear-gradient(135deg, var(--playproof-primary), var(--playproof-secondary)); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.playproof-logo svg { width: 14px; height: 14px; fill: white; }
.playproof-timer { color: var(--playproof-text-muted); font-size: 12px; font-weight: 500; }
.playproof-game-area { background: var(--playproof-surface); border-radius: 8px; min-height: 250px; position: relative; overflow: hidden; cursor: crosshair; user-select: none; }
.playproof-instructions { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: var(--playproof-text); padding: 20px; }
.playproof-instructions h3 { font-size: 16px; margin: 0 0 8px 0; font-weight: 600; }
.playproof-instructions p { font-size: 13px; color: var(--playproof-text-muted); margin: 0 0 16px 0; }
.playproof-start-btn { background: linear-gradient(135deg, var(--playproof-primary), var(--playproof-secondary)); color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.playproof-start-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
.playproof-progress { margin-top: var(--playproof-spacing); }
.playproof-progress-bar { height: 4px; background: var(--playproof-surface); border-radius: 2px; overflow: hidden; }
.playproof-progress-fill { height: 100%; background: linear-gradient(90deg, var(--playproof-primary), var(--playproof-accent)); border-radius: 2px; transition: width 0.1s linear; width: 0%; }
.playproof-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--playproof-border); }
.playproof-branding { font-size: 11px; color: var(--playproof-text-muted); }
.playproof-branding a { color: var(--playproof-accent); text-decoration: none; }
.playproof-result { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--playproof-surface); animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.playproof-result-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.playproof-result-icon.success { background: rgba(16, 185, 129, 0.2); color: var(--playproof-success); }
.playproof-result-icon.error { background: rgba(239, 68, 68, 0.2); color: var(--playproof-error); }
.playproof-result-icon svg { width: 24px; height: 24px; }
.playproof-result-text { color: var(--playproof-text); font-size: 14px; font-weight: 600; }
.playproof-bubble { position: absolute; border-radius: 50%; cursor: pointer; animation: bubbleAppear 0.3s ease; transition: transform 0.1s ease; }
.playproof-bubble:hover { transform: scale(1.1); }
@keyframes bubbleAppear { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes bubblePop { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); } 100% { transform: scale(0); opacity: 0; } }
.playproof-bubble.popping { animation: bubblePop 0.2s ease forwards; pointer-events: none; }
`;

declare global {
  interface Window {
    Playproof: typeof Playproof;
  }
}

export class Playproof {
  private config: PlayproofConfig;
  private container: HTMLElement | null = null;
  private gameArea: HTMLElement | null = null;
  private game: BubblePopGame | null = null;
  private progressFill: HTMLElement | null = null;
  private timerDisplay: HTMLElement | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor(config: PlayproofUserConfig = {}) {
    this.config = mergeConfig(config);

    if (!validateThreshold(this.config.confidenceThreshold)) {
      console.warn('Playproof: Invalid confidenceThreshold, using default 0.7');
      this.config.confidenceThreshold = 0.7;
    }
  }

  /**
   * Apply theme colors as CSS custom properties
   */
  private applyTheme(): void {
    if (!this.container) return;

    const theme = this.config.theme;
    const themeVars: Record<string, string> = {
      '--playproof-primary': theme.primary,
      '--playproof-secondary': theme.secondary,
      '--playproof-background': theme.background,
      '--playproof-surface': theme.surface,
      '--playproof-text': theme.text,
      '--playproof-text-muted': theme.textMuted,
      '--playproof-accent': theme.accent,
      '--playproof-success': theme.success,
      '--playproof-error': theme.error,
      '--playproof-border': theme.border
    };

    for (const [prop, value] of Object.entries(themeVars)) {
      if (value) {
        this.container.style.setProperty(prop, value);
      }
    }
  }

  /**
   * Inject styles into the document
   */
  private injectStyles(): void {
    if (document.getElementById('playproof-styles')) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'playproof-styles';
    this.styleElement.textContent = themeCSS;
    document.head.appendChild(this.styleElement);
  }

  /**
   * Create the captcha UI
   */
  private createUI(): boolean {
    const container = document.getElementById(this.config.containerId);
    if (!container) {
      console.error(`Playproof: Container #${this.config.containerId} not found`);
      return false;
    }

    this.injectStyles();

    container.className = 'playproof-container';
    container.innerHTML = `
      <div class="playproof-header">
        <h2 class="playproof-title">
          <span class="playproof-logo">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </span>
          Verify you're human
        </h2>
        <span class="playproof-timer">10s</span>
      </div>
      <div class="playproof-game-area">
        <div class="playproof-instructions">
          <h3>Quick Game Challenge</h3>
          <p>Pop the bubbles as fast as you can!</p>
          <button class="playproof-start-btn">Start Verification</button>
        </div>
      </div>
      <div class="playproof-progress">
        <div class="playproof-progress-bar">
          <div class="playproof-progress-fill"></div>
        </div>
      </div>
      <div class="playproof-footer">
        <span class="playproof-branding">Protected by <a href="#">Playproof</a></span>
        <span class="playproof-status"></span>
      </div>
    `;

    this.container = container;
    this.gameArea = container.querySelector('.playproof-game-area');
    this.progressFill = container.querySelector('.playproof-progress-fill');
    this.timerDisplay = container.querySelector('.playproof-timer');

    this.applyTheme();

    // Bind start button
    const startBtn = container.querySelector('.playproof-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startGame());
    }

    return true;
  }

  /**
   * Start the verification game
   */
  private startGame(): void {
    if (this.config.onStart) {
      this.config.onStart();
    }

    // Clear instructions
    const instructions = this.gameArea?.querySelector('.playproof-instructions');
    if (instructions) instructions.remove();

    if (!this.gameArea) return;

    // Initialize game
    this.game = new BubblePopGame(this.gameArea, this.config);

    // Start progress animation
    const startTime = Date.now();
    const duration = this.config.gameDuration;

    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      if (this.progressFill) {
        this.progressFill.style.width = `${progress}%`;
      }

      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      if (this.timerDisplay) {
        this.timerDisplay.textContent = `${remaining}s`;
      }

      if (this.config.onProgress) {
        this.config.onProgress(progress / 100);
      }
    }, 100);

    // Start game
    this.game.start((behaviorData: BehaviorData) => {
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
      }
      this.evaluateResult(behaviorData);
    });
  }

  /**
   * Evaluate game results
   */
  private evaluateResult(behaviorData: BehaviorData): void {
    const score = calculateConfidence(behaviorData);
    const result = createVerificationResult(
      score,
      this.config.confidenceThreshold,
      behaviorData
    );

    this.showResult(result);

    if (result.passed) {
      if (this.config.onSuccess) {
        this.config.onSuccess(result);
      }
    } else {
      if (this.config.onFailure) {
        this.config.onFailure(result);
      }
    }
  }

  /**
   * Show verification result
   */
  private showResult(result: PlayproofVerificationResult): void {
    if (!this.gameArea || !this.container) return;

    const statusClass = result.passed ? 'success' : 'error';
    const icon = result.passed
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>';
    const text = result.passed ? 'Verification Complete!' : 'Verification Failed';

    this.gameArea.innerHTML = `
      <div class="playproof-result">
        <div class="playproof-result-icon ${statusClass}">
          ${icon}
        </div>
        <span class="playproof-result-text">${text}</span>
      </div>
    `;

    // Update footer status
    const status = this.container.querySelector('.playproof-status');
    if (status) {
      status.className = `playproof-status ${statusClass}`;
      status.innerHTML = result.passed
        ? `${icon} Verified`
        : `${icon} Not Verified`;
    }
  }

  /**
   * Initialize and render the captcha
   */
  verify(): Promise<PlayproofVerificationResult> {
    return new Promise((resolve, reject) => {
      const originalOnSuccess = this.config.onSuccess;
      const originalOnFailure = this.config.onFailure;

      this.config.onSuccess = (result: PlayproofVerificationResult) => {
        if (originalOnSuccess) originalOnSuccess(result);
        resolve(result);
      };

      this.config.onFailure = (result: PlayproofVerificationResult) => {
        if (originalOnFailure) originalOnFailure(result);
        resolve(result); // Still resolve, but with passed: false
      };

      if (!this.createUI()) {
        reject(new Error('Failed to create UI'));
      }
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.game) {
      this.game.destroy();
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    if (this.container) {
      this.container.innerHTML = '';
      this.container.className = '';
    }
  }
}

// Export for different module systems
export default Playproof;
