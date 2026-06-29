import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './StudentDashboard.css';

const API = process.env.REACT_APP_API_URL;

function formatIST(dateString) {
  if (!dateString) return '';
  const normalized = dateString.endsWith('Z') || dateString.includes('+') ? dateString : dateString + 'Z';
  const date = new Date(normalized);
  const istMillis = date.getTime() + (5 * 60 + 30) * 60 * 1000;
  const ist = new Date(istMillis);
  const day = ist.getUTCDate().toString().padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[ist.getUTCMonth()];
  const year = ist.getUTCFullYear();
  let hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

export default function StudentDashboard({ onStartQuiz }) {
  const { token, user, logout } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  function formatTime(seconds) {
    if (!seconds && seconds !== 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  const bestScore = history.length > 0
    ? Math.max(...history.map((h) => parseInt(h.correct_count) || 0))
    : null;

  const bestTime = history.filter(h => h.total_time > 0).length > 0
    ? Math.min(...history.filter(h => h.total_time > 0).map((h) => parseInt(h.total_time)))
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
          <div className="student-stat">
            <span className="student-stat-value">
              {bestTime ? formatTime(bestTime) : '—'}
            </span>
            <span className="student-stat-label">Best Time</span>
          </div>
        </div>

        <button className="start-quiz-btn" onClick={() => onStartQuiz()}>
          {history.length === 0 ? 'Start Your First Quiz' : 'Take Another Quiz'}
        </button>

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
                  <th>Score</th>
                  <th>Total Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.session_id}>
                    <td>{formatIST(h.created_at)}</td>
                    <td className="score-cell">{h.correct_count}/{h.questions_answered}</td>
                    <td className="time-cell">{formatTime(h.total_time)}</td>
                    <td>
                      <button
                        className="view-results-btn"
                        onClick={() => navigate(`/results/${h.session_id}`)}
                      >
                        View Results
                      </button>
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
