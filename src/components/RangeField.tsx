import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import { Pressable, StyleProp, Text, TextInput, View, ViewStyle } from "react-native";
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
  const [focused, setFocused] = useState(false);

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

  const cardClasses = [
    "border border-border dark:border-zinc-800 rounded-xl p-1.5 bg-card dark:bg-zinc-950",
    disabled ? "opacity-50" : "opacity-100"
  ].filter(Boolean).join(" ");

  const decBtnClasses = [
    "w-9 h-9 border border-border dark:border-zinc-800 bg-secondary dark:bg-zinc-900 rounded-lg items-center justify-center",
    !canDec ? "opacity-35" : "active:opacity-70 active:bg-white dark:active:bg-zinc-800"
  ].filter(Boolean).join(" ");

  const incBtnClasses = [
    "w-9 h-9 border border-border dark:border-zinc-800 bg-secondary dark:bg-zinc-900 rounded-lg items-center justify-center",
    !canInc ? "opacity-35" : "active:opacity-70 active:bg-white dark:active:bg-zinc-800"
  ].filter(Boolean).join(" ");

  const textColor = theme.isDark ? "#fafafa" : "#18181b";
  const iconColor = theme.isDark ? "#a1a1aa" : "#71717a";

  return (
    <View className="gap-1 mb-1" style={containerStyle}>
      {label ? (
        <View className="flex-row items-center justify-between px-0.5 mb-0.5">
          <Text className="text-sm font-semibold text-foreground dark:text-zinc-100">{label}</Text>
          {labelRightSlot ? <View>{labelRightSlot}</View> : null}
        </View>
      ) : null}

      <View className={cardClasses}>
        <View className="flex-row items-center justify-between w-full">
          <Pressable
            accessibilityRole="button"
            disabled={!canDec}
            onPress={() => stepBy(-1)}
            className={decBtnClasses}
          >
            <Ionicons name="remove" size={20} color={!canDec ? iconColor : textColor} />
          </Pressable>

          <View className="flex-row items-center justify-center gap-1 flex-1">
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
              placeholderTextColor={iconColor}
              className="text-lg font-bold text-center text-foreground dark:text-zinc-50 py-1 min-w-[40px]"
              style={{ outlineStyle: "none", outlineWidth: 0 } as object}
              editable={!disabled}
            />
            {unit ? <Text className="text-xs font-semibold text-muted-foreground dark:text-zinc-400 mt-0.5">{unit}</Text> : null}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!canInc}
            onPress={() => stepBy(1)}
            className={incBtnClasses}
          >
            <Ionicons name="add" size={20} color={!canInc ? iconColor : textColor} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
