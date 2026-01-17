/**
 * Playproof Design Tokens
 * Centralized design system constants for consistent styling
 */

// Color palette
export const colors = {
  // Primary gradient
  primary: '#6366f1',
  primaryHover: '#818cf8',
  secondary: '#8b5cf6',
  
  // Background layers
  background: '#0f0f1a',
  backgroundGlass: 'rgba(15, 15, 26, 0.85)',
  surface: '#1a1a2e',
  surfaceLight: '#252540',
  surfaceGlass: 'rgba(26, 26, 46, 0.7)',
  
  // Text
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  
  // Accent colors
  accent: '#22d3ee',
  accentGlow: 'rgba(34, 211, 238, 0.3)',
  
  // Status
  success: '#10b981',
  successGlow: 'rgba(16, 185, 129, 0.25)',
  error: '#ef4444',
  errorGlow: 'rgba(239, 68, 68, 0.25)',
  warning: '#f59e0b',
  
  // Borders
  border: 'rgba(148, 163, 184, 0.1)',
  borderLight: 'rgba(148, 163, 184, 0.2)',
  borderGlow: 'rgba(99, 102, 241, 0.3)',
};

// Spacing scale (in pixels)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Border radius
export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Typography
export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Shadows
export const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
  md: '0 4px 16px rgba(0, 0, 0, 0.2)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.25)',
  glow: '0 0 20px rgba(99, 102, 241, 0.3)',
  glowAccent: '0 0 24px rgba(34, 211, 238, 0.25)',
  inner: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
};

// Transitions
export const transitions = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '400ms ease',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
};

// Z-index layers
export const zIndex = {
  base: 0,
  content: 10,
  overlay: 100,
  modal: 1000,
};

// Gradients
export const gradients = {
  primary: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
  accent: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
  surface: `linear-gradient(180deg, ${colors.surface}, ${colors.background})`,
  glass: `linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))`,
  shimmer: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
};

// Component-specific tokens
export const components = {
  container: {
    maxWidth: 400,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backdropBlur: 16,
  },
  gameArea: {
    minHeight: 280,
    borderRadius: radius.md,
  },
  button: {
    height: 44,
    paddingX: spacing.xl,
    borderRadius: radius.md,
  },
  progress: {
    height: 4,
    borderRadius: radius.full,
  },
  icon: {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  },
};

// Export all as single theme object
export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  transitions,
  zIndex,
  gradients,
  components,
};

export default theme;
