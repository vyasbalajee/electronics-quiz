import React from 'react';
import './LandingPage.css';

export default function LandingPage({ onSelectRole }) {
  return (
    <div className="landing-wrapper">
      <div className="landing-card">
        <div className="landing-icon">⚡</div>
        <h1 className="landing-title">Electronics Quiz</h1>
        <p className="landing-subtitle">Select your role to continue</p>
        <div className="role-buttons">
          <button
            className="role-btn role-instructor"
            onClick={() => onSelectRole('instructor')}
          >
            <span className="role-btn-icon">🎓</span>
            <span className="role-btn-label">Instructor</span>
            <span className="role-btn-desc">Upload questions and manage content</span>
          </button>
          <button
            className="role-btn role-student"
            onClick={() => onSelectRole('student')}
          >
            <span className="role-btn-icon">📝</span>
            <span className="role-btn-label">Student</span>
            <span className="role-btn-desc">Take the electronics quiz</span>
          </button>
        </div>
      </div>
    </div>
  );
}
