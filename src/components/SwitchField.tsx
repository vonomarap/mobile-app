import { ReactNode, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type Props = {
  label: string;
  labelRightSlot?: ReactNode;
  value: boolean;
  valueText?: string;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

function ModernSwitch({
  value,
  onChange,
  disabled
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const progress = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [progress, value]);

  const dx = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24]
  });

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.switchTrack,
        value ? styles.switchTrackOn : styles.switchTrackOff,
        pressed && !disabled ? styles.switchPressed : null,
        disabled ? styles.switchDisabled : null
      ]}
    >
      <Animated.View style={[styles.switchThumb, { transform: [{ translateX: dx }] }]} />
    </Pressable>
  );
}

export function SwitchField({
  label,
  labelRightSlot,
  value,
  valueText,
  onChange,
  disabled,
  containerStyle
}: Props): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.row, disabled ? styles.rowDisabled : null]}>
        <View style={styles.left}>
          <View style={styles.labelRow}>
            <Text style={styles.label} numberOfLines={2}>
              {label}
            </Text>
            {labelRightSlot ? <View style={styles.labelRight}>{labelRightSlot}</View> : null}
          </View>
          {valueText ? (
            <Text style={styles.valueText} numberOfLines={1}>
              {valueText}
            </Text>
          ) : null}
        </View>
        <ModernSwitch value={value} disabled={disabled} onChange={onChange} />
      </View>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    container: {
      gap: spacing.xs
    },
    row: {
      minHeight: 56,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md
    },
    rowDisabled: {
      opacity: 0.6
    },
    left: {
      flex: 1,
      minWidth: 0,
      gap: 2
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      flexWrap: "wrap"
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.text,
      flexShrink: 1
    },
    labelRight: {
      marginTop: 1
    },
    valueText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted
    },
    switchTrack: {
      width: 58,
      height: 34,
      borderRadius: 999,
      borderWidth: 1,
      alignItems: "flex-start",
      justifyContent: "center",
      padding: 3,
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    switchTrackOff: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border
    },
    switchTrackOn: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary
    },
    switchThumb: {
      width: 28,
      height: 28,
      borderRadius: 999,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.06)",
      ...(theme.shadow.sm as object)
    },
    switchPressed: {
      opacity: 0.92
    },
    switchDisabled: {
      opacity: 0.6
    }
  });
}
