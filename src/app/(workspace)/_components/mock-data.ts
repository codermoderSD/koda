export const workspaceNav = [
  { href: "/inbox", label: "Workspace", short: "01" },
  { href: "/commitments", label: "Commitments", short: "02" },
  { href: "/calendar", label: "Calendar", short: "03" },
] as const;

export const inboxThreads = [
  {
    from: "Priya Shah",
    subject: "Q3 pricing breakdown",
    preview: "Can you send the pricing sheet before tomorrow's review?",
    priority: "URGENT",
    time: "9:42 AM",
    body: "Hi Shubham,\n\nCan you send the Q3 pricing breakdown before tomorrow's review? If it helps, I can also share the notes from our last call so the numbers line up before we go in.\n\nWe should also lock a short prep block so we arrive with the updated figures ready.\n\nPriya",
    commitment: {
      title: "Send Q3 pricing breakdown before tomorrow's review.",
      owner: "You",
      counterparty: "Priya Shah",
      deadline: "Tomorrow · 9:00 AM",
      confidence: "High",
    },
  },
  {
    from: "Northwind Legal",
    subject: "MSA revision — redlines",
    preview: "We'll share the updated redlines by end of day.",
    priority: "WAITING ON",
    time: "8:15 AM",
    body: "Shubham,\n\nThanks for the call. We'll share the updated MSA redlines by end of day so your team can review section 4 and the liability cap.\n\nBest,\nNorthwind Legal",
    commitment: {
      title: "Northwind to return revised MSA redlines.",
      owner: "Northwind Legal",
      counterparty: "You",
      deadline: "2 days overdue",
      confidence: "Medium",
    },
  },
  {
    from: "Rohan Mehta",
    subject: "Coffee chat Thursday",
    preview: "Can we lock 9 AM and send the invite today?",
    priority: "NEEDS REPLY",
    time: "Yesterday",
    body: "Hey — great chatting earlier. Can we lock 9 AM Thursday for coffee and send the invite today? Happy to come to your side of town.\n\nRohan",
    commitment: {
      title: "Create Thursday 9 AM coffee invite for Rohan.",
      owner: "You",
      counterparty: "Rohan Mehta",
      deadline: "Thu · 9:00 AM",
      confidence: "High",
    },
  },
  {
    from: "Acme Procurement",
    subject: "Renewal terms for FY26",
    preview: "Sharing the signed order form — let us know next steps.",
    priority: "OPEN",
    time: "Tue",
    body: "Hello,\n\nSharing the signed order form for the FY26 renewal. Let us know the next steps and timeline for countersignature.\n\nAcme Procurement",
    commitment: {
      title: "Acme to countersign FY26 order form.",
      owner: "Acme",
      counterparty: "You",
      deadline: "Next Mon",
      confidence: "Medium",
    },
  },
  {
    from: "Dana Olsen",
    subject: "Intro: partnerships at Vela",
    preview: "Happy to connect you — are you free next week?",
    priority: "NEEDS REPLY",
    time: "Mon",
    body: "Hi Shubham,\n\nHappy to make the intro to the partnerships team at Vela. Are you free for 30 minutes next week? I can loop them in once you send a couple of windows.\n\nDana",
    commitment: {
      title: "Reply to Dana with windows for Vela intro.",
      owner: "You",
      counterparty: "Dana Olsen",
      deadline: "Fri · 12:00 PM",
      confidence: "Medium",
    },
  },
] as const;

export const commitmentColumns = {
  mine: [
    {
      title: "Send Q3 pricing sheet to Priya",
      due: "Today · 6:00 PM",
      detail: "From “Q3 pricing breakdown” · Priya Shah",
    },
    {
      title: "Create Thursday coffee invite",
      due: "Thu · 9:00 AM",
      detail: "Calendar action pending · Rohan Mehta",
    },
    {
      title: "Reply to Vela partnership intro",
      due: "Fri · 12:00 PM",
      detail: "From Dana Olsen · needs a meeting time",
    },
  ],
  waitingOn: [
    {
      title: "Northwind to return revised MSA",
      due: "2 days overdue",
      detail: "Follow-up draft ready · Northwind Legal",
    },
    {
      title: "Finance to confirm travel budget",
      due: "Fri · 2:00 PM",
      detail: "Blocked on approval chain · internal",
    },
    {
      title: "Acme to countersign order form",
      due: "Next Mon",
      detail: "Awaiting procurement · Acme",
    },
  ],
} as const;

export const calendarEvents = [
  { day: 0, start: 9, end: 10, title: "Pipeline review", tone: "neutral" },
  { day: 0, start: 14, end: 15, title: "1:1 — Dana", tone: "neutral" },
  { day: 2, start: 11, end: 12, title: "Northwind follow-up", tone: "warning" },
  { day: 3, start: 9, end: 11, title: "Coffee chat — Rohan", tone: "accent" },
  { day: 3, start: 15, end: 16, title: "Q3 review prep", tone: "accent" },
  { day: 4, start: 13, end: 14, title: "Board deck send", tone: "success" },
] as const;

export const calendarDeadlines = [
  { day: 1, label: "Pricing sheet due" },
  { day: 3, label: "Coffee invite" },
  { day: 3, label: "Travel budget" },
] as const;

export const agendaItems = [
  { time: "Thu · 9:00 AM", label: "Coffee chat — Rohan Mehta", tone: "accent" },
  { time: "Fri · 1:00 PM", label: "Send board deck", tone: "success" },
  { time: "Fri · 2:00 PM", label: "Follow up — Northwind MSA", tone: "warning" },
] as const;

export const agentMessages = [
  {
    role: "user",
    text: "Draft a follow-up for the overdue Northwind MSA and block 30 minutes tomorrow morning to review it.",
  },
  {
    role: "assistant",
    text: "I'll draft a follow-up to Northwind Legal referencing the 2-day-overdue redlines, and hold Fri 9:30–10:00 AM to review. Send the draft and create the block?",
  },
  {
    role: "user",
    text: "Yes, go ahead.",
  },
  {
    role: "assistant",
    text: "Done. Draft saved to Northwind thread and a 30-min review block is on your calendar for Friday 9:30 AM.",
  },
] as const;
