// frontend/src/pages/AccountPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, User as UserIcon, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../api/profile';
import './AccountPage.css';

export default function AccountPage() {
  const { user, isAuthed, refreshUser, setUserDirect, logout } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthed) navigate('/login');
  }, [isAuthed, navigate]);

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
    setBusy(true);
    setError(null);
    try {
      const updated = await updateProfile({
        display_name: displayName,
        bio,
      });
      setUserDirect(updated);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2200);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="ap">
      <header className="ap-header">
        <h1>Account settings</h1>
        <p>Update how your profile appears to other listeners.</p>
      </header>

      <form className="ap-form" onSubmit={handleSave}>
        <div className="ap-avatar-row">
          <div className="ap-avatar">
            {user.avatar_path
              ? <img src={user.avatar_path} alt="" />
              : <UserIcon size={36} />}
          </div>
          <div className="ap-avatar-info">
            <strong>@{user.username}</strong>
            <span>Usernames are permanent in Sonara v1.</span>
          </div>
        </div>

        <label className="ap-field">
          <span>Display name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user.username}
            maxLength={60}
          />
          <small>Shown on your profile. Leave blank to use your username.</small>
        </label>

        <label className="ap-field">
          <span>Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell others about your taste in music…"
            rows={4}
            maxLength={500}
          />
          <small>{bio.length}/500</small>
        </label>

        {error && <p className="ap-error">{error}</p>}

        <div className="ap-actions">
          <button className="ap-save" type="submit" disabled={!dirty || busy}>
            {busy
              ? <><Loader2 size={16} className="ap-spin" /> Saving…</>
              : <><Save size={16} /> Save changes</>}
          </button>
          {savedAt && <span className="ap-saved">Saved ✓</span>}
        </div>
      </form>

      <div className="ap-danger">
        <div className="ap-danger-text">
          <strong>Log out of Sonara</strong>
          <span>You'll need to sign in again to play music.</span>
        </div>
        <button className="ap-logout" onClick={handleLogout}>
          <LogOut size={16} /> Log out
        </button>
      </div>
    </div>
  );
}