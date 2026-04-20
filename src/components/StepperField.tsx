import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useMemo, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

function toFiniteNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

type Props = {
  label: string;
  labelRightSlot?: ReactNode;
  value: string;
  onChangeText: (next: string) => void;
  min: number;
  max: number;
  step: number;
  snapStep?: number;
  unit?: string;
  allowDirectEdit?: boolean;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  keyboardType?: TextInputProps["keyboardType"];
  inputMode?: TextInputProps["inputMode"];
};

export function StepperField({
  label,
  labelRightSlot,
  value,
  onChangeText,
  min,
  max,
  step,
  snapStep,
  unit,
  allowDirectEdit = true,
  disabled,
  containerStyle,
  keyboardType = "number-pad",
  inputMode = "numeric"
}: Props): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);
  const [decHovered, setDecHovered] = useState(false);
  const [incHovered, setIncHovered] = useState(false);

  const raw = value ?? "";
  const numeric = toFiniteNumber(raw, NaN);
  const base = clamp(Number.isFinite(numeric) ? numeric : min, min, max);
  const canDec = !disabled && base > min;
  const canInc = !disabled && base < max;

  const snapIfNeeded = (next: number): number => {
    const s = toFiniteNumber(snapStep, 0);
    if (!Number.isFinite(s) || s <= 0) return Math.round(next);
    return Math.round(next / s) * s;
  };

  const stepBy = (delta: -1 | 1) => {
    if (disabled) return;
    const current = toFiniteNumber(raw, min);
    const next = clamp(clamp(current, min, max) + delta * step, min, max);
    const snapped = clamp(snapIfNeeded(next), min, max);
    onChangeText(String(Math.round(snapped)));
  };

  const getDisplayValue = (): string => {
    if (raw === "") return "";
    const n = toFiniteNumber(raw, NaN);
    if (!Number.isFinite(n)) return "";
    const next = clamp(n, min, max);
    const snapped = clamp(snapIfNeeded(next), min, max);
    return String(Math.round(snapped));
  };

  const onBlurClamp = () => {
    if (raw.trim() === "") return;
    const n = toFiniteNumber(raw, NaN);
    if (!Number.isFinite(n)) return;
    const next = clamp(snapIfNeeded(Math.round(n)), min, max);
    if (String(next) !== raw) onChangeText(String(next));
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRightSlot ? <View style={styles.labelRight}>{labelRightSlot}</View> : null}
      </View>

      <View style={[styles.controlRow, focused ? styles.controlFocused : null, disabled ? styles.controlDisabled : null]}>
        <Pressable
          accessibilityRole="button"
          disabled={!canDec}
          onPress={() => stepBy(-1)}
          onHoverIn={() => setDecHovered(true)}
          onHoverOut={() => setDecHovered(false)}
          style={({ pressed }) => [
            styles.stepBtn,
            styles.stepBtnLeft,
            decHovered && canDec ? styles.stepBtnHovered : null,
            !canDec ? styles.stepBtnDisabled : null,
            pressed && canDec ? styles.stepBtnPressed : null
          ]}
        >
          <Ionicons name="remove" size={18} color={!canDec ? theme.colors.textMuted : theme.colors.text} />
        </Pressable>

        <View style={styles.valueWrap}>
          {allowDirectEdit ? (
            <TextInput
              value={focused ? raw : getDisplayValue()}
              onChangeText={(txt) => onChangeText(txt.replace(/[^\d]/g, ""))}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onBlurClamp();
              }}
              keyboardType={keyboardType}
              inputMode={inputMode}
              placeholder="--"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.valueInput}
            />
          ) : (
            <Text style={styles.valueText}>{getDisplayValue() || "--"}</Text>
          )}
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={!canInc}
          onPress={() => stepBy(1)}
          onHoverIn={() => setIncHovered(true)}
          onHoverOut={() => setIncHovered(false)}
          style={({ pressed }) => [
            styles.stepBtn,
            styles.stepBtnRight,
            incHovered && canInc ? styles.stepBtnHovered : null,
            !canInc ? styles.stepBtnDisabled : null,
            pressed && canInc ? styles.stepBtnPressed : null
          ]}
        >
          <Ionicons name="add" size={18} color={!canInc ? theme.colors.textMuted : theme.colors.text} />
        </Pressable>
      </View>
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
    controlRow: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.sm,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "stretch",
      overflow: "hidden"
    },
    controlFocused: {
      borderColor: theme.colors.focus
    },
    controlDisabled: {
      opacity: 0.6
    },
    stepBtn: {
      width: 46,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      // Remove browser focus ring/outline on web after click/tap.
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    stepBtnLeft: {
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
    },
    stepBtnRight: {
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border,
    },
    stepBtnHovered: {
      backgroundColor: theme.colors.surface2
    },
    stepBtnPressed: {
      backgroundColor: theme.colors.surface2,
      opacity: 0.88
    },
    stepBtnDisabled: {
      opacity: 0.42
    },
    valueWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.sm
    },
    valueInput: {
      ...theme.typography.bodyRegular,
      color: theme.colors.text,
      textAlign: "center",
      paddingVertical: 10,
      minWidth: 52,
      ...( { outlineStyle: "none", outlineWidth: 0 } as object )
    },
    valueText: {
      ...theme.typography.bodyRegular,
      color: theme.colors.text,
      textAlign: "center",
      minWidth: 52
    },
    unit: {
      ...theme.typography.caption,
      color: theme.colors.textMuted
    }
  });
}
