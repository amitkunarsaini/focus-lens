import { STORAGE_KEYS, getConfig, setConfig } from "./shared";

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.round(seconds)}s`;
}

async function render() {
  const cfg = await getConfig();
  const { [STORAGE_KEYS.stats]: stats, [STORAGE_KEYS.queue]: queue = [] } =
    await chrome.storage.local.get([STORAGE_KEYS.stats, STORAGE_KEYS.queue]);

  const today = new Date().toISOString().slice(0, 10);
  const s = stats?.date === today ? stats : { seconds: 0, events: 0 };

  (document.getElementById("todayTime") as HTMLElement).textContent = fmt(s.seconds);
  (document.getElementById("todayEvents") as HTMLElement).textContent = String(s.events);
  (document.getElementById("queued") as HTMLElement).textContent = String(queue.length);

  const dot = document.getElementById("dot")!;
  dot.classList.toggle("off", !cfg.tracking);

  (document.getElementById("tracking") as HTMLInputElement).checked = cfg.tracking;
  document.getElementById("unconfigured")!.classList.toggle("hidden", Boolean(cfg.token));
}

document.getElementById("tracking")!.addEventListener("change", async (e) => {
  await setConfig({ tracking: (e.target as HTMLInputElement).checked });
  render();
});

document.getElementById("sync")!.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "FL_FLUSH" }, () => setTimeout(render, 400));
});

document.getElementById("dashboard")!.addEventListener("click", async () => {
  const cfg = await getConfig();
  chrome.tabs.create({ url: `${cfg.serverUrl}/dashboard` });
});

document.getElementById("settings")!.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

render();
