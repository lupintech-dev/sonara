// frontend/src/components/layout/TopBar.jsx
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';
import { useAuth } from '../../contexts/AuthContext';
import './TopBar.css';

export default function TopBar() {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-nav">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <button className="btn-icon" onClick={() => navigate(1)} aria-label="Forward">
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="topbar-spacer" />

      <div className="topbar-right">
        {isAuthed ? (
          <ProfileMenu />
        ) : (
          <button
            className="topbar-user"
            type="button"
            onClick={() => navigate('/login')}
          >
            <span className="topbar-user-avatar"><User size={16} /></span>
            <span>Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
}