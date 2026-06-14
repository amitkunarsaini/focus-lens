# FocusLens — Attention Intelligence Platform

> This isn't another screen-time tracker. It's an intelligence system that understands how you spend attention, identifies focus patterns, predicts distractions, and helps improve productivity using **real behavioural data**.

FocusLens is a Chrome extension + Next.js dashboard that captures your real browsing activity and turns it into an explainable picture of your attention: focus sessions, attention leaks, context switching, a productivity score, goal alignment, and daily/weekly intelligence.

The analytics engine is **fully deterministic** — every number is computed from measured behaviour. The AI layer is an optional enhancement that rephrases insights; the product works completely without it.

---

## Stack

| Layer | Tech |
|---|---|
| Dashboard | Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn-style UI, Framer Motion, TanStack Query, Recharts |
| Backend | Next.js API Routes, Prisma, PostgreSQL |
| Auth | NextAuth (credentials + optional Google), JWT sessions |
| Extension | Chrome Manifest V3, TypeScript, esbuild |
| AI (optional) | Anthropic Claude (`@anthropic-ai/sdk`) with deterministic fallback |

---

## Quick start

```bash
# 1. Install dependencies (also runs `prisma generate`)
npm install

# 2. Start PostgreSQL — pick ONE:
docker compose up -d         # (a) Docker
npm run db:start             # (b) No Docker: real Postgres in userspace (see below)

# 3. Configure environment
cp .env.example .env
#   set NEXTAUTH_SECRET (openssl rand -base64 32)
#   ANTHROPIC_API_KEY is optional

# 4. Create the schema
npm run db:push

# 5. (Optional) seed a demo account with 30 days of data
npm run db:seed
#   → sign in as demo@focuslens.app / demo1234

# 6. Run the dashboard
npm run dev      # http://localhost:3000
```

### No Docker? `npm run db:start`

If you can't (or don't want to) run Docker, **`npm run db:start`** boots a real PostgreSQL 16+ server entirely in userspace via [`embedded-postgres`](https://www.npmjs.com/package/embedded-postgres) — no Docker, no `sudo`, no system install. It uses the same credentials as the Docker setup, so `DATABASE_URL` works unchanged:

```
postgresql://focuslens:focuslens@localhost:5432/focuslens
```

- Leave it running in its own terminal (Ctrl-C to stop).
- Data persists in `./.postgres-data` — delete that folder for a clean slate.
- Already have Postgres elsewhere? Skip both and just point `DATABASE_URL` at it.

---

## Two ways to get data

### Demo Mode (instant)
Sign in, then click **"Seed 30 days of demo data"** in the sidebar (or run `npm run db:seed`). Realistic browsing history is generated and run through the *same* analytics pipeline the live extension feeds — so every focus session, leak, score and insight is genuinely derived, not faked.

### Live Mode (real data) — default
1. Build the extension:
   ```bash
   npm run ext:build
   ```
2. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `extension/dist`.
3. Open the dashboard → **Overview → Connect your browser extension**, copy your **Dashboard URL** and **Ingest token**.
4. Click the extension icon → **Settings** → paste both → **Save**.

The extension now tracks active-tab attention and streams events to `/api/ingest/events` every minute. Refresh the dashboard to watch analytics build in real time.

---

## What it computes

- **Activity classification** — domain + URL + title rules map every span to a category (e.g. `github.com → Development`, a YouTube tutorial → Learning, a YouTube short → Entertainment). Categories roll up to Productive / Neutral / Distracting.
- **Focus sessions** — sustained productive runs (≥15 min), tolerating short interruptions; ≥45 min counts as deep work.
- **Attention leaks** — productive runs repeatedly broken by distracting detours, with interruption count, lost time, and an estimated refocus cost.
- **Context switching** — domain-switch frequency per active hour → a 0–100 sustained-attention score.
- **Productivity score** — explainable 0–100 from five weighted components (category mix, deep focus, switching, idle, goal alignment).
- **Goal alignment** — declared goals (learn AI, limit social media, deep-work hours) compared against measured behaviour.
- **Insights** — daily narrative, attention-leak alerts, behavioural patterns, risks and recommendations.
- **Weekly Intelligence Report** — productivity & focus trends, top productive sites vs. top distractions, learning and deep-work hours, attention-leak totals and actionable recommendations (on the Insights page).

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full breakdown.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run the dashboard |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm run db:start` | Run a local PostgreSQL in userspace (no Docker/sudo) |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:seed` | Seed the demo user + 30 days of data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run ext:build` | Build the extension into `extension/dist` |
| `npm run typecheck` | Type-check the project |

---

## Notes

- **Auth**: for frictionless local dev, the credentials provider auto-provisions an account on first sign-in. Add `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` to enable Google sign-in.
- **AI**: set `ANTHROPIC_API_KEY` to have Claude rephrase the daily summary. Without it, the deterministic narrative is used and everything else is unchanged.
- **Privacy**: events are stored in your own Postgres; nothing leaves your infrastructure except optional AI summary calls.
