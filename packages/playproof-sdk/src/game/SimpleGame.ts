// Simple PixiJS Game - Catch the falling targets
import { Application, Graphics, Text, TextStyle } from 'pixi.js';
import type { GameConfig } from '../types';

export interface SimpleGameCallbacks {
  onGameEnd: (score: number) => void;
  onGameStart: () => void;
}

export class SimpleGame {
  private app: Application | null = null;
  private config: GameConfig;
  private callbacks: SimpleGameCallbacks;
  private score: number = 0;
  private timeRemaining: number = 3000;
  private targets: Graphics[] = [];
  private isRunning: boolean = false;
  private animationId: number | null = null;
  private lastTime: number = 0;

  // Theme colors
  private primaryColor: number = 0x6366f1;
  private secondaryColor: number = 0xf59e0b;
  private backgroundColor: number = 0x1e1b4b;

  constructor(config: GameConfig, callbacks: SimpleGameCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.timeRemaining = 3000; // 3 seconds
  }

  setColors(primary?: number, secondary?: number, background?: number): void {
    if (primary !== undefined) this.primaryColor = primary;
    if (secondary !== undefined) this.secondaryColor = secondary;
    if (background !== undefined) this.backgroundColor = background;
  }

  async init(container: HTMLElement): Promise<HTMLCanvasElement> {
    this.app = new Application();
    
    await this.app.init({
      width: this.config.width,
      height: this.config.height,
      backgroundColor: this.backgroundColor,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);
    
    // Set up click handler
    this.app.canvas.addEventListener('pointerdown', this.handleClick.bind(this));
    
    return this.app.canvas;
  }

  start(): void {
    if (!this.app || this.isRunning) return;
    
    this.isRunning = true;
    this.score = 0;
    this.timeRemaining = 3000;
    this.targets = [];
    this.lastTime = performance.now();
    
    this.callbacks.onGameStart();
    this.spawnTarget();
    this.gameLoop();
  }

  private gameLoop(): void {
    if (!this.isRunning || !this.app) return;

    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.timeRemaining -= deltaTime;

    // Update targets
    this.updateTargets(deltaTime);

    // Update UI
    this.renderUI();

    // Spawn new targets periodically
    if (Math.random() < 0.02 && this.targets.length < 5) {
      this.spawnTarget();
    }

    // Check game end
    if (this.timeRemaining <= 0) {
      this.end();
      return;
    }

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private spawnTarget(): void {
    if (!this.app) return;

    // Use seed for deterministic randomness
    const random = this.seededRandom();
    
    const target = new Graphics();
    const radius = 20 + random() * 20;
    const x = radius + random() * (this.config.width - radius * 2);
    const y = -radius;
    
    target.circle(0, 0, radius);
    target.fill({ color: this.secondaryColor });
    target.stroke({ color: this.primaryColor, width: 3 });
    
    target.x = x;
    target.y = y;
    (target as any).radius = radius;
    (target as any).speed = 100 + random() * 150;
    (target as any).hit = false;

    this.app.stage.addChild(target);
    this.targets.push(target);
  }

  private updateTargets(deltaTime: number): void {
    if (!this.app) return;

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i];
      const speed = (target as any).speed;
      
      target.y += speed * (deltaTime / 1000);

      // Remove if off screen
      if (target.y > this.config.height + 50) {
        this.app.stage.removeChild(target);
        this.targets.splice(i, 1);
      }
    }
  }

  private handleClick(event: PointerEvent): void {
    if (!this.app || !this.isRunning) return;

    const rect = this.app.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (this.config.width / rect.width);
    const y = (event.clientY - rect.top) * (this.config.height / rect.height);

    // Check hit on targets
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const target = this.targets[i];
      const radius = (target as any).radius;
      const dx = target.x - x;
      const dy = target.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius && !(target as any).hit) {
        (target as any).hit = true;
        this.score += 10;
        
        // Animate hit
        target.alpha = 0.5;
        target.scale.set(1.5);
        
        setTimeout(() => {
          if (this.app) {
            this.app.stage.removeChild(target);
            const idx = this.targets.indexOf(target);
            if (idx !== -1) this.targets.splice(idx, 1);
          }
        }, 100);
        
        break;
      }
    }
  }

  private renderUI(): void {
    if (!this.app) return;

    // Remove old UI
    const oldUI = this.app.stage.getChildByLabel('ui');
    if (oldUI) {
      this.app.stage.removeChild(oldUI);
    }

    const uiContainer = new Graphics();
    uiContainer.label = 'ui';

    // Score text
    const scoreStyle = new TextStyle({
      fontFamily: 'system-ui, sans-serif',
      fontSize: 24,
      fontWeight: 'bold',
      fill: 0xffffff,
    });
    const scoreText = new Text({ text: `Score: ${this.score}`, style: scoreStyle });
    scoreText.x = 10;
    scoreText.y = 10;
    uiContainer.addChild(scoreText);

    // Time bar
    const timePercent = Math.max(0, this.timeRemaining / 3000);
    uiContainer.rect(10, 50, (this.config.width - 20) * timePercent, 10);
    uiContainer.fill({ color: this.primaryColor });

    // Time bar background
    const timeBg = new Graphics();
    timeBg.rect(10, 50, this.config.width - 20, 10);
    timeBg.stroke({ color: 0x4c4c6c, width: 2 });
    uiContainer.addChild(timeBg);

    this.app.stage.addChild(uiContainer);
  }

  private seededRandom(): () => number {
    let seed = this.config.seed;
    return () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  }

  end(): void {
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Show final score
    if (this.app) {
      const finalStyle = new TextStyle({
        fontFamily: 'system-ui, sans-serif',
        fontSize: 32,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center',
      });
      const finalText = new Text({ 
        text: `Game Over!\nScore: ${this.score}`, 
        style: finalStyle 
      });
      finalText.anchor.set(0.5);
      finalText.x = this.config.width / 2;
      finalText.y = this.config.height / 2;
      this.app.stage.addChild(finalText);
    }

    this.callbacks.onGameEnd(this.score);
  }

  destroy(): void {
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.app?.canvas ?? null;
  }
}
