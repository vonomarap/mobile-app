import { PropsWithChildren } from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
  variant?: "solid" | "glass";
  blurIntensity?: number;
}>;

export function Card({
  children,
  style,
  padded = true,
  elevated = true,
  variant = "glass",
  blurIntensity = 22
}: Props): JSX.Element {
  const theme = useTheme();

  const flattened = StyleSheet.flatten(style) as ViewStyle | undefined;
  const borderRadius = flattened?.borderRadius ?? radius.md;

  const padding = padded ? spacing.md : 0;

  const isGlass = variant === "glass";
  const glassBg = theme.isDark ? "rgba(22,22,23,0.60)" : "rgba(255,255,255,0.72)";
  const glassOverlay = theme.isDark ? "rgba(22,22,23,0.26)" : "rgba(255,255,255,0.26)";
  const glassBorder = theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";

  return (
    <View
      style={[
        styles.base,
        { borderRadius },
        elevated ? theme.shadow.sm : null,
        {
          backgroundColor: isGlass ? glassBg : theme.colors.surface,
          borderColor: isGlass ? glassBorder : theme.colors.border,
          padding
        },
        isGlass && Platform.OS === "web"
          ? ({
              backdropFilter: "blur(12px) saturate(120%)",
              WebkitBackdropFilter: "blur(12px) saturate(120%)"
            } as object)
          : null,
        style,
      ]}
    >
      {isGlass && Platform.OS !== "web" ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { borderRadius, overflow: "hidden" }
          ]}
        >
          <BlurView
            tint={theme.isDark ? "dark" : "light"}
            intensity={blurIntensity}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: glassOverlay }
            ]}
          />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1
  }
});
