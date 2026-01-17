/**
 * PixiJS Game Host
 * Handles canvas creation, DPR, resize, and fixed-timestep update loop
 *
 * This is the rendering layer only - truth lives in LevelSpec + Transcript
 */

import { Application, Graphics, Container, Text, TextStyle } from 'pixi.js';
import type { PlayproofTheme } from '../../types';

/**
 * Fixed timestep for physics (60 FPS)
 */
const FIXED_DT = 1000 / 60; // ~16.667ms

type UpdateCallback = (dt: number) => void;
type RenderCallback = (alpha: number) => void;

interface HostLayers {
    bg: Container;
    world: Container;
    fx: Container;
    ui: Container;
}

/**
 * Creates and manages a PixiJS application for a game
 */
export class PixiHost {
    private mountEl: HTMLElement;
    private theme: PlayproofTheme;
    private app: Application | null;
    public layers: HostLayers;
    private accumulator: number;
    private lastTime: number;
    private isRunning: boolean;
    private updateCallback: UpdateCallback | null;
    private renderCallback: RenderCallback | null;

    constructor(mountEl: HTMLElement, theme: PlayproofTheme = {}) {
        this.mountEl = mountEl;
        this.theme = theme;
        this.app = null;
        this.layers = {} as HostLayers;
        this.accumulator = 0;
        this.lastTime = 0;
        this.isRunning = false;
        this.updateCallback = null;
        this.renderCallback = null;
    }

    /**
     * Initialize the Pixi application
     */
    async init(): Promise<this> {
        const rect = this.mountEl.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.app = new Application();

        await this.app.init({
            width: rect.width,
            height: rect.height,
            resolution: dpr,
            autoDensity: true,
            antialias: true,
            backgroundColor: this.hexToNumber(this.theme.surface || '#2a2a3e'),
            powerPreference: 'high-performance',
        });

        // Mount canvas
        this.mountEl.innerHTML = '';
        this.mountEl.appendChild(this.app.canvas);
        this.app.canvas.style.width = '100%';
        this.app.canvas.style.height = '100%';
        this.app.canvas.style.display = 'block';
        this.app.canvas.style.touchAction = 'none'; // Prevent browser gestures from interfering

        // Create layer structure
        this.layers = {
            bg: new Container(),
            world: new Container(),
            fx: new Container(),
            ui: new Container()
        };

        this.app.stage.addChild(this.layers.bg);
        this.app.stage.addChild(this.layers.world);
        this.app.stage.addChild(this.layers.fx);
        this.app.stage.addChild(this.layers.ui);

        return this;
    }

    /**
     * Get canvas dimensions
     */
    getSize(): { width: number; height: number } {
        if (!this.app) return { width: 0, height: 0 };
        return {
            width: this.app.screen.width,
            height: this.app.screen.height
        };
    }

    /**
     * Get the raw canvas element for input binding
     */
    getCanvas(): HTMLCanvasElement {
        if (!this.app) throw new Error('PixiHost not initialized');
        return this.app.canvas;
    }

    /**
     * Convert hex color to number for Pixi
     */
    hexToNumber(hex: string | number): number {
        if (typeof hex === 'number') return hex;
        return parseInt(hex.replace('#', ''), 16);
    }

    /**
     * Start the fixed-timestep update loop
     */
    start(updateFn: UpdateCallback, renderFn: RenderCallback): void {
        this.updateCallback = updateFn;
        this.renderCallback = renderFn;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.accumulator = 0;

        this.app?.ticker.add(this._tick, this);
    }

    /**
     * Internal tick handler - fixed timestep with interpolation
     */
    private _tick(): void {
        if (!this.isRunning) return;

        const now = performance.now();
        let frameTime = now - this.lastTime;
        this.lastTime = now;

        // Cap frame time to avoid spiral of death
        if (frameTime > 250) frameTime = 250;

        this.accumulator += frameTime;

        // Fixed timestep updates
        while (this.accumulator >= FIXED_DT) {
            if (this.updateCallback) {
                this.updateCallback(FIXED_DT / 1000); // Pass dt in seconds
            }
            this.accumulator -= FIXED_DT;
        }

        // Render with interpolation alpha
        const alpha = this.accumulator / FIXED_DT;
        if (this.renderCallback) {
            this.renderCallback(alpha);
        }
    }

    /**
     * Stop the update loop
     */
    stop(): void {
        this.isRunning = false;
        this.app?.ticker.remove(this._tick, this);
    }

    /**
     * Clear all layers
     */
    clearLayers(): void {
        for (const layer of Object.values(this.layers)) {
            layer.removeChildren();
        }
    }

    /**
     * Draw text with theme styling
     */
    createText(text: string, options: { fontSize?: number; fontWeight?: string; fill?: string; align?: string } = {}): Text {
        const style = new TextStyle({
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: options.fontSize || 16,
            fontWeight: (options.fontWeight || '600') as TextStyle['fontWeight'],
            fill: options.fill || this.theme.text || '#f5f5f5',
            align: (options.align || 'center') as TextStyle['align'],
        });
        return new Text({ text, style });
    }

    /**
     * Create a circle graphic
     */
    createCircle(x: number, y: number, radius: number, color: string | number): Graphics {
        const g = new Graphics();
        g.circle(x, y, radius);
        g.fill({ color: this.hexToNumber(color) });
        return g;
    }

    /**
     * Create a rectangle graphic
     */
    createRect(x: number, y: number, width: number, height: number, color: string | number, radius = 0): Graphics {
        const g = new Graphics();
        if (radius > 0) {
            g.roundRect(x, y, width, height, radius);
        } else {
            g.rect(x, y, width, height);
        }
        g.fill({ color: this.hexToNumber(color) });
        return g;
    }

    /**
     * Create a line graphic
     */
    createLine(x1: number, y1: number, x2: number, y2: number, color: string | number, width = 2): Graphics {
        const g = new Graphics();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke({ color: this.hexToNumber(color), width });
        return g;
    }

    /**
     * Destroy the application and clean up
     */
    destroy(): void {
        this.stop();
        if (this.app) {
            this.app.destroy(true, { children: true, texture: true });
            this.app = null;
        }
    }
}

export default PixiHost;
