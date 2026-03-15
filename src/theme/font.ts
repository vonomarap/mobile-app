import { Platform, type TextStyle } from "react-native";

export type FontWeightToken = 400 | 500 | 600 | 700 | 800 | 900;

const webFontStack = 'Roboto, system-ui, -apple-system, "Segoe UI", Arial, sans-serif';

const nativeFontByWeight: Record<FontWeightToken, string> = {
  400: "Roboto_400Regular",
  500: "Roboto_500Medium",
  600: "Roboto_700Bold",
  700: "Roboto_700Bold",
  800: "Roboto_900Black",
  900: "Roboto_900Black"
};

export function font(weight: FontWeightToken): { fontFamily: string } & Partial<Pick<TextStyle, "fontWeight">> {
  if (Platform.OS === "web") {
    const normalized = weight === 800 ? 900 : weight === 600 ? 700 : weight;
    return { fontFamily: webFontStack, fontWeight: String(normalized) as TextStyle["fontWeight"] };
  }

  return { fontFamily: nativeFontByWeight[weight] };
}

export const defaultFontFamily = Platform.OS === "web" ? webFontStack : nativeFontByWeight[400];
