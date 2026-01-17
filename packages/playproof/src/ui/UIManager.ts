/**
 * Playproof UI Manager
 * Handles all UI rendering for consistent look across games
 */

import { theme, colors, spacing, radius, typography, shadows, gradients, components, transitions } from './design-tokens';
import { getAllKeyframes, animations } from './animations';
import type { PlayproofTheme, VerificationResult } from '../types';

// SVG Icons
const icons = {
    logo: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    gamepad: `<svg viewBox="0 0 24 24"><path d="M21.58 16.09l-1.09-7.66C20.21 6.46 18.52 5 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75c1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4 2c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1zm2-3c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1z"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    error: `<svg viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>`,
};

/**
 * Generate complete CSS for the SDK
 */
function generateCSS(customTheme: PlayproofTheme = {}): string {
    const c = { ...colors, ...customTheme };

    return `
${getAllKeyframes()}

.playproof-container {
  --pp-primary: ${c.primary};
  --pp-secondary: ${c.secondary};
  --pp-background: ${colors.background};
  --pp-surface: ${colors.surface};
  --pp-text: ${c.text};
  --pp-text-muted: ${c.textMuted};
  --pp-accent: ${c.accent};
  --pp-success: ${c.success};
  --pp-error: ${c.error};
  --pp-border: ${colors.border};
  
  font-family: ${typography.fontFamily};
  background: ${colors.backgroundGlass};
  backdrop-filter: blur(${components.container.backdropBlur}px);
  -webkit-backdrop-filter: blur(${components.container.backdropBlur}px);
  border: 1px solid ${colors.borderLight};
  border-radius: ${components.container.borderRadius}px;
  padding: ${components.container.padding}px;
  max-width: ${components.container.maxWidth}px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: ${shadows.lg}, ${shadows.inner};
}

.playproof-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${spacing.md}px;
}

.playproof-title {
  color: ${colors.text};
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${typography.fontWeight.semibold};
  margin: 0;
  display: flex;
  align-items: center;
  gap: ${spacing.sm}px;
}

.playproof-logo {
  width: 24px;
  height: 24px;
  background: ${gradients.primary};
  border-radius: ${radius.sm}px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${shadows.glow};
}

.playproof-logo svg {
  width: 14px;
  height: 14px;
  fill: white;
}

.playproof-timer {
  color: ${colors.textMuted};
  font-size: ${typography.fontSize.xs}px;
  font-weight: ${typography.fontWeight.medium};
  background: ${colors.surfaceLight};
  padding: ${spacing.xs}px ${spacing.sm}px;
  border-radius: ${radius.sm}px;
  font-variant-numeric: tabular-nums;
}

.playproof-game-area {
  background: ${colors.surfaceGlass};
  border-radius: ${components.gameArea.borderRadius}px;
  min-height: ${components.gameArea.minHeight}px;
  position: relative;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
  border: 1px solid ${colors.border};
}

.playproof-instructions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: ${colors.text};
  padding: ${spacing.xl}px;
  width: 85%;
  max-width: 300px;
  animation: ${animations.slideUp};
}

.playproof-instructions-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto ${spacing.lg}px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1));
  border-radius: ${radius.xl}px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${animations.float};
  border: 1px solid ${colors.borderGlow};
}

.playproof-instructions-icon svg {
  width: 32px;
  height: 32px;
  fill: ${colors.primary};
}

.playproof-instructions h3 {
  font-size: ${typography.fontSize.xl}px;
  margin: 0 0 ${spacing.sm}px 0;
  font-weight: ${typography.fontWeight.bold};
  background: linear-gradient(135deg, ${colors.text}, ${colors.accent});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.playproof-instructions p {
  font-size: ${typography.fontSize.sm}px;
  color: ${colors.textMuted};
  margin: 0 0 ${spacing.xl}px 0;
  line-height: ${typography.lineHeight.relaxed};
}

.playproof-start-btn {
  background: ${gradients.primary};
  color: white;
  border: none;
  height: ${components.button.height}px;
  padding: 0 ${components.button.paddingX}px;
  border-radius: ${components.button.borderRadius}px;
  font-size: ${typography.fontSize.md}px;
  font-weight: ${typography.fontWeight.semibold};
  cursor: pointer;
  transition: all ${transitions.normal};
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35), ${shadows.inner};
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${spacing.sm}px;
}

.playproof-start-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: ${gradients.shimmer};
  transition: left 0.6s ease;
}

.playproof-start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(99, 102, 241, 0.45), ${shadows.inner};
}

.playproof-start-btn:hover::before {
  left: 100%;
}

.playproof-start-btn:active {
  transform: translateY(0);
}

.playproof-start-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.playproof-progress {
  margin-top: ${spacing.md}px;
}

.playproof-progress-bar {
  height: ${components.progress.height}px;
  background: ${colors.surfaceLight};
  border-radius: ${components.progress.borderRadius}px;
  overflow: hidden;
  position: relative;
}

.playproof-progress-fill {
  height: 100%;
  background: ${gradients.accent};
  border-radius: ${components.progress.borderRadius}px;
  transition: width 100ms linear;
  width: 0%;
  position: relative;
  box-shadow: 0 0 12px ${colors.accentGlow};
}

.playproof-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${spacing.md}px;
  padding-top: ${spacing.md}px;
  border-top: 1px solid ${colors.border};
}

.playproof-branding {
  font-size: ${typography.fontSize.xs}px;
  color: ${colors.textDim};
}

.playproof-branding a {
  color: ${colors.textMuted};
  text-decoration: none;
  transition: color ${transitions.fast};
}

.playproof-branding a:hover {
  color: ${colors.accent};
}

.playproof-status {
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${typography.fontWeight.medium};
  display: flex;
  align-items: center;
  gap: ${spacing.xs}px;
}

.playproof-status svg {
  width: 16px;
  height: 16px;
}

.playproof-status.success {
  color: ${colors.success};
}

.playproof-status.success svg {
  fill: ${colors.success};
}

.playproof-status.error {
  color: ${colors.error};
}

.playproof-status.error svg {
  fill: ${colors.error};
}

/* Result overlay */
.playproof-result {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${colors.surfaceGlass};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: ${animations.fadeIn};
}

.playproof-result-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${spacing.lg}px;
  animation: ${animations.successPop};
}

.playproof-result-icon.success {
  background: rgba(16, 185, 129, 0.12);
  box-shadow: 0 0 32px ${colors.successGlow};
}

.playproof-result-icon.success svg {
  fill: ${colors.success};
}

.playproof-result-icon.error {
  background: rgba(239, 68, 68, 0.12);
  box-shadow: 0 0 32px ${colors.errorGlow};
}

.playproof-result-icon.error svg {
  fill: ${colors.error};
}

.playproof-result-icon svg {
  width: 28px;
  height: 28px;
}

.playproof-result-text {
  color: ${colors.text};
  font-size: ${typography.fontSize.lg}px;
  font-weight: ${typography.fontWeight.semibold};
}

/* Bubble game styles */
.playproof-bubble {
  position: absolute;
  border-radius: 50%;
  cursor: pointer;
  animation: ${animations.bubbleAppear};
  transition: transform ${transitions.fast};
  box-shadow: 
    0 4px 20px rgba(99, 102, 241, 0.35),
    inset 0 -3px 12px rgba(0, 0, 0, 0.2),
    inset 0 3px 12px rgba(255, 255, 255, 0.25);
}

.playproof-bubble:hover {
  transform: scale(1.08);
}

.playproof-bubble.popping {
  animation: ${animations.bubblePop};
  pointer-events: none;
}
`;
}

/**
 * UI Manager - Factory for creating SDK UI elements
 */
export class UIManager {
    private container: HTMLElement | null = null;
    private gameArea: HTMLElement | null = null;
    private progressFill: HTMLElement | null = null;
    private timerDisplay: HTMLElement | null = null;
    private styleElement: HTMLStyleElement | null = null;
    private customTheme: PlayproofTheme;

    constructor(customTheme: PlayproofTheme = {}) {
        this.customTheme = customTheme;
    }

    /**
     * Inject CSS styles into the document
     */
    injectStyles(): void {
        if (document.getElementById('playproof-styles')) return;

        this.styleElement = document.createElement('style');
        this.styleElement.id = 'playproof-styles';
        this.styleElement.textContent = generateCSS(this.customTheme);
        document.head.appendChild(this.styleElement);
    }

    /**
     * Create the main container UI
     */
    createContainer(
        containerId: string,
        gameTitle: string,
        gameDescription: string,
        durationSec: number,
        onStart: () => void
    ): { container: HTMLElement; gameArea: HTMLElement } | null {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Playproof: Container #${containerId} not found`);
            return null;
        }

        this.injectStyles();

        container.className = 'playproof-container';
        container.innerHTML = `
      <div class="playproof-header">
        <h2 class="playproof-title">
          <span class="playproof-logo">${icons.logo}</span>
          Verify you're human
        </h2>
        <span class="playproof-timer">${durationSec}s</span>
      </div>
      <div class="playproof-game-area">
        <div class="playproof-instructions">
          <div class="playproof-instructions-icon">${icons.gamepad}</div>
          <h3>${gameTitle}</h3>
          <p>${gameDescription}</p>
          <button class="playproof-start-btn">
            Begin Challenge
            ${icons.arrow}
          </button>
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

        // Apply custom theme colors
        this.applyTheme();

        // Bind start button
        const startBtn = container.querySelector('.playproof-start-btn');
        startBtn?.addEventListener('click', onStart);

        return {
            container,
            gameArea: this.gameArea!
        };
    }

    /**
     * Apply custom theme colors
     */
    private applyTheme(): void {
        if (!this.container) return;

        const themeVars: Record<string, string | undefined> = {
            '--pp-primary': this.customTheme.primary,
            '--pp-secondary': this.customTheme.secondary,
            '--pp-background': this.customTheme.background,
            '--pp-surface': this.customTheme.surface,
            '--pp-text': this.customTheme.text,
            '--pp-text-muted': this.customTheme.textMuted,
            '--pp-accent': this.customTheme.accent,
            '--pp-success': this.customTheme.success,
            '--pp-error': this.customTheme.error,
            '--pp-border': this.customTheme.border,
        };

        for (const [prop, value] of Object.entries(themeVars)) {
            if (value) {
                this.container.style.setProperty(prop, value);
            }
        }
    }

    /**
     * Clear instructions and prepare game area
     */
    clearInstructions(): void {
        const instructions = this.gameArea?.querySelector('.playproof-instructions');
        if (instructions) instructions.remove();
    }

    /**
     * Update progress bar and timer
     */
    updateProgress(progress: number, remainingSec: number): void {
        if (this.progressFill) {
            this.progressFill.style.width = `${Math.min(100, progress * 100)}%`;
        }
        if (this.timerDisplay) {
            this.timerDisplay.textContent = `${Math.max(0, remainingSec)}s`;
        }
    }

    /**
     * Show verification result
     */
    showResult(result: VerificationResult): void {
        if (!this.gameArea || !this.container) return;

        const statusClass = result.passed ? 'success' : 'error';
        const icon = result.passed ? icons.check : icons.error;
        const text = result.passed ? 'Verification Complete!' : 'Verification Failed';

        this.gameArea.innerHTML = `
      <div class="playproof-result">
        <div class="playproof-result-icon ${statusClass}">${icon}</div>
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
     * Get game area element
     */
    getGameArea(): HTMLElement | null {
        return this.gameArea;
    }

    /**
     * Clean up
     */
    destroy(): void {
        if (this.container) {
            this.container.innerHTML = '';
            this.container.className = '';
        }
        this.container = null;
        this.gameArea = null;
        this.progressFill = null;
        this.timerDisplay = null;
    }
}

export default UIManager;
