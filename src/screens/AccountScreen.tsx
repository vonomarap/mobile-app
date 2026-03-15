import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "firebase/auth";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { AppScrollView } from "../components/AppScrollView";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../services/auth-context";
import { auth, googleClientIds } from "../services/firebase";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme } from "../theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

export function AccountScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [authBusy, setAuthBusy] = useState(false);
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = Platform.OS === "web" && width >= theme.layout.desktopNavMinWidth;
  const isGoogleClientConfigured =
    (Platform.OS === "ios" && googleClientIds.ios.length > 0) ||
    (Platform.OS === "android" && googleClientIds.android.length > 0) ||
    (Platform.OS === "web" && googleClientIds.web.length > 0);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: googleClientIds.ios,
    androidClientId: googleClientIds.android,
    webClientId: googleClientIds.web
  });

  useEffect(() => {
    const run = async () => {
      if (Platform.OS === "web") {
        // Handle Firebase redirect flow when popup is blocked.
        try {
          await getRedirectResult(auth);
        } catch (error) {
          // Non-fatal: user can still sign in again.
          console.warn("Google redirect result failed:", error);
        } finally {
          setAuthBusy(false);
        }

        return;
      }

      if (response?.type !== "success") return;
      const idToken = response.authentication?.idToken;
      if (!idToken) return;

      try {
        setAuthBusy(true);
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      } catch (error) {
        const message = error instanceof Error ? error.message : t("account.authError");
        Alert.alert(t("account.authError"), message);
      } finally {
        setAuthBusy(false);
      }
    };

    void run();
  }, [response, t]);

  const onEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("account.authError"), "Email and password are required");
      return;
    }

    try {
      setAuthBusy(true);
      if (authMode === "register") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      setEmail("");
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("account.authError");
      Alert.alert(t("account.authError"), message);
    } finally {
      setAuthBusy(false);
    }
  };

  const onGoogleAuth = async () => {
    if (Platform.OS !== "web" && (!isGoogleClientConfigured || !request)) {
      Alert.alert(t("account.authError"), t("account.googleNotConfigured"));
      return;
    }

    try {
      setAuthBusy(true);
      if (Platform.OS === "web") {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });

        try {
          await signInWithPopup(auth, provider);
          setAuthBusy(false);
        } catch (error) {
          const code = typeof error === "object" && error && "code" in error ? String((error as any).code) : "";
          // If popups are blocked, fallback to redirect.
          if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
            await signInWithRedirect(auth, provider);
            // redirect will navigate away; keep busy until redirect result handler runs
            return;
          }

          throw error;
        }
      } else {
        const result = await promptAsync();
        if (result.type !== "success") {
          setAuthBusy(false);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("account.authError");
      Alert.alert(t("account.authError"), message);
      setAuthBusy(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.centerText, { color: theme.colors.textMuted }]}>{t("common.loading")}</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppScrollView
        trackNavGlass
        contentContainerStyle={[styles.container, isDesktopWeb && !user ? styles.containerDesktop : null]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.cardNarrow, isWeb ? styles.headerWrapWeb : null]}>
          <ScreenHeader
            title={t("account.title")}
            subtitle={user ? t("account.subtitleSignedIn") : t("account.subtitleSignedOut")}
            align={isDesktopWeb && !user ? "center" : "left"}
          />
        </View>

        {user ? (
          <Card style={[styles.card, styles.cardNarrow]}>
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primarySoft }]}>
                <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                  {(user.email?.[0] ?? "U").toUpperCase()}
                </Text>
              </View>
              <View style={styles.userMeta}>
                <Text style={[styles.userEmail, { color: theme.colors.text }]} numberOfLines={1}>
                  {user.email}
                </Text>
                <Text style={[styles.userHint, { color: theme.colors.textMuted }]}>{t("account.signedInHint")}</Text>
              </View>
            </View>

            <PrimaryButton
              title={t("account.quotes")}
              onPress={() => navigation.navigate("Quotes")}
              leftSlot={<Ionicons name="receipt-outline" size={18} color="#FFFFFF" />}
            />
            <PrimaryButton
              title={t("common.signOut")}
              onPress={() => void signOut(auth)}
              leftSlot={<Ionicons name="log-out-outline" size={18} color="#FFFFFF" />}
            />
          </Card>
	        ) : (
	          <Card style={[styles.card, styles.cardNarrow]}>
            <SegmentedControl
              value={authMode}
              onChange={setAuthMode}
              options={[
                { value: "signin", label: t("common.signIn") },
                { value: "register", label: t("common.createAccount") }
              ]}
            />

            <TextField
              label={t("account.email")}
              leftSlot={<Ionicons name="mail-outline" size={18} color={theme.colors.primary} />}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label={t("account.password")}
              leftSlot={<Ionicons name="lock-closed-outline" size={18} color={theme.colors.primary} />}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <PrimaryButton
              title={authMode === "register" ? t("common.createAccount") : t("common.signIn")}
              onPress={() => void onEmailAuth()}
              loading={authBusy}
              disabled={authBusy}
              leftSlot={<Ionicons name="mail-outline" size={18} color="#FFFFFF" />}
            />
            <PrimaryButton
              title={t("account.googleSignIn")}
              tone="soft"
              onPress={() => void onGoogleAuth()}
              loading={authBusy && (Platform.OS === "web" || response?.type !== "success")}
              disabled={authBusy || (Platform.OS !== "web" && (!request || !isGoogleClientConfigured))}
              textColor="#3C4043"
              buttonStyle={{ backgroundColor: "#FFFFFF", borderColor: "#DADCE0", borderWidth: StyleSheet.hairlineWidth }}
              leftSlot={
                <Image
                  source={require("../../assets/google-g.png")}
                  style={{ width: 18, height: 18 }}
                  resizeMode="contain"
                />
              }
            />
	          </Card>
	        )}

	      </AppScrollView>
	    </ScreenContainer>
	  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: 0,
    gap: spacing.md
  },
  containerDesktop: {
    alignItems: "center",
    paddingTop: spacing.lg
  },
  cardNarrow: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center"
  },
  headerWrapWeb: {
    paddingTop: spacing.xl
  },
  card: {
    gap: spacing.sm
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    ...font(900),
    fontSize: 18,
  },
  userMeta: {
    flex: 1,
    gap: 2
  },
  userEmail: {
    ...font(800),
    fontSize: 16,
  },
  userHint: {
    fontSize: 13
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.lg
  },
  centerText: {
    fontSize: 14
  }
});
