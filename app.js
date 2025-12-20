/* AI Live Interactive Game Builder (local) */
const els = {
  gameIdea: document.getElementById("gameIdea"),
  sessionId: document.getElementById("sessionId"),
  resetSessionBtn: document.getElementById("resetSessionBtn"),
  startBtn: document.getElementById("startBtn"),
  apiStatus: document.getElementById("apiStatus"),

  wizardCard: document.getElementById("wizardCard"),
  questionText: document.getElementById("questionText"),
  answerInput: document.getElementById("answerInput"),
  nextBtn: document.getElementById("nextBtn"),
  skipBtn: document.getElementById("skipBtn"),
  wizardStatus: document.getElementById("wizardStatus"),
  specPre: document.getElementById("specPre"),
  generateBtn: document.getElementById("generateBtn"),

  lastAnswerMsg: document.getElementById("lastAnswerMsg"),
  lastAnswerText: document.getElementById("lastAnswerText"),

  outputCard: document.getElementById("outputCard"),
  outIndex: document.getElementById("outIndex"),
  outCss: document.getElementById("outCss"),
  outJs: document.getElementById("outJs"),
  outReadme: document.getElementById("outReadme"),
  genStatus: document.getElementById("genStatus"),
  downloadZipBtn: document.getElementById("downloadZipBtn"),
};

let sessionId = newSessionId();
let spec = {};
let done = false;
let generated = null;

function newSessionId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2,"0")).join("");
}

function setSessionId(id){
  sessionId = id;
  els.sessionId.textContent = id;
}

setSessionId(sessionId);

els.resetSessionBtn.addEventListener("click", () => {
  setSessionId(newSessionId());
  spec = {};
  done = false;
  generated = null;
  els.wizardCard.style.display = "none";
  els.outputCard.style.display = "none";
  els.apiStatus.textContent = "API: reset session";
});

async function postJSON(url, body){
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body),
  });
  if(!res.ok){
    const text = await res.text().catch(()=> "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return await res.json();
}

function renderSpec(){
  els.specPre.textContent = JSON.stringify(spec, null, 2);
}

function setQuestion(q){
  els.questionText.textContent = q || "Wizard complete — you can generate your files.";
}

function showLastAnswer(ans){
  if(!ans) return;
  els.lastAnswerText.textContent = ans;
  els.lastAnswerMsg.style.display = "";
}

async function startWizard(){
  const idea = (els.gameIdea.value || "").trim();
  if(!idea){
    alert("Paste a game idea first.");
    return;
  }

  els.apiStatus.textContent = "API: starting wizard…";
  els.wizardCard.style.display = "";
  els.outputCard.style.display = "none";
  els.generateBtn.disabled = true;
  els.wizardStatus.textContent = "Thinking…";

  const data = await postJSON("/api/next-question", {
    sessionId,
    gameIdea: idea,
    answer: null,
    skip: false,
  });

  spec = data.spec || {};
  done = !!data.done;
  setQuestion(data.question);
  renderSpec();

  els.wizardStatus.textContent = done ? "Done — ready to generate" : "Waiting for your answer";
  els.generateBtn.disabled = !done;
  els.apiStatus.textContent = "API: wizard running";
  els.answerInput.value = "";
  els.answerInput.focus();
}

els.startBtn.addEventListener("click", () => startWizard());

async function submitAnswer({skip=false} = {}){
  if(!els.wizardCard.style.display === "none") return;

  const ans = skip ? "" : (els.answerInput.value || "").trim();
  if(!skip && !ans){
    alert("Type an answer (or click Skip).");
    return;
  }

  if(!skip) showLastAnswer(ans);

  els.wizardStatus.textContent = "Thinking…";
  els.generateBtn.disabled = true;

  const data = await postJSON("/api/next-question", {
    sessionId,
    answer: ans,
    skip,
  });

  spec = data.spec || spec;
  done = !!data.done;
  setQuestion(data.question);
  renderSpec();

  els.wizardStatus.textContent = done ? "Done — ready to generate" : "Waiting for your answer";
  els.generateBtn.disabled = !done;
  els.answerInput.value = "";
  els.answerInput.focus();
}

els.nextBtn.addEventListener("click", () => submitAnswer({skip:false}));
els.skipBtn.addEventListener("click", () => submitAnswer({skip:true}));

els.answerInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter"){
    e.preventDefault();
    submitAnswer({skip:false});
  }
});

function setupTabs(){
  const tabs = document.querySelectorAll(".tab");
  const panes = document.querySelectorAll(".pane");
  tabs.forEach(t => {
    t.addEventListener("click", () => {
      const key = t.getAttribute("data-tab");
      tabs.forEach(x => x.classList.toggle("active", x === t));
      panes.forEach(p => p.classList.toggle("active", p.getAttribute("data-pane") === key));
    });
  });

  document.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const key = btn.getAttribute("data-copy");
      const text = key === "index" ? els.outIndex.textContent
                : key === "css" ? els.outCss.textContent
                : key === "js" ? els.outJs.textContent
                : els.outReadme.textContent;
      try{
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied!";
        setTimeout(()=> btn.textContent = "Copy", 900);
      }catch{
        alert("Could not copy to clipboard.");
      }
    });
  });
}
setupTabs();

els.generateBtn.addEventListener("click", async () => {
  els.genStatus.textContent = "Generating…";
  els.outputCard.style.display = "";
  els.outIndex.textContent = "";
  els.outCss.textContent = "";
  els.outJs.textContent = "";
  els.outReadme.textContent = "";

  try{
    const data = await postJSON("/api/generate", { sessionId });
    generated = data;

    els.outIndex.textContent = data.indexHtml || "";
    els.outCss.textContent = data.styleCss || "";
    els.outJs.textContent = data.gameJs || "";
    els.outReadme.textContent = data.readme || "";

    els.genStatus.textContent = "Done";
  }catch(err){
    console.error(err);
    els.genStatus.textContent = "Error";
    alert(err.message || String(err));
  }
});

els.downloadZipBtn.addEventListener("click", async () => {
  if(!generated){
    alert("Generate files first.");
    return;
  }
  const zip = new JSZip();
  zip.file("index.html", generated.indexHtml || "");
  zip.file("style.css", generated.styleCss || "");
  zip.file("game.js", generated.gameJs || "");
  zip.file("README.md", generated.readme || "");

  const blob = await zip.generateAsync({type:"blob"});
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = "chattok-game-bundle.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
});
