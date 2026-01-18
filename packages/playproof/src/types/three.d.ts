// Type declarations for three.js
// This allows Three.js to be used without @types/three installed
declare module 'three' {
    // Export everything as any to allow type annotations like THREE.Mesh
    export const Scene: any;
    export const Color: any;
    export const PerspectiveCamera: any;
    export const OrthographicCamera: any;
    export const WebGLRenderer: any;
    export const Object3D: any;
    export const Mesh: any;
    export const Vector2: any;
    export const Vector3: any;
    export const Euler: any;
    export const Raycaster: any;
    export const BufferGeometry: any;
    export const SphereGeometry: any;
    export const BoxGeometry: any;
    export const PlaneGeometry: any;
    export const CylinderGeometry: any;
    export const ConeGeometry: any;
    export const RingGeometry: any;
    export const CircleGeometry: any;
    export const TubeGeometry: any;
    export const ShapeGeometry: any;
    export const Shape: any;
    export const Material: any;
    export const MeshBasicMaterial: any;
    export const MeshStandardMaterial: any;
    export const MeshPhongMaterial: any;
    export const MeshPhysicalMaterial: any;
    export const LineBasicMaterial: any;
    export const LineDashedMaterial: any;
    export const PointsMaterial: any;
    export const Light: any;
    export const AmbientLight: any;
    export const DirectionalLight: any;
    export const PointLight: any;
    export const Group: any;
    export const Line: any;
    export const Points: any;
    export const BufferAttribute: any;
    export const Float32BufferAttribute: any;
    export const Clock: any;
    export const CanvasTexture: any;
    export const QuadraticBezierCurve3: any;
    // Curves for 2D paths
    export const CurvePath: any;
    export const LineCurve: any;
    export const QuadraticBezierCurve: any;
    export const SplineCurve: any;
    
    // Constants
    export const DoubleSide: any;
    export const FrontSide: any;
    export const BackSide: any;
    export const PCFSoftShadowMap: any;
    export const ACESFilmicToneMapping: any;
    export const AdditiveBlending: any;
    
    // Type aliases for type annotations (THREE.Mesh, etc.)
    export type Scene = any;
    export type Color = any;
    export type PerspectiveCamera = any;
    export type OrthographicCamera = any;
    export type WebGLRenderer = any;
    export type Object3D = any;
    export type Mesh = any;
    export type Vector2 = any;
    export type Vector3 = any;
    export type Euler = any;
    export type Raycaster = any;
    export type BufferGeometry = any;
    export type SphereGeometry = any;
    export type ShapeGeometry = any;
    export type Shape = any;
    export type Material = any;
    export type MeshBasicMaterial = any;
    export type MeshStandardMaterial = any;
    export type MeshPhongMaterial = any;
    export type MeshPhysicalMaterial = any;
    export type PointsMaterial = any;
    export type Light = any;
    export type AmbientLight = any;
    export type DirectionalLight = any;
    export type PointLight = any;
    export type Group = any;
    export type Line = any;
    export type Points = any;
    export type Clock = any;
    export type Intersection = any;
    // Curve types
    export type CurvePath<T> = any;
    export type LineCurve = any;
    export type QuadraticBezierCurve = any;
    export type SplineCurve = any;
}
