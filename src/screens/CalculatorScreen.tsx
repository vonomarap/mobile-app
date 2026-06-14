import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { AppScrollView } from "../components/AppScrollView";
import { HelpIcon } from "../components/HelpIcon";
import { HelpModal } from "../components/HelpModal";
import { PriceBreakdownList } from "../components/PriceBreakdownList";
import { ProductPreview } from "../components/ProductPreview";
import { PromoBanners } from "../components/PromoBanners";
import { PickerField } from "../components/PickerField";
import { RangeField } from "../components/RangeField";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { SelectListModal, type SelectListOption } from "../components/SelectListModal";
import { SectionTabs } from "../components/SectionTabs";
import { SegmentedControl } from "../components/SegmentedControl";
import { SiteFooter } from "../components/SiteFooter";
import { StepperField } from "../components/StepperField";
import { SwitchField } from "../components/SwitchField";
import { RootStackParamList, type QuoteOrderItemDraft } from "../navigation/types";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ICON_SIZE, calculatorSectionIcon } from "../theme/iconography";
import { formatMoney } from "../utils/money";
import { useCurrencyControls } from "../services/currency-context";
import { useCart } from "../services/cart-context";
import { fetchCalcConfig } from "../services/calc-config";
import {
  CalcInput,
  calculateQuote,
  getDefaultCalcConfig,
  type GlassOptionsInput,
  type HandleSide,
  type LaminationColor,
  type SashOpening
} from "../utils/calc";
import { designPreview, glazingPreview, laminationColorPreview, profileDepthPreview, profileModelPreview } from "../assets/calc-previews";

function cloneCalcInput(input: CalcInput): CalcInput {
  return JSON.parse(JSON.stringify(input)) as CalcInput;
}

type ProfileCatalogItem = {
  key: string;
  label: string;
  brand: string;
  depthMm?: number;
  chambers?: number;
  thermalCoefficient?: string;
  description: string;
  legacySeries?: string;
  legacyDepthMm?: number;
};



export function CalculatorScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Calculator">>();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isWide = screenWidth >= 820;
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && screenWidth >= theme.layout.desktopNavMinWidth;
  const desktopContent = isDesktopWeb ? styles.desktopContent : null;
  const defaultUiCatalog = useMemo(() => getDefaultCalcConfig().uiCatalog ?? {}, []);

  type Toggle = "off" | "on";
  type SashCount = "1" | "2" | "3";
  type OpeningSashes = "0" | "1" | "2" | "3";
  type GlassOptionSelection = "none" | "energySaving" | "multiFunctional";
  type IoniconName = ComponentProps<typeof Ionicons>["name"];
  type DesignOption = "none" | "outside" | "inside" | "twoSideWhite" | "twoSideColor";
  type EditorKey = "dimensions" | "construction" | "profile" | "glazing" | "design" | "extras" | "summary";

  const presetProductType = route.params?.presetProductType;
  const [productType, setProductType] = useState<"window" | "door" | "balconyBlock">(() => presetProductType ?? "window");

  type CalcTab = "construction" | "profile" | "options" | "summary";
  const tabsList = useMemo<CalcTab[]>(() => {
    return ["construction", "profile", "options", "summary"];
  }, []);

  const [activeTab, setActiveTab] = useState<CalcTab>("construction");
  const activeEditorKey = activeTab === "options" ? "design" : activeTab;

  useFocusEffect(
    useCallback(() => {
      setActiveTab("construction");
    }, [])
  );

  const stepAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    stepAnimation.setValue(0);
    Animated.timing(stepAnimation, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const animatedStepStyle = {
    opacity: stepAnimation,
    transform: [
      {
        translateX: stepAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  const [width, setWidth] = useState("120");
  const [height, setHeight] = useState("140");
  const [quantity, setQuantity] = useState("1");

  const [doorSubtype, setDoorSubtype] = useState<"balcony" | "interior" | "entrance">("balcony");
  const [doorHandleSide, setDoorHandleSide] = useState<HandleSide>("right");

  const [sashCount, setSashCount] = useState<SashCount>("2");
  const [openingSashes, setOpeningSashes] = useState<OpeningSashes>("1");
  const [openingType, setOpeningType] = useState<"turn" | "tiltTurn">("tiltTurn");
  type WindowSashDraft = { widthCm: string; opening: SashOpening; handleSide?: HandleSide };
  const [windowSashes, setWindowSashes] = useState<WindowSashDraft[]>(() => {
    const total = Number(width);
    const count = Number(sashCount);
    const safeTotal = Number.isFinite(total) && total > 0 ? Math.round(total) : 120;
    const safeCount = count === 1 || count === 2 || count === 3 ? count : 2;
    const base = Math.floor(safeTotal / safeCount);
    const remainder = safeTotal - base * safeCount;
    return Array.from({ length: safeCount }).map((_, idx) => ({
      widthCm: String(base + (idx < remainder ? 1 : 0)),
      opening: idx === 0 ? "tiltTurn" : "fixed",
      handleSide: idx === 0 ? "right" : undefined,
    }));
  });
  const [activeSashIndex, setActiveSashIndex] = useState(0);
  const [windowMeetingPairNoMullion, setWindowMeetingPairNoMullion] = useState(false);
  const [profileModel, setProfileModel] = useState("kbe_expert_70");
  const [expandedProfileBrand, setExpandedProfileBrand] = useState<string | null>(null);

  const [glazing, setGlazing] = useState<"single" | "double">("double");
  const [selectedGlassOption, setSelectedGlassOption] = useState<GlassOptionSelection>("none");

  const [designOption, setDesignOption] = useState<DesignOption>("none");
  const [designPickerOpen, setDesignPickerOpen] = useState(false);
  const [designPickerMounted, setDesignPickerMounted] = useState(false);
  const [designPickerAnchorHeight, setDesignPickerAnchorHeight] = useState(0);
  const [designPickerRect, setDesignPickerRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const designDropdownAnchorRef = useRef<View | null>(null);
  const designPickerProgress = useRef(new Animated.Value(0)).current;
  const designPickerAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const [sashOpeningPickerOpen, setSashOpeningPickerOpen] = useState(false);
  const [sashOpeningPickerMounted, setSashOpeningPickerMounted] = useState(false);
  const [sashOpeningPickerSashIndex, setSashOpeningPickerSashIndex] = useState<number | null>(null);
  const [sashOpeningPickerRect, setSashOpeningPickerRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const sashOpeningPickerAnchorRefs = useRef<Array<View | null>>([]);
  const sashOpeningPickerProgress = useRef(new Animated.Value(0)).current;
  const sashOpeningPickerAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const [laminationColor, setLaminationColor] = useState<LaminationColor | null>(null);
  const lamination = designOption === "none" ? "none" : designOption === "outside" || designOption === "inside" ? "oneSide" : "twoSide";
  const laminationGroup =
    designOption === "twoSideColor" ? "color" : designOption === "twoSideWhite" ? "white" : undefined;
  const laminationSide =
    designOption === "inside" ? "inside" : designOption === "outside" ? "outside" : undefined;

  const [doorFillTop, setDoorFillTop] = useState<"glass" | "sandwich">("glass");
  const [doorFillBottom, setDoorFillBottom] = useState<"glass" | "sandwich">("sandwich");
  const [doorSubtypePickerOpen, setDoorSubtypePickerOpen] = useState(false);
  const [doorSubtypePickerMounted, setDoorSubtypePickerMounted] = useState(false);
  const [doorSubtypePickerAnchorHeight, setDoorSubtypePickerAnchorHeight] = useState(0);
  const [doorSubtypePickerRect, setDoorSubtypePickerRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const doorSubtypeDropdownAnchorRef = useRef<View | null>(null);
  const doorSubtypePickerProgress = useRef(new Animated.Value(0)).current;
  const doorSubtypePickerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const [doorFillPickerOpen, setDoorFillPickerOpen] = useState(false);
  const [doorFillPickerMounted, setDoorFillPickerMounted] = useState(false);
  const [doorFillPickerAnchorHeight, setDoorFillPickerAnchorHeight] = useState(0);
  const [doorFillPickerRect, setDoorFillPickerRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const doorFillDropdownAnchorRef = useRef<View | null>(null);
  const doorFillPickerProgress = useRef(new Animated.Value(0)).current;
  const doorFillPickerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const [productTypePickerOpen, setProductTypePickerOpen] = useState(false);
  const [productTypePickerMounted, setProductTypePickerMounted] = useState(false);
  const [productTypePickerAnchorHeight, setProductTypePickerAnchorHeight] = useState(0);
  const [productTypePickerRect, setProductTypePickerRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const productTypeDropdownAnchorRef = useRef<View | null>(null);
  const productTypePickerProgress = useRef(new Animated.Value(0)).current;
  const productTypePickerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const [glassOptionPickerOpen, setGlassOptionPickerOpen] = useState(false);
  const [glassOptionPickerMounted, setGlassOptionPickerMounted] = useState(false);
  const [glassOptionPickerAnchorHeight, setGlassOptionPickerAnchorHeight] = useState(0);
  const [glassOptionPickerRect, setGlassOptionPickerRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const glassOptionDropdownAnchorRef = useRef<View | null>(null);
  const glassOptionPickerProgress = useRef(new Animated.Value(0)).current;
  const glassOptionPickerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const [sashCountPickerOpen, setSashCountPickerOpen] = useState(false);
  const [sashCountPickerMounted, setSashCountPickerMounted] = useState(false);
  const [sashCountPickerAnchorHeight, setSashCountPickerAnchorHeight] = useState(0);
  const [sashCountPickerRect, setSashCountPickerRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const sashCountDropdownAnchorRef = useRef<View | null>(null);
  const sashCountPickerProgress = useRef(new Animated.Value(0)).current;
  const sashCountPickerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Extras
  const [mosquitoNet, setMosquitoNet] = useState<Toggle>("off");
  const [windowSill, setWindowSill] = useState<Toggle>("off");
  const [windowSillWidthCm, setWindowSillWidthCm] = useState("20");
  const [dripEdge, setDripEdge] = useState<Toggle>("off");
  const [dripEdgeWidthCm, setDripEdgeWidthCm] = useState<"6" | "9" | "11" | "13">("9");
  const [casing, setCasing] = useState<Toggle>("off");
  const [decorBars, setDecorBars] = useState<Toggle>("off");
  const [decorBarsColor, setDecorBarsColor] = useState<"white" | "gold" | "brown">("white");

  const orderItemSeqRef = useRef(1);
  const { items: orderItems, addItem } = useCart();
  const { currency } = useCurrencyControls();
  const [hasCalculated, setHasCalculated] = useState(false);
  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null);
  const [helpKey, setHelpKey] = useState<string | null>(null);

  const calcConfigQuery = useQuery({ queryKey: ["calc_config"], queryFn: fetchCalcConfig });

  const profileCatalog = useMemo<ProfileCatalogItem[]>(() => {
    const raw = calcConfigQuery.data?.uiCatalog?.profileModels ?? defaultUiCatalog.profileModels;
    if (!Array.isArray(raw)) return [];
    return raw
      .flatMap((item) => {
        const key = typeof item?.key === "string" ? item.key.trim().toLowerCase() : "";
        if (!key || item?.enabled === false) return [];
        const label =
          typeof item?.label === "string" && item.label.trim()
            ? item.label.trim()
            : t(`calculator.profileModels.${key}`, { defaultValue: key });
        return [{
          key,
          label,
          brand:
            typeof item?.brand === "string" && item.brand.trim()
              ? item.brand.trim()
              : label.split(" ")[0] ?? label,
          depthMm: typeof item?.depthMm === "number" ? item.depthMm : undefined,
          chambers: typeof item?.chambers === "number" ? item.chambers : undefined,
          thermalCoefficient:
            typeof item?.thermalCoefficient === "string" && item.thermalCoefficient.trim()
              ? item.thermalCoefficient.trim()
              : undefined,
          description: typeof item?.description === "string" ? item.description.trim() : "",
          legacySeries: typeof item?.legacySeries === "string" ? item.legacySeries.trim().toLowerCase() : undefined,
          legacyDepthMm: typeof item?.legacyDepthMm === "number" ? item.legacyDepthMm : undefined,
        }];
      })
  }, [calcConfigQuery.data?.uiCatalog?.profileModels, defaultUiCatalog.profileModels, t]);

  const selectedProfileModel = useMemo(
    () => profileCatalog.find((item) => item.key === profileModel) ?? profileCatalog[0] ?? null,
    [profileCatalog, profileModel]
  );

  useEffect(() => {
    if (!profileCatalog.length) return;
    if (!selectedProfileModel || selectedProfileModel.key !== profileModel) {
      setProfileModel(profileCatalog[0].key);
    }
  }, [profileCatalog, profileModel, selectedProfileModel]);

  const glassOptionItems = useMemo<Array<{ value: GlassOptionSelection; label: string }>>(
    () => [
      { value: "none", label: t("calculator.glassOptionNone") },
      { value: "energySaving", label: t("calculator.energySaving") },
      { value: "multiFunctional", label: t("calculator.multiFunctional") },
    ],
    [t]
  );

  useEffect(() => {
    if (designOption === "none") {
      setLaminationColor(null);
    }
  }, [designOption]);

  useEffect(() => {
    const max = Number(sashCount) || 1;
    const current = Number(openingSashes) || 0;
    if (current > max) {
      setOpeningSashes(String(max) as OpeningSashes);
    }
  }, [openingSashes, sashCount]);

  const WINDOW_SASH_MIN_WIDTH_CM = 10;

  const allocateIntegerByWeights = (total: number, weights: number[]): number[] => {
    const count = weights.length;
    if (count <= 0) return [];
    if (!Number.isFinite(total) || total <= 0) return Array.from({ length: count }).map(() => 0);

    const safeWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
    const sumWeights = safeWeights.reduce((acc, w) => acc + w, 0);
    const finalWeights = sumWeights > 0 ? safeWeights : Array.from({ length: count }).map(() => 1);
    const denominator = sumWeights > 0 ? sumWeights : count;

    const base = new Array<number>(count);
    const remainders = new Array<{ idx: number; rem: number }>(count);
    let used = 0;

    for (let i = 0; i < count; i += 1) {
      const exact = (total * finalWeights[i]) / denominator;
      const floored = Math.floor(exact);
      base[i] = floored;
      used += floored;
      remainders[i] = { idx: i, rem: exact - floored };
    }

    let remaining = total - used;
    remainders.sort((a, b) => (b.rem === a.rem ? a.idx - b.idx : b.rem - a.rem));

    for (let i = 0; i < remainders.length && remaining > 0; i += 1) {
      base[remainders[i].idx] += 1;
      remaining -= 1;
    }

    return base;
  };

  const normalizeWindowSashWidths = (
    drafts: WindowSashDraft[],
    desiredCount: number,
    totalWidthCm: number | null,
    changedIndex?: number,
    changedRawValue?: string
  ): WindowSashDraft[] => {
    const safeCount = Math.min(3, Math.max(1, desiredCount || 1));
    const base = drafts.slice(0, safeCount);
    while (base.length < safeCount) {
      base.push({ widthCm: "", opening: "fixed" });
    }

    if (!Number.isFinite(totalWidthCm) || !totalWidthCm || totalWidthCm <= 0) {
      return base.map((s) => {
        const raw = Number(s.widthCm);
        const safe = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 40;
        return { ...s, widthCm: String(safe) };
      });
    }

    const targetTotal = Math.round(totalWidthCm);
    const minWidth =
      targetTotal >= safeCount * WINDOW_SASH_MIN_WIDTH_CM
        ? WINDOW_SASH_MIN_WIDTH_CM
        : Math.max(1, Math.floor(targetTotal / safeCount));
    const fallback = Math.max(minWidth, Math.floor(targetTotal / safeCount));
    const parsed = base.map((s) => {
      const raw = Number(s.widthCm);
      return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : fallback;
    });

    const hasChangedIndex = typeof changedIndex === "number" && changedIndex >= 0 && changedIndex < safeCount;
    let widths: number[];

    if (hasChangedIndex) {
      const fixedIdx = changedIndex as number;
      const rawChanged = Number(changedRawValue ?? base[fixedIdx]?.widthCm);
      const maxChanged = Math.max(minWidth, targetTotal - minWidth * (safeCount - 1));
      const changed = Math.min(maxChanged, Math.max(minWidth, Number.isFinite(rawChanged) ? Math.round(rawChanged) : minWidth));

      if (safeCount === 1) {
        widths = [changed];
      } else {
        const otherIndexes = Array.from({ length: safeCount })
          .map((_, i) => i)
          .filter((i) => i !== fixedIdx);
        const extraTotal = Math.max(0, targetTotal - changed - minWidth * otherIndexes.length);
        const otherWeights = otherIndexes.map((i) => parsed[i]);
        const otherExtras = allocateIntegerByWeights(extraTotal, otherWeights);

        widths = Array.from({ length: safeCount }).map(() => minWidth);
        widths[fixedIdx] = changed;
        otherIndexes.forEach((i, idx) => {
          widths[i] = minWidth + (otherExtras[idx] ?? 0);
        });
      }
    } else {
      const extraTotal = Math.max(0, targetTotal - minWidth * safeCount);
      const extras = allocateIntegerByWeights(extraTotal, parsed);
      widths = extras.map((extra) => minWidth + extra);
    }

    return base.map((s, idx) => ({
      ...s,
      widthCm: String(Math.max(1, widths[idx] ?? minWidth)),
    }));
  };

  useEffect(() => {
    if (productType !== "window" && productType !== "balconyBlock") return;

    const normalizeOpening = (value: unknown): SashOpening => {
      if (value === "turn" || value === "tiltTurn") return value;
      return "fixed";
    };

    const normalizeHandleSide = (value: unknown): HandleSide | null => {
      if (value === "left" || value === "right") return value;
      return null;
    };

    const desiredCount = Math.min(3, Math.max(1, Number(sashCount) || 1));
    const totalWidth = Number(width);
    const totalWidthCm = Number.isFinite(totalWidth) && totalWidth > 0 ? Math.round(totalWidth) : null;

    setWindowSashes((prev) => {
      const next: WindowSashDraft[] = (Array.isArray(prev) ? prev : [])
        .slice(0, desiredCount)
        .map((item, idx) => {
          const isBalconyBlockDoor = productType === "balconyBlock" && idx === 0;
          const opening = isBalconyBlockDoor ? "turn" : normalizeOpening((item as any)?.opening);
          const side = normalizeHandleSide((item as any)?.handleSide);
          const handleSide = opening === "fixed" ? undefined : (side ?? "right");
          return {
            widthCm: typeof item?.widthCm === "string" ? item.widthCm : String((item as any)?.widthCm ?? ""),
            opening,
            handleSide: opening === "fixed" ? undefined : (side ?? "right"),
          };
        });

      while (next.length < desiredCount) {
        const idx = next.length;
        const isBalconyBlockDoor = productType === "balconyBlock" && idx === 0;
        next.push({
          widthCm: totalWidthCm ? String(Math.round(totalWidthCm / desiredCount)) : "40",
          opening: isBalconyBlockDoor ? "turn" : "fixed",
          handleSide: isBalconyBlockDoor ? "right" : undefined,
        });
      }

      return normalizeWindowSashWidths(next, desiredCount, totalWidthCm);
    });
  }, [productType, sashCount, width]);

  useEffect(() => {
    if (productType !== "window" && productType !== "balconyBlock") return;
    const desiredCount = Math.min(3, Math.max(1, Number(sashCount) || 1));
    const maxIndex = Math.max(0, desiredCount - 1);
    setActiveSashIndex((prev) => Math.min(maxIndex, Math.max(0, prev)));
  }, [productType, sashCount, windowSashes.length]);

  useEffect(() => {
    if (productType === "door" && (doorSubtype === "entrance" || doorSubtype === "interior")) {
      if (sashCount !== "1") setSashCount("1");
      if (openingSashes !== "1") setOpeningSashes("1");
      if (openingType !== "turn") setOpeningType("turn");
    }
    if (productType === "door" && doorSubtype === "balcony") {
      if (sashCount !== "1") setSashCount("1");
      if (openingSashes !== "1") setOpeningSashes("1");
      if (openingType !== "turn") setOpeningType("turn");
    }
  }, [doorSubtype, openingSashes, openingType, productType, sashCount]);

  useEffect(() => {
    if (productType === "balconyBlock") {
      const sc = Number(sashCount);
      if (sc < 2 || sc > 3) {
        setSashCount("2");
      }
    } else if (productType === "door") {
      setSashCount("1");
    }
  }, [productType]);

  useEffect(() => {
    if (activeEditorKey !== "design" && designPickerOpen) {
      setDesignPickerOpen(false);
    }
  }, [activeEditorKey, designPickerOpen]);

  useEffect(() => {
    if (activeEditorKey !== "construction" && sashOpeningPickerOpen) {
      setSashOpeningPickerOpen(false);
    }
  }, [activeEditorKey, sashOpeningPickerOpen]);

  useEffect(() => {
    if (productType !== "window" && productType !== "balconyBlock" && sashOpeningPickerOpen) {
      setSashOpeningPickerOpen(false);
    }
  }, [productType, sashOpeningPickerOpen]);

  useEffect(() => {
    if (!sashOpeningPickerOpen) return;
    const limit = clampInt(Number(sashCount), 1, 3);
    if (
      sashOpeningPickerSashIndex === null ||
      sashOpeningPickerSashIndex < 0 ||
      sashOpeningPickerSashIndex >= limit
    ) {
      setSashOpeningPickerOpen(false);
    }
  }, [sashCount, sashOpeningPickerOpen, sashOpeningPickerSashIndex]);

  const measureDesignPickerAnchor = () => {
    const node = designDropdownAnchorRef.current;
    if (!node || typeof node.measureInWindow !== "function") return;

    node.measureInWindow((x, y, width, height) => {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        setDesignPickerRect({ x, y, width, height });
      }
    });
  };

  const onToggleDesignPicker = () => {
    if (designPickerOpen) {
      setDesignPickerOpen(false);
      return;
    }

    if (sashOpeningPickerOpen) {
      setSashOpeningPickerOpen(false);
    }
    if (doorSubtypePickerOpen) {
      setDoorSubtypePickerOpen(false);
    }
    if (doorFillPickerOpen) {
      setDoorFillPickerOpen(false);
    }
    if (productTypePickerOpen) {
      setProductTypePickerOpen(false);
    }
    if (glassOptionPickerOpen) {
      setGlassOptionPickerOpen(false);
    }
    if (sashCountPickerOpen) {
      setSashCountPickerOpen(false);
    }

    requestAnimationFrame(() => {
      measureDesignPickerAnchor();
      setDesignPickerOpen(true);
    });
  };

  const measureDoorSubtypePickerAnchor = () => {
    const node = doorSubtypeDropdownAnchorRef.current;
    if (!node || typeof node.measureInWindow !== "function") return;

    node.measureInWindow((x, y, width, height) => {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        setDoorSubtypePickerRect({ x, y, width, height });
      }
    });
  };

  const onToggleDoorSubtypePicker = () => {
    if (doorSubtypePickerOpen) {
      setDoorSubtypePickerOpen(false);
      return;
    }

    if (designPickerOpen) {
      setDesignPickerOpen(false);
    }
    if (sashOpeningPickerOpen) {
      setSashOpeningPickerOpen(false);
    }
    if (doorFillPickerOpen) {
      setDoorFillPickerOpen(false);
    }
    if (productTypePickerOpen) {
      setProductTypePickerOpen(false);
    }
    if (glassOptionPickerOpen) {
      setGlassOptionPickerOpen(false);
    }
    if (sashCountPickerOpen) {
      setSashCountPickerOpen(false);
    }

    requestAnimationFrame(() => {
      measureDoorSubtypePickerAnchor();
      setDoorSubtypePickerOpen(true);
    });
  };

  const measureDoorFillPickerAnchor = () => {
    const node = doorFillDropdownAnchorRef.current;
    if (!node || typeof node.measureInWindow !== "function") return;

    node.measureInWindow((x, y, width, height) => {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        setDoorFillPickerRect({ x, y, width, height });
      }
    });
  };

  const onToggleDoorFillPicker = () => {
    if (doorFillPickerOpen) {
      setDoorFillPickerOpen(false);
      return;
    }

    if (designPickerOpen) {
      setDesignPickerOpen(false);
    }
    if (sashOpeningPickerOpen) {
      setSashOpeningPickerOpen(false);
    }
    if (doorSubtypePickerOpen) {
      setDoorSubtypePickerOpen(false);
    }
    if (productTypePickerOpen) {
      setProductTypePickerOpen(false);
    }
    if (glassOptionPickerOpen) {
      setGlassOptionPickerOpen(false);
    }
    if (sashCountPickerOpen) {
      setSashCountPickerOpen(false);
    }

    requestAnimationFrame(() => {
      measureDoorFillPickerAnchor();
      setDoorFillPickerOpen(true);
    });
  };

  const measureProductTypePickerAnchor = () => {
    const node = productTypeDropdownAnchorRef.current;
    if (!node || typeof node.measureInWindow !== "function") return;

    node.measureInWindow((x, y, width, height) => {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        setProductTypePickerRect({ x, y, width, height });
      }
    });
  };

  const onToggleProductTypePicker = () => {
    if (productTypePickerOpen) {
      setProductTypePickerOpen(false);
      return;
    }

    if (designPickerOpen) {
      setDesignPickerOpen(false);
    }
    if (sashOpeningPickerOpen) {
      setSashOpeningPickerOpen(false);
    }
    if (doorSubtypePickerOpen) {
      setDoorSubtypePickerOpen(false);
    }
    if (doorFillPickerOpen) {
      setDoorFillPickerOpen(false);
    }
    if (glassOptionPickerOpen) {
      setGlassOptionPickerOpen(false);
    }
    if (sashCountPickerOpen) {
      setSashCountPickerOpen(false);
    }

    requestAnimationFrame(() => {
      measureProductTypePickerAnchor();
      setProductTypePickerOpen(true);
    });
  };

  const measureGlassOptionPickerAnchor = () => {
    const node = glassOptionDropdownAnchorRef.current;
    if (!node || typeof node.measureInWindow !== "function") return;

    node.measureInWindow((x, y, width, height) => {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        setGlassOptionPickerRect({ x, y, width, height });
      }
    });
  };

  const onToggleGlassOptionPicker = () => {
    if (glassOptionPickerOpen) {
      setGlassOptionPickerOpen(false);
      return;
    }

    if (designPickerOpen) {
      setDesignPickerOpen(false);
    }
    if (sashOpeningPickerOpen) {
      setSashOpeningPickerOpen(false);
    }
    if (doorSubtypePickerOpen) {
      setDoorSubtypePickerOpen(false);
    }
    if (doorFillPickerOpen) {
      setDoorFillPickerOpen(false);
    }
    if (productTypePickerOpen) {
      setProductTypePickerOpen(false);
    }
    if (sashCountPickerOpen) {
      setSashCountPickerOpen(false);
    }

    requestAnimationFrame(() => {
      measureGlassOptionPickerAnchor();
      setGlassOptionPickerOpen(true);
    });
  };

  const measureSashCountPickerAnchor = () => {
    const node = sashCountDropdownAnchorRef.current;
    if (!node || typeof node.measureInWindow !== "function") return;

    node.measureInWindow((x, y, width, height) => {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        setSashCountPickerRect({ x, y, width, height });
      }
    });
  };

  const onToggleSashCountPicker = () => {
    if (sashCountPickerOpen) {
      setSashCountPickerOpen(false);
      return;
    }

    if (designPickerOpen) {
      setDesignPickerOpen(false);
    }
    if (sashOpeningPickerOpen) {
      setSashOpeningPickerOpen(false);
    }
    if (doorSubtypePickerOpen) {
      setDoorSubtypePickerOpen(false);
    }
    if (doorFillPickerOpen) {
      setDoorFillPickerOpen(false);
    }
    if (productTypePickerOpen) {
      setProductTypePickerOpen(false);
    }
    if (glassOptionPickerOpen) {
      setGlassOptionPickerOpen(false);
    }

    requestAnimationFrame(() => {
      measureSashCountPickerAnchor();
      setSashCountPickerOpen(true);
    });
  };

  const measureSashOpeningPickerAnchor = (index: number) => {
    const node = sashOpeningPickerAnchorRefs.current[index];
    if (!node || typeof node.measureInWindow !== "function") return;

    node.measureInWindow((x, y, width, height) => {
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        setSashOpeningPickerRect({ x, y, width, height });
      }
    });
  };

  const onToggleSashOpeningPicker = (index: number) => {
    if (sashOpeningPickerOpen && sashOpeningPickerSashIndex === index) {
      setSashOpeningPickerOpen(false);
      return;
    }

    if (designPickerOpen) {
      setDesignPickerOpen(false);
    }
    if (glassOptionPickerOpen) {
      setGlassOptionPickerOpen(false);
    }
    if (sashCountPickerOpen) {
      setSashCountPickerOpen(false);
    }

    setSashOpeningPickerSashIndex(index);
    requestAnimationFrame(() => {
      measureSashOpeningPickerAnchor(index);
      setSashOpeningPickerOpen(true);
    });
  };

  const applySashOpening = (index: number, opening: SashOpening) => {
    setWindowSashes((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (opening === "fixed") return { ...item, opening, handleSide: undefined };
        const handleSide = item.handleSide === "left" || item.handleSide === "right" ? item.handleSide : "right";
        return { ...item, opening, handleSide };
      })
    );
  };

  useEffect(() => {
    if (designPickerOpen) {
      setDesignPickerMounted(true);
    }

    designPickerAnimRef.current?.stop();
    const anim = Animated.timing(designPickerProgress, {
      toValue: designPickerOpen ? 1 : 0,
      duration: designPickerOpen ? 180 : 130,
      easing: designPickerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true
    });

    designPickerAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !designPickerOpen) {
        setDesignPickerMounted(false);
      }
    });

    return () => {
      anim.stop();
    };
  }, [designPickerOpen, designPickerProgress]);

  useEffect(() => {
    if (!designPickerOpen) return;
    const frame = requestAnimationFrame(() => {
      measureDesignPickerAnchor();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [designPickerOpen, screenHeight, screenWidth]);

  useEffect(() => {
    if (activeEditorKey !== "construction" && doorSubtypePickerOpen) {
      setDoorSubtypePickerOpen(false);
    }
  }, [activeEditorKey, doorSubtypePickerOpen]);

  useEffect(() => {
    if (doorSubtypePickerOpen) {
      setDoorSubtypePickerMounted(true);
    }

    doorSubtypePickerAnimRef.current?.stop();
    const anim = Animated.timing(doorSubtypePickerProgress, {
      toValue: doorSubtypePickerOpen ? 1 : 0,
      duration: doorSubtypePickerOpen ? 180 : 130,
      easing: doorSubtypePickerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true
    });

    doorSubtypePickerAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !doorSubtypePickerOpen) {
        setDoorSubtypePickerMounted(false);
      }
    });

    return () => {
      anim.stop();
    };
  }, [doorSubtypePickerOpen, doorSubtypePickerProgress]);

  useEffect(() => {
    if (!doorSubtypePickerOpen) return;
    const frame = requestAnimationFrame(() => {
      measureDoorSubtypePickerAnchor();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [doorSubtypePickerOpen, screenHeight, screenWidth]);

  useEffect(() => {
    if (activeEditorKey !== "construction" && doorFillPickerOpen) {
      setDoorFillPickerOpen(false);
    }
  }, [activeEditorKey, doorFillPickerOpen]);

  useEffect(() => {
    if (doorFillPickerOpen) {
      setDoorFillPickerMounted(true);
    }

    doorFillPickerAnimRef.current?.stop();
    const anim = Animated.timing(doorFillPickerProgress, {
      toValue: doorFillPickerOpen ? 1 : 0,
      duration: doorFillPickerOpen ? 180 : 130,
      easing: doorFillPickerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true
    });

    doorFillPickerAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !doorFillPickerOpen) {
        setDoorFillPickerMounted(false);
      }
    });

    return () => {
      anim.stop();
    };
  }, [doorFillPickerOpen, doorFillPickerProgress]);

  useEffect(() => {
    if (!doorFillPickerOpen) return;
    const frame = requestAnimationFrame(() => {
      measureDoorFillPickerAnchor();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [doorFillPickerOpen, screenHeight, screenWidth]);

  useEffect(() => {
    if (activeEditorKey !== "construction" && productTypePickerOpen) {
      setProductTypePickerOpen(false);
    }
  }, [activeEditorKey, productTypePickerOpen]);

  useEffect(() => {
    if (productTypePickerOpen) {
      setProductTypePickerMounted(true);
    }

    productTypePickerAnimRef.current?.stop();
    const anim = Animated.timing(productTypePickerProgress, {
      toValue: productTypePickerOpen ? 1 : 0,
      duration: productTypePickerOpen ? 180 : 130,
      easing: productTypePickerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true
    });

    productTypePickerAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !productTypePickerOpen) {
        setProductTypePickerMounted(false);
      }
    });

    return () => {
      anim.stop();
    };
  }, [productTypePickerOpen, productTypePickerProgress]);

  useEffect(() => {
    if (!productTypePickerOpen) return;
    const frame = requestAnimationFrame(() => {
      measureProductTypePickerAnchor();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [productTypePickerOpen, screenHeight, screenWidth]);

  useEffect(() => {
    if (activeEditorKey !== "profile" && glassOptionPickerOpen) {
      setGlassOptionPickerOpen(false);
    }
  }, [activeEditorKey, glassOptionPickerOpen]);

  useEffect(() => {
    if (glassOptionPickerOpen) {
      setGlassOptionPickerMounted(true);
    }

    glassOptionPickerAnimRef.current?.stop();
    const anim = Animated.timing(glassOptionPickerProgress, {
      toValue: glassOptionPickerOpen ? 1 : 0,
      duration: glassOptionPickerOpen ? 180 : 130,
      easing: glassOptionPickerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true
    });

    glassOptionPickerAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !glassOptionPickerOpen) {
        setGlassOptionPickerMounted(false);
      }
    });

    return () => {
      anim.stop();
    };
  }, [glassOptionPickerOpen, glassOptionPickerProgress]);

  useEffect(() => {
    if (!glassOptionPickerOpen) return;
    const frame = requestAnimationFrame(() => {
      measureGlassOptionPickerAnchor();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [glassOptionPickerOpen, screenHeight, screenWidth]);

  useEffect(() => {
    if (activeEditorKey !== "construction" && sashCountPickerOpen) {
      setSashCountPickerOpen(false);
    }
  }, [activeEditorKey, sashCountPickerOpen]);

  useEffect(() => {
    if (sashCountPickerOpen) {
      setSashCountPickerMounted(true);
    }

    sashCountPickerAnimRef.current?.stop();
    const anim = Animated.timing(sashCountPickerProgress, {
      toValue: sashCountPickerOpen ? 1 : 0,
      duration: sashCountPickerOpen ? 180 : 130,
      easing: sashCountPickerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true
    });

    sashCountPickerAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !sashCountPickerOpen) {
        setSashCountPickerMounted(false);
      }
    });

    return () => {
      anim.stop();
    };
  }, [sashCountPickerOpen, sashCountPickerProgress]);

  useEffect(() => {
    if (!sashCountPickerOpen) return;
    const frame = requestAnimationFrame(() => {
      measureSashCountPickerAnchor();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [sashCountPickerOpen, screenHeight, screenWidth]);

  useEffect(() => {
    if (sashOpeningPickerOpen) {
      setSashOpeningPickerMounted(true);
    }

    sashOpeningPickerAnimRef.current?.stop();
    const anim = Animated.timing(sashOpeningPickerProgress, {
      toValue: sashOpeningPickerOpen ? 1 : 0,
      duration: sashOpeningPickerOpen ? 180 : 130,
      easing: sashOpeningPickerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true
    });

    sashOpeningPickerAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !sashOpeningPickerOpen) {
        setSashOpeningPickerMounted(false);
      }
    });

    return () => {
      anim.stop();
    };
  }, [sashOpeningPickerOpen, sashOpeningPickerProgress]);

  useEffect(() => {
    if (!sashOpeningPickerOpen || sashOpeningPickerSashIndex === null) return;
    const frame = requestAnimationFrame(() => {
      measureSashOpeningPickerAnchor(sashOpeningPickerSashIndex);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [sashOpeningPickerOpen, sashOpeningPickerSashIndex, screenHeight, screenWidth]);

  useEffect(() => {
    if (!sashOpeningPickerOpen) return;
    if (sashOpeningPickerSashIndex !== activeSashIndex) {
      setSashOpeningPickerOpen(false);
    }
  }, [activeSashIndex, sashOpeningPickerOpen, sashOpeningPickerSashIndex]);

  const calcInput = useMemo<CalcInput>(() => {
    const isEntranceLikeDoor = productType === "door" && (doorSubtype === "entrance" || doorSubtype === "interior");
    const nextOptions: string[] = [];

    // Common extras

    // Window / Balcony block extras
    if (productType === "window" || productType === "balconyBlock") {
      if (mosquitoNet === "on") nextOptions.push("mosquito_net");
      if (windowSill === "on") nextOptions.push("window_sill");
      if (dripEdge === "on") nextOptions.push("drip_edge");
      if (casing === "on") nextOptions.push("casing");
      if (decorBars === "on") nextOptions.push("decor_bars");
    }

    const uniqueOptions = Array.from(new Set(nextOptions));

    const normalizeOpening = (value: unknown): SashOpening => {
      if (value === "turn" || value === "tiltTurn") return value;
      return "fixed";
    };

    const normalizeHandleSide = (value: unknown): HandleSide | null => {
      if (value === "left" || value === "right") return value;
      return null;
    };

    const normalizeWindowSillWidthCm = (value: unknown): number => {
      const n = typeof value === "number" ? value : Number(value);
      const safe = Number.isFinite(n) ? Math.round(n) : 20;
      return Math.min(50, Math.max(5, safe));
    };

    const normalizeDripEdgeWidthCm = (value: unknown): 6 | 9 | 11 | 13 => {
      const raw = typeof value === "string" ? value.trim() : String(value ?? "").trim();
      const parsed = Number(raw);
      if (parsed === 6 || parsed === 9 || parsed === 11 || parsed === 13) return parsed;
      return 9;
    };

    const desiredSashCount = Math.min(3, Math.max(1, Number(sashCount) || 1));
    const totalWidthRaw = Number(width);
    const totalWidthCm = Number.isFinite(totalWidthRaw) && totalWidthRaw > 0 ? Math.round(totalWidthRaw) : null;

    const sashes =
      productType === "window" || productType === "balconyBlock"
        ? (() => {
            const draft = windowSashes.slice(0, desiredSashCount);
            const safeCount = Math.min(3, Math.max(1, draft.length || desiredSashCount));
            const base = totalWidthCm ? Math.floor(totalWidthCm / safeCount) : 0;
            const remainder = totalWidthCm ? totalWidthCm - base * safeCount : 0;

            const widths = Array.from({ length: safeCount }).map((_, idx) => {
              const raw = Number(draft[idx]?.widthCm);
              const fallback = base + (idx < remainder ? 1 : 0);
              return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : fallback || 1;
            });

            return widths.map((widthCmValue, idx) => {
              const opening = normalizeOpening(draft[idx]?.opening);
              const side = normalizeHandleSide(draft[idx]?.handleSide);
              const handleSide = opening === "fixed" ? undefined : (side ?? "right");
              return {
                widthCm: widthCmValue,
                opening,
                ...(handleSide ? { handleSide } : {}),
              };
            });
          })()
        : undefined;

    const derivedSashCount = sashes ? sashes.length : Number(sashCount);
    const derivedOpeningSashes = sashes ? sashes.reduce((acc, item) => acc + (item.opening === "fixed" ? 0 : 1), 0) : Number(openingSashes);
    const derivedOpeningType = (() => {
      if (!sashes) return openingType;
      const set = new Set(sashes.map((s) => s.opening).filter((o) => o === "turn" || o === "tiltTurn"));
      return set.size === 1 ? (Array.from(set)[0] as "turn" | "tiltTurn") : undefined;
    })();

    const meetingPairNoMullionActive =
      productType === "window" &&
      windowMeetingPairNoMullion &&
      Array.isArray(sashes) &&
      sashes.length === 2 &&
      sashes.every((s) => s.opening !== "fixed");

    const windowSillWidthCmValue =
      (productType === "window" || productType === "balconyBlock") && windowSill === "on" ? normalizeWindowSillWidthCm(windowSillWidthCm) : undefined;
    const dripEdgeWidthCmValue =
      (productType === "window" || productType === "balconyBlock") && dripEdge === "on" ? normalizeDripEdgeWidthCm(dripEdgeWidthCm) : undefined;
    const decorBarsColorValue = (productType === "window" || productType === "balconyBlock") && decorBars === "on" ? decorBarsColor : undefined;

    const glassOptions: GlassOptionsInput =
      selectedGlassOption === "energySaving"
        ? { energySaving: true }
        : selectedGlassOption === "multiFunctional"
          ? { multiFunctional: true }
          : {};

    return {
      width: Number(width) / 100,
      height: Number(height) / 100,
      quantity: Number(quantity),
      productType: productType === "balconyBlock" ? "balconyblock" : productType,
      material: "pvc",
      options: uniqueOptions,
      windowSillWidthCm: windowSillWidthCmValue,
      dripEdgeWidthCm: dripEdgeWidthCmValue,
      decorBarsColor: decorBarsColorValue,

      doorSubtype: productType === "door" ? doorSubtype : undefined,
      doorHandleSide: productType === "door" ? doorHandleSide : undefined,

      sashCount: derivedSashCount,
      openingSashes: derivedOpeningSashes,
      openingType: derivedOpeningType,
      sashes,
      windowMeetingPairNoMullion: meetingPairNoMullionActive ? true : undefined,

      profileModel: selectedProfileModel?.key,
      profileSeries: (selectedProfileModel?.legacySeries as CalcInput["profileSeries"]) ?? "kbe",
      profileDepthMm: selectedProfileModel?.legacyDepthMm ?? selectedProfileModel?.depthMm ?? 70,
      glazing,
      glassOptions,
      lamination,
      laminationGroup,
      laminationSide,
      laminationColor: lamination !== "none" ? (laminationColor ?? undefined) : undefined,

      entranceOptions:
        productType === "door" || productType === "balconyBlock"
          ? {
              fillTop: doorFillTop,
              fillBottom: doorFillBottom,
              ...(doorFillTop === doorFillBottom ? { fillType: doorFillTop } : {}),
            }
          : undefined,
      services: {
        installEnabled: true,
      },
    };
  }, [
    decorBars,
    decorBarsColor,
    doorHandleSide,
    doorSubtype,
    dripEdge,
    dripEdgeWidthCm,
    doorFillTop,
    doorFillBottom,
    glazing,
    height,
    casing,
    designOption,
    laminationColor,
    mosquitoNet,
    openingSashes,
    openingType,
    productType,
    profileModel,
    quantity,
    selectedProfileModel,
    selectedGlassOption,
    sashCount,
    windowMeetingPairNoMullion,
    windowSashes,
    windowSill,
    windowSillWidthCm,
    width
  ]);

  const draftCalcDto = useMemo(() => {
    try {
      return calculateQuote(calcInput, calcConfigQuery.data ?? {}, currency);
    } catch {
      return null;
    }
  }, [calcConfigQuery.data, calcInput, currency]);

  const draftTotal = Math.max(0, draftCalcDto?.pricing.total ?? 0);
  const draftBreakdown = draftCalcDto?.pricing.breakdown ?? null;

  const optionDeltaText = useMemo(() => {
    const calculateTotalForInput = (nextInput: CalcInput): number | null => {
      try {
        const result = calculateQuote(nextInput, calcConfigQuery.data ?? {}, currency);
        if (result.issues.errors.length) return null;
        const total = Number(result.pricing.total);
        return Number.isFinite(total) ? Math.max(0, total) : null;
      } catch {
        return null;
      }
    };

    const formatDelta = (delta: number | null): string | undefined => {
      if (delta === null || !Number.isFinite(delta) || delta <= 0.5) return undefined;
      return `+ ${formatMoney(delta, currency)}`;
    };

    const withOption = (key: string, enabled: boolean, extras: Partial<CalcInput> = {}): CalcInput => {
      const nextOptions = new Set(calcInput.options ?? []);
      if (enabled) nextOptions.add(key);
      else nextOptions.delete(key);
      return {
        ...calcInput,
        ...extras,
        options: Array.from(nextOptions),
      };
    };

    const normalizeWindowSillWidth = (): number => {
      const value = Number(windowSillWidthCm);
      const safe = Number.isFinite(value) ? Math.round(value) : 20;
      return Math.min(50, Math.max(5, safe));
    };

    const normalizeDripEdgeWidth = (): 6 | 9 | 11 | 13 => {
      const value = Number(dripEdgeWidthCm);
      return value === 6 || value === 9 || value === 11 || value === 13 ? value : 9;
    };

    const optionDelta = (key: string, enabledExtras: Partial<CalcInput> = {}, disabledExtras: Partial<CalcInput> = {}) => {
      const baseTotal = calculateTotalForInput(withOption(key, false, disabledExtras));
      const enabledTotal = calculateTotalForInput(withOption(key, true, enabledExtras));
      if (baseTotal === null || enabledTotal === null) return undefined;
      return formatDelta(enabledTotal - baseTotal);
    };

    const glassDelta = (glassOptions: GlassOptionsInput) => {
      const baseTotal = calculateTotalForInput({ ...calcInput, glassOptions: {} });
      const enabledTotal = calculateTotalForInput({ ...calcInput, glassOptions });
      if (baseTotal === null || enabledTotal === null) return undefined;
      return formatDelta(enabledTotal - baseTotal);
    };

    return {
      energySaving: glassDelta({ energySaving: true }),
      multiFunctional: glassDelta({ multiFunctional: true }),
      decorBars: optionDelta(
        "decor_bars",
        { decorBarsColor },
        { decorBarsColor: undefined }
      ),
      mosquitoNet: optionDelta("mosquito_net"),
      windowSill: optionDelta(
        "window_sill",
        { windowSillWidthCm: normalizeWindowSillWidth() },
        { windowSillWidthCm: undefined }
      ),
      dripEdge: optionDelta(
        "drip_edge",
        { dripEdgeWidthCm: normalizeDripEdgeWidth() },
        { dripEdgeWidthCm: undefined }
      ),
      casing: optionDelta("casing"),
    };
  }, [calcConfigQuery.data, calcInput, currency, decorBarsColor, dripEdgeWidthCm, windowSillWidthCm]);

  const pricedGlassOptionItems = useMemo(
    () =>
      glassOptionItems.map((item) => ({
        ...item,
        description:
          item.value === "energySaving"
            ? optionDeltaText.energySaving
            : item.value === "multiFunctional"
              ? optionDeltaText.multiFunctional
              : undefined,
      })),
    [glassOptionItems, optionDeltaText.energySaving, optionDeltaText.multiFunctional]
  );

  useEffect(() => {
    setHasCalculated(false);
    setCalculatedTotal(null);
  }, [calcInput, currency]);

  const validateDraftForOrder = (): boolean => {
    if (draftCalcDto?.issues.errors.length) {
      Alert.alert(t("calculator.title"), draftCalcDto.issues.errors[0]?.message ?? t("calculator.validation.invalidConfig"));
      return false;
    }
    if (designOption !== "none" && !laminationColor) {
      Alert.alert(t("calculator.title"), t("calculator.validation.selectLaminationColor"));
      return false;
    }
    if (!Number.isFinite(draftTotal) || draftTotal <= 0) {
      Alert.alert(t("calculator.title"), t("calculator.validation.invalidConfig"));
      return false;
    }
    return true;
  };

  const onAddToOrder = () => {
    if (!validateDraftForOrder() || !draftCalcDto) return;
    if (orderItems.length >= 20) {
      Alert.alert(
        t("calculator.orderTitle", { defaultValue: "Заказ" }),
        t("calculator.validation.maxOrderItems", { defaultValue: "Максимум 20 изделий в одном заказе." })
      );
      return;
    }

    const nextId = "item_" + Date.now() + "_" + orderItemSeqRef.current;
    orderItemSeqRef.current += 1;

    const nextItem: QuoteOrderItemDraft = {
      localId: nextId,
      calcInput: cloneCalcInput(calcInput),
      preview: {
        subtotal: Math.max(0, draftCalcDto.pricing.subtotal ?? 0),
        total: Math.max(0, draftCalcDto.pricing.total ?? 0),
        currency,
        calcDto: draftCalcDto,
      },
    };

    addItem(nextItem);
    Alert.alert(
      t("calculator.orderTitle", { defaultValue: "Заказ" }),
      t("calculator.orderItemAdded", { defaultValue: "Позиция добавлена в заказ." })
    );
  };


  const onCalculate = () => {
    if (!validateDraftForOrder()) return;

    const nextTotal = draftTotal;
    if (!Number.isFinite(nextTotal) || nextTotal <= 0) {
      Alert.alert(t("calculator.title"), t("calculator.validation.invalidConfig"));
      return;
    }

    setCalculatedTotal(nextTotal);
    setHasCalculated(true);
  };


  const helpTitle = helpKey ? t(`calculator.help.${helpKey}.title`) : "";
  const helpBody = helpKey ? t(`calculator.help.${helpKey}.body`) : "";

  const FieldLabel = ({ text, helpId }: { text: string; helpId: string }) => (
    <View style={styles.fieldLabelRow}>
      <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>{text}</Text>
      <HelpIcon onPress={() => setHelpKey(helpId)} accessibilityLabel={text} />
    </View>
  );

  const CalcIllustrationCard = ({ title, source }: { title: string; source: ImageSourcePropType }) => {
    const previewHeight = isWide ? 240 : 200;

    return (
      <Card
        variant="solid"
        elevated={false}
        padded={false}
        style={[
          styles.illustrationCard,
          { backgroundColor: theme.colors.surface }
        ]}
      >
        <View style={styles.illustrationCardInner}>
          <View style={styles.illustrationTitleRow}>
            <Text style={[styles.illustrationTitle, { color: theme.colors.text }]} numberOfLines={2}>
              {title}
            </Text>
          </View>

          <View
            style={[
              styles.illustrationImageWrap,
              {
                height: previewHeight,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface
              }
            ]}
          >
            <Image source={source} style={styles.illustrationImage} resizeMode="contain" />
          </View>
        </View>
      </Card>
    );
  };

  const isEntranceLikeDoor = productType === "door" && (doorSubtype === "entrance" || doorSubtype === "interior");
  const sashMax = isEntranceLikeDoor ? 1 : 3;
  const openingMin = isEntranceLikeDoor ? 1 : 0;
  const openingMax = isEntranceLikeDoor ? 1 : Math.min(sashMax, Math.max(1, Number(sashCount) || 1));

  const clampInt = (value: unknown, min: number, max: number): number => {
    const n = typeof value === "number" ? value : Number(value);
    const safe = Number.isFinite(n) ? Math.round(n) : min;
    return Math.min(max, Math.max(min, safe));
  };

  const widthCm = Number(width);
  const heightCm = Number(height);
  const hasDims = Number.isFinite(widthCm) && widthCm > 0 && Number.isFinite(heightCm) && heightCm > 0;
  const sizeLabel = hasDims ? `${Math.round(widthCm)}×${Math.round(heightCm)} cm` : "--";

  const windowSashSpecs = (productType === "window" || productType === "balconyBlock") && Array.isArray(calcInput.sashes) ? calcInput.sashes : null;
  const meetingPairEligible =
    productType === "window" &&
    Boolean(windowSashSpecs?.length === 2 && windowSashSpecs.every((item) => item?.opening !== "fixed"));

  useEffect(() => {
    if (!meetingPairEligible && windowMeetingPairNoMullion) {
      setWindowMeetingPairNoMullion(false);
    }
  }, [meetingPairEligible, windowMeetingPairNoMullion]);

  const previewSashes = isEntranceLikeDoor
    ? 1
    : (productType === "window" || productType === "balconyBlock") && windowSashSpecs && windowSashSpecs.length
      ? windowSashSpecs.length
      : clampInt(Number(sashCount), 1, 3);

  const previewOpeningSashes = isEntranceLikeDoor
    ? 1
    : (productType === "window" || productType === "balconyBlock") && windowSashSpecs
      ? windowSashSpecs.reduce((acc, item) => acc + (item?.opening === "fixed" ? 0 : 1), 0)
      : clampInt(Number(openingSashes), 0, previewSashes);

  const windowOpeningTypes = (productType === "window" || productType === "balconyBlock") && windowSashSpecs
    ? new Set(windowSashSpecs.map((s) => s.opening).filter((o) => o === "turn" || o === "tiltTurn"))
    : null;

  const previewWindowSashes = useMemo<Array<{ widthCm: number; opening: SashOpening; handleSide?: HandleSide }> | undefined>(() => {
    if (productType !== "window" && productType !== "balconyBlock") return undefined;
    if (draftCalcDto?.sections?.length) {
      return draftCalcDto.sections.map((sec) => ({
        widthCm: Math.max(1, Math.round(sec.secW_mm / 10)),
        opening: sec.kind === "fixed" ? "fixed" : (sec.openType ?? "tiltTurn"),
        ...(sec.kind === "sash" && sec.handleSide ? { handleSide: sec.handleSide } : {}),
      }));
    }
    return windowSashSpecs ?? undefined;
  }, [draftCalcDto, productType, windowSashSpecs]);

  const openingTypeLabel =
    previewOpeningSashes > 0
      ? (productType === "window" || productType === "balconyBlock") && windowOpeningTypes
        ? windowOpeningTypes.size === 1
          ? t(`calculator.openingTypes.${Array.from(windowOpeningTypes)[0]}`)
          : t("calculator.openingTypes.mixed")
        : t(`calculator.openingTypes.${openingType}`)
      : "--";

  const openingTypeIcon: IoniconName =
    previewOpeningSashes > 0
      ? (productType === "window" || productType === "balconyBlock") && windowOpeningTypes
        ? windowOpeningTypes.size === 1
          ? Array.from(windowOpeningTypes)[0] === "turn"
            ? "arrow-forward"
            : "swap-horizontal-outline"
          : "shuffle-outline"
        : openingType === "turn"
          ? "arrow-forward"
          : "swap-horizontal-outline"
      : "swap-horizontal-outline";

  const typeValue =
    productType === "door"
      ? `${t("calculator.types.door")} · ${t(`calculator.doorSubtypes.${doorSubtype}`)}`
      : productType === "balconyBlock"
        ? t("calculator.types.balconyBlock")
        : t("calculator.types.window");

  const profileDepthPreviewKey =
    (selectedProfileModel?.depthMm ?? 70) <= 60 ? "60" : (selectedProfileModel?.depthMm ?? 70) >= 80 ? "85" : "70";
  const profileValue = selectedProfileModel
    ? selectedProfileModel.depthMm && selectedProfileModel.chambers
      ? `${selectedProfileModel.label} · ${selectedProfileModel.depthMm} мм · ${selectedProfileModel.chambers} камер`
      : selectedProfileModel.label
    : t("calculator.preview.none");
  const profileGroups = profileCatalog.reduce<Record<string, typeof profileCatalog>>((acc, item) => {
    const key = item.brand || "Profiles";
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});
  const glazingValue = t(`calculator.glazingOptions.${glazing}`);

  const designValue = t(`calculator.designOptions.${designOption}`, { defaultValue: String(designOption) });
  const designOptionItems: SelectListOption<DesignOption>[] = [
    { value: "none", label: t("calculator.designOptions.none") },
    { value: "outside", label: t("calculator.designOptions.outside") },
    { value: "inside", label: t("calculator.designOptions.inside") },
    { value: "twoSideWhite", label: t("calculator.designOptions.twoSideWhite") },
    { value: "twoSideColor", label: t("calculator.designOptions.twoSideColor") },
  ];
  const selectedDesignOptionLabel =
    designOptionItems.find((item) => item.value === designOption)?.label ??
    t("calculator.designOptions.none");
  const designPickerAnimatedStyle = {
    opacity: designPickerProgress,
    transform: [
      {
        translateY: designPickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0]
        })
      },
      {
        scale: designPickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1]
        })
      }
    ]
  };
  const doorSubtypePickerAnimatedStyle = {
    opacity: doorSubtypePickerProgress,
    transform: [
      {
        translateY: doorSubtypePickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0]
        })
      },
      {
        scale: doorSubtypePickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1]
        })
      }
    ]
  };

  const productTypeOptionItems: SelectListOption<"window" | "door" | "balconyBlock">[] = [
    { value: "window", label: t("calculator.types.window") },
    { value: "door", label: t("calculator.types.door") },
    { value: "balconyBlock", label: t("calculator.types.balconyBlock") }
  ];

  const productTypeMenuBaseWidth = Math.max(220, Math.min(360, screenWidth - spacing.md * 2));
  const productTypeAnchorX = productTypePickerRect?.x ?? spacing.md;
  const productTypeAnchorY = productTypePickerRect?.y ?? spacing.md;
  const productTypeAnchorWidth = productTypePickerRect?.width ?? productTypeMenuBaseWidth;
  const productTypeAnchorMeasuredHeight = productTypePickerRect?.height ?? Math.max(46, productTypePickerAnchorHeight || 46);
  const productTypeMenuHorizontalMargin = spacing.sm;
  const productTypeMenuWidth = Math.min(
    Math.max(productTypeAnchorWidth, 220),
    Math.max(220, screenWidth - productTypeMenuHorizontalMargin * 2)
  );
  const productTypeMenuLeft = Math.min(
    Math.max(productTypeMenuHorizontalMargin, productTypeAnchorX),
    Math.max(productTypeMenuHorizontalMargin, screenWidth - productTypeMenuWidth - productTypeMenuHorizontalMargin)
  );
  const productTypeMenuTop = Math.max(spacing.sm, productTypeAnchorY + productTypeAnchorMeasuredHeight + spacing.xs);
  const productTypeMenuMaxHeight = Math.max(0, screenHeight - productTypeMenuTop - spacing.sm);

  const productTypePickerAnimatedStyle = {
    opacity: productTypePickerProgress,
    transform: [
      {
        translateY: productTypePickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0]
        })
      },
      {
        scale: productTypePickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1]
        })
      }
    ]
  };

  const glassOptionMenuBaseWidth = Math.max(220, Math.min(360, screenWidth - spacing.md * 2));
  const glassOptionAnchorX = glassOptionPickerRect?.x ?? spacing.md;
  const glassOptionAnchorY = glassOptionPickerRect?.y ?? spacing.md;
  const glassOptionAnchorWidth = glassOptionPickerRect?.width ?? glassOptionMenuBaseWidth;
  const glassOptionAnchorMeasuredHeight = glassOptionPickerRect?.height ?? Math.max(46, glassOptionPickerAnchorHeight || 46);
  const glassOptionMenuHorizontalMargin = spacing.sm;
  const glassOptionMenuWidth = Math.min(
    Math.max(glassOptionAnchorWidth, 220),
    Math.max(220, screenWidth - glassOptionMenuHorizontalMargin * 2)
  );
  const glassOptionMenuLeft = Math.min(
    Math.max(glassOptionMenuHorizontalMargin, glassOptionAnchorX),
    Math.max(glassOptionMenuHorizontalMargin, screenWidth - glassOptionMenuWidth - glassOptionMenuHorizontalMargin)
  );
  const glassOptionMenuTop = Math.max(spacing.sm, glassOptionAnchorY + glassOptionAnchorMeasuredHeight + spacing.xs);
  const glassOptionMenuMaxHeight = Math.max(0, screenHeight - glassOptionMenuTop - spacing.sm);

  const glassOptionPickerAnimatedStyle = {
    opacity: glassOptionPickerProgress,
    transform: [
      {
        translateY: glassOptionPickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0]
        })
      },
      {
        scale: glassOptionPickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1]
        })
      }
    ]
  };

  const sashCountMenuBaseWidth = Math.max(220, Math.min(360, screenWidth - spacing.md * 2));
  const sashCountAnchorX = sashCountPickerRect?.x ?? spacing.md;
  const sashCountAnchorY = sashCountPickerRect?.y ?? spacing.md;
  const sashCountAnchorWidth = sashCountPickerRect?.width ?? sashCountMenuBaseWidth;
  const sashCountAnchorMeasuredHeight = sashCountPickerRect?.height ?? Math.max(46, sashCountPickerAnchorHeight || 46);
  const sashCountMenuHorizontalMargin = spacing.sm;
  const sashCountMenuWidth = Math.min(
    Math.max(sashCountAnchorWidth, 220),
    Math.max(220, screenWidth - sashCountMenuHorizontalMargin * 2)
  );
  const sashCountMenuLeft = Math.min(
    Math.max(sashCountMenuHorizontalMargin, sashCountAnchorX),
    Math.max(sashCountMenuHorizontalMargin, screenWidth - sashCountMenuWidth - sashCountMenuHorizontalMargin)
  );
  const sashCountMenuTop = Math.max(spacing.sm, sashCountAnchorY + sashCountAnchorMeasuredHeight + spacing.xs);
  const sashCountMenuMaxHeight = Math.max(0, screenHeight - sashCountMenuTop - spacing.sm);

  const sashCountPickerAnimatedStyle = {
    opacity: sashCountPickerProgress,
    transform: [
      {
        translateY: sashCountPickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0]
        })
      },
      {
        scale: sashCountPickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1]
        })
      }
    ]
  };

  const sashCountOptionItems = useMemo<SelectListOption<SashCount>[]>(() => {
    const isBalcony = productType === "balconyBlock";
    const values: SashCount[] = isBalcony ? ["2", "3"] : ["1", "2", "3"];

    return values.map((val) => {
      const labelKey = isBalcony ? `calculator.sashCounts.balconyBlock.${val}` : `calculator.sashCounts.window.${val}`;
      return {
        value: val,
        label: t(labelKey)
      };
    });
  }, [productType, t]);

  const activeSashCountLabel = useMemo(() => {
    return sashCountOptionItems.find((item) => item.value === sashCount)?.label ?? "";
  }, [sashCountOptionItems, sashCount]);

  const doorSubtypeOptionItems: SelectListOption<string>[] = [
    { value: "balcony", label: t("calculator.doorSubtypes.balcony") },
    { value: "interior", label: t("calculator.doorSubtypes.interior") },
    { value: "entrance", label: t("calculator.doorSubtypes.entrance") }
  ];

  const selectedDoorSubtypeOption =
    doorSubtypeOptionItems.find((item) => item.value === doorSubtype) ?? doorSubtypeOptionItems[0];

  const doorSubtypeMenuBaseWidth = Math.max(220, Math.min(360, screenWidth - spacing.md * 2));
  const doorSubtypeAnchorX = doorSubtypePickerRect?.x ?? spacing.md;
  const doorSubtypeAnchorY = doorSubtypePickerRect?.y ?? spacing.md;
  const doorSubtypeAnchorWidth = doorSubtypePickerRect?.width ?? doorSubtypeMenuBaseWidth;
  const doorSubtypeAnchorMeasuredHeight = doorSubtypePickerRect?.height ?? Math.max(46, doorSubtypePickerAnchorHeight || 46);
  const doorSubtypeMenuHorizontalMargin = spacing.sm;
  const doorSubtypeMenuWidth = Math.min(
    Math.max(doorSubtypeAnchorWidth, 220),
    Math.max(220, screenWidth - doorSubtypeMenuHorizontalMargin * 2)
  );
  const doorSubtypeMenuLeft = Math.min(
    Math.max(doorSubtypeMenuHorizontalMargin, doorSubtypeAnchorX),
    Math.max(doorSubtypeMenuHorizontalMargin, screenWidth - doorSubtypeMenuWidth - doorSubtypeMenuHorizontalMargin)
  );
  const doorSubtypeMenuTop = Math.max(spacing.sm, doorSubtypeAnchorY + doorSubtypeAnchorMeasuredHeight + spacing.xs);
  const doorSubtypeMenuMaxHeight = Math.max(0, screenHeight - doorSubtypeMenuTop - spacing.sm);

  const doorFillPickerAnimatedStyle = {
    opacity: doorFillPickerProgress,
    transform: [
      {
        translateY: doorFillPickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0]
        })
      },
      {
        scale: doorFillPickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1]
        })
      }
    ]
  };

  const doorFillOptionItems: SelectListOption<string>[] = [
    { value: "glass", label: t("calculator.entrance.fillTypes.glass") },
    { value: "sandwich", label: t("calculator.entrance.fillTypes.sandwich") },
    { value: "combined", label: t("calculator.entrance.fillTypes.combined") }
  ];

  const doorFill = (doorFillTop === "glass" && doorFillBottom === "glass")
    ? "glass"
    : (doorFillTop === "sandwich" && doorFillBottom === "sandwich")
      ? "sandwich"
      : "combined";

  const selectedDoorFillOption =
    doorFillOptionItems.find((item) => item.value === doorFill) ?? doorFillOptionItems[0];

  const doorFillMenuBaseWidth = Math.max(220, Math.min(360, screenWidth - spacing.md * 2));
  const doorFillAnchorX = doorFillPickerRect?.x ?? spacing.md;
  const doorFillAnchorY = doorFillPickerRect?.y ?? spacing.md;
  const doorFillAnchorWidth = doorFillPickerRect?.width ?? doorFillMenuBaseWidth;
  const doorFillAnchorMeasuredHeight = doorFillPickerRect?.height ?? Math.max(46, doorFillPickerAnchorHeight || 46);
  const doorFillMenuHorizontalMargin = spacing.sm;
  const doorFillMenuWidth = Math.min(
    Math.max(doorFillAnchorWidth, 220),
    Math.max(220, screenWidth - doorFillMenuHorizontalMargin * 2)
  );
  const doorFillMenuLeft = Math.min(
    Math.max(doorFillMenuHorizontalMargin, doorFillAnchorX),
    Math.max(doorFillMenuHorizontalMargin, screenWidth - doorFillMenuWidth - doorFillMenuHorizontalMargin)
  );
  const doorFillMenuTop = Math.max(spacing.sm, doorFillAnchorY + doorFillAnchorMeasuredHeight + spacing.xs);
  const doorFillMenuMaxHeight = Math.max(0, screenHeight - doorFillMenuTop - spacing.sm);

  const designMenuBaseWidth = Math.max(220, Math.min(360, screenWidth - spacing.md * 2));
  const designAnchorX = designPickerRect?.x ?? spacing.md;
  const designAnchorY = designPickerRect?.y ?? spacing.md;
  const designAnchorWidth = designPickerRect?.width ?? designMenuBaseWidth;
  const designAnchorMeasuredHeight = designPickerRect?.height ?? Math.max(46, designPickerAnchorHeight || 46);
  const designMenuHorizontalMargin = spacing.sm;
  const designMenuWidth = Math.min(
    Math.max(designAnchorWidth, 220),
    Math.max(220, screenWidth - designMenuHorizontalMargin * 2)
  );
  const designMenuLeft = Math.min(
    Math.max(designMenuHorizontalMargin, designAnchorX),
    Math.max(designMenuHorizontalMargin, screenWidth - designMenuWidth - designMenuHorizontalMargin)
  );
  const designMenuTop = Math.max(spacing.sm, designAnchorY + designAnchorMeasuredHeight + spacing.xs);
  const designMenuMaxHeight = Math.max(0, screenHeight - designMenuTop - spacing.sm);
  const sashOpeningOptionItems: SelectListOption<SashOpening>[] = [
    { value: "fixed", label: t("calculator.openingTypes.fixed") },
    { value: "turn", label: t("calculator.openingTypes.turn") },
    { value: "tiltTurn", label: t("calculator.openingTypes.tiltTurn") }
  ];
  const sashOpeningPickerCurrentValue =
    sashOpeningPickerSashIndex !== null ? (windowSashes[sashOpeningPickerSashIndex]?.opening ?? "fixed") : "fixed";
  const sashOpeningPickerAnimatedStyle = {
    opacity: sashOpeningPickerProgress,
    transform: [
      {
        translateY: sashOpeningPickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0]
        })
      },
      {
        scale: sashOpeningPickerProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1]
        })
      }
    ]
  };
  const sashOpeningMenuBaseWidth = Math.max(220, Math.min(360, screenWidth - spacing.md * 2));
  const sashOpeningAnchorX = sashOpeningPickerRect?.x ?? spacing.md;
  const sashOpeningAnchorY = sashOpeningPickerRect?.y ?? spacing.md;
  const sashOpeningAnchorWidth = sashOpeningPickerRect?.width ?? sashOpeningMenuBaseWidth;
  const sashOpeningAnchorHeight = sashOpeningPickerRect?.height ?? 46;
  const sashOpeningMenuHorizontalMargin = spacing.sm;
  const sashOpeningMenuWidth = Math.min(
    Math.max(sashOpeningAnchorWidth, 220),
    Math.max(220, screenWidth - sashOpeningMenuHorizontalMargin * 2)
  );
  const sashOpeningMenuLeft = Math.min(
    Math.max(sashOpeningMenuHorizontalMargin, sashOpeningAnchorX),
    Math.max(sashOpeningMenuHorizontalMargin, screenWidth - sashOpeningMenuWidth - sashOpeningMenuHorizontalMargin)
  );
  const sashOpeningMenuTop = Math.max(spacing.sm, sashOpeningAnchorY + sashOpeningAnchorHeight + spacing.xs);
  const sashOpeningMenuMaxHeight = Math.max(0, screenHeight - sashOpeningMenuTop - spacing.sm);
  const laminationColorLabel =
    laminationColor === "gold_oak"
      ? t("calculator.laminationColorOptions.goldOak")
      : laminationColor === "grey_oak"
        ? t("calculator.laminationColorOptions.greyOak")
        : laminationColor === "dark_oak"
          ? t("calculator.laminationColorOptions.darkOak")
          : laminationColor === "other"
            ? t("calculator.laminationColorOptions.other")
          : "";
  const designSummaryValue = designOption !== "none" && laminationColorLabel ? `${designValue} · ${laminationColorLabel}` : designValue;

  let extrasEnabledCount = 0;
  if (productType === "window" || productType === "balconyBlock") {
    if (mosquitoNet === "on") extrasEnabledCount++;
    if (windowSill === "on") extrasEnabledCount++;
    if (dripEdge === "on") extrasEnabledCount++;
    if (casing === "on") extrasEnabledCount++;
    if (decorBars === "on") extrasEnabledCount++;
  }
  const extrasValue = extrasEnabledCount === 0 ? t("calculator.preview.none") : `${extrasEnabledCount}`;



  const editorSections: Array<{
    key: EditorKey;
    title: string;
    value: string;
    icon: IoniconName;
  }> = [
    {
      key: "construction",
      title: t("calculator.sectionConstruction"),
      value: typeValue,
      icon: calculatorSectionIcon.construction
    },
    {
      key: "dimensions",
      title: t("calculator.sectionDimensions"),
      value: sizeLabel,
      icon: calculatorSectionIcon.dimensions
    },
    {
      key: "glazing",
      title: t("calculator.sectionGlazing"),
      value: glazingValue,
      icon: calculatorSectionIcon.glazing
    },
    {
      key: "profile",
      title: t("calculator.sectionProfile"),
      value: profileValue,
      icon: calculatorSectionIcon.profile
    },
    {
      key: "design",
      title: t("calculator.sectionDesign"),
      value: designSummaryValue,
      icon: calculatorSectionIcon.design
    },
    ...(productType === "window" || productType === "balconyBlock"
      ? [
          {
            key: "extras" as const,
            title: t("calculator.sectionExtras"),
            value: extrasValue,
            icon: calculatorSectionIcon.extras
          },
        ]
      : []),
  ];

  const renderEditorBody = (tabKey: CalcTab) => {
    switch (tabKey) {
      case "construction":
        return (
          <View style={styles.field}>
            <View style={styles.field}>
              <View
                ref={productTypeDropdownAnchorRef}
                style={styles.designDropdownAnchor}
                onLayout={(event) => {
                  const next = Math.round(event.nativeEvent.layout.height);
                  if (next > 0 && next !== productTypePickerAnchorHeight) {
                    setProductTypePickerAnchorHeight(next);
                  }
                  if (productTypePickerOpen) {
                    requestAnimationFrame(() => {
                      measureProductTypePickerAnchor();
                    });
                  }
                }}
              >
                <PickerField
                  variant="select"
                  label={t("calculator.productType")}
                  labelRightSlot={<HelpIcon onPress={() => setHelpKey("productType")} accessibilityLabel={t("calculator.productType")} />}
                  active={productTypePickerOpen}
                  rightSlot={
                    <Ionicons
                      name={productTypePickerOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  }
                  value={
                    productType === "window"
                      ? t("calculator.types.window")
                      : productType === "door"
                        ? t("calculator.types.door")
                        : t("calculator.types.balconyBlock")
                  }
                  onPress={onToggleProductTypePicker}
                />
              </View>
            </View>

            <View style={styles.field}>
              <RangeField
                label={t("calculator.width")}
                labelRightSlot={<HelpIcon onPress={() => setHelpKey("width")} accessibilityLabel={t("calculator.width")} />}
                value={width}
                onChangeText={setWidth}
                min={40}
                max={300}
                step={1}
                unit="cm"
              />
              <RangeField
                label={t("calculator.height")}
                labelRightSlot={<HelpIcon onPress={() => setHelpKey("height")} accessibilityLabel={t("calculator.height")} />}
                value={height}
                onChangeText={setHeight}
                min={40}
                max={300}
                step={1}
                unit="cm"
              />
            </View>

            {productType === "door" ? (
              <View style={styles.field}>
                <View
                  ref={doorSubtypeDropdownAnchorRef}
                  style={styles.designDropdownAnchor}
                  onLayout={(event) => {
                    const next = Math.round(event.nativeEvent.layout.height);
                    if (next > 0 && next !== doorSubtypePickerAnchorHeight) {
                      setDoorSubtypePickerAnchorHeight(next);
                    }
                    if (doorSubtypePickerOpen) {
                      requestAnimationFrame(() => {
                        measureDoorSubtypePickerAnchor();
                      });
                    }
                  }}
                >
                  <PickerField
                    variant="select"
                    label={t("calculator.doorSubtype")}
                    labelRightSlot={<HelpIcon onPress={() => setHelpKey("doorSubtype")} accessibilityLabel={t("calculator.doorSubtype")} />}
                    active={doorSubtypePickerOpen}
                    rightSlot={
                      <Ionicons
                        name={doorSubtypePickerOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={theme.colors.textMuted}
                      />
                    }
                    value={selectedDoorSubtypeOption?.label}
                    onPress={onToggleDoorSubtypePicker}
                  />
                </View>
              </View>
            ) : null}

            {productType === "window" || productType === "balconyBlock" ? (
              <View style={[styles.grid, isWide ? styles.gridWide : null]}>
                <View style={styles.gridItem}>
                  <View
                    ref={sashCountDropdownAnchorRef}
                    style={styles.designDropdownAnchor}
                    onLayout={(event) => {
                      const next = Math.round(event.nativeEvent.layout.height);
                      if (next > 0 && next !== sashCountPickerAnchorHeight) {
                        setSashCountPickerAnchorHeight(next);
                      }
                      if (sashCountPickerOpen) {
                        requestAnimationFrame(() => {
                          measureSashCountPickerAnchor();
                        });
                      }
                    }}
                  >
                    <PickerField
                      variant="select"
                      label={t("calculator.sashCount")}
                      active={sashCountPickerOpen}
                      rightSlot={
                        <Ionicons
                          name={sashCountPickerOpen ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={theme.colors.textMuted}
                        />
                      }
                      value={activeSashCountLabel}
                      onPress={onToggleSashCountPicker}
                    />
                  </View>
                </View>
              </View>
            ) : null}

            {productType === "window" || productType === "balconyBlock" ? (
              <View style={styles.field}>
                <Text style={[styles.subSectionTitle, { color: theme.colors.text }]}>
                  {t("calculator.sashesEditorTitle")}
                </Text>

                <View style={styles.sashesList}>
                  {windowSashes.slice(0, clampInt(Number(sashCount), 1, 3)).map((sash, idx) => {
                    const isExpanded = idx === activeSashIndex;
                    return (
                      <View
                        key={`sash-${idx}`}
                        style={[
                          styles.sashCard,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: isExpanded ? theme.colors.primary : theme.colors.border,
                          }
                        ]}
                      >
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setActiveSashIndex(idx);
                            if (sashOpeningPickerOpen && sashOpeningPickerSashIndex !== idx) {
                              setSashOpeningPickerOpen(false);
                            }
                          }}
                          style={({ pressed }) => [
                            styles.sashCardHeader,
                            styles.sashCardHeaderPressable,
                            pressed ? styles.sashCardHeaderPressed : null
                          ]}
                        >
                          <Text style={[styles.sashCardTitle, { color: theme.colors.text }]}>
                            {t("calculator.sashLabel", { index: idx + 1 })}
                          </Text>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={theme.colors.textMuted}
                          />
                        </Pressable>

                        {isExpanded ? (
                          <>
                            <RangeField
                              label={t("calculator.sashWidth")}
                              value={sash.widthCm}
                              onChangeText={(next) =>
                                setWindowSashes((prev) => {
                                  const desiredCount = Math.min(3, Math.max(1, Number(sashCount) || 1));
                                  const totalWidthRaw = Number(width);
                                  const totalWidthCm =
                                    Number.isFinite(totalWidthRaw) && totalWidthRaw > 0 ? Math.round(totalWidthRaw) : null;
                                  return normalizeWindowSashWidths(prev, desiredCount, totalWidthCm, idx, next);
                                })
                              }
                              min={10}
                              max={Math.max(10, Math.round(Number(width) || 300))}
                              step={1}
                              unit="cm"
                            />

                            <View style={styles.field}>
                              <View
                                ref={(node) => {
                                  sashOpeningPickerAnchorRefs.current[idx] = node;
                                }}
                                onLayout={() => {
                                  if (sashOpeningPickerOpen && sashOpeningPickerSashIndex === idx) {
                                    requestAnimationFrame(() => {
                                      measureSashOpeningPickerAnchor(idx);
                                    });
                                  }
                                }}
                              >
                                {!(productType === "balconyBlock" && idx === 0) ? (
                                  <PickerField
                                    variant="select"
                                    label={t("calculator.sashOpening")}
                                    active={sashOpeningPickerOpen && sashOpeningPickerSashIndex === idx}
                                    value={
                                      sash.opening === "turn"
                                        ? t("calculator.openingTypes.turn")
                                        : sash.opening === "tiltTurn"
                                          ? t("calculator.openingTypes.tiltTurn")
                                          : t("calculator.openingTypes.fixed")
                                    }
                                    rightSlot={
                                      <Ionicons
                                        name={sashOpeningPickerOpen && sashOpeningPickerSashIndex === idx ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color={theme.colors.textMuted}
                                      />
                                    }
                                    onPress={() => onToggleSashOpeningPicker(idx)}
                                  />
                                ) : (
                                  <PickerField
                                    variant="select"
                                    label={t("calculator.sashOpening")}
                                    active={false}
                                    value={t("calculator.openingTypes.turn")}
                                    onPress={() => {}}
                                    disabled
                                  />
                                )}
                              </View>
                            </View>


                          </>
                        ) : null}
                      </View>
                    );
                  })}
                </View>



                {draftCalcDto?.issues.errors.length ? (
                  <Text style={[styles.validationText, { color: theme.colors.danger }]}>
                    {draftCalcDto.issues.errors[0]?.message ?? t("calculator.validation.invalidConfig")}
                  </Text>
                ) : draftCalcDto?.issues.warnings.length ? (
                  <Text style={[styles.validationText, { color: theme.colors.textMuted }]}>
                    {draftCalcDto.issues.warnings[0]?.message}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {productType === "door" || productType === "balconyBlock" ? (
              <View style={styles.field}>
                <View
                  ref={doorFillDropdownAnchorRef}
                  style={styles.designDropdownAnchor}
                  onLayout={(event) => {
                    const next = Math.round(event.nativeEvent.layout.height);
                    if (next > 0 && next !== doorFillPickerAnchorHeight) {
                      setDoorFillPickerAnchorHeight(next);
                    }
                    if (doorFillPickerOpen) {
                      requestAnimationFrame(() => {
                        measureDoorFillPickerAnchor();
                      });
                    }
                  }}
                >
                  <PickerField
                    variant="select"
                    label={t("calculator.entrance.fillType")}
                    labelRightSlot={<HelpIcon onPress={() => setHelpKey("entranceFillType")} accessibilityLabel={t("calculator.entrance.fillType")} />}
                    active={doorFillPickerOpen}
                    rightSlot={
                      <Ionicons
                        name={doorFillPickerOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={theme.colors.textMuted}
                      />
                    }
                    value={selectedDoorFillOption?.label}
                    onPress={onToggleDoorFillPicker}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.field}>
              <StepperField
                label={t("calculator.quantity")}
                value={quantity}
                onChangeText={setQuantity}
                min={1}
                max={20}
                step={1}
                allowDirectEdit
              />
            </View>
          </View>
        );

      case "profile":
        {
          const profileIllustrationTitle = `${t("calculator.sectionProfile")}: ${selectedProfileModel?.label ?? "-"}`;
          const profileIllustration =
            (selectedProfileModel?.key ? profileModelPreview[selectedProfileModel.key] : undefined) ??
            profileDepthPreview[profileDepthPreviewKey as keyof typeof profileDepthPreview];

          return (
            <View style={styles.field}>
              <CalcIllustrationCard title={profileIllustrationTitle} source={profileIllustration} />

              <View style={styles.field}>
                <FieldLabel text={t("calculator.profileModel")} helpId="profileModel" />
                <View style={styles.profileAccordionList}>
                  {Object.entries(profileGroups).map(([brand, items]) => (
                    <CollapsibleSection
                      key={brand}
                      title={brand}
                      density="compact"
                      expanded={expandedProfileBrand === brand}
                      onExpandedChange={(next) => setExpandedProfileBrand(next ? brand : null)}
                    >
                      <View style={styles.profileModelGrid}>
                        {items.map((item) => {
                          const selected = selectedProfileModel?.key === item.key;
                          const metaParts = [
                            item.depthMm ? `${item.depthMm} мм` : null,
                            item.chambers ? `${item.chambers} ${t("calculator.profileChambersShort")}` : null,
                            item.thermalCoefficient ? `${t("calculator.profileThermalShort")} ${item.thermalCoefficient}` : null,
                          ].filter(Boolean);

                          return (
                            <Pressable
                              key={item.key}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => setProfileModel(item.key)}
                              style={({ pressed }) => [
                                styles.profileModelCard,
                                {
                                  borderColor: selected ? theme.colors.primary : theme.colors.border,
                                  backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                                },
                                pressed ? styles.profileModelCardPressed : null,
                              ]}
                            >
                              <Text style={[styles.profileModelTitle, { color: selected ? theme.colors.primary : theme.colors.text }]}>
                                {item.label}
                              </Text>
                              {metaParts.length ? (
                                <Text style={[styles.profileModelMeta, { color: theme.colors.textMuted }]}>
                                  {metaParts.join(" · ")}
                                </Text>
                              ) : null}
                              {item.description ? (
                                <Text style={[styles.profileModelDescription, { color: theme.colors.textMuted }]} numberOfLines={3}>
                                  {item.description}
                                </Text>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    </CollapsibleSection>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <FieldLabel text={t("calculator.glazing")} helpId="glazing" />
                <SegmentedControl
                  value={glazing}
                  onChange={setGlazing}
                  options={[
                    { value: "single", label: t("calculator.glazingOptions.single") },
                    { value: "double", label: t("calculator.glazingOptions.double") }
                  ]}
                />
              </View>

              <View
                ref={glassOptionDropdownAnchorRef}
                style={styles.designDropdownAnchor}
                onLayout={(event) => {
                  const next = Math.round(event.nativeEvent.layout.height);
                  if (next > 0 && next !== glassOptionPickerAnchorHeight) {
                    setGlassOptionPickerAnchorHeight(next);
                  }
                  if (glassOptionPickerOpen) {
                    requestAnimationFrame(() => {
                      measureGlassOptionPickerAnchor();
                    });
                  }
                }}
              >
                <PickerField
                  variant="select"
                  label={t("calculator.glassOptionType")}
                  active={glassOptionPickerOpen}
                  leftSlot={<Ionicons name="cube-outline" size={ICON_SIZE.md} color={theme.colors.primary} />}
                  rightSlot={
                    <Ionicons
                      name={glassOptionPickerOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  }
                  value={pricedGlassOptionItems.find((item) => item.value === selectedGlassOption)?.label || ""}
                  onPress={onToggleGlassOptionPicker}
                />
              </View>
            </View>
          );
        }

      case "options":
        {
          const showColorPicker = designOption !== "none";
          const designIllustrationTitle = `${t("calculator.sectionDesign")}: ${designSummaryValue}`;
          const designIllustration = designPreview[designOption];

          return (
            <View style={styles.field}>
              <CalcIllustrationCard title={designIllustrationTitle} source={designIllustration} />

              <View
                ref={designDropdownAnchorRef}
                style={styles.designDropdownAnchor}
                onLayout={(event) => {
                  const next = Math.round(event.nativeEvent.layout.height);
                  if (next > 0 && next !== designPickerAnchorHeight) {
                    setDesignPickerAnchorHeight(next);
                  }
                  if (designPickerOpen) {
                    requestAnimationFrame(() => {
                      measureDesignPickerAnchor();
                    });
                  }
                }}
              >
                <PickerField
                  variant="select"
                  label={t("calculator.sectionDesign")}
                  labelRightSlot={<HelpIcon onPress={() => setHelpKey("lamination")} accessibilityLabel={t("calculator.sectionDesign")} />}
                  active={designPickerOpen}
                  leftSlot={<Ionicons name="color-wand-outline" size={ICON_SIZE.md} color={theme.colors.primary} />}
                  rightSlot={
                    <Ionicons
                      name={designPickerOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  }
                  value={selectedDesignOptionLabel}
                  onPress={onToggleDesignPicker}
                />
              </View>

              {showColorPicker ? (
                <View style={styles.colorPicker}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>{t("calculator.laminationColor")}</Text>

                  <View style={styles.colorGrid}>
                    {(
                      [
                        { key: "gold_oak", label: t("calculator.laminationColorOptions.goldOak"), source: laminationColorPreview.gold_oak },
                        { key: "grey_oak", label: t("calculator.laminationColorOptions.greyOak"), source: laminationColorPreview.grey_oak },
                        { key: "dark_oak", label: t("calculator.laminationColorOptions.darkOak"), source: laminationColorPreview.dark_oak },
                        { key: "other", label: t("calculator.laminationColorOptions.other"), source: undefined },
                      ] as const
                    ).map((opt) => {
                      const selected = opt.key === laminationColor;

                      return (
                        <Pressable
                          key={opt.key}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          onPress={() => setLaminationColor(opt.key)}
                          style={(state) => [
                            styles.colorCard,
                            {
                              borderColor: selected ? theme.colors.primary : theme.colors.border,
                              backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                            },
                            state.pressed ? styles.colorCardPressed : null,
                          ]}
                        >
                          <View
                            style={[
                              styles.colorImageWrap,
                              { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }
                            ]}
                          >
                            {opt.source ? (
                              <Image source={opt.source} style={styles.colorImage} resizeMode="cover" />
                            ) : (
                              <View style={styles.colorPlaceholder}>
                                <Ionicons name="color-palette-outline" size={28} color={theme.colors.textMuted} />
                              </View>
                            )}
                          </View>
                          <View style={styles.colorLabelWrap}>
                            <Text
                              style={[styles.colorLabel, { color: selected ? theme.colors.primary : theme.colors.text }]}
                              numberOfLines={2}
                            >
                              {opt.label}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {!laminationColor ? (
                    <Text style={[styles.validationText, { color: theme.colors.danger }]}>
                      {t("calculator.validation.selectLaminationColor")}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {productType === "window" || productType === "balconyBlock" ? (
                <View style={[styles.grid, isWide ? styles.gridWide : null]}>
                  <View style={styles.gridItem}>
                    <View style={styles.field}>
                      <SwitchField
                        label={t("calculator.extras.decorBars")}
                        labelRightSlot={
                          <HelpIcon onPress={() => setHelpKey("decorBars")} accessibilityLabel={t("calculator.extras.decorBars")} />
                        }
                        value={decorBars === "on"}
                        valueText={optionDeltaText.decorBars}
                        onChange={(next) => setDecorBars(next ? "on" : "off")}
                      />
                      {decorBars === "on" ? (
                        <View style={styles.field}>
                          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                            {t("calculator.extras.decorBarsColor")}
                          </Text>
                          <SegmentedControl
                            value={decorBarsColor}
                            onChange={(next) => setDecorBarsColor(next as "white" | "gold" | "brown")}
                            options={[
                              { value: "white" as const, label: t("common.colors.white") },
                              { value: "gold" as const, label: t("common.colors.gold") },
                              { value: "brown" as const, label: t("common.colors.brown") },
                            ]}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : null}

              {productType === "window" || productType === "balconyBlock" ? (
                <View style={styles.field}>
                  <SwitchField
                    label={t("calculator.extras.mosquitoNet")}
                    value={mosquitoNet === "on"}
                    valueText={optionDeltaText.mosquitoNet}
                    onChange={(next) => setMosquitoNet(next ? "on" : "off")}
                  />
                  <SwitchField
                    label={t("calculator.extras.windowSill")}
                    value={windowSill === "on"}
                    valueText={optionDeltaText.windowSill}
                    onChange={(next) => setWindowSill(next ? "on" : "off")}
                  />
                  {windowSill === "on" ? (
                    <RangeField
                      label={t("calculator.extras.windowSillWidth")}
                      value={windowSillWidthCm}
                      onChangeText={setWindowSillWidthCm}
                      min={5}
                      max={50}
                      step={1}
                      unit="cm"
                    />
                  ) : null}
                  <SwitchField
                    label={t("calculator.extras.dripEdge")}
                    value={dripEdge === "on"}
                    valueText={optionDeltaText.dripEdge}
                    onChange={(next) => setDripEdge(next ? "on" : "off")}
                  />
                  {dripEdge === "on" ? (
                    <View style={styles.field}>
                      <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                        {t("calculator.extras.dripEdgeWidth")}
                      </Text>
                      <SegmentedControl
                        value={dripEdgeWidthCm}
                        onChange={setDripEdgeWidthCm}
                        options={[
                          { value: "6" as const, label: "6" },
                          { value: "9" as const, label: "9" },
                          { value: "11" as const, label: "11" },
                          { value: "13" as const, label: "13" },
                        ]}
                      />
                    </View>
                  ) : null}
                  <SwitchField
                    label={t("calculator.extras.casing")}
                    value={casing === "on"}
                    valueText={optionDeltaText.casing}
                    onChange={(next) => setCasing(next ? "on" : "off")}
                  />
                </View>
              ) : null}
            </View>
          );
        }

      case "summary":
        return (
          <View style={styles.field}>
            <Text style={[styles.subSectionTitle, { color: theme.colors.text, marginBottom: spacing.xs }]}>
              {t("calculator.summaryTitle", { defaultValue: "Параметры изделия" })}
            </Text>

            <View style={styles.orderTotalsWrap}>
              <View style={styles.orderTotalsRow}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{t("calculator.productType")}</Text>
                <Text style={[styles.accordionSectionValue, { color: theme.colors.text }]}>{typeValue}</Text>
              </View>
              <View style={styles.orderTotalsRow}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{t("calculator.sectionDimensions")}</Text>
                <Text style={[styles.accordionSectionValue, { color: theme.colors.text }]}>{sizeLabel} ({quantity} шт.)</Text>
              </View>
              <View style={styles.orderTotalsRow}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{t("calculator.sectionProfile")}</Text>
                <Text style={[styles.accordionSectionValue, { color: theme.colors.text }]} numberOfLines={2}>{profileValue}</Text>
              </View>
              <View style={styles.orderTotalsRow}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{t("calculator.sectionGlazing")}</Text>
                <Text style={[styles.accordionSectionValue, { color: theme.colors.text }]}>{glazingValue}</Text>
              </View>
              {designOption !== "none" ? (
                <View style={styles.orderTotalsRow}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{t("calculator.sectionDesign")}</Text>
                  <Text style={[styles.accordionSectionValue, { color: theme.colors.text }]}>{designSummaryValue}</Text>
                </View>
              ) : null}
              {(productType === "window" || productType === "balconyBlock") && extrasEnabledCount > 0 ? (
                <View style={styles.orderTotalsRow}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{t("calculator.sectionExtras")}</Text>
                  <Text style={[styles.accordionSectionValue, { color: theme.colors.text }]}>{extrasValue} опц.</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.subSectionTitle, { color: theme.colors.text, marginTop: spacing.md, marginBottom: spacing.xs }]}>
              {t("calculator.breakdown.title", { defaultValue: "Состав сметы" })}
            </Text>

            <PriceBreakdownList breakdown={draftBreakdown} currency={currency} />

            <Text style={[styles.disclaimer, { color: theme.colors.textMuted, marginTop: spacing.sm, textAlign: "center", fontStyle: "italic" }]}>
              {t("calculator.disclaimer")}
            </Text>
          </View>
        );
    }
  };

  const currentStepTitle = useMemo(() => {
    switch (activeEditorKey) {
      case "construction":
        return t("calculator.sectionConstruction");
      case "profile":
        return t("calculator.sectionProfile");
      case "design":
        return t("calculator.sectionDesign");
      case "summary":
        return t("calculator.summaryTitle", { defaultValue: "Итог" });
      default:
        return "";
    }
  }, [activeEditorKey, t]);

  const tabsConfigList: Array<{ key: CalcTab; label: string; icon: IoniconName }> = [
    { key: "construction", label: t("calculator.sectionConstruction"), icon: calculatorSectionIcon.construction },
    { key: "profile", label: t("calculator.sectionProfile"), icon: calculatorSectionIcon.profile },
    { key: "options", label: t("calculator.sectionExtras"), icon: calculatorSectionIcon.extras },
    { key: "summary", label: t("calculator.summaryTitle", { defaultValue: "Итог" }), icon: "receipt-outline" },
  ];

  const tabSelectorHeader = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: "row",
        gap: spacing.sm,
        paddingHorizontal: spacing.xs,
        paddingBottom: spacing.xs,
      }}
      style={{ marginBottom: spacing.xs }}
    >
      {tabsConfigList.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            onPress={() => setActiveTab(tab.key)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: spacing.sm - 2,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: isActive ? theme.colors.primary : theme.colors.border,
                backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surface,
                gap: 6,
              },
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Ionicons name={tab.icon} size={16} color={isActive ? theme.colors.primary : theme.colors.textMuted} />
            <Text style={{ fontSize: 13, ...font(isActive ? 800 : 700), color: isActive ? theme.colors.primary : theme.colors.text }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const editorTabsBlock = (
    <View style={styles.editorTabsBlock}>
      {tabSelectorHeader}
      <Card variant="glass">
        <Animated.View style={animatedStepStyle}>
          {renderEditorBody(activeTab)}
        </Animated.View>
      </Card>
    </View>
  );

  const desktopStickyTop =
    theme.layout.desktopNavHeight + theme.layout.desktopNavGapTop + theme.layout.desktopNavGapBottom + spacing.sm;

  const previewCard = (
    <Card variant="solid" style={[styles.card, isDesktopWeb ? styles.cardCompact : null]}>

      <ProductPreview
        kind={productType}
        widthCm={Number(width)}
        heightCm={Number(height)}
        canvasHeight={isDesktopWeb && (productType === "window" || productType === "balconyBlock") ? 744 : 372}
        sashCount={Number(sashCount)}
        openingSashes={Number(openingSashes)}
        openingType={openingType}
        sashes={previewWindowSashes}
        doorSubtype={productType === "door" ? doorSubtype : undefined}
        doorFillTop={productType === "door" || productType === "balconyBlock" ? doorFillTop : undefined}
        doorFillBottom={productType === "door" || productType === "balconyBlock" ? doorFillBottom : undefined}
        doorHandleSide={productType === "door" || productType === "balconyBlock" ? doorHandleSide : undefined}
        profileDepthMm={selectedProfileModel?.depthMm ?? selectedProfileModel?.legacyDepthMm ?? 70}
        glazing={glazing}
        lamination={lamination}
        laminationGroup={laminationGroup}
        laminationColor={lamination !== "none" ? laminationColor : null}
        decorBars={(productType === "window" || productType === "balconyBlock") && decorBars === "on"}
        decorBarsColor={decorBarsColor}
        glassOptions={calcInput.glassOptions}
        onChangeWidthCm={setWidth}
        onChangeHeightCm={setHeight}
        onPressSash={(idx) => {
          setActiveSashIndex(idx);
          if (activeTab !== "construction") {
            setActiveTab("construction");
          }
          requestAnimationFrame(() => {
            onToggleSashOpeningPicker(idx);
          });
        }}
        activeSashIndex={activeSashIndex}
      />

    </Card>
  );

  const calculateButton = (
    <PrimaryButton
      title={t("calculator.calculate")}
      onPress={onCalculate}
      disabled={
        Boolean(draftCalcDto?.issues.errors.length) ||
        (designOption !== "none" && !laminationColor)
      }
      leftSlot={<Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />}
    />
  );

  const addToCartButton = (
    <PrimaryButton
      title={t("calculator.addToOrder", { defaultValue: "Добавить изделие" })}
      onPress={onAddToOrder}
      disabled={
        !hasCalculated ||
        Boolean(draftCalcDto?.issues.errors.length) ||
        (designOption !== "none" && !laminationColor) ||
        draftTotal <= 0 ||
        orderItems.length >= 20
      }
      leftSlot={<Ionicons name="cart-outline" size={18} color="#FFFFFF" />}
    />
  );

  const totalCard = (
    <Card
      variant="solid"
      style={[
        styles.totalBlock,
        isDesktopWeb ? styles.totalBlockCompact : null,
        {
          padding: 0,
          borderWidth: 0,
          overflow: "hidden",
          backgroundColor: "transparent",
        }
      ]}
      elevated={false}
      padded={false}
    >
      <LinearGradient
        colors={theme.isDark ? ["rgba(224, 94, 38, 0.22)", "rgba(194, 65, 12, 0.12)"] : ["rgba(255, 115, 22, 0.14)", "rgba(217, 82, 30, 0.05)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: spacing.md }}
      >
        <Text style={[styles.totalLabel, { color: theme.colors.textMuted, fontSize: 13, marginBottom: 2 }]}>
          {t("product.priceFrom")}
        </Text>
        <Text style={[styles.totalValue, { color: theme.colors.primary, fontSize: 28, lineHeight: 34 }]}> 
          {formatMoney(calculatedTotal ?? draftTotal, currency)}
        </Text>
      </LinearGradient>
    </Card>
  );

  const isLastStep = activeTab === "summary";
  const isFirstStep = activeTab === "construction";

  const handleBack = () => {
    const idx = tabsList.indexOf(activeTab);
    if (idx > 0) {
      setActiveTab(tabsList[idx - 1]);
    }
  };

  const handleNext = () => {
    if (activeTab === "options" && designOption !== "none" && !laminationColor) {
      Alert.alert(t("calculator.title"), t("calculator.validation.selectLaminationColor"));
      return;
    }

    const idx = tabsList.indexOf(activeTab);
    if (idx < tabsList.length - 1) {
      setActiveTab(tabsList[idx + 1]);
    }
  };

  const isNextDisabled = useMemo(() => {
    if (activeTab === "options" && designOption !== "none" && !laminationColor) {
      return true;
    }
    if (draftCalcDto?.issues.errors.length) {
      return true;
    }
    if (draftTotal <= 0) {
      return true;
    }
    return false;
  }, [activeTab, designOption, laminationColor, draftCalcDto, draftTotal]);

  const isAddDisabled = useMemo(() => {
    if (draftCalcDto?.issues.errors.length) {
      return true;
    }
    if (designOption !== "none" && !laminationColor) {
      return true;
    }
    if (draftTotal <= 0) {
      return true;
    }
    if (orderItems.length >= 20) {
      return true;
    }
    return false;
  }, [draftCalcDto, designOption, laminationColor, draftTotal, orderItems.length]);

  const actionControls = (isDesktop: boolean) => {
    return (
      <View style={[styles.actionControlsRow, isDesktop ? styles.actionControlsDesktop : null]}>
        {!isFirstStep && (
          <Pressable
            accessibilityRole="button"
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              pressed ? styles.backButtonPressed : null
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            <Text style={[styles.backButtonText, { color: theme.colors.text }]}>
              {t("common.back", { defaultValue: "Назад" })}
            </Text>
          </Pressable>
        )}

        {isLastStep ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAddToOrder}
            disabled={isAddDisabled}
            style={({ pressed }) => [
              styles.primaryActionButton,
              { backgroundColor: theme.colors.success },
              isAddDisabled ? styles.actionButtonDisabled : null,
              pressed ? styles.actionButtonPressed : null
            ]}
          >
            <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionButtonText}>
              {t("calculator.addToOrder", { defaultValue: "В заказ" })}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={handleNext}
            disabled={isNextDisabled}
            style={({ pressed }) => [
              styles.primaryActionButton,
              { backgroundColor: theme.colors.primary },
              isNextDisabled ? styles.actionButtonDisabled : null,
              pressed ? styles.actionButtonPressed : null
            ]}
          >
            <Text style={styles.primaryActionButtonText}>
              {t("common.next", { defaultValue: "Далее" })}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </Pressable>
        )}
      </View>
    );
  };

  const livePriceBlock = (isDesktop: boolean) => {
    return (
      <Card
        variant="solid"
        style={[
          styles.totalBlock,
          isDesktop ? styles.totalBlockCompact : null,
          {
            padding: 0,
            borderWidth: 0,
            overflow: "hidden",
            backgroundColor: "transparent",
            flex: isDesktop ? undefined : 1,
          }
        ]}
        elevated={false}
        padded={false}
      >
        <LinearGradient
          colors={theme.isDark ? ["rgba(224, 94, 38, 0.22)", "rgba(194, 65, 12, 0.12)"] : ["rgba(255, 115, 22, 0.14)", "rgba(217, 82, 30, 0.05)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.md, justifyContent: "center" }}
        >
          <Text style={[styles.totalLabel, { color: theme.colors.textMuted, fontSize: 11, marginBottom: 1 }]}>
            {t("product.priceFrom")}
          </Text>
          <Text style={[styles.totalValue, { color: theme.colors.primary, fontSize: 22, lineHeight: 26, ...font(800) }]}>
            {formatMoney(draftTotal, currency)}
          </Text>
        </LinearGradient>
      </Card>
    );
  };

  const mobileStickyBottomBar = (
    <View
      style={[
        styles.mobileStickyBottomBar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        }
      ]}
    >
      <View style={styles.mobileStickyBottomBarInner}>
        {livePriceBlock(false)}
        {actionControls(false)}
      </View>
    </View>
  );

	  return (
	    <ScreenContainer>
	      <>
		        <AppScrollView
              trackNavGlass
              contentContainerStyle={[styles.container, isDesktopWeb ? styles.containerDesktop : null]}
              keyboardShouldPersistTaps="handled"
            >
              <View style={desktopContent}>
                <PromoBanners placement="catalog" />
              </View>
              <View style={desktopContent}>
                <ScreenHeader title={t("calculator.title")} subtitle={t("calculator.subtitle")} />
              </View>

	              {isDesktopWeb ? (
	                <View style={desktopContent}>
	                  <View style={styles.desktopColumns}>
	                    <View style={styles.desktopLeft}>
	                      <View
	                        style={[
	                          styles.desktopSticky,
	                          ({
	                            position: "sticky",
	                            top: desktopStickyTop
	                          } as object)
	                        ]}
	                      >
	                        {previewCard}
	                        {livePriceBlock(true)}
	                        {actionControls(true)}
	                      </View>
	                    </View>

	                    <View style={styles.desktopRight}>
	                      <View style={styles.desktopSections}>{editorTabsBlock}</View>
	                    </View>
	                  </View>
	                </View>
	              ) : (
                <>
                  <View style={desktopContent}>{previewCard}</View>
                  <View style={desktopContent}>{editorTabsBlock}</View>
                </>
              )}

	              <View style={[desktopContent, styles.footerWrap, isDesktopWeb ? ({ marginTop: "auto" } as any) : null]}>
	                <SiteFooter gutter={spacing.md} />
	              </View>
	        </AppScrollView>
          {!isDesktopWeb ? mobileStickyBottomBar : null}
          <SelectListModal
            mounted={productTypePickerMounted}
            open={productTypePickerOpen}
            onClose={() => setProductTypePickerOpen(false)}
            options={productTypeOptionItems}
            value={productType}
            onSelect={(next) => {
              setProductType(next as any);
              setProductTypePickerOpen(false);
            }}
            top={productTypeMenuTop}
            left={productTypeMenuLeft}
            width={productTypeMenuWidth}
            maxHeight={productTypeMenuMaxHeight}
            animatedStyle={productTypePickerAnimatedStyle}
            showVerticalScrollIndicator={productTypeOptionItems.length > 5}
          />
          <SelectListModal
            mounted={doorSubtypePickerMounted}
            open={doorSubtypePickerOpen}
            onClose={() => setDoorSubtypePickerOpen(false)}
            options={doorSubtypeOptionItems}
            value={doorSubtype}
            onSelect={(next) => {
              setDoorSubtype(next as any);
              setDoorSubtypePickerOpen(false);
            }}
            top={doorSubtypeMenuTop}
            left={doorSubtypeMenuLeft}
            width={doorSubtypeMenuWidth}
            maxHeight={doorSubtypeMenuMaxHeight}
            animatedStyle={doorSubtypePickerAnimatedStyle}
            showVerticalScrollIndicator={doorSubtypeOptionItems.length > 5}
          />
          <SelectListModal
            mounted={doorFillPickerMounted}
            open={doorFillPickerOpen}
            onClose={() => setDoorFillPickerOpen(false)}
            options={doorFillOptionItems}
            value={doorFill}
            onSelect={(next) => {
              if (next === "glass") {
                setDoorFillTop("glass");
                setDoorFillBottom("glass");
              } else if (next === "sandwich") {
                setDoorFillTop("sandwich");
                setDoorFillBottom("sandwich");
              } else if (next === "combined") {
                setDoorFillTop("glass");
                setDoorFillBottom("sandwich");
              }
              setDoorFillPickerOpen(false);
            }}
            top={doorFillMenuTop}
            left={doorFillMenuLeft}
            width={doorFillMenuWidth}
            maxHeight={doorFillMenuMaxHeight}
            animatedStyle={doorFillPickerAnimatedStyle}
            showVerticalScrollIndicator={doorFillOptionItems.length > 5}
          />
          <SelectListModal
            mounted={designPickerMounted}
            open={designPickerOpen}
            onClose={() => setDesignPickerOpen(false)}
            options={designOptionItems}
            value={designOption}
            onSelect={(next) => {
              setDesignOption(next);
              setDesignPickerOpen(false);
            }}
            top={designMenuTop}
            left={designMenuLeft}
            width={designMenuWidth}
            maxHeight={designMenuMaxHeight}
            animatedStyle={designPickerAnimatedStyle}
            showVerticalScrollIndicator={designOptionItems.length > 5}
          />
          <SelectListModal
            mounted={sashOpeningPickerMounted}
            open={sashOpeningPickerOpen}
            onClose={() => setSashOpeningPickerOpen(false)}
            options={sashOpeningOptionItems}
            value={sashOpeningPickerCurrentValue}
            onSelect={(next) => {
              if (sashOpeningPickerSashIndex !== null) {
                applySashOpening(sashOpeningPickerSashIndex, next);
              }
              setSashOpeningPickerOpen(false);
            }}
            top={sashOpeningMenuTop}
            left={sashOpeningMenuLeft}
            width={sashOpeningMenuWidth}
            maxHeight={sashOpeningMenuMaxHeight}
            animatedStyle={sashOpeningPickerAnimatedStyle}
          />
          <SelectListModal
            mounted={glassOptionPickerMounted}
            open={glassOptionPickerOpen}
            onClose={() => setGlassOptionPickerOpen(false)}
            options={pricedGlassOptionItems}
            value={selectedGlassOption}
            onSelect={(next) => {
              setSelectedGlassOption(next as any);
              setGlassOptionPickerOpen(false);
            }}
            top={glassOptionMenuTop}
            left={glassOptionMenuLeft}
            width={glassOptionMenuWidth}
            maxHeight={glassOptionMenuMaxHeight}
            animatedStyle={glassOptionPickerAnimatedStyle}
            showVerticalScrollIndicator={pricedGlassOptionItems.length > 5}
          />
          <SelectListModal
            mounted={sashCountPickerMounted}
            open={sashCountPickerOpen}
            onClose={() => setSashCountPickerOpen(false)}
            options={sashCountOptionItems}
            value={sashCount}
            onSelect={(next) => {
              setSashCount(next as SashCount);
              setSashCountPickerOpen(false);
            }}
            top={sashCountMenuTop}
            left={sashCountMenuLeft}
            width={sashCountMenuWidth}
            maxHeight={sashCountMenuMaxHeight}
            animatedStyle={sashCountPickerAnimatedStyle}
            showVerticalScrollIndicator={sashCountOptionItems.length > 5}
          />
	        <HelpModal
	          open={helpKey !== null}
	          title={helpTitle}
	          body={helpBody}
          closeLabel={t("common.close")}
          onClose={() => setHelpKey(null)}
        />
	      </>
	    </ScreenContainer>
	  );
  }

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: 84
  },
  containerDesktop: {
    padding: spacing.sm,
    gap: spacing.sm,
    paddingBottom: 0
  },
  progressHeaderContainer: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  progressLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  progressSubtitle: {
    ...font(700),
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  progressTitle: {
    ...font(900),
    fontSize: 16,
  },
  progressBarRow: {
    flexDirection: "row",
    height: 6,
    gap: 6,
    alignItems: "center",
    width: "100%",
    marginTop: 4,
  },
  progressBarSegment: {
    flex: 1,
    height: "100%",
    borderRadius: 3,
    ...( { cursor: "pointer" } as object ),
  },
  progressBarSegmentActive: {},
  mobileStickyBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 16,
    zIndex: 99,
  },
  mobileStickyBottomBarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  actionControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionControlsDesktop: {
    width: "100%",
    marginTop: spacing.xs,
  },
  backButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    ...( { cursor: "pointer" } as object )
  },
  backButtonPressed: {
    opacity: 0.8,
  },
  backButtonText: {
    ...font(700),
    fontSize: 14,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    gap: 6,
    minWidth: 110,
    ...( { cursor: "pointer" } as object )
  },
  actionButtonPressed: {
    opacity: 0.9,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  primaryActionButtonText: {
    color: "#FFFFFF",
    ...font(800),
    fontSize: 14,
  },
  desktopContent: {
    width: "100%",
    maxWidth: 1100,
    alignSelf: "center"
  },
  card: {
    gap: spacing.sm
  },
  cardCompact: {
    padding: spacing.sm,
    gap: spacing.xs
  },
  desktopColumns: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  desktopLeft: {
    width: 420,
    flexShrink: 0
  },
  desktopRight: {
    flex: 1,
    minWidth: 0
  },
  desktopSticky: {
    width: "100%",
    gap: spacing.sm
  },
  desktopSections: {
    gap: spacing.sm
  },
  editorTabsBlock: {
    gap: spacing.sm
  },
  designSection: {
    gap: spacing.sm
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  cardTitleIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
	  sectionTitle: {
	    ...font(900),
	    fontSize: 14,
	    letterSpacing: 0.2
	  },
  grid: {
    gap: spacing.sm
  },
  gridWide: {
    flexDirection: "row"
  },
  gridItem: {
    flex: 1,
    gap: spacing.sm
  },
	  field: {
	    gap: spacing.sm
	  },
	  fieldLabelRow: {
	    flexDirection: "row",
	    alignItems: "center",
	    gap: spacing.xs,
	    flexWrap: "wrap"
	  },
	  fieldLabel: {
		    ...font(600),
		    fontSize: 13,
		  },
  sashesList: {
    gap: spacing.sm
  },
  sashCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.sm,
    gap: spacing.sm
  },
  sashCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sashCardHeaderPressable: {
    minHeight: 34,
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  sashCardHeaderPressed: {
    opacity: 0.9
  },
  sashCardTitle: {
    ...font(900),
    fontSize: 12,
    letterSpacing: 0.2
  },
  colorPicker: {
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  designDropdownAnchor: {
    position: "relative"
  },
  profileAccordionList: {
    gap: spacing.sm,
  },
  profileModelGrid: {
    flexDirection: "column",
    gap: spacing.sm,
  },
  profileModelCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 6,
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  profileModelCardPressed: {
    opacity: 0.94,
  },
  profileModelTitle: {
    ...font(800),
    fontSize: 13,
    lineHeight: 17,
  },
  profileModelMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  profileModelDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  colorCard: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  colorCardPressed: {
    opacity: 0.92
  },
  colorImageWrap: {
    height: 88,
    borderBottomWidth: 1,
    overflow: "hidden"
  },
  colorImage: {
    width: "100%",
    height: "100%"
  },
  colorPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  colorLabelWrap: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  colorLabel: {
    ...font(800),
    fontSize: 12,
    lineHeight: 16
  },
  validationText: {
    ...font(600),
    fontSize: 12
  },
  illustrationCard: {
    overflow: "hidden"
  },
  illustrationCardInner: {
    padding: spacing.md,
    gap: spacing.sm
  },
  illustrationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "flex-start"
  },
  illustrationTitle: {
    ...font(800),
    fontSize: 13,
    flex: 1
  },
  illustrationImageWrap: {
    overflow: "hidden"
  },
  illustrationImage: {
    width: "100%",
    height: "100%"
  },
	  previewHint: {
	    fontSize: 12,
	    lineHeight: 16
	  },
	  previewChips: {
	    flexDirection: "row",
	    flexWrap: "wrap",
	    gap: spacing.xs
	  },
	  previewChip: {
	    alignSelf: "flex-start",
	    flexDirection: "row",
	    alignItems: "center",
	    gap: spacing.xs,
	    paddingHorizontal: spacing.sm,
	    paddingVertical: 6,
	    borderRadius: 999,
	    borderWidth: 1
	  },
	  previewChipText: {
	    fontSize: 12,
	    lineHeight: 14,
	    flexShrink: 1
	  },
		  previewChipLabel: {
		    ...font(700)
		  },
		  previewChipValue: {
		    ...font(800)
		  },
	  previewOptionsText: {
	    fontSize: 12,
	    lineHeight: 16
	  },
  orderList: {
    gap: spacing.xs
  },
  orderRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs
  },
  orderRowText: {
    flex: 1,
    ...font(700),
    fontSize: 12,
    lineHeight: 16
  },
  orderRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  orderRowPrice: {
    ...font(800),
    fontSize: 12
  },
  orderRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  orderRemoveBtnPressed: {
    opacity: 0.72
  },
  orderEmptyText: {
    fontSize: 12,
    lineHeight: 16
  },
  orderTotalsWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
    gap: spacing.xs
  },
  orderTotalsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  orderTotalsLabel: {
    ...font(700),
    fontSize: 12
  },
  orderTotalsValue: {
    ...font(800),
    fontSize: 12
  },
	  totalBlock: {
	    gap: spacing.xs
	  },
	  totalBlockCompact: {
	    padding: spacing.sm
	  },
	  totalLabel: {
	    ...font(700)
	  },
	  totalValue: {
	    ...font(800),
	    fontSize: 24
	  },
  breakdownList: {
    marginTop: spacing.xs,
  },
  promoNote: {
    fontSize: 12,
    marginTop: 2
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 16
  },
  characteristicsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  characteristicsItem: {
    width: "100%"
  },
  characteristicsItemWide: {
    width: "48%"
  },
  accordionSectionValue: {
    ...font(700),
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 160,
    textAlign: "right"
  },
  footerWrap: {
    paddingTop: spacing.lg * 1.9
  },
  subSectionTitle: {
    ...font(900),
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase"
  }
});
