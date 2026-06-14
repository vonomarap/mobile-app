import { ReactNode } from "react";
import { Pressable, StyleProp, Text, View, ViewStyle } from "react-native";

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
  const hasValue = Boolean((value ?? "").trim());
  const isSelect = variant === "select";

  const rowClasses = [
    "border rounded-xl px-3 flex-row items-center gap-2",
    isSelect ? "min-h-[50px] px-4 gap-2.5" : "min-h-[44px]",
    disabled ? "opacity-50" : "opacity-100",
    active 
      ? "border-zinc-900 dark:border-zinc-200 bg-white dark:bg-zinc-900 shadow-sm"
      : "border-border dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40 active:bg-zinc-100 dark:active:bg-zinc-800",
  ].filter(Boolean).join(" ");

  const valueClasses = [
    "flex-1",
    isSelect ? "py-3 text-base font-semibold" : "py-2.5 text-sm font-medium",
    hasValue 
      ? "text-foreground dark:text-zinc-50" 
      : "text-muted-foreground dark:text-zinc-400"
  ].filter(Boolean).join(" ");

  return (
    <View className="gap-1" style={containerStyle}>
      <View className="flex-row items-center gap-1.5 flex-wrap">
        <Text className="text-sm font-semibold text-foreground dark:text-zinc-100 flex-shrink-1">
          {label}
        </Text>
        {labelRightSlot ? <View>{labelRightSlot}</View> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        className={rowClasses}
      >
        {leftSlot ? <View className={isSelect ? "min-w-[18px] items-center justify-center" : "min-w-[16px] items-center justify-center"}>{leftSlot}</View> : null}
        <Text numberOfLines={1} className={valueClasses}>
          {hasValue ? value : (placeholder ?? "")}
        </Text>
        {rightSlot ? <View className={isSelect ? "min-w-[18px] items-center justify-center" : "min-w-[16px] items-center justify-center"}>{rightSlot}</View> : null}
      </Pressable>

      {errorText ? <Text className="text-xs text-red-600 dark:text-red-400 pl-0.5">{errorText}</Text> : null}
      {helperText && !errorText ? <Text className="text-xs text-muted-foreground dark:text-zinc-400 pl-0.5">{helperText}</Text> : null}
    </View>
  );
}
