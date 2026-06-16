# KODA

**KODA is the execution layer for email and calendar.**

KODA turns email commitments into tracked execution — replies, calendar blocks, and completed work. One AI workspace over live Gmail and Google Calendar.

Live at [koda.shubhamdalvi.in](https://koda.shubhamdalvi.in) · see the interactive deck at `/pitch-deck` and [docs/pitch-deck.md](docs/pitch-deck.md).

Most inbox tools optimize for speed of communication. That is not the real job. The real job is making sure commitments made in email actually turn into replies, calendar blocks, decisions, and delivered work.

KODA is built around a sharper idea:

**Your inbox is not a feed. It is an operational system of promises, requests, deadlines, and meetings.**

That is the wedge.

---

## Product Thesis

Gmail and Google Calendar are strong systems of record, but they are not strong systems of execution.

People lose time because work is split across:

- messages that contain asks
- threads that imply deadlines
- calendars that do not understand email context
- follow-ups that depend on memory
- assistants that can draft text but cannot reliably coordinate the whole workflow

KODA fixes this by treating email and calendar as one workflow surface.

When a message creates work, KODA should help the user:

1. detect what matters
2. understand who owes what
3. schedule the next action
4. send the reply or invite
5. keep the commitment visible until it is resolved

---

## The Product Vision

This is not just "AI for email."

The stronger business is:

**KODA becomes the operating layer for relationship-driven work.**

That includes:

- founders
- recruiters
- operators
- account managers
- sales teams
- executive assistants
- partnerships teams
- legal and finance teams managing external threads

These users already live in Gmail and Calendar, but they lose money on missed follow-ups, slow coordination, and poor visibility into commitments.

KODA has a credible wedge because it can own a narrow but painful problem first:

**turning email commitments into tracked execution**

If that works, the expansion path is clear:

- team workflows
- delegation
- SLAs and response policies
- customer and deal coordination
- meeting preparation
- cross-system workflow memory

Acquisition-level logic exists because the product sits at the intersection of:

- communication
- scheduling
- AI action orchestration
- workflow memory

Natural acquirers would be companies that already own adjacent surfaces:

- Google
- Microsoft
- Salesforce
- Atlassian
- Notion
- Zoom
- Slack / Salesforce

---

## The Wedge

The first unforgettable feature is not generic chat.

It is:

**Commitment-aware inbox and calendar**

KODA reads live Gmail and Calendar data through Corsair and surfaces:

- what I promised
- what others promised me
- what needs a reply
- what needs a calendar block
- what is at risk of slipping

That gives KODA a product identity stronger than "better Gmail."

---

## Core Product Experience

### Inbox

A serious desktop-style workspace with:

- real Gmail threads
- urgency classification
- structured commitment context
- actions beside the thread, not buried in menus

### Commitments

The signature view:

- `Promised by me`
- `Waiting on others`

Each item should show:

- summary
- source thread
- owner
- counterparty
- deadline
- confidence
- suggested next action

### Calendar

A planning layer, not a decorative calendar clone:

- real Google Calendar events
- commitment deadlines overlaid on schedule
- create prep blocks and invites from email context
- see workload and obligations in one place

### Agent

An execution agent, not a chatbot.

It should do real work across Gmail and Calendar:

- draft replies
- create invites
- schedule follow-ups
- answer commitment questions from KODA's own data

---

## Why KODA Is Different

Most email tools optimize for one of these:

- faster triage
- prettier inbox
- better search
- AI drafting

KODA should optimize for:

**reliable follow-through**

That is strategically better because it is:

- easier to explain
- easier to demo
- easier to measure
- more defensible than generic drafting

---

## Current Stack

- Next.js, React, TypeScript, Tailwind CSS
- PostgreSQL + Drizzle ORM
- Better Auth + Google OAuth
- Gmail and Google Calendar APIs via self-hosted Corsair
- AI SDK + Groq
- Zod, TanStack Query, tRPC
- Vercel and Vercel Analytics

AI models can change over time. The product should stay model-flexible.

## Status

Shipped: Google sign-in, Gmail thread sync/search, Google Calendar search and actions, the AI command bar (agent), AI reply drafting, commitment extraction, AI credit tracking, and privacy/terms pages. Deployed and in use.

---

## Architecture Direction

KODA should be built around four layers:

1. **Acquisition layer**
   Gmail, Google Calendar, and webhook ingestion through Corsair.
2. **Operational data layer**
   Normalized local store for email, commitments, calendar events, and action history.
3. **Decision layer**
   Classification, commitment extraction, prioritization, and scheduling logic.
4. **Execution layer**
   UI actions and agent actions that draft, send, schedule, and update state.

The moat is not the UI alone. The moat is the combination of:

- workflow-specific data model
- accumulated action history
- structured commitment graph
- execution quality
