/* landing-bridge.js
   Purpose:
   - Reads the prompt saved by index.html (landing page)
   - Pre-fills your builder prompt field in builder.html (no matter what you named it)
   - Auto-suggests a template based on the prompt (no template picker needed)
   - Stores template hint + reason in localStorage so your builder can use it
*/

(() => {
  "use strict";

  // =========
  // Storage keys (landing + builder shared)
  // =========
  const LS_LAST_PROMPT = "ct_last_prompt";
  const LS_FROM_LANDING = "ct_from_landing";

  const LS_TEMPLATE_HINT = "ct_template_hint";         // e.g. "trivia"
  const LS_TEMPLATE_REASON = "ct_template_reason";     // short reason text
  const LS_TEMPLATE_META = "ct_template_meta";         // { id,label,confidence,signals[] }

  const LS_SESSION = "ct_auth_session";               // { email, at }

  // =========
  // Helper: safe JSON
  // =========
  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch {}
  }

  // =========
  // Template inference (simple + reliable heuristics)
  // =========
  function inferTemplate(prompt) {
    const p = (prompt || "").toLowerCase();

    // Scoring signals by template
    const templates = [
      {
        id: "wheel",
        label: "Spin Wheel",
        signals: [
          "wheel", "spin", "spinner", "random name", "pick a winner", "raffle", "giveaway",
          "segments", "slice", "slot", "roulette"
        ]
      },
      {
        id: "trivia",
        label: "Trivia / Quiz",
        signals: [
          "trivia", "quiz", "question", "answers", "a/b/c", "multiple choice", "true or false",
          "scoreboard", "rounds", "category", "timer", "countdown"
        ]
      },
      {
        id: "battle",
        label: "Battle / Arena",
        signals: [
          "battle", "arena", "eliminate", "hp", "health", "damage", "attack", "defend",
          "boss", "survive", "knockout", "last team", "power-up", "shield"
        ]
      },
      {
        id: "racing",
        label: "Racing / Progress",
        signals: [
          "race", "racing", "track", "finish line", "lap", "boost", "nitro", "car",
          "progress bar", "distance", "speed"
        ]
      },
      {
        id: "vote",
        label: "Voting / Poll",
        signals: [
          "vote", "voting", "poll", "choose", "pick between", "option 1", "option 2",
          "team vote", "chat decides", "majority"
        ]
      },
      {
        id: "overlay",
        label: "Overlay / Counter",
        signals: [
          "overlay", "counter", "goal", "donation goal", "sub goal", "gift goal", "like goal",
          "ticker", "feed", "alerts", "notifications", "leaderboard overlay"
        ]
      },
      {
        id: "kitchen",
        label: "Crowd Kitchen / Build",
        signals: [
          "cook", "pizza", "kitchen", "recipe", "ingredients", "toppings", "oven",
          "build", "assemble", "mix"
        ]
      }
    ];

    // Calculate scores
    const scored = templates.map(t => {
      let score = 0;
      const hits = [];
      for (const s of t.signals) {
        if (p.includes(s)) {
          score += (s.length >= 7 ? 2 : 1); // longer phrases = stronger signal
          hits.push(s);
        }
      }
      return { ...t, score, hits };
    }).sort((a, b) => b.score - a.score);

    // Default template if nothing matches
    const top = scored[0];
    const second = scored[1];

    const chosen = (top && top.score > 0) ? top : {
      id: "overlay",
      label: "Overlay / Counter",
      score: 0,
      hits: [],
      signals: []
    };

    // confidence: based on score gap + score
    const gap = (top?.score || 0) - (second?.score || 0);
    let confidence = 0.55;
    if (chosen.score >= 6) confidence = 0.9;
    else if (chosen.score >= 4) confidence = 0.8;
    else if (chosen.score >= 2) confidence = 0.7;
    if (gap >= 4) confidence = Math.min(0.95, confidence + 0.08);
    if (chosen.score === 0) confidence = 0.6;

    const reason = chosen.hits.length
      ? `Detected keywords: ${chosen.hits.slice(0, 4).join(", ")}`
      : `No strong keywords detected — defaulting to ${chosen.label}.`;

    return {
      id: chosen.id,
      label: chosen.label,
      confidence,
      reason,
      signals: chosen.hits || []
    };
  }

  // =========
  // Find & fill the prompt input in builder.html (supports many ID styles)
  // =========
  function findPromptElement() {
    // Common IDs/names people use
    const selectors = [
      "#prompt",
      "#promptInput",
      "#gamePrompt",
      "#mainPrompt",
      "#idea",
      "#description",
      "textarea[name='prompt']",
      "textarea[name='description']",
      "input[name='prompt']",
      "input[name='description']",
      "textarea",
      "input[type='text']"
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;

      // Prefer textareas or clearly prompt-ish inputs
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "textarea") return el;

      if (tag === "input") {
        const type = (el.getAttribute("type") || "").toLowerCase();
        if (type === "text" || type === "search" || !type) return el;
      }
    }
    return null;
  }

  function setBuilderBadges(templateMeta) {
    // Optional: if your builder has these, we’ll populate them.
    // If not, nothing breaks.
    const tplEl = document.querySelector("#templateHint, [data-template-hint]");
    const whyEl = document.querySelector("#templateReason, [data-template-reason]");
    const confEl = document.querySelector("#templateConfidence, [data-template-confidence]");

    if (tplEl) tplEl.textContent = templateMeta.label;
    if (whyEl) whyEl.textContent = templateMeta.reason;
    if (confEl) confEl.textContent = `${Math.round(templateMeta.confidence * 100)}%`;
  }

  function setAuthBadge() {
    // Optional: if your builder UI has a badge area
    const session = readJSON(LS_SESSION);
    const el = document.querySelector("#authBadge, [data-auth-badge]");
    if (!el) return;

    if (session && session.email) el.textContent = session.email;
    else el.textContent = "Signed out";
  }

  // =========
  // Main: prefill prompt + store template hint
  // =========
  function runHandoff() {
    setAuthBadge();

    const fromLanding = safeGet(LS_FROM_LANDING) === "1";
    const prompt = (safeGet(LS_LAST_PROMPT) || "").trim();

    if (!prompt) return;

    // Always infer + store, even if user navigated directly to builder
    const tpl = inferTemplate(prompt);
    safeSet(LS_TEMPLATE_HINT, tpl.id);
    safeSet(LS_TEMPLATE_REASON, tpl.reason);
    writeJSON(LS_TEMPLATE_META, tpl);
    setBuilderBadges(tpl);

    // If they came from landing, attempt to prefill prompt input
    if (fromLanding) {
      const el = findPromptElement();
      if (el) {
        el.value = prompt;
        // fire input event so frameworks/handlers pick it up
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }

      // Clear the "from landing" flag so refresh doesn't keep re-triggering
      safeSet(LS_FROM_LANDING, "0");
    }
  }

  // Expose a small API for your builder code (optional)
  window.ChatTokLanding = {
    getPrompt() { return (safeGet(LS_LAST_PROMPT) || "").trim(); },
    getTemplateHint() { return safeGet(LS_TEMPLATE_HINT) || "overlay"; },
    getTemplateMeta() { return readJSON(LS_TEMPLATE_META); },
    inferTemplate(prompt) { return inferTemplate(prompt); },
    rerun() { runHandoff(); }
  };

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runHandoff);
  } else {
    runHandoff();
  }
})();
