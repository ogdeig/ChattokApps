/* ChatTokApps Builder (Static GitHub Pages)
   Workflow:
   Step 2: Build Spec
   Step 3: Build files one-at-a-time (HTML -> CSS -> game.js) using Spec
   Step 4: Up to 3 edits + optional screenshot upload

   Hard rules enforced:
   - Every request includes requestId + ?ts + cache:no-store
   - Show echoPrompt from server
*/

const DEFAULTS = {
  apiBase: "https://chattok-builder-api.onrender.com",
  pingPath: "/api/ping",
  routesPath: "/api/routes",
  specPath: "/api/plan",
  buildPath: "/api/build",
  editPath: "/api/edit",
};

const STORAGE_KEY = "chattokapps_builder_v2";

const el = (id) => document.getElementById(id);

function safeJsonParse(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }

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
  document.documentElement.style.setProperty("--surface", t.surface);

  el("chipPrimary").style.background = t.primary;
  el("chipSecondary").style.background = t.secondary;
  el("chipSurface").style.background = t.surface;
}

function syncColorPair(colorId, textId, fallback) {
  const c = el(colorId);
  const t = el(textId);

  const applyFromText = () => {
    const v = normalizeHex(t.value, fallback);
    t.value = v;
    c.value = v;
    renderThemePreview();
  };

  const applyFromColor = () => {
    t.value = c.value;
    renderThemePreview();
  };

  c.addEventListener("input", applyFromColor);
  t.addEventListener("change", applyFromText);
  t.addEventListener("input", () => {
    if (/^#[0-9a-fA-F]{0,6}$/.test(t.value.trim())) return;
    applyFromText();
  });
}

function loadConfig() {
  const saved = safeJsonParse(localStorage.getItem(STORAGE_KEY), {});
  return {
    apiBase: saved.apiBase || DEFAULTS.apiBase,
    pingPath: saved.pingPath || DEFAULTS.pingPath,
    routesPath: saved.routesPath || DEFAULTS.routesPath,
    specPath: saved.specPath || DEFAULTS.specPath,
    buildPath: saved.buildPath || DEFAULTS.buildPath,
    editPath: saved.editPath || DEFAULTS.editPath,
  };
}

function saveConfig(cfg) { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }

function pushConfigToUI(cfg) {
  el("apiBase").value = cfg.apiBase;
  el("pingPath").value = cfg.pingPath;
  el("routesPath").value = cfg.routesPath;
  el("specPath").value = cfg.specPath;
  el("buildPath").value = cfg.buildPath;
  el("editPath").value = cfg.editPath;
}

function configFromUI() {
  return {
    apiBase: String(el("apiBase").value || "").trim(),
    pingPath: String(el("pingPath").value || "").trim(),
    routesPath: String(el("routesPath").value || "").trim(),
    specPath: String(el("specPath").value || "").trim(),
    buildPath: String(el("buildPath").value || "").trim(),
    editPath: String(el("editPath").value || "").trim(),
  };
}

function newRequestId() {
  return `ctb_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function setReqId(v) { el("reqId").textContent = v || "—"; }

function setStatus(apiStatus, buildStatus) {
  if (apiStatus !== undefined) el("apiStatus").textContent = apiStatus;
  if (buildStatus !== undefined) el("buildStatus").textContent = buildStatus;
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
    try { document.execCommand("copy"); ta.remove(); return true; } catch { ta.remove(); return false; }
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text || ""], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

/* =========================================================
   BUILDER RULES (sent to API for guaranteed compliance)
   ========================================================= */

const BUILDER_RULES = `
HARD CONSTRAINTS (ChatTokGaming):
- Generate exactly THREE separate files: index.html, style.css, game.js
- Game MUST be 9:16 portrait with TWO screens:
  (1) Settings screen: Live ID input, Connect, settings controls, Start button
  (2) Game screen: replaces settings screen after Start
- Start Game MUST be gated: disabled until TikTok connection is confirmed
  (unless an explicit Offline/Test mode toggle exists)
- Use the existing TikTok connection method via tiktok-client.js (DO NOT replace it)

CRITICAL DEPENDENCY RULE (must enforce in index.html):
Scripts MUST be loaded in this exact order before game.js:
1) google-protobuf
2) generic.js
3) unknownobjects.js
4) data_linkmic_messages.js
5) tiktok-client.js
6) game.js

Use this exact pattern (recommended):
<script src="https://cdn.jsdelivr.net/npm/google-protobuf@3.21.2/google-protobuf.js"></script>
<script src="generic.js"></script>
<script src="unknownobjects.js"></script>
<script src="unknownobjects.js"></script>  (NO - do not duplicate)
<script src="data_linkmic_messages.js"></script>
<script src="tiktok-client.js"></script>
<script src="game.js"></script>

TikTok Message Field Mapping (MessagesClean):
- Chat text: data.content
- Username: data.user.displayid OR data.user.nickname
- Profile pic: data.user.avatarthumb.urllistList[0]
- Gifts: data.gift.name, data.gift.id, data.gift.diamondcount, data.combocount / data.repeatcount

Reliability rules (game.js):
- Wrap ALL handlers in try/catch. Never crash on missing fields.
- Create TikTokClient ONLY after clicking Connect.
- Close previous socket if exists.
- If CHATTOK_CREATOR_TOKEN exists, call client.setAccessToken(CHATTOK_CREATOR_TOKEN)
- Wire events: chat, gift, like, join, social, roomUserSeq, control

NO Tailwind CDN. Use hand-written CSS. Add simple copyright-free SFX (WebAudio beeps ok).
`.trim();

/* =========================================================
   API fetch (anti-caching enforced)
   ========================================================= */

async function apiFetch(path, body = null, method = "POST") {
  const cfg = configFromUI();
  const base = (cfg.apiBase || "").replace(/\/+$/, "");
  const p = String(path || "").trim().startsWith("/") ? String(path || "").trim() : `/${String(path || "").trim()}`;

  const ts = Date.now();
  const url = `${base}${p}${p.includes("?") ? "&" : "?"}ts=${ts}`;

  const requestId = (body && body.requestId) ? body.requestId : newRequestId();
  setReqId(requestId);

  const headers = {
    "Accept": "application/json",
    "Cache-Control": "no-store",
    "Pragma": "no-cache",
    "X-Request-Id": requestId,
    "X-ChatTok-Builder": "true",
  };

  const init = {
    method,
    headers,
    cache: "no-store",
  };

  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify({ ...(body || {}), requestId });
  }

  const resp = await fetch(url, init);
  const txt = await resp.text();

  let data;
  try { data = JSON.parse(txt); }
  catch {
    throw new Error(`API returned non-JSON (${resp.status}). First 200 chars:\n${txt.slice(0, 200)}`);
  }

  if (!resp.ok || data?.ok === false) {
    throw new Error(data?.error || `Request failed (${resp.status})`);
  }

  return data;
}

/* =========================================================
   Step state
   ========================================================= */

let step = 1;
let lastSpec = null;
let lastPrompt = "";
let files = { html: "", css: "", js: "" };
let builtAllFiles = false;
let editsUsed = 0;

let editScreenshotDataUrl = ""; // optional

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
  el("btnContinue").disabled = !lastSpec;

  el("btnBuildHtml").disabled = !(newStep >= 3 && !!lastSpec);
  el("btnBuildCss").disabled = !(newStep >= 3 && !!lastSpec && !!files.html);
  el("btnBuildJs").disabled = !(newStep >= 3 && !!lastSpec && !!files.html && !!files.css);

  el("btnCopyHtml").disabled = !files.html;
  el("btnCopyCss").disabled = !files.css;
  el("btnCopyJs").disabled = !files.js;

  el("btnDownloadHtml").disabled = !files.html;
  el("btnDownloadCss").disabled = !files.css;
  el("btnDownloadJs").disabled = !files.js;

  if (newStep >= 3) {
    el("pillBuildReady").classList.remove("off");
    el("pillBuildReady").textContent = "Ready";
  } else {
    el("pillBuildReady").classList.add("off");
    el("pillBuildReady").textContent = "Waiting";
  }

  const editUnlocked = (newStep >= 4) && builtAllFiles;
  setPill("pillEditReady", editUnlocked);
  el("btnEdit").disabled = !(editUnlocked && editsUsed < 3);

  el("btnRefreshPreview").disabled = !builtAllFiles;
  el("btnOpenPreview").disabled = !builtAllFiles;
}

function showSpec(specObj) {
  el("specOut").textContent = specObj ? JSON.stringify(specObj, null, 2) : "";
}

function showFileOutputs() {
  el("htmlOut").textContent = files.html || "";
  el("cssOut").textContent = files.css || "";
  el("jsOut").textContent = files.js || "";
}

function validateSpecResponse(data) {
  const spec = data?.spec || data?.plan || data?.json?.spec;
  if (!spec || typeof spec !== "object") return { ok: false, error: "Spec missing in response." };
  return { ok: true, spec };
}

function validateSingleFileResponse(data, expectedName) {
  // New format: { content, fileName }
  if (typeof data?.content === "string" && data?.fileName === expectedName) {
    return { ok: true, content: data.content };
  }
  // Alternate format: { files: { "index.html": "..." } }
  const f = data?.files || data;
  const content = f?.[expectedName];
  if (typeof content === "string") return { ok: true, content };
  return { ok: false, error: `Response missing ${expectedName}.` };
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
/* TikTokClient stub for preview (games can run without tiktok-client.js) */
(function(){
  if (typeof window.TikTokClient !== "undefined") return;
  class TikTokClient {
    constructor(liveId){ this.liveId = liveId; this.handlers = {}; this.socket = { close(){ } }; }
    setAccessToken(){ }
    on(evt, fn){ (this.handlers[evt] ||= []).push(fn); }
    emit(evt, data){ (this.handlers[evt]||[]).forEach(fn => { try{ fn(data); } catch(e){} }); }
    connect(){ setTimeout(() => this.emit("connected"), 300); }
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

function getPrompt() { return String(el("prompt").value || "").trim(); }
function getEditPrompt() { return String(el("editPrompt").value || "").trim(); }

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
    showWarn(`Ping failed: ${e.message}\n\nUsually CORS or wrong endpoint.`);
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

    const routes = Array.isArray(data?.routes) ? data.routes : [];
    const paths = new Set(routes.map(r => r.path));

    // Best-effort auto-fill if present
    if (paths.has("/api/ping")) el("pingPath").value = "/api/ping";
    if (paths.has("/api/routes")) el("routesPath").value = "/api/routes";
    if (paths.has("/api/plan")) el("specPath").value = "/api/plan";
    else if (paths.has("/api/spec")) el("specPath").value = "/api/spec";
    if (paths.has("/api/build")) el("buildPath").value = "/api/build";
    if (paths.has("/api/edit")) el("editPath").value = "/api/edit";

    saveConfig(configFromUI());
    setStatus("Routes loaded.", "Idle");
  } catch (e) {
    stopSpinner();
    setStatus(`Routes failed: ${e.message}`, "Idle");
    showWarn(`Routes failed: ${e.message}\n\nIf /api/routes doesn't exist, just set endpoints manually.`);
  }
}

async function buildSpec() {
  showWarn("");
  const prompt = getPrompt();
  if (!prompt) return alert("Enter a detailed prompt first.");

  lastPrompt = prompt;

  startSpinner("Building spec");
  try {
    const payload = {
      prompt,
      theme: getTheme(),
      builderRules: BUILDER_RULES,
    };

    const data = await apiFetch(configFromUI().specPath, payload, "POST");
    stopSpinner();

    showEcho(data?.echoPrompt || prompt);

    const checked = validateSpecResponse(data);
    if (!checked.ok) throw new Error(checked.error);

    lastSpec = checked.spec;
    showSpec(lastSpec);

    // Unlock Step 2 -> allow continue
    setStep(2);
    el("btnCopySpec").disabled = false;
    el("btnContinue").disabled = false;

    setStatus(undefined, "Spec ready. Review then Continue.");
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Spec error: ${e.message}`);
    showWarn(`Spec error: ${e.message}`);
  }
}

function continueToBuild() {
  if (!lastSpec) return;
  setStep(3);
  setStatus(undefined, "Ready to build. Start with HTML.");
}

async function buildOneFile(fileName) {
  if (!lastSpec) throw new Error("Spec is missing. Build Spec first.");
  if (!lastPrompt) throw new Error("Prompt is missing. Enter prompt and Build Spec first.");

  const payload = {
    prompt: lastPrompt,
    theme: getTheme(),
    spec: lastSpec,
    builderRules: BUILDER_RULES,
    target: fileName, // "index.html" | "style.css" | "game.js"
    contextFiles: {
      "index.html": files.html || "",
      "style.css": files.css || "",
      "game.js": files.js || "",
    },
  };

  const data = await apiFetch(configFromUI().buildPath, payload, "POST");
  showEcho(data?.echoPrompt || lastPrompt);

  const checked = validateSingleFileResponse(data, fileName);
  if (!checked.ok) throw new Error(checked.error);

  return checked.content;
}

async function buildHtml() {
  showWarn("");
  startSpinner("Building HTML");
  try {
    const html = await buildOneFile("index.html");
    files.html = html;

    showFileOutputs();
    setStep(3);

    el("btnCopyHtml").disabled = false;
    el("btnDownloadHtml").disabled = false;
    el("btnBuildCss").disabled = false;

    setStatus(undefined, "HTML ready. Now build CSS.");
    el("htmlOut").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    setStatus(undefined, `Build HTML error: ${e.message}`);
    showWarn(`Build HTML error: ${e.message}`);
  } finally {
    stopSpinner();
  }
}

async function buildCss() {
  showWarn("");
  if (!files.html) return alert("Build HTML first.");
  startSpinner("Building CSS");
  try {
    const css = await buildOneFile("style.css");
    files.css = css;

    showFileOutputs();
    setStep(3);

    el("btnCopyCss").disabled = false;
    el("btnDownloadCss").disabled = false;
    el("btnBuildJs").disabled = false;

    setStatus(undefined, "CSS ready. Now build game.js.");
    el("cssOut").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    setStatus(undefined, `Build CSS error: ${e.message}`);
    showWarn(`Build CSS error: ${e.message}`);
  } finally {
    stopSpinner();
  }
}

async function buildJs() {
  showWarn("");
  if (!files.html || !files.css) return alert("Build HTML and CSS first.");
  startSpinner("Building game.js");
  try {
    const js = await buildOneFile("game.js");
    files.js = js;

    builtAllFiles = true;
    showFileOutputs();
    setPreview(files.html, files.css, files.js);

    el("btnCopyJs").disabled = false;
    el("btnDownloadJs").disabled = false;

    setStep(4);
    setStatus(undefined, "game.js ready. Edit unlocked (3 max).");
    el("jsOut").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    setStatus(undefined, `Build game.js error: ${e.message}`);
    showWarn(`Build game.js error: ${e.message}`);
  } finally {
    stopSpinner();
  }
}

async function applyEdit() {
  showWarn("");
  if (!builtAllFiles) return alert("Build HTML/CSS/game.js first.");
  if (editsUsed >= 3) return alert("Edit limit reached (3).");

  const editPrompt = getEditPrompt();
  if (!editPrompt) return alert("Enter an edit request.");

  startSpinner("Applying edit");
  try {
    const payload = {
      editPrompt,
      theme: getTheme(),
      builderRules: BUILDER_RULES,
      files: { "index.html": files.html, "style.css": files.css, "game.js": files.js },
      screenshotDataUrl: editScreenshotDataUrl || "",
    };

    const data = await apiFetch(configFromUI().editPath, payload, "POST");
    stopSpinner();

    showEcho(data?.echoPrompt || editPrompt);

    const updated = data?.files;
    if (!updated || typeof updated["index.html"] !== "string" || typeof updated["style.css"] !== "string" || typeof updated["game.js"] !== "string") {
      throw new Error("Edit response missing files.");
    }

    files.html = updated["index.html"];
    files.css = updated["style.css"];
    files.js = updated["game.js"];

    editsUsed++;
    el("editCount").textContent = String(editsUsed);

    showFileOutputs();
    setPreview(files.html, files.css, files.js);

    setStatus(undefined, editsUsed >= 3 ? "Edit applied (limit reached)." : "Edit applied.");
    el("btnEdit").disabled = editsUsed >= 3;
  } catch (e) {
    stopSpinner();
    setStatus(undefined, `Edit error: ${e.message}`);
    showWarn(`Edit error: ${e.message}`);
  } finally {
    stopSpinner();
  }
}

/* =========================================================
   Screenshot upload handling
   ========================================================= */

function wireScreenshotUpload() {
  const input = el("editShot");
  input.addEventListener("change", async () => {
    editScreenshotDataUrl = "";
    el("shotPreviewWrap").style.display = "none";

    const file = input.files && input.files[0];
    if (!file) return;

    // Soft guard: huge images cause huge base64.
    if (file.size > 2.5 * 1024 * 1024) {
      alert("That screenshot is large. Please use a smaller image if possible (≤ 2.5MB).");
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(new Error("Failed reading screenshot."));
      r.readAsDataURL(file);
    });

    editScreenshotDataUrl = dataUrl;

    el("shotPreview").src = dataUrl;
    el("shotPreviewWrap").style.display = "block";
  });
}

/* =========================================================
   Copy/Download hooks
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

function hookDownload(btnId, fileName, getTextFn) {
  el(btnId).addEventListener("click", () => {
    const t = getTextFn();
    if (!t) return;
    downloadText(fileName, t);
    setStatus(undefined, `Downloaded ${fileName}.`);
    setTimeout(() => setStatus(undefined, "Idle"), 900);
  });
}

/* =========================================================
   Reset
   ========================================================= */

function resetAll() {
  // keep endpoints/colors saved, but reset state
  const cfg = loadConfig();
  pushConfigToUI(cfg);

  el("prompt").value = "";
  el("editPrompt").value = "";
  el("echoPrompt").textContent = "";
  el("specOut").textContent = "";
  el("htmlOut").textContent = "";
  el("cssOut").textContent = "";
  el("jsOut").textContent = "";

  el("editShot").value = "";
  el("shotPreviewWrap").style.display = "none";
  el("shotPreview").src = "";
  editScreenshotDataUrl = "";

  showWarn("");

  lastSpec = null;
  lastPrompt = "";
  files = { html: "", css: "", js: "" };
  builtAllFiles = false;
  editsUsed = 0;
  el("editCount").textContent = "0";

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

  syncColorPair("cPrimary", "tPrimary", "#ff0050");
  syncColorPair("cSecondary", "tSecondary", "#00f2ea");
  syncColorPair("cBg", "tBg", "#050b17");
  syncColorPair("cSurface", "tSurface", "#0b1632");
  syncColorPair("cText", "tText", "#ffffff");
  renderThemePreview();

  el("btnPing").addEventListener("click", ping);
  el("btnRoutes").addEventListener("click", loadRoutes);
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

  wireScreenshotUpload();

  hookCopy("btnCopySpec", () => el("specOut").textContent);
  hookCopy("btnCopyHtml", () => files.html);
  hookCopy("btnCopyCss", () => files.css);
  hookCopy("btnCopyJs", () => files.js);

  hookDownload("btnDownloadHtml", "index.html", () => files.html);
  hookDownload("btnDownloadCss", "style.css", () => files.css);
  hookDownload("btnDownloadJs", "game.js", () => files.js);

  ["apiBase","pingPath","routesPath","specPath","buildPath","editPath"].forEach((id) => {
    el(id).addEventListener("change", () => {
      saveConfig(configFromUI());
      setStatus("Config saved.", undefined);
      setTimeout(() => setStatus("Not checked", undefined), 900);
    });
  });

  setReqId("—");
  setStatus("Not checked", "Idle");
  setStep(1);
})();
