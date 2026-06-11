# KODA

> **The email client that remembers what you promised.**

Your inbox is not a message store. It's a ledger of promises, and nobody tracks them.

"I'll send the report by Friday." "We'll share pricing Monday." "Let me loop in the team." These commitments live in plain text, buried across hundreds of threads, tracked by nothing except the sender's follow-up anxiety and your memory.

**KODA fixes this.** It reads every email thread, extracts every commitment (things you promised, things others promised you), surfaces them before deadlines, and drafts follow-ups automatically when something's about to slip.

No other email client does this. Not Gmail. Not Superhuman. Not anyone.

---

## The Problem

The average knowledge worker receives 121 emails per day. Studies show 40% contain an implicit or explicit commitment. That's 48 commitments per day, tracked by nothing.

Every email client, including Superhuman, treats your inbox as a **message store ordered by time**. KODA treats it as what it actually is: **a ledger of promises**.

---

## Features

### 🔴 Commitments Board _(KODA-exclusive)_

A real-time two-column view:

- **MY COMMITMENTS** — everything you've promised, sorted by deadline
- **WAITING ON** — everything others promised you, sorted by how overdue

Each card shows the exact commitment, who it's with, the deadline, and a link to the original thread. One-click **Draft Follow-up** generates a natural, specific follow-up email (not a generic "just checking in") for review before sending.

### ⚡ Realtime Inbox

New emails appear instantly via Corsair webhooks. No polling. No refresh. Sub-500ms delivery.

### 🤖 KODA Agent

A commitment-aware AI agent powered by Anthropic (not fixed) + Corsair MCP:

- _"What did I promise this week?"_ → queries your commitments DB
- _"Draft a follow-up for the overdue commitment with Priya"_ → generates draft for approval
- _"Send a calendar invite to X at 9 AM Thursday and email him"_ → does both in one shot

### 🏷️ AI Priority Inbox

Every email classified on arrival: **URGENT** / **NEEDS REPLY** / **FYI**. No rules to configure.

### ⌨️ Keyboard-First

20+ keyboard shortcuts. Cmd+K command palette. Every action reachable without a mouse.

### 📅 Unified Calendar

Google Calendar embedded natively. Commitment deadlines appear as calendar markers. Create events from commitment cards directly.

### 🔍 Corsair Search

Full-text search via Corsair Search API. Results in under 1 second. Advanced filters: `from:`, `to:`, `subject:`, date range.

---

## Tech Stack

| Layer             | Tech                                                         |
| ----------------- | ------------------------------------------------------------ |
| Frontend          | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend           | Next.js API Routes, Drizzle ORM                              |
| Database          | PostgreSQL (Neon)                                            |
| Email + Calendar  | Corsair SDK (Gmail + Calendar APIs)                          |
| Realtime          | Corsair Webhooks                                             |
| AI Agent          | Anthropic via Corsair MCP                                    |
| Deploy            | Vercel                                                       |
| Local webhook dev | Ngrok                                                        |

---

## Corsair Features Used

- **Corsair Gmail API** — list inbox, read threads, send email, create drafts
- **Corsair Calendar API** — list events, create events, send invites, update/delete
- **Corsair MCP Server** — gives the AI agent authenticated access to Gmail + Calendar without custom tool definitions
- **Corsair Webhooks** — realtime push for new emails and calendar events
- **Corsair Search API** — fast full-text email search with advanced filters

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL (Neon)
- Corsair account with Gmail + Calendar integrations set up
- Anthropic API key
- Ngrok (for local webhook testing)

### Setup

```bash
git clone https://github.com/shubhamdalvi/koda
cd koda
pnpm install
```

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://..."

# Auth
BETTER_AUTH_GOOGLE_CLIENT_ID="your-google-client-id"
BETTER_AUTH_GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Corsair
CORSAIR_KEK="your-corsair-kek"

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Ngrok (local dev only)
NGROK_URL="https://your-ngrok-url.ngrok.io"
```

### Database

```bash
npm run db:generate
npm run db:migrate
```

### Run

```bash
npm run dev
```

For webhooks locally:

```bash
ngrok http 3000
# Update NGROK_URL in .env
# Register webhook URL in Corsair dashboard: https://your-ngrok-url.ngrok.io/api/webhooks/email
```

---

## Project Structure

```
koda/
├── app/
│   ├── (auth)/login/               # NextAuth sign-in
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Shell, keyboard handler, Cmd+K
│   │   ├── inbox/                  # Email list + thread pane
│   │   ├── commitments/            # Commitments Board (KODA's signature)
│   │   ├── calendar/               # Calendar with commitment markers
│   │   └── agent/                  # AI agent chat
│   └── api/
│       ├── webhooks/email/         # Corsair email push handler
│       ├── webhooks/calendar/      # Corsair calendar push handler
│       ├── agent/                  # Claude + Corsair MCP
│       ├── ai/classify/            # Priority classification
│       ├── ai/commitments/         # Commitment extraction
│       └── search/                 # Corsair Search API wrapper
├── components/
│   ├── CommandPalette/             # cmdk Cmd+K
│   ├── CommitmentsBoard/           # MY COMMITMENTS + WAITING ON
│   ├── inbox/                      # EmailList, ThreadView, Composer
│   ├── calendar/                   # WeekGrid, EventCard
│   └── agent/                      # ChatBubble, ActionPill
├── lib/
    ├── corsair.ts                  # Typed Corsair client
    ├── db/
    │   ├── schema.ts               # Drizzle schema (6 tables)
    │   └── queries.ts              # All DB reads/writes
    └── ai/
        ├── classify.ts             # Priority prompt
        ├── commitments.ts          # Commitment extraction prompt
        ├── agent.ts                # Agent system prompt
        └── followup.ts             # Follow-up draft prompt
```

---

## Why KODA is Different

| Feature                                | Gmail        | Superhuman | KODA                |
| -------------------------------------- | ------------ | ---------- | ------------------- |
| Priority inbox                         | Manual rules | AI-powered | ✅ AI-powered       |
| Keyboard-first                         | ✗            | ✅         | ✅                  |
| Commitment extraction                  | ✗            | ✗          | ✅ KODA-exclusive   |
| "You promised X by Friday" reminder    | ✗            | ✗          | ✅ KODA-exclusive   |
| "They haven't replied in 5 days" nudge | ✗            | ✗          | ✅ KODA-exclusive   |
| Auto-draft follow-up on deadline       | ✗            | ✗          | ✅ KODA-exclusive   |
| Natural language agent (multi-step)    | ✗            | ✗          | ✅ via Corsair MCP  |
| Realtime push (no polling)             | ✗            | ✗          | ✅ Corsair webhooks |

---

## Built By

**Shubham Dalvi**
[shubhamdalvi.in](https://shubhamdalvi.in) · [LinkedIn](https://linkedin.com/in/shubhamdalvi)

---

_Built for the ChaiCode × Corsair Hackathon_  
_"Builder Mode On | MacBook Giveaway Hackathon"_  
_#chaicode #corsair-dev_
