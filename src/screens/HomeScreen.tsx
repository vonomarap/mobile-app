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
import { GlowPressable } from "../components/GlowPressable";
import { ScreenContainer } from "../components/ScreenContainer";
import { AppScrollView } from "../components/AppScrollView";
import { SiteFooter } from "../components/SiteFooter";
import { PromoBanners } from "../components/PromoBanners";
import { OfficialPartnerBlock } from "../components/OfficialPartnerBlock";
import type { RootStackParamList } from "../navigation/types";
import { useCurrency } from "../services/currency-context";
import { fetchProducts, type Product } from "../services/storefront";
import { fetchSiteSettings } from "../services/site-settings";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { formatMoney } from "../utils/money";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

/* ───────── helpers ───────── */

function fmtPrice(p: Product, cur: string, t: (k: string) => string): string {
  return Number.isFinite(p.priceFrom) && (p.priceFrom ?? 0) > 0
    ? `${t("product.priceFrom")} ${formatMoney(p.priceFrom as number, cur)}`
    : t("product.priceOnRequest");
}

/* ───────── static data ───────── */

const STATS = [
  { valueKey: "home.stat1Value", labelKey: "home.stat1Label", icon: "briefcase-outline" as const },
  { valueKey: "home.stat2Value", labelKey: "home.stat2Label", icon: "time-outline" as const },
  { valueKey: "home.stat3Value", labelKey: "home.stat3Label", icon: "headset-outline" as const },
  { valueKey: "home.stat4Value", labelKey: "home.stat4Label", icon: "shield-checkmark-outline" as const },
];

const FEATURES = [
  { icon: "business-outline" as const, titleKey: "home.feature1Title", textKey: "home.feature1Text" },
  { icon: "construct-outline" as const, titleKey: "home.feature2Title", textKey: "home.feature2Text" },
  { icon: "rocket-outline" as const, titleKey: "home.feature3Title", textKey: "home.feature3Text" },
  { icon: "ribbon-outline" as const, titleKey: "home.feature4Title", textKey: "home.feature4Text" },
];

/* ═══════════════════════════════════════════════
   HOME SCREEN
   ═══════════════════════════════════════════════ */

export function HomeScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const nav = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  /* layout tokens */
  const gutter = width < 420 ? spacing.sm : spacing.md;
  const heroSplit = width >= 860;
  const statsWrap = width < 700;
  const featureCols = width >= 900 ? 4 : width >= 540 ? 2 : 1;
  const productCols = width >= 1060 ? 3 : width >= 700 ? 2 : 1;

  /* queries */
  const productsQ = useQuery({
    queryKey: ["home", "products"],
    queryFn: fetchProducts,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
  const settingsQ = useQuery({
    queryKey: ["app_settings", "site"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60_000,
    enabled: isWeb,
  });

  const featured = useMemo(() => (productsQ.data ?? []).slice(0, 3), [productsQ.data]);
  const hero = featured[0];
  const heroPrice = hero ? fmtPrice(hero, currency, t) : t("home.heroFallbackPrice");

  /* palette shortcuts */
  const isDark = theme.isDark;
  const heroText = isDark ? "#FFF7ED" : "#3B1A08";
  const heroMuted = isDark ? "rgba(255,247,237,0.72)" : "rgba(59,26,8,0.64)";
  const heroBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(122,79,48,0.12)";
  const sectionKicker = isDark ? "#FDBA74" : "#B45309";
  const glassAccent = isDark ? "rgba(249,115,22,0.22)" : "rgba(234,88,12,0.10)";
  const statDivider = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  /* card width helpers */
  const featureWidth = featureCols === 4 ? "23.5%" : featureCols === 2 ? "48%" : "100%";
  const productWidth = productCols === 3 ? "31.8%" : productCols === 2 ? "48.5%" : "100%";

  return (
    <ScreenContainer>
      <AppScrollView
        trackNavGlass
        contentContainerStyle={[styles.page, { paddingHorizontal: gutter, paddingBottom: 0 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ╔══════════════════════════════╗
            ║  1 · HERO                    ║
            ╚══════════════════════════════╝ */}
        <LinearGradient
          colors={isDark
            ? (["#131315", "#1E1510", "#3A2414"] as const)
            : (["#FEF7F0", "#FCEADB", "#F4C9A0"] as const)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroShell, { borderColor: heroBorder }]}
        >
          {/* decorative blobs */}
          <View pointerEvents="none" style={[styles.blob1, { backgroundColor: isDark ? "rgba(249,115,22,0.18)" : "rgba(251,146,60,0.22)" }]} />
          <View pointerEvents="none" style={[styles.blob2, { backgroundColor: isDark ? "rgba(253,186,116,0.10)" : "rgba(234,88,12,0.10)" }]} />

          <View style={[styles.heroInner, heroSplit && styles.heroSplit]}>
            {/* left copy */}
            <View style={styles.heroCopy}>
              <View style={[styles.kickerPill, { borderColor: heroBorder, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.60)" }]}>
                <Ionicons name="diamond-outline" size={13} color={heroText} />
                <Text style={[styles.kickerLabel, { color: heroText }]}>{t("home.heroKicker")}</Text>
              </View>

              <Text style={[styles.heroH1, { color: heroText }]}>{t("home.heroTitle")}</Text>
              <Text style={[styles.heroP, { color: heroMuted }]}>{t("home.heroSubtitle")}</Text>

              <View style={styles.heroBtns}>
                <PrimaryButton
                  title={t("home.heroCta")}
                  onPress={() => nav.navigate("Calculator")}
                  leftSlot={<Ionicons name="calculator-outline" size={18} color="#FFF" />}
                  buttonStyle={styles.heroBtn}
                />
                <PrimaryButton
                  title={t("home.heroCtaSecondary")}
                  tone="soft"
                  onPress={() => nav.navigate("Catalog")}
                  leftSlot={<Ionicons name="grid-outline" size={18} color={theme.colors.primary} />}
                  buttonStyle={styles.heroBtn2}
                />
              </View>
            </View>

            {/* right — hero product card */}
            <GlowPressable
              onPress={() => hero ? nav.navigate("ProductDetails", { productId: hero.id }) : nav.navigate("Catalog")}
              radius={radius.lg}
              glowColor={theme.colors.primary}
              style={styles.heroCardWrap}
            >
              <Card variant="solid" padded={false} style={[styles.heroCard, { backgroundColor: theme.colors.surface, borderColor: heroBorder }]}>
                <View style={styles.heroImg}>
                  {hero?.image ? (
                    <Image source={{ uri: hero.image }} style={styles.heroImgFull} resizeMode="cover" />
                  ) : (
                    <LinearGradient
                      colors={isDark ? (["#1A1A1C", "#28282E"] as const) : (["#FAF5EF", "#ECDCC9"] as const)}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.heroImgPlaceholder}
                    >
                      <Ionicons name="image-outline" size={32} color={theme.colors.primary} />
                    </LinearGradient>
                  )}
                  {/* label badge */}
                  <View style={[styles.heroLabel, { backgroundColor: theme.colors.primary }]}>
                    <Ionicons name="star" size={12} color="#FFF" />
                    <Text style={styles.heroLabelText}>{t("home.heroProductLabel")}</Text>
                  </View>
                </View>
                <View style={styles.heroCardBody}>
                  <Text style={[styles.heroCardTitle, { color: theme.colors.text }]} numberOfLines={2}>
                    {hero?.title || t("home.heroFallbackTitle")}
                  </Text>
                  <Text style={[styles.heroCardPrice, { color: theme.colors.primary }]} numberOfLines={1}>
                    {heroPrice}
                  </Text>
                </View>
              </Card>
            </GlowPressable>
          </View>
        </LinearGradient>

        {/* ╔══════════════════════════════╗
            ║  2 · STATS BAR               ║
            ╚══════════════════════════════╝ */}
        <Card variant="glass" style={[styles.statsBar, statsWrap && styles.statsBarWrap]}>
          {STATS.map((s, i) => (
            <View key={s.valueKey} style={[styles.statItem, i > 0 && !statsWrap && { borderLeftWidth: 1, borderLeftColor: statDivider, paddingLeft: spacing.lg }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.primarySoft }]}>
                <Ionicons name={s.icon} size={18} color={theme.colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.primary }]}>{t(s.valueKey)}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{t(s.labelKey)}</Text>
            </View>
          ))}
        </Card>

        {/* ╔══════════════════════════════╗
            ║  3 · WHY CHOOSE US           ║
            ╚══════════════════════════════╝ */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.kicker, { color: sectionKicker }]}>{t("home.featuresKicker")}</Text>
            <Text style={[styles.sectionH2, { color: theme.colors.text }]}>{t("home.featuresTitle")}</Text>
          </View>

          <View style={styles.grid}>
            {FEATURES.map((f) => (
              <View key={f.titleKey} style={{ width: featureWidth }}>
                <Card variant="glass" style={styles.featCard}>
                  <LinearGradient
                    colors={isDark
                      ? (["rgba(249,115,22,0.14)", "rgba(249,115,22,0.04)"] as const)
                      : (["rgba(234,88,12,0.08)", "rgba(234,88,12,0.02)"] as const)}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.featIconBox}
                  >
                    <Ionicons name={f.icon} size={24} color={theme.colors.primary} />
                  </LinearGradient>
                  <Text style={[styles.featTitle, { color: theme.colors.text }]}>{t(f.titleKey)}</Text>
                  <Text style={[styles.featText, { color: theme.colors.textMuted }]}>{t(f.textKey)}</Text>
                </Card>
              </View>
            ))}
          </View>
        </View>

        {/* ╔══════════════════════════════╗
            ║  4 · PRODUCT SHOWCASE        ║
            ╚══════════════════════════════╝ */}
        <View style={styles.section}>
          <View style={styles.sectionHeadRow}>
            <View style={styles.sectionHead}>
              <Text style={[styles.kicker, { color: sectionKicker }]}>{t("home.productsKicker")}</Text>
              <Text style={[styles.sectionH2, { color: theme.colors.text }]}>{t("home.productsTitle")}</Text>
              <Text style={[styles.sectionP, { color: theme.colors.textMuted }]}>{t("home.productsSubtitle")}</Text>
            </View>
            <PrimaryButton
              tone="soft"
              title={t("home.productsAction")}
              onPress={() => nav.navigate("Catalog")}
              buttonStyle={styles.sectionBtn}
              leftSlot={<Ionicons name="grid-outline" size={16} color={theme.colors.primary} />}
            />
          </View>

          <View style={styles.grid}>
            {featured.length ? featured.map((item) => {
              const img = item.image?.trim() || "";
              const price = fmtPrice(item, currency, t);

              return (
                <View key={item.id} style={{ width: productWidth }}>
                  <GlowPressable
                    onPress={() => nav.navigate("ProductDetails", { productId: item.id })}
                    radius={radius.md}
                    glowColor={theme.colors.primary}
                  >
                    <Card variant="solid" padded={false} style={[styles.prodCard, { backgroundColor: theme.colors.surface }]}>
                      <View style={styles.prodImg}>
                        {img ? (
                          <Image source={{ uri: img }} style={styles.prodImgFull} resizeMode="cover" />
                        ) : (
                          <LinearGradient
                            colors={isDark ? (["#1F1F21", "#2C2C32"] as const) : (["#F8F2EB", "#E8D8CB"] as const)}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.prodImgPlaceholder}
                          >
                            <Ionicons name="image-outline" size={24} color={theme.colors.primary} />
                          </LinearGradient>
                        )}
                      </View>
                      <View style={styles.prodBody}>
                        <Text style={[styles.prodTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
                        <Text style={[styles.prodDesc, { color: theme.colors.textMuted }]} numberOfLines={2}>
                          {item.description || t("home.productsFallback")}
                        </Text>
                        <View style={styles.prodFooter}>
                          <Text style={[styles.prodPrice, { color: theme.colors.primary }]} numberOfLines={1}>{price}</Text>
                          <View style={[styles.prodArrow, { backgroundColor: theme.colors.primarySoft }]}>
                            <Ionicons name="arrow-forward" size={14} color={theme.colors.primary} />
                          </View>
                        </View>
                      </View>
                    </Card>
                  </GlowPressable>
                </View>
              );
            }) : (
              <Card variant="solid" style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="cube-outline" size={28} color={theme.colors.primary} style={{ marginBottom: spacing.sm }} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t("home.productsEmpty")}</Text>
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>{t("home.productsEmptyHint")}</Text>
              </Card>
            )}
          </View>
        </View>

        {/* ╔══════════════════════════════╗
            ║  5 · PROMO BANNERS           ║
            ╚══════════════════════════════╝ */}
        <PromoBanners placement="home" />

        {/* ╔══════════════════════════════╗
            ║  6 · OFFICIAL PARTNER        ║
            ╚══════════════════════════════╝ */}
        <OfficialPartnerBlock settings={settingsQ.data} />

        {/* ╔══════════════════════════════╗
            ║  7 · RICH CTA                ║
            ╚══════════════════════════════╝ */}
        <LinearGradient
          colors={isDark
            ? (["#18171A", "#271B10", "#4F2810"] as const)
            : (["#FFF8F0", "#F6E6D2", "#E8BF90"] as const)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ctaShell, { borderColor: heroBorder }]}
        >
          <View pointerEvents="none" style={[styles.ctaBlob, { backgroundColor: glassAccent }]} />

          <Text style={[styles.kicker, { color: isDark ? "#FDBA74" : "#92400E" }]}>{t("home.ctaKicker")}</Text>
          <Text style={[styles.ctaH2, { color: heroText }]}>{t("home.ctaTitle")}</Text>
          <Text style={[styles.ctaP, { color: heroMuted }]}>{t("home.ctaSubtitle")}</Text>

          <View style={styles.ctaCards}>
            <GlowPressable
              onPress={() => nav.navigate("Calculator")}
              radius={radius.md}
              glowColor={theme.colors.primary}
              style={styles.ctaCardWrap}
            >
              <Card variant="solid" padded style={[styles.ctaCard, { backgroundColor: theme.colors.surface, borderColor: heroBorder }]}>
                <View style={[styles.ctaIconBox, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name="calculator-outline" size={26} color={theme.colors.primary} />
                </View>
                <View style={styles.ctaCardText}>
                  <Text style={[styles.ctaCardH3, { color: theme.colors.text }]}>{t("home.ctaCalcTitle")}</Text>
                  <Text style={[styles.ctaCardP, { color: theme.colors.textMuted }]}>{t("home.ctaCalcText")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
              </Card>
            </GlowPressable>

            <GlowPressable
              onPress={() => nav.navigate("Catalog")}
              radius={radius.md}
              glowColor={theme.colors.primary}
              style={styles.ctaCardWrap}
            >
              <Card variant="solid" padded style={[styles.ctaCard, { backgroundColor: theme.colors.surface, borderColor: heroBorder }]}>
                <View style={[styles.ctaIconBox, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name="grid-outline" size={26} color={theme.colors.primary} />
                </View>
                <View style={styles.ctaCardText}>
                  <Text style={[styles.ctaCardH3, { color: theme.colors.text }]}>{t("home.ctaCatalogTitle")}</Text>
                  <Text style={[styles.ctaCardP, { color: theme.colors.textMuted }]}>{t("home.ctaCatalogText")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
              </Card>
            </GlowPressable>
          </View>
        </LinearGradient>

        {/* footer */}
        <SiteFooter gutter={gutter} />
      </AppScrollView>
    </ScreenContainer>
  );
}

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */

const styles = StyleSheet.create({
  page: { gap: spacing.xl + 8 },

  /* ── hero ── */
  heroShell: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg + 4,
    overflow: "hidden",
    position: "relative",
  },
  blob1: {
    position: "absolute",
    top: -80,
    right: -50,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.7,
  },
  blob2: {
    position: "absolute",
    bottom: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.5,
  },
  heroInner: { gap: spacing.lg + 4 },
  heroSplit: { flexDirection: "row", alignItems: "center" },
  heroCopy: { flex: 1, gap: spacing.md, zIndex: 2 },
  kickerPill: {
    alignSelf: "flex-start",
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kickerLabel: {
    ...font(800),
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroH1: {
    ...font(900),
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.1,
    maxWidth: 580,
  },
  heroP: {
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 520,
    ...font(400),
  },
  heroBtns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  heroBtn: { minWidth: 210, minHeight: 52 },
  heroBtn2: { minWidth: 170, minHeight: 52 },

  /* hero product card */
  heroCardWrap: { flex: 1, minWidth: 260, maxWidth: 400 },
  heroCard: { overflow: "hidden" },
  heroImg: {
    height: 280,
    overflow: "hidden",
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    position: "relative",
  },
  heroImgFull: { width: "100%", height: "100%" },
  heroImgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroLabel: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
  },
  heroLabelText: { ...font(800), fontSize: 11, color: "#FFF", letterSpacing: 0.2 },
  heroCardBody: { padding: spacing.md, gap: spacing.xs },
  heroCardTitle: { ...font(900), fontSize: 20, lineHeight: 26 },
  heroCardPrice: { ...font(800), fontSize: 15 },

  /* ── stats bar ── */
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.lg,
  },
  statsBarWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  statItem: {
    alignItems: "center",
    gap: 6,
    minWidth: 100,
    paddingVertical: spacing.xs,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: { ...font(900), fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  statLabel: { ...font(500), fontSize: 12, lineHeight: 16, textAlign: "center" },

  /* ── sections ── */
  section: { gap: spacing.lg },
  sectionHeadRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  sectionHead: { flex: 1, minWidth: 240, gap: spacing.sm },
  kicker: {
    ...font(800),
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  sectionH2: {
    ...font(900),
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    maxWidth: 640,
  },
  sectionP: { fontSize: 15, lineHeight: 22, maxWidth: 560 },
  sectionBtn: { minHeight: 44 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },

  /* ── feature cards ── */
  featCard: { gap: spacing.sm, minHeight: 170 },
  featIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  featTitle: { ...font(800), fontSize: 16, lineHeight: 20 },
  featText: { fontSize: 14, lineHeight: 21 },

  /* ── product cards ── */
  prodCard: { overflow: "hidden" },
  prodImg: {
    height: 210,
    overflow: "hidden",
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  prodImgFull: { width: "100%", height: "100%" },
  prodImgPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  prodBody: { padding: spacing.md, gap: spacing.sm },
  prodTitle: { ...font(900), fontSize: 18, lineHeight: 22 },
  prodDesc: { fontSize: 14, lineHeight: 20, minHeight: 40 },
  prodFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  prodPrice: { ...font(800), fontSize: 15 },
  prodArrow: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  /* empty state */
  emptyState: { width: "100%", alignItems: "center", paddingVertical: spacing.xl },
  emptyTitle: { ...font(800), fontSize: 17 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 340 },

  /* ── CTA ── */
  ctaShell: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg + 4,
    gap: spacing.sm,
    overflow: "hidden",
    position: "relative",
  },
  ctaBlob: {
    position: "absolute",
    bottom: -40,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.6,
  },
  ctaH2: {
    ...font(900),
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    maxWidth: 580,
  },
  ctaP: { fontSize: 15, lineHeight: 22, maxWidth: 520 },
  ctaCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md,
    zIndex: 2,
  },
  ctaCardWrap: { flex: 1, minWidth: 240 },
  ctaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  ctaIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaCardText: { flex: 1, gap: 3 },
  ctaCardH3: { ...font(800), fontSize: 16 },
  ctaCardP: { fontSize: 13, lineHeight: 18 },
});
