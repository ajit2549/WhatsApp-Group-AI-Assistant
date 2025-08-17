# WhatsApp Group Bot with Friendli AI

A WhatsApp group bot using `whatsapp-web.js` that replies to messages **only when tagged**, with **persistent conversation memory** stored in SQLite and **AI-powered responses via Friendli**.

---

## Features

- ✅ Replies only when **tagged** in a group.
- ✅ Maintains **conversation history** in SQLite (`group_conversations.db`) across server restarts.
- ✅ Uses **Friendli API** to generate AI responses based on group context.
- ✅ Minimal setup, works with a **real WhatsApp number** via QR code scan.

---

## Requirements

- Node.js v18+
- WhatsApp account (proxy number)
- npm packages:

```bash
npm install whatsapp-web.js qrcode-terminal axios better-sqlite3
```

- Friendli API token

---

## Setup

1. **Clone or copy the bot script** to a folder.
2. **Install dependencies**:

```bash
npm install
```

3. **Update the script** with your Friendli token:

```js
const FRIENDLI_TOKEN = "YOUR_FRIENDLI_TOKEN";
```

4. **Run the bot**:

```bash
node index_group.js
```

5. **Scan the QR code** with your WhatsApp proxy account.
6. **Add the proxy account** to the group where you want it to respond.

---

## How it works

- The bot **listens for messages** in groups (`@g.us`).
- **Ignores all messages** unless it is **tagged**.
- On mention, it **calls Friendli API** to generate a response.
- **Conversation context** is loaded from SQLite and updated with each message.
- **Bot replies** in the group, storing its own responses in the database.

---

## Database

- SQLite database: `group_conversations.db`
- Created automatically in the **script’s folder**.
- Table schema:

```sql
CREATE TABLE IF NOT EXISTS conversations (
  group_id TEXT,
  role TEXT,
  content TEXT,
  timestamp INTEGER
);
```

- Each row stores a **user or bot message** along with the **timestamp**.

---

## Notes

- The bot **must use a real WhatsApp number**; Cloud API numbers cannot join groups.
- Messages **sent before the bot joins** will not be captured.
- For large groups or production, consider moving from SQLite to **PostgreSQL or MongoDB** for better scalability.

---

## Future Enhancements

- Auto-tag the user who asked the question in the reply.
- Use **streaming responses** for real-time typing-like behavior.
- Add **command handling** (`!help`, `!stats`) for group management.

---

## Bot Flow Diagram

```text
  ┌───────────────┐
  │ WhatsApp User │
  │ sends message │
  └───────┬───────┘
          │
          ▼
  ┌─────────────────────────┐
  │ WhatsApp Group / Client │
  │ (whatsapp-web.js proxy) │
  └───────┬─────────────────┘
          │ Detects message
          │ and checks if bot is tagged
          ▼
  ┌─────────────────────────┐
  │       Bot Logic         │
  │ - Is it a group message?│
  │ - Is the bot mentioned? │
  │ - Load conversation from│
  │   SQLite database       │
  └───────┬─────────────────┘
          │
          ▼
  ┌─────────────────────────┐
  │    Friendli AI API      │
  │ - Receives conversation │
  │   context               │
  │ - Generates response    │
  └───────┬─────────────────┘
          │
          ▼
  ┌─────────────────────────┐
  │ SQLite Database         │
  │ - Store user message    │
  │ - Store bot response    │
  └───────┬─────────────────┘
          │
          ▼
  ┌─────────────────────────┐
  │ WhatsApp Group          │
  │ - Bot sends reply       │
  │ - Users see response    │
  └─────────────────────────┘
```

This shows **end-to-end flow**:

1. User sends a message in a group.
2. WhatsApp client detects the message.
3. Bot checks if it’s tagged.
4. Loads history from SQLite.
5. Calls Friendli API to generate a reply.
6. Stores both user message and bot reply in SQLite.
7. Sends the reply back to the WhatsApp group.

