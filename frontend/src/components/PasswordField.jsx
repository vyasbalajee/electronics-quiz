import React, { useState } from 'react';

// Open eye — shown when the password IS visible
function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Slashed eye — shown when the password is hidden
function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

// Password input with a show/hide toggle and a Caps Lock warning.
// Drop-in replacement for a `.auth-field` block that holds a password input.
export default function PasswordField({ label, value, onChange, placeholder, required, autoComplete }) {
  const [show, setShow] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  // Browsers only expose Caps Lock state via keyboard events, so this
  // updates as the user types (not on focus alone).
  function handleKey(e) {
    if (typeof e.getModifierState === 'function') {
      setCapsOn(e.getModifierState('CapsLock'));
    }
  }

  return (
    <div className="auth-field">
      {label && <label>{label}</label>}
      <div className="password-input-wrap">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onKeyDown={handleKey}
          onKeyUp={handleKey}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {capsOn && <span className="caps-warning">⚠ Caps Lock is on</span>}
    </div>
  );
}
