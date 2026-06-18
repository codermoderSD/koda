# KODA

**KODA is the execution layer for email and calendar.**

Gmail and Google Calendar behind one command, and one voice. See your mail and your schedule together, then ask KODA in plain language (or just speak) to draft replies, book and reschedule meetings, send reminders, and track what you're owed, in realtime.

Live at [koda.shubhamdalvi.in](https://koda.shubhamdalvi.in)
Pitch deck at [koda.shubhamdalvi.in/pitch-deck](https://koda.shubhamdalvi.in/pitch-deck)

---

## The problem

Most knowledge work bounces between two tabs: Gmail and Google Calendar.

A normal connect looks like this:

1. You email someone to set up a meeting.
2. You switch to Calendar to find a time.
3. Availability doesn't line up.
4. You switch back to email to send a reschedule.
5. Repeat.

And the whole time, the reminders you need to send and the commitments you made stay stuck in your head. The reply you forgot and the meeting you forgot to move are the expensive ones.

Gmail stores the conversation. Calendar stores the time. Neither lets you _act_ across both.

---

## The product

KODA puts mail and calendar behind **one command**.

You don't switch views or do scheduling math. You ask, by keyboard (`⌘K`) or by voice (`⌘⇧K`), and KODA reads your live Gmail and Calendar, then does the work and tracks the follow-through.

- **One command for everything**, search, draft, send, schedule, and reschedule across mail and calendar from a single command bar.
- **Voice control**, hold `⌘⇧K` and talk. KODA types, books, and sends. No keyboard.
- **Draft & reply without typing**, "remind the team about the deck", "reply that I'll confirm tomorrow", KODA composes from thread context and sends.
- **Schedule in place**, create events, move them, and find open slots without leaving the email.
- **Commitments & reminders**, promises and deadlines are extracted from your threads so nothing slips.

This is not "AI for email." It is execution: it acts in realtime, instead of just autocompleting.

---

## Core experience

### Command bar (the agent)

`⌘K` opens a natural-language command bar with modes for ask / search / draft / schedule. It runs on the Vercel AI SDK over OpenAI's `gpt-4o-mini` and calls KODA's tools to act on your real data, never a generic chatbot.

### Voice

`⌘⇧K` starts hands-free input via the Web Speech API, with live transcription and a listening indicator. Speak the request; KODA executes it.

### Inbox

Live Gmail threads with search, reply, and draft, actions sit beside the thread, not buried in menus.

### Calendar

Real Google Calendar events: create, update, and delete with timezone awareness and attendee notifications, plus a free-slot finder that proposes open times.

### Commitments

Promises and requests extracted from threads, `Promised by me` and `Waiting on others`, scored by deadline and confidence, so follow-ups don't depend on memory.

---

## AI tools

The agent acts through a typed tool registry (`src/server/koda/ai-tools.ts`):

- `search_email`, search Gmail threads (supports Gmail query syntax)
- `search_calendar_events`, find events by title/date/window
- `search_commitments`, query extracted commitments
- `send_email`, send a new message
- `create_calendar_event`, schedule a meeting (notifies attendees)
- `update_calendar_event`, reschedule or edit an event
- `delete_calendar_event`, remove an event
- `corsair_list_operations` / `corsair_get_schema`, discover available Gmail/Calendar operations

---

## Why KODA is different

Most email tools optimize for faster triage, prettier inboxes, or better drafting. KODA optimizes for **action across both surfaces, in realtime**:

- no tab-switching, mail and calendar answered in one place
- no typing, speak or one-line it
- no scheduling math, free slots and reschedules handled for you
- nothing slips, commitments tracked from your threads

---

## Stack

- Next.js, React, TypeScript, Tailwind CSS
- PostgreSQL + Drizzle ORM
- Better Auth + Google OAuth
- Gmail and Google Calendar APIs via self-hosted Corsair
- AI SDK + OpenAI (`gpt-4o-mini` by default)
- Web Speech API for voice
- Zod, TanStack Query, tRPC
- Vercel and Vercel Analytics

---

## Architecture

Four layers:

1. **Acquisition**, Gmail, Calendar, OAuth, and webhooks through Corsair.
2. **Operational data**, normalized email, calendar, commitments, settings, and usage in Postgres.
3. **Decision**, classification, commitment extraction, prioritization, and free-slot logic.
4. **Execution**, AI tools that draft, send, schedule, and update state in realtime.

The moat is the combination: a workflow-specific data model, accumulated action history, the commitment graph, and execution quality.

---
