import React, { useState, useEffect } from 'react';
import { generateText } from './services/gemini';
import { Button } from './components/Button';
import { Status, AnalysisResult, HistoryItem } from './types';

// Simple Icon Components
const Icons = {
  Shield: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  CheckCircle: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  AlertTriangle: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  XCircle: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  Copy: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Share: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Flag: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
};

// Circular Progress Component
const ScoreRing = ({ score }: { score: number }) => {
  // SVG logic handled in CSS/JS mixture for simplicity
  const radius = 70; // Matches base CSS (will be scaled by CSS on mobile)
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  
  let color = 'var(--color-safe)';
  if (score >= 30) color = 'var(--color-warning)';
  if (score > 70) color = 'var(--color-danger)';

  return (
    <div className="progress-ring">
      <svg viewBox="0 0 160 160">
        <circle className="ring-bg" cx="80" cy="80" r={radius} />
        <circle 
          className="ring-progress" 
          cx="80" 
          cy="80" 
          r={radius}
          style={{ 
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            stroke: color
          }}
        />
      </svg>
      <div className="score-text-wrapper">
        <div className="score-number">{score}</div>
        <div className="score-label">Risk Score</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('scamCheckHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  const saveToHistory = (newResult: AnalysisResult, userInput: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      inputSnippet: userInput.length > 50 ? userInput.substring(0, 50) + '...' : userInput,
      score: newResult.score,
      riskLevel: newResult.riskLevel
    };

    // Add new item to beginning, keep max 5 items
    const updatedHistory = [newItem, ...history].slice(0, 5);
    setHistory(updatedHistory);
    localStorage.setItem('scamCheckHistory', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('scamCheckHistory');
    setNotification("Geschiedenis gewist");
    setTimeout(() => setNotification(null), 2000);
  };

  const checkScam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setStatus(Status.LOADING);
    setErrorMessage('');
    setResult(null);
    setCopied(false);

    try {
      const jsonString = await generateText(input);
      
      if (!jsonString || jsonString.trim() === "" || jsonString === "{}") {
        throw new Error("Leeg antwoord ontvangen van AI");
      }

      const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let parsedResult: AnalysisResult;
      try {
        parsedResult = JSON.parse(cleanJson);
      } catch (e) {
        throw new Error("Ongeldige JSON structuur");
      }
      
      if (typeof parsedResult.score !== 'number' || !parsedResult.summary) {
         throw new Error("Onvolledig antwoord");
      }

      setResult(parsedResult);
      setStatus(Status.SUCCESS);
      saveToHistory(parsedResult, input);
      
      // Scroll to result slightly
      setTimeout(() => {
        const resultEl = document.getElementById('result');
        if(resultEl) resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

    } catch (error: any) {
      console.error("Fout tijdens scam check:", error);
      setErrorMessage("Er ging iets mis, probeer opnieuw.");
      setStatus(Status.ERROR);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      const textToCopy = `Scam Score: ${result.score}%\nConclusie: ${result.summary}\n\nTips:\n${result.tips.join('\n')}`;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const textToShare = `Ik heb deze tekst gecheckt op scams.\nRisico: ${result.riskLevel} (${result.score}%)\nConclusie: ${result.summary}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Scam Checker Resultaat',
          text: textToShare,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      const subject = encodeURIComponent('AI Scam Checker Resultaat');
      const body = encodeURIComponent(textToShare);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  const handleReport = () => {
    if (!result) return;
    setIsReporting(true);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsReporting(false);
      setNotification("Melding succesvol ontvangen!");
      setTimeout(() => setNotification(null), 3000);
    }, 1200);
  };

  const getStatusClass = (status: 'safe' | 'warning' | 'danger') => {
    switch (status) {
      case 'safe': return 'status-safe';
      case 'warning': return 'status-warning';
      case 'danger': return 'status-danger';
      default: return '';
    }
  };

  const getRiskClassByScore = (score: number) => {
     if (score > 70) return 'bg-danger';
     if (score >= 30) return 'bg-warning';
     return 'bg-safe';
  }
  
  const getGlowClassByScore = (score: number) => {
     if (score > 70) return 'glow-danger';
     if (score >= 30) return 'glow-warning';
     return 'glow-safe';
  }

  const openSafetyModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  return (
    <div className="container">
      
      {/* Navigation */}
      <header className="nav-header">
        <a href="#" className="logo">
          <Icons.Shield />
          ScamChecker
        </a>
        <nav className="nav-links">
          <a onClick={openSafetyModal}>Veiligheid</a>
        </nav>
      </header>

      {/* Hero Section */}
      <main>
        <section className="hero">
          <h1 className="hero-title">Verifieer voordat<br/>je vertrouwt.</h1>
          <p className="hero-subtitle">
            Analyseer verdachte berichten, e-mails en links direct met krachtige AI om fraude te voorkomen.
          </p>
        </section>

        {/* Input Section */}
        <section>
          <form onSubmit={checkScam}>
            <div className="input-wrapper">
              <textarea
                placeholder="Plak hier het bericht of de link..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={status === Status.LOADING}
              />
              <div className="action-row">
                <span className="input-hint">AI-model: Gemini 3 Pro</span>
                <Button 
                  type="submit" 
                  isLoading={status === Status.LOADING}
                  disabled={!input.trim()}
                >
                  {status === Status.LOADING ? 'Analyseren...' : 'Check Nu'}
                </Button>
              </div>
            </div>
          </form>

          {/* Error Message */}
          {status === Status.ERROR && (
            <div className="error-msg">
              <Icons.AlertTriangle />
              <span>{errorMessage}</span>
            </div>
          )}
        </section>

        {/* Results Dashboard */}
        {status === Status.SUCCESS && result && (
          <section className="dashboard" id="result">
            
            <div className="dashboard-header">
              {/* Score Card */}
              <div className={`card score-card ${getGlowClassByScore(result.score)}`}>
                <ScoreRing score={result.score} />
                <span className={`risk-badge ${getRiskClassByScore(result.score)}`}>
                  {result.riskLevel} Risico
                </span>
              </div>

              {/* Main Summary Card */}
              <div className="card">
                <div className="card-header">
                  <Icons.Shield />
                  <span className="card-title">Conclusie</span>
                </div>
                <p className="summary-text">
                  {result.summary}
                </p>
                <div className="result-actions">
                  <button onClick={handleCopy} className="btn-secondary">
                    <Icons.Copy /> {copied ? 'Gekopieerd' : 'Kopieer'}
                  </button>
                  <button onClick={handleShare} className="btn-secondary">
                    <Icons.Share /> Deel
                  </button>
                  <button onClick={handleReport} className="btn-ghost-danger" disabled={isReporting}>
                    <Icons.Flag /> {isReporting ? 'Versturen...' : 'Rapporteer'}
                  </button>
                </div>
              </div>
            </div>

            {/* Grid for Checks & Tips */}
            <div className="dashboard-grid">
              
              {/* Specific Checks */}
              <div className="card">
                <div className="card-header">
                   <span className="card-title">Analyse Punten</span>
                </div>
                <div className="checks-list">
                  {result.checks.map((check, index) => (
                    <div key={index} className={`check-item ${getStatusClass(check.status)}`}>
                       <div className="check-icon">
                         {check.status === 'safe' ? <Icons.CheckCircle /> : check.status === 'danger' ? <Icons.XCircle /> : <Icons.AlertTriangle />}
                       </div>
                       <div className="check-content">
                         <div className="check-title">{check.category}</div>
                         <div className="check-desc">{check.detail}</div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips & Warnings */}
              <div className="card">
                <div className="card-header">
                   <span className="card-title">Advies & Waarschuwingen</span>
                </div>
                
                {result.brokenLinks && result.brokenLinks.length > 0 && (
                   <div className="broken-link-item">
                      <div className="check-icon"><Icons.XCircle /></div>
                      <div>
                        <div className="check-title">Kritiek: Kapotte Links</div>
                        <ul className="broken-link-list">
                           {result.brokenLinks.map((l, i) => <li key={i}>{l}</li>)}
                        </ul>
                      </div>
                   </div>
                )}

                <ul className="tips-list">
                  {result.tips.map((tip, index) => (
                    <li key={index} className="tip-item">
                      <div className="tip-dot"></div>
                      <span className="tip-text">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </section>
        )}
        
        {/* History Section */}
        {history.length > 0 && (
          <section className="history-section">
            <div className="history-header">
              <span className="history-title">Recente Checks</span>
              <button onClick={clearHistory} className="btn-clear">
                 <Icons.Trash />
              </button>
            </div>
            <div className="history-list">
              {history.map(item => (
                <div key={item.id} className="history-item">
                   <div className="history-info">
                     <span className="history-date">{item.date}</span>
                     <span className="history-snippet">"{item.inputSnippet}"</span>
                   </div>
                   <span className={`history-badge ${getRiskClassByScore(item.score)}`}>
                     {item.riskLevel}
                   </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      
      <footer className="footer">
        <p>Powered by Google Gemini 3 Pro Preview</p>
      </footer>

      {/* Safety Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowModal(false)}>
              <Icons.XCircle />
            </button>
            <h2 className="modal-title">Veiligheidstips</h2>
            <ul className="modal-list">
              <li className="modal-item">
                <div className="modal-item-icon" style={{color: 'var(--color-safe)'}}><Icons.Shield /></div>
                <div className="modal-item-content">
                  <span className="modal-item-title">Check de link</span>
                  <p className="modal-item-desc">Let op spelling. 'Rabobnak.nl' is niet echt. Controleer altijd het domein in de adresbalk.</p>
                </div>
              </li>
              <li className="modal-item">
                <div className="modal-item-icon" style={{color: 'var(--color-warning)'}}><Icons.AlertTriangle /></div>
                <div className="modal-item-content">
                  <span className="modal-item-title">Geen haast</span>
                  <p className="modal-item-desc">Oplichters creëren tijdsdruk ("Nu reageren!"). Laat je niet opjagen en neem de tijd.</p>
                </div>
              </li>
              <li className="modal-item">
                <div className="modal-item-icon" style={{color: 'var(--color-danger)'}}><Icons.XCircle /></div>
                <div className="modal-item-content">
                  <span className="modal-item-title">Geld & Codes</span>
                  <p className="modal-item-desc">Deel nooit pincodes, wachtwoorden of bankgegevens via een link in een berichtje.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="toast-notification">
          <div className="toast-icon"><Icons.CheckCircle /></div>
          <span className="toast-message">{notification}</span>
        </div>
      )}
    </div>
  );
};

export default App;