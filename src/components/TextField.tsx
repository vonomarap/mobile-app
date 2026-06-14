import { ReactNode, useState } from "react";
import { StyleProp, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from "react-native";

type Props = Omit<TextInputProps, "style"> & {
  label?: string;
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
  const [focused, setFocused] = useState(false);

  const rowClasses = [
    "min-h-[48px] border rounded-xl px-4 flex-row items-center gap-3 bg-white dark:bg-zinc-950",
    focused
      ? "border-zinc-900 dark:border-zinc-200"
      : "border-border dark:border-zinc-800",
    inputProps.editable === false ? "opacity-60" : "opacity-100"
  ].filter(Boolean).join(" ");

  const labelClasses = [
    "text-sm font-semibold flex-shrink-1",
    errorText ? "text-red-650 dark:text-red-400" : "text-foreground dark:text-zinc-100"
  ].join(" ");

  return (
    <View className="gap-1.5" style={containerStyle}>
      {label ? (
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <Text className={labelClasses}>{label}</Text>
          {labelRightSlot ? <View className="mt-0.5">{labelRightSlot}</View> : null}
        </View>
      ) : null}
      <View className={rowClasses}>
        {leftSlot ? <View className="min-w-[20px] items-center justify-center">{leftSlot}</View> : null}
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
          placeholderTextColor={focused ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.4)"}
          className="flex-1 py-2.5 text-sm font-medium text-foreground dark:text-zinc-50"
          style={[
            { outlineStyle: "none", outlineWidth: 0 } as object,
            inputStyle
          ]}
        />
      </View>
      {errorText ? <Text className="text-xs text-red-650 dark:text-red-400 pl-0.5">{errorText}</Text> : null}
      {helperText && !errorText ? <Text className="text-xs text-muted-foreground dark:text-zinc-400 pl-0.5">{helperText}</Text> : null}
    </View>
  );
}
