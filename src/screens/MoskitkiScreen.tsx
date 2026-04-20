import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { AppScrollView } from "../components/AppScrollView";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { RangeField } from "../components/RangeField";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { SiteFooter } from "../components/SiteFooter";
import { TextField } from "../components/TextField";
import type { QuoteMoskitkiOrderItemDraft } from "../navigation/types";
import { useCart } from "../services/cart-context";
import { useCurrencyControls } from "../services/currency-context";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { formatMoney } from "../utils/money";

const WIDTH_MIN_MM = 350;
const WIDTH_MAX_MM = 900;
const HEIGHT_MIN_MM = 350;
const HEIGHT_MAX_MM = 2300;
const DEFAULT_PREVIEW_WIDTH_MM = 600;
const DEFAULT_PREVIEW_HEIGHT_MM = 1200;

type PricePoint = {
  width: number;
  height: number;
  price: number;
  area: number;
};

const PRICE_POINTS: PricePoint[] = [
  { width: 350, height: 350, price: 250, area: 350 * 350 },
  { width: 350, height: 900, price: 600, area: 350 * 900 },
  { width: 600, height: 1200, price: 1500, area: 600 * 1200 },
  { width: 800, height: 1200, price: 1850, area: 800 * 1200 },
  { width: 900, height: 1800, price: 2500, area: 900 * 1800 },
  { width: 900, height: 2300, price: 3500, area: 900 * 2300 }
].sort((left, right) => left.area - right.area);

function sanitizeNumericInput(value: string, maxLength = 4): string {
  return value.replace(/[^\d]/g, "").slice(0, maxLength);
}

function parseInteger(value: string): number | null {
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function createMeshOffsets(count: number): number[] {
  return Array.from({ length: count }, (_, index) => Number((((index + 1) / (count + 1)) * 100).toFixed(2)));
}

function interpolatePrice(area: number): number {
  const firstPoint = PRICE_POINTS[0];
  const lastPoint = PRICE_POINTS[PRICE_POINTS.length - 1];

  if (area <= firstPoint.area) return firstPoint.price;
  if (area >= lastPoint.area) return lastPoint.price;

  for (let index = 1; index < PRICE_POINTS.length; index += 1) {
    const previousPoint = PRICE_POINTS[index - 1];
    const nextPoint = PRICE_POINTS[index];

    if (area > nextPoint.area) continue;

    const span = nextPoint.area - previousPoint.area;
    if (span <= 0) return nextPoint.price;

    const progress = (area - previousPoint.area) / span;
    return previousPoint.price + (nextPoint.price - previousPoint.price) * progress;
  }

  return lastPoint.price;
}

export function MoskitkiScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { currency } = useCurrencyControls();
  const { items: orderItems, addItem } = useCart();
  const { width } = useWindowDimensions();
  const [screenWidth, setScreenWidth] = useState("600");
  const [screenHeight, setScreenHeight] = useState("1200");
  const [quantity, setQuantity] = useState("1");

  const gutter = width < 420 ? spacing.sm : spacing.md;
  const isWideLayout = width >= 920;
  const areaLocale = i18n.language?.toLowerCase().startsWith("ru") ? "ru-RU" : "en-US";
  const dimensionUnit = i18n.language?.toLowerCase().startsWith("ru") ? "мм" : "mm";
  const styles = useMemo(() => makeStyles(theme, isWideLayout), [theme, isWideLayout]);

  const parsedWidth = parseInteger(screenWidth);
  const parsedHeight = parseInteger(screenHeight);
  const parsedQuantity = parseInteger(quantity);
  const previewWidth = parsedWidth === null
    ? DEFAULT_PREVIEW_WIDTH_MM
    : Math.min(WIDTH_MAX_MM, Math.max(WIDTH_MIN_MM, parsedWidth));
  const previewHeight = parsedHeight === null
    ? DEFAULT_PREVIEW_HEIGHT_MM
    : Math.min(HEIGHT_MAX_MM, Math.max(HEIGHT_MIN_MM, parsedHeight));
  const previewAspectRatio = previewWidth / previewHeight;
  const previewWidthLabel = `${previewWidth} мм`;
  const previewHeightLabel = `${previewHeight} мм`;
  const previewBackdropColor = theme.isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.84)";
  const previewBackdropBorderColor = theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.06)";
  const previewFrameOuterColor = theme.isDark ? "#5a544e" : "#d9d1c6";
  const previewFrameOuterBorderColor = theme.isDark ? "#7d766d" : "#b9afa2";
  const previewFrameInnerColor = theme.isDark ? "#37332f" : "#efe9e1";
  const previewFrameInnerBorderColor = theme.isDark ? "#6d665e" : "#c9beb2";
  const previewMeshBaseColor = theme.isDark ? "#232522" : "#f6f5f1";
  const previewMeshBorderColor = theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.08)";
  const previewMeshSheenColor = theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.54)";
  const previewMeshTextureColor = theme.isDark ? "rgba(186,189,188,0.07)" : "rgba(60,68,74,0.07)";
  const previewMeshTextureSecondaryColor = theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)";
  const previewMeshLineColor = theme.isDark ? "rgba(255,255,255,0.16)" : "rgba(60,68,74,0.15)";
  const previewMeshLineSoftColor = theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(60,68,74,0.08)";
  const previewFrameStyle: ViewStyle = previewAspectRatio >= 1
    ? { width: "96%", maxWidth: isWideLayout ? 420 : 360, aspectRatio: previewAspectRatio, maxHeight: isWideLayout ? 320 : 264 }
    : { height: "96%", maxHeight: isWideLayout ? 452 : 360, aspectRatio: previewAspectRatio, minWidth: 88 };
  const previewVerticalLines = createMeshOffsets(
    previewAspectRatio >= 1.35 ? 12 : previewAspectRatio >= 0.8 ? 10 : previewAspectRatio >= 0.45 ? 8 : 6
  );
  const previewHorizontalLines = createMeshOffsets(
    previewAspectRatio <= 0.45 ? 18 : previewAspectRatio <= 0.7 ? 15 : 12
  );
  const previewVerticalLinesSoft = createMeshOffsets(
    previewAspectRatio >= 1.35 ? 23 : previewAspectRatio >= 0.8 ? 19 : previewAspectRatio >= 0.45 ? 15 : 11
  );
  const previewHorizontalLinesSoft = createMeshOffsets(
    previewAspectRatio <= 0.45 ? 35 : previewAspectRatio <= 0.7 ? 29 : 23
  );

  const widthError =
    parsedWidth === null || parsedWidth < WIDTH_MIN_MM || parsedWidth > WIDTH_MAX_MM
      ? t("moskitki.calculator.errors.width")
      : undefined;
  const heightError =
    parsedHeight === null || parsedHeight < HEIGHT_MIN_MM || parsedHeight > HEIGHT_MAX_MM
      ? t("moskitki.calculator.errors.height")
      : undefined;
  const quantityError =
    parsedQuantity === null || parsedQuantity < 1 ? t("moskitki.calculator.errors.quantity") : undefined;

  const calculation = useMemo(() => {
    if (widthError || heightError || quantityError || parsedWidth === null || parsedHeight === null || parsedQuantity === null) {
      return null;
    }

    const areaMm = parsedWidth * parsedHeight;
    const areaM2 = areaMm / 1_000_000;
    const pricePerItem = Math.round(interpolatePrice(areaMm));
    const totalPrice = pricePerItem * parsedQuantity;

    return {
      areaM2,
      pricePerItem,
      totalPrice,
      quantity: parsedQuantity,
      width: parsedWidth,
      height: parsedHeight
    };
  }, [heightError, parsedHeight, parsedQuantity, parsedWidth, quantityError, widthError]);

  const onAddToCart = () => {
    if (!calculation) return;

    if (orderItems.length >= 20) {
      Alert.alert(
        t("calculator.orderTitle", { defaultValue: "Заказ" }),
        t("calculator.validation.maxOrderItems", { defaultValue: "Максимум 20 изделий в одном заказе." })
      );
      return;
    }

    const nextItem: QuoteMoskitkiOrderItemDraft = {
      kind: "moskitki",
      localId: `moskitki_${Date.now()}_${orderItems.length}`,
      moskitki: {
        widthMm: calculation.width,
        heightMm: calculation.height,
        quantity: calculation.quantity,
        pricePerItem: calculation.pricePerItem,
        title: t("moskitki.cart.itemTitle"),
      },
      preview: {
        subtotal: calculation.totalPrice,
        total: calculation.totalPrice,
        currency,
      },
    };

    addItem(nextItem);
    Alert.alert(
      t("cart.title", { defaultValue: "Корзина" }),
      t("moskitki.cart.added", { defaultValue: "Москитная сетка добавлена в корзину." })
    );
  };

  return (
    <ScreenContainer>
      <AppScrollView
        trackNavGlass
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: gutter, paddingBottom: 0 }]}
      >
        <View style={styles.content}>
          <View style={styles.headerWrap}>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{t("moskitki.eyebrow")}</Text>
            <ScreenHeader title={t("moskitki.title")} subtitle={t("moskitki.subtitle")} />
          </View>

          <View style={styles.topGrid}>
            <Card variant="solid" elevated={false} padded={false} style={styles.visualCard}>
              <View
                accessible
                accessibilityLabel={`${t("moskitki.visualAlt")}. ${t("moskitki.visualWidthLabel")}: ${previewWidthLabel}. ${t("moskitki.visualHeightLabel")}: ${previewHeightLabel}.`}
                style={[styles.visualStage, { backgroundColor: theme.colors.surface2 }]}
              >
                <View style={styles.previewScene}>
                  <View
                    style={[
                      styles.previewBackdrop,
                      {
                        backgroundColor: previewBackdropColor,
                        borderColor: previewBackdropBorderColor
                      }
                    ]}
                  />

                  <View
                    style={[
                      styles.previewFrameOuter,
                      previewFrameStyle,
                      {
                        backgroundColor: previewFrameOuterColor,
                        borderColor: previewFrameOuterBorderColor
                      }
                    ]}
                  >
                    <View
                      style={[
                        styles.previewFrameInner,
                        {
                          backgroundColor: previewFrameInnerColor,
                          borderColor: previewFrameInnerBorderColor
                        }
                      ]}
                    >
                      <View
                        style={[
                          styles.previewMeshField,
                          {
                            backgroundColor: previewMeshBaseColor,
                            borderColor: previewMeshBorderColor
                          }
                        ]}
                      >
                        <View style={[styles.previewMeshSheen, { backgroundColor: previewMeshSheenColor }]} />
                        <View style={[styles.previewMeshTexture, { backgroundColor: previewMeshTextureColor }]} />
                        <View style={[styles.previewMeshTextureSecondary, { backgroundColor: previewMeshTextureSecondaryColor }]} />

                        {previewVerticalLinesSoft.map((offset) => (
                          <View
                            key={`vs-${offset}`}
                            style={[
                              styles.previewLineVerticalSoft,
                              { left: `${offset}%`, backgroundColor: previewMeshLineSoftColor }
                            ]}
                          />
                        ))}

                        {previewHorizontalLinesSoft.map((offset) => (
                          <View
                            key={`hs-${offset}`}
                            style={[
                              styles.previewLineHorizontalSoft,
                              { top: `${offset}%`, backgroundColor: previewMeshLineSoftColor }
                            ]}
                          />
                        ))}

                        {previewVerticalLines.map((offset) => (
                          <View
                            key={`v-${offset}`}
                            style={[styles.previewLineVertical, { left: `${offset}%`, backgroundColor: previewMeshLineColor }]}
                          />
                        ))}

                        {previewHorizontalLines.map((offset) => (
                          <View
                            key={`h-${offset}`}
                            style={[styles.previewLineHorizontal, { top: `${offset}%`, backgroundColor: previewMeshLineColor }]}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </Card>

            <Card variant="solid" elevated={false} style={styles.calculatorCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: theme.colors.primarySoft }]}>
                  <Ionicons name="calculator-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.cardHeaderCopy}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t("moskitki.calculator.title")}</Text>
                  <Text style={[styles.cardSubtitle, { color: theme.colors.textMuted }]}>
                    {t("moskitki.calculator.subtitle")}
                  </Text>
                </View>
              </View>

              <View style={styles.fieldGrid}>
                <View style={styles.field}>
                  <RangeField
                    label={t("moskitki.calculator.fields.width")}
                    value={screenWidth}
                    onChangeText={(value) => setScreenWidth(sanitizeNumericInput(value))}
                    min={WIDTH_MIN_MM}
                    max={WIDTH_MAX_MM}
                    step={10}
                    unit={dimensionUnit}
                  />
                  {widthError ? (
                    <Text style={[styles.fieldFeedback, styles.fieldFeedbackError, { color: theme.colors.danger }]}>
                      {widthError}
                    </Text>
                  ) : (
                    <Text style={[styles.fieldFeedback, { color: theme.colors.textMuted }]}>
                      {t("moskitki.calculator.helpers.width")}
                    </Text>
                  )}
                </View>
                <View style={styles.field}>
                  <RangeField
                    label={t("moskitki.calculator.fields.height")}
                    value={screenHeight}
                    onChangeText={(value) => setScreenHeight(sanitizeNumericInput(value))}
                    min={HEIGHT_MIN_MM}
                    max={HEIGHT_MAX_MM}
                    step={10}
                    unit={dimensionUnit}
                  />
                  {heightError ? (
                    <Text style={[styles.fieldFeedback, styles.fieldFeedbackError, { color: theme.colors.danger }]}>
                      {heightError}
                    </Text>
                  ) : (
                    <Text style={[styles.fieldFeedback, { color: theme.colors.textMuted }]}>
                      {t("moskitki.calculator.helpers.height")}
                    </Text>
                  )}
                </View>
                <TextField
                  label={t("moskitki.calculator.fields.quantity")}
                  value={quantity}
                  onChangeText={(value) => setQuantity(sanitizeNumericInput(value, 3))}
                  keyboardType="numeric"
                  inputMode="numeric"
                  helperText={t("moskitki.calculator.helpers.quantity")}
                  errorText={quantityError}
                  containerStyle={styles.field}
                />
              </View>

              <View style={[styles.summaryBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}>
                <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>{t("moskitki.calculator.summaryTitle")}</Text>

                {calculation ? (
                  <View style={styles.summaryRows}>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
                        {t("moskitki.calculator.sizeLabel")}
                      </Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                        {`${calculation.width} x ${calculation.height} мм`}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
                        {t("moskitki.calculator.areaLabel")}
                      </Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                        {`${calculation.areaM2.toLocaleString(areaLocale, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} м²`}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.colors.textMuted }]}>
                        {t("moskitki.calculator.pricePerItemLabel")}
                      </Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                        {formatMoney(calculation.pricePerItem, currency)}
                      </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                      <Text style={[styles.summaryTotalLabel, { color: theme.colors.text }]}>
                        {t("moskitki.calculator.totalLabel")}
                      </Text>
                      <Text style={[styles.summaryTotalValue, { color: theme.colors.primary }]}>
                        {formatMoney(calculation.totalPrice, currency)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <Text style={[styles.summaryNote, { color: theme.colors.textMuted }]}>{t("moskitki.calculator.note")}</Text>

                <PrimaryButton
                  title={t("moskitki.cart.addButton")}
                  onPress={onAddToCart}
                  disabled={!calculation}
                  leftSlot={<Ionicons name="cart-outline" size={18} color="#FFFFFF" />}
                />
              </View>
            </Card>
          </View>

          <SiteFooter gutter={gutter} />
        </View>
      </AppScrollView>
    </ScreenContainer>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>, isWideLayout: boolean): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    scroll: {
      flexGrow: 1
    },
    content: {
      width: "100%",
      maxWidth: 1020,
      alignSelf: "center",
      gap: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: 0
    },
    headerWrap: {
      gap: spacing.xs
    },
    eyebrow: {
      ...font(800),
      fontSize: 12,
      lineHeight: 16,
      textTransform: "uppercase"
    },
    topGrid: {
      flexDirection: isWideLayout ? "row" : "column",
      gap: spacing.md,
      alignItems: "stretch"
    },
    visualCard: {
      flex: isWideLayout ? 0.92 : undefined,
      overflow: "hidden"
    },
    visualStage: {
      flex: 1,
      minHeight: isWideLayout ? 456 : 360,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      justifyContent: "center"
    },
    previewScene: {
      width: "100%",
      flex: 1,
      minHeight: isWideLayout ? 420 : 328,
      borderRadius: 8,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center"
    },
    previewBackdrop: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 8,
      borderWidth: 1
    },
    previewFrameOuter: {
      position: "relative",
      borderWidth: 1,
      borderRadius: 8,
      overflow: "hidden",
      minWidth: 72,
      padding: 10
    },
    previewFrameInner: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 6,
      padding: 9,
      overflow: "hidden"
    },
    previewMeshField: {
      flex: 1,
      borderRadius: 4,
      overflow: "hidden",
      borderWidth: 1
    },
    previewMeshSheen: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "20%"
    },
    previewMeshTexture: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.85
    },
    previewMeshTextureSecondary: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.62
    },
    previewLineVertical: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 1.4
    },
    previewLineHorizontal: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 1.4
    },
    previewLineVerticalSoft: {
      position: "absolute",
      top: 0,
      bottom: 0,
      width: 0.7
    },
    previewLineHorizontalSoft: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 0.7
    },
    calculatorCard: {
      flex: 1,
      gap: spacing.md
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm
    },
    cardHeaderIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center"
    },
    cardHeaderCopy: {
      flex: 1,
      minWidth: 0,
      gap: 4
    },
    cardTitle: {
      ...font(900),
      fontSize: 18,
      lineHeight: 24
    },
    cardSubtitle: {
      ...theme.typography.caption
    },
    fieldGrid: {
      gap: spacing.sm
    },
    field: {
      gap: spacing.xs
    },
    fieldFeedback: {
      ...theme.typography.caption
    },
    fieldFeedbackError: {
      color: theme.colors.danger
    },
    summaryBox: {
      borderWidth: 1,
      borderRadius: 12,
      padding: spacing.md,
      gap: spacing.sm
    },
    summaryTitle: {
      ...font(800),
      fontSize: 16,
      lineHeight: 22
    },
    summaryRows: {
      gap: spacing.xs
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md
    },
    summaryRowTotal: {
      paddingTop: spacing.xs,
      marginTop: 2,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border
    },
    summaryLabel: {
      ...theme.typography.caption,
      flex: 1
    },
    summaryValue: {
      ...font(800),
      fontSize: 14,
      lineHeight: 20,
      textAlign: "right"
    },
    summaryTotalLabel: {
      ...font(900),
      fontSize: 15,
      lineHeight: 20,
      flex: 1
    },
    summaryTotalValue: {
      ...font(900),
      fontSize: 22,
      lineHeight: 28,
      textAlign: "right"
    },
    summaryNote: {
      ...theme.typography.caption
    }
  });
}
