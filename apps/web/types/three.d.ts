declare module 'three' {
  export * from 'three/src/Three';
}

declare module 'three/src/Three' {
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
  }

  export class Euler {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number, order?: string): this;
  }

  export class Object3D {
    rotation: Euler;
    position: Vector3;
  }

  export class Scene {
    background: Color | null;
    add(object: Object3D | GridHelper | AxesHelper): this;
  }

  export class PerspectiveCamera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    position: Vector3;
    aspect: number;
    updateProjectionMatrix(): void;
  }

  export class WebGLRenderer {
    constructor(parameters?: { antialias?: boolean });
    domElement: HTMLCanvasElement;
    setSize(width: number, height: number): void;
    setPixelRatio(value: number): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
  }

  export class Color {
    constructor(color?: number | string);
  }

  export class GridHelper {
    constructor(size?: number, divisions?: number, color1?: number, color2?: number);
    rotation: Euler;
    position: Vector3;
  }

  export class AxesHelper {
    constructor(size?: number);
    rotation: Euler;
    position: Vector3;
  }
}
