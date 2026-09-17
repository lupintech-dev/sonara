// frontend/src/pages/AccountSettingsPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Save, Loader2, Upload, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../api/profile';
import { uploadAvatar, pickPresetAvatar } from '../api/upload';
import './AccountSettingsPage.css';

const PRESETS = Array.from({ length: 12 }, (_, i) => `/avatars/preset-${i + 1}.svg`);

function initials(name) {
  if (!name) return 'U';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function AccountSettingsPage() {
  const { user, isAuthed, setUserDirect } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  const [showPicker, setShowPicker] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { if (!isAuthed) navigate('/login'); }, [isAuthed, navigate]);
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
    }
  }, [user]);

  if (!user) return null;

  const dirty =
    (user.display_name || '') !== displayName ||
    (user.bio || '') !== bio;

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const updated = await updateProfile({ display_name: displayName, bio });
      setUserDirect(updated);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2200);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true); setError(null);
    try {
      const path = await uploadAvatar(file);
      setUserDirect({ ...user, avatar_path: path });
    } catch (err) { setError(err.message); }
    finally { setAvatarBusy(false); e.target.value = ''; }
  };

  const handlePickPreset = async (presetPath) => {
    const n = parseInt(presetPath.match(/preset-(\d+)/)?.[1] || '0', 10);
    setAvatarBusy(true); setError(null);
    try {
      const path = await pickPresetAvatar(n);
      setUserDirect({ ...user, avatar_path: path });
      setShowPicker(false);
    } catch (err) { setError(err.message); }
    finally { setAvatarBusy(false); }
  };

  return (
    <div className="asp">
      <header className="asp-header">
        <button className="btn-icon" onClick={() => navigate('/settings')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1>Account</h1>
      </header>

      <div className="asp-card">
        <div className="asp-avatar-wrap">
          <div className="asp-avatar">
            {user.avatar_path
              ? <img src={user.avatar_path} alt="" />
              : <span>{initials(user.display_name || user.username)}</span>}
            {avatarBusy && (
              <span className="asp-avatar-busy"><Loader2 size={22} className="asp-spin" /></span>
            )}
          </div>
          <div className="asp-avatar-actions">
            <button className="asp-avatar-btn primary"
              onClick={() => fileRef.current?.click()} disabled={avatarBusy}>
              <Upload size={14} /> Upload photo
            </button>
            <button className="asp-avatar-btn"
              onClick={() => setShowPicker(true)} disabled={avatarBusy}>
              <Camera size={14} /> Presets
            </button>
            <input ref={fileRef} type="file" accept="image/*"
              onChange={handleUploadFile} style={{ display: 'none' }} />
          </div>
        </div>

        <div className="asp-handle-group">
          <p className="asp-handle">@{user.username} · Usernames are permanent</p>
          {user.email && (
            <p className="asp-handle asp-handle-email">{user.email}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="asp-form">
        <label className="asp-field">
          <span>Display name</span>
          <input type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user.username}
            maxLength={60} />
          <small>Shown on your profile. Leave blank to use your username.</small>
        </label>

        <label className="asp-field">
          <span>Bio</span>
          <textarea value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others about your taste in music…"
            rows={4}
            maxLength={500} />
          <small>{bio.length}/500</small>
        </label>

        {error && <p className="asp-error">{error}</p>}

        <div className="asp-actions">
          <button className="asp-save" type="submit" disabled={!dirty || busy}>
            {busy
              ? <><Loader2 size={16} className="asp-spin" /> Saving…</>
              : <><Save size={16} /> Save changes</>}
          </button>
          {savedAt && <span className="asp-saved">Saved ✓</span>}
        </div>
      </form>

      {showPicker && (
        <div className="asp-picker-backdrop" onClick={() => setShowPicker(false)}>
          <div className="asp-picker" onClick={(e) => e.stopPropagation()}>
            <header className="asp-picker-header">
              <h3>Choose a preset</h3>
              <button className="btn-icon" onClick={() => setShowPicker(false)}><X size={20} /></button>
            </header>
            <div className="asp-picker-grid">
              {PRESETS.map((src, i) => {
                const active = user.avatar_path === src;
                return (
                  <button key={i}
                    className={`asp-preset ${active ? 'active' : ''}`}
                    onClick={() => handlePickPreset(src)}
                    disabled={avatarBusy}>
                    <img src={src} alt="" />
                    {active && <span className="asp-preset-check"><Check size={14} /></span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}