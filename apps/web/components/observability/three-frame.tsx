"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

interface ThreeFrameProps {
  onPointerEvent?: (event: PointerEventData) => void;
  className?: string;
}

export interface PointerEventData {
  timestampMs: number;
  tMs: number; // high-res relative timing
  x: number; // relative to canvas
  y: number; // relative to canvas
  clientX: number;
  clientY: number;
  isDown: boolean;
  eventType: "move" | "down" | "up" | "enter" | "leave";
  pointerType: string;
  pointerId: number;
}

export function ThreeFrame({ onPointerEvent, className }: ThreeFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isDownRef = useRef(false);
  const startTimeRef = useRef(performance.now());

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add a subtle grid helper for visual reference
    const gridHelper = new THREE.GridHelper(10, 20, 0x444466, 0x333355);
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Create pointer event handler
  const createPointerHandler = useCallback(
    (eventType: PointerEventData["eventType"]) => {
      return (e: React.PointerEvent<HTMLDivElement>) => {
        const container = containerRef.current;
        if (!container || !onPointerEvent) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update isDown state
        if (eventType === "down") {
          isDownRef.current = true;
        } else if (eventType === "up" || eventType === "leave") {
          isDownRef.current = false;
        }

        const eventData: PointerEventData = {
          timestampMs: Date.now(),
          tMs: performance.now() - startTimeRef.current,
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
          clientX: e.clientX,
          clientY: e.clientY,
          isDown: isDownRef.current,
          eventType,
          pointerType: e.pointerType,
          pointerId: e.pointerId,
        };

        onPointerEvent(eventData);
      };
    },
    [onPointerEvent]
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ touchAction: "none" }}
      onPointerMove={createPointerHandler("move")}
      onPointerDown={createPointerHandler("down")}
      onPointerUp={createPointerHandler("up")}
      onPointerEnter={createPointerHandler("enter")}
      onPointerLeave={createPointerHandler("leave")}
    />
  );
}
