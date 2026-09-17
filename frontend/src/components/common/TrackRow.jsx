// frontend/src/components/common/TrackRow.jsx
import { Play, Pause } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import TrackMenu from './TrackMenu';
import './TrackRow.css';

function fmt(sec) {
  if (!sec || !isFinite(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function TrackRow({ track, queue }) {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying    = usePlayerStore(s => s.isPlaying);
  const playTrack    = usePlayerStore(s => s.playTrack);

  const isCurrent = currentTrack?.id === track.id;
  const isThisPlaying = isCurrent && isPlaying;

  const handleClick = () => {
    if (isCurrent) usePlayerStore.getState().togglePlay();
    else playTrack(track, queue);
  };

  return (
    <div className={`track-row ${isCurrent ? 'current' : ''}`} onClick={handleClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
    >
      <span className="track-cover">
        {track.image ? (
          <img src={track.image} alt="" loading="lazy" />
        ) : (
          <span className="track-cover-fallback" />
        )}
        <span className="track-cover-overlay">
          {isThisPlaying ? <Pause size={20} fill="#000" /> : <Play size={20} fill="#000" />}
        </span>
      </span>
      <span className="track-meta">
        <span className="track-title truncate">{track.title}</span>
        <span className="track-artist truncate">{track.artist?.name || 'Unknown'}</span>
      </span>
      <span className="track-duration">{fmt(track.duration)}</span>
      <TrackMenu track={track} />
    </div>
  );
}