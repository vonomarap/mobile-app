import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type Tone = "default" | "soft" | "primary";

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  disabled,
  selected = false,
  tone = "default",
  size = 36,
  iconSize = 18,
  badgeCount = 0,
  tooltip,
  style,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  selected?: boolean;
  tone?: Tone;
  size?: number;
  iconSize?: number;
  badgeCount?: number;
  tooltip?: string;
  style?: StyleProp<ViewStyle>;
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [showTooltip, setShowTooltip] = useState(false);

  const badgeVisible = badgeCount > 0;
  const badgeLabel = badgeCount > 99 ? "99+" : String(badgeCount);
  const tooltipLabel = tooltip ?? accessibilityLabel;
  const isWeb = Platform.OS === "web";

  const palette = (() => {
    if (tone === "primary") {
      return {
        backgroundColor: theme.colors.primary,
        borderColor: "transparent",
        iconColor: "#FFFFFF",
        hoveredBackgroundColor: theme.colors.primary,
      };
    }

    if (tone === "soft" || selected) {
      return {
        backgroundColor: theme.colors.primarySoft,
        borderColor: theme.colors.border,
        iconColor: theme.colors.primary,
        hoveredBackgroundColor: theme.colors.primarySoft,
      };
    }

    return {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      iconColor: theme.colors.text,
      hoveredBackgroundColor: theme.colors.surface2,
    };
  })();

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, selected }}
        onHoverIn={isWeb ? () => setShowTooltip(true) : undefined}
        onHoverOut={isWeb ? () => setShowTooltip(false) : undefined}
        onFocus={isWeb ? () => setShowTooltip(true) : undefined}
        onBlur={isWeb ? () => setShowTooltip(false) : undefined}
        style={(state) => {
          const hovered = (state as unknown as { hovered?: boolean }).hovered;
          const pressed = state.pressed;

          return [
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: hovered && !disabled ? palette.hoveredBackgroundColor : palette.backgroundColor,
              borderColor: palette.borderColor,
            },
            hovered && !disabled ? styles.hovered : null,
            pressed && !disabled ? styles.pressed : null,
            disabled ? styles.disabled : null,
          ];
        }}
      >
        <Ionicons name={icon} size={iconSize} color={palette.iconColor} />
        {badgeVisible ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {isWeb && showTooltip && tooltipLabel ? (
        <View pointerEvents="none" style={[styles.tooltipWrap, { bottom: size + spacing.xs }]}>
          <View style={styles.tooltip}>
            <Text style={[styles.tooltipText, { color: theme.colors.text }]} numberOfLines={1}>
              {tooltipLabel}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    wrap: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      overflow: "visible",
      zIndex: 1,
    },
    button: {
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      ...(theme.shadow.sm as object),
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object ),
    },
    hovered: {
      opacity: 0.98,
    },
    pressed: {
      opacity: 0.92,
    },
    disabled: {
      opacity: 0.5,
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 999,
      paddingHorizontal: 5,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.colors.bg,
    },
    badgeText: {
      ...font(900),
      fontSize: 10,
      lineHeight: 10,
      color: "#FFFFFF",
      textAlign: "center",
    },
    tooltipWrap: {
      position: "absolute",
      left: -72,
      right: -72,
      alignItems: "center",
      justifyContent: "center",
    },
    tooltip: {
      maxWidth: 220,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...(theme.shadow.md as object),
    },
    tooltipText: {
      ...font(800),
      fontSize: 12,
      textAlign: "center",
    },
  });
}
