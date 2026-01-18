/**
 * PlayProof SDK
 * Game-based captcha verification for better human/bot segmentation
 */

import { mergeConfig, validateThreshold } from './config';
import { calculateConfidence, createVerificationResult } from './verification';
import { createGame, getGameInfo, getGameInstructions, getRandomGameId } from './games/registry';
import type { PlayproofConfig, BehaviorData, VerificationResult, SDKHooks, BaseGame } from './types';

// Google Fonts import for all supported font families
const fontImportCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&family=Montserrat:wght@400;500;600;700&family=Nunito+Sans:wght@400;600;700&family=Open+Sans:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Source+Sans+3:wght@400;500;600;700&family=Work+Sans:wght@400;500;600;700&display=swap');
`;

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
  --playproof-border-radius: 0px;
  --playproof-spacing: 20px;
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
.playproof-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: calc(var(--playproof-spacing) * 0.5); }
.playproof-title { color: var(--playproof-text); font-size: 13px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: calc(var(--playproof-spacing) * 0.5); }
.playproof-logo { width: 22px; height: 22px; background: linear-gradient(135deg, var(--playproof-primary), var(--playproof-secondary)); border-radius: calc(var(--playproof-border-radius) * 0.4); display: flex; align-items: center; justify-content: center; }
.playproof-logo svg { width: 12px; height: 12px; fill: white; }
.playproof-timer { color: var(--playproof-text-muted); font-size: 11px; font-weight: 500; background: var(--playproof-surface); padding: calc(var(--playproof-spacing) * 0.25) calc(var(--playproof-spacing) * 0.5); border-radius: calc(var(--playproof-border-radius) * 0.33); }
.playproof-game-area { background: var(--playproof-surface); border-radius: calc(var(--playproof-border-radius) * 0.67); min-height: 280px; position: relative; overflow: hidden; cursor: crosshair; user-select: none; }
.playproof-instructions { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: var(--playproof-text); padding: calc(var(--playproof-spacing) * 1.5); width: 85%; max-width: 300px; }
.playproof-instructions-icon { width: 56px; height: 56px; margin: 0 auto var(--playproof-spacing); background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15)); border-radius: calc(var(--playproof-border-radius) * 1.33); display: flex; align-items: center; justify-content: center; animation: iconFloat 3s ease-in-out infinite; }
@keyframes iconFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.playproof-instructions-icon svg { width: 28px; height: 28px; fill: url(#playproof-icon-gradient); }
.playproof-instructions h3 { font-size: 18px; margin: 0 0 calc(var(--playproof-spacing) * 0.5) 0; font-weight: 700; background: linear-gradient(135deg, var(--playproof-text), var(--playproof-accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.02em; }
.playproof-instructions p { font-size: 13px; color: var(--playproof-text-muted); margin: 0 0 calc(var(--playproof-spacing) * 1.25) 0; line-height: 1.5; }
.playproof-start-btn { background: linear-gradient(135deg, var(--playproof-primary), var(--playproof-secondary)); color: white; border: none; padding: calc(var(--playproof-spacing) * 0.75) calc(var(--playproof-spacing) * 2); border-radius: calc(var(--playproof-border-radius) * 0.83); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1); position: relative; overflow: hidden; font-family: var(--playproof-font-family); }
.playproof-start-btn::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); transition: left 0.5s ease; }
.playproof-start-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1); }
.playproof-start-btn:hover::before { left: 100%; }
.playproof-start-btn:active { transform: translateY(0); }
.playproof-progress { margin-top: calc(var(--playproof-spacing) * 0.5); }
.playproof-progress-bar { height: 3px; background: var(--playproof-surface); border-radius: calc(var(--playproof-border-radius) * 0.17); overflow: hidden; }
.playproof-progress-fill { height: 100%; background: linear-gradient(90deg, var(--playproof-primary), var(--playproof-accent)); border-radius: calc(var(--playproof-border-radius) * 0.17); transition: width 0.1s linear; width: 0%; }
.playproof-footer { display: flex; align-items: center; justify-content: space-between; margin-top: calc(var(--playproof-spacing) * 0.5); padding-top: calc(var(--playproof-spacing) * 0.5); border-top: 1px solid var(--playproof-border); }
.playproof-branding { font-size: 10px; color: var(--playproof-text-muted); opacity: 0.8; }
.playproof-branding a { color: var(--playproof-accent); text-decoration: none; }
.playproof-result { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--playproof-surface); animation: fadeIn 0.3s ease; border-radius: calc(var(--playproof-border-radius) * 0.67); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.playproof-result-icon { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: calc(var(--playproof-spacing) * 0.875); }
.playproof-result-icon.success { background: rgba(16, 185, 129, 0.15); color: var(--playproof-success); box-shadow: 0 0 24px rgba(16, 185, 129, 0.2); }
.playproof-result-icon.error { background: rgba(239, 68, 68, 0.15); color: var(--playproof-error); box-shadow: 0 0 24px rgba(239, 68, 68, 0.2); }
.playproof-result-icon svg { width: 26px; height: 26px; }
.playproof-result-text { color: var(--playproof-text); font-size: 15px; font-weight: 600; }
.playproof-bubble { position: absolute; border-radius: 50%; cursor: pointer; animation: bubbleAppear 0.3s ease; transition: transform 0.1s ease; }
.playproof-bubble:hover { transform: scale(1.1); }
@keyframes bubbleAppear { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes bubblePop { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); } 100% { transform: scale(0); opacity: 0; } }
.playproof-bubble.popping { animation: bubblePop 0.2s ease forwards; pointer-events: none; }
`;

export class Playproof {
  private config: PlayproofConfig;
  private container: HTMLElement | null;
  private gameArea: HTMLElement | null;
  private game: BaseGame | null;
  private progressFill: HTMLElement | null;
  private timerDisplay: HTMLElement | null;
  private progressInterval: ReturnType<typeof setInterval> | null;
  private styleElement: HTMLStyleElement | null;
  private currentGameId: string;

  constructor(config: Partial<PlayproofConfig> = {}) {
    this.config = mergeConfig(config);
    this.container = null;
    this.gameArea = null;
    this.game = null;
    this.progressFill = null;
    this.timerDisplay = null;
    this.progressInterval = null;
    this.styleElement = null;
    this.currentGameId = '';

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
    const themeVars: Record<string, string | undefined> = {
      '--playproof-primary': theme.primary,
      '--playproof-secondary': theme.secondary,
      '--playproof-background': theme.background,
      '--playproof-surface': theme.surface,
      '--playproof-text': theme.text,
      '--playproof-text-muted': theme.textMuted,
      '--playproof-accent': theme.accent,
      '--playproof-success': theme.success,
      '--playproof-error': theme.error,
      '--playproof-border': theme.border,
      '--playproof-border-radius': theme.borderRadius !== undefined ? `${theme.borderRadius}px` : undefined,
      '--playproof-spacing': theme.spacing !== undefined ? `${theme.spacing}px` : undefined,
      '--playproof-font-family': theme.fontFamily ? `'${theme.fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` : undefined
    };

    for (const [prop, value] of Object.entries(themeVars)) {
      if (value) {
        this.container.style.setProperty(prop, value);
      }
    }
  }

  /**
   * Fetch branding settings from backend using API credentials
   */
  private async fetchBranding(): Promise<void> {
    const { apiKey, deploymentId } = this.config;

    console.log('[Playproof Debug] fetchBranding called with:', {
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'null',
      deploymentId: deploymentId || 'null'
    });

    if (!apiKey || !deploymentId) {
      console.log('[Playproof Debug] No credentials provided, using default theme');
      return; // No credentials provided, use default theme
    }

    try {
      // Import the hardcoded API URL
      const { PLAYPROOF_API_URL } = await import('./config');

      console.log('[Playproof Debug] Fetching branding from:', PLAYPROOF_API_URL);

      const requestBody = {
        path: 'deployments:getBrandingByCredentials',
        args: { apiKey, deploymentId },
      };

      console.log('[Playproof Debug] Request payload:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${PLAYPROOF_API_URL}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[Playproof Debug] Response status:', response.status, response.statusText);

      if (!response.ok) {
        console.warn('[Playproof] Failed to fetch branding settings - HTTP', response.status);
        return;
      }

      const rawData = await response.json();

      console.log('[Playproof Debug] Raw response:', JSON.stringify(rawData, null, 2));

      // Check for Convex errors (comes as 'errorMessage' not 'error')
      if (rawData.errorMessage) {
        console.warn(`[Playproof] Backend error: ${rawData.errorMessage}`);
        return;
      }

      // Convex returns data in { status: "success", value: {...} } format
      // Extract the actual value from the response
      const data = rawData.value !== undefined ? rawData.value : rawData;

      console.log('[Playproof Debug] Extracted data:', JSON.stringify(data, null, 2));

      // Check for application-level errors (from the query itself)
      if (data.error) {
        console.warn(`[Playproof] ${data.error}`);
        return;
      }

      if (data.success && data.theme) {
        console.log('[Playproof Debug] Theme received from backend:', data.theme);
        console.log('[Playproof Debug] Current theme before merge:', this.config.theme);

        // Merge fetched theme with config (filter out null/undefined values)
        const filteredTheme: Record<string, string> = {};
        for (const [key, value] of Object.entries(data.theme)) {
          if (value !== null && value !== undefined) {
            filteredTheme[key] = value as string;
          }
        }

        this.config.theme = {
          ...this.config.theme,
          ...filteredTheme,
        };

        console.log('[Playproof Debug] Theme after merge:', this.config.theme);

        // Update gameId if provided
        if (data.gameId) {
          console.log('[Playproof Debug] GameId from backend:', data.gameId);
          this.config.gameId = data.gameId;
        }

        console.log('[Playproof] ✅ Theme synced successfully from deployment:', deploymentId);
      } else {
        console.warn('[Playproof Debug] Response missing success or theme:', data);
      }
    } catch (error) {
      console.warn('[Playproof] Error fetching branding:', error);
    }
  }


  /**
   * Inject styles into the document
   */
  private injectStyles(): void {
    // Inject font import if not already present
    if (!document.getElementById('playproof-fonts')) {
      const fontStyle = document.createElement('style');
      fontStyle.id = 'playproof-fonts';
      fontStyle.textContent = fontImportCSS;
      document.head.appendChild(fontStyle);
    }

    // Inject main styles
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

    // Get game instructions for display
    let gameId: string = this.config.gameId || 'bubble-pop';
    if (gameId === 'random') {
      gameId = getRandomGameId();
      this.config.gameId = gameId as PlayproofConfig['gameId'];
    }
    const instructions = getGameInstructions(gameId);
    const gameInfo = getGameInfo(gameId);
    const duration = this.config.gameDuration || gameInfo.duration || 10000;
    const durationSec = Math.ceil(duration / 1000);

    container.className = 'playproof-container';
    container.innerHTML = `
      <div class="playproof-header">
        <h2 class="playproof-title">
          <span class="playproof-logo">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          </span>
          Verify you're human
        </h2>
        <span class="playproof-timer">${durationSec}s</span>
      </div>
      <div class="playproof-game-area">
        <div class="playproof-instructions">
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
          <h3>${instructions.title}</h3>
          <p>${instructions.description}</p>
          <button class="playproof-start-btn">Begin Challenge</button>
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
    startBtn?.addEventListener('click', () => this.startGame());

    return true;
  }

  /**
   * Start the verification game
   */
  async startGame(): Promise<void> {
    if (this.config.onStart) {
      this.config.onStart();
    }

    // Clear instructions
    const instructions = this.gameArea?.querySelector('.playproof-instructions');
    if (instructions) instructions.remove();

    // Determine which game to play
    let gameId: string = this.config.gameId || 'bubble-pop';
    if (gameId === 'random') {
      gameId = getRandomGameId();
    }
    this.currentGameId = gameId;

    // Get game info for duration
    const gameInfo = getGameInfo(gameId);
    const duration = this.config.gameDuration || gameInfo.duration || 10000;

    // Create SDK hooks for future use
    const hooks: SDKHooks = {
      onTelemetryBatch: this.config.hooks?.onTelemetryBatch || null,
      onAttemptEnd: this.config.hooks?.onAttemptEnd || null,
      regenerate: this.config.hooks?.regenerate || null
    };

    // Initialize game via registry
    this.game = createGame(gameId, this.gameArea!, {
      ...this.config,
      gameDuration: duration
    }, hooks);

    // For Three.js games, we need to await init
    if (gameInfo.isThree && this.game.init) {
      await this.game.init();
    }

    // Start progress animation
    const startTime = Date.now();

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
  private showResult(result: VerificationResult): void {
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
  async verify(): Promise<VerificationResult> {
    // Fetch branding from backend if credentials are provided
    await this.fetchBranding();

    return new Promise((resolve, reject) => {
      const originalOnSuccess = this.config.onSuccess;
      const originalOnFailure = this.config.onFailure;

      this.config.onSuccess = (result: VerificationResult) => {
        if (originalOnSuccess) originalOnSuccess(result);
        resolve(result);
      };

      this.config.onFailure = (result: VerificationResult) => {
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
