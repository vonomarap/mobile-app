import { useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { Product } from "../services/storefront";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { formatMoney } from "../utils/money";
import { useCurrency } from "../services/currency-context";
import { useTranslation } from "react-i18next";

type Kind = "window" | "door";
type CardVariant = "grid" | "list";

export function ProductCard({
  item,
  kind,
  onPress,
  variant = "grid",
  desktopGrid = false
}: {
  item: Product;
  kind?: Kind;
  onPress?: () => void;
  variant?: CardVariant;
  desktopGrid?: boolean;
}): JSX.Element {
  const reduceMotion = useReduceMotion();
  const theme = useTheme();
  const currency = useCurrency();
  const { t } = useTranslation();
  const glow = useRef(new Animated.Value(0)).current;
  const isList = variant === "list";
  const { width } = useWindowDimensions();
  const hideDescOnPhoneGrid = !isList && width < 520;
  const showDescription = Boolean(item.description) && !hideDescOnPhoneGrid;

  const hasPrice = Number.isFinite(item.priceFrom) && (item.priceFrom ?? 0) > 0;
  const priceText = hasPrice ? `${t("product.priceFrom")} ${formatMoney(item.priceFrom as number, currency)}` : t("product.priceOnRequest");
  const openCardText = t("catalog.card.open");
  const openCardAccessibilityLabel = `${openCardText}: ${item.title}`;

  const listMediaWidth = width < 360 ? 120 : width < 480 ? 140 : width < 680 ? 180 : 240;
  const listMediaHeight = width < 360 ? 120 : width < 480 ? 140 : width < 680 ? 160 : 176;
  const listBodyPadding = width < 480 ? spacing.sm : spacing.md;
  const listTitleSize = width < 480 ? 16 : 18;
  const listTitleLine = width < 480 ? 20 : 22;
  const listDescLines = width < 480 ? 1 : 2;
  const imageDimColor = desktopGrid
    ? (theme.isDark ? "rgba(0,0,0,0.44)" : "rgba(0,0,0,0.32)")
    : (theme.isDark ? "rgba(0,0,0,0.21)" : "rgba(0,0,0,0.14)");

  const glowWebStyle =
    Platform.OS === "web"
      ? ({
          boxShadow:
            "0 0 0 1px rgba(249,115,22,0.40), 0 14px 46px rgba(249,115,22,0.28), 0 0 84px rgba(249,115,22,0.20)"
        } as any)
      : null;

  const animateGlow = (next: 0 | 1) => {
    glow.stopAnimation();
    if (reduceMotion) {
      glow.setValue(next);
      return;
    }
    Animated.timing(glow, {
      toValue: next,
      duration: next === 1 ? 180 : 140,
      easing: next === 1 ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start();
  };

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.01] });

  if (isList) {
    const inner = (
      <View style={[styles.desktopListRow, { minHeight: listMediaHeight }]}>
        <View
          style={[
            styles.desktopListMedia,
            {
              width: listMediaWidth,
              height: listMediaHeight,
              backgroundColor: theme.colors.surface2
            }
          ]}
        >
          {item.image ? (
            <>
              <Image source={{ uri: item.image }} style={styles.desktopListImage} resizeMode="cover" />
              <View pointerEvents="none" style={[styles.desktopListImageDim, { backgroundColor: imageDimColor }]} />
            </>
          ) : (
            <View style={[styles.desktopListFallback, { backgroundColor: theme.colors.primarySoft }]}>
              <View style={styles.desktopListFallbackBadge}>
                <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
              </View>
            </View>
          )}
        </View>

        <View style={[styles.desktopListBody, { padding: listBodyPadding }]}>
          <View style={styles.desktopListTextBlock}>
            <Text
              style={[
                styles.desktopListTitle,
                { color: theme.colors.text, fontSize: listTitleSize, lineHeight: listTitleLine }
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {item.description ? (
              <Text style={[styles.desktopListDesc, { color: theme.colors.textMuted }]} numberOfLines={listDescLines}>
                {item.description}
              </Text>
            ) : null}
          </View>

          <View style={styles.desktopListFooter}>
            <Text style={[styles.desktopListPrice, { color: theme.colors.primary }]} numberOfLines={1}>
              {priceText}
            </Text>
            {onPress ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={openCardAccessibilityLabel}
                onPress={(event) => {
                  event.stopPropagation();
                  onPress();
                }}
                style={(state) => [
                  styles.desktopListButton,
                  { backgroundColor: theme.colors.primary },
                  state.pressed ? styles.desktopListButtonPressed : null
                ]}
              >
                <Text style={styles.desktopListButtonText} numberOfLines={1}>
                  {openCardText}
                </Text>
              </Pressable>
            ) : (
              <View pointerEvents="none" style={[styles.desktopListButton, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.desktopListButtonText} numberOfLines={1}>
                  {openCardText}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );

    const common = [styles.pressable, styles.pressableDesktopList, theme.shadow.md] as const;
    const clipped = <View style={styles.desktopListClip}>{inner}</View>;

    if (!onPress) {
      return (
        <View style={[...common, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {clipped}
        </View>
      );
    }

    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onHoverIn={Platform.OS === "web" ? () => animateGlow(1) : undefined}
        onHoverOut={Platform.OS === "web" ? () => animateGlow(0) : undefined}
        onFocus={Platform.OS === "web" ? () => animateGlow(1) : undefined}
        onBlur={Platform.OS === "web" ? () => animateGlow(0) : undefined}
        style={(state) => {
          const pressed = state.pressed;
          return [
            ...common,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
            pressed ? styles.pressed : null,
          ];
        }}
      >
        {clipped}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowOverlay,
            { borderColor: "rgba(249,115,22,0.55)" },
            glowWebStyle,
            {
              opacity: glowOpacity,
              transform: [{ scale: glowScale }]
            }
          ]}
        />
      </Pressable>
    );
  }


  const gridBlurRadius = 60;
  const gridBlurScale = 1.2;
  // Raise the blur high enough to sit behind the title, then fade it in with a mask
  // so there's no harsh "cut line" where the blur begins.
  const gridBlurTopPercent = showDescription ? 28 : 38;
  const blurOpacity = 1;
  const gridBlurMaskWebStyle =
    Platform.OS === "web"
      ? ({
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 2%, rgba(0,0,0,0.25) 12%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,1) 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 2%, rgba(0,0,0,0.25) 12%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,1) 100%)",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        } as any)
      : null;


  const content = (
    <View style={[styles.clip, !isList ? styles.clipGrid : null, isList ? styles.clipList : null, { backgroundColor: theme.colors.surface2 }]}>
      {item.image ? (
        <>
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
          <View pointerEvents="none" style={[styles.imageDim, { backgroundColor: imageDimColor }]} />
          <Animated.View
            pointerEvents="none"
            style={[styles.gridBlurClip, { top: `${gridBlurTopPercent}%`, opacity: blurOpacity }, gridBlurMaskWebStyle]}
          >
            <Image
              source={{ uri: item.image }}
              style={[styles.gridBlurImage, { transform: [{ scale: gridBlurScale }] }]}
              resizeMode="cover"
              blurRadius={gridBlurRadius}
            />
            <View
              pointerEvents="none"
              style={[
                styles.gridBlurTint,
                { backgroundColor: theme.isDark ? "rgba(0,0,0,0.32)" : "rgba(0,0,0,0.18)" }
              ]}
            />
          </Animated.View>
        </>
      ) : (
        <View style={[styles.fallback, { backgroundColor: theme.colors.primarySoft }]}>
          <View style={styles.fallbackBadge}>
            <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
          </View>
        </View>
      )}

      <View style={[styles.content, isList ? styles.contentList : null]}>
        <View style={styles.contentInner}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {isList ? (
              <View style={styles.pricePill}>
                <Text style={styles.priceText} numberOfLines={1}>
                  {priceText}
                </Text>
              </View>
            ) : null}
          </View>

          {showDescription ? (
            <Text style={styles.desc} numberOfLines={isList ? 1 : 2}>
              {item.description}
            </Text>
          ) : null}

          <View style={[styles.chipRow, { justifyContent: "flex-end" }]}>
            <View style={styles.priceChip}>
              <Text style={styles.priceChipText} numberOfLines={1}>
                {priceText}
              </Text>
            </View>
          </View>

          {onPress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={openCardAccessibilityLabel}
              onPress={(event) => {
                event.stopPropagation();
                onPress();
              }}
              style={(state) => [
                styles.cta,
                isList ? styles.ctaList : null,
                state.pressed ? styles.ctaPressed : null
              ]}
            >
              <Text style={styles.ctaText} numberOfLines={1}>
                {openCardText}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.cta, isList ? styles.ctaList : null]}>
              <Text style={styles.ctaText} numberOfLines={1}>
                {openCardText}
              </Text>
            </View>
          )}
        </View>
      </View>

    </View>
  );

  if (!onPress) {
    return (
      <View style={[styles.pressable, !isList ? styles.pressableGrid : null, theme.shadow.lg]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onHoverIn={Platform.OS === "web" ? () => animateGlow(1) : undefined}
      onHoverOut={Platform.OS === "web" ? () => animateGlow(0) : undefined}
      onFocus={Platform.OS === "web" ? () => animateGlow(1) : undefined}
      onBlur={Platform.OS === "web" ? () => animateGlow(0) : undefined}
      style={(state) => {
        const pressed = state.pressed;
        return [
          styles.pressable,
          !isList ? styles.pressableGrid : null,
          theme.shadow.lg,
          pressed ? styles.pressed : null,
        ];
      }}
    >
      {content}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowOverlay,
          !isList ? styles.glowOverlayGrid : null,
          { borderColor: "rgba(249,115,22,0.55)" },
          glowWebStyle,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }]
          }
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    position: "relative",
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  pressableGrid: {
    borderRadius: 30
  },
  pressableDesktopList: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
    borderWidth: 1,
  },
  desktopListClip: {
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }]
  },
  desktopListRow: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 176,
  },
  desktopListMedia: {
    width: 240,
    height: 176,
    position: "relative",
    overflow: "hidden",
  },
  desktopListImage: {
    width: "100%",
    height: "100%",
  },
  desktopListImageDim: {
    ...StyleSheet.absoluteFillObject,
  },
  desktopListFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  desktopListFallbackBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  desktopListBody: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  desktopListTextBlock: {
    minWidth: 0,
    gap: spacing.xs,
  },
  desktopListTitle: {
    minWidth: 0,
    ...font(900),
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  desktopListDesc: {
    minWidth: 0,
    ...font(700),
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  desktopListFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  desktopListPrice: {
    flex: 1,
    minWidth: 0,
    ...font(900),
    fontSize: 14,
    letterSpacing: 0.15,
  },
  desktopListButton: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object ),
  },
  desktopListButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }]
  },
  desktopListButtonText: {
    color: "#FFFFFF",
    ...font(900),
    fontSize: 13,
    letterSpacing: 0.2,
  },
  clip: {
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
    aspectRatio: 0.74,
    minHeight: 280
  },
  clipGrid: {
    // Grid cards: slightly taller + rounder corners.
    aspectRatio: 0.643,
    borderRadius: 30
  },
  clipList: {
    // Compact list-mode: keep the same visual language, but reduce height on wide screens.
    aspectRatio: 1.3,
    minHeight: 440,
    maxHeight: 920
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
  imageDim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  gridBlurClip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    zIndex: 2,
  },
  gridBlurImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  gridBlurTint: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  fallbackBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)"
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: "transparent"
  },
  glowOverlayGrid: {
    borderRadius: 30
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    padding: spacing.md,
    justifyContent: "flex-end",
  },
  contentInner: {
    gap: spacing.sm,
  },
  contentList: {
    padding: spacing.sm,
    gap: spacing.xs
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: "#FFFFFF",
    ...font(900),
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: 0.2
  },
  pricePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 28,
    justifyContent: "center",
    maxWidth: "46%"
  },
  priceText: {
    color: "#FFFFFF",
    ...font(900),
    fontSize: 12,
    letterSpacing: 0.2
  },
  desc: {
    color: "rgba(255,255,255,0.82)",
    ...font(700),
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1
  },
  chipText: {
    color: "#FFFFFF",
    ...font(900),
    fontSize: 11,
    letterSpacing: 0.2
  },
  priceBadgeText: {
    color: "rgba(249,115,22,1)",
    ...font(900),
    fontSize: 14,
    letterSpacing: 0.2,
  },
  priceChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(234,88,12,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  priceChipText: {
    color: "#FFFFFF",
    ...font(900),
    fontSize: 14,
    letterSpacing: 0.2,
  },
  cta: {
    marginTop: spacing.xs,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  ctaList: {
    height: 40
  },
  ctaPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }]
  },
  ctaText: {
    color: "#111827",
    ...font(900),
    fontSize: 13,
    letterSpacing: 0.2
  }
});
