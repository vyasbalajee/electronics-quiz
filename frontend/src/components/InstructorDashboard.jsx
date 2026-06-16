import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import InstructorPage from './InstructorPage';
import './InstructorDashboard.css';

const API = process.env.REACT_APP_API_URL;

export default function InstructorDashboard({ onNavigate }) {
  const { token, user, logout } = useAuth();
  const [tab, setTab] = useState('analytics'); // 'analytics' | 'questions' | 'upload' | 'student'
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentHistory, setStudentHistory] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tab === 'analytics') fetchOverview();
    if (tab === 'questions') fetchQuestions();
  }, [tab]);

  async function fetchOverview() {
    setLoading(true);
    try {
      const [overviewRes, studentsRes] = await Promise.all([
        fetch(`${API}/api/analytics/overview`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/analytics/students`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const overviewData = await overviewRes.json();
      const studentsData = await studentsRes.json();
      setOverview(overviewData);
      setStudents(studentsData.students);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuestions() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStudentHistory(studentId) {
    try {
      const res = await fetch(`${API}/api/analytics/students/${studentId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStudentHistory(data);
      setSelectedStudent(studentId);
    } catch (err) {
      alert(err.message);
    }
  }

  async function saveEdit(questionId) {
    try {
      const res = await fetch(`${API}/api/questions/${questionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? data.question : q))
      );
      setEditingQuestion(null);
      setEditForm({});
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteQuestion(questionId) {
    if (!window.confirm('Delete this question? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/api/questions/${questionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (err) {
      alert(err.message);
    }
  }

  function startEdit(question) {
    setEditingQuestion(question.id);
    setEditForm({
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      option_e: question.option_e,
      correct_option: question.correct_option,
    });
  }

  return (
    <div className="idash-wrapper">
      <div className="idash-card">
        {/* Header */}
        <div className="idash-header">
          <div>
            <h2 className="idash-title">Instructor Panel</h2>
            <p className="idash-subtitle">Welcome, {user.username}</p>
          </div>
          <div className="idash-header-actions">
            {user.role === 'admin' && (
              <button className="nav-action-btn" onClick={() => onNavigate('admin')}>
                Admin Dashboard
              </button>
            )}
            <button className="nav-action-btn logout" onClick={logout}>Sign Out</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="idash-tabs">
          {['analytics', 'questions', 'upload'].map((t) => (
            <button
              key={t}
              className={`idash-tab ${tab === t ? 'active' : ''}`}
              onClick={() => { setTab(t); setSelectedStudent(null); setStudentHistory(null); }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading && <p className="idash-loading">Loading...</p>}
        {error && <p className="idash-error">{error}</p>}

        {/* Analytics Tab */}
        {tab === 'analytics' && !loading && overview && (
          <div className="analytics-content">
            {/* Stats row */}
            <div className="stats-row">
              <div className="stat-box">
                <span className="stat-value">{overview.total_attempts}</span>
                <span className="stat-label">Total Attempts</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{overview.unique_students}</span>
                <span className="stat-label">Unique Students</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{overview.avg_score}/10</span>
                <span className="stat-label">Avg Score</span>
              </div>
            </div>

            {/* Student history view */}
            {studentHistory ? (
              <div className="student-history">
                <button className="back-link" onClick={() => { setStudentHistory(null); setSelectedStudent(null); }}>
                  ← Back to students
                </button>
                <h3 className="history-title">{studentHistory.student.username}'s Attempts</h3>
                {studentHistory.attempts.length === 0 ? (
                  <p className="empty-msg">No attempts yet.</p>
                ) : (
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Questions Answered</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentHistory.attempts.map((a) => (
                        <tr key={a.session_id}>
                          <td>{new Date(a.created_at).toLocaleString()}</td>
                          <td>{a.questions_answered}</td>
                          <td className="score-cell">
                            {a.correct_count}/{a.questions_answered}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <>
                {/* Question difficulty */}
                <div className="section">
                  <h3 className="section-title">Question Difficulty</h3>
                  <div className="difficulty-list">
                    {overview.question_difficulty.map((q, i) => (
                      <div key={q.id} className="difficulty-item">
                        <img src={q.image_filename} alt={`Q${i + 1}`} className="diff-img" />
                        <div className="diff-bar-wrapper">
                          <div
                            className="diff-bar"
                            style={{ width: `${q.wrong_percentage || 0}%` }}
                          />
                        </div>
                        <span className="diff-pct">{q.wrong_percentage || 0}% wrong</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Students list */}
                <div className="section">
                  <h3 className="section-title">Students</h3>
                  {students.length === 0 ? (
                    <p className="empty-msg">No students have registered yet.</p>
                  ) : (
                    <table className="students-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Attempts</th>
                          <th>Best Score</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
                          <tr key={s.id}>
                            <td className="td-username">{s.username}</td>
                            <td>{s.total_attempts}</td>
                            <td>{s.best_score !== null ? `${s.best_score}/10` : '—'}</td>
                            <td>
                              <button
                                className="view-history-btn"
                                onClick={() => fetchStudentHistory(s.id)}
                              >
                                View History
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Questions Tab */}
        {tab === 'questions' && !loading && (
          <div className="questions-content">
            {questions.length === 0 ? (
              <p className="empty-msg">No questions in the database.</p>
            ) : (
              <div className="questions-list">
                {questions.map((q, i) => (
                  <div key={q.id} className="question-item">
                    <img src={q.image_filename} alt={`Q${i + 1}`} className="q-img" />
                    <div className="q-details">
                      {editingQuestion === q.id ? (
                        <div className="edit-form">
                          {['a', 'b', 'c', 'd', 'e'].map((opt) => (
                            <div key={opt} className="edit-field">
                              <label>Option {opt.toUpperCase()}</label>
                              <input
                                value={editForm[`option_${opt}`] || ''}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, [`option_${opt}`]: e.target.value })
                                }
                              />
                            </div>
                          ))}
                          <div className="edit-field">
                            <label>Correct Option</label>
                            <select
                              value={editForm.correct_option || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, correct_option: e.target.value })
                              }
                            >
                              {['A', 'B', 'C', 'D', 'E'].map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          </div>
                          <div className="edit-actions">
                            <button className="save-btn" onClick={() => saveEdit(q.id)}>Save</button>
                            <button className="cancel-btn" onClick={() => setEditingQuestion(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="q-options">
                          {['a', 'b', 'c', 'd', 'e'].map((opt) => (
                            <span
                              key={opt}
                              className={`q-option ${q.correct_option === opt.toUpperCase() ? 'correct' : ''}`}
                            >
                              {opt.toUpperCase()}: {q[`option_${opt}`]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {editingQuestion !== q.id && (
                      <div className="q-actions">
                        <button className="edit-btn" onClick={() => startEdit(q)}>Edit</button>
                        <button className="delete-btn" onClick={() => deleteQuestion(q.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Tab */}
        {tab === 'upload' && (
          <InstructorPage embedded />
        )}
      </div>
    </div>
  );
}
