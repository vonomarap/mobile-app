import { ComponentProps, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../components/PrimaryButton";
import { Card } from "../components/Card";
import { AppScrollView } from "../components/AppScrollView";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { SegmentedControl } from "../components/SegmentedControl";
import { TextField } from "../components/TextField";
import { RootStackParamList } from "../navigation/types";
import { useAuth } from "../services/auth-context";
import { auth } from "../services/firebase";
import { font } from "../theme/font";
import { spacing } from "../theme/tokens";
import { useTheme, useThemeControls } from "../theme/ThemeProvider";
import { type LangCode } from "../constants/languages";
import { getCurrentLanguage, setAppLanguage } from "../services/i18n";

export function AccountScreen(): JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const { toggle: toggleTheme } = useThemeControls();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");
  const [authBusy, setAuthBusy] = useState(false);
  const isDesktopWeb = Platform.OS === "web" && width >= theme.layout.desktopNavMinWidth;
  const currentLang: LangCode = getCurrentLanguage();
  const nextLang: LangCode = currentLang === "ru" ? "en" : "ru";
  const themeMenuLabel = theme.isDark
    ? t("common.lightTheme", { defaultValue: "Светлая тема" })
    : t("common.darkTheme", { defaultValue: "Тёмная тема" });
  const themeMenuIcon: ComponentProps<typeof Ionicons>["name"] = theme.isDark ? "sunny-outline" : "moon-outline";
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
        <View style={[styles.cardNarrow, Platform.OS === "web" ? styles.headerWrapWeb : null]}>
          <View style={styles.headerWrap}>
            <ScreenHeader
              title={t("account.title")}
              subtitle={user ? t("account.subtitleSignedIn") : t("account.subtitleSignedOut")}
              align={isDesktopWeb && !user ? "center" : "left"}
            />
          </View>
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
          </Card>
          )}

        <View style={[styles.cardNarrow]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
            {t("account.settings", { defaultValue: "Настройки" }).toUpperCase()}
          </Text>
        </View>

        <Card style={[styles.card, styles.cardNarrow]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={themeMenuLabel}
            onPress={toggleTheme}
            style={(state) => [
              styles.settingsRow,
              state.pressed ? styles.settingsRowPressed : null
            ]}
          >
            <View style={[styles.settingsIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name={themeMenuIcon} size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>
              {themeMenuLabel}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t("common.language", { defaultValue: "Язык" })}: ${currentLang.toUpperCase()}`}
            onPress={() => void setAppLanguage(nextLang)}
            style={(state) => [
              styles.settingsRow,
              state.pressed ? styles.settingsRowPressed : null
            ]}
          >
            <View style={[styles.settingsIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
              <Ionicons name="language-outline" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.settingsLabel, { color: theme.colors.text }]}>
              {t("common.language", { defaultValue: "Язык" })}
            </Text>
            <Text style={[styles.settingsValue, { color: theme.colors.textMuted }]}>
              {currentLang.toUpperCase()}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>
        </Card>
      </AppScrollView>
    </ScreenContainer>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
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
    headerWrap: {
      gap: spacing.xs
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
    },
    sectionTitle: {
      ...font(800),
      fontSize: 12,
      letterSpacing: 0.8,
      paddingLeft: spacing.xs
    },
    settingsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 48,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    settingsRowPressed: {
      opacity: 0.85
    },
    settingsIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    },
    settingsLabel: {
      ...font(700),
      fontSize: 14,
      flex: 1
    },
    settingsValue: {
      ...font(700),
      fontSize: 13,
    }
  });
}