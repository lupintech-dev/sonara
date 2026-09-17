// frontend/src/components/layout/Sidebar.jsx
import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Search, Clock, User as UserIcon, Disc3, Music2,
  ListMusic, Heart, Plus, ChevronDown, MoreHorizontal, Library,
  Shield, HardDriveDownload, Sparkles, Radio as RadioIcon,
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { usePlaylistStore } from '../../store/playlistStore';
import { useHistoryStore } from '../../store/historyStore';
import { useDownloadStore } from '../../store/downloadStore';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const initialsOf = (str) => {
  if (!str) return '?';
  return str.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

const gradientFromId = (id) => {
  const palettes = [
    ['#ff6b6b', '#c92a2a'], ['#845ef7', '#5f3dc4'], ['#20c997', '#087f5b'],
    ['#ffd43b', '#e67700'], ['#4dabf7', '#1864ab'], ['#ff922b', '#d9480f'],
    ['#f783ac', '#a61e4d'], ['#a9e34b', '#5c940d'], ['#22b8cf', '#0b7285'],
    ['#f06595', '#a61e4d'], ['#748ffc', '#364fc7'], ['#e599f7', '#862e9c'],
  ];
  const idx = [...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % palettes.length;
  return `linear-gradient(135deg, ${palettes[idx][0]}, ${palettes[idx][1]})`;
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const innerRef = useRef(null);
  const thumbRef = useRef(null);
  const hideTimer = useRef(null);

  const likedTracks = usePlayerStore(s => s.likedTracks);
  const likedCount = Object.keys(likedTracks).length;
  const createPlaylist = usePlaylistStore(s => s.create);
  const playlists = usePlaylistStore(s => s.playlists);
  const refreshPlaylists = usePlaylistStore(s => s.refresh);
  const recent = useHistoryStore(s => s.recent);
  const refreshHistory = useHistoryStore(s => s.refresh);
  const downloadCount = useDownloadStore(s => Object.keys(s.entries).length);
  const refreshDownloads = useDownloadStore(s => s.refresh);

  const [libraryOpen, setLibraryOpen] = useState(true);
  const [playlistsOpen, setPlaylistsOpen] = useState(true);

  useEffect(() => {
    refreshPlaylists();
    refreshHistory();
    refreshDownloads();
  }, [refreshPlaylists, refreshHistory, refreshDownloads]);

  // ---- Custom scroll indicator (Apple Music style) ----
  useEffect(() => {
    const el = innerRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;

    const updateGeometry = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight + 1) {
        thumb.style.opacity = '0';
        return;
      }
      const trackH = clientHeight;
      const thumbH = Math.max(32, (clientHeight / scrollHeight) * trackH);
      const maxScroll = scrollHeight - clientHeight;
      const thumbTop = (scrollTop / maxScroll) * (trackH - thumbH);
      thumb.style.height = `${thumbH}px`;
      thumb.style.transform = `translateY(${thumbTop}px)`;
    };

    const showThenHide = () => {
      updateGeometry();
      thumb.style.opacity = '1';
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        thumb.style.opacity = '0';
      }, 800);
    };

    const onScroll = () => showThenHide();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateGeometry);

    // Initial position (invisible, but ready)
    updateGeometry();

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateGeometry);
      clearTimeout(hideTimer.current);
    };
  }, []);

  const handleCreate = async () => {
    const name = prompt('Playlist name?');
    if (!name?.trim()) return;
    try {
      const pl = await createPlaylist({ name: name.trim() });
      navigate(`/playlist/${pl.id}`);
    } catch (err) { alert(err.message); }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar sidebar-am">
      <div className="sidebar-glow" aria-hidden="true" />

      <div className="sidebar-inner" ref={innerRef}>
        <div className="sidebar-logo">
          <img src="/sonara-logo.png" alt="" className="logo-mark" />
          <span className="logo-text">Sonara</span>
        </div>

        <nav className="sidebar-topnav">
          <NavLink to="/" end className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Home size={20} /><span>Home</span>
          </NavLink>
          <NavLink to="/search" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Search size={20} /><span>Search</span>
          </NavLink>
          <NavLink to="/radio" className={({isActive}) => `nav-item nav-item-radio ${isActive ? 'active' : ''}`}>
            <RadioIcon size={20} /><span>Radio</span>
            <span className="nav-item-live-pill">LIVE</span>
          </NavLink>
          <NavLink to="/ai-playlist" className={({isActive}) => `nav-item nav-item-ai ${isActive ? 'active' : ''}`}>
            <Sparkles size={20} /><span>AI Playlist</span>
          </NavLink>
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <button className="sidebar-section-title" onClick={() => setLibraryOpen(o => !o)}>
              <Library size={18} />
              <span>Library</span>
            </button>
            <div className="sidebar-section-actions">
              <button className="sidebar-section-icon" onClick={() => navigate('/library')} title="Open library">
                <MoreHorizontal size={16} />
              </button>
              <button className="sidebar-section-icon" onClick={() => setLibraryOpen(o => !o)} title={libraryOpen ? 'Collapse' : 'Expand'}>
                <ChevronDown size={16} className={libraryOpen ? '' : 'collapsed'} />
              </button>
            </div>
          </div>

          {libraryOpen && (
            <nav className="sidebar-subnav">
              <button className={`sidebar-subitem ${isActive('/library/recent') ? 'active' : ''}`} onClick={() => navigate('/library/recent')}>
                <Clock size={18} /><span>Recently Added</span>
              </button>
              <button className={`sidebar-subitem ${isActive('/library/artists') ? 'active' : ''}`} onClick={() => navigate('/library/artists')}>
                <UserIcon size={18} /><span>Artists</span>
              </button>
              <button className={`sidebar-subitem ${isActive('/library/albums') ? 'active' : ''}`} onClick={() => navigate('/library/albums')}>
                <Disc3 size={18} /><span>Albums</span>
              </button>
              <button className={`sidebar-subitem ${isActive('/library/songs') ? 'active' : ''}`} onClick={() => navigate('/library/songs')}>
                <Music2 size={18} /><span>Songs</span>
                {likedCount > 0 && <span className="sidebar-subitem-count">{likedCount}</span>}
              </button>
              <button className={`sidebar-subitem ${isActive('/downloads') ? 'active' : ''}`} onClick={() => navigate('/downloads')}>
                <HardDriveDownload size={18} /><span>Downloads</span>
                {downloadCount > 0 && <span className="sidebar-subitem-count">{downloadCount}</span>}
              </button>
            </nav>
          )}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <button className="sidebar-section-title" onClick={() => setPlaylistsOpen(o => !o)}>
              <ListMusic size={18} />
              <span>Playlists</span>
            </button>
            <div className="sidebar-section-actions">
              <button className="sidebar-section-icon" onClick={handleCreate} title="New playlist">
                <Plus size={16} />
              </button>
              <button className="sidebar-section-icon" onClick={() => setPlaylistsOpen(o => !o)} title={playlistsOpen ? 'Collapse' : 'Expand'}>
                <ChevronDown size={16} className={playlistsOpen ? '' : 'collapsed'} />
              </button>
            </div>
          </div>

          {playlistsOpen && (
            <nav className="sidebar-subnav">
              <button className={`sidebar-subitem ${isActive('/playlists') ? 'active' : ''}`} onClick={() => navigate('/playlists')}>
                <ListMusic size={18} /><span>All Playlists</span>
              </button>
              <button className={`sidebar-subitem ${isActive('/library/liked') ? 'active' : ''}`} onClick={() => navigate('/library/liked')}>
                <Heart size={18} fill="currentColor" /><span>Favourite Songs</span>
                {likedCount > 0 && <span className="sidebar-subitem-count">{likedCount}</span>}
              </button>

              {playlists.map(pl => {
                const isActivePl = isActive(`/playlist/${pl.id}`);
                return (
                  <button
                    key={pl.id}
                    className={`sidebar-playlist-row ${isActivePl ? 'active' : ''}`}
                    onClick={() => navigate(`/playlist/${pl.id}`)}
                  >
                    <span
                      className="sidebar-playlist-thumb"
                      style={{
                        background: pl.firstTrackImage
                          ? `url(${pl.firstTrackImage}) center/cover`
                          : gradientFromId(pl.id),
                      }}
                    >
                      {!pl.firstTrackImage && (
                        <span className="sidebar-playlist-thumb-initials">
                          {initialsOf(pl.name)}
                        </span>
                      )}
                    </span>
                    <span className="sidebar-playlist-name truncate">{pl.name}</span>
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {user?.is_admin && (
          <>
            <div className="sidebar-divider" />
            <nav className="sidebar-subnav">
              <button
                className={`sidebar-subitem sidebar-subitem-admin ${isActive('/admin') ? 'active' : ''}`}
                onClick={() => navigate('/admin')}
              >
                <Shield size={18} />
                <span>Admin</span>
              </button>
            </nav>
          </>
        )}

        <div className="sidebar-footer">
          <p className="sidebar-hint">Powered by Jamendo & Audius</p>
        </div>
      </div>

      {/* Floating scroll indicator — hidden until scrolling, then fades out */}
      <div className="sidebar-scroll-thumb" ref={thumbRef} aria-hidden="true" />
    </aside>
  );
}