import { ReactNode, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

export function PrimaryButton({
  title,
  onPress,
  disabled,
  tone = "primary",
  rightSlot,
  leftSlot,
  loading,
  textColor,
  buttonStyle,
  textStyle
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "soft";
  rightSlot?: ReactNode;
  leftSlot?: ReactNode;
  loading?: boolean;
  textColor?: string;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme.colors), [theme.colors]);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={(state) => {
        const pressed = state.pressed;
        const hovered = (state as unknown as { hovered?: boolean }).hovered;

        return [
          styles.button,
          tone === "soft" ? styles.soft : styles.primary,
          buttonStyle,
          hovered && !isDisabled ? styles.hovered : null,
          pressed && !isDisabled ? styles.pressed : null,
          isDisabled ? styles.disabled : null
        ];
      }}
    >
      {leftSlot ? <View style={styles.slot}>{leftSlot}</View> : null}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={textColor ?? (tone === "soft" ? theme.colors.primary : "#FFFFFF")}
          style={styles.spinner}
        />
      ) : null}
      <Text
        style={[
          styles.text,
          tone === "soft" ? styles.softText : styles.primaryText,
          textColor ? { color: textColor } : null,
          textStyle
        ]}
      >
        {title}
      </Text>
      {rightSlot ? <View style={styles.slot}>{rightSlot}</View> : null}
    </Pressable>
  );
}

function makeStyles(colors: { primary: string; primarySoft: string; border: string }): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    button: {
      minHeight: 48,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: "transparent",
      // Remove browser focus ring/outline on web after click/tap.
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    primary: {
      backgroundColor: colors.primary
    },
    soft: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.border
    },
    hovered: {
      opacity: 0.96
    },
    pressed: {
      opacity: 0.9
    },
    disabled: {
      opacity: 0.55
    },
    text: {
      ...font(800),
      fontSize: 16,
    },
    primaryText: {
      color: "#FFFFFF"
    },
    softText: {
      color: colors.primary
    },
    slot: {
      alignItems: "center",
      justifyContent: "center"
    },
    spinner: {
      marginRight: -4
    }
  });
}
