import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore auth state from localStorage on page load
  useEffect(() => {
    const stored = localStorage.getItem('user');
    const storedSession = localStorage.getItem('sessionId');
    const accessToken = localStorage.getItem('accessToken');

    if (stored && accessToken) {
      setUser(JSON.parse(stored));
      setSessionId(storedSession);
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData, tokens) => {
    setUser(userData);
    setSessionId(tokens.session?.id || null);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('accessToken', tokens.accessToken);
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
    if (tokens.session?.id) {
      localStorage.setItem('sessionId', tokens.session.id);
    }
  }, []);

  const logout = useCallback(async () => {
    const sid = sessionId || localStorage.getItem('sessionId');

    if (sid) {
      try {
        await authService.logout(sid);
      } catch (_) {
        // Best-effort logout — always clear local state
      }
    }

    setUser(null);
    setSessionId(null);
    const devId = localStorage.getItem('deviceId');
    localStorage.clear();
    if (devId) localStorage.setItem('deviceId', devId);
  }, [sessionId]);

  const isAuthenticated = !!user && !!localStorage.getItem('accessToken');

  return (
    <AuthContext.Provider value={{ user, setUser, sessionId, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
