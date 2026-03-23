import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

import UserDrawer from "./UserDrawer";
import { getToken, getUser } from "../../utils/helper";
import { authColors, authFonts } from "../../theme/authTheme";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const CHAT_STORAGE_PREFIX = "@infinitepulls_ai_chat_";
const MAX_STORED_MESSAGES = 18;
const STARTER_PROMPTS = [
  "Find me budget Pokemon products under 1000 pesos.",
  "Explain what Delivered and Cancelled status mean.",
  "What promos should I watch for in Infinite Pulls?",
  "Help me choose a good gift for a card collector.",
];

const createMessage = (role, content) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  createdAt: new Date().toISOString(),
});

const toApiMessages = (messages) =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

export default function AIChatbot() {
  const scrollViewRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [user, setUser] = useState(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const storageKey = useMemo(
    () => `${CHAT_STORAGE_PREFIX}${user?.id || "guest"}`,
    [user?.id]
  );

  useEffect(() => {
    let isMounted = true;

    const loadChatHistory = async () => {
      try {
        const currentUser = await getUser();
        const nextStorageKey = `${CHAT_STORAGE_PREFIX}${currentUser?.id || "guest"}`;
        const storedMessages = await AsyncStorage.getItem(nextStorageKey);

        if (!isMounted) {
          return;
        }

        setUser(currentUser);

        if (storedMessages) {
          const parsedMessages = JSON.parse(storedMessages);
          if (Array.isArray(parsedMessages)) {
            setMessages(parsedMessages);
          }
        }
      } catch (error) {
        console.error("Error loading assistant history:", error);
      } finally {
        if (isMounted) {
          setIsBooting(false);
        }
      }
    };

    loadChatHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isBooting) {
      return;
    }

    AsyncStorage.setItem(
      storageKey,
      JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
    ).catch((error) => {
      console.error("Error saving assistant history:", error);
    });
  }, [isBooting, messages, storageKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timer);
  }, [messages, isSending]);

  const clearConversation = () => {
    Alert.alert(
      "Clear Assistant Chat",
      "This will remove the current conversation on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setMessages([]);
            setErrorMessage("");
            await AsyncStorage.removeItem(storageKey);
          },
        },
      ]
    );
  };

  const handleSend = async (presetPrompt) => {
    const content = (presetPrompt ?? draft).trim();

    if (!content || isSending) {
      return;
    }

    const nextUserMessage = createMessage("user", content);
    const nextMessages = [...messages, nextUserMessage];

    setMessages(nextMessages);
    setDraft("");
    setIsSending(true);
    setErrorMessage("");

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Please log in again before using the assistant.");
      }

      const { data } = await axios.post(
        `${BACKEND_URL}/api/v1/assistant/chat`,
        { messages: toApiMessages(nextMessages) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const reply = (data?.reply || "").trim();
      if (!reply) {
        throw new Error("The assistant did not return a reply.");
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage("assistant", reply),
      ]);
    } catch (error) {
      const friendlyMessage =
        error?.response?.data?.message ||
        error?.message ||
        "The assistant could not answer right now.";

      setErrorMessage(friendlyMessage);
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          "assistant",
          `I hit a snag just now: ${friendlyMessage}`
        ),
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const topBarRight = (
    <TouchableOpacity
      style={styles.clearButton}
      onPress={clearConversation}
      activeOpacity={0.82}
    >
      <Ionicons
        name="trash-outline"
        size={20}
        color={authColors.textPrimary}
      />
    </TouchableOpacity>
  );

  return (
    <UserDrawer topBarRight={topBarRight}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroFloatLarge} />
          <View style={styles.heroFloatSmall} />
          <Text style={styles.heroEyebrow}>Powered by Groq</Text>
          <Text style={styles.heroTitle}>Collector Assistant</Text>
          <Text style={styles.heroSubtitle}>
            Ask about products, promos, account help, or what your order
            statuses usually mean.
          </Text>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Ionicons
                name="sparkles-outline"
                size={14}
                color={authColors.sparkle}
              />
              <Text style={styles.heroPillText}>Fast answers</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={authColors.accentSoft}
              />
              <Text style={styles.heroPillText}>
                Honest if data is missing
              </Text>
            </View>
          </View>
        </View>

        {isBooting ? (
          <View style={styles.bootingState}>
            <ActivityIndicator size="large" color={authColors.accentSoft} />
            <Text style={styles.bootingText}>Loading your chat assistant...</Text>
          </View>
        ) : (
          <>
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyStateIcon}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={28}
                      color={authColors.accentSoft}
                    />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    Start with one of these
                  </Text>
                  <Text style={styles.emptyStateSubtitle}>
                    The assistant works best for shopping help, promos, and
                    general order guidance.
                  </Text>
                  <View style={styles.promptGrid}>
                    {STARTER_PROMPTS.map((prompt) => (
                      <TouchableOpacity
                        key={prompt}
                        style={styles.promptCard}
                        onPress={() => handleSend(prompt)}
                        activeOpacity={0.84}
                      >
                        <Ionicons
                          name="flash-outline"
                          size={16}
                          color={authColors.sparkle}
                        />
                        <Text style={styles.promptText}>{prompt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageRow,
                      isUser && styles.messageRowUser,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isUser
                          ? styles.userBubble
                          : styles.assistantBubble,
                      ]}
                    >
                      <Text style={styles.messageLabel}>
                        {isUser
                          ? "You"
                          : user?.name
                          ? `Infinite Pulls AI for ${user.name.split(" ")[0]}`
                          : "Infinite Pulls AI"}
                      </Text>
                      <Text style={styles.messageText}>{message.content}</Text>
                    </View>
                  </View>
                );
              })}

              {isSending ? (
                <View style={styles.messageRow}>
                  <View
                    style={[styles.messageBubble, styles.assistantBubble]}
                  >
                    <Text style={styles.messageLabel}>Infinite Pulls AI</Text>
                    <View style={styles.typingRow}>
                      <ActivityIndicator
                        size="small"
                        color={authColors.accentSoft}
                      />
                      <Text style={styles.typingText}>Thinking...</Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={authColors.danger}
                />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.composerWrap}>
              <View style={styles.composerBox}>
                <TextInput
                  style={styles.input}
                  placeholder="Ask about promos, products, or order guidance"
                  placeholderTextColor={authColors.textMuted}
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  maxLength={500}
                  editable={!isSending}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!draft.trim() || isSending) && styles.sendButtonDisabled,
                  ]}
                  onPress={() => handleSend()}
                  activeOpacity={0.84}
                  disabled={!draft.trim() || isSending}
                >
                  {isSending ? (
                    <ActivityIndicator
                      size="small"
                      color={authColors.textPrimary}
                    />
                  ) : (
                    <Ionicons
                      name="paper-plane"
                      size={18}
                      color={authColors.textPrimary}
                    />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.footerNote}>
                AI answers can be wrong, so confirm live prices, stock, and
                order details inside the app before acting on them.
              </Text>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </UserDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(199, 104, 91, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(240, 154, 134, 0.16)",
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    padding: 20,
    backgroundColor: "rgba(94, 65, 60, 0.24)",
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
    marginBottom: 14,
  },
  heroFloatLarge: {
    position: "absolute",
    width: 148,
    height: 92,
    top: 12,
    right: -26,
    borderRadius: 22,
    backgroundColor: "rgba(199, 104, 91, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(240, 154, 134, 0.12)",
    transform: [{ rotate: "11deg" }],
  },
  heroFloatSmall: {
    position: "absolute",
    width: 122,
    height: 76,
    bottom: -14,
    left: -22,
    borderRadius: 20,
    backgroundColor: "rgba(244, 226, 168, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(244, 226, 168, 0.12)",
    transform: [{ rotate: "-9deg" }],
  },
  heroEyebrow: {
    color: authColors.sparkle,
    fontSize: 12,
    fontFamily: authFonts.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTitle: {
    color: authColors.accentSoft,
    fontSize: 30,
    fontFamily: authFonts.brand,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: authColors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: authFonts.regular,
  },
  heroPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(40, 28, 25, 0.62)",
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  heroPillText: {
    color: authColors.textPrimary,
    fontSize: 12,
    fontFamily: authFonts.semibold,
  },
  bootingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  bootingText: {
    color: authColors.textMuted,
    fontSize: 14,
    fontFamily: authFonts.semibold,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 16,
    gap: 12,
  },
  emptyState: {
    marginTop: 8,
    marginBottom: 10,
  },
  emptyStateIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(199, 104, 91, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(240, 154, 134, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyStateTitle: {
    color: authColors.textPrimary,
    fontSize: 20,
    fontFamily: authFonts.bold,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: authColors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: authFonts.regular,
    marginBottom: 14,
  },
  promptGrid: {
    gap: 10,
  },
  promptCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 20,
    padding: 14,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  promptText: {
    flex: 1,
    color: authColors.textPrimary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: authFonts.semibold,
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "86%",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  assistantBubble: {
    backgroundColor: authColors.surface,
    borderColor: authColors.surfaceBorder,
    borderTopLeftRadius: 10,
  },
  userBubble: {
    backgroundColor: "rgba(199, 104, 91, 0.88)",
    borderColor: "rgba(240, 154, 134, 0.28)",
    borderTopRightRadius: 10,
  },
  messageLabel: {
    color: authColors.sparkle,
    fontSize: 11,
    fontFamily: authFonts.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  messageText: {
    color: authColors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: authFonts.regular,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingText: {
    color: authColors.textMuted,
    fontSize: 13,
    fontFamily: authFonts.semibold,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: "rgba(224, 122, 106, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(224, 122, 106, 0.18)",
  },
  errorBannerText: {
    flex: 1,
    color: authColors.textPrimary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: authFonts.semibold,
  },
  composerWrap: {
    gap: 8,
  },
  composerBox: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderRadius: 24,
    padding: 10,
    backgroundColor: authColors.panel,
    borderWidth: 1,
    borderColor: authColors.surfaceBorder,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: authColors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: authFonts.regular,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: authColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.52,
  },
  footerNote: {
    color: authColors.textMuted,
    fontSize: 11,
    lineHeight: 17,
    fontFamily: authFonts.regular,
    textAlign: "center",
    paddingHorizontal: 6,
  },
});
