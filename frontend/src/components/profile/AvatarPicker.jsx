// frontend/src/components/profile/AvatarPicker.jsx
import { useRef, useState } from 'react';
import { X, Upload, Loader2, Check } from 'lucide-react';
import { uploadAvatar, pickPresetAvatar } from '../../api/upload';
import { useAuth } from '../../contexts/AuthContext';
import './AvatarPicker.css';

const PRESETS = Array.from({ length: 12 }, (_, i) => `/avatars/preset-${i + 1}.svg`);

export default function AvatarPicker({ onClose }) {
  const { user, setUserDirect } = useAuth();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(user?.avatar_path || null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const path = await uploadAvatar(file);
      setPreview(path);
      setUserDirect({ ...user, avatar_path: path });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const handlePreset = async (path) => {
    const n = parseInt(path.match(/preset-(\d+)/)?.[1] || '0', 10);
    setBusy(true); setError(null);
    try {
      const newPath = await pickPresetAvatar(n);
      setPreview(newPath);
      setUserDirect({ ...user, avatar_path: newPath });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="avp-backdrop" onClick={onClose}>
      <div className="avp-modal" onClick={(e) => e.stopPropagation()}>
        <header className="avp-header">
          <h3>Choose your avatar</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="avp-preview">
          <div className="avp-avatar">
            {preview ? <img src={preview} alt="" /> : <span>U</span>}
          </div>
          <button
            className="avp-upload"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 size={16} className="avp-spin" /> : <Upload size={16} />}
            Upload photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </div>

        {error && <p className="avp-error">{error}</p>}

        <div className="avp-section">
          <h4>Or pick a preset</h4>
          <div className="avp-grid">
            {PRESETS.map((src, i) => {
              const active = preview === src;
              return (
                <button
                  key={i}
                  className={`avp-preset ${active ? 'active' : ''}`}
                  onClick={() => handlePreset(src)}
                  disabled={busy}
                >
                  <img src={src} alt={`Preset ${i + 1}`} />
                  {active && <span className="avp-check"><Check size={14} /></span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}