/**
 * Default branding configuration.
 */
export const DEFAULT_BRANDING = {
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    tertiaryColor: "#f3f4f6", // gray-100
    typography: "Inter",
    brandingType: "minimal",
};

export type BrandingConfig = typeof DEFAULT_BRANDING;

/**
 * Resolves the branding configuration by merging the user's custom settings
 * with the default configuration.
 */
export function resolveBranding(
    custom?: Partial<BrandingConfig> | null
): BrandingConfig {
    if (!custom) {
        return DEFAULT_BRANDING;
    }

    return {
        primaryColor: custom.primaryColor ?? DEFAULT_BRANDING.primaryColor,
        secondaryColor: custom.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
        tertiaryColor: custom.tertiaryColor ?? DEFAULT_BRANDING.tertiaryColor,
        typography: custom.typography ?? DEFAULT_BRANDING.typography,
        brandingType: custom.brandingType ?? DEFAULT_BRANDING.brandingType,
    };
}
