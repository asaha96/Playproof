/**
 * Playproof SDK
 * Game-based captcha verification for better human/bot segmentation
 */

import { mergeConfig, validateThreshold } from './config.js';
import { calculateConfidence, createVerificationResult } from './verification.js';
import { BubblePopGame } from './games/bubble-pop.js';
import { TargetClickGame } from './games/target-click.js';

// Available games for rotation
const AVAILABLE_GAMES = [
  { Game: BubblePopGame, name: 'Bubble Pop', description: 'Pop the bubbles as fast as you can!', icon: '🎮' },
  { Game: TargetClickGame, name: 'Target Click', description: 'Click the highlighted targets!', icon: '🎯' }
];

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
  --playproof-border-radius: 10px;
  --playproof-spacing: 10px;
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
.playproof-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.playproof-title { color: var(--playproof-text); font-size: 13px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 8px; }
.playproof-logo { width: 22px; height: 22px; background: linear-gradient(135deg, var(--playproof-primary), var(--playproof-secondary)); border-radius: 5px; display: flex; align-items: center; justify-content: center; }
.playproof-logo svg { width: 12px; height: 12px; fill: white; }
.playproof-timer { color: var(--playproof-text-muted); font-size: 11px; font-weight: 500; background: var(--playproof-surface); padding: 4px 8px; border-radius: 4px; }
.playproof-game-area { background: var(--playproof-surface); border-radius: 8px; min-height: 280px; position: relative; overflow: hidden; cursor: crosshair; user-select: none; }
.playproof-instructions { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--playproof-text); padding: 32px; background: rgba(0,0,0,0.2); backdrop-filter: blur(4px); z-index: 10; }
.playproof-instructions-content { transform: translateY(0); transition: transform 0.3s ease; }
.playproof-instructions-icon { width: 64px; height: 64px; margin: 0 auto 20px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2)); border-radius: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.05); }
.playproof-instructions-icon svg { width: 32px; height: 32px; fill: url(#playproof-icon-gradient); }
.playproof-instructions h3 { font-size: 20px; margin: 0 0 8px 0; font-weight: 700; color: var(--playproof-text); letter-spacing: -0.01em; }
.playproof-instructions p { font-size: 14px; color: var(--playproof-text-muted); margin: 0 0 32px 0; line-height: 1.6; max-width: 260px; margin-left: auto; margin-right: auto; }
.playproof-start-btn { background: var(--playproof-text); color: var(--playproof-background); border: none; width: 56px; height: 56px; border-radius: 50%; font-size: 20px; cursor: pointer; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); display: flex; align-items: center; justify-content: center; }
.playproof-start-btn:hover { transform: scale(1.1); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); background: white; }
.playproof-start-btn:active { transform: scale(0.95); }
.playproof-start-btn svg { width: 24px; height: 24px; fill: currentColor; }
.playproof-progress { margin-top: 8px; }
.playproof-progress-bar { height: 3px; background: var(--playproof-surface); border-radius: 2px; overflow: hidden; }
.playproof-progress-fill { height: 100%; background: linear-gradient(90deg, var(--playproof-primary), var(--playproof-accent)); border-radius: 2px; transition: width 0.1s linear; width: 0%; }
.playproof-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--playproof-border); }
.playproof-branding { font-size: 10px; color: var(--playproof-text-muted); opacity: 0.8; }
.playproof-branding a { color: var(--playproof-accent); text-decoration: none; }
.playproof-result { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--playproof-surface); animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.playproof-result-icon { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
.playproof-result-icon.success { background: rgba(16, 185, 129, 0.15); color: var(--playproof-success); box-shadow: 0 0 24px rgba(16, 185, 129, 0.2); }
.playproof-result-icon.error { background: rgba(239, 68, 68, 0.15); color: var(--playproof-error); box-shadow: 0 0 24px rgba(239, 68, 68, 0.2); }
.playproof-result-icon svg { width: 26px; height: 26px; }
.playproof-result-text { color: var(--playproof-text); font-size: 15px; font-weight: 600; }
.playproof-retry-btn { background: linear-gradient(135deg, var(--playproof-primary), var(--playproof-secondary)); color: white; border: none; width: 44px; height: 44px; border-radius: 50%; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25); margin-top: 16px; display: flex; align-items: center; justify-content: center; }
.playproof-retry-btn:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4); }
.playproof-retry-btn svg { width: 18px; height: 18px; fill: white; }
.playproof-bubble { position: absolute; border-radius: 50%; cursor: pointer; animation: bubbleAppear 0.3s ease; transition: transform 0.1s ease; }
.playproof-bubble:hover { transform: scale(1.1); }
@keyframes bubbleAppear { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes bubblePop { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); } 100% { transform: scale(0); opacity: 0; } }
.playproof-bubble.popping { animation: bubblePop 0.2s ease forwards; pointer-events: none; }
@keyframes targetPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes targetHit { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); } 100% { transform: scale(0); opacity: 0; } }
.playproof-target:hover { transform: scale(1.05); }
`;

export class Playproof {
  constructor(config = {}) {
    this.config = mergeConfig(config);
    this.container = null;
    this.gameArea = null;
    this.game = null;
    this.progressFill = null;
    this.timerDisplay = null;
    this.progressInterval = null;
    this.styleElement = null;

    // Game loop tracking: (Game1-Try1) -> (Game1-Try2) -> (Game2-Try1) -> (Game2-Try2) -> ...
    this.currentGameIndex = 0;
    this.currentTryCount = 0;
    this.maxTriesPerGame = 2;

    if (!validateThreshold(this.config.confidenceThreshold)) {
      console.warn('Playproof: Invalid confidenceThreshold, using default 0.7');
      this.config.confidenceThreshold = 0.7;
    }
  }

  /**
   * Get current game info based on game index
   */
  getCurrentGameInfo() {
    const gameIndex = this.currentGameIndex % AVAILABLE_GAMES.length;
    return AVAILABLE_GAMES[gameIndex];
  }

  /**
   * Apply theme colors as CSS custom properties
   */
  applyTheme() {
    const theme = this.config.theme;
    const themeVars = {
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
  injectStyles() {
    if (document.getElementById('playproof-styles')) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'playproof-styles';
    this.styleElement.textContent = themeCSS;
    document.head.appendChild(this.styleElement);
  }

  /**
   * Create the captcha UI
   */
  createUI() {
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
          <div class="playproof-instructions-content">
            <div class="playproof-instructions-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <defs>
                  <linearGradient id="playproof-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1"/>
                    <stop offset="100%" style="stop-color:#22d3ee"/>
                  </linearGradient>
                </defs>
                <path fill="url(#playproof-icon-gradient)" d="M21.58 16.09l-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75c1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4 2c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1zm2-3c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1z"/>
              </svg>
            </div>
            <h3>${this.getCurrentGameInfo().name}</h3>
            <p>${this.getCurrentGameInfo().description}</p>
            <button class="playproof-start-btn">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
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
    startBtn.addEventListener('click', () => this.startGame());

    return true;
  }

  /**
   * Start the verification game
   */
  startGame() {
    if (this.config.onStart) {
      this.config.onStart();
    }

    // Clear instructions
    const instructions = this.gameArea.querySelector('.playproof-instructions');
    if (instructions) instructions.remove();

    // Initialize game based on current game index
    const gameInfo = this.getCurrentGameInfo();
    this.game = new gameInfo.Game(this.gameArea, this.config);

    // Start progress animation
    const startTime = Date.now();
    const duration = this.config.gameDuration;

    this.progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      this.progressFill.style.width = `${progress}%`;

      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      this.timerDisplay.textContent = `${remaining}s`;

      if (this.config.onProgress) {
        this.config.onProgress(progress / 100);
      }
    }, 100);

    // Start game
    this.game.start((behaviorData) => {
      clearInterval(this.progressInterval);
      this.evaluateResult(behaviorData);
    });
  }

  /**
   * Evaluate game results
   */
  evaluateResult(behaviorData) {
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
  showResult(result) {
    const statusClass = result.passed ? 'success' : 'error';
    const icon = result.passed
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>';
    const text = result.passed ? 'Verification Complete!' : 'Verification Failed';

    // Show retry button if failed
    const retryButton = result.passed ? '' : `
          <button class="playproof-retry-btn">
            <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        `;

    this.gameArea.innerHTML = `
      <div class="playproof-result">
        <div class="playproof-result-icon ${statusClass}">
          ${icon}
        </div>
        <span class="playproof-result-text">${text}</span>
        ${retryButton}
      </div>
    `;

    // Bind retry button
    if (!result.passed) {
      setTimeout(() => {
        this.retryGame();
      }, 2000);

      const retryBtn = this.gameArea.querySelector('.playproof-retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.retryGame());
      }
    }

    // Update footer status
    const status = this.container.querySelector('.playproof-status');
    status.className = `playproof-status ${statusClass}`;
    status.innerHTML = result.passed
      ? `${icon} Verified`
      : `${icon} Not Verified`;
  }

  /**
   * Retry the game with new generation
   * After 2 tries on same game, switch to next game
   */
  retryGame() {
    this.currentTryCount++;

    // After maxTriesPerGame, switch to next game
    if (this.currentTryCount >= this.maxTriesPerGame) {
      this.currentGameIndex++;
      this.currentTryCount = 0;
    }

    // Reset progress bar
    this.progressFill.style.width = '0%';
    this.timerDisplay.textContent = `${Math.ceil(this.config.gameDuration / 1000)}s`;

    // Destroy old game if exists
    if (this.game) {
      this.game.destroy();
      this.game = null;
    }

    // Start a fresh game with new random generation
    this.startGame();
  }

  /**
   * Initialize and render the captcha
   */
  verify() {
    return new Promise((resolve, reject) => {
      const originalOnSuccess = this.config.onSuccess;
      const originalOnFailure = this.config.onFailure;

      this.config.onSuccess = (result) => {
        if (originalOnSuccess) originalOnSuccess(result);
        resolve(result);
      };

      this.config.onFailure = (result) => {
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
  destroy() {
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
