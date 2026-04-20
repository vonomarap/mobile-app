import { ReactNode, useMemo } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { spacing } from "../theme/tokens";
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
  disabled?: boolean;
  active?: boolean;
  variant?: "default" | "select";
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
  containerStyle,
  disabled,
  active = false,
  variant = "default"
}: Props): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const hasValue = Boolean((value ?? "").trim());
  const isSelect = variant === "select";

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRightSlot ? <View style={styles.labelRight}>{labelRightSlot}</View> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={(state) => {
          const hovered = (state as unknown as { hovered?: boolean }).hovered;
          return [
            styles.inputRow,
            isSelect ? styles.inputRowSelect : null,
            disabled ? styles.inputRowDisabled : null,
            active ? styles.inputRowActive : null,
            active && isSelect ? styles.inputRowSelectActive : null,
            hovered && !active ? styles.inputRowHovered : null,
            hovered && !active && isSelect ? styles.inputRowSelectHovered : null,
            state.pressed ? styles.inputRowPressed : null
          ];
        }}
      >
        {leftSlot ? <View style={[styles.leftSlot, isSelect ? styles.leftSlotSelect : null]}>{leftSlot}</View> : null}
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            isSelect ? styles.valueSelect : null,
            !hasValue ? styles.placeholder : null,
            !hasValue && isSelect ? styles.placeholderSelect : null
          ]}
        >
          {hasValue ? value : (placeholder ?? "")}
        </Text>
        {rightSlot ? <View style={[styles.rightSlot, isSelect ? styles.rightSlotSelect : null]}>{rightSlot}</View> : null}
      </Pressable>

      {errorText ? <Text style={[styles.error, isSelect ? styles.feedbackSelect : null]}>{errorText}</Text> : null}
      {helperText && !errorText ? <Text style={[styles.helper, isSelect ? styles.feedbackSelect : null]}>{helperText}</Text> : null}
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
      minHeight: 44,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    inputRowSelect: {
      minHeight: 50,
      paddingHorizontal: 14,
      gap: 10
    },
    inputRowDisabled: {
      opacity: 0.6
    },
    inputRowActive: {
      borderColor: theme.colors.focus,
      backgroundColor: theme.colors.surface
    },
    inputRowSelectActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surface
    },
    inputRowHovered: {
      borderColor: theme.colors.focus
    },
    inputRowSelectHovered: {
      borderColor: theme.colors.textMuted
    },
    inputRowPressed: {
      opacity: 0.96,
      backgroundColor: theme.colors.surface2
    },
    leftSlot: {
      minWidth: 16,
      alignItems: "center",
      justifyContent: "center"
    },
    leftSlotSelect: {
      minWidth: 18
    },
    rightSlot: {
      minWidth: 16,
      alignItems: "center",
      justifyContent: "center"
    },
    rightSlotSelect: {
      minWidth: 18
    },
    value: {
      flex: 1,
      paddingVertical: 10,
      color: theme.colors.text,
      ...theme.typography.bodyRegular,
      fontWeight: "500"
    },
    valueSelect: {
      paddingVertical: 12,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "600"
    },
    placeholder: {
      color: theme.colors.textMuted
    },
    placeholderSelect: {
      fontWeight: "500"
    },
    helper: {
      ...theme.typography.caption,
      color: theme.colors.textMuted
    },
    feedbackSelect: {
      paddingLeft: 2
    },
    error: {
      ...theme.typography.caption,
      color: theme.colors.danger
    }
  });
}
