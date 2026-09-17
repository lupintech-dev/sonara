// frontend/src/pages/LoginPage.jsx
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    display_name: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const { login, register } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const update = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login({ username: form.username, password: form.password });
      } else {
        await register({
          username: form.username,
          email: form.email || undefined,
          password: form.password,
          display_name: form.display_name || undefined,
        });
      }
      window.location.href = from || '/';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-brand">
        <div className="login-logo">
          <img src="/sonara-logo.png" alt="" className="login-logo-img" />
          <span>Sonara</span>
        </div>
        <h1 className="login-tagline">Millions of tracks. One player.</h1>
        <p className="login-blurb">
          Free, unlimited streaming from independent artists on Audius and Jamendo.
        </p>
      </aside>

      <main className="login-form-side">
        <form className="login-form" onSubmit={submit}>
          <header className="login-form-header">
            <h2>{mode === 'login' ? 'Log in to Sonara' : 'Sign up free'}</h2>
            {mode === 'register' && (
              <p>Free forever. No credit card needed.</p>
            )}
          </header>

          <div className="login-fields">
            <label className="login-field">
              <span>{mode === 'login' ? 'Username or email' : 'Username'}</span>
              <input
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={update('username')}
                placeholder={mode === 'login' ? 'you@example.com or username' : 'your_username'}
                required
                autoFocus
              />
            </label>

            {mode === 'register' && (
              <>
                <label className="login-field">
                  <span>Email <em>(optional)</em></span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={update('email')}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="login-field">
                  <span>Display name <em>(optional)</em></span>
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={update('display_name')}
                    placeholder="What should people see?"
                  />
                </label>
              </>
            )}

            <label className="login-field">
              <span>Password</span>
              <div className="login-pw-wrap">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={form.password}
                  onChange={update('password')}
                  placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                  required
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowPw(s => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit" type="submit" disabled={busy}>
            {busy
              ? <><Loader2 size={16} className="login-spin" /> Please wait…</>
              : (mode === 'login' ? 'Log in' : 'Create account')}
          </button>

          <p className="login-switch">
            {mode === 'login' ? (
              <>Don't have an account? <button type="button" onClick={() => { setMode('register'); setError(null); }}>Sign up free</button></>
            ) : (
              <>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(null); }}>Log in</button></>
            )}
          </p>
        </form>
      </main>
    </div>
  );
}