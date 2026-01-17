export type BrandingConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  typography?: string;
  brandingType?: string;
};

export const DEFAULT_BRANDING: Required<BrandingConfig> = {
  primaryColor: "#5B8CFF",
  secondaryColor: "#22D3EE",
  tertiaryColor: "#E2E8F0",
  typography: "Nunito Sans",
  brandingType: "studio",
};

export function resolveBranding(
  overrides?: BrandingConfig,
  fallback?: BrandingConfig
): Required<BrandingConfig> {
  return {
    primaryColor:
      overrides?.primaryColor ??
      fallback?.primaryColor ??
      DEFAULT_BRANDING.primaryColor,
    secondaryColor:
      overrides?.secondaryColor ??
      fallback?.secondaryColor ??
      DEFAULT_BRANDING.secondaryColor,
    tertiaryColor:
      overrides?.tertiaryColor ??
      fallback?.tertiaryColor ??
      DEFAULT_BRANDING.tertiaryColor,
    typography:
      overrides?.typography ??
      fallback?.typography ??
      DEFAULT_BRANDING.typography,
    brandingType:
      overrides?.brandingType ??
      fallback?.brandingType ??
      DEFAULT_BRANDING.brandingType,
  };
}
