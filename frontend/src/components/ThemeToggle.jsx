import React from 'react';
import { useAuth } from '../context/AuthContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAuth();
  const isDark = theme === 'dark';

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className={`tt-track ${isDark ? 'dark' : ''}`}>
        <span className="tt-thumb">{isDark ? '☾' : '☀'}</span>
      </span>
    </button>
  );
}
