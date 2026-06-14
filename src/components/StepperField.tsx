import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import { Pressable, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
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
  inputMode = "numeric",
}: Props): JSX.Element {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

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

  const containerClasses = [
    "flex-row items-center justify-between w-full gap-2",
    disabled ? "opacity-50" : "opacity-100"
  ].filter(Boolean).join(" ");

  const decBtnClasses = [
    "w-8 h-8 border border-border dark:border-zinc-800 bg-secondary dark:bg-zinc-900 rounded-lg items-center justify-center",
    !canDec ? "opacity-35" : "active:opacity-70 active:bg-white dark:active:bg-zinc-800"
  ].filter(Boolean).join(" ");

  const incBtnClasses = [
    "w-8 h-8 border border-border dark:border-zinc-800 bg-secondary dark:bg-zinc-900 rounded-lg items-center justify-center",
    !canInc ? "opacity-35" : "active:opacity-70 active:bg-white dark:active:bg-zinc-800"
  ].filter(Boolean).join(" ");

  const textColor = theme.isDark ? "#fafafa" : "#18181b";
  const iconColor = theme.isDark ? "#a1a1aa" : "#71717a";

  return (
    <View className="py-2" style={containerStyle}>
      <View className={containerClasses}>
        <View className="flex-row items-center gap-1.5 flex-1">
          <Text className="text-sm font-semibold text-foreground dark:text-zinc-100">{label}</Text>
          {labelRightSlot ? <View>{labelRightSlot}</View> : null}
        </View>

        <View className="flex-row items-center gap-1.5">
          <Pressable
            accessibilityRole="button"
            disabled={!canDec}
            onPress={() => stepBy(-1)}
            className={decBtnClasses}
          >
            <Ionicons name="remove" size={16} color={!canDec ? iconColor : textColor} />
          </Pressable>

          <View className="flex-row items-center justify-center min-w-[44px] gap-0.5">
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
                placeholderTextColor={iconColor}
                className="text-sm font-bold text-center text-foreground dark:text-zinc-50 py-1 min-w-[32px]"
                style={{ outlineStyle: "none", outlineWidth: 0 } as object}
              />
            ) : (
              <Text className="text-sm font-bold text-center text-foreground dark:text-zinc-150 min-w-[32px]">
                {getDisplayValue() || "--"}
              </Text>
            )}
            {unit ? <Text className="text-xs font-semibold text-muted-foreground dark:text-zinc-400">{unit}</Text> : null}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!canInc}
            onPress={() => stepBy(1)}
            className={incBtnClasses}
          >
            <Ionicons name="add" size={16} color={!canInc ? iconColor : textColor} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
