// frontend/src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { getStoredUser, getToken } from '../utils/auth';
import * as authApi from '../api/auth';
import { usePlayerStore } from '../store/playerStore';
import { useDownloadStore } from '../store/downloadStore';
import { useSearchStore } from '../store/searchStore';
import { useSettingsStore } from '../store/settingsStore';
import { ownerOf } from '../utils/likeStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  // Whenever the logged-in user changes, tell every owner-scoped store
  // to switch its cache so we never leak data between accounts.
  const switchOwner = (u) => {
    const owner = ownerOf(u);
    try { usePlayerStore.getState().setOwner(owner); } catch {}
    try { useSearchStore.getState().setOwner(owner); } catch {}
    try { useSettingsStore.getState().setOwner(owner); } catch {}
    try { useDownloadStore.getState().reset(); useDownloadStore.getState().refresh(); } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      const fresh = await authApi.fetchMe();
      if (cancelled) return;
      if (fresh) {
        setUser(fresh);
        localStorage.setItem('sonara_user', JSON.stringify(fresh));
        switchOwner(fresh);
      } else {
        authApi.logout();
        setUser(null);
        switchOwner(null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const login = async (credentials) => {
    const { user: u } = await authApi.login(credentials);
    setUser(u);
    switchOwner(u);
    return u;
  };

  const register = async (payload) => {
    const { user: u } = await authApi.register(payload);
    setUser(u);
    switchOwner(u);
    return u;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    switchOwner(null);
    usePlayerStore.getState().stopPlayback();
    window.location.href = '/';
  };

  const refreshUser = async () => {
    const fresh = await authApi.fetchMe();
    if (fresh) {
      setUser(fresh);
      localStorage.setItem('sonara_user', JSON.stringify(fresh));
      switchOwner(fresh);
    }
    return fresh;
  };

  const setUserDirect = (u) => {
    setUser(u);
    if (u) localStorage.setItem('sonara_user', JSON.stringify(u));
    switchOwner(u);
  };

  const value = {
    user,
    loading,
    isAuthed: !!user,
    login,
    register,
    logout,
    refreshUser,
    setUserDirect,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}