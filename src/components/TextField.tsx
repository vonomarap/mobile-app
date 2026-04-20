import { ReactNode, useMemo, useState } from "react";
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from "react-native";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

type Props = Omit<TextInputProps, "style"> & {
  label: string;
  labelRightSlot?: ReactNode;
  leftSlot?: ReactNode;
  helperText?: string;
  errorText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function TextField({
  label,
  labelRightSlot,
  leftSlot,
  helperText,
  errorText,
  containerStyle,
  inputStyle,
  ...inputProps
}: Props): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRightSlot ? <View style={styles.labelRight}>{labelRightSlot}</View> : null}
      </View>
      <View
        style={[
          styles.inputRow,
          focused ? styles.inputRowFocused : null,
          inputProps.editable === false ? styles.inputRowDisabled : null
        ]}
      >
        {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}
        <TextInput
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, inputStyle]}
        />
      </View>
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
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.sm,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    inputRowFocused: {
      borderColor: theme.colors.focus
    },
    inputRowDisabled: {
      opacity: 0.6
    },
    leftSlot: {
      minWidth: 20,
      alignItems: "center",
      justifyContent: "center"
    },
    input: {
      flex: 1,
      paddingVertical: 10,
      color: theme.colors.text,
      ...( { outlineStyle: "none", outlineWidth: 0 } as object )
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
