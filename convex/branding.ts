export type BrandingConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  typography?: string;
};

export const DEFAULT_BRANDING: Required<BrandingConfig> = {
  primaryColor: "#5B8CFF",
  secondaryColor: "#22D3EE",
  tertiaryColor: "#E2E8F0",
  typography: "Nunito Sans",
};

/**
 * Resolves the branding configuration by merging the user's custom settings
 * with the default configuration.
 */
export function resolveBranding(
  overrides?: BrandingConfig
): Required<BrandingConfig> {
  return {
    primaryColor:
      overrides?.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor:
      overrides?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
    tertiaryColor:
      overrides?.tertiaryColor ?? DEFAULT_BRANDING.tertiaryColor,
    typography: overrides?.typography ?? DEFAULT_BRANDING.typography,
  };
}
