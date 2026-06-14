import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collection, getDocs, query, where } from "firebase/firestore";
import { AppFlatList } from "../components/AppFlatList";
import { useAuth } from "../services/auth-context";
import { db } from "../services/firebase";
import { useNavGlassControls } from "../services/scroll-context";
import {
  generateGuestName,
  getOrCreateSupportThread,
  markSupportThreadSeenByCustomer,
  pickActiveSupportThread,
  sendSupportMessage,
  subscribeSupportMessages,
  subscribeSupportThreadsForCustomer,
  toSupportMillis,
  type SupportMessage,
  type SupportThread,
} from "../services/support-chat";
import { useTheme } from "../theme/ThemeProvider";
import { spacing } from "../theme/tokens";

function formatMessageTime(value: unknown, locale: string): string {
  const ms = toSupportMillis(value);
  if (ms === null) return "";
  return new Date(ms).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string | undefined, t: (key: string) => string): string {
  return status === "CLOSED" ? t("support.statusClosed") : t("support.statusOpen");
}

// Animated typing dots component
function TypingDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeBounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -5,
            duration: 280,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 280,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(360 - delay),
        ]),
      );

    const a1 = makeBounce(dot1, 0);
    const a2 = makeBounce(dot2, 120);
    const a3 = makeBounce(dot3, 240);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={typingDotsStyles.row}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[typingDotsStyles.dot, { backgroundColor: color, transform: [{ translateY: dot }] }]}
        />
      ))}
    </View>
  );
}

const typingDotsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.75,
  },
});

export function SupportChatScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { resetScroll } = useNavGlassControls();
  const navigation = useNavigation();
  const isWeb = Platform.OS === "web";
  const isDesktopWeb = isWeb && width >= theme.layout.desktopNavMinWidth;
  const desktopNavOffset = isDesktopWeb
    ? theme.layout.desktopNavHeight + theme.layout.desktopNavGapTop + theme.layout.desktopNavGapBottom + spacing.sm
    : 0;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const locale = i18n.language?.toLowerCase().startsWith("ru") ? "ru-RU" : "en-US";

  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<{ id: string; question: string; priority: number }[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [threadBusy, setThreadBusy] = useState(false);
  const [botTyping, setBotTyping] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setThreads([]);
      return;
    }
    return subscribeSupportThreadsForCustomer(
      user.uid,
      (nextThreads) => {
        setThreads(nextThreads);
      },
      (error) => {
        Alert.alert(t("common.error"), error.message);
      },
    );
  }, [user?.uid]);

  const activeThread = useMemo(() => {
    if (pendingThreadId) {
      const matched = threads.find((thread) => thread.id === pendingThreadId);
      if (matched) return matched;
    }
    return pickActiveSupportThread(threads);
  }, [pendingThreadId, threads]);

  const activeThreadId = activeThread?.id ?? pendingThreadId;
  const isClosed = activeThread?.status === "CLOSED";
  const isAnonymousGuest = Boolean(user?.isAnonymous);
  const guestName = useMemo(
    () => (isAnonymousGuest && user?.uid ? generateGuestName(user.uid) : ""),
    [isAnonymousGuest, user?.uid],
  );
  const sendDisabled = sending || threadBusy || isClosed;
  const messageTrimmed = messageText.trim();
  const composerPlaceholder = isClosed ? t("support.closedTitle") : t("support.messagePlaceholder");

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    return subscribeSupportMessages(
      activeThreadId,
      (nextMessages) => {
        setMessages(nextMessages);
        setPendingThreadId(activeThreadId);
      },
      (error) => {
        Alert.alert(t("common.error"), error.message);
      },
    );
  }, [activeThreadId]);

  useEffect(() => {
    if (!messages.length) {
      setBotTyping(false);
      return;
    }

    const lastCustomerMsg = [...messages].reverse().find((m) => m.authorRole === "customer");
    const lastSystemMsg = [...messages].reverse().find((m) => m.authorRole === "system");

    if (!lastCustomerMsg) {
      setBotTyping(false);
      return;
    }

    if (lastSystemMsg) {
      const customerTime = toSupportMillis(lastCustomerMsg.createdAt) ?? 0;
      const systemTime = toSupportMillis(lastSystemMsg.createdAt) ?? 0;
      setBotTyping(customerTime > systemTime);
    } else {
      setBotTyping(true);
    }
  }, [messages]);

  useEffect(() => {
    if (!activeThreadId) return;
    void markSupportThreadSeenByCustomer(activeThreadId).catch(() => undefined);
  }, [activeThreadId, messages.length]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    resetScroll();
  }, [resetScroll]);

  const ensureAuthenticatedThread = async () => {
    if (!user || user.isAnonymous) return;
    if (activeThread) return;
    setThreadBusy(true);
    try {
      const thread = await getOrCreateSupportThread({ user, guestProfile: null });
      setPendingThreadId(thread.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("support.sendFailed");
      Alert.alert(t("common.error"), message);
    } finally {
      setThreadBusy(false);
    }
  };

  useEffect(() => {
    void ensureAuthenticatedThread();
  }, [user?.uid, user?.isAnonymous, activeThread?.id]);

  useEffect(() => {
    async function fetchQuickReplies() {
      if (!db) return;
      try {
        const q = query(collection(db, "faq"), where("active", "==", true));
        const snap = await getDocs(q);
        const entries: { id: string; question: string; priority: number }[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isQuickReply === true && typeof data.question === "string" && data.question.trim()) {
            entries.push({
              id: docSnap.id,
              question: data.question.trim(),
              priority: typeof data.priority === "number" ? data.priority : 0,
            });
          }
        });
        entries.sort((a, b) => b.priority - a.priority);
        setQuickReplies(entries.slice(0, 10));
      } catch (error) {
        console.warn("[support-chat] Failed to fetch quick replies:", error);
      }
    }
    void fetchQuickReplies();
  }, []);

  const onSend = async (overrideText?: string) => {
    const textToUse = typeof overrideText === "string" ? overrideText : messageText;
    const trimmedMessage = textToUse.trim();
    if (!trimmedMessage) {
      Alert.alert(t("common.error"), t("support.messageRequired"));
      return;
    }

    setSending(true);
    try {
      const result = await sendSupportMessage({
        user,
        threadId: activeThread?.id ?? pendingThreadId,
        text: trimmedMessage,
        guestProfile: isAnonymousGuest ? { name: guestName } : null,
        thread: activeThread,
      });
      setPendingThreadId(result.threadId);
      if (typeof overrideText !== "string") {
        setMessageText("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("support.sendFailed");
      Alert.alert(t("common.error"), message || t("support.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  // Gradient colors for the message area background
  const gradientColors = theme.isDark
    ? (["#111111", "#161617"] as const)
    : (["#F7F5F2", "#EDEAE4"] as const);

  if (loading) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.isDark ? "#111111" : "#F7F5F2" }]}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={[styles.centerText, { color: theme.colors.textMuted }]}>{t("common.loading")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View
        style={[
          styles.chatWrapper,
          { paddingTop: desktopNavOffset, paddingBottom: insets.bottom + theme.layout.mobileTabBarHeight },
        ]}
      >
        {/* ── Full-height Header ── */}
        <View style={[styles.chatHeader, { paddingTop: insets.top + 16, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
          {/* Agent identity section */}
          <View style={styles.agentSection}>
            {/* Avatar */}
            <View style={[styles.agentAvatar, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
            </View>

            {/* Name + status */}
            <View style={styles.agentInfo}>
              <Text style={[styles.agentName, { color: theme.colors.text }]} numberOfLines={1}>
                {t("support.title")}
              </Text>
              <View style={styles.agentStatusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isClosed ? theme.colors.textMuted : theme.colors.success },
                  ]}
                />
                <Text style={[styles.agentStatusText, { color: isClosed ? theme.colors.textMuted : theme.colors.success }]}>
                  {statusLabel(activeThread?.status, t)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          {/* Message area with subtle gradient */}
          <LinearGradient colors={gradientColors} style={styles.flex}>
            <AppFlatList
              style={styles.messagesList}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesContent}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.primarySoft }]}>
                    <Ionicons name="chatbubble-ellipses" size={22} color={theme.colors.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{t("support.emptyTitle")}</Text>
                  <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>{t("support.emptyBody")}</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isCustomer = item.authorRole === "customer";
                const isSystem = item.authorRole === "system";

                // Customer bubble color: light pastel orange
                const customerBubbleBg = theme.isDark ? "#D4681C" : "#F08C42";

                return (
                  <View style={[styles.messageRow, isCustomer ? styles.messageRowRight : isSystem ? styles.messageRowCenter : null]}>
                    <View
                      style={[
                        styles.messageBubble,
                        isCustomer
                          ? [styles.messageBubbleCustomer, { backgroundColor: customerBubbleBg }]
                          : isSystem
                            ? [styles.messageBubbleSystem, { borderColor: theme.colors.border }]
                            : [styles.messageBubbleAdmin, { backgroundColor: theme.isDark ? "rgba(120,120,128,0.20)" : "rgba(255,255,255,0.92)", borderColor: theme.colors.border }],
                        // Subtle shadow on web for depth
                        isWeb && !isSystem ? (theme.isDark ? styles.bubbleShadowDark : styles.bubbleShadowLight) : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          { color: isCustomer ? "#FFFFFF" : theme.colors.text },
                        ]}
                      >
                        {item.text || ""}
                      </Text>
                      <Text
                        style={[
                          styles.messageTime,
                          {
                            color: isCustomer ? "rgba(255,255,255,0.95)" : theme.isDark ? "#AEAEB2" : "#4B5563",
                            textAlign: isCustomer ? "right" : isSystem ? "center" : "left",
                          },
                        ]}
                      >
                        {formatMessageTime(item.createdAt, locale)}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />

            {/* Animated typing indicator */}
            {botTyping ? (
              <View style={[styles.typingIndicator, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Ionicons name="hardware-chip-outline" size={13} color={theme.colors.primary} />
                <Text style={[styles.typingText, { color: theme.colors.textMuted }]}>
                  {t("support.botTyping")}
                </Text>
                <TypingDots color={theme.colors.primary} />
              </View>
            ) : null}
          </LinearGradient>

          {/* ── Quick Replies ── */}
          {messages.length === 0 && !isClosed && quickReplies.length > 0 && (
            <View style={{ marginBottom: 4 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.quickRepliesContent, { paddingHorizontal: spacing.md }]}
                keyboardShouldPersistTaps="handled"
              >
                {quickReplies.map((qr) => (
                  <Pressable
                    key={qr.id}
                    style={({ pressed }) => [
                      styles.quickReplyChip,
                      {
                        backgroundColor: theme.isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
                        borderColor: theme.isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => {
                      void onSend(qr.question);
                    }}
                    disabled={sendDisabled}
                  >
                    <Text style={[styles.quickReplyText, { color: theme.colors.primary }]}>
                      {qr.question}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Composer bar ── */}
          <View style={[styles.composerWrap, { backgroundColor: theme.isDark ? "#161617" : "#EDEAE4" }]}>
            <View
              style={[
                styles.composerPill,
                {
                  backgroundColor: theme.isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
                  borderColor: theme.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)",
                  shadowColor: theme.isDark ? "#000" : "#A0A0A0",
                },
              ]}
            >
              <TextInput
                value={messageText}
                onChangeText={setMessageText}
                editable={!sendDisabled}
                returnKeyType="send"
                onSubmitEditing={() => { if (messageTrimmed) void onSend(); }}
                placeholder={composerPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.composerInput, { color: theme.colors.text }]}
                selectionColor={theme.colors.primary}
                accessibilityLabel={t("support.messageLabel")}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={sending ? t("support.sending") : t("support.send")}
                disabled={sendDisabled || !messageTrimmed}
                onPress={() => void onSend()}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor:
                      sendDisabled || !messageTrimmed
                        ? theme.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
                        : theme.colors.primary,
                    opacity: pressed ? 0.82 : 1,
                    transform: [{ scale: pressed ? 0.93 : 1 }],
                  },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={theme.isDark ? theme.colors.textMuted : theme.colors.primary} />
                ) : (
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={sendDisabled || !messageTrimmed ? theme.colors.textMuted : "#FFFFFF"}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },

    // ── Outer shell ──
    chatWrapper: {
      flex: 1,
      backgroundColor: theme.isDark ? "#111111" : "#F7F5F2",
    },

    // ── Header ──
    chatHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingBottom: 20,
      paddingHorizontal: 16,
      borderBottomWidth: 0.5,
      gap: 4,
    },
    chatHeaderBack: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingLeft: 4,
      paddingRight: 12,
    },
    chatHeaderBackText: {
      fontSize: 17,
      marginLeft: 2,
    },
    agentSection: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    agentAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    agentInfo: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    agentName: {
      fontSize: 15,
      fontWeight: "600",
      overflow: "hidden",
    },
    agentStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    agentStatusText: {
      fontSize: 12,
      fontWeight: "500",
    },
    chatHeaderSpacer: {
      width: 44,
    },

    // ── Messages ──
    messagesList: {
      flex: 1,
      minHeight: 0,
    },
    messagesContent: {
      paddingHorizontal: spacing.md,
      paddingTop: 14,
      paddingBottom: spacing.lg,
      flexGrow: 1,
      justifyContent: "flex-end",
    },

    // ── Empty state ──
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      borderRadius: 20,
      borderWidth: 1,
      marginTop: spacing.lg,
    },
    emptyIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
    },
    emptyBody: {
      fontSize: 14,
      textAlign: "center",
      maxWidth: 360,
      lineHeight: 20,
    },

    // ── Message bubbles ──
    messageRow: {
      width: "100%",
      alignItems: "flex-start",
    },
    messageRowRight: {
      alignItems: "flex-end",
    },
    messageRowCenter: {
      alignItems: "center",
    },
    messageBubble: {
      maxWidth: "75%",
      paddingVertical: 10,
      paddingHorizontal: 15,
      gap: 4,
    },
    messageBubbleCustomer: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 5,
    },
    messageBubbleAdmin: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderBottomLeftRadius: 5,
      borderBottomRightRadius: 20,
      borderWidth: 1,
    },
    messageBubbleSystem: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderRadius: 12,
      maxWidth: "92%",
    },
    messageText: {
      fontSize: 15,
      lineHeight: 21,
    },
    messageTime: {
      fontSize: 13,
      fontWeight: "500",
    },

    // Web-only subtle shadows
    bubbleShadowLight: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    bubbleShadowDark: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 5,
    },

    // ── Typing indicator ──
    typingIndicator: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: 14,
      borderWidth: 1,
      alignSelf: "flex-start",
    },
    typingText: {
      fontSize: 12,
      marginLeft: 6,
    },

    // ── Quick Replies ──
    quickRepliesContent: {
      gap: 8,
      paddingVertical: 4,
    },
    quickReplyChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
    },
    quickReplyText: {
      fontSize: 14,
      fontWeight: "500",
    },

    // ── Composer ──
    composerWrap: {
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
    },
    composerPill: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 30,
      borderWidth: 1,
      paddingLeft: spacing.md,
      paddingRight: 6,
      paddingVertical: 6,
      gap: 6,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.10,
      shadowRadius: 10,
      elevation: 3,
    },
    composerInput: {
      flex: 1,
      fontSize: 15,
      lineHeight: 21,
      paddingVertical: 6,
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
    },
    sendButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
    },

    // ── Loading ──
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.sm,
    },
    centerText: {
      fontSize: 14,
    },

    // ── Guest form (kept for potential future use) ──
    guestForm: {
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    guestFormTitle: {
      fontSize: 16,
      fontWeight: "600",
      textAlign: "center",
    },
    guestFormHint: {
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
      maxWidth: 320,
      marginBottom: spacing.xs,
    },
    guestNameInputWrap: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      alignSelf: "stretch",
    },
    guestNameInput: {
      fontSize: 15,
      lineHeight: 21,
      paddingVertical: 4,
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
    },
    guestContinueButton: {
      minHeight: 44,
      paddingHorizontal: spacing.xl,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.xs,
      alignSelf: "stretch",
      ...({ outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object),
    },
    guestContinueText: {
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
