// frontend/src/pages/LibraryRecent.jsx
import { useEffect } from 'react';
import { Clock, Play } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { useHistoryStore } from '../store/historyStore';
import TrackRow from '../components/common/TrackRow';
import './Library.css';

export default function LibraryRecent() {
  const recent = useHistoryStore(s => s.recent);
  const refresh = useHistoryStore(s => s.refresh);
  const playTracks = usePlayerStore(s => s.playTracks);

  useEffect(() => { refresh(); }, [refresh]);

  if (recent.length === 0) {
    return (
      <div className="library-empty">
        <div className="library-empty-art recent"><Clock size={56} /></div>
        <h2>Nothing played yet</h2>
        <p>Tracks you play will appear here.</p>
      </div>
    );
  }

  return (
    <div className="library">
      <header className="library-header"><h1>Recently Added</h1></header>
      <div className="library-actions">
        <button className="library-play-all" onClick={() => playTracks(recent, 0)}>
          <Play size={22} fill="#000" />
        </button>
        <span className="library-actions-label">{recent.length} tracks</span>
      </div>
      <div className="track-list">
        {recent.map((t, i) => <TrackRow key={`${t.id}-${i}`} track={t} queue={recent} />)}
      </div>
    </div>
  );
}