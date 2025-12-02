import { GoogleGenAI } from "@google/genai";

// ⚠️ BELANGRIJK: VUL HIER JE API KEY IN (Tussen de aanhalingstekens)
const API_KEY = ""; 

// Initialiseer Gemini
let ai = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

// State
let history = [];

// DOM Elements
const inputEl = document.getElementById('user-input');
const formEl = document.getElementById('scam-form');
const submitBtn = document.getElementById('submit-btn');
const errorContainer = document.getElementById('error-container');
const dashboard = document.getElementById('dashboard');

// Modal Elements
const safetyModal = document.getElementById('safety-modal');
const promoteModal = document.getElementById('promote-modal');
const btnSafety = document.getElementById('btn-safety');
const btnPromote = document.getElementById('btn-promote');
const closeSafety = document.getElementById('close-safety-modal');
const closePromote = document.getElementById('close-promote-modal');

// Toast
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-message');

// History
const historyList = document.getElementById('history-list');
const historySection = document.getElementById('history-section');
const btnClearHistory = document.getElementById('btn-clear-history');

// Password Checker Elements
const pwdInput = document.getElementById('pwd-input');
const pwdFeedback = document.getElementById('pwd-feedback');
const bars = [1, 2, 3, 4].map(n => document.getElementById(`bar-${n}`));

// Quiz Elements
const quizQuestion = document.getElementById('quiz-question');
const quizResult = document.getElementById('quiz-result');
const quizBtns = document.querySelectorAll('.quiz-btn');

// --- PASSWORD CHECKER LOGIC ---
pwdInput.addEventListener('input', (e) => {
  const pwd = e.target.value;
  let strength = 0;
  let feedback = "Voer een wachtwoord in";

  if (pwd.length > 0) {
    if (pwd.length > 7) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
  }

  // Update UI bars
  bars.forEach((bar, idx) => {
    if (idx < strength) {
      if (strength <= 1) {
        bar.style.background = "var(--color-danger)";
        bar.style.boxShadow = "0 0 10px var(--color-danger)";
      }
      else if (strength <= 3) {
        bar.style.background = "var(--color-warning)";
        bar.style.boxShadow = "0 0 10px var(--color-warning)";
      } 
      else {
        bar.style.background = "var(--color-safe)";
        bar.style.boxShadow = "0 0 10px var(--color-safe)";
      }
    } else {
      bar.style.background = "rgba(255,255,255,0.1)";
      bar.style.boxShadow = "none";
    }
  });

  if (pwd.length === 0) feedback = "Voer een wachtwoord in";
  else if (strength <= 1) feedback = "Zwak 🔴";
  else if (strength <= 3) feedback = "Redelijk 🟠";
  else feedback = "Sterk! 🟢";

  pwdFeedback.textContent = feedback;
});

// --- QUIZ LOGIC ---
const questions = [
  { q: "Je bank stuurt een SMS: 'Klik hier om in te loggen'. Echt of Nep?", ans: "scam", explain: "Banken sturen nooit inloglinks per SMS." },
  { q: "Een Marktplaats koper wil gelijksteken via 'Gelijk Oversteken' service. Echt of Nep?", ans: "real", explain: "Gelijk Oversteken is een echte service (maar let op de URL!)." },
  { q: "Je hebt een pakketje gemist, betaal €2 verzendkosten. Echt of Nep?", ans: "scam", explain: "Klassieke phishing. Postbedrijven vragen dit niet zo." }
];
let currentQ = questions[Math.floor(Math.random() * questions.length)];
quizQuestion.textContent = currentQ.q;

quizBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const userAns = btn.getAttribute('data-ans');
    if (userAns === currentQ.ans) {
      quizResult.textContent = "✅ Correct! " + currentQ.explain;
      quizResult.className = "quiz-result text-green";
    } else {
      quizResult.textContent = "❌ Helaas. " + currentQ.explain;
      quizResult.className = "quiz-result text-red";
    }
    // New question after 3s
    setTimeout(() => {
      currentQ = questions[Math.floor(Math.random() * questions.length)];
      quizQuestion.textContent = currentQ.q;
      quizResult.textContent = "";
    }, 3000);
  });
});

// --- INIT ---
loadHistory();

// --- EVENT LISTENERS ---
formEl.addEventListener('submit', handleCheck);
btnSafety.addEventListener('click', () => safetyModal.style.display = 'flex');
btnPromote.addEventListener('click', () => promoteModal.style.display = 'flex');
closeSafety.addEventListener('click', () => safetyModal.style.display = 'none');
closePromote.addEventListener('click', () => promoteModal.style.display = 'none');
btnClearHistory.addEventListener('click', clearHistory);
document.getElementById('btn-copy').addEventListener('click', handleCopy);
document.getElementById('btn-share').addEventListener('click', handleShare);
document.getElementById('btn-report').addEventListener('click', handleReport);

// Close modals on outside click
window.addEventListener('click', (e) => {
  if (e.target == safetyModal) safetyModal.style.display = 'none';
  if (e.target == promoteModal) promoteModal.style.display = 'none';
});

// --- MAIN FUNCTION ---
async function handleCheck(e) {
  e.preventDefault();
  const input = inputEl.value.trim();
  if (!input) return;

  if (!API_KEY) {
    showError("⚠️ Geen API Key gevonden. Vul deze in script.js in om de AI te laten werken.");
    return;
  }

  // Reset UI
  submitBtn.disabled = true;
  submitBtn.textContent = "Analyseren...";
  errorContainer.style.display = 'none';
  dashboard.style.display = 'none';

  try {
    const jsonString = await generateText(input);
    const result = JSON.parse(jsonString); // Parse JSON from AI

    renderDashboard(result);
    saveToHistory(result, input);
    
    // Scroll to result
    dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error(err);
    showError("Er ging iets mis. Probeer het opnieuw.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Check Nu";
  }
}

// --- GEMINI API CALL ---
async function generateText(userInput) {
  const prompt = `Je bent een backend API die JSON teruggeeft voor een Scam Checker dashboard.
Analyseer de volgende input op fraude, phishing en veiligheidsrisico's.
Input: "${userInput}"
Geef ALLEEN een valide JSON object terug (geen markdown) met:
{
  "score": nummer 0-100 (100 = zeker scam),
  "riskLevel": "LAAG", "MIDDEN" of "HOOG",
  "summary": "Korte conclusie",
  "checks": [
    { "category": "URL", "status": "safe/warning/danger", "detail": "uitleg" },
    { "category": "Taal", "status": "safe/warning/danger", "detail": "uitleg" },
    { "category": "Druk", "status": "safe/warning/danger", "detail": "uitleg" }
  ],
  "brokenLinks": ["lijst", "van", "urls"],
  "tips": ["tip 1", "tip 2"]
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  
  // Clean markup if AI adds it
  let text = response.text || "{}";
  text = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return text;
}

// --- RENDER FUNCTIONS ---
function renderDashboard(data) {
  dashboard.style.display = 'block';

  // Score Ring
  document.getElementById('score-number').textContent = data.score;
  const offset = 439.8 - (data.score / 100) * 439.8;
  const ring = document.getElementById('ring-progress');
  ring.style.strokeDashoffset = offset;
  
  // Colors based on score
  let colorClass = 'glow-safe';
  let badgeClass = 'bg-safe';
  let colorHex = 'var(--color-safe)';

  if (data.score >= 30) { colorClass = 'glow-warning'; badgeClass = 'bg-warning'; colorHex = 'var(--color-warning)'; }
  if (data.score > 70) { colorClass = 'glow-danger'; badgeClass = 'bg-danger'; colorHex = 'var(--color-danger)'; }

  document.getElementById('score-card').className = `card score-card ${colorClass}`;
  document.getElementById('risk-badge').className = `risk-badge ${badgeClass}`;
  document.getElementById('risk-badge').textContent = data.riskLevel + " RISICO";
  ring.style.stroke = colorHex;

  // Summary
  document.getElementById('summary-text').textContent = data.summary;

  // Checks List
  const checksContainer = document.getElementById('checks-list');
  checksContainer.innerHTML = '';
  data.checks.forEach(check => {
    const statusClass = `status-${check.status}`;
    // Icons
    let iconSvg = '';
    if(check.status === 'safe') iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    if(check.status === 'warning') iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    if(check.status === 'danger') iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';

    const div = document.createElement('div');
    div.className = `check-item ${statusClass}`;
    div.innerHTML = `
      <div class="icon-box">
        ${iconSvg}
      </div>
      <div class="check-content">
        <span class="check-title">${check.category}</span>
        <span class="check-desc">${check.detail}</span>
      </div>
    `;
    checksContainer.appendChild(div);
  });

  // Broken Links
  const brokenLinksContainer = document.getElementById('broken-links-container');
  brokenLinksContainer.innerHTML = '';
  if (data.brokenLinks && data.brokenLinks.length > 0) {
    const div = document.createElement('div');
    div.className = 'broken-link-item';
    div.innerHTML = `
      <div class="broken-link-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
      </div>
      <div class="broken-link-content">
        <span class="broken-link-title">Kapotte of Verdachte Links</span>
        <ul class="broken-link-list">
          ${data.brokenLinks.map(link => `<li>${link}</li>`).join('')}
        </ul>
      </div>
    `;
    brokenLinksContainer.appendChild(div);
  }

  // Tips
  const tipsContainer = document.getElementById('tips-list');
  tipsContainer.innerHTML = '';
  data.tips.forEach(tip => {
    const li = document.createElement('li');
    li.className = 'tip-item';
    li.innerHTML = `
      <div class="icon-box-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <span class="tip-text">${tip}</span>
    `;
    tipsContainer.appendChild(li);
  });
}

// --- UTILS ---
function showError(msg) {
  errorContainer.textContent = msg;
  errorContainer.style.display = 'flex';
}

function showToast(msg) {
  toastMsg.textContent = msg;
  toast.style.display = 'flex';
  setTimeout(() => toast.style.display = 'none', 3000);
}

function handleCopy() {
  const text = document.getElementById('summary-text').textContent;
  navigator.clipboard.writeText(text);
  showToast("Gekopieerd naar klembord!");
}

function handleShare() {
  if (navigator.share) {
    navigator.share({ title: 'Scam Check', text: document.getElementById('summary-text').textContent });
  } else {
    showToast("Delen niet ondersteund op dit apparaat");
  }
}

function handleReport() {
  const btn = document.getElementById('btn-report');
  const originalText = btn.innerHTML;
  btn.innerHTML = "Verzonden!";
  showToast("Melding verstuurd naar database");
  setTimeout(() => btn.innerHTML = originalText, 2000);
}

// --- HISTORY LOGIC ---
function saveToHistory(result, input) {
  const item = {
    id: Date.now(),
    date: new Date().toLocaleDateString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
    inputSnippet: input.substring(0, 40) + (input.length > 40 ? '...' : ''),
    score: result.score,
    riskLevel: result.riskLevel
  };
  history.unshift(item);
  history = history.slice(0, 5);
  localStorage.setItem('scamHistory', JSON.stringify(history));
  loadHistory();
}

function loadHistory() {
  const saved = localStorage.getItem('scamHistory');
  if (saved) history = JSON.parse(saved);
  
  if (history.length > 0) {
    historySection.style.display = 'block';
    historyList.innerHTML = '';
    history.forEach(item => {
      let badgeClass = item.score > 70 ? 'bg-danger' : item.score >= 30 ? 'bg-warning' : 'bg-safe';
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div class="history-info"><span class="history-date">${item.date}</span><span class="history-snippet">"${item.inputSnippet}"</span></div>
        <span class="history-badge ${badgeClass}">${item.riskLevel}</span>
      `;
      historyList.appendChild(div);
    });
  } else {
    historySection.style.display = 'none';
  }
}

function clearHistory() {
  history = [];
  localStorage.removeItem('scamHistory');
  loadHistory();
  showToast("Geschiedenis gewist");
}