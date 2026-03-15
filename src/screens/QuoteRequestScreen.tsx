import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppScrollView } from "../components/AppScrollView";
import { Card } from "../components/Card";
import { DatePickerModal } from "../components/DatePickerModal";
import { PickerField } from "../components/PickerField";
import { PrimaryButton } from "../components/PrimaryButton";
import { QuoteSuccessModal } from "../components/QuoteSuccessModal";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { SiteFooter } from "../components/SiteFooter";
import { TextField } from "../components/TextField";
import { RootStackParamList } from "../navigation/types";
import { createQuote } from "../services/quotes";
import { auth } from "../services/firebase";
import { useCart } from "../services/cart-context";
import { ICON_SIZE, calculatorSectionIcon } from "../theme/iconography";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { formatMoney } from "../utils/money";

export function QuoteRequestScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "QuoteRequest">>();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && screenWidth >= theme.layout.desktopNavMinWidth;
  const desktopContent = isDesktopWeb ? styles.desktopContent : null;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [preferredDate, setPreferredDate] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [successQuoteId, setSuccessQuoteId] = useState<string | null>(null);

  const quoteMutation = useMutation({ mutationFn: createQuote });
  const { clear } = useCart();

  const currentLang = i18n.language?.toLowerCase().startsWith("ru") ? "ru" : "en";
  const formatPreferredDate = (iso: string | null): string => {
    if (!iso) return "";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
    if (!m) return iso;
    const y = m[1];
    const mo = m[2];
    const d = m[3];
    return currentLang === "ru" ? `${d}.${mo}.${y}` : `${y}-${mo}-${d}`;
  };

  const params = route.params;
  const orderItems = Array.isArray(params?.orderItems) ? params.orderItems : [];
  const currency = params?.currency;
  const promoCode = params?.promoCode ?? null;

  const orderSubtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + (Number(item.preview?.total) || 0), 0),
    [orderItems]
  );
  const previewTotal = typeof params?.previewTotal === "number" && Number.isFinite(params.previewTotal)
    ? params.previewTotal
    : orderSubtotal;

  const renderItemLabel = (index: number): string => {
    const item = orderItems[index];
    const input = item?.calcInput;
    const kind = input?.productType === "door" ? t("calculator.types.door") : t("calculator.types.window");
    const widthCm = typeof input?.width === "number" && Number.isFinite(input.width) ? Math.round(input.width * 100) : null;
    const heightCm = typeof input?.height === "number" && Number.isFinite(input.height) ? Math.round(input.height * 100) : null;
    const qty = typeof input?.quantity === "number" && Number.isFinite(input.quantity) ? Math.max(1, Math.round(input.quantity)) : 1;
    const sizeLabel = widthCm && heightCm ? `${widthCm}x${heightCm} cm` : "-";
    return `${kind} · ${sizeLabel} · x${qty}`;
  };

  const onSubmit = async () => {
    if (!orderItems.length || !currency) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const nextNameError = trimmedName ? null : t("calculator.validation.nameRequired");
    const nextPhoneError = trimmedPhone ? null : t("calculator.validation.phoneRequired");
    setNameError(nextNameError);
    setPhoneError(nextPhoneError);
    if (nextNameError || nextPhoneError) {
      return;
    }

    try {
      const response = await quoteMutation.mutateAsync({
        items: orderItems.map((item) => ({ calcInput: item.calcInput })),
        contact: {
          name: trimmedName,
          phone: trimmedPhone
        },
        address: address.trim(),
        preferredMeasurementDate: preferredDate || null,
        currency,
        promoCode
      });

      const uid = auth.currentUser?.uid;
      if (uid) {
        queryClient.invalidateQueries({ queryKey: ["quotes", uid] }).catch(() => undefined);
      } else {
        queryClient.invalidateQueries({ queryKey: ["quotes"] }).catch(() => undefined);
      }

      clear();
      setSuccessQuoteId(response.quoteId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit";
      Alert.alert(t("calculator.quoteTitle"), message);
    }
  };

  if (!orderItems.length || !currency) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={22} color={theme.colors.primary} />
          <Text style={[styles.centerText, { color: theme.colors.textMuted }]}> 
            {t("calculator.disclaimer")}
          </Text>
          <PrimaryButton title={t("common.back")} tone="soft" onPress={() => navigation.goBack()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <>
        <AppScrollView trackNavGlass contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={desktopContent}>
            <ScreenHeader title={t("calculator.submitQuote")} subtitle={t("calculator.disclaimer")} />
          </View>

          <View style={desktopContent}>
            <Card style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardTitleIcon, { backgroundColor: theme.colors.primarySoft }]}> 
                  <Ionicons name="cart-outline" size={ICON_SIZE.md} color={theme.colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}> 
                  {t("calculator.orderSummary", { defaultValue: "Состав заказа" })}
                </Text>
              </View>

              <Text style={[styles.orderMeta, { color: theme.colors.textMuted }]}> 
                {t("calculator.orderItemsCount", { defaultValue: "Позиции: {{count}}", count: orderItems.length })}
              </Text>

              <View style={styles.orderItemsList}>
                {orderItems.map((item, index) => (
                  <View
                    key={item.localId}
                    style={[styles.orderItemRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
                  >
                    <View style={styles.orderItemMain}>
                      <Text style={[styles.orderItemTitle, { color: theme.colors.text }]} numberOfLines={2}>
                        {index + 1}. {renderItemLabel(index)}
                      </Text>
                      <Text style={[styles.orderItemPrice, { color: theme.colors.primary }]}>
                        {formatMoney(Number(item.preview?.total) || 0, currency)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={[styles.totalWrap, { borderTopColor: theme.colors.border }]}> 
                <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}> 
                  {t("quotes.details.fields.subtotal", { defaultValue: "Подытог" })}
                </Text>
                <Text style={[styles.totalValue, { color: theme.colors.text }]}> 
                  {formatMoney(orderSubtotal, currency)}
                </Text>
              </View>

              {promoCode ? (
                <View style={styles.totalWrap}>
                  <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}> 
                    {t("quotes.details.fields.promoCode", { defaultValue: "Промокод" })}
                  </Text>
                  <Text style={[styles.totalValue, { color: theme.colors.text }]}>{String(promoCode)}</Text>
                </View>
              ) : null}

              <View style={styles.totalWrap}>
                <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}> 
                  {t("quotes.details.fields.total", { defaultValue: "Итого" })}
                </Text>
                <Text style={[styles.totalValue, { color: theme.colors.primary }]}> 
                  {formatMoney(previewTotal, currency)}
                </Text>
              </View>
            </Card>
          </View>

          <View style={desktopContent}>
            <Card style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardTitleIcon, { backgroundColor: theme.colors.primarySoft }]}> 
                  <Ionicons name={calculatorSectionIcon.contact} size={ICON_SIZE.md} color={theme.colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("calculator.sectionContact")}</Text>
              </View>
              <TextField
                label={t("account.name")}
                value={name}
                onChangeText={(txt) => {
                  setName(txt);
                  if (nameError) setNameError(null);
                }}
                placeholder={t("calculator.namePlaceholder")}
                errorText={nameError ?? undefined}
              />
              <TextField
                label={t("account.phone")}
                leftSlot={<Ionicons name="call-outline" size={ICON_SIZE.md} color={theme.colors.primary} />}
                value={phone}
                onChangeText={(txt) => {
                  setPhone(txt);
                  if (phoneError) setPhoneError(null);
                }}
                keyboardType="phone-pad"
                inputMode="tel"
                placeholder={t("calculator.phonePlaceholder")}
                helperText={t("calculator.phoneHint")}
                errorText={phoneError ?? undefined}
              />
            </Card>
          </View>

          <View style={desktopContent}>
            <Card style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardTitleIcon, { backgroundColor: theme.colors.primarySoft }]}> 
                  <Ionicons name={calculatorSectionIcon.address} size={ICON_SIZE.md} color={theme.colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("calculator.sectionAddress")}</Text>
              </View>
              <TextField
                label={t("calculator.address")}
                leftSlot={<Ionicons name="location-outline" size={ICON_SIZE.md} color={theme.colors.primary} />}
                value={address}
                onChangeText={setAddress}
                placeholder={t("calculator.addressPlaceholder")}
              />
              <PickerField
                label={t("calculator.preferredDate")}
                leftSlot={<Ionicons name="calendar-outline" size={ICON_SIZE.md} color={theme.colors.primary} />}
                rightSlot={<Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />}
                value={formatPreferredDate(preferredDate)}
                placeholder={t("calculator.datePlaceholder")}
                onPress={() => setDatePickerOpen(true)}
              />
            </Card>
          </View>

          <View style={desktopContent}>
            <PrimaryButton
              title={t("calculator.submitQuote")}
              onPress={() => void onSubmit()}
              loading={quoteMutation.isPending}
              disabled={quoteMutation.isPending || !orderItems.length}
              leftSlot={<Ionicons name="send-outline" size={18} color="#FFFFFF" />}
            />
          </View>

          <View style={[desktopContent, ({ marginTop: "auto" } as any)]}>
            <SiteFooter gutter={spacing.md} />
          </View>
        </AppScrollView>

        <DatePickerModal
          open={datePickerOpen}
          title={t("calculator.calendarTitle")}
          valueIso={preferredDate}
          lang={currentLang}
          minIso={undefined}
          clearLabel={t("common.clear")}
          closeLabel={t("common.close")}
          onSelect={(next) => {
            setPreferredDate(next);
            setDatePickerOpen(false);
          }}
          onClear={() => {
            setPreferredDate(null);
            setDatePickerOpen(false);
          }}
          onClose={() => setDatePickerOpen(false)}
        />

        <QuoteSuccessModal
          open={successQuoteId !== null}
          title={t("calculator.done")}
          body={t("calculator.successBody")}
          quoteId={successQuoteId}
          closeLabel={t("common.close")}
          quotesLabel={t("account.quotes")}
          onClose={() => {
            setSuccessQuoteId(null);
            navigation.navigate("Cart");
          }}
          onViewQuotes={() => {
            setSuccessQuoteId(null);
            navigation.navigate("Quotes");
          }}
        />
      </>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 0
  },
  desktopContent: {
    width: "100%",
    maxWidth: 960,
    alignSelf: "center"
  },
  card: {
    gap: spacing.sm
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  cardTitleIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700"
  },
  orderMeta: {
    fontSize: 12,
    fontWeight: "600"
  },
  orderItemsList: {
    gap: spacing.xs
  },
  orderItemRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  orderItemMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  orderItemTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700"
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: "800"
  },
  totalWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "700"
  },
  totalValue: {
    fontSize: 13,
    fontWeight: "800"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm
  },
  centerText: {
    textAlign: "center",
    fontSize: 14
  }
});
