export const DEFAULT_BRANDING = {
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  tertiaryColor: "#22d3ee",
  typography: "Inter",
  brandingType: "default",
};

export function resolveBranding(
  override?: {
    primaryColor?: string;
    secondaryColor?: string;
    tertiaryColor?: string;
    typography?: string;
    brandingType?: string;
  },
  fallback?: {
    primaryColor?: string;
    secondaryColor?: string;
    tertiaryColor?: string;
    typography?: string;
    brandingType?: string;
  }
) {
  const base = fallback ?? DEFAULT_BRANDING;
  return {
    primaryColor: override?.primaryColor ?? base.primaryColor,
    secondaryColor: override?.secondaryColor ?? base.secondaryColor,
    tertiaryColor: override?.tertiaryColor ?? base.tertiaryColor,
    typography: override?.typography ?? base.typography,
    brandingType: override?.brandingType ?? base.brandingType,
  };
}
