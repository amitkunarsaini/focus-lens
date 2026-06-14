/**
 * FocusLens background service worker.
 *
 * Tracks the user's *active attention* — one contiguous span per (tab, url)
 * that is in the focused window and not idle. Spans are closed on tab switch,
 * navigation, window blur, idle, or tab close, then queued and flushed to the
 * dashboard's ingest API.
 *
 * All durable state lives in chrome.storage.local so the worker can be torn
 * down and revived by Chrome without losing the in-flight span.
 */

import {
  STORAGE_KEYS,
  getConfig,
  domainOf,
  isTrackable,
  type QueuedEvent,
} from "./shared";

const MIN_SPAN_SECONDS = 2;
const FLUSH_ALARM = "fl_flush";
const IDLE_SECONDS = 60;

interface CurrentSpan {
  url: string;
  title: string;
  domain: string;
  startTime: number; // epoch ms
  tabId?: number;
  windowId?: number;
}

// ── durable state helpers ──────────────────────────────────────────────────

async function getCurrent(): Promise<CurrentSpan | null> {
  const { [STORAGE_KEYS.current]: cur } = await chrome.storage.local.get(
    STORAGE_KEYS.current,
  );
  return cur ?? null;
}
async function setCurrent(span: CurrentSpan | null) {
  if (span) await chrome.storage.local.set({ [STORAGE_KEYS.current]: span });
  else await chrome.storage.local.remove(STORAGE_KEYS.current);
}

async function getLastDomain(): Promise<string | undefined> {
  const { fl_last_domain } = await chrome.storage.local.get("fl_last_domain");
  return fl_last_domain;
}
async function setLastDomain(domain: string) {
  await chrome.storage.local.set({ fl_last_domain: domain });
}

async function enqueue(event: QueuedEvent) {
  const { [STORAGE_KEYS.queue]: queue = [] } = await chrome.storage.local.get(
    STORAGE_KEYS.queue,
  );
  queue.push(event);
  await chrome.storage.local.set({ [STORAGE_KEYS.queue]: queue });
  await bumpStats(event.duration);
}

async function bumpStats(seconds: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { [STORAGE_KEYS.stats]: stats } = await chrome.storage.local.get(
    STORAGE_KEYS.stats,
  );
  const cur = stats?.date === today ? stats : { date: today, seconds: 0, events: 0 };
  cur.seconds += seconds;
  cur.events += 1;
  await chrome.storage.local.set({ [STORAGE_KEYS.stats]: cur });
}

// ── span lifecycle ──────────────────────────────────────────────────────────

async function startSpan(tab: chrome.tabs.Tab | null) {
  if (!tab || !isTrackable(tab.url)) {
    await setCurrent(null);
    return;
  }
  await setCurrent({
    url: tab.url,
    title: tab.title ?? "",
    domain: domainOf(tab.url),
    startTime: Date.now(),
    tabId: tab.id,
    windowId: tab.windowId,
  });
}

async function endSpan(endReason: string) {
  const cur = await getCurrent();
  await setCurrent(null);
  if (!cur) return;
  const duration = Math.round((Date.now() - cur.startTime) / 1000);
  if (!isTrackable(cur.url) || duration < MIN_SPAN_SECONDS) return;

  const fromDomain = await getLastDomain();
  const event: QueuedEvent = {
    url: cur.url,
    title: cur.title || cur.domain,
    startTime: new Date(cur.startTime).toISOString(),
    endTime: new Date().toISOString(),
    duration,
    tabId: cur.tabId,
    windowId: cur.windowId,
    endReason,
    fromDomain: fromDomain && fromDomain !== cur.domain ? fromDomain : undefined,
  };
  await enqueue(event);
  await setLastDomain(cur.domain);
}

async function transition(tab: chrome.tabs.Tab | null, reason: string) {
  const { tracking } = await getConfig();
  if (!tracking) return;
  await endSpan(reason);
  await startSpan(tab);
}

async function activeTabInWindow(windowId: number): Promise<chrome.tabs.Tab | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    return tab ?? null;
  } catch {
    return null;
  }
}

// ── chrome event wiring ──────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  await transition(tab, "tab_switch");
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.active) return;
  // A real navigation (URL change) or the title resolving for the current page.
  if (changeInfo.url) {
    await transition(tab, "navigation");
  } else if (changeInfo.title) {
    const cur = await getCurrent();
    if (cur && cur.tabId === tabId) {
      cur.title = changeInfo.title;
      await setCurrent(cur);
    }
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await endSpan("window_blur");
    return;
  }
  const tab = await activeTabInWindow(windowId);
  await transition(tab, "window_focus");
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const cur = await getCurrent();
  if (cur && cur.tabId === tabId) await endSpan("tab_close");
});

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "active") {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await transition(tab ?? null, "idle_resume");
  } else {
    await endSpan("idle");
  }
});

// ── flush loop ────────────────────────────────────────────────────────────

async function flush() {
  const { serverUrl, token, tracking } = await getConfig();
  if (!tracking || !token || !serverUrl) return;

  const { [STORAGE_KEYS.queue]: queue = [] } = await chrome.storage.local.get(
    STORAGE_KEYS.queue,
  );
  if (!queue.length) return;

  // Snapshot and clear optimistically; restore on failure.
  await chrome.storage.local.set({ [STORAGE_KEYS.queue]: [] });
  try {
    const res = await fetch(`${serverUrl}/api/ingest/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-fl-token": token },
      body: JSON.stringify({ events: queue }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    // Put events back at the front of the queue for the next attempt.
    const { [STORAGE_KEYS.queue]: pending = [] } = await chrome.storage.local.get(
      STORAGE_KEYS.queue,
    );
    await chrome.storage.local.set({ [STORAGE_KEYS.queue]: [...queue, ...pending] });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.idle.setDetectionInterval(IDLE_SECONDS);
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.idle.setDetectionInterval(IDLE_SECONDS);
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === FLUSH_ALARM) void flush();
});

// Allow the popup to request an immediate flush / tracking toggle.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "FL_FLUSH") {
    flush().then(() => sendResponse({ ok: true }));
    return true;
  }
});
