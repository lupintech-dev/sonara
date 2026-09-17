// frontend/src/pages/Library.jsx
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Heart, ListMusic, Users, Disc3, Play, Plus, Clock, FolderPlus } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { usePlaylistStore } from '../store/playlistStore';
import { useHistoryStore } from '../store/historyStore';
import { fetchFavorites } from '../api/favorites';
import TrackRow from '../components/common/TrackRow';
import FolderCard from '../components/common/FolderCard';
import './Library.css';

const TABS = [
  { id: 'recent',    label: 'Recently Played', icon: Clock },
  { id: 'liked',     label: 'Liked Songs',     icon: Heart },
  { id: 'playlists', label: 'Playlists',       icon: ListMusic },
  { id: 'artists',   label: 'Artists',         icon: Users },
  { id: 'albums',    label: 'Albums',          icon: Disc3 },
];

function isMobileNow() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

export default function Library() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  // On mobile the CSS re-orders tabs so "Liked Songs" is first.
  // The default landing tab should match that visible order.
  const [isMobile, setIsMobile] = useState(isMobileNow);

  useEffect(() => {
    const onResize = () => setIsMobile(isMobileNow());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const defaultTab = isMobile ? 'liked' : 'recent';
  const activeTab = params.get('tab') || defaultTab;

  const likedTracks = usePlayerStore(s => s.likedTracks);
  const hydrateFavorites = usePlayerStore(s => s.hydrateFavorites);
  const playTracks  = usePlayerStore(s => s.playTracks);

  const playlists = usePlaylistStore(s => s.playlists);
  const folders   = usePlaylistStore(s => s.folders);
  const refreshPlaylists = usePlaylistStore(s => s.refresh);
  const createPlaylist = usePlaylistStore(s => s.create);
  const createFolder   = usePlaylistStore(s => s.createFolder);

  const recent = useHistoryStore(s => s.recent);
  const refreshHistory = useHistoryStore(s => s.refresh);

  useEffect(() => {
    let cancelled = false;
    fetchFavorites()
      .then(tracks => { if (!cancelled && tracks.length) hydrateFavorites(tracks); })
      .catch(err => console.warn('[library] favorites fetch failed:', err.message));
    return () => { cancelled = true; };
  }, [hydrateFavorites]);

  useEffect(() => { refreshPlaylists(); }, [refreshPlaylists]);
  useEffect(() => { refreshHistory(); }, [refreshHistory]);

  const likedList = useMemo(() => Object.values(likedTracks), [likedTracks]);

  const counts = {
    recent: recent.length,
    liked: likedList.length,
    playlists: playlists.length + folders.length,
    artists: 0,
    albums: 0,
  };

  const handlePlayAll = () => { if (likedList.length) playTracks(likedList, 0); };
  const handlePlayRecent = () => { if (recent.length) playTracks(recent, 0); };

  const handleCreate = async () => {
    const name = prompt('Playlist name?');
    if (!name?.trim()) return;
    try {
      const pl = await createPlaylist({ name: name.trim() });
      navigate(`/playlist/${pl.id}`);
    } catch (err) { alert(err.message); }
  };

  const handleCreateFolder = async () => {
    const name = prompt('Folder name?');
    if (!name?.trim()) return;
    try {
      await createFolder(name.trim());
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="library">
      <header className="library-header">
        <h1>Your Library</h1>
      </header>

      <nav className="library-tabs" role="tablist">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              data-tab={tab.id}
              className={`library-tab ${active ? 'active' : ''}`}
              onClick={() => setParams({ tab: tab.id })}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {counts[tab.id] > 0 && (
                <span className="library-tab-count">{counts[tab.id]}</span>
              )}
            </button>
          );
        })}
      </nav>

      <section className="library-body">
        {activeTab === 'recent' && (
          <RecentTab tracks={recent} onPlayAll={handlePlayRecent} />
        )}
        {activeTab === 'liked' && (
          <LikedTab tracks={likedList} onPlayAll={handlePlayAll} />
        )}
        {activeTab === 'playlists' && (
          <PlaylistsTab
            playlists={playlists}
            folders={folders}
            onCreate={handleCreate}
            onCreateFolder={handleCreateFolder}
            onOpen={(id) => navigate(`/playlist/${id}`)}
            onOpenFolder={(id) => navigate(`/playlists/folder/${id}`)}
          />
        )}
        {activeTab === 'artists' && (
          <EmptyTab icon={Users} title="No artists followed"
            hint="Artists you follow will show up here." />
        )}
        {activeTab === 'albums' && (
          <EmptyTab icon={Disc3} title="No albums saved"
            hint="Albums you save will show up here." />
        )}
      </section>
    </div>
  );
}

function RecentTab({ tracks, onPlayAll }) {
  if (tracks.length === 0) {
    return (
      <div className="library-empty">
        <div className="library-empty-art recent"><Clock size={56} /></div>
        <h2>Nothing played yet</h2>
        <p>Tracks you play will appear here.</p>
      </div>
    );
  }
  return (
    <>
      <div className="library-actions">
        <button className="library-play-all" onClick={onPlayAll} aria-label="Play recent">
          <Play size={22} fill="#000" />
        </button>
        <span className="library-actions-label">
          {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
        </span>
      </div>
      <div className="track-list">
        {tracks.map((track, i) => (
          <TrackRow key={`${track.id}-${i}`} track={track} queue={tracks} />
        ))}
      </div>
    </>
  );
}

function LikedTab({ tracks, onPlayAll }) {
  if (tracks.length === 0) {
    return (
      <div className="library-empty">
        <div className="library-empty-art liked"><Heart size={64} fill="#fff" /></div>
        <h2>Songs you like will appear here</h2>
        <p>Save songs by tapping the heart icon.</p>
      </div>
    );
  }
  return (
    <>
      <div className="library-hero">
        <div className="library-hero-art liked"><Heart size={56} fill="#fff" /></div>
        <div className="library-hero-info">
          <span className="library-hero-label">Playlist</span>
          <h1 className="library-hero-title">Liked Songs</h1>
          <p className="library-hero-meta">
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
          </p>
        </div>
      </div>
      <div className="library-actions">
        <button className="library-play-all" onClick={onPlayAll} aria-label="Play all liked songs">
          <Play size={22} fill="#000" />
        </button>
      </div>
      <div className="track-list">
        {tracks.map(track => <TrackRow key={track.id} track={track} queue={tracks} />)}
      </div>
    </>
  );
}

function PlaylistsTab({ playlists, folders, onCreate, onCreateFolder, onOpen, onOpenFolder }) {
  const foldedIds = new Set(folders.flatMap(f => f.playlists.map(p => p.id)));
  const unfolded = playlists.filter(p => !foldedIds.has(p.id));
  const isEmpty = playlists.length === 0 && folders.length === 0;

  return (
    <>
      <div className="library-actions library-actions-btns">
        <button className="btn-primary" onClick={onCreate}>
          <Plus size={16} className="btn-icon-inline" />
          New Playlist
        </button>
        <button className="btn-secondary" onClick={onCreateFolder}>
          <FolderPlus size={16} className="btn-icon-inline" />
          New Folder
        </button>
      </div>

      {isEmpty ? (
        <div className="library-empty">
          <div className="library-empty-art"><ListMusic size={56} /></div>
          <h2>Create your first playlist</h2>
          <p>Or group things with a folder.</p>
        </div>
      ) : (
        <>
          {folders.length > 0 && (
            <div className="library-subsection">
              <h3 className="library-subsection-title">Folders</h3>
              <div className="folder-card-grid">
                {folders.map(f => (
                  <FolderCard key={f.id} folder={f} onOpen={() => onOpenFolder(f.id)} />
                ))}
              </div>
            </div>
          )}

          {unfolded.length > 0 && (
            <div className="library-subsection">
              {folders.length > 0 && (
                <h3 className="library-subsection-title">All playlists</h3>
              )}
              <div className="pl-grid">
                {unfolded.map(pl => (
                  <button key={pl.id} className="pl-card" onClick={() => onOpen(pl.id)}>
                    <div
                      className="pl-card-cover"
                      style={pl.firstTrackImage ? { background: `url(${pl.firstTrackImage}) center/cover` } : undefined}
                    >
                      {!pl.firstTrackImage && <ListMusic size={40} />}
                    </div>
                    <div className="pl-card-meta">
                      <span className="pl-card-name truncate">{pl.name}</span>
                      <span className="pl-card-count">
                        {pl.trackCount || 0} {pl.trackCount === 1 ? 'song' : 'songs'}
                        {pl.isCollaborative && ' · collaborative'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {folders.length > 0 && unfolded.length === 0 && (
            <p className="library-hint">All your playlists are organised into folders.</p>
          )}
        </>
      )}
    </>
  );
}

function EmptyTab({ icon: Icon, title, hint }) {
  return (
    <div className="library-empty">
      <div className="library-empty-art"><Icon size={56} /></div>
      <h2>{title}</h2>
      <p>{hint}</p>
    </div>
  );
}