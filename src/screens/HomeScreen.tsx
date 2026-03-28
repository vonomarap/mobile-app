import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { ScreenContainer } from "../components/ScreenContainer";
import { AppScrollView } from "../components/AppScrollView";
import { SiteFooter } from "../components/SiteFooter";
import { PromoBanners } from "../components/PromoBanners";
import { OfficialPartnerBlock } from "../components/OfficialPartnerBlock";
import { GlowPressable } from "../components/GlowPressable";
import type { RootStackParamList } from "../navigation/types";
import { useCurrency } from "../services/currency-context";
import { fetchProducts, type Product } from "../services/storefront";
import { fetchSiteSettings } from "../services/site-settings";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { formatMoney } from "../utils/money";

type HomeNavigation = NativeStackNavigationProp<RootStackParamList, "Home">;

function formatProductPrice(item: Product, currency: string, t: (key: string) => string): string {
  return Number.isFinite(item.priceFrom) && (item.priceFrom ?? 0) > 0
    ? `${t("product.priceFrom")} ${formatMoney(item.priceFrom as number, currency)}`
    : t("product.priceOnRequest");
}

/* ---------- Feature highlight data ---------- */
const FEATURES = [
  { icon: "shield-checkmark-outline" as const, titleKey: "home.feature1Title", textKey: "home.feature1Text" },
  { icon: "construct-outline" as const, titleKey: "home.feature2Title", textKey: "home.feature2Text" },
  { icon: "car-outline" as const, titleKey: "home.feature3Title", textKey: "home.feature3Text" },
  { icon: "ribbon-outline" as const, titleKey: "home.feature4Title", textKey: "home.feature4Text" },
];

export function HomeScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const navigation = useNavigation<HomeNavigation>();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  const gutter = width < 420 ? spacing.sm : spacing.md;
  const heroSplit = width >= 920;
  const productCardWidth = width >= 1060 ? "31.8%" : width >= 700 ? "48.5%" : "100%";
  const featureCardWidth = width >= 900 ? "23%" : width >= 600 ? "48%" : "100%";

  const productsQuery = useQuery({
    queryKey: ["home", "products"],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const settingsQuery = useQuery({
    queryKey: ["app_settings", "site"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000,
    enabled: isWeb,
  });

  const featuredProducts = useMemo(() => (productsQuery.data ?? []).slice(0, 3), [productsQuery.data]);
  const heroProduct = featuredProducts[0];
  const heroPrice = heroProduct ? formatProductPrice(heroProduct, currency, t) : t("home.heroFallbackMeta");

  const heroText = theme.isDark ? "#FFF7ED" : "#442515";
  const heroSubtle = theme.isDark ? "rgba(255,247,237,0.78)" : "rgba(68,37,21,0.76)";
  const heroBorder = theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(122,79,48,0.14)";
  const sectionEyebrowColor = theme.isDark ? "#FDBA74" : "#B45309";
  const accentGlow = theme.isDark ? "rgba(249,115,22,0.35)" : "rgba(234,88,12,0.18)";

  return (
    <ScreenContainer>
      <AppScrollView trackNavGlass contentContainerStyle={[styles.page, { paddingHorizontal: gutter, paddingBottom: 0 }]} showsVerticalScrollIndicator={false}>

        {/* ── HERO ── */}
        <LinearGradient
          colors={theme.isDark ? (["#151517", "#211913", "#3C2617"] as const) : (["#F7EFE8", "#EEDFD0", "#D8B89B"] as const)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroShell, { borderColor: heroBorder }]}
        >
          {/* Decorative corner glow */}
          <View pointerEvents="none" style={[styles.heroDecorCircle, { backgroundColor: accentGlow }]} />

          <View style={[styles.heroGrid, heroSplit ? styles.heroGridSplit : null]}>
            <View style={styles.heroCopy}>
              <View style={[styles.kickerPill, { borderColor: heroBorder, backgroundColor: theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.56)" }]}>
                <Ionicons name="sparkles-outline" size={14} color={heroText} />
                <Text style={[styles.kickerText, { color: heroText }]}>{t("home.kicker")}</Text>
              </View>

              <Text style={[styles.heroTitle, { color: heroText }]}>{t("home.title")}</Text>
              <Text style={[styles.heroSubtitle, { color: heroSubtle }]}>{t("home.subtitle")}</Text>

              <View style={styles.heroActions}>
                <PrimaryButton
                  title={t("home.openCalculator")}
                  onPress={() => navigation.navigate("Calculator")}
                  leftSlot={<Ionicons name="calculator-outline" size={18} color="#FFFFFF" />}
                  buttonStyle={styles.primaryAction}
                />
                <PrimaryButton
                  title={t("home.browseCatalog")}
                  tone="soft"
                  onPress={() => navigation.navigate("Catalog")}
                  leftSlot={<Ionicons name="grid-outline" size={18} color={theme.colors.primary} />}
                  buttonStyle={styles.secondaryAction}
                />
              </View>
            </View>

            <Card variant="solid" padded={false} style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: heroBorder }]}>
              <View style={styles.heroMedia}>
                {heroProduct?.image ? (
                  <Image source={{ uri: heroProduct.image }} style={styles.heroImage} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={theme.isDark ? (["#1B1B1D", "#2B2B31"] as const) : (["#F7F1EA", "#E8D8CB"] as const)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroFallback}
                  >
                    <Ionicons name="image-outline" size={28} color={theme.colors.primary} />
                  </LinearGradient>
                )}
              </View>
              <View style={styles.heroCardBody}>
                <Text style={[styles.heroCardEyebrow, { color: theme.colors.primary }]}>{t("home.heroProductEyebrow")}</Text>
                <Text style={[styles.heroCardTitle, { color: theme.colors.text }]} numberOfLines={2}>
                  {heroProduct?.title || t("home.heroFallbackTitle")}
                </Text>
                <Text style={[styles.heroCardMeta, { color: theme.colors.textMuted }]} numberOfLines={2}>
                  {heroPrice}
                </Text>
              </View>
            </Card>
          </View>
        </LinearGradient>

        {/* ── PROMO BANNERS ── */}
        <PromoBanners placement="home" />

        {/* ── WHY CHOOSE US ── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderCompact}>
            <Text style={[styles.sectionEyebrow, { color: sectionEyebrowColor }]}>{t("home.featuresEyebrow")}</Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("home.featuresTitle")}</Text>
          </View>

          <View style={styles.featuresGrid}>
            {FEATURES.map((feat) => (
              <View key={feat.titleKey} style={[styles.featureCardWrap, { width: featureCardWidth }]}>
                <Card variant="glass" style={[styles.featureCard, { borderColor: heroBorder }]}>
                  <View style={[styles.featureIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
                    <Ionicons name={feat.icon} size={22} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{t(feat.titleKey)}</Text>
                  <Text style={[styles.featureText, { color: theme.colors.textMuted }]}>{t(feat.textKey)}</Text>
                </Card>
              </View>
            ))}
          </View>
        </View>

        {/* ── FEATURED PRODUCTS ── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderCompact}>
              <Text style={[styles.sectionEyebrow, { color: sectionEyebrowColor }]}>{t("home.productsEyebrow")}</Text>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("home.productsTitle")}</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>{t("home.productsSubtitle")}</Text>
            </View>
            <PrimaryButton
              tone="soft"
              title={t("home.productsAction")}
              onPress={() => navigation.navigate("Catalog")}
              buttonStyle={styles.headerButton}
              leftSlot={<Ionicons name="grid-outline" size={16} color={theme.colors.primary} />}
            />
          </View>

          <View style={styles.previewGrid}>
            {featuredProducts.length ? (
              featuredProducts.map((item) => {
                const image = item.image?.trim() || "";
                const price = formatProductPrice(item, currency, t);

                return (
                  <View key={item.id} style={[styles.previewPressable, { width: productCardWidth }]}>
                    <GlowPressable
                      onPress={() => navigation.navigate("ProductDetails", { productId: item.id })}
                      radius={radius.md}
                      glowColor={theme.colors.primary}
                    >
                      <Card variant="solid" padded={false} style={[styles.productCard, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.productMedia}>
                          {image ? (
                            <Image source={{ uri: image }} style={styles.productImage} resizeMode="cover" />
                          ) : (
                            <LinearGradient
                              colors={theme.isDark ? (["#232325", "#303038"] as const) : (["#F4EEE8", "#E4D5C6"] as const)}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.productFallback}
                            >
                              <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
                            </LinearGradient>
                          )}
                        </View>
                        <View style={styles.productBody}>
                          <Text style={[styles.productTitle, { color: theme.colors.text }]} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={[styles.productText, { color: theme.colors.textMuted }]} numberOfLines={2}>
                            {item.description || t("home.productsFallback")}
                          </Text>
                          <Text style={[styles.productPrice, { color: theme.colors.primary }]} numberOfLines={1}>
                            {price}
                          </Text>
                        </View>
                      </Card>
                    </GlowPressable>
                  </View>
                );
              })
            ) : (
              <Card variant="solid" style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t("home.productsEmpty")}</Text>
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{t("home.productsEmptyHint")}</Text>
              </Card>
            )}
          </View>
        </View>

        {/* ── OFFICIAL PARTNER ── */}
        <OfficialPartnerBlock settings={settingsQuery.data} />

        {/* ── CTA ── */}
        <LinearGradient
          colors={theme.isDark ? (["#1B1B1D", "#2A1B12", "#4A250F"] as const) : (["#FFF7ED", "#F4E4D4", "#E0B98F"] as const)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ctaShell, { borderColor: heroBorder }]}
        >
          <Text style={[styles.sectionEyebrow, { color: heroText }]}>{t("home.ctaEyebrow")}</Text>
          <Text style={[styles.ctaTitle, { color: heroText }]}>{t("home.ctaTitle")}</Text>
          <Text style={[styles.ctaSubtitle, { color: heroSubtle }]}>{t("home.ctaSubtitle")}</Text>

          <View style={styles.ctaActions}>
            <GlowPressable
              onPress={() => navigation.navigate("Calculator")}
              radius={radius.md}
              glowColor={theme.colors.primary}
              style={styles.ctaActionCard}
            >
              <Card variant="solid" padded style={[styles.ctaCard, { backgroundColor: theme.colors.surface, borderColor: heroBorder }]}>
                <View style={[styles.ctaIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name="calculator-outline" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[styles.ctaCardTitle, { color: theme.colors.text }]}>{t("home.openCalculator")}</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} style={styles.ctaArrow} />
              </Card>
            </GlowPressable>

            <GlowPressable
              onPress={() => navigation.navigate("Catalog")}
              radius={radius.md}
              glowColor={theme.colors.primary}
              style={styles.ctaActionCard}
            >
              <Card variant="solid" padded style={[styles.ctaCard, { backgroundColor: theme.colors.surface, borderColor: heroBorder }]}>
                <View style={[styles.ctaIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name="grid-outline" size={24} color={theme.colors.primary} />
                </View>
                <Text style={[styles.ctaCardTitle, { color: theme.colors.text }]}>{t("home.browseCatalog")}</Text>
                <Ionicons name="arrow-forward" size={16} color={theme.colors.primary} style={styles.ctaArrow} />
              </Card>
            </GlowPressable>
          </View>
        </LinearGradient>

        <SiteFooter gutter={gutter} />
      </AppScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: spacing.xl,
  },

  /* ── Hero ── */
  heroShell: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: "hidden",
    position: "relative",
  },
  heroDecorCircle: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.6,
  },
  heroGrid: {
    gap: spacing.lg,
  },
  heroGridSplit: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroCopy: {
    flex: 1,
    gap: spacing.md,
  },
  kickerPill: {
    alignSelf: "flex-start",
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kickerText: {
    ...font(800),
    fontSize: 12,
    letterSpacing: 0.36,
    textTransform: "uppercase",
  },
  heroTitle: {
    ...font(900),
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.9,
    maxWidth: 620,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 560,
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  primaryAction: {
    minWidth: 220,
    minHeight: 52,
  },
  secondaryAction: {
    minWidth: 188,
    minHeight: 52,
  },
  heroCard: {
    flex: 1,
    overflow: "hidden",
  },
  heroMedia: {
    height: 300,
    overflow: "hidden",
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCardBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  heroCardEyebrow: {
    ...font(800),
    fontSize: 12,
    letterSpacing: 0.28,
    textTransform: "uppercase",
  },
  heroCardTitle: {
    ...font(900),
    fontSize: 24,
    lineHeight: 30,
  },
  heroCardMeta: {
    fontSize: 14,
    lineHeight: 20,
  },

  /* ── Section layout ── */
  sectionBlock: {
    gap: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "flex-end",
  },
  sectionHeaderCompact: {
    flex: 1,
    minWidth: 260,
    gap: spacing.sm,
  },
  sectionEyebrow: {
    ...font(800),
    fontSize: 12,
    letterSpacing: 0.34,
    textTransform: "uppercase",
  },
  sectionTitle: {
    ...font(900),
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    maxWidth: 680,
  },
  sectionSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 620,
  },
  headerButton: {
    minHeight: 44,
  },

  /* ── Feature highlights ── */
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  featureCardWrap: {
    minWidth: 0,
  },
  featureCard: {
    gap: spacing.sm,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  featureTitle: {
    ...font(800),
    fontSize: 16,
    lineHeight: 20,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
  },

  /* ── Product preview grid ── */
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  previewPressable: {
    minWidth: 0,
  },
  productCard: {
    overflow: "hidden",
  },
  productMedia: {
    height: 220,
    overflow: "hidden",
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  productBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  productTitle: {
    ...font(900),
    fontSize: 18,
    lineHeight: 22,
  },
  productText: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 40,
  },
  productPrice: {
    ...font(800),
    fontSize: 14,
    marginTop: spacing.xs,
  },
  emptyCard: {
    width: "100%",
    gap: spacing.sm,
  },
  emptyTitle: {
    ...font(800),
    fontSize: 17,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },

  /* ── CTA ── */
  ctaShell: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
  },
  ctaTitle: {
    ...font(900),
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    maxWidth: 620,
  },
  ctaSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 560,
  },
  ctaActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  ctaActionCard: {
    flex: 1,
    minWidth: 200,
  },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  ctaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaCardTitle: {
    ...font(800),
    fontSize: 16,
    flex: 1,
  },
  ctaArrow: {
    marginLeft: "auto" as any,
  },

  pressed: {
    opacity: 0.94,
  },
});
