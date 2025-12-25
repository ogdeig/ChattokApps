/* app.js — ChatTokApps Game Builder (Static, GitHub Pages)
   - Calls Render API (OpenAI key stays on Render, NOT on GitHub Pages)
   - Prompt → Spec → Build Files → Edit (3x)
   - Prevents stale prompt issues (requestId + no-store + ts + prompt echo shown)
   - Endpoint paths are configurable to match your Render API routes
*/

const DEFAULTS = {
  apiBase: "https://chattok-builder-api.onrender.com",
  pingPath: "/api/ping",
  specPath: "/api/spec",
  buildPath: "/api/build",
  editPath: "/api/edit",
};

const STORAGE_KEY = "chattokapps_builder_config_v1";

const el = (id) => document.getElementById(id);

function safeJsonParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

function loadConfig() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEY) || "", null);
  const cfg = { ...DEFAULTS, ...(saved || {}) };

  // Optional query param overrides:
  // ?api=https://...&ping=/api/ping&spec=/api/plan&build=/api/build&edit=/api/edit
  const qp = new URLSearchParams(location.search);
  if (qp.get("api")) cfg.apiBase = qp.get("api");
  if (qp.get("ping")) cfg.pingPath = qp.get("ping");
  if (qp.get("spec")) cfg.specPath = qp.get("spec");
  if (qp.get("build")) cfg.buildPath = qp.get("build");
  if (qp.get("edit")) cfg.editPath = qp.get("edit");

  cfg.apiBase = (cfg.apiBase || "").trim().replace(/\/$/, "");
  return cfg;
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function normalizeHex(v, fallback) {
  const s = String(v || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

function getTheme() {
  return {
    primary: normalizeHex(el("tPrimary").value, "#ff0050"),
    secondary: normalizeHex(el("tSecondary").value, "#00f2ea"),
    bg: normalizeHex(el("tBg").value, "#050b17"),
    surface: normalizeHex(el("tSurface").value, "#0b1632"),
    text: normalizeHex(el("tText").value, "#ffffff"),
  };
}

function renderThemePreview() {
  const t = getTheme();
  document.documentElement.style.setProperty("--p", t.primary);
  document.documentElement.style.setProperty("--s", t.secondary);
  document.documentElement.style.setProperty("--bg", t.bg);
  document.documentElement.style.setProperty("--surface", t.surface);
  document.documentElement.style.setProperty("--text", t.text);

  el("chipPrimary").style.background = t.primary;
  el("chipSecondary").style.background = t.secondary;
  el("chipSurface").style.background = t.surface;
}

function syncColorPair(colorId, textId, fallback) {
  const c = el(colorId);
  const t = el(textId);

  const apply = (hex) => {
    const v = normalizeHex(hex, fallback);
    c.value = v;
    t.value = v;
    renderThemePreview();
  };

  c.addEventListener("input", () => apply(c.value));
  t.addEventListener("input", () => apply(t.value));

  apply(c.value || t.value || fallback);
}

function setStatus(api, build) {
  if (api !== undefined) el("apiStatus").textContent = api;
  if (build !== undefined) el("buildStatus").textContent = build;
}

function setReqId(v) {
  el("reqId").textContent = v;
}

function showJson(preId, obj) {
  el(preId).textContent = obj ? JSON.stringify(obj, null, 2) : "";
}

function showEchoPrompt(text) {
  el("echoPrompt").textContent = text || "";
}

function newRequestId() {
  return "req_" + crypto.randomUUID();
}

function getFlags() {
  return {
    useCache: !!el("useCache").checked,
    forceFresh: !!el("forceFresh").checked,
  };
}

function getPrompt() {
  return (el("prompt").value || "").trim();
}

function getEditPrompt() {
  return (el("editPrompt").value || "").trim();
}

function configFromUI() {
  return {
    apiBase: (el("apiBase").value || DEFAULTS.apiBase).trim().replace(/\/$/, ""),
    pingPath: (el("pingPath").value || DEFAULTS.pingPath).trim(),
    specPath: (el("specPath").value || DEFAULTS.specPath).trim(),
    buildPath: (el("buildPath").value || DEFAULTS.buildPath).trim(),
    editPath: (el("editPath").value || DEFAULTS.editPath).trim(),
  };
}

function pushConfigToUI(cfg) {
  el("apiBase").value = cfg.apiBase;
  el("pingPath").value = cfg.pingPath;
  el("specPath").value = cfg.specPath;
  el("buildPath").value = cfg.buildPath;
  el("editPath").value = cfg.editPath;
}

async function readFileAsDataUrl(file, maxBytes = 900_000) {
  if (!file) return null;
  if (file.size > maxBytes) {
    throw new Error(`Image too large (${Math.round(file.size / 1024)}KB). Please use < ${Math.round(maxBytes / 1024)}KB.`);
  }
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Failed to read image file."));
    fr.onload = () => resolve(String(fr.result || ""));
    fr.readAsDataURL(file);
  });
}

async function apiFetch(path, bodyObj, method = "POST") {
  const cfg = configFromUI();
  const base = cfg.apiBase.replace(/\/$/, "");

  // Add timestamp query param to defeat any intermediary caching
  const url = `${base}${path}${path.includes("?") ? "&" : "?"}ts=${Date.now()}`;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: bodyObj ? JSON.stringify(bodyObj) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

/* ===============================
   Hard Rules injected into AI build
   ===============================
   These are sent to your API as "builderRules".
   Your backend should prepend these to the prompt/system message so every game:
   - Uses 9:16, settings screen, connect/start flow
   - Uses TikTokClient safely (matches your example)
   - Never breaks the ChatTok injection pattern (CHATTOK_CREATOR_TOKEN)
*/

const BUILDER_RULES = `
GLOBAL GAME REQUIREMENTS (NON-NEGOTIABLE):
- Output must include exactly 3 files: index.html, style.css, game.js.
- Game must be 9:16 portrait layout (1080x1920 safe) and responsive for mobile.
- Game must have a SETTINGS SCREEN first:
  - input for TikTok Live ID
  - Connect button (connects TikTok)
  - Settings controls relevant to the game (difficulty, round time, etc.)
  - Start Game button
- Start Game must only begin once TikTok connection is confirmed OR if the host chooses offline/test mode explicitly.
- The game screen must replace the settings screen after start.
- Always include clear on-screen directions for chat commands in a transparent overlay that does NOT block gameplay view.

TIKTOK CONNECTION (DO NOT REMOVE; must follow this pattern and error-handling style):
(Use exactly the same structure; adapt handlers for the new game)

function setupTikTokClient(liveId) {
    if (!liveId) { throw new Error("liveId is required"); }
    if (client && client.socket) { try { client.socket.close(); } catch (e) { console.warn("Error closing previous socket:", e); } }
    if (typeof TikTokClient === "undefined") { throw new Error("TikTokClient is not available. Check tiktok-client.js."); }
    client = new TikTokClient(liveId);
    if (typeof CHATTOK_CREATOR_TOKEN !== "undefined" && CHATTOK_CREATOR_TOKEN) { client.setAccessToken(CHATTOK_CREATOR_TOKEN); }

    client.on("connected", () => { console.log("Connected to TikTok hub."); });
    client.on("disconnected", (reason) => { console.log("Disconnected from TikTok hub:", reason); });
    client.on("error", (err) => { console.error("TikTok client error:", err); });

    client.on("chat", onChatMessage);
    client.on("gift", onGiftMessage);
    client.on("like", (data) => { /* optional */ });

    client.connect();
}

Also:
- Wrap chat/gift handlers in try/catch
- Never crash if message fields are missing
- Use profile pictures safely (cache images)
- Provide polished UI, SFX hooks, and clean code.
`.trim();

/* ===============================
   State
   =============================== */

let lastSpec = null;
let builtFiles = null;
let editsUsed = 0;

function setEditEnabled(enabled) {
  el("btnEdit").disabled = !enabled;
}

function downloadText(filename, text) {
  const blob = new Blob([text || ""], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2500);
}

function downloadAll3(files) {
  // Simple and reliable on GitHub Pages: trigger 3 downloads
  downloadText("index.html", files["index.html"] || "");
  setTimeout(() => downloadText("style.css", files["style.css"] || ""), 250);
  setTimeout(() => downloadText("game.js", files["game.js"] || ""), 500);
}

async function ping() {
  const cfg = configFromUI();
  saveConfig(cfg);

  setStatus(`Checking ${cfg.apiBase}${cfg.pingPath}...`, undefined);

  try {
    const data = await apiFetch(cfg.pingPath, null, "GET");
    setStatus(`OK • ${data?.name || "API"} • ${data?.time || "no time"}`, undefined);
  } catch (e) {
    setStatus(`Ping failed: ${e.message}`, undefined);
    alert(`Ping failed:\n${e.message}\n\nIf your ping route differs, change Ping Endpoint in the UI.`);
  }
}

async function buildSpec() {
  const prompt = getPrompt();
  if (!prompt) return alert("Enter a detailed prompt first.");

  const requestId = newRequestId();
  setReqId(requestId);
  setStatus(undefined, "Building spec...");

  const cfg = configFromUI();
  saveConfig(cfg);

  try {
    const payload = {
      requestId,
      prompt,
      theme: getTheme(),
      flags: getFlags(),
      builderRules: BUILDER_RULES,
    };

    const data = await apiFetch(cfg.specPath, payload, "POST");

    // Display what server used (critical to prove no stale prompt)
    showEchoPrompt(data?.echoPrompt || data?.prompt || prompt);

    lastSpec = data?.spec || data?.plan || data?.data || data;
    showJson("specOut", lastSpec);

    setStatus(undefined, "Spec ready.");
  } catch (e) {
    setStatus(undefined, `Spec error: ${e.message}`);
    alert(`Spec error:\n${e.message}\n\nTip: If your Render uses /api/plan, set Spec Endpoint to /api/plan.`);
  }
}

async function buildGame() {
  const prompt = getPrompt();
  if (!prompt) return alert("Enter a detailed prompt first.");

  const requestId = newRequestId();
  setReqId(requestId);
  setStatus(undefined, "Building game files...");

  const cfg = configFromUI();
  saveConfig(cfg);

  try {
    const payload = {
      requestId,
      prompt,
      theme: getTheme(),
      flags: getFlags(),
      builderRules: BUILDER_RULES,
      spec: lastSpec || null,
    };

    const data = await apiFetch(cfg.buildPath, payload, "POST");

    showEchoPrompt(data?.echoPrompt || data?.prompt || prompt);

    const files = data?.files || data?.output || data;
    if (!files || !files["index.html"] || !files["style.css"] || !files["game.js"]) {
      throw new Error("Build response missing files. Expected { files: { 'index.html','style.css','game.js' } }");
    }

    builtFiles = files;
    showJson("filesOut", builtFiles);

    editsUsed = 0;
    el("editCount").textContent = String(editsUsed);
    setEditEnabled(true);

    setStatus(undefined, "Build complete.");
  } catch (e) {
    setStatus(undefined, `Build error: ${e.message}`);
    alert(`Build error:\n${e.message}\n\nTip: Confirm Build Endpoint matches your Render route.`);
  }
}

async function applyEdit() {
  if (!builtFiles) return alert("Build a game first.");
  if (editsUsed >= 3) return alert("Edit limit reached (3).");

  const editPrompt = getEditPrompt();
  if (!editPrompt) return alert("Enter an edit request.");

  const requestId = newRequestId();
  setReqId(requestId);
  setStatus(undefined, "Applying edit...");

  const cfg = configFromUI();
  saveConfig(cfg);

  try {
    const fileInput = el("editImage");
    const file = fileInput?.files?.[0] || null;
    const imageDataUrl = file ? await readFileAsDataUrl(file) : null;

    const payload = {
      requestId,
      editPrompt,
      theme: getTheme(),
      flags: getFlags(),
      builderRules: BUILDER_RULES,
      files: builtFiles,
      imageDataUrl, // optional screenshot
    };

    const data = await apiFetch(cfg.editPath, payload, "POST");

    showEchoPrompt(data?.echoPrompt || data?.editPrompt || editPrompt);

    const files = data?.files || data?.output || data;
    if (!files || !files["index.html"] || !files["style.css"] || !files["game.js"]) {
      throw new Error("Edit response missing files. Expected { files: { 'index.html','style.css','game.js' } }");
    }

    builtFiles = files;
    showJson("filesOut", builtFiles);

    editsUsed++;
    el("editCount").textContent = String(editsUsed);
    setStatus(undefined, editsUsed >= 3 ? "Edit applied (limit reached)." : "Edit applied.");
  } catch (e) {
    setStatus(undefined, `Edit error: ${e.message}`);
    alert(`Edit error:\n${e.message}`);
  }
}

function wireDownloads() {
  el("dlHtml").addEventListener("click", () => {
    if (!builtFiles) return alert("Build a game first.");
    downloadText("index.html", builtFiles["index.html"]);
  });
  el("dlCss").addEventListener("click", () => {
    if (!builtFiles) return alert("Build a game first.");
    downloadText("style.css", builtFiles["style.css"]);
  });
  el("dlJs").addEventListener("click", () => {
    if (!builtFiles) return alert("Build a game first.");
    downloadText("game.js", builtFiles["game.js"]);
  });
  el("dlAll").addEventListener("click", () => {
    if (!builtFiles) return alert("Build a game first.");
    downloadAll3(builtFiles);
  });
}

function wireConfigSaveOnChange() {
  const ids = ["apiBase","pingPath","specPath","buildPath","editPath"];
  ids.forEach((id) => {
    el(id).addEventListener("change", () => {
      const cfg = configFromUI();
      saveConfig(cfg);
      setStatus("Saved config.", undefined);
      setTimeout(() => setStatus("Not checked", undefined), 1200);
    });
  });
}

function resetUI() {
  localStorage.removeItem(STORAGE_KEY);
  const cfg = loadConfig();
  pushConfigToUI(cfg);

  el("prompt").value = "";
  el("editPrompt").value = "";
  el("editImage").value = "";

  lastSpec = null;
  builtFiles = null;
  editsUsed = 0;

  showEchoPrompt("");
  showJson("specOut", null);
  showJson("filesOut", null);

  el("editCount").textContent = "0";
  setEditEnabled(false);

  setReqId("—");
  setStatus("Not checked", "Idle");

  renderThemePreview();
}

/* ===============================
   INIT
   =============================== */

(function init() {
  // Config
  const cfg = loadConfig();
  pushConfigToUI(cfg);

  // Colors
  syncColorPair("cPrimary", "tPrimary", "#ff0050");
  syncColorPair("cSecondary", "tSecondary", "#00f2ea");
  syncColorPair("cBg", "tBg", "#050b17");
  syncColorPair("cSurface", "tSurface", "#0b1632");
  syncColorPair("cText", "tText", "#ffffff");
  renderThemePreview();

  // Buttons
  el("btnPing").addEventListener("click", ping);
  el("btnSpec").addEventListener("click", buildSpec);
  el("btnBuild").addEventListener("click", buildGame);
  el("btnEdit").addEventListener("click", applyEdit);
  el("btnReset").addEventListener("click", resetUI);

  wireDownloads();
  wireConfigSaveOnChange();

  // Initial state
  setEditEnabled(false);
  setReqId("—");
  setStatus("Not checked", "Idle");
})();
