import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { GlassOptionsInput } from "../utils/calc";
import { font } from "../theme/font";
import { radius, spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";

function toFinite(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(value: number, min: number, max: number): number {
  const safe = Math.round(toFinite(value, min));
  return Math.min(max, Math.max(min, safe));
}

export function ProductPreview({
  kind,
  widthCm,
  heightCm,
  canvasHeight,
  sashCount,
  openingSashes,
  openingType,
  sashes,
  doorSubtype,
  doorFillTop,
  doorFillBottom,
  doorHandleSide,
  profileDepthMm,
  glazing,
  lamination,
  laminationGroup,
  laminationColor,
  glassOptions,
  decorBars,
  decorBarsColor,
  onChangeWidthCm,
  onChangeHeightCm,
  onPressSash,
  activeSashIndex
}: {
  kind: "window" | "door" | "balconyBlock";
  widthCm: number;
  heightCm: number;
  canvasHeight?: number;
  sashCount?: number;
  openingSashes?: number;
  openingType?: "turn" | "tiltTurn";
  sashes?: Array<{ widthCm: number; opening: "fixed" | "turn" | "tiltTurn"; handleSide?: "left" | "right" }>;
  doorSubtype?: "balcony" | "interior" | "entrance";
  doorFillTop?: "glass" | "sandwich";
  doorFillBottom?: "glass" | "sandwich";
  doorHandleSide?: "left" | "right";
  profileDepthMm?: number;
  glazing?: "single" | "double";
  lamination?: "none" | "oneSide" | "twoSide";
  laminationGroup?: "white" | "wood" | "color";
  laminationColor?: "gold_oak" | "grey_oak" | "dark_oak" | "other" | null;
  glassOptions?: GlassOptionsInput;
  decorBars?: boolean;
  decorBarsColor?: "white" | "gold" | "brown";
  onChangeWidthCm?: (width: string) => void;
  onChangeHeightCm?: (height: string) => void;
  onPressSash?: (index: number) => void;
  activeSashIndex?: number;
}): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [canvasWidth, setCanvasWidth] = useState(0);

  const w = Math.max(0, toFinite(widthCm, 0));
  const h = Math.max(0, toFinite(heightCm, 0));
  const hasDims = w > 0 && h > 0;

  const frameBorderWidth =
    kind === "door" && doorSubtype === "entrance" ? 3 : kind === "door" && doorSubtype === "interior" ? 2 : 2;

  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next > 0 && next !== canvasWidth) setCanvasWidth(next);
  };

  const widthLabel = `${Math.round(w)} cm`;
  const heightLabel = `${Math.round(h)} cm`;

  const normalizedDoorHandleSide = (kind === "door" || kind === "balconyBlock") && doorHandleSide === "left" ? "left" : "right";

  const isEntranceLikeDoor = kind === "door" && (doorSubtype === "entrance" || doorSubtype === "interior");
  const fallbackSashes = isEntranceLikeDoor ? 1 : clampInt(sashCount ?? (kind === "door" ? 1 : 2), 1, 3);
  const fallbackOpening = isEntranceLikeDoor ? 1 : clampInt(openingSashes ?? (kind === "door" ? 1 : 1), 0, fallbackSashes);
  const fallbackOpeningType = openingType === "turn" ? "turn" : "tiltTurn";

  const sashSpecs = useMemo(() => {
    if (isEntranceLikeDoor) {
      return [{ widthFlex: 1, opening: "turn" as const, handleSide: normalizedDoorHandleSide }];
    }

    if ((kind === "window" || kind === "balconyBlock") && Array.isArray(sashes) && sashes.length) {
      const normalized = sashes
        .slice(0, 3)
        .map((item, idx) => ({
          widthFlex: kind === "balconyBlock" && idx === 0 ? 1.25 : Math.max(1, Math.round(toFinite(item?.widthCm, 1))),
          opening: kind === "balconyBlock" && idx === 0 ? ("turn" as const) : (item?.opening === "turn" || item?.opening === "tiltTurn" ? item.opening : "fixed"),
          handleSide: kind === "balconyBlock" && idx === 0 ? normalizedDoorHandleSide : (item?.handleSide === "left" || item?.handleSide === "right" ? item.handleSide : undefined),
        }))
        .filter((item) => item.widthFlex > 0);
      if (normalized.length) return normalized;
    }

    return Array.from({ length: fallbackSashes }).map((_, idx) => ({
      widthFlex: kind === "balconyBlock" && idx === 0 ? 1.25 : 1,
      opening: kind === "balconyBlock" && idx === 0 ? ("turn" as const) : (idx < fallbackOpening ? fallbackOpeningType : ("fixed" as const)),
      handleSide: kind === "balconyBlock" && idx === 0 ? normalizedDoorHandleSide : (idx < fallbackOpening ? ("right" as const) : undefined),
    }));
  }, [fallbackOpening, fallbackOpeningType, fallbackSashes, isEntranceLikeDoor, kind, normalizedDoorHandleSide, sashes]);

  const sashFlexTotal = useMemo(
    () => sashSpecs.reduce((acc, item) => acc + Math.max(1, item.widthFlex), 0),
    [sashSpecs]
  );

  const sashWidthsCm = useMemo(() => {
    if (kind !== "window" || !sashSpecs.length) return [];

    const explicit = Array.isArray(sashes)
      ? sashes
          .slice(0, sashSpecs.length)
          .map((item) => {
            const widthValue = Math.round(toFinite(item?.widthCm, 0));
            return widthValue > 0 ? widthValue : null;
          })
      : [];

    if (
      explicit.length === sashSpecs.length &&
      explicit.every((value): value is number => typeof value === "number" && value > 0)
    ) {
      return explicit;
    }

    if (!sashFlexTotal) return sashSpecs.map(() => 0);

    const targetTotal = Math.max(sashSpecs.length, Math.round(w));
    const exact = sashSpecs.map((item) => (targetTotal * Math.max(1, item.widthFlex)) / sashFlexTotal);
    const rounded = exact.map((value) => Math.max(1, Math.floor(value)));
    let delta = targetTotal - rounded.reduce((acc, value) => acc + value, 0);

    const fractions = exact.map((value, idx) => ({ idx, frac: value - Math.floor(value) }));
    const highFirst = [...fractions].sort((a, b) => b.frac - a.frac);
    const lowFirst = [...fractions].sort((a, b) => a.frac - b.frac);

    let guard = 0;
    while (delta > 0 && highFirst.length && guard < 128) {
      const pick = highFirst[guard % highFirst.length];
      rounded[pick.idx] += 1;
      delta -= 1;
      guard += 1;
    }

    guard = 0;
    while (delta < 0 && lowFirst.length && guard < 256) {
      const pick = lowFirst[guard % lowFirst.length];
      if (rounded[pick.idx] > 1) {
        rounded[pick.idx] -= 1;
        delta += 1;
      }
      guard += 1;
    }

    return rounded;
  }, [kind, sashFlexTotal, sashSpecs, sashes, w]);

  const CANVAS_HEIGHT = clampInt(toFinite(canvasHeight, 220), 160, 960);
  const PAD = 14;

  const productSize = useMemo(() => {
    if (!hasDims || canvasWidth <= 0) {
      return { w: 0, h: 0 };
    }

    const availableW = Math.max(0, canvasWidth - PAD * 2);
    const availableH = Math.max(0, CANVAS_HEIGHT - PAD * 2);
    const ratio = w / h;
    if (!Number.isFinite(ratio) || ratio <= 0) return { w: 0, h: 0 };

    const canvasRatio = availableW / availableH;
    if (ratio >= canvasRatio) {
      const pw = availableW;
      const ph = pw / ratio;
      return { w: Math.max(0, Math.round(pw)), h: Math.max(0, Math.round(ph)) };
    }
    const ph = availableH;
    const pw = ph * ratio;
    return { w: Math.max(0, Math.round(pw)), h: Math.max(0, Math.round(ph)) };
  }, [canvasWidth, hasDims, w, h]);

  const normalizedProfileDepth = useMemo(() => {
    const depth = Math.round(toFinite(profileDepthMm, 70));
    if (depth <= 60) return 60;
    if (depth >= 85) return 85;
    return 70;
  }, [profileDepthMm]);

  const glazingKey = glazing === "single" ? "single" : "double";
  const glassPanes = glazingKey === "double" ? 3 : 2;

  const detailLevel = useMemo(() => {
    const minSide = Math.min(productSize.w, productSize.h);
    if (!Number.isFinite(minSide) || minSide <= 0) return "low" as const;
    if (minSide >= 170) return "high" as const;
    if (minSide >= 130) return "mid" as const;
    return "low" as const;
  }, [productSize.h, productSize.w]);

  const showGlassEdges = detailLevel !== "low";
  const showHinges = detailLevel === "high";
  const showDrainSlots = detailLevel !== "low";
  const showDecorBars = (kind === "window" || kind === "balconyBlock") && decorBars === true;
  const decorBarsColorKey = decorBarsColor === "gold" || decorBarsColor === "brown" ? decorBarsColor : "white";
  const decorBarsLabel = showDecorBars
    ? t("calculator.preview.decorBarsBadge", { color: t(`common.colors.${decorBarsColorKey}`) })
    : null;

  const frameThickness = useMemo(() => {
    const viewMinPx = Math.min(productSize.w, productSize.h);
    const realMinMm = Math.min(w, h) * 10;
    if (!Number.isFinite(viewMinPx) || viewMinPx <= 0) return 10;
    if (!Number.isFinite(realMinMm) || realMinMm <= 0) return 10;

    const pxPerMm = viewMinPx / realMinMm;
    if (!Number.isFinite(pxPerMm) || pxPerMm <= 0) return 10;

    return clampInt(normalizedProfileDepth * pxPerMm, 3, 18);
  }, [h, normalizedProfileDepth, productSize.h, productSize.w, w]);

  const mullionWidth = useMemo(() => clampInt(frameThickness * 0.35, 2, 6), [frameThickness]);
  const sashFrameThickness = useMemo(() => clampInt(frameThickness * 0.7, 4, 14), [frameThickness]);
  const gasketWidth = useMemo(() => clampInt(Math.max(1, sashFrameThickness * 0.18), 1, 3), [sashFrameThickness]);
  const depthPx = useMemo(() => clampInt(frameThickness * 0.55, 3, 12), [frameThickness]);
  const decorBarThickness = useMemo(() => {
    const factor = detailLevel === "high" ? 0.24 : detailLevel === "mid" ? 0.22 : 0.2;
    return clampInt(Math.round(sashFrameThickness * factor), 1, 4);
  }, [detailLevel, sashFrameThickness]);
  const decorBarInset = useMemo(() => clampInt(Math.round(gasketWidth + 2), 2, 10), [gasketWidth]);
  const decorBarsGradient = useMemo(() => {
    if (decorBarsColorKey === "gold") {
      return [
        "rgba(255,231,170,0.96)",
        "rgba(220,173,64,0.92)",
        "rgba(164,112,22,0.88)"
      ] as const;
    }
    if (decorBarsColorKey === "brown") {
      return [
        "rgba(168,122,84,0.96)",
        "rgba(128,86,52,0.92)",
        "rgba(88,55,31,0.88)"
      ] as const;
    }
    return [
      "rgba(255,255,255,0.96)",
      "rgba(238,240,244,0.92)",
      "rgba(205,209,216,0.86)"
    ] as const;
  }, [decorBarsColorKey]);

  const palette = useMemo(() => {
    const lamKey = lamination === "oneSide" || lamination === "twoSide" ? lamination : "none";
    const group = typeof laminationGroup === "string" ? laminationGroup : undefined;
    const color =
      lamKey === "none"
        ? null
        : laminationColor === "gold_oak" || laminationColor === "grey_oak" || laminationColor === "dark_oak" || laminationColor === "other"
          ? laminationColor
          : null;

    const isWood = color === "gold_oak" || color === "grey_oak" || color === "dark_oak";
    const isColor = group === "color" || color === "other";
    // "twoSideWhite" is a *base* option; the final lamination look still depends on the chosen lamination color.
    // So treat it as white only when no lamination color is selected.
    const isWhite = !color && (group === "white" || (!isWood && !isColor));

    const handleMetal = ["#0B0B0C", "#111827", "#000000"] as const;
    const gasket = theme.isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.40)";

    if (lamKey === "none" || isWhite) {
      const outer = theme.isDark ? (["#F5F5F7", "#C9CDD3", "#FFFFFF"] as const) : (["#FFFFFF", "#E8EAEE", "#FBFBFC"] as const);
      const recess = theme.isDark ? (["rgba(0,0,0,0.22)", "rgba(255,255,255,0.04)"] as const) : (["rgba(0,0,0,0.10)", "rgba(255,255,255,0.55)"] as const);
      const panelSheen = theme.isDark
        ? (["rgba(255,255,255,0.10)", "rgba(0,0,0,0.35)"] as const)
        : (["rgba(255,255,255,0.80)", "rgba(0,0,0,0.08)"] as const);
      return {
        frameOuter: outer,
        frameSheen: theme.isDark ? (["rgba(255,255,255,0.16)", "rgba(255,255,255,0.00)"] as const) : (["rgba(255,255,255,0.72)", "rgba(255,255,255,0.00)"] as const),
        recess,
        mullion: theme.isDark ? "#E7E7EA" : "#F6F7F9",
        mullionEdge: theme.isDark ? "rgba(0,0,0,0.28)" : "rgba(0,0,0,0.10)",
        sashOuter: outer,
        panelBase: outer,
        panelSheen,
        panelBorder: theme.isDark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.10)",
        panelGroove: theme.isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.10)",
        handleMetal,
        gasket,
      };
    }

    if (isWood) {
      const woodOuter =
        color === "grey_oak"
          ? (theme.isDark ? (["#6A6C70", "#9AA0A6", "#5B5E62"] as const) : (["#7A7D82", "#B6BCC4", "#6C7076"] as const))
          : color === "dark_oak"
            ? (theme.isDark ? (["#3B2A1E", "#6A4A35", "#2B1E15"] as const) : (["#4A3324", "#855B3E", "#38261A"] as const))
            : // gold oak default
              (theme.isDark ? (["#6B3F20", "#B97A4A", "#4D2C16"] as const) : (["#7B4A26", "#D09A63", "#5C351A"] as const));
      const recess = theme.isDark ? (["rgba(0,0,0,0.30)", "rgba(255,255,255,0.04)"] as const) : (["rgba(0,0,0,0.14)", "rgba(255,255,255,0.28)"] as const);
      const isDarkWood = color === "dark_oak";
      const panelSheen = theme.isDark
        ? (["rgba(255,255,255,0.08)", "rgba(0,0,0,0.40)"] as const)
        : (["rgba(255,255,255,0.26)", "rgba(0,0,0,0.18)"] as const);
      return {
        frameOuter: woodOuter,
        frameSheen: theme.isDark ? (["rgba(255,255,255,0.14)", "rgba(255,255,255,0.00)"] as const) : (["rgba(255,255,255,0.22)", "rgba(255,255,255,0.00)"] as const),
        recess,
        mullion: woodOuter[1],
        mullionEdge: theme.isDark ? "rgba(0,0,0,0.34)" : "rgba(0,0,0,0.18)",
        sashOuter: woodOuter,
        panelBase: woodOuter,
        panelSheen,
        panelBorder: isDarkWood
          ? theme.isDark
            ? "rgba(255,255,255,0.14)"
            : "rgba(255,255,255,0.18)"
          : theme.isDark
            ? "rgba(0,0,0,0.34)"
            : "rgba(0,0,0,0.14)",
        panelGroove: isDarkWood
          ? theme.isDark
            ? "rgba(255,255,255,0.20)"
            : "rgba(255,255,255,0.30)"
          : theme.isDark
            ? "rgba(0,0,0,0.35)"
            : "rgba(0,0,0,0.12)",
        handleMetal,
        gasket,
      };
    }

    // Color / other
    const colorOuter = theme.isDark ? (["#1F2937", "#4B5563", "#111827"] as const) : (["#111827", "#374151", "#0B1220"] as const);
    const recess = theme.isDark ? (["rgba(0,0,0,0.35)", "rgba(255,255,255,0.03)"] as const) : (["rgba(0,0,0,0.18)", "rgba(255,255,255,0.12)"] as const);
    const panelSheen = theme.isDark
      ? (["rgba(255,255,255,0.06)", "rgba(0,0,0,0.48)"] as const)
      : (["rgba(255,255,255,0.14)", "rgba(0,0,0,0.34)"] as const);
    return {
      frameOuter: colorOuter,
      frameSheen: theme.isDark ? (["rgba(255,255,255,0.10)", "rgba(255,255,255,0.00)"] as const) : (["rgba(255,255,255,0.12)", "rgba(255,255,255,0.00)"] as const),
      recess,
      mullion: theme.isDark ? "#2B3443" : "#121A2B",
      mullionEdge: theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.10)",
      sashOuter: colorOuter,
      panelBase: colorOuter,
      panelSheen,
      panelBorder: theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.16)",
      panelGroove: theme.isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.26)",
      handleMetal,
      gasket,
    };
  }, [lamination, laminationColor, laminationGroup, theme.isDark]);

  const glassPalette = useMemo(() => {
    // Preview-only: keep glass always blue (ignore energy-saving / multifunctional tint).
    const base = theme.isDark ? "#7EB3DA" : "#A9D5F1";
    const sheen = theme.isDark ? "rgba(198,232,255,0.16)" : "rgba(236,248,255,0.34)";
    const highlight = theme.isDark ? "rgba(214,238,255,0.18)" : "rgba(245,252,255,0.50)";
    const edge = theme.isDark ? "rgba(132,210,255,0.48)" : "rgba(43,138,214,0.34)";
    return { base, sheen, highlight, edge };
  }, [theme.isDark]);

  const canvasBg = theme.isDark ? "#0D0F13" : "#C4CBD4";

  const shadowWebStyle =
    Platform.OS === "web"
      ? ({
          boxShadow: theme.isDark
            ? "0 1px 4px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)"
            : "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(15,23,42,0.06)"
        } as any)
      : null;

  const showFrameDrainSlots = showDrainSlots && (kind === "window" || kind === "balconyBlock" || (kind === "door" && doorSubtype === "balcony"));

  return (
    <View style={styles.root}>
      <View
        style={[styles.canvas, { height: CANVAS_HEIGHT }]}
          onLayout={onLayout}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: canvasBg }]} />
          {!hasDims ? (
            <View style={styles.placeholder}>
              <View style={[styles.placeholderIcon, { backgroundColor: theme.isDark ? 'rgba(249,115,22,0.12)' : 'rgba(234,88,12,0.08)' }]}>
                <Ionicons name="resize-outline" size={22} color={theme.colors.primary} />
              </View>
              <Text style={[styles.placeholderText, { color: theme.colors.textMuted }]}>
                {t((kind === "door" || kind === "balconyBlock") ? "calculator.preview.placeholderDoor" : "calculator.preview.placeholderWindow")}
              </Text>
            </View>
          ) : (
            <View style={[styles.productWrap, { padding: PAD }]}>
              <View
                style={[
                  styles.productShadow,
                  theme.shadow.md,
                  shadowWebStyle,
                  { width: productSize.w, height: productSize.h, borderRadius: radius.md, backgroundColor: theme.colors.surface }
                ]}
              >
                <View style={[styles.productClip, { borderRadius: radius.md }]}>
                <View
                    style={[
                      styles.frameOuter,
                      {
                        borderWidth: frameBorderWidth,
                        borderColor: theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
                        borderRadius: radius.sm,
                      }
                    ]}
                  >
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.frameOuter[0] }]} />

                    <View style={[styles.frameInner, { padding: frameThickness, borderRadius: Math.max(0, radius.sm - 2) }]}>
                      {showFrameDrainSlots ? (
                        <View
                          pointerEvents="none"
                          style={[
                            styles.drainSlots,
                            {
                              bottom: Math.max(2, Math.round(frameThickness * 0.28)),
                              opacity: theme.isDark ? 0.45 : 0.35,
                            }
                          ]}
                        >
                          <View style={[styles.drainSlot, { backgroundColor: theme.isDark ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.55)" }]} />
                          <View style={[styles.drainSlot, { backgroundColor: theme.isDark ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.55)" }]} />
                        </View>
                      ) : null}

                      {decorBarsLabel ? (
                        <View
                          pointerEvents="none"
                          style={[
                            styles.decorBarsBadge,
                            {
                              backgroundColor: theme.isDark ? "rgba(0,0,0,0.34)" : "rgba(255,255,255,0.78)",
                              borderColor: theme.isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)",
                            }
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={[styles.decorBarsBadgeText, { color: theme.colors.text }]}
                          >
                            {decorBarsLabel}
                          </Text>
                        </View>
                      ) : null}

                      <View style={[styles.frameRecess, { borderRadius: Math.max(0, radius.sm - 6) }]}>
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.recess[0] }]} />

                      <View style={styles.sashesRow}>
                        {sashSpecs.map((sash, idx) => {
                          const isOpening = sash.opening !== "fixed";
                          const handleSide = isOpening ? (sash.handleSide === "left" ? "left" : "right") : null;
                          const hingeSide = handleSide === "left" ? "right" : "left";
                          const openingIcon = handleSide === "left" ? "arrow-back" : "arrow-forward";
                          const showDoorLeaf = kind === "door" || (kind === "balconyBlock" && idx === 0);
                          const doorTopFillType = doorFillTop === "sandwich" ? "sandwich" : "glass";
                          const doorBottomFillType = doorFillBottom === "glass" ? "glass" : "sandwich";
                          const doorDividerTop = "58%";

                          const hingeOffsets = showDoorLeaf ? [0.18, 0.5, 0.82] : [0.22, 0.78];

                          const hardwareInset = Math.max(6, Math.round(sashFrameThickness * 0.7));

                          const plateW = clampInt(Math.round(sashFrameThickness * 0.65), 6, 12);
                          const plateH = clampInt(Math.round(sashFrameThickness * (showDoorLeaf ? 2.5 : 2.2)), 20, 46);
                          const leverW = clampInt(Math.round(plateH * 0.55), 12, 24);
                          const leverH = clampInt(Math.round(plateW * 0.6), 4, 8);
                          const handleW = plateW + leverW + 6;
                          const handleH = plateH + 12;
                          const handleTranslateY = -Math.round(handleH / 2);

                          const handleInset = clampInt(Math.round(sashFrameThickness - plateW - 2), 2, 18);
                          const handleTransform = [{ translateY: handleTranslateY }, ...(handleSide === "right" ? [{ scaleX: -1 }] : [])];
                          const plateTop = Math.round((handleH - plateH) / 2);
                          const leverTop = Math.round(handleH / 2 - leverH / 2);
                          const sashPxWidth =
                            sashFlexTotal > 0 ? Math.round((productSize.w * Math.max(1, sash.widthFlex)) / sashFlexTotal) : 0;
                          const sashWidthValue = sashWidthsCm[idx];
                          const showSashWidthBadge =
                            (kind === "window" || (kind === "balconyBlock" && idx > 0)) && sashPxWidth >= 92 && typeof sashWidthValue === "number" && sashWidthValue > 0;
                          const leafRadius = Math.max(6, radius.sm - 8);
                          const renderLeafFill = (fillType: "glass" | "sandwich", keyPrefix: string, fillStyle?: any) => {
                            if (fillType === "sandwich") {
                              return (
                                <View
                                  style={[
                                    styles.panel,
                                    { borderRadius: leafRadius, borderColor: palette.panelBorder, backgroundColor: "transparent" },
                                    fillStyle
                                  ]}
                                >
                                  <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.panelBase[0] }]} />
                                  <View
                                    style={[
                                      styles.panelGroove,
                                      {
                                        backgroundColor: palette.panelGroove,
                                        top: "36%",
                                      }
                                    ]}
                                  />
                                  <View
                                    style={[
                                      styles.panelGroove,
                                      {
                                        backgroundColor: palette.panelGroove,
                                        top: "64%",
                                      }
                                    ]}
                                  />
                                </View>
                              );
                            }

                            return (
                              <View
                                style={[
                                  styles.glass,
                                  {
                                    borderRadius: leafRadius,
                                    borderWidth: gasketWidth,
                                    borderColor: palette.gasket
                                  },
                                  fillStyle
                                ]}
                              >
                                <View
                                  style={[StyleSheet.absoluteFill, {
                                    backgroundColor: glassPalette.base
                                  }]}
                                />
                                {showDecorBars ? (
                                  <View pointerEvents="none" style={styles.decorBars}>
                                    <View
                                      style={[
                                        styles.decorBar,
                                        {
                                          left: "50%",
                                          top: decorBarInset,
                                          bottom: decorBarInset,
                                          width: decorBarThickness,
                                          borderRadius: Math.max(1, Math.round(decorBarThickness / 2)),
                                          transform: [{ translateX: -Math.round(decorBarThickness / 2) }],
                                        },
                                      ]}
                                    >
                                      <View style={[StyleSheet.absoluteFill, { backgroundColor: decorBarsGradient[0] }]} />
                                    </View>

                                    <View
                                      style={[
                                        styles.decorBar,
                                        {
                                          top: "33%",
                                          left: decorBarInset,
                                          right: decorBarInset,
                                          height: decorBarThickness,
                                          borderRadius: Math.max(1, Math.round(decorBarThickness / 2)),
                                          transform: [{ translateY: -Math.round(decorBarThickness / 2) }],
                                        },
                                      ]}
                                    >
                                      <View style={[StyleSheet.absoluteFill, { backgroundColor: decorBarsGradient[0] }]} />
                                    </View>

                                    <View
                                      style={[
                                        styles.decorBar,
                                        {
                                          top: "66%",
                                          left: decorBarInset,
                                          right: decorBarInset,
                                          height: decorBarThickness,
                                          borderRadius: Math.max(1, Math.round(decorBarThickness / 2)),
                                          transform: [{ translateY: -Math.round(decorBarThickness / 2) }],
                                        },
                                      ]}
                                    >
                                      <View style={[StyleSheet.absoluteFill, { backgroundColor: decorBarsGradient[0] }]} />
                                    </View>
                                  </View>
                                ) : null}
                                {/* Clean flat highlight strip */}
                                <View
                                  pointerEvents="none"
                                  style={[
                                    styles.glassSheen,
                                    {
                                      backgroundColor: glassPalette.sheen
                                    }
                                  ]}
                                />
                                {/* Bright highlight spot (top-left) */}
                                <View
                                  pointerEvents="none"
                                  style={[
                                    styles.glassHighlight,
                                    {
                                      backgroundColor: glassPalette.highlight
                                    }
                                  ]}
                                />

                                <View style={styles.glassEdges}>
                                  {showGlassEdges
                                    ? Array.from({ length: glassPanes }).map((_, edgeIdx) => (
                                        <View
                                          key={`${keyPrefix}-${edgeIdx}`}
                                          style={[
                                            styles.glassEdgeLine,
                                            {
                                              right: 4 + edgeIdx * 2,
                                              backgroundColor: glassPalette.edge,
                                              opacity: theme.isDark ? 0.55 : 0.45
                                            }
                                          ]}
                                        />
                                      ))
                                    : null}
                                </View>
                              </View>
                            );
                          };

                          return [
                            idx > 0 ? (
                              <View
                                key={`m-${idx}`}
                                style={[
                                  styles.mullion,
                                  {
                                    width: mullionWidth,
                                    backgroundColor: palette.mullion,
                                    borderLeftColor: palette.mullionEdge,
                                    borderRightColor: palette.mullionEdge,
                                  }
                                ]}
                              />
                            ) : null,
                            <View key={`s-${idx}`} style={[styles.sashWrap, { flexGrow: sash.widthFlex }]}>
                              <View
                                style={
                                  kind === "balconyBlock" && idx > 0
                                    ? { height: "50%", position: "relative" }
                                    : { height: "100%", position: "relative" }
                                }
                              >
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => onPressSash?.(idx)}
                                  style={({ pressed }: { pressed: boolean }) => [
                                    styles.sashFrame,
                                    {
                                      padding: sashFrameThickness,
                                      borderRadius: Math.max(8, radius.sm - 2),
                                      borderColor: activeSashIndex === idx ? theme.colors.primary : "transparent",
                                      borderWidth: activeSashIndex === idx ? 2 : 0,
                                    },
                                    pressed ? { opacity: 0.85 } : null
                                  ]}
                                >
                                  <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.sashOuter[0] }]} />

                                  <View
                                    style={[
                                      styles.sashInner,
                                      {
                                        borderRadius: Math.max(6, radius.sm - 6),
                                        borderColor: theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
                                      }
                                    ]}
                                  >
                                    {showDoorLeaf ? (
                                      <View style={styles.doorLeafFill}>
                                        <View style={[styles.doorLeafSegment, { flex: 58 }]}>
                                          {renderLeafFill(doorTopFillType, `door-top-${idx}`)}
                                        </View>
                                        <View style={[styles.doorLeafSegment, { flex: 42 }]}>
                                          {renderLeafFill(doorBottomFillType, `door-bottom-${idx}`)}
                                        </View>
                                        <View
                                          pointerEvents="none"
                                          style={[
                                            styles.doorLeafDivider,
                                            {
                                              top: doorDividerTop,
                                              height: frameThickness,
                                              transform: [{ translateY: -Math.round(frameThickness / 2) }],
                                              borderColor: theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
                                            }
                                          ]}
                                        >
                                          <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.sashOuter[0] }]} />
                                        </View>
                                      </View>
                                    ) : (
                                      renderLeafFill("glass", `glass-${idx}`)
                                    )}
                                  </View>
                                </Pressable>

                                {showSashWidthBadge ? (
                                  <View pointerEvents="none" style={styles.sashWidthBadge}>
                                    <View
                                      style={[
                                        styles.sashWidthBadgePill,
                                        {
                                          backgroundColor: theme.isDark ? "rgba(0,0,0,0.36)" : "rgba(255,255,255,0.78)",
                                          borderColor: theme.isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.12)",
                                        }
                                      ]}
                                    >
                                      <Text
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                        style={[styles.sashWidthBadgeText, { color: theme.colors.text }]}
                                      >
                                        {t("calculator.preview.sashWidthBadge", { width: sashWidthValue })}
                                      </Text>
                                    </View>
                                  </View>
                                ) : null}

                                {isOpening ? (
                                  <>
                                    <View
                                      style={[
                                        styles.openingBadge,
                                        handleSide === "left" ? { right: hardwareInset } : { left: hardwareInset },
                                        {
                                          backgroundColor: theme.isDark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.70)",
                                          borderColor: theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
                                        }
                                      ]}
                                    >
                                      <Ionicons name={openingIcon as any} size={12} color={theme.colors.textMuted} />
                                      {sash.opening === "tiltTurn" ? (
                                        <Ionicons name="arrow-up" size={12} color={theme.colors.textMuted} />
                                      ) : null}
                                    </View>

                                    <View
                                      style={[
                                        styles.handleSet,
                                        { top: "52%" },
                                        {
                                          width: handleW,
                                          height: handleH,
                                          transform: handleTransform
                                        },
                                        handleSide === "left" ? { left: handleInset } : { right: handleInset }
                                      ]}
                                    >
                                      <View
                                        style={[
                                          styles.handlePlate,
                                          { top: plateTop, width: plateW, height: plateH, borderRadius: Math.max(4, Math.round(plateW * 0.5)), backgroundColor: '#111827' }
                                        ]}
                                      >
                                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.handleMetal[0] }]} />
                                      </View>
                                      <View
                                        style={[
                                          styles.handleLever,
                                          {
                                            top: leverTop,
                                            left: Math.max(0, plateW - 1),
                                            width: leverW,
                                            height: leverH,
                                            borderRadius: Math.max(4, Math.round(leverH * 0.5)),
                                            backgroundColor: '#111827'
                                          }
                                        ]}
                                      >
                                        <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.handleMetal[0] }]} />
                                      </View>
                                    </View>

                                    {hingeOffsets.map((pos) => (
                                      showHinges ? (
                                        <View
                                          key={`h-${idx}-${pos}`}
                                          style={[
                                            styles.hinge,
                                            { top: `${Math.round(pos * 100)}%` },
                                            hingeSide === "left" ? { left: hardwareInset - 2 } : { right: hardwareInset - 2 },
                                            {
                                              backgroundColor: theme.isDark ? "rgba(0,0,0,0.40)" : "rgba(0,0,0,0.18)",
                                              borderColor: theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.45)"
                                            }
                                          ]}
                                        />
                                      ) : null
                                    ))}
                                  </>
                                ) : null}
                              </View>

                              {kind === "balconyBlock" && idx > 0 ? (
                                <View
                                  style={{
                                    position: "absolute",
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: "50%",
                                    backgroundColor: canvasBg,
                                    borderTopWidth: frameThickness,
                                    borderTopColor: palette.sashOuter[0],
                                  }}
                                />
                              ) : null}
                            </View>,
                          ];
                        })}
                      </View>

                      <View
                        pointerEvents="none"
                        style={[
                          styles.innerShadowBottom,
                          { backgroundColor: theme.isDark ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.06)" }
                        ]}
                      />
                    </View>
                  </View>
                </View>
                </View>
              </View>
            </View>
          )}
        </View>


    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    root: {
      gap: spacing.sm
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between"
    },
    widthDim: {
      flex: 1,
      height: 26,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface2,
      paddingHorizontal: 28,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    heightGutter: {
      width: 26
    },
    mainRow: {
      flexDirection: "row",
      gap: spacing.sm
    },
    canvas: {
      flex: 1,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: "hidden"
    },
    productWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    dimArrow: {
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    dimArrowHorizontal: {
      position: "absolute",
      left: 6,
      top: 5,
    },
    dimArrowVertical: {
      position: "absolute",
      top: 6,
      left: 5,
    },
    productShadow: {
      borderRadius: radius.md,
    },
    productClip: {
      flex: 1,
      overflow: "hidden",
    },
    frameOuter: {
      flex: 1,
      overflow: "hidden",
    },
    frameSheen: {
      ...StyleSheet.absoluteFillObject,
      opacity: 1,
    },
    frameInner: {
      flex: 1,
      position: "relative",
    },
    frameRecess: {
      flex: 1,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.10)",
    },
    drainSlots: {
      position: "absolute",
      left: "22%",
      right: "22%",
      height: 3,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    drainSlot: {
      width: 14,
      height: 2,
      borderRadius: 2,
    },
    decorBarsBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      maxWidth: "80%",
      zIndex: 6,
    },
    decorBarsBadgeText: {
      ...font(800),
      fontSize: 10,
      lineHeight: 12,
    },
    sashesRow: {
      flex: 1,
      flexDirection: "row"
    },
    mullion: {
      alignSelf: "stretch",
      borderLeftWidth: 1,
      borderRightWidth: 1,
      opacity: 0.98,
    },
    sashWrap: {
      flexGrow: 1,
      flexBasis: 0,
      flexShrink: 1,
      position: "relative",
    },
    sashFrame: {
      flex: 1,
      overflow: "hidden",
    },
    sashWidthBadge: {
      position: "absolute",
      top: 6,
      left: 2,
      right: 2,
      alignItems: "center",
      zIndex: 5,
      pointerEvents: "none",
    },
    sashWidthBadgePill: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 3,
      maxWidth: "100%",
    },
    sashWidthBadgeText: {
      ...font(800),
      fontSize: 10,
      lineHeight: 12,
    },
    sashInner: {
      flex: 1,
      overflow: "hidden",
      borderWidth: 1,
      backgroundColor: theme.isDark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.55)",
    },
    doorLeafFill: {
      flex: 1,
      position: "relative",
    },
    doorLeafSegment: {
      flex: 1,
    },
    doorLeafDivider: {
      position: "absolute",
      left: 0,
      right: 0,
      borderRadius: 0,
      borderWidth: 1,
      overflow: "hidden",
      opacity: 0.98,
    },
    glass: {
      flex: 1,
      overflow: "hidden",
      backgroundColor: "transparent",
    },
    glassSheen: {
      position: "absolute",
      left: "8%",
      top: "3%",
      width: "38%",
      height: "94%",
      transform: [{ skewX: "-14deg" }],
      borderRadius: 999,
      opacity: 0.85,
    },
    glassAmbient: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "40%",
      opacity: 0.9,
    },
    glassHighlight: {
      position: "absolute",
      left: "12%",
      top: "8%",
      width: "22%",
      height: "18%",
      borderRadius: 999,
      opacity: 0.7,
      transform: [{ rotate: "-25deg" }],
    },
    glassEdges: {
      ...StyleSheet.absoluteFillObject,
      pointerEvents: "none",
    },
    glassEdgeLine: {
      position: "absolute",
      top: "14%",
      bottom: "14%",
      width: 1,
      borderRadius: 1,
    },
    decorBars: {
      ...StyleSheet.absoluteFillObject,
      pointerEvents: "none",
    },
    decorBar: {
      position: "absolute",
      overflow: "hidden",
      opacity: theme.isDark ? 0.92 : 0.88,
    },
    panel: {
      flex: 1,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.10)",
      backgroundColor: theme.isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.65)",
    },
    panelGroove: {
      position: "absolute",
      left: "10%",
      right: "10%",
      height: 1,
      opacity: 0.8,
    },
    openingBadge: {
      position: "absolute",
      top: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 3
    },
    handleSet: {
      position: "absolute",
    },
    handlePlate: {
      position: "absolute",
      left: 0,
      opacity: 0.95,
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)",
    },
    handleLever: {
      position: "absolute",
      opacity: 0.92,
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)",
    },
    hinge: {
      position: "absolute",
      width: 9,
      height: 14,
      borderRadius: 5,
      transform: [{ translateY: -7 }],
      borderWidth: 1,
      opacity: 0.95,
    },
    innerShadowBottom: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 22,
      opacity: 0.9,
    },
    heightDim: {
      width: 26,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface2,
      paddingVertical: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    dimText: {
      ...font(800),
      fontSize: 12,
      letterSpacing: 0.2,
      textAlign: "center",
    },
    dimTextVertical: {
      transform: [{ rotate: "90deg" }],
      width: 90,
      textAlign: "center",
    },
    placeholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.md,
      gap: spacing.md
    },
    placeholderIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 4,
    },
    placeholderText: {
      ...font(700),
      fontSize: 13,
      textAlign: "center"
    }
  });
}
