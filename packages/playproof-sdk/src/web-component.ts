// PlayProof Web Component
import { PlayProofClient } from './client';
import { SimpleGame } from './game/SimpleGame';
import type { AttemptResultResponse, ChallengeResponse } from './types';

// CSS styles for the component
const styles = `
  :host {
    display: block;
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .playproof-container {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: var(--playproof-bg, #1e1b4b);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  }
  
  .playproof-canvas-container {
    position: relative;
  }
  
  .playproof-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 24px;
    text-align: center;
  }
  
  .playproof-overlay.hidden {
    display: none;
  }
  
  .playproof-title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 8px;
    background: linear-gradient(135deg, var(--playproof-primary, #6366f1), var(--playproof-secondary, #f59e0b));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .playproof-subtitle {
    font-size: 14px;
    color: #a5a5a5;
    margin-bottom: 24px;
  }
  
  .playproof-btn {
    padding: 12px 32px;
    font-size: 16px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    background: linear-gradient(135deg, var(--playproof-primary, #6366f1), #818cf8);
    color: white;
  }
  
  .playproof-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }
  
  .playproof-btn:active {
    transform: translateY(0);
  }
  
  .playproof-result {
    margin-top: 16px;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
  }
  
  .playproof-result.pass {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }
  
  .playproof-result.fail {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
  
  .playproof-result.pending {
    background: rgba(99, 102, 241, 0.2);
    color: #818cf8;
  }
  
  .playproof-result.regenerate {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }
  
  .playproof-loading {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .playproof-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #4c4c6c;
    border-top-color: var(--playproof-primary, #6366f1);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

type GameState = 'idle' | 'loading' | 'playing' | 'processing' | 'complete';

export class PlayProofGameElement extends HTMLElement {
  private shadow: ShadowRoot;
  private client: PlayProofClient | null = null;
  private game: SimpleGame | null = null;
  private state: GameState = 'idle';
  private result: AttemptResultResponse | null = null;
  private challenge: ChallengeResponse | null = null;

  // Config
  private apiUrl: string = '';
  private gameDuration: number = 3000;
  private width: number = 400;
  private height: number = 300;
  private primaryColor: string = '#6366f1';
  private secondaryColor: string = '#f59e0b';
  private backgroundColor: string = '#1e1b4b';

  static get observedAttributes() {
    return [
      'api-url',
      'game-duration',
      'width',
      'height',
      'theme-primary',
      'theme-secondary',
      'theme-background',
    ];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.readAttributes();
    this.render();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  attributeChangedCallback(_name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    this.readAttributes();
    this.render();
  }

  private readAttributes() {
    this.apiUrl = this.getAttribute('api-url') || 'http://localhost:3001';
    this.gameDuration = parseInt(this.getAttribute('game-duration') || '3000', 10);
    this.width = parseInt(this.getAttribute('width') || '400', 10);
    this.height = parseInt(this.getAttribute('height') || '300', 10);
    this.primaryColor = this.getAttribute('theme-primary') || '#6366f1';
    this.secondaryColor = this.getAttribute('theme-secondary') || '#f59e0b';
    this.backgroundColor = this.getAttribute('theme-background') || '#1e1b4b';
  }

  private hexToNumber(hex: string): number {
    return parseInt(hex.replace('#', ''), 16);
  }

  private render() {
    this.shadow.innerHTML = `
      <style>
        ${styles}
        :host {
          --playproof-primary: ${this.primaryColor};
          --playproof-secondary: ${this.secondaryColor};
          --playproof-bg: ${this.backgroundColor};
        }
      </style>
      <div class="playproof-container" style="width: ${this.width}px;">
        <div class="playproof-canvas-container" id="canvas-container" style="height: ${this.height}px;">
        </div>
        <div class="playproof-overlay" id="overlay">
          ${this.renderOverlayContent()}
        </div>
      </div>
    `;

    // Attach event listeners
    const startBtn = this.shadow.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.startVerification());
    }

    const retryBtn = this.shadow.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.startVerification());
    }
  }

  private renderOverlayContent(): string {
    switch (this.state) {
      case 'idle':
        return `
          <div class="playproof-title">PlayProof</div>
          <div class="playproof-subtitle">Verify you're human by playing a quick game</div>
          <button class="playproof-btn" id="start-btn">Start Verification</button>
        `;
      
      case 'loading':
        return `
          <div class="playproof-loading">
            <div class="playproof-spinner"></div>
            <span>Preparing challenge...</span>
          </div>
        `;
      
      case 'playing':
        return ''; // Hide overlay during gameplay
      
      case 'processing':
        return `
          <div class="playproof-loading">
            <div class="playproof-spinner"></div>
            <span>Verifying...</span>
          </div>
        `;
      
      case 'complete':
        const resultClass = this.result?.result || 'pending';
        const resultText = this.getResultText();
        const showRetry = this.result?.result === 'fail' || this.result?.result === 'regenerate';
        
        return `
          <div class="playproof-result ${resultClass}">${resultText}</div>
          ${showRetry ? '<button class="playproof-btn" id="retry-btn" style="margin-top: 16px;">Try Again</button>' : ''}
        `;
      
      default:
        return '';
    }
  }

  private getResultText(): string {
    if (!this.result) return 'Unknown result';
    
    switch (this.result.result) {
      case 'pass':
        return '✓ Verification Passed';
      case 'fail':
        return '✗ Verification Failed';
      case 'regenerate':
        return '⟳ Please try again';
      case 'pending':
        return '⋯ Processing...';
      default:
        return 'Unknown result';
    }
  }

  private async startVerification() {
    this.cleanup();
    
    this.state = 'loading';
    this.render();

    try {
      // Create client
      this.client = new PlayProofClient({
        apiUrl: this.apiUrl,
        gameDuration: this.gameDuration,
        onAttemptEnd: (result) => this.handleAttemptEnd(result),
        onRegenerate: (reason) => this.handleRegenerate(reason),
      });

      // Get challenge
      this.challenge = await this.client.createChallenge();

      // Create game
      const canvasContainer = this.shadow.getElementById('canvas-container');
      if (!canvasContainer) throw new Error('Canvas container not found');

      this.game = new SimpleGame(
        {
          width: this.width,
          height: this.height,
          seed: this.challenge.seed,
          rulesetId: this.challenge.rulesetId,
        },
        {
          onGameStart: () => {},
          onGameEnd: () => {},
        }
      );

      this.game.setColors(
        this.hexToNumber(this.primaryColor),
        this.hexToNumber(this.secondaryColor),
        this.hexToNumber(this.backgroundColor)
      );

      const canvas = await this.game.init(canvasContainer);
      
      // Mount input collector to canvas
      this.client.mount(canvas);

      // Update state and hide overlay
      this.state = 'playing';
      this.render();
      
      const overlay = this.shadow.getElementById('overlay');
      if (overlay) overlay.classList.add('hidden');

      // Start the game
      this.game.start();

    } catch (error) {
      console.error('Failed to start verification:', error);
      this.state = 'idle';
      this.render();
    }
  }

  private handleAttemptEnd(result: AttemptResultResponse) {
    this.result = result;
    this.state = 'complete';
    this.render();

    const overlay = this.shadow.getElementById('overlay');
    if (overlay) overlay.classList.remove('hidden');

    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('playproof-result', {
      detail: result,
      bubbles: true,
      composed: true,
    }));
  }

  private handleRegenerate(reason: string) {
    console.log('Regenerate requested:', reason);
    this.result = {
      attemptId: this.challenge?.attemptId || '',
      result: 'regenerate',
      reason,
    };
    this.state = 'complete';
    this.render();

    const overlay = this.shadow.getElementById('overlay');
    if (overlay) overlay.classList.remove('hidden');
  }

  private cleanup() {
    if (this.game) {
      this.game.destroy();
      this.game = null;
    }
    if (this.client) {
      this.client.cleanup();
      this.client = null;
    }
    this.result = null;
    this.challenge = null;

    // Clear canvas container
    const canvasContainer = this.shadow.getElementById('canvas-container');
    if (canvasContainer) {
      canvasContainer.innerHTML = '';
    }
  }
}

/**
 * Register the custom element
 */
export function definePlayProofGameElement(tagName = 'play-proof-game') {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, PlayProofGameElement);
  }
}

// Auto-register if not in a module context
if (typeof window !== 'undefined') {
  definePlayProofGameElement();
}
