// frontend/src/components/layout/ProfileMenu.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, ChevronDown, Mic2, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './ProfileMenu.css';

function initials(name) {
  if (!name) return 'U';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (!user) return null;

  const display = user.display_name || user.username;

  const handle = (fn) => (e) => {
    e.stopPropagation();
    fn();
    setOpen(false);
  };

  return (
    <div className="profile-menu" ref={ref}>
      <button
        className="profile-menu-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="profile-avatar">
          {user.avatar_path
            ? <img src={user.avatar_path} alt="" />
            : <span>{initials(display)}</span>}
        </span>
        <span className="profile-name">{display}</span>
        <ChevronDown size={14} className={`profile-caret ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="profile-popover" role="menu">
          <div className="profile-popover-head">
            <span className="profile-popover-avatar">
              {user.avatar_path
                ? <img src={user.avatar_path} alt="" />
                : <span>{initials(display)}</span>}
            </span>
            <div className="profile-popover-meta">
              <span className="profile-popover-name truncate">{display}</span>
              <span className="profile-popover-handle truncate">@{user.username}</span>
            </div>
          </div>

          <div className="profile-popover-sep" />

          <button className="profile-item" onClick={handle(() => navigate('/profile'))} role="menuitem">
            <User size={16} /> <span>Profile</span>
          </button>

          <button className="profile-item" onClick={handle(() => navigate('/wrapped'))} role="menuitem">
            <Sparkles size={16} /> <span>Your Wrapped</span>
          </button>

          {user.is_verified_artist ? (
            <button className="profile-item" onClick={handle(() => navigate('/artist/dashboard'))} role="menuitem">
              <Mic2 size={16} /> <span>Artist Dashboard</span>
            </button>
          ) : (
            <button className="profile-item" onClick={handle(() => navigate('/artist/apply'))} role="menuitem">
              <Mic2 size={16} /> <span>Become an Artist</span>
            </button>
          )}

          <button className="profile-item" onClick={handle(() => navigate('/settings'))} role="menuitem">
            <Settings size={16} /> <span>Settings</span>
          </button>

          <div className="profile-popover-sep" />

          <button className="profile-item danger" onClick={handle(() => { logout(); navigate('/'); })} role="menuitem">
            <LogOut size={16} /> <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}