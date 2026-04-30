import * as VectorIcons from "@expo/vector-icons";
import { Platform } from "react-native";

const ICON_FONT_CACHE_VERSION = "icon-fonts-20260421a";
const ICON_FONT_CACHE_QUERY = `v=${ICON_FONT_CACHE_VERSION}`;

type UriFontAsset = {
  uri: string;
} & Record<string, unknown>;

type FontMap = Record<string, string | UriFontAsset | unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUriFontAsset(value: unknown): value is UriFontAsset {
  return isRecord(value) && typeof value.uri === "string";
}

function appendIconFontCacheVersion(uri: string): string {
  if (!uri || uri.includes(ICON_FONT_CACHE_QUERY)) return uri;

  const hashIndex = uri.indexOf("#");
  const uriWithoutHash = hashIndex === -1 ? uri : uri.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : uri.slice(hashIndex);
  const separator = uriWithoutHash.includes("?") ? "&" : "?";

  return `${uriWithoutHash}${separator}${ICON_FONT_CACHE_QUERY}${hash}`;
}

function getFontMap(iconSet: unknown): FontMap | null {
  if (!isRecord(iconSet) && typeof iconSet !== "function") return null;

  const font = (iconSet as { font?: unknown }).font;
  return isRecord(font) ? (font as FontMap) : null;
}

if (Platform.OS === "web") {
  const iconSets = VectorIcons as unknown as Record<string, unknown>;

  for (const iconSet of Object.values(iconSets)) {
    const font = getFontMap(iconSet);
    if (!font) continue;

    for (const [fontFamily, asset] of Object.entries(font)) {
      if (typeof asset === "string") {
        font[fontFamily] = appendIconFontCacheVersion(asset);
      } else if (isUriFontAsset(asset)) {
        asset.uri = appendIconFontCacheVersion(asset.uri);
      }
    }
  }
}
