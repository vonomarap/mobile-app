import type { ReactNode } from "react";
import { useMemo, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useReduceMotion } from "../hooks/useReduceMotion";

type Props = {
  onPress: () => void;
  disabled?: boolean;
  radius: number;
  glowColor: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: "button";
};

export function GlowPressable({
  onPress,
  disabled,
  radius,
  glowColor,
  style,
  children,
  accessibilityLabel,
  accessibilityRole = "button"
}: Props): JSX.Element {
  const reduceMotion = useReduceMotion();
  const hover = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => makeStyles(glowColor, radius), [glowColor, radius]);

  const animateHover = (next: 0 | 1) => {
    hover.stopAnimation();
    if (reduceMotion) {
      hover.setValue(next);
      return;
    }
    Animated.timing(hover, {
      toValue: next,
      duration: next === 1 ? 140 : 120,
      easing: next === 1 ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start();
  };

  const triggerPulse = () => {
    if (disabled) return;
    pulse.stopAnimation();
    pulse.setValue(0);
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(pulse, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  };

  const hoverOpacity = hover.interpolate({ inputRange: [0, 1], outputRange: [0, 0.1] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] });
  const overlayOpacity = Animated.add(hoverOpacity, pulseOpacity);
  const overlayScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPressIn={triggerPulse}
      onHoverIn={Platform.OS === "web" ? () => animateHover(1) : undefined}
      onHoverOut={Platform.OS === "web" ? () => animateHover(0) : undefined}
      style={({ pressed }) => [
        styles.base,
        style,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null
      ]}
    >
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity,
            transform: [{ scale: overlayScale }]
          }
        ]}
      />
    </Pressable>
  );
}

function makeStyles(glowColor: string, radius: number): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    base: {
      position: "relative",
      borderRadius: radius,
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    pressed: {
      opacity: 0.98
    },
    disabled: {
      opacity: 0.55
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: glowColor,
      backgroundColor: glowColor
    }
  });
}

