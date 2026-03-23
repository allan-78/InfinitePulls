const axios = require("axios");

const GROQ_CHAT_COMPLETIONS_URL =
  "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1200;

const buildSystemPrompt = (user) => `
You are Infinite Pulls AI, a friendly shopping assistant inside the Infinite Pulls mobile app.
Help with product discovery, promotions, checkout guidance, account questions, and what order statuses usually mean.
Keep replies concise, clear, and mobile-friendly.
Do not pretend to place orders, edit accounts, or see private live data you were not given.
If the question needs staff intervention or exact order data, say that honestly and suggest checking the app or contacting support.
Current signed-in user:
- Name: ${user?.name || "Customer"}
- Email: ${user?.email || "unknown"}
`.trim();

const normalizeMessage = (message) => {
  if (!message || typeof message !== "object") {
    return null;
  }

  if (!["user", "assistant"].includes(message.role)) {
    return null;
  }

  if (typeof message.content !== "string") {
    return null;
  }

  const content = message.content.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!content) {
    return null;
  }

  return {
    role: message.role,
    content,
  };
};

const getErrorMessage = (error) =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Unable to reach the AI assistant right now.";

exports.chatWithAssistant = async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({
        success: false,
        message:
          "AI assistant is not configured yet. Add GROQ_API_KEY on the backend first.",
      });
    }

    const normalizedMessages = Array.isArray(req.body?.messages)
      ? req.body.messages
          .map(normalizeMessage)
          .filter(Boolean)
          .slice(-MAX_HISTORY_MESSAGES)
      : [];

    const latestUserMessage = [...normalizedMessages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      return res.status(400).json({
        success: false,
        message: "Please send a question for the assistant.",
      });
    }

    const payload = {
      model: DEFAULT_GROQ_MODEL,
      temperature: 0.4,
      max_tokens: 420,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(req.user),
        },
        ...normalizedMessages,
      ],
    };

    const { data } = await axios.post(GROQ_CHAT_COMPLETIONS_URL, payload, {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({
        success: false,
        message: "The AI assistant returned an empty reply.",
      });
    }

    return res.status(200).json({
      success: true,
      reply,
      model: payload.model,
    });
  } catch (error) {
    console.error("Groq assistant error:", getErrorMessage(error));

    return res.status(error?.response?.status || 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
};
