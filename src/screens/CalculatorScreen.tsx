import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
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
import { AppScrollView } from "../components/AppScrollView";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { HelpIcon } from "../components/HelpIcon";
import { HelpModal } from "../components/HelpModal";
import { ProductPreview } from "../components/ProductPreview";
import { PromoBanners } from "../components/PromoBanners";
import { PickerField } from "../components/PickerField";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { SegmentedControl } from "../components/SegmentedControl";
import { SiteFooter } from "../components/SiteFooter";
import { StepperField } from "../components/StepperField";
import { SwitchField } from "../components/SwitchField";
import { RootStackParamList, type QuoteOrderItemDraft } from "../navigation/types";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { ICON_SIZE, calculatorSectionIcon } from "../theme/iconography";
import { formatMoney } from "../utils/money";
import { useCurrencyControls } from "../services/currency-context";
import { useCart } from "../services/cart-context";
import { fetchCalcConfig } from "../services/calc-config";
import { CalcInput, calculateQuote, type HandleSide, type LaminationColor, type SashOpening } from "../utils/calc";
import { designPreview, glazingPreview, laminationColorPreview, profileDepthPreview } from "../assets/calc-previews";
import { radius } from "../theme/tokens";

function cloneCalcInput(input: CalcInput): CalcInput {
  return JSON.parse(JSON.stringify(input)) as CalcInput;
}


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

  type Toggle = "off" | "on";
  type SashCount = "1" | "2" | "3";
  type OpeningSashes = "0" | "1" | "2" | "3";
  type IoniconName = ComponentProps<typeof Ionicons>["name"];
  type DesignOption = "none" | "outside" | "inside" | "twoSideWhite" | "twoSideColor";
  type EditorKey = "dimensions" | "construction" | "profile" | "glazing" | "design" | "extras";

  const [openEditorKey, setOpenEditorKey] = useState<EditorKey | null>(null);

  useFocusEffect(
    useCallback(() => {
      setOpenEditorKey(null);
    }, [])
  );

  const [width, setWidth] = useState("120");
  const [height, setHeight] = useState("140");
  const [quantity, setQuantity] = useState("1");
  const presetProductType = route.params?.presetProductType;
  const [productType, setProductType] = useState<"window" | "door">(() => presetProductType ?? "window");
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
  const [hardwareKey, setHardwareKey] = useState<string | null>(null);
  const [hardwareLabel, setHardwareLabel] = useState<string | null>(null);

  const [profileSeries, setProfileSeries] = useState<"bautex" | "kbe" | "rehau">("kbe");
  const [profileDepthMm, setProfileDepthMm] = useState<"60" | "70" | "85">("70");

  const [glazing, setGlazing] = useState<"single" | "double">("double");
  const [energySaving, setEnergySaving] = useState<Toggle>("off");
  const [multiFunctional, setMultiFunctional] = useState<Toggle>("off");

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

  // Extras
  const [mosquitoNet, setMosquitoNet] = useState<Toggle>("off");
  const [windowSill, setWindowSill] = useState<Toggle>("off");
  const [windowSillWidthCm, setWindowSillWidthCm] = useState("20");
  const [dripEdge, setDripEdge] = useState<Toggle>("off");
  const [dripEdgeWidthCm, setDripEdgeWidthCm] = useState<"6" | "9" | "11" | "13">("9");
  const [casing, setCasing] = useState<Toggle>("off");
  const [decorBars, setDecorBars] = useState<Toggle>("off");
  const [decorBarsColor, setDecorBarsColor] = useState<"white" | "gold">("white");

  const orderItemSeqRef = useRef(1);
  const { items: orderItems, addItem } = useCart();
  const { currency } = useCurrencyControls();
  const [hasCalculated, setHasCalculated] = useState(false);
  const [calculatedTotal, setCalculatedTotal] = useState<number | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const calcTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [helpKey, setHelpKey] = useState<string | null>(null);

  const calcConfigQuery = useQuery({ queryKey: ["calc_config"], queryFn: fetchCalcConfig });

  const hardwareCatalog = useMemo(() => {
    const raw = calcConfigQuery.data?.uiCatalog?.hardwareOptions;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        const key = typeof item?.key === "string" ? item.key.trim().toLowerCase() : "";
        const label = typeof item?.label === "string" ? item.label.trim() : "";
        const enabled = item?.enabled !== false;
        if (!enabled || !key || !label) return null;
        return { key, label };
      })
      .filter((v): v is { key: string; label: string } => Boolean(v));
  }, [calcConfigQuery.data]);

  useEffect(() => {
    if (!hardwareCatalog.length) {
      if (hardwareKey !== null) setHardwareKey(null);
      if (hardwareLabel !== null) setHardwareLabel(null);
      return;
    }

    const currentKey = typeof hardwareKey === "string" ? hardwareKey.trim().toLowerCase() : "";
    const matched = currentKey ? hardwareCatalog.find((opt) => opt.key === currentKey) : null;
    const selected = matched ?? hardwareCatalog[0];

    if (selected.key !== currentKey) setHardwareKey(selected.key);
    if (selected.label !== hardwareLabel) setHardwareLabel(selected.label);
  }, [hardwareCatalog, hardwareKey, hardwareLabel]);

  useEffect(() => {
    return () => {
      if (calcTimerRef.current) {
        clearTimeout(calcTimerRef.current);
        calcTimerRef.current = null;
      }
    };
  }, []);

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
    if (productType !== "window") return;

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
        .map((item) => {
          const opening = normalizeOpening((item as any)?.opening);
          const side = normalizeHandleSide((item as any)?.handleSide);
          return {
            widthCm: typeof item?.widthCm === "string" ? item.widthCm : String((item as any)?.widthCm ?? ""),
            opening,
            handleSide: opening === "fixed" ? undefined : (side ?? "right"),
          };
        });

      while (next.length < desiredCount) {
        next.push({
          widthCm: totalWidthCm ? String(Math.round(totalWidthCm / desiredCount)) : "40",
          opening: "fixed",
          handleSide: undefined,
        });
      }

      return normalizeWindowSashWidths(next, desiredCount, totalWidthCm);
    });
  }, [productType, sashCount, width]);

  useEffect(() => {
    if (productType !== "window") return;
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
    if (openEditorKey !== "design" && designPickerOpen) {
      setDesignPickerOpen(false);
    }
  }, [designPickerOpen, openEditorKey]);

  useEffect(() => {
    if (openEditorKey !== "construction" && sashOpeningPickerOpen) {
      setSashOpeningPickerOpen(false);
    }
  }, [openEditorKey, sashOpeningPickerOpen]);

  useEffect(() => {
    if (productType !== "window" && sashOpeningPickerOpen) {
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

    requestAnimationFrame(() => {
      measureDesignPickerAnchor();
      setDesignPickerOpen(true);
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

    // Window extras
    if (productType === "window") {
      if (mosquitoNet === "on") nextOptions.push("mosquito_net");
      if (windowSill === "on") nextOptions.push("window_sill");
      if (dripEdge === "on") nextOptions.push("drip_edge");
      if (casing === "on") nextOptions.push("casing");
      if (decorBars === "on") nextOptions.push("decor_bars");
    }

    const normalizedHardwareKey = typeof hardwareKey === "string" ? hardwareKey.trim().toLowerCase() : "";
    const normalizedHardwareLabel = typeof hardwareLabel === "string" ? hardwareLabel.trim() : "";
    if (normalizedHardwareKey) nextOptions.push(normalizedHardwareKey);
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
      const clamped = Math.min(50, Math.max(5, safe));
      const stepped = Math.round(clamped / 5) * 5;
      return Math.min(50, Math.max(5, stepped));
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
      productType === "window"
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
      productType === "window" && windowSill === "on" ? normalizeWindowSillWidthCm(windowSillWidthCm) : undefined;
    const dripEdgeWidthCmValue =
      productType === "window" && dripEdge === "on" ? normalizeDripEdgeWidthCm(dripEdgeWidthCm) : undefined;
    const decorBarsColorValue = productType === "window" && decorBars === "on" ? decorBarsColor : undefined;

    return {
      width: Number(width) / 100,
      height: Number(height) / 100,
      quantity: Number(quantity),
      productType,
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
      hardwareKey: normalizedHardwareKey || undefined,
      hardwareLabel: normalizedHardwareKey ? (normalizedHardwareLabel || undefined) : undefined,

      profileSeries,
      profileDepthMm: Number(profileDepthMm),
      glazing,
      glassOptions: {
        energySaving: energySaving === "on",
        multiFunctional: multiFunctional === "on"
      },
      lamination,
      laminationGroup,
      laminationSide,
      laminationColor: lamination !== "none" ? (laminationColor ?? undefined) : undefined,

      entranceOptions:
        productType === "door"
          ? {
              fillTop: doorFillTop,
              fillBottom: doorFillBottom,
              ...(doorFillTop === doorFillBottom ? { fillType: doorFillTop } : {}),
            }
          : undefined,
    };
  }, [
    decorBars,
    decorBarsColor,
    doorHandleSide,
    doorSubtype,
    dripEdge,
    dripEdgeWidthCm,
    energySaving,
    doorFillTop,
    doorFillBottom,
    glazing,
    height,
    casing,
    designOption,
    hardwareKey,
    hardwareLabel,
    laminationColor,
    mosquitoNet,
    multiFunctional,
    openingSashes,
    openingType,
    productType,
    profileDepthMm,
    profileSeries,
    quantity,
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

  useEffect(() => {
    setHasCalculated(false);
    setCalculatedTotal(null);
    setCalcLoading(false);
    if (calcTimerRef.current) {
      clearTimeout(calcTimerRef.current);
      calcTimerRef.current = null;
    }
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
    if (calcLoading) return;
    if (!validateDraftForOrder()) return;

    const nextTotal = draftTotal;
    if (!Number.isFinite(nextTotal) || nextTotal <= 0) {
      Alert.alert(t("calculator.title"), t("calculator.validation.invalidConfig"));
      return;
    }

    setCalcLoading(true);
    if (calcTimerRef.current) {
      clearTimeout(calcTimerRef.current);
      calcTimerRef.current = null;
    }

    calcTimerRef.current = setTimeout(() => {
      calcTimerRef.current = null;
      setCalculatedTotal(nextTotal);
      setHasCalculated(true);
      setCalcLoading(false);
    }, 3000);
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
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
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
                borderColor: theme.colors.border,
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

  const windowSashSpecs = productType === "window" && Array.isArray(calcInput.sashes) ? calcInput.sashes : null;
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
    : productType === "window" && windowSashSpecs && windowSashSpecs.length
      ? windowSashSpecs.length
      : clampInt(Number(sashCount), 1, 3);

  const previewOpeningSashes = isEntranceLikeDoor
    ? 1
    : productType === "window" && windowSashSpecs
      ? windowSashSpecs.reduce((acc, item) => acc + (item?.opening === "fixed" ? 0 : 1), 0)
      : clampInt(Number(openingSashes), 0, previewSashes);

  const windowOpeningTypes = productType === "window" && windowSashSpecs
    ? new Set(windowSashSpecs.map((s) => s.opening).filter((o) => o === "turn" || o === "tiltTurn"))
    : null;

  const previewWindowSashes = useMemo<Array<{ widthCm: number; opening: SashOpening; handleSide?: HandleSide }> | undefined>(() => {
    if (productType !== "window") return undefined;
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
      ? productType === "window" && windowOpeningTypes
        ? windowOpeningTypes.size === 1
          ? t(`calculator.openingTypes.${Array.from(windowOpeningTypes)[0]}`)
          : t("calculator.openingTypes.mixed")
        : t(`calculator.openingTypes.${openingType}`)
      : "--";

  const openingTypeIcon: IoniconName =
    previewOpeningSashes > 0
      ? productType === "window" && windowOpeningTypes
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
      : t("calculator.types.window");

    const profileValue = `${t(`calculator.profileSeriesOptions.${profileSeries}`)} ${profileDepthMm}`;
  const glazingValue = t(`calculator.glazingOptions.${glazing}`);

  const designValue = t(`calculator.designOptions.${designOption}`, { defaultValue: String(designOption) });
  const designOptionItems: Array<{ value: DesignOption; label: string }> = [
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
  const estimatedDesignMenuHeight = Math.min(
    320,
    8 + designOptionItems.length * 46 + Math.max(0, designOptionItems.length - 1) * 4
  );
  const designMenuSpaceBelow = screenHeight - (designAnchorY + designAnchorMeasuredHeight) - spacing.sm;
  const designMenuSpaceAbove = designAnchorY - spacing.sm;
  const designMenuOpenUpward =
    designMenuSpaceBelow < Math.min(estimatedDesignMenuHeight, 180) && designMenuSpaceAbove > designMenuSpaceBelow;
  const designMenuTopDownward = designAnchorY + designAnchorMeasuredHeight + spacing.xs;
  const designMenuTop = designMenuOpenUpward
    ? Math.max(spacing.sm, designAnchorY - Math.min(estimatedDesignMenuHeight, Math.max(140, designMenuSpaceAbove)))
    : Math.max(spacing.sm, Math.min(screenHeight - 120 - spacing.sm, designMenuTopDownward));
  const designMenuMaxHeight = designMenuOpenUpward
    ? Math.max(120, designAnchorY - spacing.sm)
    : Math.max(120, screenHeight - designMenuTop - spacing.sm);
  const sashOpeningOptionItems: Array<{ value: SashOpening; label: string }> = [
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
  const estimatedSashOpeningMenuHeight = Math.min(
    320,
    8 + sashOpeningOptionItems.length * 46 + Math.max(0, sashOpeningOptionItems.length - 1) * 4
  );
  const sashOpeningMenuSpaceBelow = screenHeight - (sashOpeningAnchorY + sashOpeningAnchorHeight) - spacing.sm;
  const sashOpeningMenuSpaceAbove = sashOpeningAnchorY - spacing.sm;
  const sashOpeningMenuOpenUpward =
    sashOpeningMenuSpaceBelow < Math.min(estimatedSashOpeningMenuHeight, 180) &&
    sashOpeningMenuSpaceAbove > sashOpeningMenuSpaceBelow;
  const sashOpeningMenuTopDownward = sashOpeningAnchorY + sashOpeningAnchorHeight + spacing.xs;
  const sashOpeningMenuTop = sashOpeningMenuOpenUpward
    ? Math.max(spacing.sm, sashOpeningAnchorY - Math.min(estimatedSashOpeningMenuHeight, Math.max(140, sashOpeningMenuSpaceAbove)))
    : Math.max(spacing.sm, Math.min(screenHeight - 120 - spacing.sm, sashOpeningMenuTopDownward));
  const sashOpeningMenuMaxHeight = sashOpeningMenuOpenUpward
    ? Math.max(120, sashOpeningAnchorY - spacing.sm)
    : Math.max(120, screenHeight - sashOpeningMenuTop - spacing.sm);
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
  if (productType === "window") {
    if (mosquitoNet === "on") extrasEnabledCount++;
    if (windowSill === "on") extrasEnabledCount++;
    if (dripEdge === "on") extrasEnabledCount++;
    if (casing === "on") extrasEnabledCount++;
    if (decorBars === "on") extrasEnabledCount++;
  }
  const extrasValue = extrasEnabledCount === 0 ? t("calculator.preview.none") : `${extrasEnabledCount}`;

  const previewChips: Array<{ key: string; icon: IoniconName; label: string; value: string }> = [
    ...(productType === "window"
      ? [{ key: "openingType", icon: openingTypeIcon, label: t("calculator.openingType"), value: openingTypeLabel }]
      : []),
    { key: "profile", icon: "construct-outline", label: t("calculator.sectionProfile"), value: profileValue },
    { key: "glazing", icon: "color-filter-outline", label: t("calculator.sectionGlazing"), value: glazingValue },
  ];

  const activeOptionItems: string[] = [];
  if (energySaving === "on") activeOptionItems.push(t("calculator.energySaving"));
  if (multiFunctional === "on") activeOptionItems.push(t("calculator.multiFunctional"));
  if (hardwareLabel && hardwareKey) activeOptionItems.push(`${t("calculator.hardware")}: ${hardwareLabel}`);
  if (designOption !== "none") {
    activeOptionItems.push(`${t("calculator.sectionDesign")}: ${designSummaryValue}`);
  }

  if (productType === "window") {
    if (mosquitoNet === "on") activeOptionItems.push(t("calculator.extras.mosquitoNet"));
    if (windowSill === "on") {
      const w = typeof calcInput.windowSillWidthCm === "number" ? Math.round(calcInput.windowSillWidthCm) : null;
      activeOptionItems.push(w ? `${t("calculator.extras.windowSill")} (${w} cm)` : t("calculator.extras.windowSill"));
    }
    if (dripEdge === "on") {
      const w = typeof calcInput.dripEdgeWidthCm === "number" ? Math.round(calcInput.dripEdgeWidthCm) : null;
      activeOptionItems.push(w ? `${t("calculator.extras.dripEdge")} (${w} cm)` : t("calculator.extras.dripEdge"));
    }
    if (casing === "on") activeOptionItems.push(t("calculator.extras.casing"));
    if (decorBars === "on") {
      const key = calcInput.decorBarsColor === "gold" || calcInput.decorBarsColor === "white" ? calcInput.decorBarsColor : null;
      const label = key ? t(`common.colors.${key}`) : "";
      activeOptionItems.push(label ? `${t("calculator.extras.decorBars")} (${label})` : t("calculator.extras.decorBars"));
    }
  }

  const MAX_ACTIVE_OPTIONS = 6;
  const activeOptionsText =
    activeOptionItems.length === 0
      ? t("calculator.preview.none")
      : activeOptionItems.length > MAX_ACTIVE_OPTIONS
      ? [
          ...activeOptionItems.slice(0, MAX_ACTIVE_OPTIONS),
          t("calculator.preview.andMore", { count: activeOptionItems.length - MAX_ACTIVE_OPTIONS })
        ].join(", ")
      : activeOptionItems.join(", ");

  const PreviewChip = ({ icon, label, value }: { icon: IoniconName; label: string; value: string }) => (
    <View style={[styles.previewChip, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }]}>
      <Ionicons name={icon} size={14} color={theme.colors.primary} />
      <Text style={styles.previewChipText} numberOfLines={1}>
        <Text style={[styles.previewChipLabel, { color: theme.colors.textMuted }]}>{label}: </Text>
        <Text style={[styles.previewChipValue, { color: theme.colors.text }]}>{value}</Text>
      </Text>
    </View>
  );

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
    ...(productType === "window"
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

  const renderEditorBody = (editorKey: EditorKey) => {
    switch (editorKey) {
      case "dimensions":
        return (
          <View style={styles.grid}>
            <StepperField
              label={t("calculator.width")}
              labelRightSlot={<HelpIcon onPress={() => setHelpKey("width")} accessibilityLabel={t("calculator.width")} />}
              value={width}
              onChangeText={setWidth}
              min={40}
              max={300}
              step={5}
              unit="cm"
              allowDirectEdit
            />
            <StepperField
              label={t("calculator.height")}
              labelRightSlot={<HelpIcon onPress={() => setHelpKey("height")} accessibilityLabel={t("calculator.height")} />}
              value={height}
              onChangeText={setHeight}
              min={40}
              max={300}
              step={5}
              unit="cm"
              allowDirectEdit
            />
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
        );

      case "construction":
        return (
          <View style={styles.field}>
            <View style={styles.field}>
              <FieldLabel text={t("calculator.productType")} helpId="productType" />
              <SegmentedControl
                value={productType}
                onChange={setProductType}
                options={[
                  { value: "window", label: t("calculator.types.window") },
                  { value: "door", label: t("calculator.types.door") }
                ]}
              />
            </View>

            {productType === "door" ? (
              <View style={styles.field}>
                <FieldLabel text={t("calculator.doorSubtype")} helpId="doorSubtype" />
                <SegmentedControl
                  value={doorSubtype}
                  onChange={setDoorSubtype}
                  options={[
                    { value: "balcony", label: t("calculator.doorSubtypes.balcony") },
                    { value: "interior", label: t("calculator.doorSubtypes.interior") },
                    { value: "entrance", label: t("calculator.doorSubtypes.entrance") }
                  ]}
                />
              </View>
            ) : null}

            {productType === "door" && (isEntranceLikeDoor || Number(openingSashes) > 0) ? (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                  {t("calculator.handleSide")}
                </Text>
                <SegmentedControl
                  value={doorHandleSide}
                  onChange={(next) => setDoorHandleSide(next as HandleSide)}
                  options={[
                    { value: "left" as HandleSide, label: t("calculator.handleSides.left") },
                    { value: "right" as HandleSide, label: t("calculator.handleSides.right") },
                  ]}
                />
              </View>
            ) : null}

            {productType === "window" ? (
              <View style={[styles.grid, isWide ? styles.gridWide : null]}>
                <View style={styles.gridItem}>
                  <StepperField
                    label={t("calculator.sashCount")}
                    value={sashCount}
                    onChangeText={(next) => setSashCount(next as SashCount)}
                    min={1}
                    max={sashMax}
                    step={1}
                    allowDirectEdit={false}
                    disabled={isEntranceLikeDoor}
                  />
                </View>
              </View>
            ) : null}

            {productType === "window" ? (
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
                            <StepperField
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
                              step={5}
                              unit="cm"
                              allowDirectEdit
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
                                <PickerField
                                  label={t("calculator.sashOpening")}
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
                              </View>
                            </View>

                            {sash.opening !== "fixed" ? (
                              <View style={styles.field}>
                                <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                                  {t("calculator.handleSide")}
                                </Text>
                                <SegmentedControl
                                  value={(sash.handleSide ?? "right") as HandleSide}
                                  onChange={(next) =>
                                    setWindowSashes((prev) =>
                                      prev.map((item, i) =>
                                        i === idx ? { ...item, handleSide: next as HandleSide } : item
                                      )
                                    )
                                  }
                                  options={[
                                    { value: "left" as HandleSide, label: t("calculator.handleSides.left") },
                                    { value: "right" as HandleSide, label: t("calculator.handleSides.right") },
                                  ]}
                                />
                              </View>
                            ) : null}
                          </>
                        ) : null}
                      </View>
                    );
                  })}
                </View>

                {meetingPairEligible ? (
                  <SwitchField
                    label={t("calculator.meetingPairNoMullion")}
                    labelRightSlot={
                      <HelpIcon
                        onPress={() => setHelpKey("meetingPairNoMullion")}
                        accessibilityLabel={t("calculator.meetingPairNoMullion")}
                      />
                    }
                    value={windowMeetingPairNoMullion}
                    valueText={windowMeetingPairNoMullion ? t("common.yes") : t("common.no")}
                    onChange={setWindowMeetingPairNoMullion}
                  />
                ) : null}

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

            {hardwareCatalog.length ? (
              <View style={styles.field}>
                <Text style={[styles.subSectionTitle, { color: theme.colors.text }]}>{t("calculator.hardware")}</Text>
                <View style={styles.hardwareGrid}>
                  {hardwareCatalog.map((opt) => {
                    const selected = opt.key === hardwareKey;
                    const raw = calcConfigQuery.data?.options?.[opt.key];
                    const price =
                      typeof raw === "number"
                        ? raw
                        : raw && typeof raw === "object"
                          ? Number((raw as any)?.flat ?? 0)
                          : 0;
                    const showPrice = Number.isFinite(price);

                    return (
                      <Pressable
                        key={`hw-${opt.key}`}
                        accessibilityRole="button"
                        onPress={() => {
                          setHardwareKey(opt.key);
                          setHardwareLabel(opt.label);
                        }}
                        style={(state) => [
                          styles.hardwareCard,
                          {
                            borderColor: selected ? theme.colors.primary : theme.colors.border,
                            backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface
                          },
                          state.pressed ? styles.hardwareCardPressed : null
                        ]}
                      >
                        <Text
                          style={[styles.hardwareCardTitle, { color: selected ? theme.colors.primary : theme.colors.text }]}
                          numberOfLines={2}
                        >
                          {opt.label}
                        </Text>
                        {showPrice ? (
                          <Text style={[styles.hardwareCardPrice, { color: theme.colors.textMuted }]} numberOfLines={1}>
                            {price > 0 ? `+ ${formatMoney(price, currency)}` : formatMoney(price, currency)}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {productType === "door" ? (
              <View style={styles.field}>
                <Text style={[styles.subSectionTitle, { color: theme.colors.text }]}>{t("calculator.sectionEntrance")}</Text>

                <View style={styles.field}>
                  <FieldLabel text={t("calculator.entrance.fillTop")} helpId="entranceFillType" />
                  <SegmentedControl
                    value={doorFillTop}
                    onChange={setDoorFillTop}
                    options={[
                      { value: "glass", label: t("calculator.entrance.fillTypes.glass") },
                      { value: "sandwich", label: t("calculator.entrance.fillTypes.sandwich") }
                    ]}
                  />
                </View>

                <View style={styles.field}>
                  <FieldLabel text={t("calculator.entrance.fillBottom")} helpId="entranceFillType" />
                  <SegmentedControl
                    value={doorFillBottom}
                    onChange={setDoorFillBottom}
                    options={[
                      { value: "glass", label: t("calculator.entrance.fillTypes.glass") },
                      { value: "sandwich", label: t("calculator.entrance.fillTypes.sandwich") }
                    ]}
                  />
                </View>

              </View>
            ) : null}
          </View>
        );

      case "profile":
        {
          const profileIllustrationTitle = `${t("calculator.sectionProfile")}: ${profileDepthMm} мм`;
          const profileIllustration = profileDepthPreview[profileDepthMm];

          return (
            <View style={styles.field}>
              <View style={[styles.grid, isWide ? styles.gridWide : null]}>
                <View style={styles.gridItem}>
                  <FieldLabel text={t("calculator.profileSeries")} helpId="profileSeries" />
                  <SegmentedControl
                    value={profileSeries}
                    onChange={setProfileSeries}
                    options={[
                      { value: "bautex", label: t("calculator.profileSeriesOptions.bautex") },
                      { value: "kbe", label: t("calculator.profileSeriesOptions.kbe") },
                      { value: "rehau", label: t("calculator.profileSeriesOptions.rehau") }
                    ]}
                  />
                </View>

                <View style={styles.gridItem}>
                  <FieldLabel text={t("calculator.profileDepth")} helpId="profileDepth" />
                  <SegmentedControl
                    value={profileDepthMm}
                    onChange={setProfileDepthMm}
                    options={[
                      { value: "60", label: "60" },
                      { value: "70", label: "70" },
                      { value: "85", label: "85" }
                    ]}
                  />
                </View>
              </View>

              <CalcIllustrationCard title={profileIllustrationTitle} source={profileIllustration} />
            </View>
          );
        }

      case "glazing":
        {
          const glazingIllustrationTitle = `${t("calculator.sectionGlazing")}: ${t(`calculator.glazingOptions.${glazing}`)}`;
          const glazingIllustration = glazingPreview[glazing];

          return (
            <View style={styles.field}>
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

              <CalcIllustrationCard title={glazingIllustrationTitle} source={glazingIllustration} />

              <View style={[styles.grid, isWide ? styles.gridWide : null]}>
                <View style={styles.gridItem}>
                  <SwitchField
                    label={t("calculator.energySaving")}
                    labelRightSlot={
                      <HelpIcon onPress={() => setHelpKey("energySaving")} accessibilityLabel={t("calculator.energySaving")} />
                    }
                    value={energySaving === "on"}
                    valueText={energySaving === "on" ? t("common.yes") : t("common.no")}
                    onChange={(next) => setEnergySaving(next ? "on" : "off")}
                  />
                </View>

                <View style={styles.gridItem}>
                  <SwitchField
                    label={t("calculator.multiFunctional")}
                    labelRightSlot={
                      <HelpIcon onPress={() => setHelpKey("multiFunctional")} accessibilityLabel={t("calculator.multiFunctional")} />
                    }
                    value={multiFunctional === "on"}
                    valueText={multiFunctional === "on" ? t("common.yes") : t("common.no")}
                    onChange={(next) => setMultiFunctional(next ? "on" : "off")}
                  />
                </View>
              </View>
            </View>
          );
        }

      case "design":
        {
          const showColorPicker = designOption !== "none";
          const designIllustrationTitle = `${t("calculator.sectionDesign")}: ${designSummaryValue}`;
          const designIllustration = designPreview[designOption];

          return (
            <>
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
                    label={t("calculator.sectionDesign")}
                    labelRightSlot={<HelpIcon onPress={() => setHelpKey("lamination")} accessibilityLabel={t("calculator.sectionDesign")} />}
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
              </View>

              {productType === "window" ? (
                <View style={[styles.grid, isWide ? styles.gridWide : null]}>
                  <View style={styles.gridItem}>
                    <View style={styles.field}>
                      <SwitchField
                        label={t("calculator.extras.decorBars")}
                        labelRightSlot={
                          <HelpIcon onPress={() => setHelpKey("decorBars")} accessibilityLabel={t("calculator.extras.decorBars")} />
                        }
                        value={decorBars === "on"}
                        onChange={(next) => setDecorBars(next ? "on" : "off")}
                      />
                      {decorBars === "on" ? (
                        <View style={styles.field}>
                          <Text style={[styles.fieldLabel, { color: theme.colors.text }]}>
                            {t("calculator.extras.decorBarsColor")}
                          </Text>
                          <SegmentedControl
                            value={decorBarsColor}
                            onChange={(next) => setDecorBarsColor(next as "white" | "gold")}
                            options={[
                              { value: "white" as const, label: t("common.colors.white") },
                              { value: "gold" as const, label: t("common.colors.gold") },
                            ]}
                          />
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : null}
            </>
          );
        }

      case "extras":
        if (productType !== "window") return null;
        return (
          <View style={styles.field}>
            <SwitchField
              label={t("calculator.extras.mosquitoNet")}
              value={mosquitoNet === "on"}
              onChange={(next) => setMosquitoNet(next ? "on" : "off")}
            />
            <SwitchField
              label={t("calculator.extras.windowSill")}
              value={windowSill === "on"}
              onChange={(next) => setWindowSill(next ? "on" : "off")}
            />
            {windowSill === "on" ? (
              <StepperField
                label={t("calculator.extras.windowSillWidth")}
                value={windowSillWidthCm}
                onChangeText={setWindowSillWidthCm}
                min={5}
                max={50}
                step={5}
                snapStep={5}
                unit="cm"
                allowDirectEdit
              />
            ) : null}
            <SwitchField
              label={t("calculator.extras.dripEdge")}
              value={dripEdge === "on"}
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
              onChange={(next) => setCasing(next ? "on" : "off")}
            />
          </View>
        );

    }
  };

  const desktopStickyTop =
    theme.layout.desktopNavHeight + theme.layout.desktopNavGapTop + theme.layout.desktopNavGapBottom + spacing.sm;

  const previewCard = (
    <Card style={[styles.card, isDesktopWeb ? styles.cardCompact : null]}>
      <View style={styles.cardTitleRow}>
        <View style={[styles.cardTitleIcon, { backgroundColor: theme.colors.primarySoft }]}>
          <Ionicons name={calculatorSectionIcon.preview} size={ICON_SIZE.md} color={theme.colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("calculator.preview.title")}</Text>
      </View>
      <Text style={[styles.previewHint, { color: theme.colors.textMuted }]}>{t("calculator.preview.hint")}</Text>
      <ProductPreview
        kind={productType}
        widthCm={Number(width)}
        heightCm={Number(height)}
        canvasHeight={isDesktopWeb && productType === "window" ? 440 : undefined}
        sashCount={Number(sashCount)}
        openingSashes={Number(openingSashes)}
        openingType={openingType}
        sashes={previewWindowSashes}
        doorSubtype={productType === "door" ? doorSubtype : undefined}
        doorFillTop={productType === "door" ? doorFillTop : undefined}
        doorFillBottom={productType === "door" ? doorFillBottom : undefined}
        doorHandleSide={productType === "door" ? doorHandleSide : undefined}
        profileDepthMm={Number(profileDepthMm)}
        glazing={glazing}
        lamination={lamination}
        laminationGroup={laminationGroup}
        laminationColor={lamination !== "none" ? laminationColor : null}
        decorBars={productType === "window" && decorBars === "on"}
        decorBarsColor={decorBarsColor}
        glassOptions={{ energySaving: energySaving === "on", multiFunctional: multiFunctional === "on" }}
      />

      <View style={styles.previewChips}>
        {previewChips.map((chip) => (
          <PreviewChip key={chip.key} icon={chip.icon} label={chip.label} value={chip.value} />
        ))}
      </View>

      <Text style={[styles.previewOptionsText, { color: theme.colors.textMuted }]}>
        {t("calculator.preview.activeOptions")} <Text style={{ color: theme.colors.text }}>{activeOptionsText}</Text>
      </Text>
    </Card>
  );

  const calculateButton = (
    <PrimaryButton
      title={t("calculator.calculate")}
      onPress={onCalculate}
      loading={calcLoading}
      disabled={
        calcLoading ||
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
        calcLoading ||
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
      style={[styles.totalBlock, isDesktopWeb ? styles.totalBlockCompact : null, { backgroundColor: theme.colors.primarySoft }]}
      elevated={false}
    >
      <Text style={[styles.totalLabel, { color: theme.colors.textMuted }]}>{t("calculator.totalLabel")}</Text>
      <Text style={[styles.totalValue, { color: theme.colors.primary }]}> 
        {formatMoney(calculatedTotal ?? draftTotal, currency)}
      </Text>
      <Text style={[styles.disclaimer, { color: theme.colors.textMuted }]}>{t("calculator.disclaimer")}</Text>
    </Card>
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
	                        {!hasCalculated ? calculateButton : null}
	                        {hasCalculated ? (
	                          <>
	                            {totalCard}
	                            {addToCartButton}
	                          </>
	                        ) : null}
	                      </View>
	                    </View>

	                    <View style={styles.desktopRight}>
	                      <View style={styles.desktopSections}>
	                        {editorSections.map((section) => (
	                          <CollapsibleSection
	                            key={section.key}
	                            title={section.title}
	                            expanded={openEditorKey === section.key}
	                            onExpandedChange={(next) => setOpenEditorKey(next ? section.key : null)}
	                            density="compact"
	                            leftSlot={<Ionicons name={section.icon} size={ICON_SIZE.md} color={theme.colors.primary} />}
	                            rightSlot={
	                              <Text style={[styles.accordionSectionValue, { color: theme.colors.textMuted }]} numberOfLines={1}>
	                                {section.value}
	                              </Text>
	                            }
	                          >
	                            {renderEditorBody(section.key)}
	                          </CollapsibleSection>
	                        ))}
	                      </View>
	                    </View>
	                  </View>
	                </View>
	              ) : (
                <>
                  <View style={desktopContent}>{previewCard}</View>

                  <View style={desktopContent}>
                    <View style={styles.characteristicsGrid}>
                      {editorSections.map((section) => (
                        <View key={section.key} style={styles.characteristicsItem}>
                          <CollapsibleSection
                            title={section.title}
                            expanded={openEditorKey === section.key}
                            onExpandedChange={(next) => setOpenEditorKey(next ? section.key : null)}
                            density={isDesktopWeb ? "compact" : "default"}
                            leftSlot={<Ionicons name={section.icon} size={ICON_SIZE.md} color={theme.colors.primary} />}
                            rightSlot={
                              <Text style={[styles.accordionSectionValue, { color: theme.colors.textMuted }]} numberOfLines={1}>
                                {section.value}
                              </Text>
                            }
                          >
                            {renderEditorBody(section.key)}
                          </CollapsibleSection>
                        </View>
                      ))}
                    </View>
                  </View>


                  {!hasCalculated ? <View style={desktopContent}>{calculateButton}</View> : null}

                  {hasCalculated ? (
                    <>
                      <View style={desktopContent}>{totalCard}</View>
                      <View style={desktopContent}>{addToCartButton}</View>
                    </>
                  ) : null}
                </>
              )}

	              <View style={[desktopContent, styles.footerWrap, isDesktopWeb ? ({ marginTop: "auto" } as any) : null]}>
	                <SiteFooter gutter={spacing.md} />
	              </View>
	        </AppScrollView>
          <Modal
            transparent
            animationType="none"
            visible={designPickerMounted}
            onRequestClose={() => setDesignPickerOpen(false)}
          >
            <View style={styles.designPickerModalRoot}>
              <Pressable style={styles.designPickerBackdrop} onPress={() => setDesignPickerOpen(false)} />
              <Animated.View
                pointerEvents={designPickerOpen ? "auto" : "none"}
                style={[
                  styles.designPickerOverlay,
                  theme.shadow.md,
                  designPickerAnimatedStyle,
                  {
                    top: designMenuTop,
                    left: designMenuLeft,
                    width: designMenuWidth,
                    maxHeight: designMenuMaxHeight,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }
                ]}
              >
                <ScrollView
                  style={styles.designPickerScroll}
                  contentContainerStyle={styles.designPickerList}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={designOptionItems.length > 5}
                >
                  {designOptionItems.map((item) => {
                    const selected = item.value === designOption;
                    return (
                      <Pressable
                        key={item.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setDesignOption(item.value);
                          setDesignPickerOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.designPickerOption,
                          {
                            borderColor: selected ? theme.colors.primary : theme.colors.border,
                            backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface2,
                          },
                          pressed ? styles.designPickerOptionPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.designPickerOptionLabel,
                            { color: selected ? theme.colors.primary : theme.colors.text }
                          ]}
                        >
                          {item.label}
                        </Text>
                        {selected ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>
          <Modal
            transparent
            animationType="none"
            visible={sashOpeningPickerMounted}
            onRequestClose={() => setSashOpeningPickerOpen(false)}
          >
            <View style={styles.designPickerModalRoot}>
              <Pressable style={styles.designPickerBackdrop} onPress={() => setSashOpeningPickerOpen(false)} />
              <Animated.View
                pointerEvents={sashOpeningPickerOpen ? "auto" : "none"}
                style={[
                  styles.designPickerOverlay,
                  theme.shadow.md,
                  sashOpeningPickerAnimatedStyle,
                  {
                    top: sashOpeningMenuTop,
                    left: sashOpeningMenuLeft,
                    width: sashOpeningMenuWidth,
                    maxHeight: sashOpeningMenuMaxHeight,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  }
                ]}
              >
                <ScrollView
                  style={styles.designPickerScroll}
                  contentContainerStyle={styles.designPickerList}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {sashOpeningOptionItems.map((item) => {
                    const selected = item.value === sashOpeningPickerCurrentValue;
                    return (
                      <Pressable
                        key={item.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => {
                          if (sashOpeningPickerSashIndex !== null) {
                            applySashOpening(sashOpeningPickerSashIndex, item.value);
                          }
                          setSashOpeningPickerOpen(false);
                        }}
                        style={({ pressed }) => [
                          styles.designPickerOption,
                          {
                            borderColor: selected ? theme.colors.primary : theme.colors.border,
                            backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface2,
                          },
                          pressed ? styles.designPickerOptionPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.designPickerOptionLabel,
                            { color: selected ? theme.colors.primary : theme.colors.text }
                          ]}
                        >
                          {item.label}
                        </Text>
                        {selected ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>
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
    paddingBottom: 0
  },
  containerDesktop: {
    padding: spacing.sm,
    gap: spacing.sm
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
  hardwareGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  hardwareCard: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 160,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.xs,
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  hardwareCardPressed: {
    opacity: 0.92
  },
  hardwareCardTitle: {
    ...font(900),
    fontSize: 13,
    lineHeight: 18
  },
  hardwareCardPrice: {
    ...font(700),
    fontSize: 12,
    lineHeight: 16
  },
  colorPicker: {
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  designPickerModalRoot: {
    flex: 1
  },
  designPickerBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  designDropdownAnchor: {
    position: "relative"
  },
  designPickerOverlay: {
    position: "absolute",
    zIndex: 70,
    elevation: 40,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4
  },
  designPickerScroll: {
    maxHeight: 320
  },
  designPickerList: {
    gap: 4
  },
  designPickerOption: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    ...( { cursor: "pointer" } as object )
  },
  designPickerOptionPressed: {
    opacity: 0.9
  },
  designPickerOptionLabel: {
    ...font(800),
    fontSize: 13,
    lineHeight: 16,
    flex: 1
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
    borderWidth: 1,
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
    borderWidth: 1,
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
