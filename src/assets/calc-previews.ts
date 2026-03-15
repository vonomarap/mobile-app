import type { ImageSourcePropType } from "react-native";

import profileDepth60 from "../../assets/calc/profile-depth-60.png";
import profileDepth70 from "../../assets/calc/profile-depth-70.png";
import profileDepth85 from "../../assets/calc/profile-depth-85.png";
import glazingSingle from "../../assets/calc/glazing-single.png";
import glazingDouble from "../../assets/calc/glazing-double.png";
import laminationNone from "../../assets/calc/lamination-none.png";
import laminationOneSide from "../../assets/calc/lamination-one-side.png";
import laminationTwoSide from "../../assets/calc/lamination-two-side.png";
import designNone from "../../assets/calc/design-none.png";
import designOutside from "../../assets/calc/design-outside.png";
import designInside from "../../assets/calc/design-inside.png";
import designTwoSideWhite from "../../assets/calc/design-two-side-white.png";
import designTwoSideColor from "../../assets/calc/design-two-side-color.png";
import laminationColorGoldOak from "../../assets/calc/lamination-color-gold-oak.png";
import laminationColorGreyOak from "../../assets/calc/lamination-color-grey-oak.png";
import laminationColorDarkOak from "../../assets/calc/lamination-color-dark-oak.png";

export const profileDepthPreview: Record<"60" | "70" | "85", ImageSourcePropType> = {
  "60": profileDepth60,
  "70": profileDepth70,
  "85": profileDepth85,
};

export const glazingPreview: Record<"single" | "double", ImageSourcePropType> = {
  single: glazingSingle,
  double: glazingDouble,
};

export const laminationPreview: Record<"none" | "oneSide" | "twoSide", ImageSourcePropType> = {
  none: laminationNone,
  oneSide: laminationOneSide,
  twoSide: laminationTwoSide,
};

export const designPreview: Record<"none" | "outside" | "inside" | "twoSideWhite" | "twoSideColor", ImageSourcePropType> = {
  none: designNone,
  outside: designOutside,
  inside: designInside,
  twoSideWhite: designTwoSideWhite,
  twoSideColor: designTwoSideColor,
};

export const laminationColorPreview: Record<"gold_oak" | "grey_oak" | "dark_oak", ImageSourcePropType> = {
  gold_oak: laminationColorGoldOak,
  grey_oak: laminationColorGreyOak,
  dark_oak: laminationColorDarkOak,
};
