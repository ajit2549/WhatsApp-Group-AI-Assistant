// bot.js
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import fetch from "node-fetch";
import Tesseract from "tesseract.js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PROMO_FORWARD_GROUP_ID = process.env.FORWARD_TO_GROUP;
const TARGET_GROUP_ID = process.env.TARGET_GROUP;

// ------------------- Setup WhatsApp client -------------------
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: '/usr/bin/chromium' // 👈 required in Docker
  }
});

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("ready", async () => {
  console.log("✅ Bot is ready!");
  console.log("🤖 Bot ID:", client.info.wid._serialized);
});

// ------------------- Detect Promotions -------------------
function isPromotionalText(text) {
  if (!text) return false;
  const PROMO_KEYWORDS = [
  "free offer", "limited time", "discount", "deal", "sale", "offer",
  "buy now", "special price", "hurry up", "clearance", "lowest price",
  "guarantee", "best deal", "earn money", "quick cash", "loan", "payday",
  "0% interest", "investment opportunity", "passive income", "credit card",
  "money back", "referral bonus", "invite & earn", "share and win",
  "exclusive access", "get started today", "promo code", "coupon", "voucher",
  "join now", "limited seats", "act fast", "don’t miss out", "only today",
  "expires soon", "last chance", "register now", "limited stock", "click here",
  "link in bio", "whatsapp me", "DM now", "guaranteed results", "no risk",
  "100% working", "secret trick"
];

  return promoKeywords.some((kw) => text.toLowerCase().includes(kw));
}

// ------------------- AI Helpers -------------------
async function generateAIReply(messageText, history = []) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        max_tokens: 500,
        messages: [...history, { role: "user", content: messageText }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("❌ OpenRouter API error:", data);
      return "🤖 Sorry, I couldn’t process that right now.";
    }

    return data?.choices?.[0]?.message?.content?.trim()
      || "🤖 Sorry, I couldn’t process that right now.";
  } catch (err) {
    console.error("❌ AI reply fetch error:", err);
    return "🤖 Sorry, I couldn’t process that right now.";
  }
}

// ------------------- OCR / Vision -------------------
async function extractTextFromImage(base64Image) {
  try {
    const buffer = Buffer.from(base64Image, "base64");
    const result = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => console.log(m.status, m.progress),
    });
    return result.data.text.trim();
  } catch (err) {
    console.error("❌ OCR error:", err);
    return "";
  }
}

async function isPromotionalImage(message) {
  console.log("🔍 Checking if image is promotional...");
  try {
    const media = await message.downloadMedia();
    if (!media || !media.mimetype.startsWith("image/")) return false;

    console.log("🧠 Running OCR on image...");
    const extractedText = await extractTextFromImage(media.data);
    console.log("🔎 OCR Extracted Text:", extractedText);

    return isPromotionalText(extractedText);
  } catch (err) {
    console.error("❌ Error in image check:", err);
    return false;
  }
}

// ------------------- Conversation Memory -------------------
const conversations = {}; // { chatId: { last: timestamp, history: [] } }
const CONTEXT_WINDOW = 2 * 60 * 1000; // 2 minutes

// ------------------- WhatsApp Message Handler -------------------
client.on("message", async (msg) => {
  try {
    if (msg.from !== TARGET_GROUP_ID) return;

    const chat = await msg.getChat();
    const botId = client.info.wid._serialized;
    const chatId = chat.id._serialized;
    const isTagged = msg.mentionedIds.includes(botId);

    // 1️⃣ Tagged → start or continue conversation
    if (isTagged) {
      if (
        !conversations[chatId] ||
        Date.now() - conversations[chatId].last > CONTEXT_WINDOW
      ) {
        conversations[chatId] = { last: Date.now(), history: [] };
      }

      conversations[chatId].last = Date.now();
      conversations[chatId].history.push({ role: "user", content: msg.body });

      const aiReply = await generateAIReply(msg.body, conversations[chatId].history);
      conversations[chatId].history.push({ role: "assistant", content: aiReply });

      return msg.reply(aiReply);
    }

    // 2️⃣ Not tagged → detect and delete promo
    if (
      isPromotionalText(msg.body) ||
      (msg.hasMedia && (await isPromotionalImage(msg)))
    ) {
      console.log("🛑 Promotional message detected:", msg.body || "Image");

      try {
        // Forward to specific group
        const targetChat = await client.getChatById(PROMO_FORWARD_GROUP_ID);
        await msg.forward(targetChat.id._serialized);
        console.log("➡️ Forwarded promotional message to:", PROMO_FORWARD_GROUP_ID);
      } catch (err) {
        console.error("❌ Error forwarding promo message:", err);
      }

      await msg.delete(true);
      console.log("🗑 Promo message deleted");
    }
  } catch (err) {
    console.error("❌ Error in message handler:", err);
  }
});

client.initialize();
