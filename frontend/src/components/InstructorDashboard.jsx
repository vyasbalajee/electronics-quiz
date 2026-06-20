import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import InstructorPage from './InstructorPage';
import './InstructorDashboard.css';

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

export default function InstructorDashboard({ onNavigate }) {
  const { token, user, logout } = useAuth();
  const [tab, setTab] = useState('analytics');
  const [overview, setOverview] = useState(null);
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [studentHistory, setStudentHistory] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [topics, setTopics] = useState([]);
  const [questionTopics, setQuestionTopics] = useState({});
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tab === 'analytics') fetchOverview();
    if (tab === 'questions') fetchQuestions();
  }, [tab]);

  function formatTime(seconds) {
    if (!seconds && seconds !== 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

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
      const [topicsRes, res] = await Promise.all([
        fetch(`${API}/api/topics`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/api/questions`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const topicsData = await topicsRes.json();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopics(topicsData.topics || []);
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
      setSessionDetail(null);
    } catch (err) {
      alert(err.message);
    }
  }

  async function fetchSessionDetail(sessionId) {
    try {
      const res = await fetch(`${API}/api/session/${sessionId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSessionDetail(data);
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
    // First fetch how many student responses will be affected
    let responseCount = 0;
    try {
      const countRes = await fetch(`${API}/api/questions/${questionId}/response-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const countData = await countRes.json();
      responseCount = countData.count || 0;
    } catch {
      // If count fails, proceed with generic warning
    }

    const message = responseCount > 0
      ? `Delete this question? This will also permanently delete ${responseCount} student response${responseCount !== 1 ? 's' : ''} to it. This cannot be undone.`
      : 'Delete this question? This cannot be undone.';

    if (!window.confirm(message)) return;
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

  async function saveTopics(questionId, topicIds) {
    try {
      await fetch(`${API}/api/topics/question/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topicIds }),
      });
      setQuestions((prev) => prev.map((q) => {
        if (q.id !== questionId) return q;
        const selectedTopics = topics.filter((t) => topicIds.includes(t.id));
        return { ...q, topics: selectedTopics };
      }));
    } catch (err) {
      alert(err.message);
    }
  }

  function exportStudentsCSV() {
    if (!students.length) return;
    const rows = [
      ['Username', 'Email', 'Total Attempts', 'Best Score'],
      ...students.map((s) => [s.username, s.email, s.total_attempts, s.best_score !== null ? `${s.best_score}/10` : '—']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students-export.csv';
    a.click();
    URL.revokeObjectURL(url);
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
      video_url: question.video_url || '',
      time_limit_seconds: question.time_limit_seconds || '',
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
              onClick={() => {
                setTab(t);
                setStudentHistory(null);
                setSessionDetail(null);
              }}
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

            {/* Session detail drill-down */}
            {sessionDetail ? (
              <div className="session-detail">
                <button className="back-link" onClick={() => setSessionDetail(null)}>
                  ← Back to attempts
                </button>
                <div className="session-detail-header">
                  <h3 className="history-title">Attempt Detail</h3>
                  <div className="session-summary">
                    <span className="session-score">Score: {sessionDetail.score}/{sessionDetail.total}</span>
                    <span className="session-time">Total time: {formatTime(sessionDetail.total_time)}</span>
                  </div>
                </div>
                <div className="session-questions">
                  {sessionDetail.results.map((r, i) => (
                    <div key={r.id} className={`session-q-item ${r.is_correct ? 'correct' : 'wrong'}`}>
                      <img src={r.image_filename} alt={`Q${i+1}`} className="session-q-img" />
                      <div className="session-q-info">
                        <div className="session-q-row">
                          <span className="session-q-num">Question {i + 1}</span>
                          <span className="session-q-time">⏱ {formatTime(r.time_taken_seconds)}</span>
                        </div>
                        <span className={`answer-tag ${r.is_correct ? 'tag-correct' : 'tag-wrong'}`}>
                          Answered: {r.chosen_option ? `${r.chosen_option} — ${r.options[r.chosen_option]}` : 'Not answered'}
                        </span>
                        {!r.is_correct && (
                          <span className="answer-tag tag-correct">
                            Correct: {r.correct_option} — {r.options[r.correct_option]}
                          </span>
                        )}
                      </div>
                      <span className={`breakdown-icon ${r.is_correct ? 'icon-correct' : 'icon-wrong'}`}>
                        {r.is_correct ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : studentHistory ? (
              <div className="student-history">
                <button className="back-link" onClick={() => setStudentHistory(null)}>
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
                        <th>Score</th>
                        <th>Total Time</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentHistory.attempts.map((a) => (
                        <tr key={a.session_id}>
                          <td>{formatIST(a.created_at)}</td>
                          <td className="score-cell">{a.correct_count}/{a.questions_answered}</td>
                          <td className="time-cell">{formatTime(a.total_time)}</td>
                          <td>
                            <button
                              className="view-history-btn"
                              onClick={() => fetchSessionDetail(a.session_id)}
                            >
                              Full Detail
                            </button>
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
                          <div className="diff-bar" style={{ width: `${q.wrong_percentage || 0}%` }} />
                        </div>
                        <span className="diff-pct">{q.wrong_percentage || 0}% wrong</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Students list */}
                <div className="section">
                  <div className="section-header">
                    <h3 className="section-title">Students</h3>
                    <button className="export-students-btn" onClick={exportStudentsCSV}>⬇ Export CSV</button>
                  </div>
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
                          <div className="edit-field">
                            <label>Video URL (YouTube)</label>
                            <input
                              value={editForm.video_url || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, video_url: e.target.value })
                              }
                              placeholder="https://youtube.com/watch?v=..."
                            />
                          </div>
                          <div className="edit-field">
                            <label>Time Limit (seconds, blank = unlimited)</label>
                            <input
                              type="number"
                              min="0"
                              value={editForm.time_limit_seconds || ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, time_limit_seconds: e.target.value })
                              }
                              placeholder="Leave blank for unlimited"
                            />
                          </div>
                          <div className="edit-actions">
                            <button className="save-btn" onClick={() => saveEdit(q.id)}>Save</button>
                            <button className="cancel-btn" onClick={() => setEditingQuestion(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
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
                          {q.video_url && (
                            <span className="q-has-video">▶ Has video</span>
                          )}
                          {q.time_limit_seconds > 0 && (
                            <span className="q-time-limit">⏱ {q.time_limit_seconds}s limit</span>
                          )}
                          <div className="q-topics">
                            {(q.topics || []).map((t) => (
                              <span key={t.id} className="q-topic-tag">{t.name}</span>
                            ))}
                            <select
                              className="topic-assign-select"
                              onChange={(e) => {
                                if (!e.target.value) return;
                                const topicId = parseInt(e.target.value);
                                const current = (q.topics || []).map(t => t.id);
                                if (!current.includes(topicId)) {
                                  saveTopics(q.id, [...current, topicId]);
                                }
                                e.target.value = '';
                              }}
                              defaultValue=""
                            >
                              <option value="">+ Add topic</option>
                              {topics.filter(t => !(q.topics || []).find(qt => qt.id === t.id)).map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                            {(q.topics || []).map((t) => (
                              <button
                                key={t.id}
                                className="topic-remove-btn"
                                onClick={() => saveTopics(q.id, (q.topics || []).filter(qt => qt.id !== t.id).map(qt => qt.id))}
                              >
                                {t.name} ✕
                              </button>
                            ))}
                          </div>
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
