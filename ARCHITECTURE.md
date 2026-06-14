# FocusLens Architecture

## Overview

```
┌──────────────────┐   events    ┌─────────────────────┐   reads    ┌──────────────┐
│  Chrome MV3      │  ─────────▶ │  Next.js API Routes │ ◀───────── │  Dashboard   │
│  extension       │  x-fl-token │  /api/ingest/events │            │  (RSC + RQ)  │
│  (service worker)│             └──────────┬──────────┘            └──────────────┘
└──────────────────┘                        │ classify + recompute
                                            ▼
                                ┌────────────────────────┐
                                │  Intelligence engine    │  (pure TypeScript, no AI required)
                                │  classify · focus ·      │
                                │  leaks · switching ·     │
                                │  productivity · goals    │
                                └───────────┬─────────────┘
                                            ▼
                                ┌────────────────────────┐      ┌──────────────────┐
                                │  PostgreSQL (Prisma)    │      │  Claude (optional)│
                                │  events + rollups        │      │  narrative only   │
                                └────────────────────────┘      └──────────────────┘
```

The flow is identical for live and demo data: **raw `BrowsingEvent`s → `recomputeDay()` → derived tables**. Demo mode just generates the raw events synthetically.

## Folder structure

```
focus-lens/
├── prisma/
│   ├── schema.prisma          # all models + enums
│   └── seed.ts                # demo user + 30 days
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # authed shell + pages
│   │   │   ├── dashboard/      # Overview
│   │   │   ├── timeline/       # Activity timeline
│   │   │   ├── analytics/      # Trends & charts
│   │   │   ├── focus/          # Focus sessions
│   │   │   ├── insights/       # AI/computed insights
│   │   │   └── goals/          # Goal management
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── ingest/events/  # extension → server
│   │   │   ├── goals/          # CRUD
│   │   │   ├── demo/           # seed / clear
│   │   │   └── me/             # account + ingest token
│   │   ├── login/
│   │   └── page.tsx            # landing
│   ├── components/
│   │   ├── ui/                 # shadcn-style primitives
│   │   ├── dashboard/          # shell + feature views
│   │   └── charts/             # Recharts wrappers
│   └── lib/
│       ├── prisma.ts
│       ├── auth.ts
│       ├── classify.ts         # classification engine
│       ├── ai.ts               # optional Claude layer
│       ├── insights.ts         # deterministic narratives
│       ├── data.ts             # server-side read queries
│       ├── demo.ts             # demo data generator
│       └── analytics/
│           ├── types.ts
│           ├── focus-sessions.ts
│           ├── attention-leaks.ts
│           ├── context-switching.ts
│           ├── productivity.ts
│           ├── goals.ts
│           ├── rollup.ts       # orchestrator
│           └── persist.ts      # recompute + write derived tables
└── extension/
    ├── manifest.json           # MV3
    ├── build.ts                # esbuild bundler
    └── src/
        ├── background.ts       # service worker tracker
        ├── shared.ts           # config + types
        ├── popup.(html|css|ts)
        └── options.(html|ts)
```

## Data model

| Model | Purpose |
|---|---|
| `User` | account, `mode` (LIVE/DEMO), `ingestToken` |
| `BrowsingEvent` | one contiguous attention span on a URL (the raw signal) |
| `FocusSession` | detected deep-work block + quality score |
| `AttentionLeak` | productive run broken by distractions + recovery cost |
| `DailyAnalytics` | per-day rollup the dashboard reads (one row/user/day) |
| `ProductivityScore` | explainable 0–100 score with component contributions |
| `Goal` | user-declared target (learn / limit / deep work) |
| `Insight` | generated narrative (summary, pattern, risk, recommendation) |
| `Account`/`Session`/`VerificationToken` | NextAuth |

## Extension tracking model

The service worker maintains **one active span** for the focused, non-idle tab. A span is closed and queued on:

- `tabs.onActivated` → `tab_switch`
- `tabs.onUpdated` (url change) → `navigation`
- `windows.onFocusChanged` → `window_focus` / `window_blur`
- `idle.onStateChanged` → `idle` / `idle_resume`
- `tabs.onRemoved` → `tab_close`

Durable state lives in `chrome.storage.local`, so Chrome can suspend/revive the worker without losing the in-flight span. A 1-minute alarm flushes the queue to `/api/ingest/events` (authenticated by the per-user `x-fl-token`); failed batches are re-queued.

## Backend / ingest

`POST /api/ingest/events` validates the batch (zod), classifies each span server-side (never trusts client category), inserts `BrowsingEvent`s, then calls `recomputeDay()` for each affected day. `recomputeDay()` is **idempotent** — it replaces that day's focus sessions, leaks, insights, daily analytics and productivity score from scratch, so re-ingestion or backfill is always safe.

## Why it's not "just a GPT wrapper"

Classification, focus detection, leak detection, switching, scoring and goal alignment are all deterministic algorithms over real events. The AI layer (`lib/ai.ts`) only rewrites an already-computed summary into friendlier prose, using *only* the numbers passed to it — and silently falls back to the deterministic text when no API key is set.
