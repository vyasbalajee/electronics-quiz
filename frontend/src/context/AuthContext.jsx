import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext(null);

const API = process.env.REACT_APP_API_URL;
const ROLE_CHECK_INTERVAL = 60 * 1000; // re-check role every 60 seconds

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [roleChangedMessage, setRoleChangedMessage] = useState(null);
  const userRef = useRef(user);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
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

  // Periodically re-check the user's role from the server
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const current = userRef.current;
        if (current && data.user && data.user.role !== current.role) {
          // Role changed — token is stale, force re-login for a fresh token
          setRoleChangedMessage(
            `Your role was changed to "${data.user.role}". Please sign in again to continue.`
          );
          logout();
        }
      } catch {
        // ignore transient errors
      }
    }, ROLE_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [token]);

  function login(token, user) {
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
    setRoleChangedMessage(null);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, roleChangedMessage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
