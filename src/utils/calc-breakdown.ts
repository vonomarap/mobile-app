import type { CalcBreakdown, CalcLineItem, CalcResultDTO } from "./calc";
import { mergeCalcBreakdowns } from "./calc";

type Translate = (key: string, options?: Record<string, unknown>) => string;

const OPTION_LABEL_KEYS: Record<string, string> = {
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
  trash_removal: "calculator.extras.trashRemoval",
};

function labelOptionKey(t: Translate, key: string): string {
  const tk = OPTION_LABEL_KEYS[key];
  return tk ? t(tk) : key;
}

export function buildQuoteBreakdown(
  calcDtos: Array<CalcResultDTO | undefined | null>,
  discount = 0
): CalcBreakdown | null {
  const breakdowns = calcDtos
    .map((dto) => dto?.pricing?.breakdown)
    .filter((value): value is CalcBreakdown => Boolean(value && value.groups?.length));

  if (!breakdowns.length && discount <= 0) return null;

  const extraItems: CalcLineItem[] = discount > 0
    ? [{ groupKey: "discount", key: "promo_discount", qty: 1, unitPrice: -discount, total: -discount }]
    : [];

  return mergeCalcBreakdowns(breakdowns, extraItems);
}

export function getCalcBreakdownGroupLabel(t: Translate, key: string): string {
  return t(`calculator.breakdown.groups.${key}`, { defaultValue: key });
}

export function getCalcBreakdownItemLabel(t: Translate, item: CalcLineItem): string {
  const [prefix, rawValue = ""] = item.key.split(":");

  if (prefix === "base_product") {
    const value = rawValue === "entrance_door" || rawValue === "interior_door" || rawValue === "balcony_door"
      ? t(`calculator.breakdown.baseProducts.${rawValue}`, { defaultValue: rawValue })
      : rawValue === "window"
        ? t("calculator.types.window")
        : rawValue === "door"
          ? t("calculator.types.door")
          : rawValue;
    return t("calculator.breakdown.items.baseProduct", { value, defaultValue: value });
  }

  if (prefix === "material") {
    return t("calculator.breakdown.items.material", {
      value: t(`calculator.materials.${rawValue}`, { defaultValue: rawValue.toUpperCase() }),
      defaultValue: rawValue,
    });
  }

  if (prefix === "profile_series") {
    return t("calculator.breakdown.items.profileSeries", {
      value: t(`calculator.profileSeriesOptions.${rawValue}`, { defaultValue: rawValue.toUpperCase() }),
      defaultValue: rawValue,
    });
  }

  if (prefix === "profile_model") {
    return t("calculator.breakdown.items.profileModel", {
      value: t(`calculator.profileModels.${rawValue}`, { defaultValue: rawValue }),
      defaultValue: rawValue,
    });
  }

  if (prefix === "profile_depth") {
    return t("calculator.breakdown.items.profileDepth", { value: rawValue, defaultValue: rawValue });
  }

  if (prefix === "glazing") {
    return t("calculator.breakdown.items.glazing", {
      value: t(`calculator.glazingOptions.${rawValue}`, { defaultValue: rawValue }),
      defaultValue: rawValue,
    });
  }

  if (prefix === "glass_option") {
    if (rawValue === "energy_saving") return t("calculator.energySaving");
    if (rawValue === "multi_functional") return t("calculator.multiFunctional");
  }

  if (prefix === "lamination") {
    return t("calculator.breakdown.items.lamination", {
      value: t(`calculator.laminationOptions.${rawValue}`, { defaultValue: rawValue }),
      defaultValue: rawValue,
    });
  }

  if (prefix === "lamination_group") {
    const value =
      rawValue === "white"
        ? t("calculator.breakdown.values.whiteBase", { defaultValue: "Белая основа" })
        : t(`calculator.laminationGroups.${rawValue}`, { defaultValue: rawValue });
    return t("calculator.breakdown.items.laminationGroup", { value, defaultValue: rawValue });
  }

  if (prefix === "lamination_side") {
    return t("calculator.breakdown.items.laminationSide", {
      value: t(`calculator.designOptions.${rawValue}`, { defaultValue: rawValue }),
      defaultValue: rawValue,
    });
  }

  if (prefix === "lamination_color") {
    const value =
      rawValue === "gold_oak"
        ? t("calculator.laminationColorOptions.goldOak")
        : rawValue === "grey_oak"
          ? t("calculator.laminationColorOptions.greyOak")
          : rawValue === "dark_oak"
            ? t("calculator.laminationColorOptions.darkOak")
            : rawValue === "other"
              ? t("calculator.laminationColorOptions.other")
              : rawValue;
    return t("calculator.breakdown.items.laminationColor", { value, defaultValue: rawValue });
  }

  if (prefix === "door_fill_top") {
    return t("calculator.breakdown.items.doorFillTop", {
      value: t(`calculator.entrance.fillTypes.${rawValue}`, { defaultValue: rawValue }),
      defaultValue: rawValue,
    });
  }

  if (prefix === "door_fill_bottom") {
    return t("calculator.breakdown.items.doorFillBottom", {
      value: t(`calculator.entrance.fillTypes.${rawValue}`, { defaultValue: rawValue }),
      defaultValue: rawValue,
    });
  }

  if (prefix === "opening_sashes") {
    return t("calculator.breakdown.items.openingSashes", {
      value: t(`calculator.openingTypes.${rawValue}`, { defaultValue: rawValue }),
      defaultValue: rawValue,
    });
  }

  if (prefix === "hardware") {
    return item.title?.trim()
      ? t("calculator.breakdown.items.hardwareNamed", { value: item.title.trim(), defaultValue: item.title.trim() })
      : t("calculator.hardware");
  }

  if (prefix === "option") {
    return labelOptionKey(t, rawValue);
  }

  if (item.key === "meeting_pair_kit") return t("calculator.breakdown.items.meetingPairKit");
  if (item.key === "mullion") return t("calculator.breakdown.items.mullion");
  if (item.key === "install_area") return t("calculator.breakdown.items.installArea");
  if (item.key === "install_sashes") return t("calculator.breakdown.items.installSashes");
  if (item.key === "delivery_base") return t("calculator.breakdown.items.deliveryBase");
  if (item.key === "delivery_distance") return t("calculator.breakdown.items.deliveryDistance");
  if (item.key === "rounding") return t("calculator.breakdown.items.rounding");
  if (item.key === "promo_discount") return t("calculator.breakdown.items.promoDiscount");

  return item.title?.trim() || item.key;
}
