import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScrollView } from "../components/AppScrollView";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { SiteFooter } from "../components/SiteFooter";
import { RootStackParamList } from "../navigation/types";
import { useCurrency } from "../services/currency-context";
import { fetchProductById, Product } from "../services/storefront";
import { font } from "../theme/font";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";
import { formatMoney } from "../utils/money";
import { useTranslation } from "react-i18next";

type Route = RouteProp<RootStackParamList, "ProductDetails">;

export function ProductDetailsScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = useCurrency();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Route>();
  const productId = route.params.productId;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProductById(productId)
  });

  const styles = useMemo(() => makeStyles(theme), [theme]);

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
  const specRows = buildSpecRows(product, t);

  return (
    <ScreenContainer>
      <AppScrollView trackNavGlass contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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

        <Card style={styles.heroCard} padded={false}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroFallback}>
              <Ionicons name="image-outline" size={28} color={theme.colors.primary} />
            </View>
          )}
        </Card>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{product.title}</Text>
          <View style={styles.metaRow}>
            {product.priceFrom ? (
              <View style={[styles.pricePill, { backgroundColor: theme.colors.primarySoft }]}>
                <Text style={[styles.priceText, { color: theme.colors.primary }]}>
                  {t("product.priceFrom")} {formatMoney(product.priceFrom, currency)}
                </Text>
              </View>
            ) : (
              <View style={[styles.pricePill, { backgroundColor: theme.colors.surface2 }]}>
                <Text style={[styles.priceText, { color: theme.colors.textMuted }]}>{t("product.priceOnRequest")}</Text>
              </View>
            )}
          </View>
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionHeaderIcon, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="reader-outline" size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>{t("product.descriptionTitle")}</Text>
          </View>
          <Text style={styles.bodyText}>
            {product.description?.trim() ? product.description : t("product.emptyDescription")}
          </Text>
        </Card>

        <Card style={styles.sectionCard}>
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
                />
              ))}
            </View>
          ) : (
            <Text style={styles.bodyText}>{t("product.emptySpecs")}</Text>
          )}
        </Card>

        {product.features?.length ? (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionHeaderIcon, { backgroundColor: theme.colors.primarySoft }]}>
                <Ionicons name="sparkles-outline" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>{t("product.featuresTitle")}</Text>
            </View>
            <View style={styles.featureList}>
              {product.features.slice(0, 8).map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : null}

	        <PrimaryButton
	          title={t("product.openCalculator")}
	          onPress={() => navigation.navigate("Calculator")}
	          leftSlot={<Ionicons name="calculator-outline" size={18} color="#FFFFFF" />}
	        />

        <SiteFooter gutter={spacing.md} />
	      </AppScrollView>
	    </ScreenContainer>
	  );
}

function buildSpecRows(product: Product, t: (key: string) => string): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];

  rows.push({ label: t("product.sku"), value: product.id });

  const specs = product.specs ?? {};
  Object.entries(specs).forEach(([label, raw]) => {
    const value = typeof raw === "number" ? String(raw) : String(raw ?? "");
    if (!label.trim() || !value.trim()) return;
    rows.push({ label, value });
  });

  return rows;
}

function SpecRow({
  label,
  value,
  showDivider
}: {
  label: string;
  value: string;
  showDivider: boolean;
}): JSX.Element {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.specRow, showDivider ? styles.specRowDivider : null]}>
      <Text style={styles.specLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.specValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      padding: spacing.md,
      paddingBottom: 0,
      gap: spacing.md
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
      height: 40,
      paddingHorizontal: 12,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...(theme.shadow.sm as object),
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
      ...( { cursor: "pointer" } as object )
    },
    backPillPressed: {
      opacity: 0.92
    },
    backText: {
      ...font(900),
      fontSize: 13,
      letterSpacing: 0.2,
      color: theme.colors.text
    },
    heroCard: {
      borderRadius: radius.lg,
      overflow: "hidden"
    },
    heroImage: {
      width: "100%",
      height: 240
    },
    heroFallback: {
      width: "100%",
      height: 240,
      backgroundColor: theme.colors.primarySoft,
      alignItems: "center",
      justifyContent: "center"
    },
    titleBlock: {
      gap: spacing.sm
    },
    title: {
      ...font(900),
      fontSize: 22,
      letterSpacing: -0.2,
      color: theme.colors.text,
      lineHeight: 28
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm
    },
    pricePill: {
      alignSelf: "flex-start",
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border
    },
    priceText: {
      ...font(900),
      fontSize: 13,
    },
    sectionCard: {
      gap: spacing.sm
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    sectionHeaderIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center"
    },
    sectionTitle: {
      ...font(900),
      fontSize: 14,
      letterSpacing: 0.2,
      color: theme.colors.text
    },
    bodyText: {
      ...theme.typography.bodyRegular,
      color: theme.colors.textMuted
    },
    specList: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 14,
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
    specRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border
    },
    specLabel: {
      flex: 1,
      ...font(800),
      fontSize: 13,
      color: theme.colors.textMuted
    },
    specValue: {
      flex: 1,
      ...font(900),
      fontSize: 13,
      color: theme.colors.text,
      textAlign: "right"
    },
    featureList: {
      gap: spacing.sm
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm
    },
    featureText: {
      flex: 1,
      ...theme.typography.bodyRegular,
      color: theme.colors.text
    }
  });
}
