import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export type IoniconName = ComponentProps<typeof Ionicons>["name"];

export const ICON_SIZE = {
  sm: 16,
  md: 18,
  lg: 22,
} as const;

export const calculatorSectionIcon: Record<
  | "preview"
  | "dimensions"
  | "construction"
  | "entrance"
  | "profile"
  | "glazing"
  | "design"
  | "extras"
  | "services"
  | "promo"
  | "contact"
  | "address",
  IoniconName
> = {
  preview: "scan-outline",
  dimensions: "resize-outline",
  construction: "build-outline",
  entrance: "shield-outline",
  profile: "layers-outline",
  glazing: "albums-outline",
  design: "color-palette-outline",
  extras: "add-circle-outline",
  services: "car-outline",
  promo: "pricetag-outline",
  contact: "person-circle-outline",
  address: "location-outline",
};
