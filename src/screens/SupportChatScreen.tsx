import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppFlatList } from "../components/AppFlatList";
import { Card } from "../components/Card";
import { ScreenContainer } from "../components/ScreenContainer";
import { ScreenHeader } from "../components/ScreenHeader";
import { TextField } from "../components/TextField";
import { useAuth } from "../services/auth-context";
import { useNavGlassControls } from "../services/scroll-context";
import {
  customerHasUnreadSupport,
  getOrCreateSupportThread,
  markSupportThreadSeenByCustomer,
  pickActiveSupportThread,
  sendSupportMessage,
  subscribeSupportMessages,
  subscribeSupportThreadsForCustomer,
  toSupportMillis,
  type GuestProfile,
  type SupportMessage,
  type SupportThread,
} from "../services/support-chat";
import { useTheme } from "../theme/ThemeProvider";
import { radius, spacing } from "../theme/tokens";

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

export function SupportChatScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { user, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { resetScroll } = useNavGlassControls();
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
  const [messageText, setMessageText] = useState("");
  const [composerFocused, setComposerFocused] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [threadBusy, setThreadBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setThreads([]);
      return;
    }
    return subscribeSupportThreadsForCustomer(user.uid, (nextThreads) => {
      setThreads(nextThreads);
    });
  }, [user?.uid]);

  const activeThread = useMemo(() => {
    if (pendingThreadId) {
      const matched = threads.find((thread) => thread.id === pendingThreadId);
      if (matched) return matched;
    }
    return pickActiveSupportThread(threads);
  }, [pendingThreadId, threads]);

  const activeThreadId = activeThread?.id ?? pendingThreadId;
  const isGuestFlow = !user || user.isAnonymous;
  const needsGuestProfile = !activeThread && isGuestFlow;
  const hasUnread = customerHasUnreadSupport(activeThread);
  const isClosed = activeThread?.status === "CLOSED";
  const sendDisabled = sending || threadBusy || isClosed;
  const messageTrimmed = messageText.trim();
  const composerPlaceholder = isClosed ? t("support.closedTitle") : t("support.messagePlaceholder");
  const showComposerPlaceholder = messageText.length === 0 && !composerFocused;

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    return subscribeSupportMessages(activeThreadId, (nextMessages) => {
      setMessages(nextMessages);
      setPendingThreadId(activeThreadId);
    });
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    void markSupportThreadSeenByCustomer(activeThreadId).catch(() => undefined);
  }, [activeThreadId, messages.length]);

  useEffect(() => {
    if (!activeThread) return;
    if (activeThread.customerMode === "guest" && activeThread.guestProfile) {
      setGuestName((prev) => prev || activeThread.guestProfile?.name || "");
      setGuestPhone((prev) => prev || activeThread.guestProfile?.phone || "");
      setGuestEmail((prev) => prev || activeThread.guestProfile?.email || "");
    }
  }, [activeThread]);

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

  const onSend = async () => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage) {
      Alert.alert(t("common.error"), t("support.messageRequired"));
      return;
    }

    let guestProfile: GuestProfile | null = null;
    if (needsGuestProfile) {
      const trimmedName = guestName.trim();
      const trimmedPhone = guestPhone.trim();
      const trimmedEmail = guestEmail.trim();
      if (!trimmedName) {
        Alert.alert(t("common.error"), t("support.guestNameRequired"));
        return;
      }
      if (!trimmedPhone && !trimmedEmail) {
        Alert.alert(t("common.error"), t("support.guestContactRequired"));
        return;
      }
      guestProfile = {
        name: trimmedName,
        ...(trimmedPhone ? { phone: trimmedPhone } : {}),
        ...(trimmedEmail ? { email: trimmedEmail } : {}),
      };
    }

    setSending(true);
    try {
      const result = await sendSupportMessage({
        user,
        threadId: activeThread?.id ?? pendingThreadId,
        text: trimmedMessage,
        guestProfile,
        thread: activeThread,
      });
      setPendingThreadId(result.threadId);
      setMessageText("");
    } catch (error) {
      const message = error instanceof Error ? error.message : t("support.sendFailed");
      Alert.alert(t("common.error"), message || t("support.sendFailed"));
    } finally {
      setSending(false);
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <View
          style={[
            styles.container,
            {
              paddingTop: spacing.md + desktopNavOffset,
              paddingBottom: Math.max(insets.bottom, spacing.sm),
            },
          ]}
        >
          <View style={styles.headerWrap}>
            <ScreenHeader
              title={t("support.title")}
              subtitle={t("support.subtitle")}
              rightSlot={
                activeThread ? (
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isClosed ? theme.colors.surface2 : theme.colors.primarySoft,
                        borderColor: isClosed ? theme.colors.border : theme.colors.primary,
                      },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: isClosed ? theme.colors.textMuted : theme.colors.primary }]}>
                      {isClosed ? t("support.statusClosed") : t("support.statusOpen")}
                    </Text>
                  </View>
                ) : undefined
              }
            />
            <View style={styles.headerBadges}>
              {hasUnread ? (
                <View style={[styles.headerChip, { backgroundColor: theme.colors.primarySoft }]}> 
                  <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
                  <Text style={[styles.headerChipText, { color: theme.colors.primary }]}>{t("support.unread")}</Text>
                </View>
              ) : null}
              {isClosed ? (
                <View style={[styles.headerChip, { backgroundColor: theme.colors.surface2 }]}> 
                  <Ionicons name="lock-closed" size={14} color={theme.colors.textMuted} />
                  <Text style={[styles.headerChipText, { color: theme.colors.textMuted }]}>{t("support.closedTitle")}</Text>
                </View>
              ) : null}
            </View>
            {isClosed ? <Text style={[styles.closedHint, { color: theme.colors.textMuted }]}>{t("support.closedBody")}</Text> : null}
          </View>

          <Card style={styles.chatCard} padded={false} variant="solid">
            <View style={[styles.chatBackdrop, { backgroundColor: theme.colors.surface2 }]} />

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
                const authorLabel = isSystem ? t("support.system") : isCustomer ? t("support.you") : t("support.manager");
                const bubbleTone = isCustomer
                  ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                  : isSystem
                    ? { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }
                    : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border };

                return (
                  <View style={[styles.messageRow, isCustomer ? styles.messageRowRight : null]}>
                    <View
                      style={[
                        styles.messageBubble,
                        bubbleTone,
                        isCustomer ? styles.messageBubbleOutgoing : styles.messageBubbleIncoming,
                        isSystem ? styles.messageBubbleSystem : null,
                        theme.shadow.sm,
                      ]}
                    >
                      <Text style={[styles.messageAuthor, { color: isCustomer ? "rgba(255,255,255,0.86)" : theme.colors.textMuted }]}> 
                        {authorLabel}
                      </Text>
                      <Text style={[styles.messageText, { color: isCustomer ? "#FFFFFF" : theme.colors.text }]}>{item.text || ""}</Text>
                      <View style={styles.messageFooter}>
                        <Text style={[styles.messageTime, { color: isCustomer ? "rgba(255,255,255,0.74)" : theme.colors.textMuted }]}> 
                          {formatMessageTime(item.createdAt, locale)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }}
            />

            <View style={[styles.composerWrap, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}> 
              {needsGuestProfile ? (
                <View style={[styles.guestPanel, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }]}> 
                  <View style={styles.guestPanelHeader}>
                    <View style={[styles.guestPanelIcon, { backgroundColor: theme.colors.primarySoft }]}> 
                      <Ionicons name="person-circle" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.guestPanelText}>
                      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t("support.guestTitle")}</Text>
                      <Text style={[styles.sectionHint, { color: theme.colors.textMuted }]}>{t("support.guestHint")}</Text>
                    </View>
                  </View>
                  <View style={styles.guestFormFields}>
                    <TextField
                      label={t("account.name")}
                      value={guestName}
                      onChangeText={setGuestName}
                      placeholder={t("support.namePlaceholder")}
                    />
                    <TextField
                      label={t("account.phone")}
                      value={guestPhone}
                      onChangeText={setGuestPhone}
                      keyboardType="phone-pad"
                      inputMode="tel"
                      placeholder={t("support.phonePlaceholder")}
                    />
                    <TextField
                      label={`${t("account.email")} · ${t("support.emailOptional")}`}
                      value={guestEmail}
                      onChangeText={setGuestEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder={t("support.emailPlaceholder")}
                    />
                  </View>
                </View>
              ) : null}

              <View style={[styles.composerShell, { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border }]}> 
                <View style={styles.composerInputWrap}>
                  <TextInput
                    value={messageText}
                    onChangeText={setMessageText}
                    editable={!sendDisabled}
                    multiline
                    onFocus={() => setComposerFocused(true)}
                    onBlur={() => setComposerFocused(false)}
                    textAlignVertical="top"
                    style={[styles.composerInput, { color: theme.colors.text }]}
                    selectionColor={theme.colors.primary}
                    accessibilityLabel={t("support.messageLabel")}
                  />

                  {showComposerPlaceholder ? (
                    <View pointerEvents="none" style={styles.composerPlaceholderWrap}>
                      <Text style={[styles.composerPlaceholder, { color: theme.colors.textMuted }]}>
                        {composerPlaceholder}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={sending ? t("support.sending") : t("support.send")}
                  disabled={sendDisabled || !messageTrimmed}
                  onPress={() => void onSend()}
                  style={({ pressed }) => [
                    styles.sendButton,
                    {
                      backgroundColor: sendDisabled || !messageTrimmed ? theme.colors.surface : theme.colors.primary,
                      borderColor: sendDisabled || !messageTrimmed ? theme.colors.border : theme.colors.primary,
                      opacity: sendDisabled || !messageTrimmed ? 0.72 : pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="paper-plane"
                      size={18}
                      color={sendDisabled || !messageTrimmed ? theme.colors.textMuted : "#FFFFFF"}
                    />
                  )}
                </Pressable>
              </View>
            </View>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    container: {
      flex: 1,
      minHeight: 0,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
      width: "100%",
      maxWidth: 960,
      alignSelf: "center",
    },
    headerWrap: {
      width: "100%",
      gap: spacing.sm,
    },
    headerBadges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    headerChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      minHeight: 32,
      paddingHorizontal: spacing.sm,
      borderRadius: 999,
      alignSelf: "flex-start",
    },
    headerChipText: {
      ...theme.typography.caption,
      fontSize: 12,
    },
    statusBadge: {
      minHeight: 34,
      paddingHorizontal: spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    statusBadgeText: {
      ...theme.typography.label,
      fontSize: 12,
    },
    closedHint: {
      ...theme.typography.caption,
      fontSize: 13,
      lineHeight: 18,
      maxWidth: 720,
    },
    chatCard: {
      flex: 1,
      minHeight: 0,
      overflow: "hidden",
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surface,
    },
    chatBackdrop: {
      ...StyleSheet.absoluteFillObject,
      opacity: theme.isDark ? 0.42 : 0.7,
    },
    messagesList: {
      flex: 1,
      minHeight: 0,
    },
    messagesContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      flexGrow: 1,
      justifyContent: "flex-end",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
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
      ...theme.typography.h3,
      fontSize: 18,
    },
    emptyBody: {
      ...theme.typography.body,
      fontSize: 14,
      textAlign: "center",
      maxWidth: 360,
      lineHeight: 20,
    },
    messageRow: {
      width: "100%",
      alignItems: "flex-start",
    },
    messageRowRight: {
      alignItems: "flex-end",
    },
    messageBubble: {
      maxWidth: "85%",
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm + 2,
      paddingBottom: spacing.sm,
      gap: spacing.xs,
    },
    messageBubbleIncoming: {
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: radius.md,
    },
    messageBubbleOutgoing: {
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderBottomLeftRadius: radius.md,
      borderBottomRightRadius: 8,
    },
    messageBubbleSystem: {
      maxWidth: "92%",
    },
    messageAuthor: {
      ...theme.typography.caption,
      fontSize: 11,
      letterSpacing: 0.35,
      textTransform: "uppercase",
    },
    messageText: {
      ...theme.typography.body,
      fontSize: 15,
      lineHeight: 22,
    },
    messageFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      marginTop: 2,
    },
    messageTime: {
      ...theme.typography.caption,
      fontSize: 11,
    },
    composerWrap: {
      borderTopWidth: 1,
      padding: spacing.md,
      gap: spacing.md,
    },
    guestPanel: {
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.md,
      gap: spacing.md,
    },
    guestPanelHeader: {
      flexDirection: "row",
      gap: spacing.sm,
      alignItems: "flex-start",
    },
    guestPanelIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    guestPanelText: {
      flex: 1,
      gap: 4,
    },
    guestFormFields: {
      gap: spacing.sm,
    },
    sectionTitle: {
      ...theme.typography.h3,
      fontSize: 16,
    },
    sectionHint: {
      ...theme.typography.body,
      fontSize: 13,
      lineHeight: 18,
    },
    composerShell: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radius.lg,
      paddingVertical: 8,
      paddingHorizontal: 10,
      ...theme.shadow.sm,
    },
    composerInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 136,
      paddingTop: 10,
      paddingBottom: 10,
      paddingRight: 4,
      textAlign: "left",
      fontSize: 15,
      lineHeight: 21,
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    },
    composerInputWrap: {
      flex: 1,
      position: "relative",
    },
    composerPlaceholderWrap: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      justifyContent: "center",
      alignItems: "flex-start",
      paddingRight: 4,
    },
    composerPlaceholder: {
      width: "100%",
      fontSize: 15,
      lineHeight: 21,
      textAlign: "left",
    },
    sendButton: {
      width: 48,
      height: 48,
      borderRadius: 999,
      borderWidth: 1,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      ...( { outlineStyle: "none", outlineWidth: 0, WebkitTapHighlightColor: "transparent" } as object ),
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.sm,
    },
    centerText: {
      ...theme.typography.body,
      fontSize: 14,
    },
  });
}
