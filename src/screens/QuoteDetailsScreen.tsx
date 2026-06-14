import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { type ComponentProps, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScrollView } from "../components/AppScrollView";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PriceBreakdownList } from "../components/PriceBreakdownList";
import { ScreenContainer } from "../components/ScreenContainer";
import { SectionTabs } from "../components/SectionTabs";
import { SiteFooter } from "../components/SiteFooter";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../services/auth-context";
import { fetchQuoteById, QuoteDetails, QuoteItemDetails } from "../services/quotes";
import { font } from "../theme/font";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/tokens";
import { formatMoney } from "../utils/money";
import { useTranslation } from "react-i18next";
import { ICON_SIZE, calculatorSectionIcon } from "../theme/iconography";

type Route = RouteProp<RootStackParamList, "QuoteDetails">;
type IoniconName = ComponentProps<typeof Ionicons>["name"];
type DetailTabKey =
  | "summary"
  | "contact"
  | "address"
  | "dimensions"
  | "construction"
  | "entrance"
  | "profile"
  | "glazing"
  | "design"
  | "extras"
  | "services"
  | "calculation";

type QuoteCalcInput = {
  width?: number;
  height?: number;
  quantity?: number;
  productType?: string;
  options?: string[];
  windowSillWidthCm?: number;
  dripEdgeWidthCm?: number;

  profileModel?: string;
  profileSeries?: string;
  profileDepthMm?: number;
  glazing?: string;
  glassOptions?: {
    energySaving?: boolean;
    multiFunctional?: boolean;
  };
  lamination?: string;
  laminationGroup?: string;
  laminationSide?: string;
  laminationColor?: string;
  decorBarsColor?: string;

  sashCount?: number;
  openingSashes?: number;
  openingType?: string;
  sashes?: Array<{
    widthCm?: number;
    opening?: string;
    handleSide?: string;
  }>;

  doorSubtype?: string;
  doorHandleSide?: string;
  entranceOptions?: {
    fillType?: string;
    fillTop?: string;
    fillBottom?: string;
  };

  hardwareKey?: string;
  hardwareLabel?: string;

  services?: {
    installEnabled?: boolean;
    deliveryEnabled?: boolean;
    deliveryKm?: number;
  };
};

function toMillis(input: unknown): number | null {
  if (!input) return null;
  if (typeof input === "object") {
    const v = input as { toMillis?: () => number; seconds?: number };
    if (typeof v.toMillis === "function") return v.toMillis();
    if (typeof v.seconds === "number") return v.seconds * 1000;
  }
  if (typeof input === "string") {
    const parsed = Date.parse(input);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatIsoDate(iso: string | null, lang: "ru" | "en"): string {
  if (!iso) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  const y = m[1];
  const mo = m[2];
  const d = m[3];
  return lang === "ru" ? `${d}.${mo}.${y}` : `${y}-${mo}-${d}`;
}

function truthyLabel(value: unknown, yes: string, no: string): string {
  return value ? yes : no;
}

function pickOptionLabelKey(optionKey: string): string | null {
  const key = optionKey.trim().toLowerCase();
  const map: Record<string, string> = {
    mosquito_net: "calculator.extras.mosquitoNet",
    window_sill: "calculator.extras.windowSill",
    drip_edge: "calculator.extras.dripEdge",
    casing: "calculator.extras.casing",
    child_lock: "calculator.extras.childLock",
    decor_bars: "calculator.extras.decorBars",
    triplex: "calculator.extras.triplex",
    tinted_glass: "calculator.extras.tintedGlass",
    vent_valve: "calculator.extras.ventValve",
    door_closer: "calculator.extras.doorCloser",
    peephole: "calculator.extras.peephole",
    reinforced_hinges: "calculator.extras.reinforcedHinges",
    warm_install: "calculator.extras.warmInstall",
    trash_removal: "calculator.extras.trashRemoval"
  };
  return map[key] ?? null;
}

function FieldRow({
  label,
  value,
  mono,
  showDivider,
  valueStyle,
}: {
  label: string;
  value: string;
  mono?: boolean;
  showDivider?: boolean;
  valueStyle?: any;
}): JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.row,
        showDivider ? { borderBottomColor: theme.colors.border, borderBottomWidth: 1 } : null,
      ]}
    >
      <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
      <Text
        style={[
          mono ? theme.typography.mono : styles.rowValue,
          { color: theme.colors.text },
          valueStyle,
        ]}
        numberOfLines={3}
      >
        {value}
      </Text>
    </View>
  );
}

function Chip({ text }: { text: string }): JSX.Element {
  const theme = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }]}>
      <Text style={[styles.chipText, { color: theme.colors.text }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function getStatusLabel(t: (key: string, opts?: any) => string, code: string): string {
  const normalized = (code || "").trim().toUpperCase();
  if (!normalized) return "-";
  return t(`quotes.statuses.${normalized}`, { defaultValue: normalized });
}

function isMoskitkiQuoteItem(item: QuoteItemDetails | null | undefined): boolean {
  return Boolean(item && (item.kind === "moskitki" || item.customItem?.type === "moskitki"));
}

function formatStoredQuoteItemLabel(item: QuoteItemDetails, t: (key: string, opts?: any) => string): string {
  if (isMoskitkiQuoteItem(item)) {
    const title = item.customItem?.title?.trim() || t("moskitki.cart.itemTitle");
    const widthMm = typeof item.customItem?.widthMm === "number" ? Math.max(0, Math.round(item.customItem.widthMm)) : null;
    const heightMm = typeof item.customItem?.heightMm === "number" ? Math.max(0, Math.round(item.customItem.heightMm)) : null;
    const quantity = typeof item.customItem?.quantity === "number" ? Math.max(1, Math.round(item.customItem.quantity)) : 1;
    const sizeLabel = widthMm && heightMm ? `${widthMm}x${heightMm} мм` : "-";
    return `${title} · ${sizeLabel} · x${quantity}`;
  }

  const input = item.calcInput;
  const kind = input?.productType === "door" ? t("calculator.types.door") : t("calculator.types.window");
  const widthCm = typeof input?.width === "number" && Number.isFinite(input.width) ? Math.round(input.width * 100) : null;
  const heightCm = typeof input?.height === "number" && Number.isFinite(input.height) ? Math.round(input.height * 100) : null;
  const quantity = typeof input?.quantity === "number" && Number.isFinite(input.quantity) ? Math.max(1, Math.round(input.quantity)) : 1;
  const sizeLabel = widthCm && heightCm ? `${widthCm}x${heightCm} cm` : "-";
  return `${kind} · ${sizeLabel} · x${quantity}`;
}

export function QuoteDetailsScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<Route>();
  const quoteId = route.params.quoteId;
  const lang: "ru" | "en" = i18n.language?.toLowerCase().startsWith("ru") ? "ru" : "en";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["quote", quoteId],
    queryFn: () => fetchQuoteById(quoteId),
    enabled: Boolean(user && quoteId),
  });

  const stylesMemo = useMemo(() => makeStyles(theme), [theme]);
  const [activeTabKey, setActiveTabKey] = useState<DetailTabKey>("summary");

  if (!user) {
    return (
      <ScreenContainer>
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={22} color={theme.colors.primary} />}
          title={t("calculator.needAuth")}
          description={t("quotes.needAuthHint")}
        />
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={stylesMemo.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[stylesMemo.centerText, { color: theme.colors.textMuted }]}>{t("common.loading")}</Text>
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
          title={t("quotes.details.notFound")}
          description={t("quotes.details.notFoundHint")}
          actionTitle={t("common.back")}
          onAction={() => navigation.goBack()}
        />
      </ScreenContainer>
    );
  }

  const quote = data as QuoteDetails;
  const statusCode = String(quote.status || "").trim().toUpperCase();
  const statusLabel = getStatusLabel(t, statusCode);
  const isPreliminaryQuote = statusCode === "NEW" || statusCode === "IN_REVIEW";

  const createdMs = toMillis((quote as any).createdAt);
  const createdLabel = createdMs ? new Date(createdMs).toLocaleString(lang === "ru" ? "ru-RU" : "en-US") : "-";

  const total = typeof quote.totalPrice === "number" ? quote.totalPrice : quote.calcResult?.total ?? 0;
  const currency = quote.currency ?? quote.calcResult?.currency ?? "RUB";
  const quoteItems = Array.isArray(quote.items) ? quote.items : [];
  const isMoskitkiOnly = quoteItems.length > 0 && quoteItems.every((item) => isMoskitkiQuoteItem(item)) && !quote.calcInput;
  const itemsCount =
    typeof quote.itemsCount === "number" && Number.isFinite(quote.itemsCount)
      ? Math.max(1, Math.round(quote.itemsCount))
      : quoteItems.length
        ? quoteItems.length
        : 1;
  const itemsSubtotal =
    typeof quote.itemsSubtotal === "number" && Number.isFinite(quote.itemsSubtotal)
      ? quote.itemsSubtotal
      : quote.calcResult?.subtotal ?? total;
  const discountAmount = quote.calcResult?.discount ?? (itemsSubtotal > total ? itemsSubtotal - total : 0);
  const hasPromoDiscount = discountAmount > 0;

  const calcInput = (quote.calcInput ?? {}) as QuoteCalcInput;
  const calcDto = quote.calcResult?.calcDto;
  const breakdown = quote.calcResult?.breakdown ?? calcDto?.pricing.breakdown ?? null;
  const widthCm = typeof calcInput.width === "number" ? Math.round(calcInput.width * 100) : null;
  const heightCm = typeof calcInput.height === "number" ? Math.round(calcInput.height * 100) : null;

  const sashesFromDto =
    calcInput.productType === "window" && calcDto
      ? calcDto.sections
          .map((sec) => {
            const secW = typeof sec?.secW_mm === "number" ? sec.secW_mm : null;
            if (!secW || !Number.isFinite(secW) || secW <= 0) return null;
            const widthCm = Math.max(1, Math.round(secW / 10));

            const opening: "fixed" | "turn" | "tiltTurn" =
              sec.kind === "sash" ? (sec.openType === "turn" ? "turn" : "tiltTurn") : "fixed";

            const handleSide =
              sec.kind === "sash" && (sec.handleSide === "left" || sec.handleSide === "right") ? sec.handleSide : null;

            return {
              widthCm,
              opening,
              ...(opening !== "fixed" && handleSide ? { handleSide } : {}),
            };
          })
          .filter(
            (v): v is { widthCm: number; opening: "fixed" | "turn" | "tiltTurn"; handleSide?: "left" | "right" } => Boolean(v)
          )
      : null;

  const sashesFromInput = Array.isArray(calcInput.sashes)
    ? calcInput.sashes
        .map((item) => {
          const width = typeof item?.widthCm === "number" ? Math.round(item.widthCm) : null;
          const openingRaw = typeof item?.opening === "string" ? item.opening.trim() : "";
          const opening = openingRaw === "turn" || openingRaw === "tiltTurn" ? openingRaw : "fixed";
          const handleSideRaw = typeof item?.handleSide === "string" ? item.handleSide.trim().toLowerCase() : "";
          const handleSide = handleSideRaw === "left" || handleSideRaw === "right" ? handleSideRaw : null;
          if (!width || width <= 0) return null;
          return {
            widthCm: width,
            opening,
            ...(opening !== "fixed" && handleSide ? { handleSide } : {}),
          };
        })
        .filter(
          (v): v is { widthCm: number; opening: "fixed" | "turn" | "tiltTurn"; handleSide?: "left" | "right" } => Boolean(v)
        )
    : null;

  const sashes = sashesFromDto?.length ? sashesFromDto : sashesFromInput;

  const derivedSashCount =
    sashes?.length ?? (typeof calcInput.sashCount === "number" ? Math.round(calcInput.sashCount) : null);

  const derivedOpeningSashes =
    sashes
      ? sashes.reduce((acc, s) => acc + (s.opening === "fixed" ? 0 : 1), 0)
      : typeof calcInput.openingSashes === "number"
        ? Math.round(calcInput.openingSashes)
        : null;

  const doorHandleSideRaw = typeof calcInput.doorHandleSide === "string" ? calcInput.doorHandleSide.trim().toLowerCase() : "";
  const doorHandleSide = doorHandleSideRaw === "left" || doorHandleSideRaw === "right" ? doorHandleSideRaw : null;

  const derivedOpeningTypeLabel = (() => {
    if (!derivedOpeningSashes || derivedOpeningSashes <= 0) return "-";
    if (!sashes) {
      const openingType = typeof calcInput.openingType === "string" ? calcInput.openingType.trim() : "";
      return openingType ? t(`calculator.openingTypes.${openingType}`, { defaultValue: openingType }) : "-";
    }
    const set = new Set(sashes.map((s) => s.opening).filter((o) => o === "turn" || o === "tiltTurn"));
    if (set.size === 1) {
      const type = Array.from(set)[0];
      return t(`calculator.openingTypes.${type}`);
    }
    return t("calculator.openingTypes.mixed");
  })();

  const meetingPairActive = calcInput.productType === "window" && (calcDto?.derived.meetingPairKitCount ?? 0) > 0;

  const hardwareKeyRaw = typeof calcInput.hardwareKey === "string" ? calcInput.hardwareKey.trim() : "";
  const hardwareKey = hardwareKeyRaw.toLowerCase();
  const hardwareLabel = typeof calcInput.hardwareLabel === "string" ? calcInput.hardwareLabel.trim() : "";
  const hardwareValue = hardwareLabel || hardwareKeyRaw || "";

  const optionKeys: string[] = Array.isArray(calcInput.options) ? calcInput.options : [];
  const normalizedOptions = optionKeys.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
  const windowSillWidthValue =
    typeof calcInput.windowSillWidthCm === "number" && Number.isFinite(calcInput.windowSillWidthCm)
      ? Math.round(calcInput.windowSillWidthCm)
      : null;
  const dripEdgeWidthValue =
    typeof calcInput.dripEdgeWidthCm === "number" && Number.isFinite(calcInput.dripEdgeWidthCm)
      ? Math.round(calcInput.dripEdgeWidthCm)
      : null;
  const hasDecorBars = normalizedOptions.includes("decor_bars");
  const hasTriplex = normalizedOptions.includes("triplex");
  const showDesignExtras = calcInput.productType === "window" || hasDecorBars || hasTriplex;

  const extraOptionLabels = normalizedOptions
    .filter((key) => key !== "decor_bars" && key !== "triplex" && (!hardwareKey || key !== hardwareKey))
    .map((key) => {
      const tk = pickOptionLabelKey(key);
      const base = tk ? t(tk) : key;
      if (key === "window_sill" && windowSillWidthValue) return `${base} (${windowSillWidthValue} cm)`;
      if (key === "drip_edge" && dripEdgeWidthValue) return `${base} (${dripEdgeWidthValue} cm)`;
      return base;
    })
    .filter((v) => typeof v === "string" && v.trim().length > 0);

  const hasEntranceOptions = Boolean(calcInput.entranceOptions);

  const yes = t("common.yes");
  const no = t("common.no");
  const decorBarsColorRaw = typeof calcInput.decorBarsColor === "string" ? calcInput.decorBarsColor.trim().toLowerCase() : "";
  const decorBarsColorKey =
    decorBarsColorRaw === "gold" || decorBarsColorRaw === "white" || decorBarsColorRaw === "brown"
      ? decorBarsColorRaw
      : null;
  const decorBarsColorLabel = decorBarsColorKey ? t(`common.colors.${decorBarsColorKey}`) : "";
  const decorBarsValueLabel = hasDecorBars ? (decorBarsColorLabel ? `${yes} (${decorBarsColorLabel})` : yes) : no;

  const hasServices = Boolean(calcInput.services);
  const installEnabled = Boolean(calcInput.services?.installEnabled);
  const deliveryEnabled = Boolean(calcInput.services?.deliveryEnabled);
  const deliveryKm = typeof calcInput.services?.deliveryKm === "number" ? calcInput.services.deliveryKm : 0;

  const detailTabs: Array<{ key: DetailTabKey; label: string; icon: IoniconName }> = isMoskitkiOnly
    ? [
        { key: "summary", label: t("quotes.details.summary"), icon: "receipt-outline" },
        { key: "contact", label: t("calculator.sectionContact"), icon: calculatorSectionIcon.contact },
        { key: "address", label: t("calculator.sectionAddress"), icon: calculatorSectionIcon.address },
        { key: "dimensions", label: t("calculator.sectionDimensions"), icon: calculatorSectionIcon.dimensions },
        { key: "calculation", label: t("quotes.details.calculation"), icon: "calculator-outline" },
      ]
    : [
        { key: "summary", label: t("quotes.details.summary"), icon: "receipt-outline" },
        { key: "contact", label: t("calculator.sectionContact"), icon: calculatorSectionIcon.contact },
        { key: "address", label: t("calculator.sectionAddress"), icon: calculatorSectionIcon.address },
        { key: "dimensions", label: t("calculator.sectionDimensions"), icon: calculatorSectionIcon.dimensions },
        { key: "construction", label: t("calculator.sectionConstruction"), icon: calculatorSectionIcon.construction },
        ...(hasEntranceOptions
          ? [{ key: "entrance" as const, label: t("calculator.sectionEntrance"), icon: calculatorSectionIcon.entrance }]
          : []),
        { key: "profile", label: t("calculator.sectionProfile"), icon: calculatorSectionIcon.profile },
        { key: "glazing", label: t("calculator.sectionGlazing"), icon: calculatorSectionIcon.glazing },
        { key: "design", label: t("calculator.sectionDesign"), icon: calculatorSectionIcon.design },
        { key: "extras", label: t("calculator.sectionExtras"), icon: calculatorSectionIcon.extras },
        { key: "services", label: t("calculator.sectionServices"), icon: calculatorSectionIcon.services },
        { key: "calculation", label: t("quotes.details.calculation"), icon: "calculator-outline" },
      ];

  const resolvedActiveTabKey = detailTabs.some((tab) => tab.key === activeTabKey) ? activeTabKey : "summary";

  const renderActiveTabPanel = (tabKey: DetailTabKey): JSX.Element => {
    switch (tabKey) {
      case "summary":
        return (
          <View style={stylesMemo.sectionBody}>
            <FieldRow label={t("quotes.details.fields.status")} value={statusLabel} showDivider />
            <FieldRow
              label={t("calculator.itemsCountLabel", { defaultValue: "Позиции" })}
              value={String(itemsCount)}
              showDivider
            />
<FieldRow
              label={t("quotes.details.fields.subtotal", { defaultValue: "Подытог" })}
              value={formatMoney(itemsSubtotal, currency)}
              showDivider
              valueStyle={hasPromoDiscount ? { textDecorationLine: "line-through", color: theme.colors.textMuted } : undefined}
            />
            {hasPromoDiscount ? (
              <FieldRow
                label={t("calculator.discountLabel", { defaultValue: "Скидка" })}
                value={`−${formatMoney(discountAmount, currency)}`}
                showDivider
                valueStyle={{ color: "#E53935" }}
              />
            ) : null}
            <View
              style={[
                styles.row,
                { borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
              ]}
            >
              <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]} numberOfLines={2}>
                {t("quotes.details.fields.total")}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1, justifyContent: "flex-end" }}>
                {hasPromoDiscount ? (
                  <Text style={[styles.rowValue, { color: theme.colors.textMuted, textDecorationLine: "line-through" }]}>
                    {formatMoney(itemsSubtotal, currency)}
                  </Text>
                ) : null}
                <Text style={[styles.rowValue, { color: theme.colors.text }]}>
                  {formatMoney(total, currency)}
                </Text>
              </View>
            </View>
            {hasPromoDiscount ? (
              <FieldRow
                label={t("calculator.discountLabel", { defaultValue: "Скидка" })}
                value={`−${formatMoney(discountAmount, currency)}`}
                showDivider
                valueStyle={{ color: "#E53935" }}
              />
            ) : null}
            <FieldRow
              label={t("quotes.details.fields.total")}
              value={hasPromoDiscount ? `${formatMoney(itemsSubtotal, currency)} ${formatMoney(total, currency)}` : formatMoney(total, currency)}
              showDivider
              valueStyle={hasPromoDiscount ? undefined : undefined}
            />
            <FieldRow label={t("quotes.details.fields.created")} value={createdLabel} showDivider />
            {quote.promoCode ? (
              <FieldRow label={t("quotes.details.fields.promoCode")} value={String(quote.promoCode)} mono showDivider={quoteItems.length > 0} />
            ) : (
              <FieldRow label={t("quotes.details.fields.promoCode")} value="-" showDivider={quoteItems.length > 0} />
            )}
            {quoteItems.length ? (
              <View style={{ marginTop: spacing.sm }}>
                {quoteItems.map((item, index) => (
                  <FieldRow
                    key={item.id ?? `quote-item-${index}`}
                    label={`${index + 1}.`}
                    value={formatStoredQuoteItemLabel(item, t)}
                    showDivider={index < quoteItems.length - 1}
                  />
                ))}
              </View>
            ) : null}
            {isPreliminaryQuote ? (
              <Text style={[stylesMemo.muted, { color: theme.colors.textMuted }]}>{t("quotes.details.preliminaryHint")}</Text>
            ) : null}
          </View>
        );

      case "contact":
        return (
          <View style={stylesMemo.sectionBody}>
            <FieldRow label={t("account.name")} value={quote.contact?.name ? String(quote.contact.name) : "-"} showDivider />
            <FieldRow label={t("account.phone")} value={quote.contact?.phone ? String(quote.contact.phone) : "-"} />
          </View>
        );

      case "address":
        return (
          <View style={stylesMemo.sectionBody}>
            <FieldRow label={t("calculator.address")} value={quote.address?.trim() ? String(quote.address) : "-"} />
          </View>
        );

      case "dimensions":
        if (isMoskitkiOnly) {
          return (
            <View style={stylesMemo.sectionBody}>
              {quoteItems.map((item, index) => (
                <FieldRow
                  key={item.id ?? `moskitki-item-${index}`}
                  label={`${index + 1}. ${item.customItem?.title?.trim() || t("moskitki.cart.itemTitle")}`}
                  value={formatStoredQuoteItemLabel(item, t)}
                  showDivider={index < quoteItems.length - 1}
                />
              ))}
            </View>
          );
        }

        return (
          <View style={stylesMemo.sectionBody}>
            <FieldRow label={t("calculator.width")} value={widthCm !== null ? `${widthCm} cm` : "-"} showDivider />
            <FieldRow label={t("calculator.height")} value={heightCm !== null ? `${heightCm} cm` : "-"} showDivider />
            <FieldRow
              label={t("calculator.quantity")}
              value={typeof calcInput.quantity === "number" ? String(calcInput.quantity) : "-"}
            />
          </View>
        );

      case "construction":
        return (
          <View style={stylesMemo.sectionBody}>
            <FieldRow
              label={t("calculator.productType")}
              value={
                calcInput.productType === "door"
                  ? t("calculator.types.door")
                  : calcInput.productType === "window"
                    ? t("calculator.types.window")
                    : "-"
              }
              showDivider
            />

            {calcInput.productType === "door" ? (
              <FieldRow
                label={t("calculator.doorSubtype")}
                value={
                  calcInput.doorSubtype
                    ? t(`calculator.doorSubtypes.${calcInput.doorSubtype}`, { defaultValue: String(calcInput.doorSubtype) })
                    : "-"
                }
                showDivider
              />
            ) : null}

            {calcInput.productType === "door" && doorHandleSide && derivedOpeningSashes && derivedOpeningSashes > 0 ? (
              <FieldRow
                label={t("calculator.handleSide")}
                value={t(`calculator.handleSides.${doorHandleSide}`)}
                showDivider
              />
            ) : null}

            <FieldRow
              label={t("calculator.sashCount")}
              value={derivedSashCount !== null ? String(derivedSashCount) : "-"}
              showDivider
            />
            <FieldRow
              label={t("calculator.openingSashes")}
              value={derivedOpeningSashes !== null ? String(derivedOpeningSashes) : "-"}
              showDivider
            />
            <FieldRow
              label={t("calculator.openingType")}
              value={derivedOpeningTypeLabel}
              showDivider={meetingPairActive || Boolean(hardwareValue) || Boolean(sashes?.length)}
            />

            {meetingPairActive ? (
              <FieldRow
                label={t("calculator.meetingPairNoMullion")}
                value={t("common.yes")}
                showDivider={Boolean(hardwareValue) || Boolean(sashes?.length)}
              />
            ) : null}

            {hardwareValue ? (
              <FieldRow
                label={t("calculator.hardware")}
                value={hardwareValue}
                showDivider={Boolean(sashes?.length)}
              />
            ) : null}

            {sashes?.length ? (
              <View style={{ marginTop: spacing.sm }}>
                {sashes.map((sash, idx) => {
                  const openingLabel =
                    sash.opening === "fixed"
                      ? t("calculator.openingTypes.fixed")
                      : t(`calculator.openingTypes.${sash.opening}`);
                  const handleSideLabel =
                    sash.opening !== "fixed" && sash.handleSide
                      ? t(`calculator.handleSides.${sash.handleSide}`)
                      : null;
                  const sashValue = handleSideLabel
                    ? `${sash.widthCm} cm · ${openingLabel} · ${handleSideLabel}`
                    : `${sash.widthCm} cm · ${openingLabel}`;
                  return (
                    <FieldRow
                      key={`sash-${idx}`}
                      label={t("calculator.sashLabel", { index: idx + 1 })}
                      value={sashValue}
                      showDivider={idx < sashes.length - 1}
                    />
                  );
                })}
              </View>
            ) : null}
          </View>
        );

      case "entrance":
        return (
          <View style={stylesMemo.sectionBody}>
            <FieldRow
              label={t("calculator.entrance.fillTop", { defaultValue: t("calculator.entrance.fillType") })}
              value={
                calcInput.entranceOptions?.fillTop || calcInput.entranceOptions?.fillType
                  ? t(`calculator.entrance.fillTypes.${calcInput.entranceOptions?.fillTop ?? calcInput.entranceOptions?.fillType}`, {
                      defaultValue: String(calcInput.entranceOptions?.fillTop ?? calcInput.entranceOptions?.fillType),
                    })
                  : "-"
              }
              showDivider
            />
            <FieldRow
              label={t("calculator.entrance.fillBottom", { defaultValue: t("calculator.entrance.fillType") })}
              value={
                calcInput.entranceOptions?.fillBottom || calcInput.entranceOptions?.fillType
                  ? t(`calculator.entrance.fillTypes.${calcInput.entranceOptions?.fillBottom ?? calcInput.entranceOptions?.fillType}`, {
                      defaultValue: String(calcInput.entranceOptions?.fillBottom ?? calcInput.entranceOptions?.fillType),
                    })
                  : "-"
              }
              showDivider
            />
          </View>
        );

      case "profile":
        return (
          <View style={stylesMemo.sectionBody}>
            <FieldRow
              label={t("calculator.profileSeries")}
              value={
                calcInput.profileModel
                  ? t(`calculator.profileModels.${calcInput.profileModel}`, { defaultValue: String(calcInput.profileModel) })
                  : calcInput.profileSeries
                  ? t(`calculator.profileSeriesOptions.${calcInput.profileSeries}`, { defaultValue: String(calcInput.profileSeries) })
                  : "-"
              }
              showDivider
            />
            <FieldRow
              label={t("calculator.profileDepth")}
              value={
                typeof calcInput.profileDepthMm === "number"
                  ? `${calcInput.profileDepthMm === 82 ? 85 : calcInput.profileDepthMm} мм`
                  : "-"
              }
            />
          </View>
        );

      case "glazing":
        return (
          <View style={stylesMemo.sectionBody}>
            <FieldRow
              label={t("calculator.glazing")}
              value={
                calcInput.glazing
                  ? t(`calculator.glazingOptions.${calcInput.glazing}`, { defaultValue: String(calcInput.glazing) })
                  : "-"
              }
              showDivider
            />
            <FieldRow label={t("calculator.energySaving")} value={truthyLabel(calcInput.glassOptions?.energySaving, yes, no)} showDivider />
            <FieldRow label={t("calculator.multiFunctional")} value={truthyLabel(calcInput.glassOptions?.multiFunctional, yes, no)} />
          </View>
        );

      case "design":
        return (
          <View style={stylesMemo.sectionBody}>
            {(() => {
              const designLabel = (() => {
                const lamination = calcInput.lamination;
                if (!lamination || lamination === "none") return t("calculator.designOptions.none");
                if (lamination === "oneSide") {
                  const side = calcInput.laminationSide;
                  if (side === "inside") return t("calculator.designOptions.inside");
                  return t("calculator.designOptions.outside");
                }
                if (lamination === "twoSide") {
                  const group = calcInput.laminationGroup;
                  if (group === "color") return t("calculator.designOptions.twoSideColor");
                  if (group === "wood") return t("calculator.designOptions.twoSideWood");
                  return t("calculator.designOptions.twoSideWhite");
                }
                return "-";
              })();

              const rawColor = calcInput.laminationColor;
              const key = typeof rawColor === "string" ? rawColor.trim().toLowerCase() : "";
              const normalized =
                key === "gold_oak"
                  ? "goldOak"
                  : key === "grey_oak"
                    ? "greyOak"
                    : key === "dark_oak"
                      ? "darkOak"
                      : key === "other"
                        ? "other"
                        : "";
              const colorLabel = normalized ? t(`calculator.laminationColorOptions.${normalized}`) : typeof rawColor === "string" ? rawColor : "";
              const showColor = Boolean(colorLabel);

              return (
                <>
                  <FieldRow label={t("calculator.sectionDesign")} value={designLabel} showDivider={showColor || showDesignExtras} />
                  {showColor ? (
                    <FieldRow label={t("calculator.laminationColor")} value={colorLabel} showDivider={showDesignExtras} />
                  ) : null}
                </>
              );
            })()}

            {showDesignExtras ? (
              <>
                <FieldRow label={t("calculator.extras.decorBars")} value={decorBarsValueLabel} showDivider />
                <FieldRow label={t("calculator.extras.triplex")} value={truthyLabel(hasTriplex, yes, no)} />
              </>
            ) : null}
          </View>
        );

      case "extras":
        return (
          <View style={stylesMemo.sectionBody}>
            {extraOptionLabels.length ? (
              <View style={stylesMemo.chips}>
                {extraOptionLabels.map((label) => (
                  <Chip key={label} text={label} />
                ))}
              </View>
            ) : (
              <Text style={[stylesMemo.muted, { color: theme.colors.textMuted }]}>{t("quotes.details.noExtras")}</Text>
            )}
          </View>
        );

      case "services":
        return (
          <View style={stylesMemo.sectionBody}>
            <FieldRow label={t("calculator.install")} value={truthyLabel(installEnabled, yes, no)} showDivider />
            <FieldRow label={t("calculator.delivery")} value={truthyLabel(deliveryEnabled, yes, no)} showDivider />
            <FieldRow label={t("calculator.deliveryKm")} value={deliveryEnabled ? `${deliveryKm}` : "-"} />
            {!hasServices ? (
              <Text style={[stylesMemo.muted, { color: theme.colors.textMuted }]}>{t("quotes.details.servicesHint")}</Text>
            ) : null}
          </View>
        );

      case "calculation":
      default:
        return (
          <View style={stylesMemo.sectionBody}>
            <FieldRow
              label={t("quotes.details.fields.subtotal")}
              value={formatMoney(quote.calcResult?.subtotal ?? total, currency)}
              showDivider
              valueStyle={hasPromoDiscount ? { textDecorationLine: "line-through", color: theme.colors.textMuted } : undefined}
            />
            <FieldRow
              label={t("quotes.details.fields.discount")}
              value={`−${formatMoney(discountAmount, currency)}`}
              showDivider
              valueStyle={{ color: "#E53935" }}
            />
            <View
              style={[
                styles.row,
                { borderBottomColor: theme.colors.border, borderBottomWidth: isMoskitkiOnly && quoteItems.length > 0 ? 1 : 0 },
              ]}
            >
              <Text style={[styles.rowLabel, { color: theme.colors.textMuted }]} numberOfLines={2}>
                {t("quotes.details.fields.total")}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, flex: 1, justifyContent: "flex-end" }}>
                {hasPromoDiscount ? (
                  <Text style={[styles.rowValue, { color: theme.colors.textMuted, textDecorationLine: "line-through" }]}>
                    {formatMoney(quote.calcResult?.subtotal ?? total, currency)}
                  </Text>
                ) : null}
                <Text style={[styles.rowValue, { color: theme.colors.text }]}>
                  {formatMoney(total, currency)}
                </Text>
              </View>
            </View>
            {isMoskitkiOnly && quoteItems.length ? (
              <View style={{ marginTop: spacing.sm }}>
                {quoteItems.map((item, index) => {
                  const quantity = typeof item.customItem?.quantity === "number" ? Math.max(1, Math.round(item.customItem.quantity)) : 1;
                  const pricePerItem = typeof item.customItem?.pricePerItem === "number" ? item.customItem.pricePerItem : 0;
                  const lineTotal =
                    typeof item.positionTotal === "number" ? item.positionTotal : Math.round(pricePerItem * quantity * 100) / 100;

                  return (
                    <FieldRow
                      key={item.id ?? `moskitki-price-${index}`}
                      label={`${index + 1}. ${item.customItem?.title?.trim() || t("moskitki.cart.itemTitle")}`}
                      value={`${formatMoney(pricePerItem, currency)} x ${quantity} = ${formatMoney(lineTotal, currency)}`}
                      showDivider={index < quoteItems.length - 1}
                    />
                  );
                })}
              </View>
            ) : null}
            <PriceBreakdownList breakdown={breakdown} currency={currency} style={{ marginTop: spacing.sm }} />
            {isPreliminaryQuote ? (
              <Text style={[stylesMemo.muted, { color: theme.colors.textMuted }]}>{t("quotes.details.preliminaryHint")}</Text>
            ) : null}
          </View>
        );
    }
  };

  return (
    <ScreenContainer>
      <AppScrollView trackNavGlass contentContainerStyle={stylesMemo.container} keyboardShouldPersistTaps="handled">
        <View style={stylesMemo.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.goBack()}
            style={(state) => [stylesMemo.backPill, state.pressed ? stylesMemo.backPillPressed : null]}
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
            <Text style={stylesMemo.backText}>{t("common.back")}</Text>
          </Pressable>
        </View>

        <View style={stylesMemo.headerWrap}>
          <Text style={stylesMemo.title}>{t("quotes.details.title")}</Text>
          <Text style={stylesMemo.subtitle} numberOfLines={1}>
            #{quoteId}
          </Text>
        </View>

        <View style={stylesMemo.tabsBlock}>
          <SectionTabs items={detailTabs} value={resolvedActiveTabKey} onValueChange={setActiveTabKey} desktopSingleRow />
          <Card variant="solid">{renderActiveTabPanel(resolvedActiveTabKey)}</Card>
        </View>

          <SiteFooter gutter={spacing.md} />
	      </AppScrollView>
	    </ScreenContainer>
	  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: 10,
  },
  rowLabel: {
    flex: 1,
    ...font(700),
    fontSize: 12,
  },
  rowValue: {
    flex: 1,
    ...font(700),
    fontSize: 13,
    textAlign: "right",
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  chipText: {
    ...font(800),
    fontSize: 12,
  },
});

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      padding: spacing.md,
      paddingBottom: 0,
      gap: spacing.md,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.sm,
    },
    centerText: {
      fontSize: 14,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
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
      ...( { cursor: "pointer" } as object ),
    },
    backPillPressed: {
      opacity: 0.92,
    },
    backText: {
      ...font(800),
      fontSize: 13,
      color: theme.colors.text,
    },
    headerWrap: {
      gap: 2,
      marginBottom: 2,
    },
    tabsBlock: {
      gap: spacing.sm,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text,
    },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    sectionBody: {
      gap: 0,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    muted: {
      ...theme.typography.caption,
    },
  });
}
