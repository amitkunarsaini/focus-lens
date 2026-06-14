import { getConfig, setConfig } from "./shared";

async function load() {
  const cfg = await getConfig();
  (document.getElementById("serverUrl") as HTMLInputElement).value = cfg.serverUrl;
  (document.getElementById("token") as HTMLInputElement).value = cfg.token;
}

document.getElementById("save")!.addEventListener("click", async () => {
  const serverUrl = (document.getElementById("serverUrl") as HTMLInputElement).value
    .trim()
    .replace(/\/$/, "");
  const token = (document.getElementById("token") as HTMLInputElement).value.trim();
  await setConfig({ serverUrl: serverUrl || "http://localhost:3000", token });
  const saved = document.getElementById("saved")!;
  saved.classList.remove("hidden");
  setTimeout(() => saved.classList.add("hidden"), 1800);
});

load();
