import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext(null);

const API = process.env.REACT_APP_API_URL;
const ROLE_CHECK_INTERVAL = 60 * 1000; // re-check role + maintenance every 60 seconds

function isExempt(u) {
  return !!u && (u.role === 'admin' || u.is_test_account === true);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [roleChangedMessage, setRoleChangedMessage] = useState(null);
  const [maintenance, setMaintenance] = useState(false);
  const [quizInProgress, setQuizInProgress] = useState(false);

  const userRef = useRef(user);
  // Counter, not a boolean: QuizPage and ResultsPage each increment on mount and
  // decrement on unmount, so the flow never reads "ended" during the route transition
  // between them (which would log a finishing student out before they see results).
  const quizFlowCountRef = useRef(0);
  const pendingMaintLogoutRef = useRef(false);

  useEffect(() => { userRef.current = user; }, [user]);

  // Reflect the theme onto <html data-theme> and cache it for next load (no flash).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
  }, [theme]);

  // Apply a saved theme (e.g. from the server) without persisting back.
  function applyTheme(next) {
    if (next === 'light' || next === 'dark') setThemeState(next);
  }

  // User-initiated toggle: flip, cache locally, and persist to the server if signed in.
  function toggleTheme() {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      const activeToken = localStorage.getItem('token');
      if (activeToken) {
        fetch(`${API}/api/auth/me/theme`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeToken}` },
          body: JSON.stringify({ theme: next }),
        }).catch(() => { /* best-effort; localStorage already holds it */ });
      }
      return next;
    });
  }

  // Decide what maintenance means for the current user
  function applyMaintenance(isOn, currentUser) {
    setMaintenance(isOn);
    if (!isOn) {
      pendingMaintLogoutRef.current = false;
      return;
    }
    if (isExempt(currentUser)) return;      // admins + test accounts stay
    if (!currentUser) return;               // logged-out visitor: dialog handles it
    // Non-exempt logged-in user: log out — unless mid-quiz, then defer until done
    if (quizFlowCountRef.current > 0) {
      pendingMaintLogoutRef.current = true;
    } else {
      logout();
    }
  }

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        // No session — still check maintenance so visitors see the dialog
        try {
          const res = await fetch(`${API}/api/maintenance/status`);
          if (res.ok) {
            const data = await res.json();
            setMaintenance(data.enabled === true);
          }
        } catch {
          // ignore
        }
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.tokenStale) {
            setRoleChangedMessage(
              `Your role was changed to "${data.user.role}". Please sign in again to continue.`
            );
            logout();
            setLoading(false);
            return;
          }
          setUser(data.user);
          if (data.user.theme_preference) applyTheme(data.user.theme_preference);
          applyMaintenance(data.maintenance === true, data.user);
        } else {
          logout();
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    }
    verifyToken();
  }, []);

  // Periodically re-check role + maintenance from the server
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.tokenStale) {
          setRoleChangedMessage(
            `Your role was changed to "${data.user.role}". Please sign in again to continue.`
          );
          logout();
          return;
        }
        applyMaintenance(data.maintenance === true, userRef.current);
      } catch {
        // ignore transient errors
      }
    }, ROLE_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [token]);

  // Quiz flow tracking (used to defer a maintenance logout until a quiz is finished)
  function enterQuizFlow() {
    quizFlowCountRef.current += 1;
    setQuizInProgress(true);
  }

  function exitQuizFlow() {
    quizFlowCountRef.current = Math.max(0, quizFlowCountRef.current - 1);
    const active = quizFlowCountRef.current > 0;
    setQuizInProgress(active);
    if (!active && pendingMaintLogoutRef.current) {
      pendingMaintLogoutRef.current = false;
      logout();
    }
  }

  function login(token, user) {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
    if (user && user.theme_preference) applyTheme(user.theme_preference);
    setRoleChangedMessage(null);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        loading,
        roleChangedMessage,
        maintenance,
        setMaintenance,
        quizInProgress,
        enterQuizFlow,
        exitQuizFlow,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
