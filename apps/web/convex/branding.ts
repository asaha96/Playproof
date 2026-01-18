/**
 * Branding configuration aligned with SDK PlayproofTheme interface.
 * All colors map directly to SDK CSS custom properties.
 */
export type BrandingConfig = {
  // Core colors
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  // Text colors
  textColor?: string;
  textMutedColor?: string;
  // UI colors
  accentColor?: string;
  successColor?: string;
  errorColor?: string;
  borderColor?: string;
  // Layout
  borderRadius?: number;
  spacing?: number;
  // Typography
  typography?: string;
};

/**
 * Default branding values matching SDK CSS defaults from playproof.ts
 */
export const DEFAULT_BRANDING: Required<BrandingConfig> = {
  // Core colors
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  backgroundColor: "#1e1e2e",
  surfaceColor: "#2a2a3e",
  // Text colors
  textColor: "#f5f5f5",
  textMutedColor: "#a1a1aa",
  // UI colors
  accentColor: "#22d3ee",
  successColor: "#10b981",
  errorColor: "#ef4444",
  borderColor: "#3f3f5a",
  // Layout
  borderRadius: 0,
  spacing: 20,
  // Typography
  typography: "Inter",
};

/**
 * Resolves the branding configuration by merging the user's custom settings
 * with the default configuration.
 */
export function resolveBranding(
  overrides?: BrandingConfig
): Required<BrandingConfig> {
  return {
    primaryColor: overrides?.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor: overrides?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
    backgroundColor: overrides?.backgroundColor ?? DEFAULT_BRANDING.backgroundColor,
    surfaceColor: overrides?.surfaceColor ?? DEFAULT_BRANDING.surfaceColor,
    textColor: overrides?.textColor ?? DEFAULT_BRANDING.textColor,
    textMutedColor: overrides?.textMutedColor ?? DEFAULT_BRANDING.textMutedColor,
    accentColor: overrides?.accentColor ?? DEFAULT_BRANDING.accentColor,
    successColor: overrides?.successColor ?? DEFAULT_BRANDING.successColor,
    errorColor: overrides?.errorColor ?? DEFAULT_BRANDING.errorColor,
    borderColor: overrides?.borderColor ?? DEFAULT_BRANDING.borderColor,
    borderRadius: overrides?.borderRadius ?? DEFAULT_BRANDING.borderRadius,
    spacing: overrides?.spacing ?? DEFAULT_BRANDING.spacing,
    typography: overrides?.typography ?? DEFAULT_BRANDING.typography,
  };
}
