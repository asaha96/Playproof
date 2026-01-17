/**
 * Target Click Game
 * Click the highlighted targets in order for behavior verification
 */

export class TargetClickGame {
    constructor(gameArea, config) {
        this.gameArea = gameArea;
        this.config = config;
        this.targets = [];
        this.currentTargetIndex = 0;
        this.behaviorData = {
            mouseMovements: [],
            clickTimings: [],
            trajectories: [],
            hits: 0,
            misses: 0
        };
        this.currentTrajectory = [];
        this.isRunning = false;
        this.startTime = null;
        this.spawnInterval = null;
        this.onComplete = null;

        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundClick = this.handleClick.bind(this);
    }

    bindEvents() {
        this.gameArea.addEventListener('mousemove', this.boundMouseMove);
        this.gameArea.addEventListener('click', this.boundClick);
    }

    unbindEvents() {
        this.gameArea.removeEventListener('mousemove', this.boundMouseMove);
        this.gameArea.removeEventListener('click', this.boundClick);
    }

    handleMouseMove(e) {
        if (!this.isRunning) return;

        const rect = this.gameArea.getBoundingClientRect();
        const movement = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            timestamp: Date.now()
        };

        this.behaviorData.mouseMovements.push(movement);
        this.currentTrajectory.push(movement);
    }

    handleClick(e) {
        if (!this.isRunning) return;

        this.behaviorData.clickTimings.push(Date.now());

        // Check if clicked on the active target
        const clickedTarget = this.getTargetAtPosition(e.clientX, e.clientY);

        if (clickedTarget && clickedTarget.active) {
            this.hitTarget(clickedTarget);
            this.behaviorData.hits++;
        } else {
            this.behaviorData.misses++;
        }

        // Save trajectory and start new one
        if (this.currentTrajectory.length > 2) {
            this.behaviorData.trajectories.push([...this.currentTrajectory]);
        }
        this.currentTrajectory = [];
    }

    start(onComplete) {
        this.onComplete = onComplete;
        this.isRunning = true;
        this.startTime = Date.now();
        this.currentTargetIndex = 0;
        this.behaviorData = {
            mouseMovements: [],
            clickTimings: [],
            trajectories: [],
            hits: 0,
            misses: 0
        };

        // Clear game area
        this.gameArea.innerHTML = '';

        this.bindEvents();

        // Spawn initial targets
        this.spawnTargetSet();

        // Spawn new targets periodically
        this.spawnInterval = setInterval(() => {
            if (this.targets.filter(t => !t.hit).length < 3) {
                this.spawnTarget();
            }
        }, 1200);

        // End game after duration
        setTimeout(() => this.end(), this.config.gameDuration);
    }

    spawnTargetSet() {
        // Spawn 3-4 targets at once
        const count = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            this.spawnTarget();
        }
        // Activate the first one
        if (this.targets.length > 0) {
            this.activateNextTarget();
        }
    }

    spawnTarget() {
        const target = document.createElement('div');
        target.className = 'playproof-target';

        const size = 50 + Math.random() * 20;
        const maxX = this.gameArea.offsetWidth - size;
        const maxY = this.gameArea.offsetHeight - size;

        const x = Math.random() * maxX;
        const y = Math.random() * maxY;

        target.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            border-radius: 50%;
            background: var(--playproof-surface);
            border: 3px solid var(--playproof-border);
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Inner ring
        const innerRing = document.createElement('div');
        innerRing.style.cssText = `
            width: 60%;
            height: 60%;
            border-radius: 50%;
            background: var(--playproof-background);
            border: 2px solid var(--playproof-border);
        `;
        target.appendChild(innerRing);

        const id = Date.now() + Math.random();
        target.dataset.id = id;

        const targetData = {
            id,
            element: target,
            x,
            y,
            size,
            active: false,
            hit: false
        };

        this.gameArea.appendChild(target);
        this.targets.push(targetData);

        // Auto-remove after 4 seconds if not hit
        setTimeout(() => {
            if (!targetData.hit && this.targets.includes(targetData)) {
                this.removeTarget(targetData);
            }
        }, 4000);
    }

    activateNextTarget() {
        // Find next unhit target
        const unhitTargets = this.targets.filter(t => !t.hit);
        if (unhitTargets.length === 0) return;

        // Deactivate all
        this.targets.forEach(t => {
            t.active = false;
            if (t.element) {
                t.element.style.border = '3px solid var(--playproof-border)';
                t.element.style.boxShadow = 'none';
            }
        });

        // Activate random unhit target
        const nextTarget = unhitTargets[Math.floor(Math.random() * unhitTargets.length)];
        nextTarget.active = true;
        nextTarget.element.style.border = '3px solid var(--playproof-accent)';
        nextTarget.element.style.boxShadow = '0 0 20px var(--playproof-accent), inset 0 0 10px rgba(34, 211, 238, 0.3)';
        nextTarget.element.style.animation = 'targetPulse 0.8s ease-in-out infinite';
    }

    getTargetAtPosition(clientX, clientY) {
        const rect = this.gameArea.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        for (const target of this.targets) {
            if (target.hit) continue;

            const centerX = target.x + target.size / 2;
            const centerY = target.y + target.size / 2;
            const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

            if (distance <= target.size / 2) {
                return target;
            }
        }
        return null;
    }

    hitTarget(target) {
        target.hit = true;
        target.element.style.animation = 'targetHit 0.3s ease forwards';
        target.element.style.pointerEvents = 'none';

        setTimeout(() => {
            this.removeTarget(target);
            this.activateNextTarget();
        }, 300);
    }

    removeTarget(target) {
        const index = this.targets.indexOf(target);
        if (index > -1) {
            this.targets.splice(index, 1);
        }
        if (target.element && target.element.parentNode) {
            target.element.remove();
        }
    }

    end() {
        this.isRunning = false;
        clearInterval(this.spawnInterval);
        this.unbindEvents();

        // Calculate click accuracy
        const totalClicks = this.behaviorData.hits + this.behaviorData.misses;
        this.behaviorData.clickAccuracy = totalClicks > 0
            ? this.behaviorData.hits / totalClicks
            : 0;

        if (this.onComplete) {
            this.onComplete(this.behaviorData);
        }
    }

    destroy() {
        this.isRunning = false;
        clearInterval(this.spawnInterval);
        this.unbindEvents();
        this.targets.forEach(t => {
            if (t.element) t.element.remove();
        });
        this.targets = [];
    }

    /**
     * Returns CSS to be injected for this game
     */
    static getStyles() {
        return `
            @keyframes targetPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            @keyframes targetHit {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); }
                100% { transform: scale(0); opacity: 0; }
            }
            .playproof-target:hover {
                transform: scale(1.05);
            }
        `;
    }
}
