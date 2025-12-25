// app.js — ChatTok Builder UI (Clean)
// Default backend: Render API, unless overridden by user input or host injection

const DEFAULT_API_BASE = "https://chattok-builder-api.onrender.com";

const el = (id) => document.getElementById(id);

function normalizeHex(v, fallback) {
  if (!v) return fallback;
  const s = String(v).trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return fallback;
}

function getApiBase() {
  // 1) Host site can inject a base, if desired:
  // window.__CHATTOK_BUILDER_API__ = "https://..."
  const injected = window.__CHATTOK_BUILDER_API__;
  if (typeof injected === "string" && injected.trim()) return injected.trim().replace(/\/$/, "");

  // 2) User input from UI
  const ui = el("apiBase")?.value?.trim();
  if (ui) return ui.replace(/\/$/, "");

  // 3) Persisted value
  const saved = localStorage.getItem("builder_api_base");
  if (saved) return saved.replace(/\/$/, "");

  // 4) Default to Render
  return DEFAULT_API_BASE;
}

function setApiBaseUI(value) {
  if (!el("apiBase")) return;
  el("apiBase").value = value;
  localStorage.setItem("builder_api_base", value);
}

function newRequestId() {
  // Always generate a fresh requestId to prevent accidental caching/stale prompts.
  return "req_" + crypto.randomUUID();
}

async function apiFetch(path, opts = {}) {
  const base = getApiBase();
  const url = base.replace(/\/$/, "") + path;

  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    cache: "no-store", // important: avoid browser caching
  });

  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ----- UI wiring -----

function syncColorPair(colorId, textId, fallback) {
  const c = el(colorId);
  const t = el(textId);
  const apply = (hex) => {
    const v = normalizeHex(hex, fallback);
    c.value = v;
    t.value = v;
    renderPreview();
  };
  c.addEventListener("input", () => apply(c.value));
  t.addEventListener("input", () => apply(t.value));
  apply(c.value || t.value || fallback);
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

function renderPreview() {
  const theme = getTheme();
  document.documentElement.style.setProperty("--p", theme.primary);
  document.documentElement.style.setProperty("--s", theme.secondary);
  document.documentElement.style.setProperty("--bg", theme.bg);
  document.documentElement.style.setProperty("--surface", theme.surface);
  document.documentElement.style.setProperty("--text", theme.text);

  el("chipPrimary").style.background = theme.primary;
  el("chipSecondary").style.background = theme.secondary;
  el("chipSurface").style.background = theme.surface;
  el("chipSurface").style.borderColor = "rgba(255,255,255,.18)";
}

function setStatus(server, build) {
  if (server) el("serverStatus").textContent = server;
  if (build) el("buildStatus").textContent = build;
}

function setReqId(v) {
  el("reqId").textContent = v;
}

function getPrompt() {
  return (el("prompt").value || "").trim();
}

function getBuildFlags() {
  const useCache = !!el("useCache").checked;
  const forceFresh = !!el("forceFresh").checked;
  return { useCache, forceFresh };
}

let lastSpec = null;
let builtFiles = null;
let editsUsed = 0;

function setEditEnabled(enabled) {
  el("btnEdit").disabled = !enabled;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2500);
}

function showJson(preId, obj) {
  el(preId).textContent = JSON.stringify(obj, null, 2);
}

async function pingServer() {
  try {
    const base = getApiBase();
    setStatus(`Checking ${base}...`, null);
    const data = await apiFetch("/api/ping", { method: "GET" });
    setStatus(`OK: ${data?.name || "API"} (${data?.time || "no time"})`, null);
  } catch (e) {
    setStatus(`Error: ${e.message}`, null);
  }
}

async function buildSpec() {
  const prompt = getPrompt();
  if (!prompt) return alert("Please enter a detailed prompt.");

  const requestId = newRequestId();
  setReqId(requestId);
  setStatus(null, "Building spec...");

  try {
    const theme = getTheme();
    const flags = getBuildFlags();

    const data = await apiFetch("/api/spec", {
      method: "POST",
      body: JSON.stringify({
        requestId,
        prompt,
        theme,
        flags,
      }),
    });

    // The server should echo prompt back so you can verify no stale prompt
    lastSpec = data.spec;
    el("echoPrompt").textContent = data.echoPrompt || "(no echo)";
    showJson("specOut", data.spec);
    setStatus(null, "Spec ready.");
  } catch (e) {
    setStatus(null, `Spec error: ${e.message}`);
    alert(e.message);
  }
}

async function buildGame() {
  const prompt = getPrompt();
  if (!prompt) return alert("Please enter a detailed prompt.");

  const requestId = newRequestId();
  setReqId(requestId);
  setStatus(null, "Building game files...");

  try {
    const theme = getTheme();
    const flags = getBuildFlags();

    const data = await apiFetch("/api/build", {
      method: "POST",
      body: JSON.stringify({
        requestId,
        prompt,
        theme,
        flags,
        spec: lastSpec || null,
      }),
    });

    builtFiles = data.files;
    el("echoPrompt").textContent = data.echoPrompt || "(no echo)";
    showJson("filesOut", data.files);
    setStatus(null, "Build complete.");

    editsUsed = 0;
    el("editCount").textContent = String(editsUsed);
    setEditEnabled(true);

  } catch (e) {
    setStatus(null, `Build error: ${e.message}`);
    alert(e.message);
  }
}

async function applyEdit() {
  if (!builtFiles) return alert("Build a game first.");
  if (editsUsed >= 3) return alert("Edit limit reached (3).");

  const editPrompt = (el("editPrompt").value || "").trim();
  if (!editPrompt) return alert("Enter an edit request.");

  const requestId = newRequestId();
  setReqId(requestId);
  setStatus(null, "Applying edit...");

  try {
    const theme = getTheme();
    const flags = getBuildFlags();

    const data = await apiFetch("/api/edit", {
      method: "POST",
      body: JSON.stringify({
        requestId,
        editPrompt,
        theme,
        flags,
        files: builtFiles,
      }),
    });

    builtFiles = data.files;
    el("echoPrompt").textContent = data.echoPrompt || "(no echo)";
    showJson("filesOut", data.files);

    editsUsed++;
    el("editCount").textContent = String(editsUsed);

    setStatus(null, editsUsed >= 3 ? "Edit applied (limit reached)." : "Edit applied.");
  } catch (e) {
    setStatus(null, `Edit error: ${e.message}`);
    alert(e.message);
  }
}

function wireDownloads() {
  el("dlHtml").addEventListener("click", () => {
    if (!builtFiles) return alert("Build a game first.");
    downloadText("index.html", builtFiles["index.html"] || "");
  });
  el("dlCss").addEventListener("click", () => {
    if (!builtFiles) return alert("Build a game first.");
    downloadText("style.css", builtFiles["style.css"] || "");
  });
  el("dlJs").addEventListener("click", () => {
    if (!builtFiles) return alert("Build a game first.");
    downloadText("game.js", builtFiles["game.js"] || "");
  });
}

// init
(function init() {
  // default apiBase UI to Render for clarity
  setApiBaseUI(DEFAULT_API_BASE);

  el("btnPing").addEventListener("click", pingServer);
  el("btnSpec").addEventListener("click", buildSpec);
  el("btnBuild").addEventListener("click", buildGame);
  el("btnEdit").addEventListener("click", applyEdit);

  // Keep user edits if they change apiBase
  el("apiBase").addEventListener("change", () => {
    const v = el("apiBase").value.trim() || DEFAULT_API_BASE;
    setApiBaseUI(v);
  });

  syncColorPair("cPrimary", "tPrimary", "#ff0050");
  syncColorPair("cSecondary", "tSecondary", "#00f2ea");
  syncColorPair("cBg", "tBg", "#050b17");
  syncColorPair("cSurface", "tSurface", "#0b1632");
  syncColorPair("cText", "tText", "#ffffff");

  renderPreview();
  setEditEnabled(false);
  wireDownloads();
})();
