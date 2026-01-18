"use client";

import { useEffect, useState } from "react";

// Available font families
export const PLAYPROOF_FONTS = [
  'Inter',
  'Nunito Sans',
  'Poppins',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Source Sans 3',
  'Raleway',
  'Work Sans',
] as const;

export type PlayproofFontFamily = typeof PLAYPROOF_FONTS[number];

export interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textMutedColor: string;
  accentColor: string;
  successColor: string;
  errorColor: string;
  borderColor: string;
  // Layout
  borderRadius: number;
  spacing: number;
  fontFamily: PlayproofFontFamily;
}

// Light theme colors (converted from oklch values in globals.css)
export const LIGHT_THEME_COLORS: ThemeColors = {
  primaryColor: "#e54d4d",      // oklch(0.586 0.253 17.585)
  secondaryColor: "#f5f5f6",    // oklch(0.967 0.001 286.375)
  backgroundColor: "#ffffff",   // oklch(1 0 0)
  surfaceColor: "#ffffff",      // oklch(1 0 0) - card
  textColor: "#0a0a0b",         // oklch(0.141 0.005 285.823)
  textMutedColor: "#737381",    // oklch(0.552 0.016 285.938)
  accentColor: "#f5f5f6",       // oklch(0.967 0.001 286.375)
  successColor: "#10b981",      // green - constant
  errorColor: "#dc2626",        // oklch(0.577 0.245 27.325) - destructive
  borderColor: "#e5e5e8",       // oklch(0.92 0.004 286.32)
  // Layout defaults
  borderRadius: 0,
  spacing: 20,
  fontFamily: "Inter",
};

// Dark theme colors (converted from oklch values in globals.css)
export const DARK_THEME_COLORS: ThemeColors = {
  primaryColor: "#ef5a5a",      // oklch(0.645 0.246 16.439)
  secondaryColor: "#27272a",    // oklch(0.274 0.006 286.033)
  backgroundColor: "#0a0a0b",   // oklch(0.141 0.005 285.823)
  surfaceColor: "#18181b",      // oklch(0.21 0.006 285.885) - card
  textColor: "#fafafa",         // oklch(0.985 0 0)
  textMutedColor: "#a1a1aa",    // oklch(0.705 0.015 286.067)
  accentColor: "#27272a",       // oklch(0.274 0.006 286.033)
  successColor: "#10b981",      // green - constant
  errorColor: "#f87171",        // oklch(0.704 0.191 22.216) - destructive
  borderColor: "#27272a",       // oklch(1 0 0 / 10%) - approximated
  // Layout defaults
  borderRadius: 0,
  spacing: 20,
  fontFamily: "Inter",
};

/**
 * Hook to get the current theme colors based on light/dark mode
 * Returns null until theme is detected on client
 */
export function useThemeColors(): ThemeColors | null {
  const [colors, setColors] = useState<ThemeColors | null>(null);

  useEffect(() => {
    const getColors = () => {
      const isDark = document.documentElement.classList.contains("dark");
      return isDark ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
    };

    // Set initial colors
    setColors(getColors());

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setColors(getColors());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setColors(getColors());
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return colors;
}
