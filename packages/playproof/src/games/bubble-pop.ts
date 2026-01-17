/**
 * Bubble Pop Game
 * A simple ~10 second game for behavior verification
 */

import type { BehaviorData, PlayproofConfig } from '../types';

export class BubblePopGame {
    private gameArea: HTMLElement;
    private config: PlayproofConfig;
    private bubbles: HTMLDivElement[];
    private behaviorData: BehaviorData;
    private currentTrajectory: { x: number; y: number; timestamp: number }[];
    private isRunning: boolean;
    private startTime: number | null;
    private bubbleInterval: ReturnType<typeof setInterval> | null;
    private onComplete: ((data: BehaviorData) => void) | null;

    constructor(gameArea: HTMLElement, config: PlayproofConfig) {
        this.gameArea = gameArea;
        this.config = config;
        this.bubbles = [];
        this.behaviorData = {
            mouseMovements: [],
            clickTimings: [],
            trajectories: [],
            hits: 0,
            misses: 0,
            clickAccuracy: 0
        };
        this.currentTrajectory = [];
        this.isRunning = false;
        this.startTime = null;
        this.bubbleInterval = null;
        this.onComplete = null;

        this.bindEvents();
    }

    private bindEvents(): void {
        // Track mouse movements
        this.gameArea.addEventListener('mousemove', (e: MouseEvent) => {
            if (!this.isRunning) return;

            const rect = this.gameArea.getBoundingClientRect();
            const movement = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                timestamp: Date.now()
            };

            this.behaviorData.mouseMovements.push(movement);
            this.currentTrajectory.push(movement);
        });

        // Track clicks
        this.gameArea.addEventListener('click', (e: MouseEvent) => {
            if (!this.isRunning) return;

            this.behaviorData.clickTimings.push(Date.now());

            // Check if clicked on a bubble
            const clickedBubble = this.getBubbleAtPosition(e.clientX, e.clientY);
            if (clickedBubble) {
                this.popBubble(clickedBubble);
                this.behaviorData.hits++;
            } else {
                this.behaviorData.misses++;
            }

            // Save trajectory and start new one
            if (this.currentTrajectory.length > 2) {
                this.behaviorData.trajectories.push([...this.currentTrajectory]);
            }
            this.currentTrajectory = [];
        });
    }

    start(onComplete: (data: BehaviorData) => void): void {
        this.onComplete = onComplete;
        this.isRunning = true;
        this.startTime = Date.now();
        this.behaviorData = {
            mouseMovements: [],
            clickTimings: [],
            trajectories: [],
            hits: 0,
            misses: 0,
            clickAccuracy: 0
        };

        // Clear game area
        this.gameArea.innerHTML = '';

        // Spawn bubbles periodically
        this.spawnBubble();
        this.bubbleInterval = setInterval(() => {
            if (this.bubbles.length < 5) {
                this.spawnBubble();
            }
        }, 800);

        // End game after duration
        setTimeout(() => this.end(), this.config.gameDuration || 10000);
    }

    private spawnBubble(): void {
        const bubble = document.createElement('div');
        bubble.className = 'playproof-bubble';

        const size = 40 + Math.random() * 30;
        const maxX = this.gameArea.offsetWidth - size;
        const maxY = this.gameArea.offsetHeight - size;

        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * maxX}px`;
        bubble.style.top = `${Math.random() * maxY}px`;
        bubble.style.background = `linear-gradient(135deg, 
      var(--playproof-primary), 
      var(--playproof-secondary))`;
        bubble.style.boxShadow = `0 4px 15px rgba(99, 102, 241, 0.3), 
      inset 0 -2px 10px rgba(0,0,0,0.2),
      inset 0 2px 10px rgba(255,255,255,0.3)`;

        bubble.dataset.id = String(Date.now() + Math.random());

        this.gameArea.appendChild(bubble);
        this.bubbles.push(bubble);

        // Auto-remove after 3 seconds if not popped
        setTimeout(() => {
            if (this.bubbles.includes(bubble)) {
                this.removeBubble(bubble);
            }
        }, 3000);
    }

    private getBubbleAtPosition(clientX: number, clientY: number): HTMLDivElement | null {
        const rect = this.gameArea.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        for (const bubble of this.bubbles) {
            const bubbleRect = bubble.getBoundingClientRect();
            const bubbleX = bubbleRect.left - rect.left;
            const bubbleY = bubbleRect.top - rect.top;
            const bubbleW = bubbleRect.width;
            const bubbleH = bubbleRect.height;

            if (x >= bubbleX && x <= bubbleX + bubbleW &&
                y >= bubbleY && y <= bubbleY + bubbleH) {
                return bubble;
            }
        }
        return null;
    }

    private popBubble(bubble: HTMLDivElement): void {
        bubble.classList.add('popping');
        setTimeout(() => {
            this.removeBubble(bubble);
        }, 200);
    }

    private removeBubble(bubble: HTMLDivElement): void {
        const index = this.bubbles.indexOf(bubble);
        if (index > -1) {
            this.bubbles.splice(index, 1);
        }
        if (bubble.parentNode) {
            bubble.remove();
        }
    }

    private end(): void {
        this.isRunning = false;
        if (this.bubbleInterval) {
            clearInterval(this.bubbleInterval);
        }

        // Calculate click accuracy
        const totalClicks = this.behaviorData.hits + this.behaviorData.misses;
        this.behaviorData.clickAccuracy = totalClicks > 0
            ? this.behaviorData.hits / totalClicks
            : 0;

        if (this.onComplete) {
            this.onComplete(this.behaviorData);
        }
    }

    destroy(): void {
        this.isRunning = false;
        if (this.bubbleInterval) {
            clearInterval(this.bubbleInterval);
        }
        this.bubbles.forEach(b => b.remove());
        this.bubbles = [];
    }
}
