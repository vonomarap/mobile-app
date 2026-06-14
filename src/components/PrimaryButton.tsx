import React, { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

function renderSlot(slot: ReactNode, color: string): ReactNode {
  if (!React.isValidElement(slot)) return slot;
  
  const props = slot.props as any;
  if ('color' in props && (props.color === "#FFFFFF" || props.color === "#ffffff" || !props.color)) {
    return React.cloneElement(slot, { color } as any);
  }
  return slot;
}

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
  const isDisabled = disabled || loading;

  const isSoft = tone === "soft";

  const btnClasses = [
    "flex-row items-center justify-center min-h-[46px] rounded-xl px-4 py-2 border gap-2",
    isSoft
      ? "bg-secondary dark:bg-zinc-900 border-border dark:border-zinc-800 active:bg-accent dark:active:bg-zinc-850"
      : "bg-zinc-950 dark:bg-zinc-50 border-zinc-950 dark:border-zinc-50 active:opacity-90 shadow-sm",
    isDisabled ? "opacity-55" : "opacity-100",
  ].filter(Boolean).join(" ");

  const textClasses = [
    "text-base font-bold",
  ].join(" ");

  const resolvedTextColor = textColor ?? (
    isSoft 
      ? (theme.isDark ? "#fafafa" : "#18181b") 
      : (theme.isDark ? "#09090b" : "#ffffff")
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      className={btnClasses}
      style={buttonStyle}
    >
      {leftSlot ? <View className="items-center justify-center">{renderSlot(leftSlot, resolvedTextColor)}</View> : null}
      {loading ? (
        <ActivityIndicator
          size="small"
          color={resolvedTextColor}
          className="mr-1"
        />
      ) : null}
      <Text
        className={textClasses}
        style={[
          { color: resolvedTextColor },
          textStyle
        ]}
      >
        {title}
      </Text>
      {rightSlot ? <View className="items-center justify-center">{renderSlot(rightSlot, resolvedTextColor)}</View> : null}
    </Pressable>
  );
}
