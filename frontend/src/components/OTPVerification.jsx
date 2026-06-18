import React, { useState } from 'react';
import './AuthPages.css';

const API = process.env.REACT_APP_API_URL;

export default function OTPVerification({ email, type, onSuccess, onBack }) {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const isReset = type === 'password_reset';

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = isReset ? '/api/auth/reset-password' : '/api/auth/verify-email';
      const body = isReset
        ? { email, otp, newPassword }
        : { email, otp };

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      const endpoint = isReset ? '/api/auth/forgot-password' : '/api/auth/resend-verification';
      await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-icon">📧</div>
        <h1 className="auth-title">Electronics Quiz</h1>
        <h2 className="auth-subtitle">
          {isReset ? 'Reset Password' : 'Verify Email'}
        </h2>
        <p className="auth-note">
          Enter the 6-digit code sent to <strong>{email}</strong>
        </p>
        {error && <div className="auth-error">{error}</div>}
        {resent && <div className="auth-success">Code resent successfully</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Verification Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
            />
          </div>
          {isReset && (
            <div className="auth-field">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>
          )}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Verifying...' : isReset ? 'Reset Password' : 'Verify Email'}
          </button>
        </form>
        <div className="otp-actions">
          <button className="auth-switch-btn" onClick={handleResend}>
            Resend code
          </button>
          {onBack && (
            <button className="auth-switch-btn" onClick={onBack}>
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
