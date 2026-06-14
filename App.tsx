import "./src/setup/vector-icon-font-cache-bust";
import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { useTranslation } from "react-i18next";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/services/auth-context";
import { CurrencyProvider } from "./src/services/currency-context";
import { ScrollProvider } from "./src/services/scroll-context";
import { CartProvider } from "./src/services/cart-context";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import { robotoFonts } from "./src/theme/roboto-fonts";
import { defaultFontFamily } from "./src/theme/font";
import { fetchSiteSettings } from "./src/services/site-settings";
import { hydrateLanguagePreference } from "./src/services/i18n";
import { trackSiteVisitOnce } from "./src/services/public-analytics";

const queryClient = new QueryClient();

export default function App(): JSX.Element {
  const [fontsLoaded] = useFonts(robotoFonts as any);

  useEffect(() => {
    void hydrateLanguagePreference();
  }, []);


  if (!fontsLoaded && Platform.OS !== "web") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7F8" }}>
        <ActivityIndicator color="#EA580C" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ScrollProvider>
            <CurrencyProvider>
              <AppErrorBoundary>
                <AuthProvider>
                  <QueryClientProvider client={queryClient}>
                    <CartProvider>
                      <AppShell />
                    </CartProvider>
                  </QueryClientProvider>
                </AuthProvider>
              </AppErrorBoundary>
            </CurrencyProvider>
          </ScrollProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const isWeb = Platform.OS === "web";
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isWeb) return;
    void trackSiteVisitOnce().finally(() => {
      void queryClient.invalidateQueries({ queryKey: ["app_settings", "public_analytics"] });
    });
  }, [isWeb, queryClient]);

  const siteSettingsQuery = useQuery({
    queryKey: ["app_settings", "site"],
    queryFn: fetchSiteSettings,
    enabled: isWeb,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const brandName = (siteSettingsQuery.data?.brandName ?? "").trim() || "Канокна";

  const lastRouteRef = useRef<string | null>(null);

  const SEO_BASE_URL = "https://kanokna.org";
  const SEO_CATALOG_PAGE_TITLE = `Каталог окон и дверей`;
  const SEO_CATALOG_DESCRIPTION =
    "Каталог окон, дверей и комплектующих. Выберите товар и рассчитайте стоимость в калькуляторе.";
  const SEO_OG_IMAGES = {
    catalog: `${SEO_BASE_URL}/og-catalog-v3.png`,
    gallery: `${SEO_BASE_URL}/og-gallery-v3.png`,
    calculator: `${SEO_BASE_URL}/og-calculator-v3.png`,
    contacts: `${SEO_BASE_URL}/og-contacts-v3.png`,
    product: `${SEO_BASE_URL}/og-catalog-v3.png`,
  } as const;
  const SEO_DEFAULT_DESCRIPTION = SEO_CATALOG_DESCRIPTION;

  const setWebTitleForRoute = (routeName: string | null) => {
    if (!isWeb) return;
    const doc = (globalThis as any).document as { title?: string } | undefined;
    if (!doc) return;

    let page = SEO_CATALOG_PAGE_TITLE;
    switch (routeName) {
      case "Home":
        page = SEO_CATALOG_PAGE_TITLE;
        break;
      case "Catalog":
        page = SEO_CATALOG_PAGE_TITLE;
        break;
      case "Gallery":
        page = `Галерея работ`;
        break;
      case "Calculator":
        page = `Калькулятор стоимости окон и дверей`;
        break;
      case "Moskitki":
        page = `Москитные сетки`;
        break;
      case "Cart":
        page = "Корзина";
        break;
      case "Contacts":
        page = `Контакты`;
        break;
      case "SupportChat":
        page = t("support.title");
        break;
      case "Account":
        page = t("tabs.account");
        break;
      case "Quotes":
        page = t("quotes.title");
        break;
      case "QuoteRequest":
        page = t("calculator.quoteTitle");
        break;
      case "QuoteDetails":
        page = t("quotes.details.title", { defaultValue: t("calculator.quoteTitle") });
        break;
      case "ProductDetails":
        page = "Товар";
        break;
      default:
        page = SEO_CATALOG_PAGE_TITLE;
        break;
    }

    doc.title = page ? `${page} | ${brandName}` : brandName;
  };

  const setWebSeoForRoute = (routeName: string | null) => {
    if (!isWeb) return;
    const doc = (globalThis as any).document as any;
    if (!doc?.head || !doc.createElement) return;

    const upsertMeta = (key: { name?: string; property?: string }, content: string) => {
      const selector = key.name ? `meta[name="${key.name}"]` : `meta[property="${key.property}"]`;
      const existing = doc.head.querySelector?.(selector) ?? null;
      const el = existing ?? doc.createElement("meta");
      if (!existing) {
        if (key.name) el.setAttribute("name", key.name);
        if (key.property) el.setAttribute("property", key.property);
        doc.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const upsertCanonical = (href: string) => {
      const existing = doc.head.querySelector?.('link[rel="canonical"]') ?? null;
      const el = existing ?? doc.createElement("link");
      if (!existing) {
        el.setAttribute("rel", "canonical");
        doc.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    const pathnameRaw = ((globalThis as any).location as any)?.pathname;
    const pathname = typeof pathnameRaw === "string" && pathnameRaw.startsWith("/") ? pathnameRaw : "/";

    const ogImageUrl = (() => {
      switch (routeName) {
        case "Home":
          return SEO_OG_IMAGES.catalog;
        case "Catalog":
          return SEO_OG_IMAGES.catalog;
        case "Gallery":
          return SEO_OG_IMAGES.gallery;
        case "Calculator":
          return SEO_OG_IMAGES.calculator;
        case "Moskitki":
          return SEO_OG_IMAGES.catalog;
        case "Contacts":
          return SEO_OG_IMAGES.contacts;
        case "ProductDetails":
          return SEO_OG_IMAGES.product;
        default:
          return SEO_OG_IMAGES.catalog;
      }
    })();

const isIndexable =
      !routeName ||
      routeName === "Home" ||
      routeName === "Catalog" ||
      routeName === "Moskitki" ||
      routeName === "Gallery" ||
      routeName === "Calculator" ||
      routeName === "Contacts" ||
      routeName === "ProductDetails";

    const canonical = (() => {
      if (!isIndexable) return `${SEO_BASE_URL}/`;
      if (routeName === "Home") return `${SEO_BASE_URL}/`;
      if (routeName === "Catalog") return `${SEO_BASE_URL}/`;
      if (routeName === "Gallery") return `${SEO_BASE_URL}/gallery`;
      if (routeName === "Contacts") return `${SEO_BASE_URL}/contacts`;
      if (routeName === "Moskitki") return `${SEO_BASE_URL}/moskitki`;
      if (routeName === "ProductDetails") {
        if (pathname.startsWith("/product/")) return `${SEO_BASE_URL}${pathname}`;
        return `${SEO_BASE_URL}/product`;
      }
      if (routeName === "Calculator") {
        // Keep /calculator/window and /calculator/door canonical if present.
        if (pathname.startsWith("/calculator")) return `${SEO_BASE_URL}${pathname}`;
        return `${SEO_BASE_URL}/calculator`;
      }
      return `${SEO_BASE_URL}/`;
    })();

    const { title, description } = (() => {
      switch (routeName) {
        case "Home":
          return {
            title: `${SEO_CATALOG_PAGE_TITLE} | ${brandName}`,
            description: SEO_CATALOG_DESCRIPTION
          };
        case "Catalog":
          return {
            title: `${SEO_CATALOG_PAGE_TITLE} | ${brandName}`,
            description: SEO_CATALOG_DESCRIPTION
          };
        case "Gallery":
          return {
            title: `Галерея работ | ${brandName}`,
            description: "Примеры установленных окон и дверей. Посмотрите фото наших работ в Каневской и Каневском районе."
          };
        case "Calculator":
          return {
            title: `Калькулятор стоимости окон и дверей | ${brandName}`,
            description: "Онлайн-расчет стоимости окон и дверей. Выберите параметры и размеры, затем отправьте заявку."
          };
        case "Moskitki":
          return {
            title: `Москитные сетки | ${brandName}`,
            description: "Москитные сетки на пластиковые окна и двери. Замер и установка в Каневской и Каневском районе."
          };
        case "Contacts":
          return {
            title: `Контакты | ${brandName}`,
            description: "Мессенджеры для связи. Напишите нам для замера и расчета."
          };
        case "SupportChat":
          return {
            title: `${t("support.title")} | ${brandName}`,
            description: "Чат поддержки клиентов Window & Door Store."
          };
        case "Account":
          return {
            title: `${t("tabs.account")} | ${brandName}`,
            description: SEO_DEFAULT_DESCRIPTION
          };
        case "Quotes":
          return {
            title: `${t("quotes.title")} | ${brandName}`,
            description: SEO_DEFAULT_DESCRIPTION
          };
        case "QuoteRequest":
          return {
            title: `${t("calculator.quoteTitle")} | ${brandName}`,
            description: SEO_DEFAULT_DESCRIPTION
          };
        case "QuoteDetails":
          return {
            title: `${t("quotes.details.title", { defaultValue: t("calculator.quoteTitle") })} | ${brandName}`,
            description: SEO_DEFAULT_DESCRIPTION
          };
        case "ProductDetails":
          return {
            title: `Товар | ${brandName}`,
            description: "Карточка товара с описанием, характеристиками и переходом в калькулятор стоимости."
          };
        default:
          return {
            title: `${SEO_CATALOG_PAGE_TITLE} | ${brandName}`,
            description: SEO_CATALOG_DESCRIPTION
          };
      }
    })();

    // Keep title + meta in sync (Google will usually render JS, but base HTML is injected too).
    try {
      doc.title = title;
    } catch {
      // ignore
    }

    upsertMeta({ name: "description" }, description);
    upsertMeta({ name: "robots" }, isIndexable ? "index,follow" : "noindex,nofollow");
    upsertCanonical(canonical);

    upsertMeta({ property: "og:title" }, title);
    upsertMeta({ property: "og:description" }, description);
    upsertMeta({ property: "og:type" }, "website");
    upsertMeta({ property: "og:url" }, canonical);
    upsertMeta({ property: "og:site_name" }, brandName);
    upsertMeta({ property: "og:locale" }, "ru_RU");
    upsertMeta({ property: "og:image" }, ogImageUrl);

    upsertMeta({ name: "twitter:card" }, "summary_large_image");
    upsertMeta({ name: "twitter:title" }, title);
    upsertMeta({ name: "twitter:description" }, description);
    upsertMeta({ name: "twitter:image" }, ogImageUrl);
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const doc = (globalThis as any).document as any;
    if (!doc) return;

    const bg = theme.colors.bg;
    const root = doc.getElementById?.("root");

    try {
      // Browser-level locale hint.
      if (doc.documentElement) doc.documentElement.lang = "ru";

      const head = doc.head;
      if (head && !doc.getElementById?.("roboto-fonts-link")) {
        const preconnect1 = doc.createElement("link");
        preconnect1.rel = "preconnect";
        preconnect1.href = "https://fonts.googleapis.com";
        preconnect1.id = "roboto-fonts-preconnect-1";

        const preconnect2 = doc.createElement("link");
        preconnect2.rel = "preconnect";
        preconnect2.href = "https://fonts.gstatic.com";
        preconnect2.crossOrigin = "anonymous";
        preconnect2.id = "roboto-fonts-preconnect-2";

        const link = doc.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap";
        link.id = "roboto-fonts-link";

        head.appendChild(preconnect1);
        head.appendChild(preconnect2);
        head.appendChild(link);
      }
    } catch {
      // ignore
    }

    // Hide scrollbars on web (keep scrolling enabled).
    try {
      const head = doc.head;
      if (head && !doc.getElementById?.("no-scrollbar-style")) {
        const style = doc.createElement("style");
        style.id = "no-scrollbar-style";
        style.textContent = `
          * { scrollbar-width: none; -ms-overflow-style: none; }
          *::-webkit-scrollbar { width: 0; height: 0; }
        `;
        head.appendChild(style);
      }
    } catch {
      // ignore
    }

    // Mobile browsers (Chrome/Safari) can change the visible viewport height as the address bar hides/shows.
    // When that happens, the extra area can reveal the page background (often white). Keep it in sync with the app theme.
    try {
      if (doc.documentElement?.style) {
        doc.documentElement.style.backgroundColor = bg;
        doc.documentElement.style.overscrollBehaviorY = "none";
        doc.documentElement.style.overscrollBehaviorX = "none";
        doc.documentElement.style.overflowX = "hidden";
        doc.documentElement.style.fontFamily = defaultFontFamily;
      }
      if (doc.body?.style) {
        doc.body.style.backgroundColor = bg;
        doc.body.style.overscrollBehaviorY = "none";
        doc.body.style.overscrollBehaviorX = "none";
        doc.body.style.overflowX = "hidden";
        doc.body.style.fontFamily = defaultFontFamily;
      }
      if (root?.style) {
        root.style.backgroundColor = bg;
        root.style.height = "100%";
        root.style.minHeight = "100vh";
        // Override to dynamic viewport height when supported (prevents "gap" when browser UI collapses).
        root.style.minHeight = "100dvh";
      }
    } catch {
      // ignore
    }
  }, [theme.colors.bg]);

  useEffect(() => {
    if (!isWeb) return;
    // If the brand name changes (loaded from Firestore), keep the current route title in sync.
    setWebTitleForRoute(lastRouteRef.current);
    setWebSeoForRoute(lastRouteRef.current);
  }, [brandName, isWeb]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} backgroundColor={theme.colors.bg} />
      <AppNavigator
        onNavReady={(name) => {
          lastRouteRef.current = name ?? null;
          setWebTitleForRoute(lastRouteRef.current);
          setWebSeoForRoute(lastRouteRef.current);
        }}
        onRouteChange={(name) => {
          if (!isWeb) return;
          const next = name ?? null;
          if (next === lastRouteRef.current) return;
          lastRouteRef.current = next;
          setWebTitleForRoute(lastRouteRef.current);
          setWebSeoForRoute(lastRouteRef.current);
        }}
      />
    </View>
  );
}
