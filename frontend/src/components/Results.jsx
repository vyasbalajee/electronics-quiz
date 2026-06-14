import React, { useState, useEffect } from 'react';
import './Results.css';

const API = process.env.REACT_APP_API_URL;
const OPTION_KEYS = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

export default function Results({ sessionId, onRestart }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`${API}/api/session/${sessionId}/results`);
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

        {/* Score summary */}
        <div className="score-header">
          <div className="score-circle">
            <span className="score-number">{results.score}</span>
            <span className="score-divider">/</span>
            <span className="score-total">{results.total}</span>
          </div>
          <div className="score-info">
            <h2 className="score-title">Quiz Complete</h2>
            <p className="score-pct">{percentage}% correct</p>
          </div>
        </div>

        {/* Per-question breakdown */}
        <div className="breakdown-list">
          {results.results.map((r, i) => {
            const correctKey = OPTION_KEYS[OPTION_LABELS.indexOf(r.correct_option)];
            const chosenKey = r.chosen_option
              ? OPTION_KEYS[OPTION_LABELS.indexOf(r.chosen_option)]
              : null;

            return (
              <div
                key={r.id}
                className={`breakdown-item ${r.is_correct ? 'correct' : 'wrong'}`}
              >
                <div className="breakdown-left">
                  <img
                    src={`${API}/images/${r.image_filename}`}
                    alt={`Question ${i + 1}`}
                    className="breakdown-img"
                  />
                </div>
                <div className="breakdown-right">
                  <span className="breakdown-qnum">Question {i + 1}</span>
                  <div className="breakdown-answers">
                    <span className={`answer-tag ${r.is_correct ? 'tag-correct' : 'tag-wrong'}`}>
                      Your answer: {r.chosen_option ? `${r.chosen_option} — ${r[chosenKey] ?? ''}` : 'Not answered'}
                    </span>
                    {!r.is_correct && (
                      <span className="answer-tag tag-correct">
                        Correct: {r.correct_option} — {r[correctKey]}
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
          Take Another Quiz
        </button>
      </div>
    </div>
  );
}
