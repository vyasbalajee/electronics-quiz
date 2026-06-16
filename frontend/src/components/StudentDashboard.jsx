import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './StudentDashboard.css';

const API = process.env.REACT_APP_API_URL;

export default function StudentDashboard({ onStartQuiz }) {
  const { token, user, logout } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${API}/api/session/my/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setHistory(data.history);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const bestScore = history.length > 0
    ? Math.max(...history.map((h) => parseInt(h.correct_count) || 0))
    : null;

  return (
    <div className="student-wrapper">
      <div className="student-card">
        <div className="student-header">
          <div>
            <h2 className="student-title">Welcome, {user.username}</h2>
            <p className="student-subtitle">Electronics Quiz</p>
          </div>
          <button className="logout-btn" onClick={logout}>Sign Out</button>
        </div>

        {/* Stats */}
        <div className="student-stats">
          <div className="student-stat">
            <span className="student-stat-value">{history.length}</span>
            <span className="student-stat-label">Attempts</span>
          </div>
          <div className="student-stat">
            <span className="student-stat-value">
              {bestScore !== null ? `${bestScore}/10` : '—'}
            </span>
            <span className="student-stat-label">Best Score</span>
          </div>
        </div>

        <button className="start-quiz-btn" onClick={onStartQuiz}>
          {history.length === 0 ? 'Start Your First Quiz' : 'Take Another Quiz'}
        </button>

        {/* History */}
        <div className="history-section">
          <h3 className="history-section-title">Your Attempts</h3>
          {loading && <p className="history-loading">Loading...</p>}
          {!loading && history.length === 0 && (
            <p className="history-empty">No attempts yet. Take your first quiz above!</p>
          )}
          {!loading && history.length > 0 && (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Questions Answered</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.session_id}>
                    <td>{new Date(h.created_at).toLocaleString()}</td>
                    <td>{h.questions_answered}</td>
                    <td className="score-cell">
                      {h.correct_count}/{h.questions_answered}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
