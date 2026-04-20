import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { AppScrollView } from "../components/AppScrollView";
import { Card } from "../components/Card";
import { IconButton } from "../components/IconButton";
import { PriceBreakdownList } from "../components/PriceBreakdownList";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { TextField } from "../components/TextField";
import { RootStackParamList } from "../navigation/types";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCart } from "../services/cart-context";
import { applyPromoCode } from "../services/quotes";
import { useCurrencyControls } from "../services/currency-context";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { buildQuoteBreakdown } from "../utils/calc-breakdown";
import { formatMoney } from "../utils/money";
import { formatOrderItemLabel } from "../utils/order-items";

export function CartScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && screenWidth >= theme.layout.desktopNavMinWidth;
  const desktopContent = isDesktopWeb ? styles.desktopContent : null;

  const { currency } = useCurrencyControls();
  const { ready, items, promoCode, setPromoCode, removeItem, clear, itemsSubtotal } = useCart();

  const [promoPreview, setPromoPreview] = useState<number | null>(null);
  const promoMutation = useMutation({ mutationFn: applyPromoCode });

  const total = promoPreview ?? itemsSubtotal;
  const breakdown = useMemo(
    () => buildQuoteBreakdown(items.map((item) => item.preview?.calcDto), Math.max(0, itemsSubtotal - total)),
    [items, itemsSubtotal, total]
  );

  const onApplyPromo = async () => {
    if (!promoCode.trim()) return;
    if (itemsSubtotal <= 0) {
      Alert.alert(
        t("cart.title", { defaultValue: "Корзина" }),
        t("calculator.validation.addAtLeastOneItem", { defaultValue: "Добавьте хотя бы одно изделие в заказ." })
      );
      return;
    }

    try {
      const result = await promoMutation.mutateAsync({ code: promoCode.trim(), total: itemsSubtotal, currency });
      setPromoPreview(result.finalTotal);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Promo check failed";
      Alert.alert(t("calculator.promoTitle"), message);
    }
  };

  const onCheckout = () => {
    if (!items.length) {
      Alert.alert(
        t("cart.title", { defaultValue: "Корзина" }),
        t("calculator.validation.addAtLeastOneItem", { defaultValue: "Добавьте хотя бы одно изделие в заказ." })
      );
      return;
    }

    navigation.navigate("QuoteRequest", {
      orderItems: items,
      currency,
      promoCode: promoCode.trim() ? promoCode.trim().toUpperCase() : null,
      previewTotal: total,
    });
  };

  const onClear = () => {
    if (!items.length) return;
    clear();
    setPromoPreview(null);
  };

  const orderMetaText = useMemo(
    () => t("calculator.orderItemsCount", { defaultValue: "Позиции: {{count}}", count: items.length }),
    [items.length, t]
  );

  if (!ready) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Ionicons name="hourglass-outline" size={22} color={theme.colors.primary} />
          <Text style={[styles.centerText, { color: theme.colors.textMuted }]}>{t("common.loading")}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <>
        <AppScrollView trackNavGlass contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={desktopContent}>
            <ScreenHeader
              title={t("cart.title", { defaultValue: "Корзина" })}
              subtitle={t("cart.subtitle", { defaultValue: "Изделия для общей заявки" })}
            />
          </View>

          <View style={desktopContent}>
            <Card variant="solid" style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardTitleMain}>
                  <View style={[styles.cardTitleIcon, { backgroundColor: theme.colors.primarySoft }]}>
                    <Ionicons name="cart-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]} numberOfLines={1}>
                    {t("calculator.orderSummary", { defaultValue: "Состав заказа" })}
                  </Text>
                </View>

                <View style={styles.cardTitleActions}>
                  <IconButton
                    icon="add-outline"
                    accessibilityLabel={t("cart.toCalculator", { defaultValue: "Добавить еще" })}
                    tooltip={t("cart.toCalculator", { defaultValue: "Добавить еще" })}
                    onPress={() => navigation.navigate("Calculator")}
                    tone="soft"
                    enableTooltip={false}
                  />
                  <IconButton
                    icon="trash-outline"
                    accessibilityLabel={t("cart.clear", { defaultValue: "Очистить корзину" })}
                    tooltip={t("cart.clear", { defaultValue: "Очистить корзину" })}
                    onPress={onClear}
                    tone="soft"
                    disabled={!items.length}
                    enableTooltip={false}
                  />
                </View>
              </View>

              <Text style={[styles.orderMeta, { color: theme.colors.textMuted }]}>{orderMetaText}</Text>

              {items.length ? (
                <View style={styles.orderItemsList}>
                  {items.map((item, index) => (
                    <View
                      key={item.localId}
                      style={[styles.orderItemRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
                    >
                      <View style={styles.orderItemMain}>
                        <Text style={[styles.orderItemTitle, { color: theme.colors.text }]} numberOfLines={2}>
                          {index + 1}. {formatOrderItemLabel(item, t)}
                        </Text>
                        <View style={styles.orderItemActions}>
                          <Text style={[styles.orderItemPrice, { color: theme.colors.primary }]}>
                            {formatMoney(Number(item.preview?.total) || 0, currency)}
                          </Text>
                          <IconButton
                            icon="trash-outline"
                            accessibilityLabel={t("calculator.removeFromOrder", { defaultValue: "Удалить позицию" })}
                            tooltip={t("calculator.removeFromOrder", { defaultValue: "Удалить позицию" })}
                            onPress={() => {
                              removeItem(item.localId);
                              setPromoPreview(null);
                            }}
                            tone="soft"
                            size={34}
                            iconSize={16}
                            enableTooltip={false}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}> 
                  {t("cart.empty", { defaultValue: "Корзина пуста" })}
                </Text>
              )}

              <View style={[styles.totalWrap, { borderTopColor: theme.colors.border }]}> 
                <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}> 
                  {t("quotes.details.fields.subtotal", { defaultValue: "Подытог" })}
                </Text>
                <Text style={[styles.totalValue, { color: theme.colors.text }]}> 
                  {formatMoney(itemsSubtotal, currency)}
                </Text>
              </View>
            </Card>
          </View>

          <View style={desktopContent}>
            <Card variant="solid" style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={styles.cardTitleMain}>
                  <View style={[styles.cardTitleIcon, { backgroundColor: theme.colors.primarySoft }]}>
                    <Ionicons name="pricetag-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}> 
                    {t("calculator.sectionPromo")}
                  </Text>
                </View>
              </View>

              <TextField
                label={t("calculator.promo")}
                value={promoCode}
                onChangeText={(next) => {
                  setPromoCode(next);
                  setPromoPreview(null);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={t("calculator.promoPlaceholder")}
              />

              <PrimaryButton
                title={t("calculator.promoApply")}
                tone="soft"
                onPress={() => void onApplyPromo()}
                loading={promoMutation.isPending}
                disabled={!promoCode.trim() || promoMutation.isPending || !items.length}
                leftSlot={<Ionicons name="checkmark-outline" size={18} color={theme.colors.primary} />}
              />

              <View style={[styles.totalWrap, { borderTopColor: theme.colors.border }]}> 
                <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}> 
                  {t("calculator.totalLabel")}
                </Text>
                <Text style={[styles.totalValue, { color: theme.colors.primary }]}> 
                  {formatMoney(total, currency)}
                </Text>
              </View>
              <PriceBreakdownList breakdown={breakdown} currency={currency} style={styles.breakdownList} />
              <Text style={[styles.disclaimer, { color: theme.colors.textMuted }]}>{t("calculator.disclaimer")}</Text>

              {promoPreview !== null ? (
                <Text style={[styles.promoNote, { color: theme.colors.textMuted }]}>{t("calculator.promoApplied")}</Text>
              ) : null}
            </Card>
          </View>

          <View style={desktopContent}>
            <PrimaryButton
              title={t("calculator.submitQuote")}
              onPress={onCheckout}
              disabled={!items.length}
              leftSlot={<Ionicons name="send-outline" size={18} color="#FFFFFF" />}
            />
          </View>

        </AppScrollView>
      </>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 0,
  },
  desktopContent: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  card: {
    gap: spacing.sm,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitleMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
  },
  cardTitleIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  orderMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderItemsList: {
    gap: spacing.xs,
  },
  orderItemRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  orderItemMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  orderItemTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  orderItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 0,
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: "800",
  },
  totalWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  totalValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  centerText: {
    textAlign: "center",
    fontSize: 14,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  promoNote: {
    fontSize: 12,
  },
  breakdownList: {
    marginTop: spacing.xs,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
  },
});
