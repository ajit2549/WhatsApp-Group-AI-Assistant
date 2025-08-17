import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import axios from "axios";
import Database from "better-sqlite3";

// ------------------- Setup WhatsApp client -------------------
const client = new Client({ authStrategy: new LocalAuth() });

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("✅ WhatsApp client ready!"));

// ------------------- Setup SQLite -------------------
const db = new Database("group_conversations.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS conversations (
    group_id TEXT,
    role TEXT,
    content TEXT,
    timestamp INTEGER
  )
`).run();

function saveMessage(groupId, role, content) {
    const stmt = db.prepare("INSERT INTO conversations (group_id, role, content, timestamp) VALUES (?, ?, ?, ?)");
    stmt.run(groupId, role, content, Date.now());
}

function loadConversation(groupId) {
    const stmt = db.prepare("SELECT role, content FROM conversations WHERE group_id = ? ORDER BY timestamp ASC");
    return stmt.all(groupId);
}

// ------------------- Your Friendli token -------------------
const FRIENDLI_TOKEN = "${FRIENDLI_TOKEN}";

client.on("message", (message) => {
    console.log("--------------------------------------------------");
    console.log("📬 Message received!");
    console.log("Body      :", message.body);
    console.log("From      :", message.from);
    console.log("Author    :", message.author); // sender in group
    console.log("Is group? :", message.isGroupMsg);
    console.log("Mentions :", message.mentionedIds);
    console.log("BotId :", client.info?.wid?._serialized);
    console.log("--------------------------------------------------");
});

// ------------------- Handle group messages -------------------
client.on("message", async (message) => {
    const isGroup = message.from.endsWith("@g.us");
    if (!isGroup) return; // Ignore 1:1 chats

    const botId = client.info?.wid?._serialized;
    const isMentioned = message.mentionedIds?.includes(botId);
    if (!isMentioned) return; // Ignore if bot not tagged

    const groupId = message.from;
    const sender = message.author || message.from;
    const userMessage = message.body;

    console.log(`📬 Mentioned by ${sender} in group ${groupId}:`, userMessage);

    // Save user message
    saveMessage(groupId, "user", userMessage);

    // Load conversation history
    const conversation = loadConversation(groupId);

    try {
        // Call Friendli API
        const response = await axios.post(
            "https://api.friendli.ai/serverless/v1/chat/completions",
            {
                model: "meta-llama-3.1-8b-instruct",
                messages: [
                    { role: "system", content: "You are a helpful assistant for this WhatsApp group." },
                    ...conversation
                ],
                max_tokens: 2048,
                stream: false,
            },
            {
                headers: {
                    Authorization: `Bearer ${FRIENDLI_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const botReply = response.data?.choices?.[0]?.message?.content || "⚠️ Sorry, I couldn’t understand.";

        // Send reply
        await client.sendMessage(groupId, botReply);

        // Save bot reply
        saveMessage(groupId, "assistant", botReply);

    } catch (err) {
        console.error("❌ Friendli API error:", err.response?.data || err.message);
    }
});

// ------------------- Start WhatsApp client -------------------
client.initialize();
