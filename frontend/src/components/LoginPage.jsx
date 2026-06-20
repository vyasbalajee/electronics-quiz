import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import OTPVerification from './OTPVerification';
import './AuthPages.css';

const API = process.env.REACT_APP_API_URL;

export default function LoginPage({ onSwitch }) {
  const { login, roleChangedMessage } = useAuth();
  const [screen, setScreen] = useState('login'); // 'login' | 'forgot' | 'otp'
  const [form, setForm] = useState({ username: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresVerification) {
          setPendingEmail(data.email);
          setScreen('verify');
          return;
        }
        throw new Error(data.error);
      }
      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPendingEmail(forgotEmail);
      setScreen('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (screen === 'otp') {
    return (
      <OTPVerification
        email={pendingEmail}
        type="password_reset"
        onSuccess={() => { setMessage('Password reset successfully. Please sign in.'); setScreen('login'); }}
        onBack={() => setScreen('forgot')}
      />
    );
  }

  if (screen === 'verify') {
    return (
      <OTPVerification
        email={pendingEmail}
        type="email_verification"
        onSuccess={(data) => login(data.token, data.user)}
        onBack={() => setScreen('login')}
      />
    );
  }

  if (screen === 'forgot') {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-icon">🔑</div>
          <h1 className="auth-title">Electronics Quiz</h1>
          <h2 className="auth-subtitle">Forgot Password</h2>
          <p className="auth-note">Enter your email and we'll send a reset code.</p>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleForgot} className="auth-form">
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
          <button className="auth-switch-btn" onClick={() => setScreen('login')}>← Back to Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-icon">⚡</div>
        <h1 className="auth-title">Electronics Quiz</h1>
        <h2 className="auth-subtitle">Sign In</h2>
        {roleChangedMessage && <div className="auth-error">{roleChangedMessage}</div>}
        {message && <div className="auth-success">{message}</div>}
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-field">
            <label>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <button className="auth-switch-btn forgot-link" onClick={() => { setScreen('forgot'); setError(null); }}>
          Forgot password?
        </button>
        <p className="auth-switch">
          Don't have an account?{' '}
          <button className="auth-switch-btn" onClick={onSwitch}>Register</button>
        </p>
      </div>
    </div>
  );
}
