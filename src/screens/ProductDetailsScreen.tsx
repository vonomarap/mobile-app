import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { AppScrollView } from "../components/AppScrollView";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { SiteFooter } from "../components/SiteFooter";
import { RootStackParamList } from "../navigation/types";
import { useCurrency } from "../services/currency-context";
import { trackProductView } from "../services/public-analytics";
import { fetchSiteSettings } from "../services/site-settings";
import { fetchProductById, Product } from "../services/storefront";
import { font } from "../theme/font";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/tokens";
import { formatMoney } from "../utils/money";
import { useTranslation } from "react-i18next";

type Route = RouteProp<RootStackParamList, "ProductDetails">;
type SpecRowData = { label: string; value: string };

function inferProductType(title: string, description?: string): "window" | "door" | undefined {
  const hay = `${title} ${description ?? ""}`.toLowerCase();
  if (hay.includes("двер") || hay.includes("door")) return "door";
  if (hay.includes("окн") || hay.includes("window")) return "window";
  if (hay.includes("балкон")) return "door";
  return undefined;
}

export function ProductDetailsScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Route>();
  const { width } = useWindowDimensions();
  const productId = route.params.productId;
  const isWeb = Platform.OS === "web";
  const isWideLayout = width >= 920;
  const factsSingleColumn = width < 430;
  const specRowsStacked = width < 720;

  const siteSettingsQuery = useQuery({
    queryKey: ["app_settings", "site"],
    queryFn: fetchSiteSettings,
    enabled: isWeb,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const brandName = (siteSettingsQuery.data?.brandName ?? "").trim() || "КанОкна";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProductById(productId)
  });

  const styles = useMemo(
    () => makeStyles(theme, { isWideLayout, factsSingleColumn, specRowsStacked }),
    [factsSingleColumn, isWideLayout, specRowsStacked, theme]
  );

  useEffect(() => {
    if (!data?.id) return;
    void trackProductView(data.id);
  }, [data?.id]);

  useEffect(() => {
    if (!isWeb || !data) return;

    const doc = (globalThis as any).document as Document | undefined;
    const head = doc?.head;
    if (!doc || !head) return;

    const pathnameRaw = ((globalThis as any).location as any)?.pathname;
    const pathname =
      typeof pathnameRaw === "string" && pathnameRaw.startsWith("/product/")
        ? pathnameRaw
        : `/product/${encodeURIComponent(data.id)}`;
    const canonical = `https://kanokna.web.app${pathname}`;
    const description =
      (data.description?.trim() || `Карточка товара ${data.title} с характеристиками и переходом в калькулятор стоимости.`).slice(0, 220);
    const title = `${data.title} | ${brandName}`;
    const ogImage = data.image?.trim() || "https://kanokna.web.app/og-catalog-v3.png";

    const upsertMeta = (key: { name?: string; property?: string }, content: string) => {
      const selector = key.name ? `meta[name="${key.name}"]` : `meta[property="${key.property}"]`;
      const existing = head.querySelector(selector);
      const el = existing ?? doc.createElement("meta");
      if (!existing) {
        if (key.name) el.setAttribute("name", key.name);
        if (key.property) el.setAttribute("property", key.property);
        head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const upsertCanonical = (href: string) => {
      const existing = head.querySelector('link[rel="canonical"]');
      const el = existing ?? doc.createElement("link");
      if (!existing) {
        el.setAttribute("rel", "canonical");
        head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    let jsonLd = head.querySelector('script[data-seo-product-jsonld="true"]');
    if (!jsonLd) {
      jsonLd = doc.createElement("script");
      jsonLd.setAttribute("type", "application/ld+json");
      jsonLd.setAttribute("data-seo-product-jsonld", "true");
      head.appendChild(jsonLd);
    }

    const specs = Object.entries(data.specs ?? {})
      .map(([name, value]) => {
        const text = typeof value === "number" ? String(value) : String(value ?? "").trim();
        return name.trim() && text ? { "@type": "PropertyValue", name: name.trim(), value: text } : null;
      })
      .filter((item): item is { "@type": "PropertyValue"; name: string; value: string } => Boolean(item));

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: data.title,
      description,
      sku: data.id,
      url: canonical,
      ...(data.image?.trim() ? { image: [data.image.trim()] } : {}),
      brand: {
        "@type": "Brand",
        name: brandName,
      },
      ...(specs.length ? { additionalProperty: specs } : {}),
      ...(typeof data.priceFrom === "number" && Number.isFinite(data.priceFrom)
        ? {
            offers: {
              "@type": "Offer",
              price: String(data.priceFrom),
              priceCurrency: (data.currency || "RUB").trim().toUpperCase() || "RUB",
              availability: "https://schema.org/InStock",
              url: canonical,
            },
          }
        : {}),
    };

    try {
      doc.title = title;
    } catch {
      // ignore
    }

    upsertMeta({ name: "description" }, description);
    upsertMeta({ name: "robots" }, "index,follow");
    upsertCanonical(canonical);
    upsertMeta({ property: "og:title" }, title);
    upsertMeta({ property: "og:description" }, description);
    upsertMeta({ property: "og:type" }, "product");
    upsertMeta({ property: "og:url" }, canonical);
    upsertMeta({ property: "og:site_name" }, brandName);
    upsertMeta({ property: "og:locale" }, "ru_RU");
    upsertMeta({ property: "og:image" }, ogImage);
    upsertMeta({ name: "twitter:card" }, "summary_large_image");
    upsertMeta({ name: "twitter:title" }, title);
    upsertMeta({ name: "twitter:description" }, description);
    upsertMeta({ name: "twitter:image" }, ogImage);
    jsonLd.textContent = JSON.stringify(structuredData).replace(/</g, "\\u003c");

    return () => {
      const next = head.querySelector('script[data-seo-product-jsonld="true"]');
      next?.parentNode?.removeChild(next);
    };
  }, [brandName, data, isWeb]);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.centerText}>{t("common.loading")}</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={<Ionicons name="cloud-offline-outline" size={22} color={theme.colors.primary} />}
          title={t("common.error")}
          description={t("common.tryAgain")}
          actionTitle={t("common.retry")}
          onAction={() => void refetch()}
        />
      </ScreenContainer>
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={<Ionicons name="help-circle-outline" size={22} color={theme.colors.primary} />}
          title={t("product.notFound")}
          description={t("product.notFoundHint")}
          actionTitle={t("product.backToCatalog")}
          onAction={() => navigation.navigate("Catalog")}
        />
      </ScreenContainer>
    );
  }

  const product = data;
  const productType = inferProductType(product.title, product.description);
  const productTypeLabel =
    productType === "door"
      ? t("catalog.badges.door")
      : productType === "window"
        ? t("catalog.badges.window")
        : t("catalog.badges.product");
  const specRows = buildSpecRows(product, t);
  const heroFactRows = buildHeroFacts(specRows, t);
  const hasPrice = Number.isFinite(product.priceFrom) && (product.priceFrom ?? 0) > 0;
  const heroDescription = product.description?.trim() ? product.description.trim() : t("product.emptyDescription");

  return (
    <ScreenContainer>
      <AppScrollView trackNavGlass contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.goBack()}
              style={(state) => [
                styles.backPill,
                state.pressed ? styles.backPillPressed : null
              ]}
            >
              <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
              <Text style={styles.backText}>{t("common.back")}</Text>
            </Pressable>
          </View>

          <View style={[styles.heroShell, theme.shadow.sm, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.heroMediaColumn, { backgroundColor: theme.colors.surface2 }]}>
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={[styles.heroFallback, { backgroundColor: theme.colors.primarySoft }]}>
                  <View style={[styles.heroFallbackBadge, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="image-outline" size={26} color={theme.colors.primary} />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.heroPanel}>
              <View style={styles.heroCopy}>
                <View style={styles.heroMetaRow}>
                  <View style={[styles.metaChip, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primarySoft }]}>
                    <Text style={[styles.metaChipText, { color: theme.colors.primary }]}>{productTypeLabel}</Text>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }]}>
                    <Text style={[styles.metaChipText, { color: theme.colors.textMuted }]}>
                      {t("product.sku")}: {product.id}
                    </Text>
                  </View>
                </View>

                <Text style={styles.title}>{product.title}</Text>

                <View style={styles.priceBlock}>
                  {hasPrice ? (
                    <>
                      <Text style={styles.priceLabel}>{t("product.priceFrom")}</Text>
                      <Text style={[styles.priceValue, { color: theme.colors.primary }]}>
                        {formatMoney(product.priceFrom as number, currency)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.priceRequest}>{t("product.priceOnRequest")}</Text>
                  )}
                </View>

                <Text style={styles.heroDescription}>{heroDescription}</Text>
              </View>

              <View style={styles.heroFooter}>
                <View style={styles.heroActions}>
                  <PrimaryButton
                    title={t("product.contactAction")}
                    onPress={() => navigation.navigate("Contacts")}
                    leftSlot={<Ionicons name="call-outline" size={18} color="#FFFFFF" />}
                    buttonStyle={styles.primaryActionButton}
                  />
                  <PrimaryButton
                    title={t("product.openCalculator")}
                    onPress={() => navigation.navigate("Calculator")}
                    tone="soft"
                    leftSlot={<Ionicons name="calculator-outline" size={18} color={theme.colors.primary} />}
                    buttonStyle={styles.secondaryActionButton}
                  />
                </View>

                {heroFactRows.length ? (
                  <View style={styles.factsGrid}>
                    {heroFactRows.map((row) => (
                      <View
                        key={`hero-fact-${row.label}`}
                        style={[styles.factCard, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }]}
                      >
                        <Text style={styles.factLabel} numberOfLines={2}>
                          {row.label}
                        </Text>
                        <Text style={styles.factValue} numberOfLines={3}>
                          {row.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {product.features?.length ? (
            <View style={[styles.infoPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionHeaderIcon, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name="sparkles-outline" size={16} color={theme.colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>{t("product.featuresTitle")}</Text>
              </View>

              <View style={styles.featureList}>
                {product.features.slice(0, 8).map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <View style={[styles.featureIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
                      <Ionicons name="checkmark-outline" size={14} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={[styles.infoPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionHeaderIcon, { backgroundColor: theme.colors.primarySoft }]}>
                <Ionicons name="list-outline" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>{t("product.specsTitle")}</Text>
            </View>

            {specRows.length ? (
              <View style={styles.specList}>
                {specRows.map((row, idx) => (
                  <SpecRow
                    key={`${row.label}-${idx}`}
                    label={row.label}
                    value={row.value}
                    showDivider={idx !== specRows.length - 1}
                    stacked={specRowsStacked}
                  />
                ))}
              </View>
            ) : (
              <Text style={styles.bodyText}>{t("product.emptySpecs")}</Text>
            )}
          </View>

          <SiteFooter gutter={spacing.md} />
        </View>
      </AppScrollView>
    </ScreenContainer>
  );
}

function buildSpecRows(product: Product, t: (key: string, options?: any) => string): SpecRowData[] {
  const rows: SpecRowData[] = [];

  rows.push({ label: t("product.sku"), value: product.id });

  const specs = product.specs ?? {};
  Object.entries(specs).forEach(([label, raw]) => {
    const value = typeof raw === "number" ? String(raw) : String(raw ?? "");
    if (!label.trim() || !value.trim()) return;
    rows.push({ label, value });
  });

  return rows;
}

function buildHeroFacts(specRows: SpecRowData[], t: (key: string, options?: any) => string): SpecRowData[] {
  const skuLabel = t("product.sku");
  const prioritizedRows = specRows.filter((row) => row.label !== skuLabel);
  return (prioritizedRows.length ? prioritizedRows : specRows).slice(0, 4);
}

function SpecRow({
  label,
  value,
  showDivider,
  stacked
}: {
  label: string;
  value: string;
  showDivider: boolean;
  stacked: boolean;
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme, { isWideLayout: false, factsSingleColumn: false, specRowsStacked: stacked }), [stacked, theme]);

  return (
    <View style={[styles.specRow, stacked ? styles.specRowStacked : null, showDivider ? styles.specRowDivider : null]}>
      <Text style={styles.specLabel} numberOfLines={stacked ? 2 : 3}>
        {label}
      </Text>
      <Text style={[styles.specValue, stacked ? styles.specValueStacked : null]} numberOfLines={stacked ? 3 : 4}>
        {value}
      </Text>
    </View>
  );
}

function makeStyles(
  theme: ReturnType<typeof useTheme>,
  flags: { isWideLayout: boolean; factsSingleColumn: boolean; specRowsStacked: boolean }
) {
  const { isWideLayout, factsSingleColumn } = flags;

  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingHorizontal: spacing.md,
      paddingBottom: 0
    },
    content: {
      width: "100%",
      maxWidth: 1120,
      alignSelf: "center",
      gap: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: 0
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.sm
    },
    centerText: {
      fontSize: 14,
      color: theme.colors.textMuted
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start"
    },
    backPill: {
      minHeight: 40,
      paddingHorizontal: 12,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...(theme.shadow.sm as object),
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
      ...({ cursor: "pointer" } as object)
    },
    backPillPressed: {
      opacity: 0.92
    },
    backText: {
      ...font(900),
      fontSize: 13,
      color: theme.colors.text
    },
    heroShell: {
      borderWidth: 1,
      borderRadius: 8,
      overflow: "hidden",
      flexDirection: isWideLayout ? "row" : "column"
    },
    heroMediaColumn: {
      flex: isWideLayout ? 1.04 : undefined,
      minHeight: isWideLayout ? 460 : 280
    },
    heroImage: {
      width: "100%",
      height: "100%",
      minHeight: isWideLayout ? 460 : 280
    },
    heroFallback: {
      width: "100%",
      minHeight: isWideLayout ? 460 : 280,
      alignItems: "center",
      justifyContent: "center"
    },
    heroFallbackBadge: {
      width: 68,
      height: 68,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center"
    },
    heroPanel: {
      flex: 0.96,
      paddingHorizontal: isWideLayout ? spacing.lg : spacing.md,
      paddingVertical: isWideLayout ? spacing.lg : spacing.md,
      gap: spacing.lg,
      justifyContent: "space-between"
    },
    heroCopy: {
      gap: spacing.md
    },
    heroMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs
    },
    metaChip: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1
    },
    metaChipText: {
      ...font(800),
      fontSize: 12
    },
    title: {
      ...font(900),
      fontSize: isWideLayout ? 34 : 26,
      lineHeight: isWideLayout ? 40 : 32,
      color: theme.colors.text
    },
    priceBlock: {
      gap: 4
    },
    priceLabel: {
      ...font(700),
      fontSize: 12,
      color: theme.colors.textMuted,
      textTransform: "uppercase"
    },
    priceValue: {
      ...font(900),
      fontSize: isWideLayout ? 31 : 26,
      lineHeight: isWideLayout ? 35 : 30
    },
    priceRequest: {
      ...font(800),
      fontSize: 16,
      lineHeight: 22,
      color: theme.colors.textMuted
    },
    heroDescription: {
      ...theme.typography.bodyRegular,
      color: theme.colors.textMuted
    },
    heroFooter: {
      gap: spacing.md
    },
    heroActions: {
      flexDirection: isWideLayout ? "row" : "column",
      gap: spacing.sm
    },
    primaryActionButton: {
      flex: isWideLayout ? 1 : undefined
    },
    secondaryActionButton: {
      flex: isWideLayout ? 1 : undefined
    },
    factsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    factCard: {
      width: factsSingleColumn ? "100%" : "48%",
      minWidth: factsSingleColumn ? undefined : 140,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      gap: 4
    },
    factLabel: {
      ...font(700),
      fontSize: 12,
      color: theme.colors.textMuted
    },
    factValue: {
      ...font(900),
      fontSize: 14,
      lineHeight: 18,
      color: theme.colors.text
    },
    infoPanel: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.md
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    sectionHeaderIcon: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center"
    },
    sectionTitle: {
      ...font(900),
      fontSize: 14,
      color: theme.colors.text
    },
    bodyText: {
      ...theme.typography.bodyRegular,
      color: theme.colors.textMuted
    },
    featureList: {
      gap: spacing.sm
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm
    },
    featureIconWrap: {
      width: 24,
      height: 24,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1
    },
    featureText: {
      flex: 1,
      ...theme.typography.bodyRegular,
      color: theme.colors.text
    },
    specList: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      overflow: "hidden",
      backgroundColor: theme.colors.surface2
    },
    specRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md
    },
    specRowStacked: {
      flexDirection: "column",
      alignItems: "flex-start"
    },
    specRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border
    },
    specLabel: {
      flex: 1,
      ...font(700),
      fontSize: 12,
      color: theme.colors.textMuted
    },
    specValue: {
      flex: 1,
      ...font(900),
      fontSize: 13,
      color: theme.colors.text,
      textAlign: "right"
    },
    specValueStacked: {
      textAlign: "left"
    }
  });
}
