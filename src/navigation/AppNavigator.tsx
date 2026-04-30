import { DarkTheme, DefaultTheme, NavigationContainer, type LinkingOptions, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";
import { Platform } from "react-native";
import { AccountScreen } from "../screens/AccountScreen";
import { CalculatorScreen } from "../screens/CalculatorScreen";
import { CartScreen } from "../screens/CartScreen";
import { CatalogScreen } from "../screens/CatalogScreen";
import { ContactsScreen } from "../screens/ContactsScreen";
import { FaqScreen } from "../screens/FaqScreen";
import { GalleryScreen } from "../screens/GalleryScreen";
import { MoskitkiScreen } from "../screens/MoskitkiScreen";
import { ProductDetailsScreen } from "../screens/ProductDetailsScreen";
import { QuoteDetailsScreen } from "../screens/QuoteDetailsScreen";
import { QuoteRequestScreen } from "../screens/QuoteRequestScreen";
import { QuotesScreen } from "../screens/QuotesScreen";
import { SupportChatScreen } from "../screens/SupportChatScreen";
import { HELP_SECTION_KEYS, type HelpSectionKey, RootStackParamList } from "./types";
import { useTheme } from "../theme/ThemeProvider";
import { SupportChatFab } from "../components/SupportChatFab";
import { TopLeftMenu } from "../components/TopLeftMenu";

const Stack = createNativeStackNavigator<RootStackParamList>();
type RouteName = keyof RootStackParamList;

export function AppNavigator({
  onNavReady,
  onRouteChange
}: {
  onNavReady?: (routeName: RouteName | undefined) => void;
  onRouteChange?: (routeName: RouteName | undefined) => void;
} = {}): JSX.Element {
  const theme = useTheme();
  const navRef = useNavigationContainerRef();

  const navigationTheme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.bg,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.danger
      }
    };
  }, [theme]);

  const linking = useMemo<LinkingOptions<RootStackParamList> | undefined>(() => {
    if (Platform.OS !== "web") return undefined;

    const origin = ((globalThis as any).location as any)?.origin;
    const prefix = typeof origin === "string" && origin ? origin : "https://kanokna.web.app";

    return {
      prefixes: [prefix, "https://kanokna.web.app", "https://kanokna.firebaseapp.com"],
      config: {
        screens: {
          Catalog: { path: "", alias: ["catalog"] },
          Faq: {
            path: "faq/:section?",
            parse: {
              section: (value: string) =>
                HELP_SECTION_KEYS.includes(value as HelpSectionKey) ? (value as HelpSectionKey) : undefined
            }
          },
          Moskitki: "moskitki",
          Gallery: "gallery",
          Calculator: {
            path: "calculator/:presetProductType?",
            parse: {
              presetProductType: (value: string) => (value === "window" || value === "door" ? value : undefined)
            }
          },
          Cart: "cart",
          Contacts: "contacts",
          SupportChat: "support",
          ProductDetails: "product/:productId",
          QuoteDetails: "quote/:quoteId"
        }
      }
    };
  }, []);

  return (
    <NavigationContainer
      ref={navRef}
      theme={navigationTheme}
      linking={linking}
      onReady={() => {
        const name = navRef.getCurrentRoute?.()?.name as RouteName | undefined;
        onNavReady?.(name);
      }}
      onStateChange={() => {
        const name = navRef.getCurrentRoute?.()?.name as RouteName | undefined;
        onRouteChange?.(name);
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg }
        }}
      >
        <Stack.Screen name="Catalog" component={CatalogScreen} />
        <Stack.Screen name="Faq" component={FaqScreen} />
        <Stack.Screen name="Moskitki" component={MoskitkiScreen} />
        <Stack.Screen name="Gallery" component={GalleryScreen} />
        <Stack.Screen name="Calculator" component={CalculatorScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Contacts" component={ContactsScreen} />
        <Stack.Screen name="SupportChat" component={SupportChatScreen} />
        <Stack.Screen name="QuoteRequest" component={QuoteRequestScreen} />
        <Stack.Screen name="Account" component={AccountScreen} />
        <Stack.Screen name="Quotes" component={QuotesScreen} />
        <Stack.Screen name="QuoteDetails" component={QuoteDetailsScreen} />
        <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
      </Stack.Navigator>

      <TopLeftMenu />
      <SupportChatFab />
    </NavigationContainer>
  );
}
