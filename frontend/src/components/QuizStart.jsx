import React from 'react';
import './QuizStart.css';

export default function QuizStart({ onStart, loading, error, onBack }) {
  return (
    <div className="start-wrapper">
      <div className="start-card">
        {onBack && (
          <button className="start-back-btn" onClick={onBack}>← Back</button>
        )}
        <div className="start-icon">⚡</div>
        <h1 className="start-title">Electronics Quiz</h1>
        <p className="start-subtitle">
          10 circuit diagram questions. Identify voltages, currents, and resistances.
        </p>
        {error && <div className="start-error">{error}</div>}
        <button className="start-btn" onClick={onStart} disabled={loading}>
          {loading ? 'Loading...' : 'Start Quiz'}
        </button>
      </div>
    </div>
  );
}
