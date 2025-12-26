/* ChatTokApps Builder (Step Workflow + 3 file containers + copy + live preview)
   Host: GitHub Pages
   API: Render (OpenAI key stays on Render)
*/

const DEFAULTS = {
  apiBase: "https://chattok-builder-api.onrender.com",
  pingPath: "/api/ping",
  specPath: "/api/plan",   // IMPORTANT: your backend showed /api/plan exists
  buildPath: "/api/build",
  editPath: "/api/edit",
};

const STORAGE_KEY = "chattokapps_builder_stepper_v1";
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

function loadConfig() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEY) || "", null);
  const cfg = { ...DEFAULTS, ...(saved || {}) };

  // optional URL overrides
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

async function apiFetch(path, bodyObj, method = "POST") {
  const cfg = configFromUI();
  const base = cfg.apiBase.replace(/\/$/, "");

  // timestamp param defeats intermediary caching
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
   BUILDER RULES (includes your TikTok connection example)
   ========================================================= */

const BUILDER_RULES = `
GLOBAL GAME REQUIREMENTS (NON-NEGOTIABLE):
- Output must include exactly 3 files: index.html, style.css, game.js.
- Game must be 9:16 portrait layout (1080x1920 safe) and responsive for mobile.
- Game must have a SETTINGS SCREEN first:
  - input for TikTok Live ID
  - Connect button (connects TikTok)
  - Settings controls relevant to the game
  - Start Game button
- The game screen must replace the settings screen after start.
- Always include clear on-screen directions for chat commands in a transparent overlay that does NOT block gameplay view.
- DO NOT use external CSS frameworks/CDNs (no Tailwind CDN). Write real CSS.
- DO NOT reference external sound files. Use simple WebAudio synth beeps or embedded sounds.
- When using profile pictures: cache them in memory so repeated users don’t refetch.

TIKTOK CONNECTION EXAMPLE (DO NOT REMOVE)
(Keep this structure and error handling style; adapt handlers for the new game)

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
    client.on("like", (data) => {
        // optional
    });

    client.connect();
}

Also:
- Wrap chat/gift handlers in try/catch
- Never crash if message fields are missing
- Provide polished UI, SFX hooks, and clean code.
`.trim();

/* =========================================================
   Step state
   ========================================================= */

let step = 1; // 1 prompt, 2 spec, 3 files, 4 edit
let lastSpec = null;
let files = { html: "", css: "", js: "" };
let builtAllFiles = false;
let editsUsed = 0;

// status dots animation
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

  // pills
  el("pillStep1").textContent = newStep === 1 ? "Active" : "Done";
  el("pillStep2").textContent = newStep === 2 ? "Active" : (newStep > 2 ? "Done" : "Locked");
  el("pillStep3").textContent = newStep === 3 ? "Active" : (newStep > 3 ? "Done" : "Locked");
  el("pillStep4").textContent = newStep === 4 ? "Active" : (newStep > 4 ? "Ready" : "Locked");

  setPill("pillStep2", newStep >= 2);
  setPill("pillStep3", newStep >= 3);
  setPill("pillStep4", newStep >= 4);

  // controls
  el("btnContinue").disabled = !(newStep >= 2 && !!lastSpec);
  el("btnCopySpec").disabled = !(!!lastSpec);

  el("btnBuildHtml").disabled = !(newStep >= 3);
  el("btnBuildCss").disabled = !(newStep >= 3 && !!files.html); // must build html first
  el("btnBuildJs").disabled = !(newStep >= 3 && !!files.html && !!files.css); // must build css next

  el("btnCopyHtml").disabled = !files.html;
  el("btnCopyCss").disabled = !files.css;
  el("btnCopyJs").disabled = !files.js;

  const editUnlocked = newStep >= 4;
  setPill("pillEditReady", editUnlocked);
  el("btnEdit").disabled = !(editUnlocked && editsUsed < 3 && builtAllFiles);

  // Build ready pill
  if (newStep >= 3) {
    el("pillBuildReady").classList.remove("off");
    el("pillBuildReady").textContent = "Ready";
  } else {
    el("pillBuildReady").classList.add("off");
    el("pillBuildReady").textContent = "Waiting";
  }

  // preview buttons
  const previewReady = builtAllFiles;
  el("btnRefreshPreview").disabled = !previewReady;
  el("btnOpenPreview").disabled = !previewReady;
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
    // fallback
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

function validateBuildResponse(obj) {
  const f = obj?.files || obj;
  if (!f) return { ok: false, error: "No files found in response." };
  const html = f["index.html"];
  const css = f["style.css"];
  const js = f["game.js"];
  if (typeof html !== "string" || typeof css !== "string" || typeof js !== "string") {
    return { ok: false, error: "Response missing index.html/style.css/game.js strings." };
  }
  // Catch obvious contamination
  if (js.includes('"But the builder') || js.includes("But the builder should")) {
    return { ok: true, warn: "Warning: game.js looks contaminated with extra text at the end. Use Edit step to fix it." , files: { html, css, js } };
  }
  return { ok: true, files: { html, css, js } };
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
/* TikTokClient stub for preview (so games can run without tiktok-client.js) */
(function(){
  if (typeof window.TikTokClient !== "undefined") return;
  class TikTokClient {
    constructor(liveId){ this.liveId = liveId; this.handlers = {}; this.socket = { close(){ } }; }
    setAccessToken(){ }
    on(evt, fn){ (this.handlers[evt] ||= []).push(fn); }
    emit(evt, data){ (this.handlers[evt]||[]).forEach(fn => { try{ fn(data); } catch(e){} }); }
    connect(){
      setTimeout(() => this.emit("connected"), 300);
      // optional: emit fake chat to see effects
      // setInterval(() => this.emit("chat",{ text:"asteroid", user:{ username:"previewUser", profilePicture:"" } }), 4000);
    }
  }
  window.TikTokClient = TikTokClient;
})();
</script>`.trim();

  let out = String(html || "");

  // Inline CSS: replace <link rel="stylesheet" href="style.css">
  out = out.replace(/<link[^>]+href=["']style\.css["'][^>]*>/i, `<style>\n${css || ""}\n</style>`);

  // Inline JS: replace <script src="game.js"></script>
  out = out.replace(/<script[^>]+src=["']game\.js["'][^>]*>\s*<\/script>/i, `<script>\n${escapeScript(js || "")}\n</script>`);

  // Ensure stub is in <head> or early <body>
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
  el("btnRefreshPreview").disabled = false;
  el("btnOpenPreview").disabled = false;
}

function openPreviewTab() {
  if (!previewUrl) return;
  window.open(previewUrl, "_blank", "noopener,noreferrer");
}

/* =========================================================
   Actions
   ========================================================= */

async function ping() {
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
    showWarn(`Ping failed: ${e.message}\n\nThis is usually CORS or the ping route is different.\nTry /api/ping on your Render API in a browser.`);
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
      flags: getFlags(),
      builderRules: BUILDER_RULES,
    };

    const data = await apiFetch(cfg.specPath, payload, "POST");
    stopSpinner();

    const spec = data?.spec || data?.plan || data;
    lastSpec = spec;

    showEcho(data?.echoPrompt || data?.prompt || prompt);
    showSpec(spec);

    // unlock step 2
    setStep(2);
    setStatus(el("apiStatus").textContent || "OK", "Spec ready. Review and Continue.");
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Spec error: ${e.message}`);
    showWarn(`Spec error: ${e.message}\n\nYour backend routes (from what you shared) include /api/plan. Make sure Spec Endpoint is /api/plan.`);
  }
}

function continueToBuild() {
  if (!lastSpec) return;
  setStep(3);
  setStatus(undefined, "Ready to build files. Start with HTML.");
}

async function ensureBuiltAllFiles() {
  if (builtAllFiles) return;

  const prompt = getPrompt();
  if (!prompt) throw new Error("Missing prompt.");

  const requestId = newRequestId();
  setReqId(requestId);

  const cfg = configFromUI();
  saveConfig(cfg);

  startSpinner("Building files");
  const payload = {
    requestId,
    prompt,
    theme: getTheme(),
    flags: getFlags(),
    builderRules: BUILDER_RULES,
    spec: lastSpec || null,
  };

  const data = await apiFetch(cfg.buildPath, payload, "POST");
  stopSpinner();

  showEcho(data?.echoPrompt || data?.prompt || prompt);

  const checked = validateBuildResponse(data);
  if (!checked.ok) throw new Error(checked.error);
  if (checked.warn) showWarn(checked.warn);

  files.html = checked.files.html;
  files.css = checked.files.css;
  files.js = checked.files.js;

  builtAllFiles = true;
  showFileOutputs();

  // preview
  setPreview(files.html, files.css, files.js);
}

async function buildHtml() {
  showWarn("");
  try {
    startSpinner("Building HTML");
    await ensureBuiltAllFiles();
    stopSpinner();

    el("htmlOut").scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus(undefined, "HTML ready. Now build CSS.");
    setStep(3);

    // unlock CSS
    el("btnBuildCss").disabled = false;
    el("btnCopyHtml").disabled = !files.html;
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Build HTML error: ${e.message}`);
    showWarn(`Build error: ${e.message}\n\nMost common causes: wrong Build Endpoint, or CORS.`);
  }
}

async function buildCss() {
  showWarn("");
  try {
    // We already have CSS from buildAll; we just reveal step-wise
    if (!builtAllFiles) {
      startSpinner("Building CSS");
      await ensureBuiltAllFiles();
      stopSpinner();
    }
    el("cssOut").scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus(undefined, "CSS ready. Now build game.js.");

    // unlock JS
    el("btnBuildJs").disabled = false;
    el("btnCopyCss").disabled = !files.css;
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Build CSS error: ${e.message}`);
    showWarn(`Build error: ${e.message}`);
  }
}

async function buildJs() {
  showWarn("");
  try {
    if (!builtAllFiles) {
      startSpinner("Building game.js");
      await ensureBuiltAllFiles();
      stopSpinner();
    }
    el("jsOut").scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus(undefined, "game.js ready. Editing unlocked.");

    el("btnCopyJs").disabled = !files.js;

    // unlock edit step
    setStep(4);
    el("pillEditReady").classList.remove("off");
    el("btnEdit").disabled = false;
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Build JS error: ${e.message}`);
    showWarn(`Build error: ${e.message}`);
  }
}

async function applyEdit() {
  showWarn("");
  if (!builtAllFiles) return alert("Build HTML/CSS/game.js first.");
  if (editsUsed >= 3) return alert("Edit limit reached (3).");

  const editPrompt = getEditPrompt();
  if (!editPrompt) return alert("Enter an edit request.");

  const requestId = newRequestId();
  setReqId(requestId);

  const cfg = configFromUI();
  saveConfig(cfg);

  startSpinner("Applying edit");
  try {
    const payload = {
      requestId,
      editPrompt,
      theme: getTheme(),
      flags: getFlags(),
      builderRules: BUILDER_RULES,
      files: { "index.html": files.html, "style.css": files.css, "game.js": files.js }
    };

    const data = await apiFetch(cfg.editPath, payload, "POST");
    stopSpinner();

    const checked = validateBuildResponse(data);
    if (!checked.ok) throw new Error(checked.error);
    if (checked.warn) showWarn(checked.warn);

    files.html = checked.files.html;
    files.css = checked.files.css;
    files.js = checked.files.js;

    editsUsed++;
    el("editCount").textContent = String(editsUsed);

    showEcho(data?.echoPrompt || data?.editPrompt || editPrompt);
    showFileOutputs();
    setPreview(files.html, files.css, files.js);

    setStatus(undefined, editsUsed >= 3 ? "Edit applied (limit reached)." : "Edit applied.");

    // disable when limit reached
    el("btnEdit").disabled = editsUsed >= 3;
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Edit error: ${e.message}`);
    showWarn(`Edit error: ${e.message}`);
  }
}

/* =========================================================
   Copy buttons
   ========================================================= */

async function hookCopy(btnId, getTextFn) {
  el(btnId).addEventListener("click", async () => {
    const t = getTextFn();
    if (!t) return;
    const ok = await copyText(t);
    setStatus(undefined, ok ? "Copied to clipboard." : "Copy failed (browser blocked).");
    setTimeout(() => setStatus(undefined, "Idle"), 900);
  });
}

/* =========================================================
   Reset
   ========================================================= */

function resetAll() {
  localStorage.removeItem(STORAGE_KEY);

  const cfg = loadConfig();
  pushConfigToUI(cfg);

  el("prompt").value = "";
  el("editPrompt").value = "";
  el("echoPrompt").textContent = "";
  showWarn("");

  lastSpec = null;
  files = { html: "", css: "", js: "" };
  builtAllFiles = false;
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

  el("btnBuildCss").disabled = true;
  el("btnBuildJs").disabled = true;
  el("btnCopySpec").disabled = true;
  el("btnContinue").disabled = true;

  el("btnCopyHtml").disabled = true;
  el("btnCopyCss").disabled = true;
  el("btnCopyJs").disabled = true;

  el("btnRefreshPreview").disabled = true;
  el("btnOpenPreview").disabled = true;

  el("btnEdit").disabled = true;

  renderThemePreview();
}

/* =========================================================
   Init
   ========================================================= */

(function init() {
  // config
  const cfg = loadConfig();
  pushConfigToUI(cfg);
  saveConfig(cfg);

  // colors
  syncColorPair("cPrimary", "tPrimary", "#ff0050");
  syncColorPair("cSecondary", "tSecondary", "#00f2ea");
  syncColorPair("cBg", "tBg", "#050b17");
  syncColorPair("cSurface", "tSurface", "#0b1632");
  syncColorPair("cText", "tText", "#ffffff");
  renderThemePreview();

  // buttons
  el("btnPing").addEventListener("click", ping);
  el("btnReset").addEventListener("click", resetAll);

  el("btnSpec").addEventListener("click", buildSpec);
  el("btnContinue").addEventListener("click", continueToBuild);

  el("btnBuildHtml").addEventListener("click", buildHtml);
  el("btnBuildCss").addEventListener("click", buildCss);
  el("btnBuildJs").addEventListener("click", buildJs);

  el("btnEdit").addEventListener("click", applyEdit);

  el("btnRefreshPreview").addEventListener("click", () => {
    if (!builtAllFiles) return;
    setPreview(files.html, files.css, files.js);
  });
  el("btnOpenPreview").addEventListener("click", openPreviewTab);

  // copy hooks
  hookCopy("btnCopySpec", () => el("specOut").textContent);
  hookCopy("btnCopyHtml", () => files.html);
  hookCopy("btnCopyCss", () => files.css);
  hookCopy("btnCopyJs", () => files.js);

  // enable/disable when config changes
  ["apiBase","pingPath","specPath","buildPath","editPath"].forEach((id) => {
    el(id).addEventListener("change", () => {
      const c = configFromUI();
      saveConfig(c);
      setStatus("Config saved.", undefined);
      setTimeout(() => setStatus("Not checked", undefined), 900);
    });
  });

  // initial step lock
  setReqId("—");
  setStatus("Not checked", "Idle");
  setStep(1);

  // Step2/3 locks initially
  el("btnContinue").disabled = true;
  el("btnCopySpec").disabled = true;

  el("btnBuildHtml").disabled = true; // enabled only after spec exists + continue
  el("btnBuildCss").disabled = true;
  el("btnBuildJs").disabled = true;

  el("btnEdit").disabled = true;
  el("btnRefreshPreview").disabled = true;
  el("btnOpenPreview").disabled = true;

  // IMPORTANT: Step progression wiring
  // When spec is ready, Step 2 becomes active and Continue enables Build buttons.
  // We enable Build HTML after spec is created.
  const origSetStep = setStep;
  setStep = (s) => {
    origSetStep(s);
    // enable Build HTML once spec exists and user is at step 3
    if (s >= 3) el("btnBuildHtml").disabled = false;
  };

  // apply initial
  origSetStep(1);
})();
