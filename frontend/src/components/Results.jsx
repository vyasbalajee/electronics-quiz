import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Results.css';

const API = process.env.REACT_APP_API_URL;

export default function Results({ sessionId, onRestart }) {
  const { token } = useAuth();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`${API}/api/session/${sessionId}/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResults(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [sessionId]);

  function formatTime(seconds) {
    if (!seconds && seconds !== 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  if (loading) {
    return (
      <div className="results-wrapper">
        <div className="results-card">
          <p className="results-loading">Calculating results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-wrapper">
        <div className="results-card">
          <p className="results-error">{error}</p>
          <button className="restart-btn" onClick={onRestart}>Try Again</button>
        </div>
      </div>
    );
  }

  const percentage = Math.round((results.score / results.total) * 100);

  return (
    <div className="results-wrapper">
      <div className="results-card">

        {/* Score + time summary */}
        <div className="score-header">
          <div className="score-circle">
            <span className="score-number">{results.score}</span>
            <span className="score-divider">/</span>
            <span className="score-total">{results.total}</span>
          </div>
          <div className="score-info">
            <h2 className="score-title">Quiz Complete</h2>
            <p className="score-pct">{percentage}% correct</p>
            <p className="score-time">
              ⏱ Total time: <strong>{formatTime(results.total_time)}</strong>
            </p>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="breakdown-list">
          {results.results.map((r, i) => {
            const correctText = r.options[r.correct_option];
            const chosenText = r.chosen_option ? r.options[r.chosen_option] : null;

            return (
              <div
                key={r.id}
                className={`breakdown-item ${r.is_correct ? 'correct' : 'wrong'}`}
              >
                <div className="breakdown-left">
                  <img
                    src={r.image_filename}
                    alt={`Question ${i + 1}`}
                    className="breakdown-img"
                  />
                </div>
                <div className="breakdown-right">
                  <div className="breakdown-qnum-row">
                    <span className="breakdown-qnum">Question {i + 1}</span>
                    <span className="breakdown-time">⏱ {formatTime(r.time_taken_seconds)}</span>
                  </div>
                  <div className="breakdown-answers">
                    <span className={`answer-tag ${r.is_correct ? 'tag-correct' : 'tag-wrong'}`}>
                      Your answer: {r.chosen_option ? `${r.chosen_option} — ${chosenText}` : 'Not answered'}
                    </span>
                    {!r.is_correct && (
                      <span className="answer-tag tag-correct">
                        Correct: {r.correct_option} — {correctText}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`breakdown-icon ${r.is_correct ? 'icon-correct' : 'icon-wrong'}`}>
                  {r.is_correct ? '✓' : '✗'}
                </span>
              </div>
            );
          })}
        </div>

        <button className="restart-btn" onClick={onRestart}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
