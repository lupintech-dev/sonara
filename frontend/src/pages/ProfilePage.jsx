// frontend/src/pages/ProfilePage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ListMusic, Users, UserCheck, Play, Lock, Globe, Mic2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePlayerStore } from '../store/playerStore';
import { usePlaylistStore } from '../store/playlistStore';
import { getCounts } from '../api/social';
import VerifiedBadge from '../components/common/VerifiedBadge';
import './ProfilePage.css';

function initials(name) {
  if (!name) return 'U';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function ProfilePage() {
  const { user, isAuthed } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  const likedCount = usePlayerStore(s => Object.keys(s.likedTracks).length);
  const playlists  = usePlaylistStore(s => s.playlists);
  const refresh    = usePlaylistStore(s => s.refresh);
  const update     = usePlaylistStore(s => s.update);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (!isAuthed) navigate('/login'); }, [isAuthed, navigate]);
  useEffect(() => {
    if (!user?.id) return;
    getCounts(user.id).then(setCounts).catch(() => {});
  }, [user?.id]);

  if (!user) return null;

  const display = user.display_name || user.username;
  const publicPlaylists = playlists.filter(p => p.isPublic);

  const toggleVisibility = async (pl, e) => {
    e.stopPropagation();
    try {
      await update(pl.id, { isPublic: !pl.isPublic });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="pp">
      <header className="pp-hero">
        <button className="pp-avatar" onClick={() => navigate('/settings/account')} aria-label="Edit avatar">
          {user.avatar_path
            ? <img src={user.avatar_path} alt="" />
            : <span>{initials(display)}</span>}
        </button>
        <div className="pp-meta">
          <span className="pp-label">Profile</span>
          <h1 className="pp-name">
            {display}
            {user.is_verified_artist && <VerifiedBadge size="lg" />}
          </h1>
          <p className="pp-handle">@{user.username}</p>
          {user.bio && <p className="pp-bio">{user.bio}</p>}

          {user.is_verified_artist ? (
            <div className="pp-hero-actions">
              <button
                className="pp-artist-btn primary"
                onClick={() => navigate('/artist/dashboard')}
              >
                <LayoutDashboard size={14} /> Artist Dashboard
              </button>
              <button
                className="pp-artist-btn"
                onClick={() => navigate(`/artist/${user.id}`)}
              >
                <Mic2 size={14} /> View public page
              </button>
            </div>
          ) : (
            <div className="pp-hero-actions">
              <button
                className="pp-artist-btn"
                onClick={() => navigate('/artist/apply')}
              >
                <Mic2 size={14} /> Become an Artist
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="pp-stats">
        <button className="pp-stat" onClick={() => navigate('/library/liked')}>
          <span className="pp-stat-value">{likedCount}</span>
          <span className="pp-stat-label"><Heart size={14} /> Liked songs</span>
        </button>
        <button className="pp-stat" onClick={() => navigate('/playlists')}>
          <span className="pp-stat-value">{playlists.length}</span>
          <span className="pp-stat-label"><ListMusic size={14} /> Playlists</span>
        </button>
        <button className="pp-stat" onClick={() => navigate(`/social?tab=followers&userId=${user.id}`)}>
          <span className="pp-stat-value">{counts.followers}</span>
          <span className="pp-stat-label"><Users size={14} /> Followers</span>
        </button>
        <button className="pp-stat" onClick={() => navigate(`/social?tab=following&userId=${user.id}`)}>
          <span className="pp-stat-value">{counts.following}</span>
          <span className="pp-stat-label"><UserCheck size={14} /> Following</span>
        </button>
      </div>

      <section className="pp-section">
        <h2>Public playlists</h2>
        {publicPlaylists.length === 0 ? (
          <p className="pp-empty">
            No public playlists yet.{' '}
            {playlists.length > 0 && 'Toggle one below to make it public.'}
          </p>
        ) : (
          <div className="pp-playlists">
            {publicPlaylists.map(pl => (
              <button key={pl.id} className="pp-playlist" onClick={() => navigate(`/playlist/${pl.id}`)}>
                <span className="pp-playlist-cover"><ListMusic size={28} /></span>
                <span className="pp-playlist-meta">
                  <span className="pp-playlist-name truncate">{pl.name}</span>
                  <span className="pp-playlist-count">{pl.trackCount || 0} songs</span>
                </span>
                <span className="pp-playlist-play"><Play size={16} fill="#000" /></span>
              </button>
            ))}
          </div>
        )}
      </section>

      {playlists.length > 0 && (
        <section className="pp-section">
          <h2>All playlists</h2>
          <div className="pp-playlists">
            {playlists.map(pl => (
              <div key={pl.id} className="pp-playlist pp-playlist-row" onClick={() => navigate(`/playlist/${pl.id}`)}>
                <span className="pp-playlist-cover"><ListMusic size={28} /></span>
                <span className="pp-playlist-meta">
                  <span className="pp-playlist-name truncate">{pl.name}</span>
                  <span className="pp-playlist-count">{pl.trackCount || 0} songs</span>
                </span>
                <button
                  className={`pp-visibility ${pl.isPublic ? 'public' : 'private'}`}
                  onClick={(e) => toggleVisibility(pl, e)}
                  title={pl.isPublic ? 'Make private' : 'Make public'}
                >
                  {pl.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}