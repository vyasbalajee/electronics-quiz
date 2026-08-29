import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './PermissionsPanel.css';

const API = process.env.REACT_APP_API_URL;

export default function PermissionsPanel({ userId, username, onBack }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/users/${userId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to load permissions');
      setData(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => { load(); }, [load]);

  async function setPerm(permission, granted) {
    setBusy(permission);
    try {
      const res = await fetch(`${API}/api/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permission, granted }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to update permission');
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function resetPerm(permission) {
    setBusy(permission);
    try {
      const res = await fetch(`${API}/api/users/${userId}/permissions/${encodeURIComponent(permission)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to reset permission');
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="admin-loading">Loading permissions...</p>;
  if (error) {
    return (
      <div className="perm-panel">
        <button className="perm-back" onClick={onBack}>&larr; Back to Users</button>
        <p className="admin-error">{error}</p>
      </div>
    );
  }
  if (!data) return null;

  const overrideMap = {};
  for (const o of data.overrides) overrideMap[o.permission] = o.granted;
  const presetSet = new Set(data.preset);
  const effectiveSet = new Set(data.effective);
  const lockedSet = new Set(data.codeLocked || []);

  return (
    <div className="perm-panel">
      <div className="perm-panel-header">
        <button className="perm-back" onClick={onBack}>&larr; Back to Users</button>
        <div className="perm-title-block">
          <h3 className="perm-title">Permissions &mdash; {username}</h3>
          <p className="perm-subtitle">
            Role preset: <strong>{data.role}</strong>. Toggle a permission to override the preset for this user only.
          </p>
        </div>
      </div>

      {Object.entries(data.catalog).map(([category, perms]) => (
        <div key={category} className="perm-category">
          <h4 className="perm-category-name">{category}</h4>
          <div className="perm-list">
            {perms.map((perm) => {
              const locked = lockedSet.has(perm);
              const effective = effectiveSet.has(perm);
              const hasOverride = Object.prototype.hasOwnProperty.call(overrideMap, perm);
              const inPreset = presetSet.has(perm);

              let source;
              if (locked) source = 'code-locked';
              else if (hasOverride) source = overrideMap[perm] ? 'granted (override)' : 'revoked (override)';
              else source = inPreset ? 'from preset' : 'not in preset';

              return (
                <div key={perm} className={`perm-row ${effective ? 'on' : ''} ${locked ? 'locked' : ''}`}>
                  <label className="perm-toggle">
                    <input
                      type="checkbox"
                      checked={effective}
                      disabled={locked || busy === perm}
                      onChange={(e) => setPerm(perm, e.target.checked)}
                    />
                    <span className="perm-name">{perm}</span>
                  </label>
                  <div className="perm-meta">
                    <span className={`perm-source ${hasOverride ? 'override' : ''} ${locked ? 'locked' : ''}`}>
                      {locked ? '🔒 ' : ''}{source}
                    </span>
                    {hasOverride && !locked && (
                      <button className="perm-reset" disabled={busy === perm} onClick={() => resetPerm(perm)}>
                        reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
