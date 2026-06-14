import { ColorSchemeName, Platform } from "react-native";
import { ColorTokens, darkColors, layout, lightColors, radius, spacing } from "./tokens";
import { TypographyTokens, typography } from "./typography";

export type Theme = {
  scheme: "light" | "dark";
  isDark: boolean;
  colors: ColorTokens;
  spacing: typeof spacing;
  radius: typeof radius;
  layout: typeof layout;
  typography: TypographyTokens;
  shadow: {
    sm: object;
    md: object;
    lg: object;
  };
};

function makeShadow(level: "sm" | "md" | "lg"): object {
  const presets = {
    sm: { height: 2, opacity: 0.05, radius: 8, elevation: 2 },
    md: { height: 6, opacity: 0.07, radius: 16, elevation: 4 },
    lg: { height: 12, opacity: 0.09, radius: 24, elevation: 8 }
  } as const;

  const preset = presets[level];

  if (Platform.OS === "android") {
    return { elevation: preset.elevation };
  }

  // iOS + web
  return {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: preset.height },
    shadowOpacity: preset.opacity,
    shadowRadius: preset.radius
  };
}

export function createTheme(colorScheme: ColorSchemeName): Theme {
  const scheme = colorScheme === "dark" ? "dark" : "light";
  const colors = scheme === "dark" ? darkColors : lightColors;

  return {
    scheme,
    isDark: scheme === "dark",
    colors,
    spacing,
    radius,
    layout,
    typography,
    shadow: {
      sm: makeShadow("sm"),
      md: makeShadow("md"),
      lg: makeShadow("lg")
    }
  };
}

