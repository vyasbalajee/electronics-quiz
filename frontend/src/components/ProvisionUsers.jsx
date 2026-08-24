import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './ProvisionUsers.css';

const API = process.env.REACT_APP_API_URL;

export default function ProvisionUsers({ onBack }) {
  const { token } = useAuth();
  const [tab, setTab] = useState('single'); // 'single' | 'bulk'

  // single
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [single, setSingle] = useState({ loading: false, msg: null, err: null });

  // bulk
  const fileRef = useRef(null);
  const [bulk, setBulk] = useState({ loading: false, result: null, err: null });

  async function handleSingle(e) {
    e.preventDefault();
    setSingle({ loading: true, msg: null, err: null });
    try {
      const res = await fetch(`${API}/api/users/provision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create account');
      setSingle({
        loading: false,
        msg: `Account created for ${data.username} (${data.email}). An invite email was sent.`,
        err: null,
      });
      setName('');
      setEmail('');
    } catch (err) {
      setSingle({ loading: false, msg: null, err: err.message });
    }
  }

  async function handleBulk(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setBulk({ loading: false, result: null, err: 'Choose a CSV file first.' });
      return;
    }
    setBulk({ loading: true, result: null, err: null });
    try {
      const fd = new FormData();
      fd.append('csvFile', file);
      const res = await fetch(`${API}/api/users/provision-bulk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk upload failed');
      setBulk({ loading: false, result: data, err: null });
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setBulk({ loading: false, result: null, err: err.message });
    }
  }

  return (
    <div className="prov-wrapper">
      <div className="prov-card">
        <div className="prov-header">
          <div>
            <h2 className="prov-title">Add Users</h2>
            <p className="prov-subtitle">
              Create accounts by name and email. Each person sets their own password via
              &ldquo;Forgot Password&rdquo; on the sign-in page.
            </p>
          </div>
          <button className="prov-back" onClick={onBack}>&larr; Back</button>
        </div>

        <div className="prov-tabs">
          <button
            className={`prov-tab ${tab === 'single' ? 'active' : ''}`}
            onClick={() => setTab('single')}
          >
            Add one
          </button>
          <button
            className={`prov-tab ${tab === 'bulk' ? 'active' : ''}`}
            onClick={() => setTab('bulk')}
          >
            Bulk upload (CSV)
          </button>
        </div>

        {tab === 'single' && (
          <form className="prov-form" onSubmit={handleSingle}>
            <div className="prov-field">
              <label>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe" required />
            </div>
            <div className="prov-field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required />
            </div>
            <button className="prov-btn" type="submit" disabled={single.loading}>
              {single.loading ? 'Creating...' : 'Create account'}
            </button>
            {single.msg && <div className="prov-success">{single.msg}</div>}
            {single.err && <div className="prov-error">{single.err}</div>}
          </form>
        )}

        {tab === 'bulk' && (
          <form className="prov-form" onSubmit={handleBulk}>
            <p className="prov-note">
              Upload a CSV with two columns: <code>name</code> and <code>email</code> (one person per row).
            </p>
            <div className="prov-field">
              <label>CSV file</label>
              <input type="file" accept=".csv" ref={fileRef} />
            </div>
            <button className="prov-btn" type="submit" disabled={bulk.loading}>
              {bulk.loading ? 'Uploading...' : 'Upload CSV'}
            </button>
            {bulk.err && <div className="prov-error">{bulk.err}</div>}
            {bulk.result && (
              <div className="prov-result">
                <div className="prov-success">Created {bulk.result.created} account(s).</div>
                {bulk.result.errors && bulk.result.errors.length > 0 && (
                  <div className="prov-error">
                    <div>{bulk.result.errors.length} row(s) had problems:</div>
                    <ul>
                      {bulk.result.errors.map((er, i) => <li key={i}>{er}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
