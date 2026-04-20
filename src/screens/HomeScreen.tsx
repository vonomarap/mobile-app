import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useTranslation } from "react-i18next";
import { AppScrollView } from "../components/AppScrollView";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { SiteFooter } from "../components/SiteFooter";
import { useReduceMotion } from "../hooks/useReduceMotion";
import type { RootStackParamList } from "../navigation/types";
import { useCurrency } from "../services/currency-context";
import { fetchSiteSettings } from "../services/site-settings";
import { fetchProducts, type Product } from "../services/storefront";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { formatMoney } from "../utils/money";

type HomeNavigation = NativeStackNavigationProp<RootStackParamList, "Home">;
type WorkflowStepKey = "request" | "measurement" | "estimate" | "production" | "installation";

const HOME_WORKFLOW_STEPS: ReadonlyArray<{ key: WorkflowStepKey; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "request", icon: "chatbubble-ellipses-outline" },
  { key: "measurement", icon: "scan-outline" },
  { key: "estimate", icon: "calculator-outline" },
  { key: "production", icon: "build-outline" },
  { key: "installation", icon: "construct-outline" },
];

const OLD_LOCAL_GEO_RE = /канев|kanev|каневск|kanevsk|каневской|каневском|район|district/i;

function sanitizeRegionalText(value?: string | null): string | undefined {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return undefined;
  if (OLD_LOCAL_GEO_RE.test(trimmed)) return undefined;
  return trimmed;
}

function compareProductsByPrice(a: Product, b: Product): number {
  const ap = typeof a.priceFrom === "number" && Number.isFinite(a.priceFrom) ? a.priceFrom : Number.POSITIVE_INFINITY;
  const bp = typeof b.priceFrom === "number" && Number.isFinite(b.priceFrom) ? b.priceFrom : Number.POSITIVE_INFINITY;
  if (ap !== bp) return ap - bp;
  return a.title.localeCompare(b.title, "ru", { sensitivity: "base" });
}

function WorkflowStepCard({
  stepKey,
  icon,
  index,
  active,
  reduceMotion,
}: {
  stepKey: WorkflowStepKey;
  icon: keyof typeof Ionicons.glyphMap;
  index: number;
  active: boolean;
  reduceMotion: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const containerProgress = useRef(new Animated.Value(reduceMotion || active ? 1 : 0)).current;
  const textProgress = useRef(new Animated.Value(reduceMotion || active ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      containerProgress.setValue(1);
      textProgress.setValue(1);
      return;
    }

    if (!active) {
      return;
    }

    Animated.parallel([
      Animated.timing(containerProgress, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textProgress, {
        toValue: 1,
        duration: 420,
        delay: 90,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, containerProgress, reduceMotion, textProgress]);

  return (
    <Animated.View
      style={[
        styles.workflowRow,
        {
          opacity: containerProgress,
          transform: [
            {
              translateY: containerProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [22, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.workflowRail}>
        <View style={[styles.workflowMarker, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.workflowMarkerText, { color: theme.colors.text }]}>{String(index + 1).padStart(2, "0")}</Text>
        </View>
        {index < HOME_WORKFLOW_STEPS.length - 1 ? (
          <View style={[styles.workflowLine, { backgroundColor: theme.colors.border }]} />
        ) : null}
      </View>

      <View style={[styles.workflowCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <View style={styles.workflowCardHeader}>
          <View style={[styles.workflowIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
            <Ionicons name={icon} size={18} color={theme.colors.primary} />
          </View>
          <Text style={[styles.workflowStepLabel, { color: theme.colors.textMuted }]}>
            {t("home.steps.stepLabel", { index: index + 1 })}
          </Text>
        </View>

        <Animated.View
          style={{
            opacity: textProgress,
            transform: [
              {
                translateY: textProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          }}
        >
          <Text style={[styles.workflowCardTitle, { color: theme.colors.text }]}>{t(`home.steps.items.${stepKey}.title`)}</Text>
          <Text style={[styles.workflowCardText, { color: theme.colors.textMuted }]}>{t(`home.steps.items.${stepKey}.body`)}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export function HomeScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<HomeNavigation>();
  const reduceMotion = useReduceMotion();
  const currency = useCurrency();
  const { width, height } = useWindowDimensions();

  const gutter = width < 420 ? spacing.sm : spacing.md;
  const heroTitleSize = width >= 900 ? 56 : width >= 680 ? 44 : 34;
  const heroTitleLineHeight = width >= 900 ? 62 : width >= 680 ? 50 : 40;
  const sectionTitleSize = width >= 680 ? 30 : 24;
  const sectionTitleLineHeight = width >= 680 ? 36 : 30;
  const tileWidth = width >= 980 ? "31.8%" : width >= 640 ? "48.5%" : "100%";
  const previewImageHeight = width >= 980 ? 220 : width >= 640 ? 204 : 196;
  const priceTileWidth = width >= 1120 ? "23.6%" : width >= 860 ? "31.8%" : width >= 640 ? "48.5%" : "100%";
  const priceImageHeight = width >= 980 ? 188 : width >= 640 ? 168 : 184;
  const workflowSectionMaxWidth = width >= 1080 ? 860 : 760;
  const stepOffsetsRef = useRef<number[]>([]);
  const stepsSectionOffsetRef = useRef(0);
  const scrollYRef = useRef(0);
  const [revealedSteps, setRevealedSteps] = useState<boolean[]>(() => HOME_WORKFLOW_STEPS.map(() => false));

  const productsQuery = useQuery({
    queryKey: ["home", "products"],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const siteSettingsQuery = useQuery({
    queryKey: ["app_settings", "site"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const settings = siteSettingsQuery.data ?? {};
  const brandName = sanitizeRegionalText(settings.brandName) || "КанОкна";
  const pricedProducts = useMemo(
    () =>
      [...(productsQuery.data ?? [])]
        .filter((item) => typeof item.priceFrom === "number" && Number.isFinite(item.priceFrom))
        .sort(compareProductsByPrice)
        .slice(0, 4),
    [productsQuery.data]
  );
  const previewProducts = useMemo(() => {
    const items = productsQuery.data ?? [];
    if (!items.length) return [];

    const pricedIds = new Set(pricedProducts.map((item) => item.id));
    const withoutPrices = items.filter((item) => !pricedIds.has(item.id));

    return (withoutPrices.length ? withoutPrices : items).slice(0, 3);
  }, [pricedProducts, productsQuery.data]);

  const revealWorkflowSteps = useCallback((scrollY: number) => {
    if (reduceMotion) {
      return;
    }

    const threshold = scrollY + height * 0.84;
    setRevealedSteps((prev) => {
      let changed = false;
      const next = prev.map((shown, index) => {
        if (shown) return true;
        const localOffset = stepOffsetsRef.current[index];
        if (typeof localOffset !== "number") return false;
        const absoluteOffset = stepsSectionOffsetRef.current + localOffset;
        if (threshold >= absoluteOffset + 24) {
          changed = true;
          return true;
        }
        return false;
      });
      return changed ? next : prev;
    });
  }, [height, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      setRevealedSteps(HOME_WORKFLOW_STEPS.map(() => true));
      return;
    }

    revealWorkflowSteps(scrollYRef.current);
  }, [reduceMotion, revealWorkflowSteps, width]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextY = event.nativeEvent.contentOffset.y ?? 0;
    scrollYRef.current = nextY;
    revealWorkflowSteps(nextY);
  }, [revealWorkflowSteps]);

  const handleStepsSectionLayout = useCallback((event: LayoutChangeEvent) => {
    stepsSectionOffsetRef.current = event.nativeEvent.layout.y;
    revealWorkflowSteps(scrollYRef.current);
  }, [revealWorkflowSteps]);

  const handleWorkflowStepLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    stepOffsetsRef.current[index] = event.nativeEvent.layout.y;
    revealWorkflowSteps(scrollYRef.current);
  }, [revealWorkflowSteps]);

  const showPricesSection = productsQuery.isLoading || pricedProducts.length > 0;

  return (
    <ScreenContainer>
      <AppScrollView
        trackNavGlass
        onScroll={handleScroll}
        contentContainerStyle={[styles.page, { paddingHorizontal: gutter, paddingBottom: 0 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.heroMetaRow}>
            <Text style={[styles.heroMetaBrand, { color: theme.colors.text }]}>{brandName}</Text>
            <View style={[styles.heroMetaDot, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.heroMetaRegion, { color: theme.colors.textMuted }]}>{t("home.kicker")}</Text>
          </View>

          <Text
            style={[
              styles.heroTitle,
              {
                color: theme.colors.text,
                fontSize: heroTitleSize,
                lineHeight: heroTitleLineHeight,
              },
            ]}
          >
            {t("home.title")}
          </Text>

          <Text style={[styles.heroSubtitle, { color: theme.colors.textMuted }]}>{t("home.subtitle")}</Text>

          <View style={styles.heroActions}>
            <PrimaryButton
              title={t("home.browseCatalog")}
              onPress={() => navigation.navigate("Catalog")}
              leftSlot={<Ionicons name="grid-outline" size={18} color="#FFFFFF" />}
              buttonStyle={styles.primaryButton}
            />
            <PrimaryButton
              title={t("home.openCalculator")}
              tone="soft"
              onPress={() => navigation.navigate("Calculator")}
              leftSlot={<Ionicons name="calculator-outline" size={18} color={theme.colors.primary} />}
              buttonStyle={styles.secondaryButton}
            />
          </View>
        </View>

        <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: theme.colors.textMuted }]}>{t("home.stepsEyebrow")}</Text>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text, fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight },
              ]}
            >
              {t("home.stepsTitle")}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>{t("home.stepsSubtitle")}</Text>
          </View>

          <View
            onLayout={handleStepsSectionLayout}
            style={[styles.workflowList, { maxWidth: workflowSectionMaxWidth }]}
          >
            {HOME_WORKFLOW_STEPS.map((item, index) => (
              <View key={item.key} onLayout={(event) => handleWorkflowStepLayout(index, event)}>
                <WorkflowStepCard
                  stepKey={item.key}
                  icon={item.icon}
                  index={index}
                  active={revealedSteps[index] ?? reduceMotion}
                  reduceMotion={reduceMotion}
                />
              </View>
            ))}
          </View>
        </View>

        {showPricesSection ? (
          <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionEyebrow, { color: theme.colors.textMuted }]}>{t("home.pricesEyebrow")}</Text>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text, fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight },
                ]}
              >
                {t("home.pricesTitle")}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>{t("home.pricesSubtitle")}</Text>
            </View>

            <View style={styles.tileGrid}>
              {productsQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <View
                      key={`price-placeholder-${index}`}
                      style={[
                        styles.catalogTile,
                        styles.catalogTilePlaceholder,
                        {
                          width: priceTileWidth,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surface,
                        },
                      ]}
                    >
                      <View style={[styles.placeholderMedia, { height: priceImageHeight, backgroundColor: theme.colors.surface2 }]} />
                      <View style={styles.catalogTileBody}>
                        <Text style={[styles.catalogTileTitle, { color: theme.colors.text }]}>{t("common.loading")}</Text>
                        <Text style={[styles.priceValue, { color: theme.colors.primary }]}>{t("common.loading")}</Text>
                      </View>
                    </View>
                  ))
                : pricedProducts.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
                      style={[styles.tilePressable, { width: priceTileWidth }]}
                    >
                      {({ pressed }) => (
                        <View
                          style={[
                            styles.catalogTile,
                            {
                              borderColor: theme.colors.border,
                              backgroundColor: theme.colors.surface,
                            },
                            pressed ? styles.pressed : null,
                          ]}
                        >
                          <View style={[styles.previewMedia, { height: priceImageHeight, backgroundColor: theme.colors.surface2 }]}>
                            {item.image ? (
                              <Image source={{ uri: item.image }} style={styles.previewImage} resizeMode="cover" />
                            ) : (
                              <View style={styles.previewFallback}>
                                <Ionicons name="pricetag-outline" size={22} color={theme.colors.textMuted} />
                              </View>
                            )}
                          </View>

                          <View style={styles.catalogTileBody}>
                            <Text style={[styles.catalogTileTitle, { color: theme.colors.text }]} numberOfLines={2}>
                              {item.title}
                            </Text>
                            <Text style={[styles.priceValue, { color: theme.colors.primary }]}>
                              {t("product.priceFrom")} {formatMoney(item.priceFrom as number, currency)}
                            </Text>
                            <Text style={[styles.catalogTileBodyText, { color: theme.colors.textMuted }]} numberOfLines={2}>
                              {item.description || t("home.productsFallback")}
                            </Text>
                            <Text style={[styles.catalogTileAction, { color: theme.colors.primary }]}>{t("home.pricesCardAction")}</Text>
                          </View>
                        </View>
                      )}
                    </Pressable>
                  ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.section, { borderTopColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionEyebrow, { color: theme.colors.textMuted }]}>{t("home.catalogEyebrow")}</Text>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text, fontSize: sectionTitleSize, lineHeight: sectionTitleLineHeight },
              ]}
            >
              {t("home.catalogTitle")}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>{t("home.catalogSubtitle")}</Text>
          </View>

          <View style={styles.tileGrid}>
            {productsQuery.isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <View
                    key={`placeholder-${index}`}
                    style={[
                      styles.catalogTile,
                      styles.catalogTilePlaceholder,
                      {
                        width: tileWidth,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                  >
                    <View style={[styles.placeholderMedia, { height: previewImageHeight, backgroundColor: theme.colors.surface2 }]} />
                    <View style={styles.catalogTileBody}>
                      <Text style={[styles.catalogTileTitle, { color: theme.colors.text }]}>{t("common.loading")}</Text>
                      <Text style={[styles.catalogTileBodyText, { color: theme.colors.textMuted }]}>{t("home.productsEmptyHint")}</Text>
                    </View>
                  </View>
                ))
              : previewProducts.length
              ? previewProducts.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
                    style={[styles.tilePressable, { width: tileWidth }]}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.catalogTile,
                          {
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.surface,
                          },
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <View style={[styles.previewMedia, { height: previewImageHeight, backgroundColor: theme.colors.surface2 }]}>
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.previewImage} resizeMode="cover" />
                          ) : (
                            <View style={styles.previewFallback}>
                              <Ionicons name="image-outline" size={22} color={theme.colors.textMuted} />
                            </View>
                          )}
                        </View>

                        <View style={styles.catalogTileBody}>
                          <Text style={[styles.catalogTileTitle, { color: theme.colors.text }]} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={[styles.catalogTileBodyText, { color: theme.colors.textMuted }]} numberOfLines={2}>
                            {item.description || t("home.productsFallback")}
                          </Text>
                          <Text style={[styles.catalogTileAction, { color: theme.colors.primary }]}>{t("home.catalogCardAction")}</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                ))
              : (
                <View style={[styles.catalogEmpty, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.catalogEmptyTitle, { color: theme.colors.text }]}>{t("home.productsEmpty")}</Text>
                  <Text style={[styles.catalogEmptyText, { color: theme.colors.textMuted }]}>{t("home.productsEmptyHint")}</Text>
                </View>
              )}
          </View>

        </View>

        <SiteFooter gutter={gutter} />
      </AppScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: 0,
  },
  heroSection: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  heroMetaBrand: {
    ...font(800),
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  heroMetaDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  heroMetaRegion: {
    ...font(500),
    fontSize: 13,
    lineHeight: 18,
  },
  heroTitle: {
    ...font(900),
    maxWidth: 820,
  },
  heroSubtitle: {
    ...font(500),
    maxWidth: 620,
    fontSize: 16,
    lineHeight: 24,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 18,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 18,
  },
  section: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
    borderTopWidth: 1,
  },
  sectionHeader: {
    gap: 8,
    maxWidth: 640,
  },
  workflowList: {
    width: "100%",
    alignSelf: "center",
    gap: 0,
  },
  workflowRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.md,
  },
  workflowRail: {
    width: 48,
    alignItems: "center",
    flexShrink: 0,
  },
  workflowMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  workflowMarkerText: {
    ...font(800),
    fontSize: 12,
    lineHeight: 16,
  },
  workflowLine: {
    width: 2,
    flex: 1,
    marginTop: spacing.xs,
    borderRadius: 999,
    minHeight: 42,
  },
  workflowCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  workflowCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  workflowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  workflowStepLabel: {
    ...font(800),
    fontSize: 11,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  workflowCardTitle: {
    ...font(900),
    fontSize: 22,
    lineHeight: 28,
  },
  workflowCardText: {
    ...font(500),
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    maxWidth: 620,
  },
  sectionEyebrow: {
    ...font(800),
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  sectionTitle: {
    ...font(900),
  },
  sectionSubtitle: {
    ...font(500),
    fontSize: 15,
    lineHeight: 22,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  tilePressable: {
    minWidth: 0,
  },
  catalogTile: {
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 8,
  },
  catalogTilePlaceholder: {
    minHeight: 280,
  },
  previewMedia: {
    overflow: "hidden",
  },
  placeholderMedia: {
    opacity: 0.85,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  catalogTileBody: {
    padding: 14,
    gap: 8,
  },
  catalogTileTitle: {
    ...font(800),
    fontSize: 18,
    lineHeight: 24,
  },
  catalogTileBodyText: {
    ...font(500),
    fontSize: 14,
    lineHeight: 20,
  },
  priceValue: {
    ...font(900),
    fontSize: 22,
    lineHeight: 28,
  },
  catalogTileAction: {
    ...font(800),
    fontSize: 12,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  catalogEmpty: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  catalogEmptyTitle: {
    ...font(800),
    fontSize: 18,
    lineHeight: 24,
  },
  catalogEmptyText: {
    ...font(500),
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 480,
  },
  pressed: {
    opacity: 0.92,
  },
});
