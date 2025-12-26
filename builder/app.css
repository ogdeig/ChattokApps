/* ChatTokApps Builder (Spec → HTML → CSS → game.js → Edit)
   Host: GitHub Pages (static)
   API: Render (OpenAI key stays on Render)

   Key behavior (non-negotiable):
   - Step 2 builds Spec once (/api/plan)
   - Step 3 builds ONE file at a time (/api/build with target)
   - Step 4 supports up to 3 edits (/api/edit) with optional screenshot upload
   - Anti-caching on EVERY request:
       - requestId in body
       - fetch cache: "no-store"
       - ?ts=${Date.now()} query param
   - Always show server echoPrompt so we can verify latest prompt was used
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

function newRequestId() {
  return "req_" + (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(16).slice(2));
}

function showWarn(msg) {
  const box = el("warn");
  if (!msg) {
    box.classList.add("hidden");
    box.textContent = "";
    return;
  }
  box.classList.remove("hidden");
  box.textContent = String(msg);
}

function setReqId(v) { el("reqId").textContent = v || "—"; }
function setStatus(apiStatus, buildStatus) {
  if (apiStatus !== undefined) el("statusText").textContent = apiStatus;
  if (buildStatus !== undefined) el("buildStatus").textContent = buildStatus;
}

function configFromUI() {
  const base = (el("apiBase").value || DEFAULTS.apiBase).trim().replace(/\/$/, "");
  return {
    apiBase: base,
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
  el("apiLabel").textContent = cfg.apiBase;
}

function loadConfig() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEY) || "", null);
  const cfg = { ...DEFAULTS, ...(saved || {}) };

  // Optional URL overrides for debugging
  const qp = new URLSearchParams(location.search);
  if (qp.get("api")) cfg.apiBase = qp.get("api");
  if (qp.get("ping")) cfg.pingPath = qp.get("ping");
  if (qp.get("routes")) cfg.routesPath = qp.get("routes");
  if (qp.get("spec")) cfg.specPath = qp.get("spec");
  if (qp.get("build")) cfg.buildPath = qp.get("build");
  if (qp.get("edit")) cfg.editPath = qp.get("edit");

  cfg.apiBase = (cfg.apiBase || DEFAULTS.apiBase).trim().replace(/\/$/, "");
  return cfg;
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  el("apiLabel").textContent = cfg.apiBase;
}

/* =========================================================
   Theme
   ========================================================= */

function getTheme() {
  return {
    primary: normalizeHex(el("tPrimary").value, "#ff0050"),
    secondary: normalizeHex(el("tSecondary").value, "#00f2ea"),
    bg: normalizeHex(el("tBg").value, "#050b17"),
    surface: normalizeHex(el("tSurface").value, "#0b1632"),
    text: normalizeHex(el("tText").value, "#ffffff"),
  };
}

function applyThemeToCssVars() {
  const t = getTheme();
  document.documentElement.style.setProperty("--p", t.primary);
  document.documentElement.style.setProperty("--s", t.secondary);
  document.documentElement.style.setProperty("--bg", t.bg);
  document.documentElement.style.setProperty("--surface", t.surface);
  document.documentElement.style.setProperty("--text", t.text);
  renderThemeChips(t);
}

function renderThemeChips(t) {
  const root = el("themePreview");
  if (!root) return;
  root.innerHTML = "";

  const items = [
    ["Primary", t.primary],
    ["Secondary", t.secondary],
    ["Background", t.bg],
    ["Surface", t.surface],
    ["Text", t.text],
  ];

  for (const [label, value] of items) {
    const chip = document.createElement("div");
    chip.className = "chip";
    const dot = document.createElement("div");
    dot.className = "chipDot";
    dot.style.background = value;
    const txt = document.createElement("div");
    txt.textContent = `${label}: ${value}`;
    chip.appendChild(dot);
    chip.appendChild(txt);
    root.appendChild(chip);
  }
}

function syncColorPair(colorId, textId, fallback) {
  const c = el(colorId);
  const t = el(textId);

  const apply = (hex) => {
    const v = normalizeHex(hex, fallback);
    c.value = v;
    t.value = v;
    applyThemeToCssVars();
  };

  c.addEventListener("input", () => apply(c.value));
  t.addEventListener("input", () => apply(t.value));
  apply(c.value || t.value || fallback);
}

/* =========================================================
   Anti-cached fetch helper
   ========================================================= */

async function apiFetch(path, bodyObj, method = "POST") {
  const cfg = configFromUI();
  const base = cfg.apiBase.replace(/\/$/, "");

  const url = `${base}${path}${path.includes("?") ? "&" : "?"}ts=${Date.now()}`;

  const init = {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  };

  if (bodyObj && method !== "GET") init.body = JSON.stringify(bodyObj);

  const res = await fetch(url, init);
  const text = await res.text();

  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/* =========================================================
   Builder Rules (sent to server for enforcement)
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
- ALWAYS include a <canvas id="gameCanvas"> in the GAME SCREEN (prevents getContext null errors).
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

let currentStep = 1; // 1 prompt, 2 spec, 3 build, 4 edit
let lastSpec = null;

let files = { html: "", css: "", js: "" };
let built = { html: false, css: false, js: false };
let editsUsed = 0;

// activity spinner
let spinnerTimer = null;
function startSpinner(label) {
  stopSpinner();
  let dots = 0;
  spinnerTimer = setInterval(() => {
    dots = (dots + 1) % 4;
    setStatus(undefined, `${label}${".".repeat(dots)}${" ".repeat(3 - dots)}`);
  }, 300);
}
function stopSpinner() {
  if (spinnerTimer) clearInterval(spinnerTimer);
  spinnerTimer = null;
  setStatus(undefined, "Idle");
}

function setStep(n) {
  currentStep = n;

  const setPill = (id, on, text) => {
    const p = el(id);
    if (!p) return;
    if (on) p.classList.remove("off");
    else p.classList.add("off");
    if (text) p.textContent = text;
  };

  setPill("pillS1", true, n === 1 ? "Active" : "Done");
  setPill("pillS2", n >= 2, n === 2 ? "Active" : (n > 2 ? "Done" : "Locked"));
  setPill("pillS3", n >= 3, n === 3 ? "Active" : (n > 3 ? "Done" : "Locked"));
  setPill("pillS4", n >= 4, n === 4 ? "Active" : (n > 4 ? "Ready" : "Locked"));

  // Step 2 buttons
  el("btnCopySpec").disabled = !lastSpec;
  el("btnDlSpec").disabled = !lastSpec;
  el("btnContinue").disabled = !lastSpec;

  // Step 3 build buttons
  el("btnBuildHtml").disabled = !(n >= 3 && !!lastSpec);
  el("btnBuildCss").disabled = !(n >= 3 && built.html);
  el("btnBuildJs").disabled = !(n >= 3 && built.html && built.css);

  // file copy/download buttons
  el("btnCopyHtml").disabled = !files.html;
  el("btnDlHtml").disabled = !files.html;
  el("btnCopyCss").disabled = !files.css;
  el("btnDlCss").disabled = !files.css;
  el("btnCopyJs").disabled = !files.js;
  el("btnDlJs").disabled = !files.js;

  // preview
  const ready = built.html && built.css && built.js;
  el("btnRefreshPreview").disabled = !ready;
  el("btnOpenPreview").disabled = !ready;

  // edit
  el("btnEdit").disabled = !(ready && editsUsed < 3);
  el("editCount").textContent = String(editsUsed);
}

function showEcho(text) {
  el("echoPrompt").textContent = text ? String(text) : "—";
}

function showSpec(specObj) {
  el("specOut").textContent = specObj ? JSON.stringify(specObj, null, 2) : "";
}

function showFiles() {
  el("htmlOut").textContent = files.html || "";
  el("cssOut").textContent = files.css || "";
  el("jsOut").textContent = files.js || "";
}

/* =========================================================
   Clipboard + download
   ========================================================= */

async function copyText(text) {
  const t = String(text || "");
  if (!t) return false;

  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = t;
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
   Live Preview (inline CSS/JS + stubs)
   ========================================================= */

let previewUrl = null;

function escapeScript(s) {
  return String(s || "").replace(/<\/script>/gi, "<\\/script>");
}

function stripExternalDeps(html) {
  // Remove known dependency tags in preview (they won't exist locally)
  return String(html || "")
    .replace(/<script[^>]+src=["'][^"']*google-protobuf[^"']*["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<script[^>]+src=["'][^"']*generic\.js["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<script[^>]+src=["'][^"']*unknownobjects\.js["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<script[^>]+src=["'][^"']*data_linkmic_messages\.js["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<script[^>]+src=["'][^"']*tiktok-client\.js["'][^>]*>\s*<\/script>/gi, "");
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

  let out = stripExternalDeps(html);

  // inline css
  out = out.replace(/<link[^>]+href=["']style\.css["'][^>]*>/i, `<style>\n${css || ""}\n</style>`);

  // inline game.js
  out = out.replace(/<script[^>]+src=["']game\.js["'][^>]*>\s*<\/script>/i, `<script>\n${escapeScript(js || "")}\n</script>`);

  // inject tiktok stub
  if (out.includes("</head>")) out = out.replace("</head>", `${tiktokStub}\n</head>`);
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
   Response parsing (supports new/old formats)
   ========================================================= */

function parseSpecResponse(data, fallbackPrompt) {
  const spec = data?.spec || data?.plan || data?.result?.spec || null;
  return {
    spec,
    echo: data?.echoPrompt || data?.prompt || fallbackPrompt || "",
  };
}

function parseBuildFileResponse(data) {
  // Preferred: { fileName, content }
  if (typeof data?.fileName === "string" && typeof data?.content === "string") {
    return { fileName: data.fileName, content: data.content, echo: data?.echoPrompt || "" };
  }

  // Older: { files: { "index.html": "...", ... } }
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

function getPrompt() { return String(el("prompt").value || "").trim(); }
function getEditPrompt() { return String(el("editPrompt").value || "").trim(); }

async function fileToDataUrl(file) {
  if (!file) return "";
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function ping() {
  showWarn("");
  const cfg = configFromUI();
  saveConfig(cfg);

  startSpinner("Pinging API");
  try {
    const data = await apiFetch(cfg.pingPath, null, "GET");
    setStatus(`OK • ${data?.name || "API"} • ${data?.time || "no time"}`, undefined);
  } catch (e) {
    setStatus(`Ping failed: ${e.message}`, undefined);
    showWarn(
      `Ping failed: ${e.message}\n\n` +
      `Check: Render deployment, CORS allowlist, endpoint path.`
    );
  } finally {
    stopSpinner();
  }
}

async function loadRoutes() {
  showWarn("");
  const cfg = configFromUI();
  saveConfig(cfg);

  startSpinner("Loading routes");
  try {
    const data = await apiFetch(cfg.routesPath, null, "GET");
    el("routesOut").textContent = JSON.stringify(data?.routes || data, null, 2);
    setStatus(el("statusText").textContent, "Routes loaded.");
  } catch (e) {
    setStatus(el("statusText").textContent, `Routes error: ${e.message}`);
    el("routesOut").textContent = "(Routes not available)";
    showWarn(`Routes error: ${e.message}\n\nIf /api/routes is not available, ignore this (optional).`);
  } finally {
    stopSpinner();
  }
}

async function buildSpec() {
  showWarn("");

  const prompt = getPrompt();
  if (!prompt) {
    showWarn("Enter a detailed prompt first.");
    return;
  }

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
    const parsed = parseSpecResponse(data, prompt);

    if (!parsed.spec) throw new Error("Spec response missing spec.");

    lastSpec = parsed.spec;
    showEcho(parsed.echo);
    showSpec(lastSpec);

    setStep(2);
    setStatus(el("statusText").textContent || "OK", "Spec ready. Review and Continue.");
  } catch (e) {
    setStatus(el("statusText").textContent, `Spec error: ${e.message}`);
    showWarn(`Spec error: ${e.message}\n\nExpected endpoint: ${cfg.specPath}`);
  } finally {
    stopSpinner();
  }
}

function continueToBuild() {
  if (!lastSpec) return;
  setStep(3);
  setStatus(el("statusText").textContent, "Ready. Build HTML first.");
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
  if (files.js) contextFiles["game.js"] = files.js;

  startSpinner(`Building ${target}`);
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
    const r = await buildOne("index.html");
    files.html = r.content;
    built.html = true;

    showFiles();
    setStep(3);
    setStatus(el("statusText").textContent, "HTML ready. Build CSS next.");
    el("htmlOut").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    setStatus(el("statusText").textContent, `Build HTML error: ${e.message}`);
    showWarn(`Build HTML error: ${e.message}`);
  } finally {
    stopSpinner();
  }
}

async function buildCss() {
  showWarn("");
  if (!built.html) return showWarn("Build HTML first.");

  try {
    const r = await buildOne("style.css");
    files.css = r.content;
    built.css = true;

    showFiles();
    setStep(3);
    setStatus(el("statusText").textContent, "CSS ready. Build game.js next.");
    el("cssOut").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    setStatus(el("statusText").textContent, `Build CSS error: ${e.message}`);
    showWarn(`Build CSS error: ${e.message}`);
  } finally {
    stopSpinner();
  }
}

async function buildJs() {
  showWarn("");
  if (!built.html || !built.css) return showWarn("Build HTML and CSS first.");

  try {
    const r = await buildOne("game.js");
    files.js = r.content;
    built.js = true;

    showFiles();
    setPreview(files.html, files.css, files.js);

    setStep(4);
    setStatus(el("statusText").textContent, "game.js ready. Editing unlocked.");
    el("jsOut").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    setStatus(el("statusText").textContent, `Build game.js error: ${e.message}`);
    showWarn(`Build game.js error: ${e.message}`);
  } finally {
    stopSpinner();
  }
}

async function applyEdit() {
  showWarn("");
  if (!(built.html && built.css && built.js)) return showWarn("Build HTML/CSS/game.js first.");
  if (editsUsed >= 3) return showWarn("Edit limit reached (3).");

  const editPrompt = getEditPrompt();
  if (!editPrompt) return showWarn("Enter an edit request.");

  const requestId = newRequestId();
  setReqId(requestId);

  const cfg = configFromUI();
  saveConfig(cfg);

  startSpinner("Applying edit");
  try {
    const file = el("editShot").files && el("editShot").files[0];
    const screenshotDataUrl = file ? await fileToDataUrl(file) : "";

    const payload = {
      requestId,
      prompt: getPrompt(),
      editPrompt,
      theme: getTheme(),
      builderRules: BUILDER_RULES,
      screenshotDataUrl, // optional (server may ignore for now)
      files: {
        "index.html": files.html,
        "style.css": files.css,
        "game.js": files.js,
      },
    };

    const data = await apiFetch(cfg.editPath, payload, "POST");
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
    showFiles();
    setPreview(files.html, files.css, files.js);

    setStatus(el("statusText").textContent, editsUsed >= 3 ? "Edit applied (limit reached)." : "Edit applied.");
    setStep(4);
  } catch (e) {
    setStatus(el("statusText").textContent, `Edit error: ${e.message}`);
    showWarn(`Edit error: ${e.message}`);
  } finally {
    stopSpinner();
  }
}

/* =========================================================
   Screenshot preview (client-side only)
   ========================================================= */

function hookScreenshotPreview() {
  const input = el("editShot");
  const wrap = el("shotPreviewWrap");
  const img = el("shotPreview");

  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) {
      wrap.classList.add("hidden");
      img.removeAttribute("src");
      return;
    }
    const url = await fileToDataUrl(file);
    img.src = url;
    wrap.classList.remove("hidden");
  });
}

/* =========================================================
   Copy / Download hooks
   ========================================================= */

function hookCopy(btnId, getTextFn) {
  el(btnId).addEventListener("click", async () => {
    const t = getTextFn();
    if (!t) return;
    const ok = await copyText(t);
    setStatus(el("statusText").textContent, ok ? "Copied to clipboard." : "Copy failed (browser blocked).");
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
  el("echoPrompt").textContent = "—";
  el("routesOut").textContent = "(Click “Load Routes”)";
  el("editShot").value = "";
  el("shotPreviewWrap").classList.add("hidden");
  el("shotPreview").removeAttribute("src");

  lastSpec = null;
  files = { html: "", css: "", js: "" };
  built = { html: false, css: false, js: false };

  editsUsed = 0;
  el("editCount").textContent = "0";

  el("specOut").textContent = "(Spec will appear here)";
  el("htmlOut").textContent = "(HTML will appear here)";
  el("cssOut").textContent = "(CSS will appear here)";
  el("jsOut").textContent = "(game.js will appear here)";

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  el("previewFrame").src = "about:blank";

  setReqId("—");
  setStatus("Not checked", "Idle");
  showWarn("");
  applyThemeToCssVars();
  setStep(1);

  // collapse advanced section to avoid UI blocks
  el("advApi").open = false;
}

/* =========================================================
   Init
   ========================================================= */

(function init() {
  const cfg = loadConfig();
  pushConfigToUI(cfg);
  saveConfig(cfg);

  // Colors
  syncColorPair("cPrimary", "tPrimary", "#ff0050");
  syncColorPair("cSecondary", "tSecondary", "#00f2ea");
  syncColorPair("cBg", "tBg", "#050b17");
  syncColorPair("cSurface", "tSurface", "#0b1632");
  syncColorPair("cText", "tText", "#ffffff");
  applyThemeToCssVars();

  // Buttons
  el("btnPing").addEventListener("click", ping);
  el("btnLoadRoutes").addEventListener("click", loadRoutes);
  el("btnReset").addEventListener("click", resetAll);

  el("btnSaveApi").addEventListener("click", () => {
    const cfg2 = configFromUI();
    saveConfig(cfg2);
    pushConfigToUI(cfg2);
    setStatus(el("statusText").textContent, "API settings saved.");
    setTimeout(() => setStatus(undefined, "Idle"), 800);
  });

  el("btnSpec").addEventListener("click", buildSpec);
  el("btnContinue").addEventListener("click", continueToBuild);

  el("btnBuildHtml").addEventListener("click", buildHtml);
  el("btnBuildCss").addEventListener("click", buildCss);
  el("btnBuildJs").addEventListener("click", buildJs);

  el("btnRefreshPreview").addEventListener("click", () => {
    if (!(built.html && built.css && built.js)) return;
    setPreview(files.html, files.css, files.js);
  });
  el("btnOpenPreview").addEventListener("click", openPreviewTab);

  el("btnEdit").addEventListener("click", applyEdit);

  // Screenshot preview
  hookScreenshotPreview();

  // Copy buttons
  hookCopy("btnCopySpec", () => el("specOut").textContent);
  hookCopy("btnCopyHtml", () => files.html);
  hookCopy("btnCopyCss", () => files.css);
  hookCopy("btnCopyJs", () => files.js);

  // Download buttons
  hookDownload("btnDlSpec", "spec.json", () => el("specOut").textContent);
  hookDownload("btnDlHtml", "index.html", () => files.html);
  hookDownload("btnDlCss", "style.css", () => files.css);
  hookDownload("btnDlJs", "game.js", () => files.js);

  // Initial state
  setReqId("—");
  setStatus("Not checked", "Idle");
  showEcho("—");
  setStep(1);

  // Auto-ping on load
  ping().catch(() => {});
})();
