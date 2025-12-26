/* ChatTokApps Builder (Spec → HTML → CSS → game.js → Edit)
   Host: GitHub Pages
   API: Render (OpenAI key stays on Render)

   Key behavior:
   - Defaults are internal & auto-set (no user typing needed)
   - Advanced API settings are optional for debugging
   - Anti-caching enforced on every request:
     - requestId in body
     - fetch cache: "no-store"
     - ?ts=Date.now() query param
   - Step 3 builds ONE file at a time:
     - /api/build target=index.html
     - /api/build target=style.css (with contextFiles)
     - /api/build target=game.js (with contextFiles)
*/

const DEFAULTS = {
  apiBase: "https://chattok-builder-api.onrender.com",
  pingPath: "/api/ping",
  routesPath: "/api/routes",
  specPath: "/api/plan",
  buildPath: "/api/build",
  editPath: "/api/edit",
};

const STORAGE_KEY = "chattokapps_builder_config_v2";
const el = (id) => document.getElementById(id);

function safeJsonParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
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

function configFromUI() {
  return {
    apiBase: (el("apiBase").value || DEFAULTS.apiBase).trim().replace(/\/$/, ""),
    pingPath: (el("pingPath").value || DEFAULTS.pingPath).trim(),
    routesPath: (el("routesPath").value || DEFAULTS.routesPath).trim(),
    specPath: (el("specPath").value || DEFAULTS.specPath).trim(),
    buildPath: (el("buildPath").value || DEFAULTS.buildPath).trim(),
    editPath: (el("editPath").value || DEFAULTS.editPath).trim(),
  };
}

function pushConfigToUI(cfg) {
  el("apiBase").value = cfg.apiBase;
  el("pingPath").value = cfg.pingPath;
  el("routesPath").value = cfg.routesPath;
  el("specPath").value = cfg.specPath;
  el("buildPath").value = cfg.buildPath;
  el("editPath").value = cfg.editPath;
}

function loadConfig() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEY) || "", null);
  const cfg = { ...DEFAULTS, ...(saved || {}) };

  // Optional URL overrides (debug only)
  const qp = new URLSearchParams(location.search);
  if (qp.get("api")) cfg.apiBase = qp.get("api");
  if (qp.get("ping")) cfg.pingPath = qp.get("ping");
  if (qp.get("routes")) cfg.routesPath = qp.get("routes");
  if (qp.get("spec")) cfg.specPath = qp.get("spec");
  if (qp.get("build")) cfg.buildPath = qp.get("build");
  if (qp.get("edit")) cfg.editPath = qp.get("edit");

  cfg.apiBase = (cfg.apiBase || "").trim().replace(/\/$/, "");
  return cfg;
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function setReqId(v) {
  el("reqId").textContent = v;
}

function setStatus(api, build) {
  if (api !== undefined) el("apiStatus").textContent = api;
  if (build !== undefined) el("buildStatus").textContent = build;
}

function showWarn(msg) {
  const box = el("warnBox");
  if (!msg) {
    box.style.display = "none";
    box.textContent = "";
    return;
  }
  box.style.display = "block";
  box.textContent = msg;
}

function newRequestId() {
  return "req_" + crypto.randomUUID();
}

function getPrompt() {
  return (el("prompt").value || "").trim();
}

function getEditPrompt() {
  return (el("editPrompt").value || "").trim();
}

async function fileToDataUrl(file) {
  if (!file) return "";
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function apiFetch(path, bodyObj, method = "POST") {
  const cfg = configFromUI();
  const base = cfg.apiBase.replace(/\/$/, "");

  // Anti-cache query param
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

/* =========================================================
   BUILDER RULES (enforces your non-negotiables)
   ========================================================= */

const BUILDER_RULES = `
GLOBAL GAME REQUIREMENTS (NON-NEGOTIABLE):
- Output MUST be professional and must support ANY type of game (shooters, runners, racing, arena, overlays, etc).
- Output must include exactly 3 files: index.html, style.css, game.js.
- Game must be 9:16 portrait layout and responsive for mobile.
- Game must have TWO SCREENS:
  1) SETTINGS SCREEN first:
     - input for TikTok Live ID
     - Connect button (connects TikTok)
     - settings controls relevant to the game
     - Start Game button (GATED; only enabled after Connected OR explicit Offline/Test mode)
  2) GAME SCREEN replaces the settings screen after Start.
- Always include clear on-screen directions for chat commands in a transparent overlay that does NOT block gameplay view.
- DO NOT use external CSS frameworks/CDNs (no Tailwind CDN). Write real CSS.
- DO NOT reference external sound files. Use simple WebAudio synth beeps or embedded base64 sounds.
- Cache profile pictures in memory (Map) so repeated users don’t refetch.

CRITICAL TIKTOK DEPENDENCY RULE (MUST ALWAYS BE ENFORCED):
Every generated index.html MUST load scripts in this exact order before game.js:
1) google-protobuf
2) generic.js
3) unknownobjects.js
4) data_linkmic_messages.js
5) tiktok-client.js
6) game.js

TIKTOK MESSAGE FIELD MAPPING (MessagesClean.txt):
- Chat text: data.content
- Username: data.user.displayid OR data.user.nickname
- Profile pic: data.user.avatarthumb.urllistList[0]
- Gifts: data.gift.name, data.gift.id, data.gift.diamondcount, plus data.combocount / data.repeatcount if needed
- Handlers must be wrapped in try/catch and never crash if fields are missing.

IMPORTANT: CONNECTION PATTERN (DO NOT REPLACE):
- Create TikTokClient ONLY after clicking Connect
- Close previous socket if exists
- If CHATTOK_CREATOR_TOKEN exists, call client.setAccessToken(CHATTOK_CREATOR_TOKEN)
- Wire events: chat, gift, like, join, social, roomUserSeq, control

8. TIKTOK CONNECTION EXAMPLE (DO NOT REMOVE)
(Keep this structure and error handling style; adapt handlers for the new game)

// ===============================
// 8. TikTok client setup / connect
// ===============================

function setupTikTokClient(liveId) {
    if (!liveId) {
        throw new Error("liveId is required");
    }

    if (client && client.socket) {
        try {
            client.socket.close();
        } catch (e) {
            console.warn("Error closing previous socket:", e);
        }
    }

    if (typeof TikTokClient === "undefined") {
        throw new Error("TikTokClient is not available. Check tiktok-client.js.");
    }

    client = new TikTokClient(liveId);

    // ChatTok injects CHATTOK_CREATOR_TOKEN globally.
    if (typeof CHATTOK_CREATOR_TOKEN !== "undefined" && CHATTOK_CREATOR_TOKEN) {
        client.setAccessToken(CHATTOK_CREATOR_TOKEN);
    }

    client.on("connected", () => {
        console.log("Connected to TikTok hub.");
    });

    client.on("disconnected", (reason) => {
        console.log("Disconnected from TikTok hub:", reason);
    });

    client.on("error", (err) => {
        console.error("TikTok client error:", err);
    });

    client.on("chat", onChatMessage);
    client.on("gift", onGiftMessage);
    client.on("like", (data) => {});

    client.connect();
}
`.trim();

/* =========================================================
   Step state
   ========================================================= */

let step = 1;
let lastSpec = null;

let files = { html: "", css: "", js: "" };
let built = { html: false, css: false, js: false };

let editsUsed = 0;

// animated status text
let spinnerTimer = null;
function startSpinner(label) {
  stopSpinner();
  let dots = 0;
  spinnerTimer = setInterval(() => {
    dots = (dots + 1) % 4;
    setStatus(undefined, `${label}${".".repeat(dots)}${" ".repeat(3 - dots)}`);
  }, 350);
}
function stopSpinner() {
  if (spinnerTimer) clearInterval(spinnerTimer);
  spinnerTimer = null;
}

function setPill(id, on) {
  const p = el(id);
  if (!p) return;
  if (on) p.classList.remove("off");
  else p.classList.add("off");
}

function setStep(newStep) {
  step = newStep;

  el("pillStep1").textContent = newStep === 1 ? "Active" : "Done";
  el("pillStep2").textContent = newStep === 2 ? "Active" : (newStep > 2 ? "Done" : "Locked");
  el("pillStep3").textContent = newStep === 3 ? "Active" : (newStep > 3 ? "Done" : "Locked");
  el("pillStep4").textContent = newStep === 4 ? "Active" : (newStep > 4 ? "Ready" : "Locked");

  setPill("pillStep2", newStep >= 2);
  setPill("pillStep3", newStep >= 3);
  setPill("pillStep4", newStep >= 4);

  el("btnCopySpec").disabled = !lastSpec;
  el("btnDownloadSpec").disabled = !lastSpec;
  el("btnContinue").disabled = !lastSpec;

  // Step 3 enablement
  el("btnBuildHtml").disabled = !(newStep >= 3 && !!lastSpec);
  el("btnBuildCss").disabled = !(newStep >= 3 && built.html);
  el("btnBuildJs").disabled = !(newStep >= 3 && built.html && built.css);

  // Copy/download enablement
  el("btnCopyHtml").disabled = !files.html;
  el("btnCopyCss").disabled = !files.css;
  el("btnCopyJs").disabled = !files.js;

  el("btnDownloadHtml").disabled = !files.html;
  el("btnDownloadCss").disabled = !files.css;
  el("btnDownloadJs").disabled = !files.js;

  const previewReady = built.html && built.css && built.js;
  el("btnRefreshPreview").disabled = !previewReady;
  el("btnOpenPreview").disabled = !previewReady;

  const editUnlocked = newStep >= 4 && previewReady;
  setPill("pillEditReady", editUnlocked);
  el("btnEdit").disabled = !(editUnlocked && editsUsed < 3);

  // Build ready pill
  if (newStep >= 3) {
    el("pillBuildReady").classList.remove("off");
    el("pillBuildReady").textContent = "Ready";
  } else {
    el("pillBuildReady").classList.add("off");
    el("pillBuildReady").textContent = "Waiting";
  }
}

function showSpec(specObj) {
  el("specOut").textContent = specObj ? JSON.stringify(specObj, null, 2) : "";
}

function showFileOutputs() {
  el("htmlOut").textContent = files.html || "";
  el("cssOut").textContent = files.css || "";
  el("jsOut").textContent = files.js || "";
}

function showEcho(text) {
  el("echoPrompt").textContent = text || "";
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      ta.remove();
      return false;
    }
  }
}

function downloadText(filename, content) {
  const blob = new Blob([String(content || "")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 400);
}

/* =========================================================
   Live Preview (inline CSS/JS + TikTok stub)
   ========================================================= */

let previewUrl = null;

function escapeScript(s) {
  return String(s || "").replace(/<\/script>/gi, "<\\/script>");
}

function buildPreviewHtml(html, css, js) {
  const tiktokStub = `
<script>
(function(){
  if (typeof window.TikTokClient !== "undefined") return;
  class TikTokClient {
    constructor(liveId){ this.liveId = liveId; this.handlers = {}; this.socket = { close(){ } }; }
    setAccessToken(){ }
    on(evt, fn){ (this.handlers[evt] ||= []).push(fn); }
    emit(evt, data){ (this.handlers[evt]||[]).forEach(fn => { try{ fn(data); } catch(e){} }); }
    connect(){ setTimeout(() => this.emit("connected"), 250); }
  }
  window.TikTokClient = TikTokClient;
})();
</script>`.trim();

  let out = String(html || "");

  out = out.replace(/<link[^>]+href=["']style\.css["'][^>]*>/i, `<style>\n${css || ""}\n</style>`);
  out = out.replace(/<script[^>]+src=["']game\.js["'][^>]*>\s*<\/script>/i, `<script>\n${escapeScript(js || "")}\n</script>`);

  if (out.includes("</head>")) out = out.replace("</head>", `${tiktokStub}\n</head>`);
  else if (out.includes("<body")) out = out.replace(/<body[^>]*>/i, (m) => `${m}\n${tiktokStub}\n`);
  else out = `${tiktokStub}\n${out}`;

  return out;
}

function setPreview(html, css, js) {
  const combined = buildPreviewHtml(html, css, js);
  const blob = new Blob([combined], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = url;

  el("previewFrame").src = url;
}

function openPreviewTab() {
  if (!previewUrl) return;
  window.open(previewUrl, "_blank", "noopener,noreferrer");
}

/* =========================================================
   Response parsing helpers (robust to old/new API formats)
   ========================================================= */

function parseSpecResponse(data, fallbackPrompt) {
  const spec = data?.spec || data?.plan || data?.result?.spec;
  return {
    spec: spec || null,
    echo: data?.echoPrompt || data?.prompt || fallbackPrompt || "",
  };
}

function parseBuildFileResponse(data) {
  // New format: { fileName, content }
  if (typeof data?.content === "string" && typeof data?.fileName === "string") {
    return { fileName: data.fileName, content: data.content, echo: data?.echoPrompt || "" };
  }

  // Older format: { files: { "index.html": "...", "style.css": "...", "game.js": "..." } }
  const f = data?.files || data;
  if (f && typeof f === "object") {
    if (typeof f["index.html"] === "string") return { fileName: "index.html", content: f["index.html"], echo: data?.echoPrompt || "" };
    if (typeof f["style.css"] === "string") return { fileName: "style.css", content: f["style.css"], echo: data?.echoPrompt || "" };
    if (typeof f["game.js"] === "string") return { fileName: "game.js", content: f["game.js"], echo: data?.echoPrompt || "" };
  }

  throw new Error("Build response missing file content.");
}

/* =========================================================
   Actions
   ========================================================= */

async function ping() {
  showWarn("");
  const cfg = configFromUI();
  saveConfig(cfg);

  startSpinner("Pinging API");
  try {
    const data = await apiFetch(cfg.pingPath, null, "GET");
    stopSpinner();
    setStatus(`OK • ${data?.name || "API"} • ${data?.time || "no time"}`, "Idle");
  } catch (e) {
    stopSpinner();
    setStatus(`Ping failed: ${e.message}`, "Idle");
    showWarn(
      `Ping failed: ${e.message}\n\n` +
      `Check:\n` +
      `- Render is deployed\n` +
      `- CORS allowlist includes your GitHub Pages domain\n` +
      `- /api/ping exists`
    );
  }
}

async function loadRoutes() {
  showWarn("");
  const cfg = configFromUI();
  saveConfig(cfg);

  startSpinner("Loading routes");
  try {
    const data = await apiFetch(cfg.routesPath, null, "GET");
    stopSpinner();
    el("routesOut").textContent = JSON.stringify(data?.routes || data, null, 2);
    setStatus(el("apiStatus").textContent, "Routes loaded.");
    setTimeout(() => setStatus(undefined, "Idle"), 900);
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Routes error: ${e.message}`);
    showWarn(`Routes error: ${e.message}\n\nIf /api/routes is not available, ignore this (it’s optional).`);
  }
}

async function buildSpec() {
  showWarn("");
  const prompt = getPrompt();
  if (!prompt) return alert("Enter a detailed prompt first.");

  const requestId = newRequestId();
  setReqId(requestId);

  const cfg = configFromUI();
  saveConfig(cfg);

  startSpinner("Building spec");
  try {
    const payload = {
      requestId,
      prompt,
      theme: getTheme(),
      builderRules: BUILDER_RULES,
    };

    const data = await apiFetch(cfg.specPath, payload, "POST");
    stopSpinner();

    const parsed = parseSpecResponse(data, prompt);
    if (!parsed.spec) throw new Error("Spec response missing spec.");

    lastSpec = parsed.spec;
    showEcho(parsed.echo);
    showSpec(lastSpec);

    setStep(2);
    setStatus(el("apiStatus").textContent || "OK", "Spec ready. Review and Continue.");
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Spec error: ${e.message}`);
    showWarn(`Spec error: ${e.message}\n\nExpected endpoint: /api/plan`);
  }
}

function continueToBuild() {
  if (!lastSpec) return;
  setStep(3);
  setStatus(undefined, "Ready. Build HTML first.");
}

async function buildOne(target) {
  const prompt = getPrompt();
  if (!prompt) throw new Error("Missing prompt.");
  if (!lastSpec) throw new Error("Missing spec. Build spec first.");

  const requestId = newRequestId();
  setReqId(requestId);

  const cfg = configFromUI();
  saveConfig(cfg);

  const contextFiles = {};
  if (files.html) contextFiles["index.html"] = files.html;
  if (files.css) contextFiles["style.css"] = files.css;

  const payload = {
    requestId,
    target,
    prompt,
    theme: getTheme(),
    builderRules: BUILDER_RULES,
    spec: lastSpec,
    contextFiles,
  };

  const data = await apiFetch(cfg.buildPath, payload, "POST");
  const parsed = parseBuildFileResponse(data);
  showEcho(parsed.echo || data?.echoPrompt || prompt);

  return parsed;
}

async function buildHtml() {
  showWarn("");
  try {
    startSpinner("Building HTML");
    const r = await buildOne("index.html");
    stopSpinner();

    files.html = r.content;
    built.html = true;

    showFileOutputs();
    setStatus(undefined, "HTML ready. Build CSS next.");
    setStep(3);

    el("btnBuildCss").disabled = false;
    el("btnCopyHtml").disabled = !files.html;
    el("btnDownloadHtml").disabled = !files.html;

    el("htmlOut").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Build HTML error: ${e.message}`);
    showWarn(`Build HTML error: ${e.message}`);
  }
}

async function buildCss() {
  showWarn("");
  try {
    if (!built.html) return alert("Build HTML first.");

    startSpinner("Building CSS");
    const r = await buildOne("style.css");
    stopSpinner();

    files.css = r.content;
    built.css = true;

    showFileOutputs();
    setStatus(undefined, "CSS ready. Build game.js next.");

    el("btnBuildJs").disabled = false;
    el("btnCopyCss").disabled = !files.css;
    el("btnDownloadCss").disabled = !files.css;

    el("cssOut").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Build CSS error: ${e.message}`);
    showWarn(`Build CSS error: ${e.message}`);
  }
}

async function buildJs() {
  showWarn("");
  try {
    if (!built.html || !built.css) return alert("Build HTML and CSS first.");

    startSpinner("Building game.js");
    const r = await buildOne("game.js");
    stopSpinner();

    files.js = r.content;
    built.js = true;

    showFileOutputs();
    setPreview(files.html, files.css, files.js);

    setStatus(undefined, "game.js ready. Editing unlocked.");
    setStep(4);

    el("btnCopyJs").disabled = !files.js;
    el("btnDownloadJs").disabled = !files.js;

    el("jsOut").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Build game.js error: ${e.message}`);
    showWarn(`Build game.js error: ${e.message}`);
  }
}

async function applyEdit() {
  showWarn("");
  if (!(built.html && built.css && built.js)) return alert("Build HTML/CSS/game.js first.");
  if (editsUsed >= 3) return alert("Edit limit reached (3).");

  const editPrompt = getEditPrompt();
  if (!editPrompt) return alert("Enter an edit request.");

  const requestId = newRequestId();
  setReqId(requestId);

  const cfg = configFromUI();
  saveConfig(cfg);

  startSpinner("Applying edit");
  try {
    const file = el("editScreenshot").files && el("editScreenshot").files[0];
    const screenshotDataUrl = file ? await fileToDataUrl(file) : "";

    const payload = {
      requestId,
      editPrompt,
      theme: getTheme(),
      builderRules: BUILDER_RULES,
      screenshotDataUrl,
      files: {
        "index.html": files.html,
        "style.css": files.css,
        "game.js": files.js,
      },
    };

    const data = await apiFetch(cfg.editPath, payload, "POST");
    stopSpinner();

    const out = data?.files || data;
    if (typeof out?.["index.html"] !== "string" || typeof out?.["style.css"] !== "string" || typeof out?.["game.js"] !== "string") {
      throw new Error("Edit response missing files.");
    }

    files.html = out["index.html"];
    files.css = out["style.css"];
    files.js = out["game.js"];

    editsUsed++;
    el("editCount").textContent = String(editsUsed);

    showEcho(data?.echoPrompt || data?.editPrompt || editPrompt);
    showFileOutputs();
    setPreview(files.html, files.css, files.js);

    setStatus(undefined, editsUsed >= 3 ? "Edit applied (limit reached)." : "Edit applied.");
    el("btnEdit").disabled = editsUsed >= 3;
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Edit error: ${e.message}`);
    showWarn(`Edit error: ${e.message}`);
  }
}

/* =========================================================
   Copy / Download hooks
   ========================================================= */

function hookCopy(btnId, getTextFn) {
  el(btnId).addEventListener("click", async () => {
    const t = getTextFn();
    if (!t) return;
    const ok = await copyText(t);
    setStatus(undefined, ok ? "Copied to clipboard." : "Copy failed (browser blocked).");
    setTimeout(() => setStatus(undefined, "Idle"), 900);
  });
}

function hookDownload(btnId, filename, getTextFn) {
  el(btnId).addEventListener("click", () => {
    const t = getTextFn();
    if (!t) return;
    downloadText(filename, t);
  });
}

/* =========================================================
   Reset
   ========================================================= */

function resetAll() {
  localStorage.removeItem(STORAGE_KEY);

  const cfg = loadConfig();
  pushConfigToUI(cfg);
  saveConfig(cfg);

  el("prompt").value = "";
  el("editPrompt").value = "";
  el("echoPrompt").textContent = "";
  el("routesOut").textContent = "";
  el("editScreenshot").value = "";
  showWarn("");

  lastSpec = null;
  files = { html: "", css: "", js: "" };
  built = { html: false, css: false, js: false };

  editsUsed = 0;
  el("editCount").textContent = "0";

  el("specOut").textContent = "";
  el("htmlOut").textContent = "";
  el("cssOut").textContent = "";
  el("jsOut").textContent = "";

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  el("previewFrame").src = "about:blank";

  setReqId("—");
  setStatus("Not checked", "Idle");

  setStep(1);
  renderThemePreview();
}

/* =========================================================
   Init
   ========================================================= */

(function init() {
  const cfg = loadConfig();
  pushConfigToUI(cfg);
  saveConfig(cfg);

  // lock/unlock advanced fields
  const setApiReadonly = (readonly) => {
    ["apiBase","pingPath","routesPath","specPath","buildPath","editPath"].forEach((id) => {
      el(id).readOnly = readonly;
    });
  };
  setApiReadonly(true);

  el("unlockApi").addEventListener("change", () => {
    setApiReadonly(!el("unlockApi").checked);
  });

  ["apiBase","pingPath","routesPath","specPath","buildPath","editPath"].forEach((id) => {
    el(id).addEventListener("change", () => {
      const c = configFromUI();
      saveConfig(c);
      setStatus("Config saved.", undefined);
      setTimeout(() => setStatus("Not checked", undefined), 900);
    });
  });

  // colors
  syncColorPair("cPrimary", "tPrimary", "#ff0050");
  syncColorPair("cSecondary", "tSecondary", "#00f2ea");
  syncColorPair("cBg", "tBg", "#050b17");
  syncColorPair("cSurface", "tSurface", "#0b1632");
  syncColorPair("cText", "tText", "#ffffff");
  renderThemePreview();

  // buttons
  el("btnLoadRoutes").addEventListener("click", loadRoutes);
  el("btnPing").addEventListener("click", ping);
  el("btnReset").addEventListener("click", resetAll);

  el("btnSpec").addEventListener("click", buildSpec);
  el("btnContinue").addEventListener("click", continueToBuild);

  el("btnBuildHtml").addEventListener("click", buildHtml);
  el("btnBuildCss").addEventListener("click", buildCss);
  el("btnBuildJs").addEventListener("click", buildJs);

  el("btnEdit").addEventListener("click", applyEdit);

  el("btnRefreshPreview").addEventListener("click", () => {
    if (!(built.html && built.css && built.js)) return;
    setPreview(files.html, files.css, files.js);
  });
  el("btnOpenPreview").addEventListener("click", openPreviewTab);

  // copy hooks
  hookCopy("btnCopySpec", () => el("specOut").textContent);
  hookCopy("btnCopyHtml", () => files.html);
  hookCopy("btnCopyCss", () => files.css);
  hookCopy("btnCopyJs", () => files.js);

  // download hooks
  hookDownload("btnDownloadSpec", "spec.json", () => el("specOut").textContent);
  hookDownload("btnDownloadHtml", "index.html", () => files.html);
  hookDownload("btnDownloadCss", "style.css", () => files.css);
  hookDownload("btnDownloadJs", "game.js", () => files.js);

  // initial state
  setReqId("—");
  setStatus("Not checked", "Idle");
  setStep(1);

  // Auto-ping once on load (silent-ish)
  ping().catch(() => {});
})();
