import { ReactNode, useMemo } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type Props = {
  label: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  labelRightSlot?: ReactNode;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  helperText?: string;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function PickerField({
  label,
  value,
  placeholder,
  onPress,
  labelRightSlot,
  leftSlot,
  rightSlot,
  helperText,
  errorText,
  containerStyle
}: Props): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hasValue = Boolean((value ?? "").trim());

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRightSlot ? <View style={styles.labelRight}>{labelRightSlot}</View> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={(state) => [
          styles.inputRow,
          state.pressed ? styles.inputRowPressed : null
        ]}
      >
        {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}
        <Text style={[styles.value, !hasValue ? styles.placeholder : null]}>
          {hasValue ? value : (placeholder ?? "")}
        </Text>
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </Pressable>

      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      {helperText && !errorText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    container: {
      gap: spacing.xs
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
    inputRow: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.sm,
      backgroundColor: theme.colors.surface2,
      paddingHorizontal: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    inputRowPressed: {
      opacity: 0.92
    },
    leftSlot: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface
    },
    rightSlot: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface
    },
    value: {
      flex: 1,
      paddingVertical: 10,
      color: theme.colors.text,
      ...theme.typography.bodyRegular
    },
    placeholder: {
      color: theme.colors.textMuted
    },
    helper: {
      ...theme.typography.caption,
      color: theme.colors.textMuted
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.danger
    }
  });
}

