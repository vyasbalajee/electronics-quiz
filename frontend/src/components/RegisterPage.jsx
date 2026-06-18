import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import OTPVerification from './OTPVerification';
import './AuthPages.css';

const API = process.env.REACT_APP_API_URL;

export default function RegisterPage({ onSwitch }) {
  const { login } = useAuth();
  const [screen, setScreen] = useState('register'); // 'register' | 'verify'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [pendingEmail, setPendingEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPendingEmail(form.email);
      setScreen('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (screen === 'verify') {
    return (
      <OTPVerification
        email={pendingEmail}
        type="email_verification"
        onSuccess={(data) => login(data.token, data.user)}
        onBack={() => setScreen('register')}
      />
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-icon">⚡</div>
        <h1 className="auth-title">Electronics Quiz</h1>
        <h2 className="auth-subtitle">Create Account</h2>
        <p className="auth-note">New accounts are assigned the student role by default.</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Choose a username"
              required
            />
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account?{' '}
          <button className="auth-switch-btn" onClick={onSwitch}>Sign In</button>
        </p>
      </div>
    </div>
  );
}
