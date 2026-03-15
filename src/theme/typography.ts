import { Platform } from "react-native";
import { font } from "./font";

const monoFont = Platform.select({
  ios: "Menlo",
  android: "monospace",
  web: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  default: "monospace"
});

export const typography = {
  h1: {
    ...font(900),
    fontSize: 28,
    lineHeight: 34,
  },
  h2: {
    ...font(900),
    fontSize: 24,
    lineHeight: 30,
  },
  h3: {
    ...font(900),
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    ...font(500),
    fontSize: 16,
    lineHeight: 24,
  },
  bodyRegular: {
    ...font(400),
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    ...font(500),
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    ...font(700),
    fontSize: 13,
    lineHeight: 18,
  },
  mono: {
    fontFamily: monoFont,
    fontSize: 13,
    lineHeight: 18
  }
};

export type TypographyTokens = typeof typography;
