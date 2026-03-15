import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { useTheme } from "../theme/ThemeProvider";
import { fetchPromoBanners, PromoBanner, PromoBannerKind, PromoBannerPlacement } from "../services/storefront";

const AUTO_ROTATE_MS = 8_400;
const SWITCH_ANIM_MS = 1100;
const BANNER_HEIGHT = 152;
const HIGH_PRIORITY_MIN = 15;

function isHighPriority(value?: number): boolean {
  const v = typeof value === "number" ? value : Number(value);
  return Number.isFinite(v) && v >= HIGH_PRIORITY_MIN;
}

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();

  const withToMillis = value as { toMillis?: () => unknown };
  if (typeof withToMillis.toMillis === "function") {
    const ms = Number(withToMillis.toMillis());
    return Number.isFinite(ms) ? ms : null;
  }

  const withSeconds = value as { seconds?: unknown };
  if (typeof withSeconds.seconds === "number" && Number.isFinite(withSeconds.seconds)) {
    return withSeconds.seconds * 1000;
  }

  return null;
}

function normalizeKind(kind?: PromoBannerKind): PromoBannerKind {
  if (kind === "winter") return "winter";
  if (kind === "promo") return "promo";
  return "regular";
}

function kindLabel(kind: PromoBannerKind): string {
  if (kind === "winter") return "Зимняя акция";
  if (kind === "promo") return "Акция";
  return "Обычное";
}

function formatPromoDate(valueMs: number): string {
  const date = new Date(valueMs);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}.${month}.${year}`;
}

function winterValidityLabel(item: PromoBanner, kind: PromoBannerKind): string | null {
  if (kind !== "winter") return null;
  const startsAt = toMillis(item.startsAt);
  const endsAt = toMillis(item.endsAt);
  if (startsAt === null || endsAt === null) return null;
  return `с ${formatPromoDate(startsAt)} по ${formatPromoDate(endsAt)}`;
}

function filterAndSort(items: PromoBanner[], placement: PromoBannerPlacement): PromoBanner[] {
  const now = Date.now();

  return [...items]
    .filter((item) => {
      if (!item || typeof item !== "object") return false;
      if (!String(item.id || "").trim()) return false;
      if (!String(item.title || "").trim()) return false;

      if (item.active === false) return false;

      const placements = item.placements;
      const matchesPlacement = !placements || placements.length === 0 || placements.includes(placement);
      if (!matchesPlacement) return false;

      const startsAt = toMillis(item.startsAt);
      if (startsAt !== null && now < startsAt) return false;

      const endsAt = toMillis(item.endsAt);
      if (endsAt !== null && now > endsAt) return false;

      return true;
    })
    .sort((a, b) => {
      const ap = Number.isFinite(a.priority) ? (a.priority as number) : 0;
      const bp = Number.isFinite(b.priority) ? (b.priority as number) : 0;
      if (ap !== bp) return bp - ap;
      return String(a.title || "").localeCompare(String(b.title || ""), "ru", { sensitivity: "base" });
    });
}

const WINTER_BORDER_PULSE_MS = 2550;

function WinterBorderGlow({ reduceMotion, animate }: { reduceMotion: boolean; animate: boolean }): JSX.Element {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.stopAnimation();

    if (reduceMotion || !animate) {
      pulse.setValue(0);
      return;
    }

    pulse.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: WINTER_BORDER_PULSE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: WINTER_BORDER_PULSE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animate, pulse, reduceMotion]);

  const borderOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.isDark ? 0.55 : 0.45, 1]
  });

  return (
    <View pointerEvents="none" style={[styles.winterFx, { width: "100%", height: "100%" }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.winterHalo,
          {
            borderWidth: 2,
            opacity: borderOpacity,
            borderColor: theme.isDark ? "rgba(56,189,248,0.72)" : "rgba(2,132,199,0.58)"
          }
        ]}
      />
    </View>
  );
}

function PromoBannerSlide({
  item,
  kind,
  cardWidth,
  mediaWidth,
  webPadX,
  webPadY,
  reduceMotion,
  index,
  isActive,
}: {
  item: PromoBanner;
  kind: PromoBannerKind;
  cardWidth: number;
  mediaWidth: number;
  webPadX: number;
  webPadY: number;
  reduceMotion: boolean;
  index: number;
  isActive: boolean;
}): JSX.Element {
  const theme = useTheme();
  const high = isHighPriority(item.priority);
  const featuredWeb = Platform.OS === "web" && (high || kind === "winter" || kind === "promo");
  const hover = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;
  const winterPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (featuredWeb) return;
    hover.stopAnimation();
    press.stopAnimation();
    hover.setValue(0);
    press.setValue(0);
  }, [featuredWeb, hover, press]);

  const isWinter = kind === "winter";
  const isPromo = kind === "promo";
  const shouldAnimateWinterGlow = Platform.OS === "web" && isWinter && isActive && !reduceMotion;

  useEffect(() => {
    winterPulse.stopAnimation();
    if (!shouldAnimateWinterGlow) {
      winterPulse.setValue(0);
      return;
    }

    winterPulse.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(winterPulse, { toValue: 1, duration: WINTER_BORDER_PULSE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(winterPulse, { toValue: 0, duration: WINTER_BORDER_PULSE_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shouldAnimateWinterGlow, winterPulse]);

  const pillBg = isWinter
    ? theme.isDark
      ? "rgba(56,189,248,0.18)"
      : "rgba(224,242,254,0.92)"
    : isPromo
    ? theme.isDark
      ? "rgba(249,115,22,0.18)"
      : "rgba(255,237,213,0.92)"
    : "transparent";

  const pillText = isWinter ? (theme.isDark ? "#38BDF8" : "#0284C7") : theme.isDark ? "#FB923C" : "#C2410C";

  const mediaGradientColors = isWinter
    ? theme.isDark
      ? (["rgba(56,189,248,0.22)", "rgba(14,165,233,0.06)", "rgba(0,0,0,0.00)"] as const)
      : (["rgba(125,211,252,0.46)", "rgba(186,230,253,0.18)", "rgba(255,255,255,0.00)"] as const)
    : isPromo
    ? theme.isDark
      ? (["rgba(249,115,22,0.20)", "rgba(234,88,12,0.06)", "rgba(0,0,0,0.00)"] as const)
      : (["rgba(251,146,60,0.34)", "rgba(255,237,213,0.10)", "rgba(255,255,255,0.00)"] as const)
    : theme.isDark
    ? (["rgba(148,163,184,0.12)", "rgba(15,23,42,0.04)", "rgba(0,0,0,0.00)"] as const)
    : (["rgba(203,213,225,0.38)", "rgba(226,232,240,0.16)", "rgba(255,255,255,0.00)"] as const);

  const glowBorder = isWinter
    ? "rgba(56,189,248,0.80)"
    : isPromo
    ? "rgba(249,115,22,0.55)"
    : theme.isDark
    ? "rgba(148,163,184,0.40)"
    : "rgba(15,23,42,0.12)";

  const glowBg = isWinter
    ? "rgba(56,189,248,0.07)"
    : isPromo
    ? "rgba(249,115,22,0.05)"
    : theme.isDark
    ? "rgba(148,163,184,0.04)"
    : "rgba(148,163,184,0.06)";

  const fxWidth = Math.max(0, Math.round(cardWidth - webPadX * 2));
  const constantGlow = featuredWeb && isWinter;

  const glowWebStyle =
    Platform.OS === "web" && isWinter && shouldAnimateWinterGlow
      ? (({
          // Keep the glow inside the slide padding to avoid ugly clipping by the ScrollView.
          boxShadow: (() => {
            const outer = Math.max(10, Math.round(webPadY * 0.95));
            const mid = Math.max(8, Math.round(outer * 0.65));
            return `0 0 0 1px rgba(56,189,248,0.46), 0 0 ${mid}px rgba(56,189,248,0.34), 0 0 ${outer}px rgba(56,189,248,0.22)`;
          })(),
        } as unknown) as object)
      : null;

  const animate = (value: Animated.Value, toValue: number, duration: number) => {
    value.stopAnimation();
    if (reduceMotion) {
      value.setValue(toValue);
      return;
    }
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  };

  const setHover = (next: 0 | 1) => {
    if (!featuredWeb) return;
    animate(hover, next, next === 1 ? 180 : 140);
  };

  const setPress = (next: 0 | 1) => {
    if (!featuredWeb) return;
    animate(press, next, next === 1 ? 90 : 130);
  };

  const scale = constantGlow
    ? 1
    : Animated.multiply(
        hover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.006] }),
        press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.985] })
      );

  const interaction = Animated.add(hover, press).interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });

  const baseGlowOpacity = featuredWeb ? (constantGlow ? 1 : high ? 0.82 : 0.60) : 0;
  const overlayOpacity = featuredWeb
    ? constantGlow
      ? 1
      : interaction.interpolate({
          inputRange: [0, 1],
          outputRange: [baseGlowOpacity, 1],
          extrapolate: "clamp"
        })
    : 0;

  const overlayScale = constantGlow ? 1 : hover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.006] });
  const validityLabel = winterValidityLabel(item, kind);
  const validityTextColor = theme.isDark ? "rgba(224,242,254,0.92)" : "rgba(7,89,133,0.90)";
  const winterGlowOpacity = winterPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.isDark ? 0.65 : 0.55, 1]
  });

  const content = (
    <Card style={[styles.card, { borderRadius: radius.lg }]} padded={false} elevated>
      <View style={styles.stage}>
        {isWinter ? (
          <LinearGradient
            pointerEvents="none"
            colors={
              theme.isDark
                ? (["rgba(56,189,248,0.16)", "rgba(59,130,246,0.08)", "rgba(0,0,0,0.00)"] as const)
                : (["rgba(224,242,254,0.48)", "rgba(186,230,253,0.18)", "rgba(255,255,255,0.00)"] as const)
            }
            start={{ x: 0.05, y: 0.0 }}
            end={{ x: 1.0, y: 1.0 }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}

        <View style={styles.inner}>
          <View style={styles.textCol}>
            <View style={styles.textTop}>
              {isWinter || isPromo ? (
                <View style={[styles.pill, { backgroundColor: pillBg }]}>
                  <Text style={[styles.pillText, { color: pillText }]}>{kindLabel(kind)}</Text>
                </View>
              ) : null}
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text style={[styles.subtitle, { color: theme.colors.textMuted }]} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>

            {validityLabel ? (
              <Text style={[styles.validityText, { color: validityTextColor }]} numberOfLines={1}>
                {validityLabel}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.media,
              {
                width: mediaWidth,
                backgroundColor: theme.colors.surface2,
                borderLeftColor: theme.isDark ? "rgba(255,255,255,0.10)" : theme.colors.border
              }
            ]}
          >
            <LinearGradient
              colors={mediaGradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.mediaImage} resizeMode="cover" /> : null}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: theme.isDark ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.10)" }
              ]}
            />
          </View>
        </View>

        {isWinter && Platform.OS !== "web" ? <WinterBorderGlow reduceMotion={reduceMotion} animate={isActive} /> : null}
      </View>
    </Card>
  );

  const zIndex = featuredWeb ? (isActive ? 30 : 20) : 1;
  const outerStyle = {
    width: cardWidth,
    paddingVertical: webPadY,
    position: "relative" as const,
    zIndex,
    overflow: "visible" as const
  };

  if (!featuredWeb) {
    return (
      <View style={outerStyle}>
        <View style={{ paddingHorizontal: webPadX }}>{content}</View>
      </View>
    );
  }

  return (
    <View style={outerStyle}>
      <View style={{ paddingHorizontal: webPadX }}>
	        <Animated.View style={{ transform: [{ scale }] }}>
	          <Pressable
	            onPressIn={constantGlow ? undefined : () => setPress(1)}
	            onPressOut={constantGlow ? undefined : () => setPress(0)}
	            onHoverIn={Platform.OS === "web" && !constantGlow ? () => setHover(1) : undefined}
	            onHoverOut={Platform.OS === "web" && !constantGlow ? () => setHover(0) : undefined}
	            onFocus={Platform.OS === "web" && !constantGlow ? () => setHover(1) : undefined}
	            onBlur={Platform.OS === "web" && !constantGlow ? () => setHover(0) : undefined}
	            style={styles.slidePressable}
	          >
	            {content}
	            <Animated.View
	              pointerEvents="none"
	              style={[
	                styles.slideGlow,
	                glowWebStyle,
	                {
	                  borderWidth: isWinter ? 2 : 1,
	                  borderColor: glowBorder,
	                  backgroundColor: glowBg,
	                  opacity: isWinter ? winterGlowOpacity : overlayOpacity,
	                  transform: [{ scale: overlayScale }]
	                }
	              ]}
	            />
	          </Pressable>
	        </Animated.View>
      </View>
    </View>
  );
}

const MemoPromoBannerSlide = memo(PromoBannerSlide);

export function PromoBanners({ placement }: { placement: PromoBannerPlacement }): JSX.Element | null {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { width: windowWidth } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const trackX = useRef(new Animated.Value(0)).current;
  const trackAnim = useRef<Animated.CompositeAnimation | null>(null);
  const animSeq = useRef(0);
  const dragStartX = useRef(0);

  const onLayout = useCallback((e: any) => {
    const next = Number(e?.nativeEvent?.layout?.width);
    if (!Number.isFinite(next) || next <= 0) return;
    setLayoutWidth((prev) => (prev === next ? prev : next));
  }, []);

  const promosQuery = useQuery({
    queryKey: ["app_settings", "promos"],
    queryFn: fetchPromoBanners,
    staleTime: 60_000
  });

  const items = useMemo(() => filterAndSort(promosQuery.data ?? [], placement), [placement, promosQuery.data]);

  const rawWidth = layoutWidth ?? windowWidth;
  const safeWidth = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 360;
  const pageWidth = safeWidth;
  const cardWidth = pageWidth;
  const mediaWidth = Math.min(320, Math.max(160, Math.round(cardWidth * 0.32)));
  const canPaginate = items.length > 1 && Number.isFinite(pageWidth) && pageWidth > 0;
  const isDesktopWeb = Platform.OS === "web" && windowWidth >= 900;
  const showArrows = isDesktopWeb && canPaginate;
  const switchMs = isDesktopWeb ? 520 : SWITCH_ANIM_MS;
  const webPadX = Platform.OS === "web" ? Math.min(54, Math.max(16, Math.round(cardWidth * 0.05))) : 0;
  const webPadY = Platform.OS === "web" ? Math.min(26, Math.max(10, Math.round(webPadX * 0.55))) : 0;
  const arrowsInset = Platform.OS === "web" ? Math.max(6, Math.min(28, Math.round(webPadX * 0.6))) : 6;

  const stopTrackAnimation = useCallback(() => {
    animSeq.current += 1;
    trackAnim.current?.stop();
    trackAnim.current = null;
    trackX.stopAnimation();
  }, [trackX]);

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      if (!canPaginate) return;
      const maxIndex = Math.max(0, items.length - 1);
      const nextIndex = Math.min(maxIndex, Math.max(0, Math.round(index)));
      const targetX = -nextIndex * pageWidth;

      setActiveIndex(nextIndex);
      stopTrackAnimation();

      if (!animated || reduceMotion) {
        trackX.setValue(targetX);
        setIsInteracting(false);
        return;
      }

      setIsInteracting(true);
      const seq = animSeq.current + 1;
      animSeq.current = seq;

      const anim = Animated.timing(trackX, {
        toValue: targetX,
        duration: switchMs,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true
      });

      trackAnim.current = anim;
      anim.start(({ finished }) => {
        if (animSeq.current !== seq) return;
        trackAnim.current = null;
        if (finished) trackX.setValue(targetX);
        setIsInteracting(false);
      });
    },
    [canPaginate, items.length, pageWidth, reduceMotion, stopTrackAnimation, switchMs, trackX]
  );

  useEffect(() => {
    if (canPaginate) return;
    stopTrackAnimation();
    if (activeIndex !== 0) setActiveIndex(0);
    trackX.setValue(0);
    setIsInteracting(false);
  }, [activeIndex, canPaginate, stopTrackAnimation, trackX]);

  useEffect(() => {
    if (!canPaginate) return;
    if (activeIndex < items.length) return;
    scrollToIndex(0, false);
  }, [activeIndex, canPaginate, items.length, scrollToIndex]);

  useEffect(() => {
    if (!canPaginate) return;
    stopTrackAnimation();
    trackX.setValue(-activeIndex * pageWidth);
    setIsInteracting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageWidth]);

  useEffect(() => {
    if (!canPaginate) return;
    if (reduceMotion) return;
    if (isInteracting) return;

    const id = setInterval(() => {
      const next = (activeIndex + 1) % items.length;
      scrollToIndex(next, true);
    }, AUTO_ROTATE_MS);

    return () => clearInterval(id);
  }, [activeIndex, canPaginate, isInteracting, items.length, reduceMotion, scrollToIndex]);

  const hasFeatured =
    Platform.OS === "web" &&
    items.some((item) => isHighPriority(item.priority) || normalizeKind(item.kind) === "winter" || normalizeKind(item.kind) === "promo");

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        if (!canPaginate) return false;
        const dx = Math.abs(gestureState.dx);
        const dy = Math.abs(gestureState.dy);
        return dx > 8 && dx > dy;
      },
      onPanResponderGrant: () => {
        if (!canPaginate) return;
        stopTrackAnimation();
        setIsInteracting(true);
        trackX.stopAnimation((value) => {
          const v = typeof value === "number" && Number.isFinite(value) ? value : -activeIndex * pageWidth;
          dragStartX.current = v;
        });
      },
      onPanResponderMove: (_evt, gestureState) => {
        if (!canPaginate) return;
        const base = dragStartX.current;
        let next = base + gestureState.dx;
        const minX = -(items.length - 1) * pageWidth;
        const maxX = 0;

        if (next < minX) next = minX + (next - minX) * 0.25;
        if (next > maxX) next = maxX + (next - maxX) * 0.25;

        trackX.setValue(next);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (!canPaginate) return;
        const threshold = Math.max(26, Math.round(pageWidth * 0.14));
        const fastSwipe = 0.55;

        let nextIndex = activeIndex;
        if (gestureState.dx < -threshold || gestureState.vx < -fastSwipe) nextIndex += 1;
        else if (gestureState.dx > threshold || gestureState.vx > fastSwipe) nextIndex -= 1;

        nextIndex = Math.min(items.length - 1, Math.max(0, nextIndex));
        scrollToIndex(nextIndex, true);
      },
      onPanResponderTerminate: (_evt, gestureState) => {
        if (!canPaginate) return;
        const threshold = Math.max(26, Math.round(pageWidth * 0.14));
        const fastSwipe = 0.55;

        let nextIndex = activeIndex;
        if (gestureState.dx < -threshold || gestureState.vx < -fastSwipe) nextIndex += 1;
        else if (gestureState.dx > threshold || gestureState.vx > fastSwipe) nextIndex -= 1;

        nextIndex = Math.min(items.length - 1, Math.max(0, nextIndex));
        scrollToIndex(nextIndex, true);
      }
    });
  }, [activeIndex, canPaginate, items.length, pageWidth, scrollToIndex, stopTrackAnimation, trackX]);

  if (!items.length) return null;

  return (
    <View style={[styles.wrap, hasFeatured ? ({ zIndex: 50 } as any) : null]} onLayout={onLayout}>
      <View style={[styles.viewport, { width: pageWidth }]} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.track,
            {
              width: cardWidth * items.length,
              transform: [{ translateX: trackX }]
            }
          ]}
        >
          {items.map((item, index) => (
            <MemoPromoBannerSlide
              key={item.id}
              item={item}
              kind={normalizeKind(item.kind)}
              cardWidth={cardWidth}
              mediaWidth={mediaWidth}
              webPadX={webPadX}
              webPadY={webPadY}
              reduceMotion={reduceMotion}
              index={index}
              isActive={index === activeIndex}
            />
          ))}
        </Animated.View>
      </View>

	      {showArrows ? (
	        <View style={[styles.arrowsOverlay, { paddingHorizontal: arrowsInset }]} pointerEvents="box-none">
	          <Pressable
	            hitSlop={12}
	            onPress={() => scrollToIndex(activeIndex - 1, !reduceMotion)}
	            style={({ pressed }: { pressed: boolean }) => [
	              styles.arrowButton,
              {
                backgroundColor: theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                borderColor: theme.isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)",
                opacity: pressed ? 0.7 : 0.32
              }
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={theme.isDark ? "rgba(255,255,255,0.74)" : "rgba(0,0,0,0.64)"}
            />
	          </Pressable>
	
	          <Pressable
	            hitSlop={12}
	            onPress={() => scrollToIndex(activeIndex + 1, !reduceMotion)}
	            style={({ pressed }: { pressed: boolean }) => [
	              styles.arrowButton,
              {
                backgroundColor: theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                borderColor: theme.isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)",
                opacity: pressed ? 0.7 : 0.32
              }
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.isDark ? "rgba(255,255,255,0.74)" : "rgba(0,0,0,0.64)"}
            />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    position: "relative"
  },
  rail: {
    padding: 0
  },
  viewport: {
    overflow: "hidden"
  },
  track: {
    flexDirection: "row"
  },
  card: {
    overflow: "hidden"
  },
  stage: {
    position: "relative",
    width: "100%",
    height: BANNER_HEIGHT
  },
  slidePressable: {
    position: "relative",
    borderRadius: radius.lg,
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
  },
  slideGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  inner: {
    flexDirection: "row",
    alignItems: "stretch",
    height: BANNER_HEIGHT
  },
  textCol: {
    flex: 1,
    padding: spacing.sm,
    justifyContent: "space-between",
    minWidth: 0
  },
  textTop: {
    gap: 6
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  pillText: {
    ...font(800),
    fontSize: 11,
    letterSpacing: 0.2
  },
  title: {
    ...font(900),
    fontSize: 15,
    lineHeight: 19
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16
  },
  validityText: {
    ...font(700),
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.15
  },
  media: {
    borderLeftWidth: 1,
    overflow: "hidden"
  },
  winterMediaFx: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.92
  },
  mediaImage: {
    width: "100%",
    height: "100%"
  },
  winterFx: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  winterFxMedia: {
    borderRadius: 0
  },
  winterAurora: {
    position: "absolute",
    left: -60,
    top: -60
  },
  winterShimmer: {
    position: "absolute",
    left: -140,
    top: -60
  },
  winterParticle: {
    position: "absolute",
    backgroundColor: "rgba(224,242,254,0.96)"
  },
  winterHaloSoft: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg
  },
  winterHalo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1
  },
  arrowsOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6
  },
  arrowButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  }
});
