/**
 * Three.js Game Engine
 * Reusable 3D rendering engine for Playproof games
 */

import * as THREE from 'three';

export interface EngineConfig {
    container: HTMLElement;
    width?: number;
    height?: number;
    backgroundColor?: number;
    antialias?: boolean;
}

export class ThreeEngine {
    protected scene: THREE.Scene;
    protected camera: THREE.PerspectiveCamera;
    protected renderer: THREE.WebGLRenderer;
    protected container: HTMLElement;
    protected animationId: number | null = null;
    protected clock: THREE.Clock;
    protected isRunning: boolean = false;

    constructor(config: EngineConfig) {
        this.container = config.container;
        this.clock = new THREE.Clock();

        const width = config.width || config.container.clientWidth || 400;
        const height = config.height || config.container.clientHeight || 280;

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(config.backgroundColor ?? 0x1a1a2e);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.z = 10;

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: config.antialias ?? true,
            alpha: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // DOM setup
        this.renderer.domElement.style.display = 'block';
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.borderRadius = '8px';

        // Lighting
        this.setupLighting();
    }

    protected setupLighting(): void {
        // Ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Main directional light with shadows
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        mainLight.position.set(5, 10, 7);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 50;
        this.scene.add(mainLight);

        // Accent light for visual interest
        const accentLight = new THREE.PointLight(0x6366f1, 0.5, 20);
        accentLight.position.set(-5, 3, 5);
        this.scene.add(accentLight);

        // Rim light
        const rimLight = new THREE.DirectionalLight(0x22d3ee, 0.3);
        rimLight.position.set(-5, 5, -5);
        this.scene.add(rimLight);
    }

    mount(): void {
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);
    }

    protected startEngine(): void {
        this.isRunning = true;
        this.clock.start();
        this.animate();
    }

    stop(): void {
        this.isRunning = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    protected animate = (): void => {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(this.animate);
        const delta = this.clock.getDelta();
        this.update(delta);
        this.renderer.render(this.scene, this.camera);
    };

    protected update(_delta: number): void {
        // Override in subclasses
    }

    destroy(): void {
        this.stop();
        this.renderer.dispose();
        this.scene.traverse((object: THREE.Object3D) => {
            if (object instanceof THREE.Mesh) {
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach((m: THREE.Material) => m.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }

    getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }

    getScene(): THREE.Scene {
        return this.scene;
    }

    getCamera(): THREE.PerspectiveCamera {
        return this.camera;
    }
}

export default ThreeEngine;
