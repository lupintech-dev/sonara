// frontend/src/pages/LibrarySongs.jsx
import { useEffect, useMemo } from 'react';
import { Heart, Play } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { fetchFavorites } from '../api/favorites';
import TrackRow from '../components/common/TrackRow';
import './Library.css';

export default function LibrarySongs() {
  const likedTracks = usePlayerStore(s => s.likedTracks);
  const hydrate = usePlayerStore(s => s.hydrateFavorites);
  const playTracks = usePlayerStore(s => s.playTracks);

  useEffect(() => {
    fetchFavorites().then(t => t.length && hydrate(t)).catch(() => {});
  }, [hydrate]);

  const songs = useMemo(() => Object.values(likedTracks), [likedTracks]);

  if (songs.length === 0) {
    return (
      <div className="library-empty">
        <div className="library-empty-art liked"><Heart size={64} fill="#fff" /></div>
        <h2>Songs you like will appear here</h2>
        <p>Save songs by tapping the heart icon.</p>
      </div>
    );
  }

  return (
    <div className="library">
      <header className="library-header"><h1>Songs</h1></header>
      <div className="library-actions">
        <button className="library-play-all" onClick={() => playTracks(songs, 0)}>
          <Play size={22} fill="#000" />
        </button>
        <span className="library-actions-label">{songs.length} songs</span>
      </div>
      <div className="track-list">
        {songs.map(t => <TrackRow key={t.id} track={t} queue={songs} />)}
      </div>
    </div>
  );
}