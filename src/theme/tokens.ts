export type ColorTokens = {
  bg: string;
  surface: string;
  surface2: string;
  tabBarBg: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
  focus: string;
};

export const lightColors: ColorTokens = {
  bg: "#F9F8F6",
  surface: "#FFFFFF",
  surface2: "#F2F1EC",
  tabBarBg: "#E8E7E3",
  text: "#2B2B2B",
  textMuted: "#7C7A72",
  primary: "#D9521E",
  primarySoft: "rgba(217, 82, 30, 0.08)",
  success: "#15803D",
  warning: "#B45309",
  danger: "#B91C1C",
  border: "#E4E3DF",
  focus: "#F59E0B",
};

export const darkColors: ColorTokens = {
  bg: "#121110",
  surface: "#1A1918",
  surface2: "#242220",
  tabBarBg: "#292725",
  text: "#F7F6F5",
  textMuted: "#A19E9A",
  primary: "#E05E26",
  primarySoft: "rgba(224, 94, 38, 0.16)",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  border: "#2E2C2A",
  focus: "#FBBF24",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
};

export const layout = {
  maxWidth: 1100,
  desktopNavMinWidth: 1024,
  desktopNavHeight: 64,
  desktopNavGapTop: spacing.sm,
  desktopNavGapBottom: spacing.sm,
  mobileTabBarHeight: 56,
  mobileTopBarHeight: 56
};

// Backward-compatible alias for legacy imports.
export const colors = lightColors;
