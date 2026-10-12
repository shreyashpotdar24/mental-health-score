/* ===== Configuration ===== */
// Change this URL when you deploy your FastAPI backend.
const API_URL = "const API_URL = "https://mental-health-score-1-t58c.onrender.com";";
const HISTORY_KEY = "mindscore_history";

/* ===== Form schema: matches the FastAPI `studentdata` model exactly ===== */
const COUNTRIES = ["Other", "India", "USA", "Canada", "Australia", "UK", "Germany", "Mexico", "Turkey", "France"];
const SECTIONS = [{
        title: "Personal Information",
        fields: [
            { name: "Age", label: "Age", type: "int", min: 10, max: 100, help: "Whole number, 10 to 100" },
            { name: "Gender", label: "Gender", type: "select", options: ["male", "female"] },
            { name: "Country", label: "Country", type: "select", options: COUNTRIES },
        ]
    },
    {
        title: "Academic Information",
        fields: [
            { name: "Academic_Level", label: "Academic Level", type: "select", options: ["Undergraduate", "Graduate", "High School"] },
            { name: "Study_Hours", label: "Study Hours", type: "float", min: 0, max: 24, help: "Hours per day, 0 to 24" },
        ]
    },
    {
        title: "Social Media Usage",
        fields: [{
                name: "Most_Used_Platform",
                label: "Most Used Platform",
                type: "select",
                options: ["Facebook", "LinkedIn", "Instagram", "Snapchat", "Twitter", "YouTube", "TikTok", "LINE", "KakaoTalk", "VKontakte", "WhatsApp", "WeChat"]
            },
            { name: "Purpose_Of_Use", label: "Purpose Of Use", type: "select", options: ["Networking", "Education", "Entertainment", "News"] },
            { name: "Avg_Daily_Usage_Hours", label: "Avg Daily Usage Hours", type: "float", min: 0, max: 24, help: "Hours per day, 0 to 24" },
            { name: "Daily_Unlocks", label: "Daily Unlocks", type: "int", min: 0, help: "Whole number, 0 or more" },
        ]
    },
    {
        title: "Lifestyle & Mental Health",
        fields: [
            { name: "Physical_Activity_Hours", label: "Physical Activity Hours", type: "float", min: 0, max: 24, help: "Hours per day, 0 to 24" },
            { name: "Sleep_Hours_Per_Night", label: "Sleep Hours Per Night", type: "float", min: 0, max: 24, help: "Hours per night, 0 to 24" },
            { name: "Stress_Level", label: "Stress Level", type: "select", options: ["Low", "Medium", "High", "Very High"] },
        ]
    },
];
const ALL_FIELDS = SECTIONS.flatMap(s => s.fields);

/* ===== Helpers ===== */
const $ = id => document.getElementById(id);
const form = $("form"),
    alertBox = $("alert");

/* ===== Build the form from the schema ===== */
function buildForm() {
    const frag = document.createDocumentFragment();
    SECTIONS.forEach(sec => {
                const group = document.createElement("div");
                group.className = "group";
                group.innerHTML = `<h3>${sec.title}</h3><div class="grid"></div>`;
                sec.fields.forEach(f => {
                            const wrap = document.createElement("div");
                            wrap.className = "field";
                            const input = f.type === "select" ?
                                `<select id="${f.name}" name="${f.name}" required aria-describedby="e_${f.name}"><option value="">Select ${f.label.toLowerCase()}</option>${
            f.options.map(o => `<option value="${o}">${o.charAt(0).toUpperCase() + o.slice(1)}</option>`).join("")}</select>`
        : `<input id="${f.name}" name="${f.name}" type="number" inputmode="decimal" required
             ${f.min !== undefined ? `min="${f.min}"` : ""} ${f.max !== undefined ? `max="${f.max}"` : ""}
             step="${f.type === "int" ? 1 : "any"}" placeholder="e.g. ${f.type === "int" ? (f.name === "Age" ? 20 : 50) : 5}" aria-describedby="e_${f.name}">`;
      wrap.innerHTML = `<label for="${f.name}">${f.label}</label>${input}
        ${f.help ? `<span class="help">${f.help}</span>` : ""}<span class="err" id="e_${f.name}"></span>`;
      group.lastChild.appendChild(wrap);
    });
    frag.appendChild(group);
  });
  $("fields").appendChild(frag);
}

/* ===== Validation ===== */
function setError(f, msg) {
  const box = $("e_" + f.name);
  box.textContent = msg;
  box.parentElement.classList.toggle("bad", !!msg);
  $(f.name).setAttribute("aria-invalid", msg ? "true" : "false");
}
function validateField(f) {
  const raw = $(f.name).value.trim();
  if (raw === "") return setError(f, f.type === "select" ? "Please select an option." : "This field is required."), false;
  if (f.type === "select") {
    if (!f.options.includes(raw)) return setError(f, "Invalid selection."), false;
  } else {
    const n = Number(raw);
    if (!Number.isFinite(n)) return setError(f, "Enter a valid number."), false;
    if (f.type === "int" && !Number.isInteger(n)) return setError(f, "Enter a whole number."), false;
    if (f.min !== undefined && n < f.min) return setError(f, `Value must be at least ${f.min}.`), false;
    if (f.max !== undefined && n > f.max) return setError(f, `Value must be at most ${f.max}.`), false;
  }
  setError(f, "");
  return true;
}
function validateAll() {
  let first = null;
  ALL_FIELDS.forEach(f => { if (!validateField(f) && !first) first = f; });
  if (first) $(first.name).focus();
  return !first;
}

/* ===== Build JSON body (exact field names and types) ===== */
function collectData() {
  const data = {};
  ALL_FIELDS.forEach(f => {
    const v = $(f.name).value.trim();
    data[f.name] = f.type === "select" ? v : Number(v);
  });
  return data;
}

/* ===== API communication ===== */
async function requestPrediction(data) {
  let response;
  try {
    response = await fetch(`${API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (e) {
    throw new Error("Unable to connect to the prediction server. Please make sure FastAPI is running.");
  }
  if (!response.ok) {
    const messages = {
      400: "The server rejected the request (400). Please check your inputs.",
      422: "Some values were not accepted by the server (422). Please check every field.",
      500: "The server had an internal error (500). Please check the FastAPI terminal for details.",
    };
    throw new Error(messages[response.status] || `The server returned an error (${response.status}).`);
  }
  let json;
  try { json = await response.json(); } catch (e) { json = null; }
  if (!json || typeof json.predicted_mental_health_score !== "number") {
    throw new Error("The server sent an unexpected response. Please try again.");
  }
  return json;
}

/* ===== UI state ===== */
function showAlert(msg) { alertBox.textContent = msg; alertBox.hidden = !msg; }
function setLoading(on) {
  const btn = $("predictBtn");
  btn.disabled = on;
  btn.classList.toggle("loading", on);
  btn.querySelector(".btn-label").textContent = on ? "Analyzing Student Data..." : "✦ Predict Mental Health Score";
}

/* Animated counter for the score */
function countUp(el, target) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = target.toFixed(2); return; }
  const start = performance.now(), dur = 1200;
  (function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(2);
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}
function showResult(json) {
  const score = json.predicted_mental_health_score;
  $("result").hidden = false;
  $("result").classList.add("in");
  countUp($("scoreNum"), score);
  $("summary").textContent = `The model predicted a mental health score of ${score.toFixed(2)} for the student information you entered.`;
  $("raw").textContent = JSON.stringify(json, null, 2);
  $("result").scrollIntoView({ behavior: "smooth", block: "center" });
}

/* ===== History (localStorage) ===== */
const loadHistory = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch (e) { return []; } };
const saveHistory = list => { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20))); } catch (e) {} };
function renderHistory() {
  const list = loadHistory(), body = $("historyBody");
  body.innerHTML = "";
  $("emptyHistory").hidden = list.length > 0;
  list.forEach((item, i) => {
    const tr = document.createElement("tr");
    if (i === 0) tr.className = "latest";
    [new Date(item.date).toLocaleString(), item.score.toFixed(2), "Not provided by API"].forEach(t => {
      const td = document.createElement("td"); td.textContent = t; tr.appendChild(td);
    });
    const td = document.createElement("td"), b = document.createElement("button");
    b.className = "del"; b.textContent = "Delete"; b.type = "button";
    b.setAttribute("aria-label", "Delete record " + (i + 1));
    b.onclick = () => { const l = loadHistory(); l.splice(i, 1); saveHistory(l); renderHistory(); };
    td.appendChild(b); tr.appendChild(td); body.appendChild(tr);
  });
}
function addHistory(score) {
  const list = loadHistory();
  list.unshift({ date: new Date().toISOString(), score });
  saveHistory(list); renderHistory();
}

/* ===== Events ===== */
form.addEventListener("submit", async e => {
  e.preventDefault();
  showAlert("");
  if (!validateAll()) return;
  setLoading(true);
  try {
    const json = await requestPrediction(collectData());
    showResult(json);
    addHistory(json.predicted_mental_health_score);
  } catch (err) {
    showAlert(err.message);
  } finally {
    setLoading(false);
  }
});
form.addEventListener("input", e => {
  const f = ALL_FIELDS.find(x => x.name === e.target.id);
  if (f && $("e_" + f.name).textContent) validateField(f);
});
$("resetBtn").addEventListener("click", () => {
  form.reset(); showAlert("");
  ALL_FIELDS.forEach(f => setError(f, ""));
  $("result").hidden = true; $("scoreNum").textContent = "0.00";
  $("prediction").scrollIntoView({ behavior: "smooth" });
});
$("clearHistory").addEventListener("click", () => { saveHistory([]); renderHistory(); });

/* Mobile menu */
const burger = $("burger"), menu = $("menu");
burger.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
menu.addEventListener("click", e => { if (e.target.tagName === "A") { menu.classList.remove("open"); burger.setAttribute("aria-expanded", false); } });

/* Fade-in on scroll */
const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: .12 });
function observeReveals() { document.querySelectorAll(".reveal").forEach(el => io.observe(el)); }

/* API status badge (calls GET /) */
async function checkApi() {
  const s = $("apiStatus"), t = s.querySelector("b");
  try {
    const r = await fetch(`${API_URL}/`);
    if (!r.ok) throw new Error();
    s.className = "status on"; t.textContent = "Prediction API online";
  } catch (e) {
    s.className = "status off"; t.textContent = "Prediction API offline";
  }
}

/* ===== Start ===== */
buildForm(); renderHistory(); observeReveals(); checkApi();
