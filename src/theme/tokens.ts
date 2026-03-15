export type ColorTokens = {
  bg: string;
  surface: string;
  surface2: string;
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
  bg: "#F7F7F8",
  surface: "#FFFFFF",
  surface2: "#F2F3F5",
  text: "#3A3A3A",
  textMuted: "#6B7280",
  primary: "#EA580C",
  primarySoft: "rgba(234, 88, 12, 0.12)",
  success: "#15803D",
  warning: "#B45309",
  danger: "#B91C1C",
  border: "#E5E7EB",
  focus: "#FB923C",
};

export const darkColors: ColorTokens = {
  bg: "#0F0F10",
  surface: "#161617",
  surface2: "#1E1E20",
  text: "#F1F1F2",
  textMuted: "#B6B6B8",
  primary: "#F97316",
  primarySoft: "rgba(249, 115, 22, 0.18)",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  border: "#2D2D30",
  focus: "#FDBA74",
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
  desktopNavHeight: 56,
  desktopNavGapTop: spacing.sm,
  desktopNavGapBottom: spacing.sm
};

// Backward-compatible alias for legacy imports.
export const colors = lightColors;
