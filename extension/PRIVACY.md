# FocusLens Extension — Privacy Policy

_Last updated: 2026-06-14_

FocusLens is an attention-analytics tool. The browser extension records your
**active browsing activity** and sends it to the FocusLens dashboard **server
that you configure** so it can be turned into focus, productivity and goal
analytics. This document explains exactly what is collected and how it is used.

## What the extension collects

For the tab you are actively viewing (focused window, not idle), it records:

- **Page URL** and **page title**
- **Domain** (derived from the URL)
- **Start time, end time, and duration** of each viewing span
- **Why a span ended** (tab switch, navigation, window blur, idle, tab close)
- The **previous domain** (to analyse navigation flow)

It does **not** collect: form inputs, page contents, keystrokes, passwords,
clipboard, or anything from background/unfocused tabs. It does not inject scripts
into the pages you visit.

## How it's used

The data is sent only to the dashboard URL **you** set in the extension's
Settings (your own FocusLens deployment), authenticated by your personal ingest
token. There it is used solely to compute your analytics — focus sessions,
attention leaks, context switching, productivity score, goal alignment and
insights. It is **not sold, rented, or shared** with third parties.

If the dashboard operator has configured an optional AI provider (Anthropic
Claude), only **already-computed, aggregated numbers** (e.g. totals and a draft
summary) may be sent to rephrase the daily summary — never your raw URLs or page
titles.

## Permissions, and why each is needed

| Permission | Why |
|---|---|
| `tabs` | Read the active tab's URL and title to record what you're attending to. |
| `idle` | Pause tracking when you step away (no time counted while idle). |
| `storage` | Save your settings and queue events locally until they sync. |
| `alarms` | Flush the queued events to the dashboard about once a minute. |
| host access to your dashboard origin | Send events to your dashboard's `/api/ingest/events`. Scoped to that one origin. |

## Your control

- **Pause anytime** from the popup (toggle "Tracking active").
- **Stop entirely** by removing the extension.
- **Delete your data** from the dashboard (your data lives in the operator's
  database, isolated to your account by your ingest token).

## Contact

Questions about this policy: <your-contact-email>.

---

## Chrome Web Store listing notes (for the publisher)

- **Single purpose:** "Capture your active browsing activity and send it to your
  FocusLens dashboard to produce personal attention and productivity analytics."
- **Permission justifications** (paste into the store form):
  - `tabs` — "Read the active tab URL/title to measure time and attention per site."
  - `idle` — "Avoid counting time while the user is away."
  - `storage` — "Persist settings and queue events offline."
  - `alarms` — "Periodically flush queued events to the user's dashboard."
  - Host permission (your dashboard origin) — "Send collected events to the
    user's configured FocusLens server."
- **Data usage disclosures:** collects "Web history" (URLs/titles) and "User
  activity"; data is **not sold**, used only for the app's core analytics, and
  sent only to the user-configured server. Encrypted in transit (HTTPS).
- **Privacy policy URL:** host this file (e.g. `https://<your-app>/privacy`) and
  link it in the listing.
- Provide screenshots (see `docs/screenshots/`) and an icon (`extension/dist/icons/`).
