import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useRef, useState } from "react";
import { Alert, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppScrollView } from "../components/AppScrollView";
import { Card } from "../components/Card";
import { PickerField } from "../components/PickerField";

import { PrimaryButton } from "../components/PrimaryButton";
import { QuoteSuccessModal } from "../components/QuoteSuccessModal";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { SelectListModal, type SelectListOption } from "../components/SelectListModal";

import { TextField } from "../components/TextField";
import { KANEVSKY_MUNICIPALITY_ID, kanevskyPlaces, krasnodarMunicipalities } from "../constants/krasnodarLocations";
import { RootStackParamList } from "../navigation/types";
import { createQuote } from "../services/quotes";
import { auth } from "../services/firebase";
import { useCart } from "../services/cart-context";
import { ICON_SIZE, calculatorSectionIcon } from "../theme/iconography";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { formatMoney } from "../utils/money";
import { formatOrderItemLabel } from "../utils/order-items";

type LocationPickerKey = "municipality" | "kanevskyPlace";
type PickerRect = { x: number; y: number; width: number; height: number };

export function QuoteRequestScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "QuoteRequest">>();
  const queryClient = useQueryClient();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && screenWidth >= theme.layout.desktopNavMinWidth;
  const desktopContent = isDesktopWeb ? styles.desktopContent : null;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string | null>(null);
  const [selectedKanevskyPlaceId, setSelectedKanevskyPlaceId] = useState<string | null>(null);
  const [locationPickerOpen, setLocationPickerOpen] = useState<LocationPickerKey | null>(null);
  const [locationPickerRect, setLocationPickerRect] = useState<PickerRect | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [successQuoteId, setSuccessQuoteId] = useState<string | null>(null);
  const municipalityAnchorRef = useRef<View | null>(null);
  const kanevskyPlaceAnchorRef = useRef<View | null>(null);

  const quoteMutation = useMutation({ mutationFn: createQuote });
  const { clear } = useCart();

  const params = route.params;
  const orderItems = Array.isArray(params?.orderItems) ? params.orderItems : [];
  const currency = params?.currency;

  const municipalityOptions = useMemo<SelectListOption<string>[]>(
    () => [...krasnodarMunicipalities]
      .sort((a, b) => {
        if (a.id === KANEVSKY_MUNICIPALITY_ID) return -1;
        if (b.id === KANEVSKY_MUNICIPALITY_ID) return 1;
        return a.label.localeCompare(b.label, "ru");
      })
      .map((item) => ({ value: item.id, label: item.label })),
    []
  );
  const kanevskyPlaceOptions = useMemo<SelectListOption<string>[]>(
    () => kanevskyPlaces.map((item) => ({ value: item.id, label: item.name })),
    []
  );
  const selectedMunicipality = useMemo(
    () => krasnodarMunicipalities.find((item) => item.id === selectedMunicipalityId) ?? null,
    [selectedMunicipalityId]
  );
  const isKanevskyDistrict = selectedMunicipalityId === KANEVSKY_MUNICIPALITY_ID;
  const selectedKanevskyPlace = useMemo(
    () => kanevskyPlaces.find((item) => item.id === selectedKanevskyPlaceId) ?? null,
    [selectedKanevskyPlaceId]
  );
  const composedAddress = useMemo(
    () => (
      [
        selectedMunicipality?.label,
        isKanevskyDistrict ? selectedKanevskyPlace?.name : undefined,
      ]
        .filter(Boolean)
        .join(", ")
    ),
    [isKanevskyDistrict, selectedKanevskyPlace?.name, selectedMunicipality?.label]
  );
  const openLocationPicker = (key: LocationPickerKey) => {
    const ref = key === "municipality" ? municipalityAnchorRef : kanevskyPlaceAnchorRef;
    const fallbackWidth = Math.max(260, Math.min(520, screenWidth - spacing.md * 2));
    const fallbackRect = {
      x: spacing.md,
      y: Math.max(spacing.md, Math.round(screenHeight * 0.22)),
      width: fallbackWidth,
      height: 50,
    };

    const anchor = ref.current;
    if (!anchor) {
      setLocationPickerRect(fallbackRect);
      setLocationPickerOpen(key);
      return;
    }

    anchor.measureInWindow((x, y, width, height) => {
      setLocationPickerRect({
        x: Number.isFinite(x) ? x : fallbackRect.x,
        y: Number.isFinite(y) ? y : fallbackRect.y,
        width: Number.isFinite(width) && width > 0 ? width : fallbackRect.width,
        height: Number.isFinite(height) && height > 0 ? height : fallbackRect.height,
      });
      setLocationPickerOpen(key);
    });
  };
  const locationPickerOptions = locationPickerOpen === "kanevskyPlace" ? kanevskyPlaceOptions : municipalityOptions;
  const locationPickerValue = locationPickerOpen === "kanevskyPlace" ? selectedKanevskyPlaceId : selectedMunicipalityId;
  const locationAnchorX = locationPickerRect?.x ?? spacing.md;
  const locationAnchorY = locationPickerRect?.y ?? spacing.md;
  const locationAnchorWidth = locationPickerRect?.width ?? Math.max(260, screenWidth - spacing.md * 2);
  const locationAnchorHeight = locationPickerRect?.height ?? 50;
  const locationMenuHorizontalMargin = spacing.sm;
  const locationMenuWidth = Math.min(
    Math.max(locationAnchorWidth, 260),
    Math.max(260, screenWidth - locationMenuHorizontalMargin * 2)
  );
  const locationMenuLeft = Math.min(
    Math.max(locationMenuHorizontalMargin, locationAnchorX),
    Math.max(locationMenuHorizontalMargin, screenWidth - locationMenuWidth - locationMenuHorizontalMargin)
  );
  const locationMenuBelowTop = Math.max(spacing.sm, locationAnchorY + locationAnchorHeight + spacing.xs);
  const locationSpaceBelow = Math.max(0, screenHeight - locationMenuBelowTop - spacing.sm);
  const locationSpaceAbove = Math.max(0, locationAnchorY - spacing.sm);
  const locationOpenAbove = locationSpaceBelow < 180 && locationSpaceAbove > locationSpaceBelow;
  const locationMenuMaxHeight = Math.max(140, Math.min(360, locationOpenAbove ? locationSpaceAbove : locationSpaceBelow));
  const locationMenuTop = locationOpenAbove
    ? Math.max(spacing.sm, locationAnchorY - locationMenuMaxHeight - spacing.xs)
    : locationMenuBelowTop;

  const orderSubtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + (Number(item.preview?.total) || 0), 0),
    [orderItems]
  );
  const volumeDiscountParam = typeof params?.volumeDiscountAmount === "number" && Number.isFinite(params.volumeDiscountAmount) && params.volumeDiscountAmount > 0
    ? params.volumeDiscountAmount
    : null;
  const previewTotal = useMemo(() => {
    const afterVolumeDiscount = volumeDiscountParam !== null
      ? Math.max(0, orderSubtotal - volumeDiscountParam)
      : orderSubtotal;
    return typeof params?.previewTotal === "number" && Number.isFinite(params.previewTotal)
      ? params.previewTotal
      : afterVolumeDiscount;
  }, [orderSubtotal, volumeDiscountParam, params?.previewTotal]);

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
        items: orderItems.map((item) => (
          item.kind === "moskitki"
            ? {
                kind: "moskitki" as const,
                moskitki: item.moskitki,
              }
            : {
                kind: "calc" as const,
                calcInput: item.calcInput,
              }
        )),
        contact: {
          name: trimmedName,
          phone: trimmedPhone
        },
        address: composedAddress,
        currency,
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
            {t("cart.empty", { defaultValue: "Корзина пуста" })}
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
            <View style={styles.headerWrap}>
              <ScreenHeader title={t("calculator.submitQuote")} />
            </View>
          </View>

          <View style={desktopContent}>
            <Card variant="solid" style={styles.card}>
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
                        {index + 1}. {formatOrderItemLabel(item, t)}
                      </Text>
                      <Text style={[styles.orderItemPrice, { color: theme.colors.primary }]}>
                        {formatMoney(Number(item.preview?.total) || 0, currency)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={[styles.totalWrap, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.subtotalLabel, { color: theme.colors.textMuted }]}>
                  {t("quotes.details.fields.subtotal", { defaultValue: "Подытог" })}
                </Text>
                <Text
                  style={[
                    styles.subtotalValue,
                    volumeDiscountParam !== null
                      ? { color: theme.colors.textMuted, textDecorationLine: "line-through" }
                      : { color: theme.colors.text },
                  ]}
                >
                  {formatMoney(orderSubtotal, currency)}
                </Text>
              </View>

              {volumeDiscountParam !== null ? (
                <View style={styles.totalWrap}>
                  <Text style={[styles.discountLabel, { color: theme.colors.textMuted }]}>
                    {t("calculator.volumeDiscountLabel", { defaultValue: "Скидка за объём" })}
                  </Text>
                  <Text style={[styles.discountValue, { color: "#43A047" }]}>
                    −{formatMoney(volumeDiscountParam, currency)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.totalWrap}>
                <View />
                <View style={styles.totalPriceRow}>
                  {volumeDiscountParam !== null ? (
                    <Text style={[styles.originalPrice, { color: theme.colors.textMuted }]}>
                      {formatMoney(orderSubtotal, currency)}
                    </Text>
                  ) : null}
                  <Text style={[styles.totalValue, { color: theme.colors.primary }]}> 
                    {t("product.priceFrom")} {formatMoney(previewTotal, currency)}
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          <View style={desktopContent}>
            <Card variant="solid" style={styles.card}>
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
                errorText={phoneError ?? undefined}
              />
              <View ref={municipalityAnchorRef} collapsable={false}>
                <PickerField
                  label={t("calculator.municipality")}
                  active={locationPickerOpen === "municipality"}
                  variant="select"
                  leftSlot={<Ionicons name="map-outline" size={ICON_SIZE.md} color={theme.colors.primary} />}
                  rightSlot={<Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />}
                  value={selectedMunicipality?.label ?? ""}
                  placeholder={t("calculator.municipalityPlaceholder")}
                  onPress={() => openLocationPicker("municipality")}
                />
              </View>
              {isKanevskyDistrict ? (
                <View ref={kanevskyPlaceAnchorRef} collapsable={false}>
                  <PickerField
                    label={t("calculator.kanevskyPlace")}
                    active={locationPickerOpen === "kanevskyPlace"}
                    variant="select"
                    leftSlot={<Ionicons name="navigate-outline" size={ICON_SIZE.md} color={theme.colors.primary} />}
                    rightSlot={<Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />}
                    value={selectedKanevskyPlace?.name ?? ""}
                    placeholder={t("calculator.kanevskyPlacePlaceholder")}
                    onPress={() => openLocationPicker("kanevskyPlace")}
                  />
                </View>
              ) : null}
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

          
        </AppScrollView>

        <SelectListModal
          mounted={locationPickerOpen !== null}
          open={locationPickerOpen !== null}
          onClose={() => setLocationPickerOpen(null)}
          options={locationPickerOptions}
          value={locationPickerValue}
          onSelect={(next) => {
            if (locationPickerOpen === "kanevskyPlace") {
              setSelectedKanevskyPlaceId(next);
            } else {
              setSelectedMunicipalityId(next);
              if (next !== KANEVSKY_MUNICIPALITY_ID) {
                setSelectedKanevskyPlaceId(null);
              }
            }
            setLocationPickerOpen(null);
          }}
          top={locationMenuTop}
          left={locationMenuLeft}
          width={locationMenuWidth}
          maxHeight={locationMenuMaxHeight}
          showVerticalScrollIndicator={locationPickerOptions.length > 8}
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
  headerWrap: {
    gap: spacing.xs
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  orderItemMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  orderItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  orderItemPrice: {
    fontSize: 14,
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
    fontSize: 15,
    fontWeight: "900"
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "900"
  },
  totalPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  originalPrice: {
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },
  discountLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  discountValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  subtotalLabel: {
    fontSize: 13,
    fontWeight: "700"
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: "800"
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
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
