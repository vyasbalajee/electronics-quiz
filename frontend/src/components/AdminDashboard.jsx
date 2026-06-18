import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

const API = process.env.REACT_APP_API_URL;

export default function AdminDashboard({ onNavigate }) {
  const { token, logout } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [topics, setTopics] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    if (tab === 'topics') fetchTopics();
  }, [tab]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTopics() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/topics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopics(data.topics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createTopic() {
    if (!newTopic.trim()) return;
    try {
      const res = await fetch(`${API}/api/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newTopic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopics((prev) => [...prev, data.topic]);
      setNewTopic('');
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteTopic(id, name) {
    if (!window.confirm(`Delete topic "${name}"?`)) return;
    try {
      await fetch(`${API}/api/topics/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function updateRole(userId, newRole) {
    setUpdating(userId);
    try {
      const res = await fetch(`${API}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdating(null);
    }
  }

  async function deleteUser(userId, username) {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    try {
      const res = await fetch(`${API}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err.message);
    }
  }

  const roleBadge = (role) => {
    const colors = { admin: '#f0a500', instructor: '#00d4aa', student: '#8b949e' };
    return (
      <span className="role-badge" style={{ color: colors[role], borderColor: colors[role] }}>
        {role}
      </span>
    );
  };

  return (
    <div className="admin-wrapper">
      <div className="admin-card">
        <div className="admin-header">
          <div>
            <h2 className="admin-title">Admin Dashboard</h2>
            <p className="admin-subtitle">Manage users, roles and topics</p>
          </div>
          <div className="admin-header-actions">
            <button className="nav-action-btn" onClick={() => onNavigate('instructor')}>
              Instructor Panel
            </button>
            <button className="nav-action-btn logout" onClick={logout}>Sign Out</button>
          </div>
        </div>

        <div className="admin-tabs">
          {['users', 'topics'].map((t) => (
            <button
              key={t}
              className={`admin-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading && <p className="admin-loading">Loading...</p>}
        {error && <p className="admin-error">{error}</p>}

        {/* Users Tab */}
        {tab === 'users' && !loading && (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Verified</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="td-username">{u.username}</td>
                    <td className="td-email">{u.email}</td>
                    <td>
                      <span style={{ color: u.email_verified ? 'var(--correct)' : 'var(--wrong)', fontSize: 13 }}>
                        {u.email_verified ? '✓ Verified' : '✗ Unverified'}
                      </span>
                    </td>
                    <td>{roleBadge(u.role)}</td>
                    <td className="td-date">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="td-actions">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        disabled={updating === u.id}
                        className="role-select"
                      >
                        <option value="student">student</option>
                        <option value="instructor">instructor</option>
                        <option value="admin">admin</option>
                      </select>
                      <button className="delete-btn" onClick={() => deleteUser(u.id, u.username)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Topics Tab */}
        {tab === 'topics' && !loading && (
          <div className="topics-content">
            <div className="topic-create">
              <input
                className="topic-input"
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="New topic name..."
                onKeyDown={(e) => e.key === 'Enter' && createTopic()}
              />
              <button className="topic-create-btn" onClick={createTopic}>
                Add Topic
              </button>
            </div>
            {topics.length === 0 ? (
              <p className="empty-msg">No topics yet. Create one above.</p>
            ) : (
              <div className="topics-list">
                {topics.map((t) => (
                  <div key={t.id} className="topic-item">
                    <span className="topic-name">{t.name}</span>
                    <button className="topic-delete-btn" onClick={() => deleteTopic(t.id, t.name)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
