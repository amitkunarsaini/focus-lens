# FocusLens — Chrome Extension (Manifest V3)

Captures your **real** active-attention browsing and streams it to the FocusLens dashboard, where it becomes focus sessions, attention leaks, context-switching, productivity scores and insights.

## Build

```bash
npm run ext:build                                            # dev → http://localhost:3000
FOCUSLENS_DASHBOARD_URL=https://your-app.vercel.app npm run ext:build   # production
```

`FOCUSLENS_DASHBOARD_URL` becomes the default dashboard URL in Settings and
scopes the manifest's `host_permissions` to exactly that origin (+ localhost).

This produces:
- `extension/dist/` — the unpacked extension (load this folder in Chrome)
- `extension/focuslens-extension.zip` — a zipped build for sharing / Web Store upload

To publish, see [PRIVACY.md](./PRIVACY.md) for the required privacy policy and
Chrome Web Store listing notes.

## Install (Load unpacked)

1. Make sure the dashboard is running (`npm run dev`) and you're signed in.
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select the `extension/dist` folder.
5. The FocusLens icon appears in the toolbar.

## Connect to your account

1. In the dashboard, go to **Overview → Connect your browser extension** and copy your **Dashboard URL** and **Ingest token**.
2. Click the FocusLens toolbar icon → **Settings**.
3. Paste the **Dashboard URL** (`http://localhost:3000`) and **Ingest token**, then **Save**.
4. Browse normally. Activity flushes to the dashboard every ~60s — click **Sync now** in the popup to push immediately, then refresh the dashboard.

## What it tracks

One **active-attention span** per focused, non-idle tab. A span is closed and queued on:

| Chrome event | Reason recorded |
|---|---|
| `tabs.onActivated` | `tab_switch` |
| `tabs.onUpdated` (URL change) | `navigation` |
| `windows.onFocusChanged` | `window_focus` / `window_blur` |
| `idle.onStateChanged` (60s) | `idle` / `idle_resume` |
| `tabs.onRemoved` | `tab_close` |

Durable state lives in `chrome.storage.local`, so Chrome can suspend and revive the service worker without losing the in-flight span. A 1-minute `alarms` job flushes the queue to `POST /api/ingest/events`, authenticated by your per-user `x-fl-token`. Failed batches are re-queued.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest (permissions: tabs, storage, idle, alarms) |
| `src/background.ts` | Service-worker tracker (span lifecycle + flush) |
| `src/shared.ts` | Config + types shared by worker/popup/options |
| `src/popup.*` | Toolbar popup (today's stats, tracking toggle, sync) |
| `src/options.*` | Settings (dashboard URL + ingest token) |
| `icons.mjs` | Generates branded PNG icons via sharp |
| `build.ts` | esbuild bundler → `dist/` + zip |

## Privacy

Events go only to the dashboard URL you configure (your own server). Nothing else leaves the browser. Tracking can be paused anytime from the popup.
