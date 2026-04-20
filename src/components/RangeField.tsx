import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useMemo, useState } from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
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
  unit?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function RangeField({
  label,
  labelRightSlot,
  value,
  onChangeText,
  min,
  max,
  step,
  unit,
  disabled,
  containerStyle,
}: Props): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);
  const [decHovered, setDecHovered] = useState(false);
  const [incHovered, setIncHovered] = useState(false);

  const raw = value ?? "";
  const numeric = toFiniteNumber(raw, NaN);
  const clampedValue = clamp(Number.isFinite(numeric) ? numeric : min, min, max);
  const canDec = !disabled && clampedValue > min;
  const canInc = !disabled && clampedValue < max;

  const commitValue = (next: number) => {
    const snapped = clamp(Math.round(next / step) * step, min, max);
    onChangeText(String(snapped));
  };

  const stepBy = (delta: -1 | 1) => {
    if (disabled) return;
    const current = toFiniteNumber(raw, min);
    commitValue(current + delta * step);
  };

  const getDisplayValue = (): string => {
    if (raw === "") return "";
    const n = toFiniteNumber(raw, NaN);
    if (!Number.isFinite(n)) return "";
    return String(clamp(Math.round(n), min, max));
  };

  const onBlurClamp = () => {
    if (raw.trim() === "") return;
    const next = toFiniteNumber(raw, NaN);
    if (!Number.isFinite(next)) return;
    commitValue(next);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelRightSlot ? <View style={styles.labelRight}>{labelRightSlot}</View> : null}
      </View>

      <View style={[styles.shell, focused ? styles.shellFocused : null, disabled ? styles.shellDisabled : null]}>
        <View style={styles.inputRow}>
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
              pressed && canDec ? styles.stepBtnPressed : null,
            ]}
          >
            <Ionicons name="remove" size={18} color={!canDec ? theme.colors.textMuted : theme.colors.text} />
          </Pressable>

          <View style={styles.valueWrap}>
            <TextInput
              value={focused ? raw : getDisplayValue()}
              onChangeText={(txt) => onChangeText(txt.replace(/[^\d]/g, ""))}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onBlurClamp();
              }}
              keyboardType="number-pad"
              inputMode="numeric"
              placeholder="--"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.valueInput}
              editable={!disabled}
            />
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
              pressed && canInc ? styles.stepBtnPressed : null,
            ]}
          >
            <Ionicons name="add" size={18} color={!canInc ? theme.colors.textMuted : theme.colors.text} />
          </Pressable>
        </View>

        <View style={[styles.sliderWrap, { borderTopColor: theme.colors.border }]}>
          <Slider
            value={clampedValue}
            onValueChange={(next) => commitValue(next)}
            minimumValue={min}
            maximumValue={max}
            step={step}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.primary}
            disabled={disabled}
            style={styles.slider}
          />
          <View style={styles.boundsRow}>
            <Text style={styles.boundsText}>
              {min}
              {unit ? ` ${unit}` : ""}
            </Text>
            <Text style={styles.boundsText}>
              {max}
              {unit ? ` ${unit}` : ""}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    container: {
      gap: spacing.xs,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      flexWrap: "wrap",
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.text,
      flexShrink: 1,
    },
    labelRight: {
      marginTop: 1,
    },
    shell: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.sm,
      backgroundColor: theme.colors.surface,
      overflow: "hidden",
    },
    shellFocused: {
      borderColor: theme.colors.focus,
    },
    shellDisabled: {
      opacity: 0.6,
    },
    inputRow: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "stretch",
    },
    stepBtn: {
      width: 46,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object ),
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
      backgroundColor: theme.colors.surface2,
    },
    stepBtnPressed: {
      backgroundColor: theme.colors.surface2,
      opacity: 0.88,
    },
    stepBtnDisabled: {
      opacity: 0.42,
    },
    valueWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    valueInput: {
      ...theme.typography.bodyRegular,
      color: theme.colors.text,
      textAlign: "center",
      paddingVertical: 10,
      minWidth: 56,
      ...( { outlineStyle: "none", outlineWidth: 0 } as object ),
    },
    unit: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    sliderWrap: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      gap: 4,
      borderTopWidth: 1,
    },
    slider: {
      width: "100%",
      height: 24,
    },
    boundsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    boundsText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
  });
}
