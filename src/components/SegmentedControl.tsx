import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View
} from "react-native";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {options.map((opt) => {
        const selected = opt.value === value;
        const multiline = labelBehavior === "wrap" && labelNumberOfLines > 1;
        const isMarquee = labelBehavior === "marquee";
        const shouldMarquee = isMarquee && (!marqueeOnlySelected || selected);

        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={(state) => {
              const pressed = state.pressed;
              const hovered = (state as unknown as { hovered?: boolean }).hovered;

              return [
                styles.item,
                multiline ? styles.itemMultiline : null,
                opt.description ? styles.itemWithDescription : null,
                selected ? styles.itemSelected : null,
                hovered && !selected ? styles.itemHovered : null,
                pressed ? styles.itemPressed : null,
              ];
            }}
          >
            <View style={styles.labelStack}>
              {shouldMarquee ? (
                <MarqueeLabel
                  text={opt.label}
                  pauseMs={marqueePauseMs}
                  speedPxPerSec={marqueeSpeedPxPerSec}
                  minOverflowPx={marqueeMinOverflowPx}
                  textStyle={[styles.label, selected ? styles.labelSelected : null]}
                />
              ) : (
                <Text
                  style={[styles.label, selected ? styles.labelSelected : null]}
                  numberOfLines={isMarquee ? 1 : labelNumberOfLines}
                >
                  {opt.label}
                </Text>
              )}
              {opt.description ? (
                <Text style={[styles.description, selected ? styles.descriptionSelected : null]} numberOfLines={1}>
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
  textStyle
}: {
  text: string;
  pauseMs: number;
  speedPxPerSec: number;
  minOverflowPx: number;
  textStyle: StyleProp<TextStyle>;
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

  return (
    <View style={[stylesForMarquee.viewport, overflowing ? stylesForMarquee.viewportOverflow : null]} onLayout={onViewportLayout}>
      <Animated.View style={[stylesForMarquee.content, { transform: [{ translateX }] }]} onLayout={onContentLayout}>
        <Text style={textStyle} numberOfLines={1} ellipsizeMode="clip">
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

const stylesForMarquee = StyleSheet.create({
  viewport: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ whiteSpace: "nowrap" } as object) : {})
  },
  viewportOverflow: {
    justifyContent: "flex-start"
  },
  content: {
    flexShrink: 0,
    alignSelf: "flex-start"
  }
});

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.sm,
      padding: 4,
      backgroundColor: theme.colors.surface2,
      gap: 4
    },
    item: {
      flex: 1,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: "transparent",
      // Remove browser focus ring/outline on web after click/tap.
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    itemMultiline: {
      minHeight: 54,
      paddingVertical: 6
    },
    itemWithDescription: {
      minHeight: 58,
      paddingVertical: 6
    },
    itemSelected: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      ...(theme.shadow.sm as object)
    },
    itemHovered: {
      backgroundColor: theme.colors.surface
    },
    itemPressed: {
      opacity: 0.9
    },
    label: {
      ...theme.typography.label,
      color: theme.colors.textMuted,
      textAlign: "center"
    },
    labelSelected: {
      color: theme.colors.text
    },
    labelStack: {
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      minWidth: 0
    },
    description: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      textAlign: "center"
    },
    descriptionSelected: {
      color: theme.colors.primary
    }
  });
}
