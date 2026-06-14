// Shared types & config helpers for the FocusLens extension.

export interface FLConfig {
  serverUrl: string;
  token: string;
  tracking: boolean;
}

export interface QueuedEvent {
  url: string;
  title: string;
  startTime: string; // ISO
  endTime: string; // ISO
  duration: number; // seconds
  tabId?: number;
  windowId?: number;
  endReason: string;
  fromDomain?: string;
}

export const DEFAULTS: FLConfig = {
  serverUrl: "http://localhost:3000",
  token: "",
  tracking: true,
};

export const STORAGE_KEYS = {
  config: "fl_config",
  queue: "fl_queue",
  current: "fl_current",
  stats: "fl_stats",
} as const;

export async function getConfig(): Promise<FLConfig> {
  const { [STORAGE_KEYS.config]: cfg } = await chrome.storage.sync.get(
    STORAGE_KEYS.config,
  );
  return { ...DEFAULTS, ...(cfg ?? {}) };
}

export async function setConfig(partial: Partial<FLConfig>): Promise<void> {
  const cur = await getConfig();
  await chrome.storage.sync.set({
    [STORAGE_KEYS.config]: { ...cur, ...partial },
  });
}

/** Normalize a URL to a bare hostname (no www). */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** URLs we never track. */
export function isTrackable(url: string | undefined): url is string {
  if (!url) return false;
  return /^https?:\/\//.test(url) && !url.startsWith("chrome://");
}
