import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View
} from "react-native";
import { useReduceMotion } from "../hooks/useReduceMotion";

export type SegmentOption<T extends string> = {
  label: string;
  value: T;
  description?: string;
};

type LabelBehavior = "wrap" | "marquee";

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  labelNumberOfLines = 1,
  labelBehavior = "wrap",
  marqueeOnlySelected = true,
  marqueePauseMs = 900,
  marqueeSpeedPxPerSec = 35,
  marqueeMinOverflowPx = 8
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (next: T) => void;
  labelNumberOfLines?: number;
  labelBehavior?: LabelBehavior;
  marqueeOnlySelected?: boolean;
  marqueePauseMs?: number;
  marqueeSpeedPxPerSec?: number;
  marqueeMinOverflowPx?: number;
}): JSX.Element {

  return (
    <View 
      className="flex-row border border-border dark:border-zinc-800 rounded-xl p-1 bg-zinc-100/60 dark:bg-zinc-900/40 gap-1"
      accessibilityRole="tablist"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        const multiline = labelBehavior === "wrap" && labelNumberOfLines > 1;
        const isMarquee = labelBehavior === "marquee";
        const shouldMarquee = isMarquee && (!marqueeOnlySelected || selected);

        const itemClasses = [
          "flex-1 items-center justify-center rounded-lg px-2 border border-transparent",
          selected 
            ? "bg-white dark:bg-zinc-800 border-border dark:border-zinc-700 shadow-sm" 
            : "active:opacity-85",
          multiline ? "min-h-[54px] py-1.5" : "min-h-[40px] py-1",
          opt.description ? "min-h-[58px] py-1.5" : "",
        ].filter(Boolean).join(" ");

        const labelClasses = [
          "text-sm font-semibold text-center",
          selected 
            ? "text-zinc-950 dark:text-zinc-50" 
            : "text-muted-foreground dark:text-zinc-400"
        ].join(" ");

        const descClasses = [
          "text-xs text-center mt-0.5",
          selected 
            ? "text-zinc-900 dark:text-zinc-105" 
            : "text-muted-foreground dark:text-zinc-400"
        ].join(" ");

        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            className={itemClasses}
          >
            <View className="items-center justify-center gap-0.5 w-full">
              {shouldMarquee ? (
                <MarqueeLabel
                  text={opt.label}
                  pauseMs={marqueePauseMs}
                  speedPxPerSec={marqueeSpeedPxPerSec}
                  minOverflowPx={marqueeMinOverflowPx}
                  textStyle={selected ? { color: "#18181b" } : undefined}
                  textClass={labelClasses}
                />
              ) : (
                <Text
                  className={labelClasses}
                  numberOfLines={isMarquee ? 1 : labelNumberOfLines}
                >
                  {opt.label}
                </Text>
              )}
              {opt.description ? (
                <Text className={descClasses} numberOfLines={1}>
                  {opt.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function MarqueeLabel({
  text,
  pauseMs,
  speedPxPerSec,
  minOverflowPx,
  textStyle,
  textClass
}: {
  text: string;
  pauseMs: number;
  speedPxPerSec: number;
  minOverflowPx: number;
  textStyle?: StyleProp<TextStyle>;
  textClass?: string;
}): JSX.Element {
  const reduceMotion = useReduceMotion();
  const translateX = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const distance = Math.max(0, contentWidth - viewportWidth);
  const overflowing = viewportWidth > 0 && contentWidth > 0 && distance > minOverflowPx;

  const onViewportLayout = (e: LayoutChangeEvent) => {
    const next = Number(e?.nativeEvent?.layout?.width);
    if (!Number.isFinite(next) || next <= 0) return;
    setViewportWidth((prev) => (prev === next ? prev : next));
  };

  const onContentLayout = (e: LayoutChangeEvent) => {
    const next = Number(e?.nativeEvent?.layout?.width);
    if (!Number.isFinite(next) || next <= 0) return;
    setContentWidth((prev) => (prev === next ? prev : next));
  };

  useEffect(() => {
    const shouldRun = !reduceMotion && overflowing;

    animRef.current?.stop();
    animRef.current = null;
    translateX.setValue(0);

    if (!shouldRun) return;

    const speed = Math.max(1, speedPxPerSec);
    const duration = Math.max(250, Math.round((distance / speed) * 1000));
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(pauseMs),
        Animated.timing(translateX, {
          toValue: -distance,
          duration,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    );

    animRef.current = anim;
    anim.start();

    return () => {
      anim.stop();
      animRef.current = null;
    };
  }, [distance, overflowing, pauseMs, reduceMotion, speedPxPerSec, text, translateX]);

  const viewportClasses = [
    "self-stretch flex-row items-center min-w-0 overflow-hidden",
    overflowing ? "justify-start" : "justify-center"
  ].join(" ");

  return (
    <View 
      className={viewportClasses}
      style={Platform.OS === "web" ? ({ whiteSpace: "nowrap" } as object) : {}} 
      onLayout={onViewportLayout}
    >
      <Animated.View className="flex-shrink-0 self-start" style={{ transform: [{ translateX }] }} onLayout={onContentLayout}>
        <Text className={textClass} style={textStyle} numberOfLines={1} ellipsizeMode="clip">
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}
