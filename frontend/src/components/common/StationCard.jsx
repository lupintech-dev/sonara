// frontend/src/components/common/StationCard.jsx
import { Play, Radio as RadioIcon } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import './StationCard.css';

export default function StationCard({ station }) {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying    = usePlayerStore(s => s.isPlaying);
  const playRadio    = usePlayerStore(s => s.playRadio);
  const togglePlay   = usePlayerStore(s => s.togglePlay);

  const isThisStation = currentTrack?.source === 'radio' && currentTrack.sourceId === station.id;
  const isThisPlaying = isThisStation && isPlaying;

  const handleClick = () => {
    if (isThisStation) togglePlay();
    else playRadio(station);
  };

  const primaryTag = station.tags?.[0] || null;

  return (
    <button
      type="button"
      className={`station-card ${isThisStation ? 'current' : ''}`}
      onClick={handleClick}
      title={`${station.name}${station.country ? ' · ' + station.country : ''}`}
    >
      <div className="station-card-art">
        {station.favicon ? (
          <img
            src={station.favicon}
            alt=""
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <RadioIcon size={28} />
        )}
        <span className="station-card-play">
          {isThisPlaying ? <span className="station-card-bars" aria-hidden>
            <span /><span /><span />
          </span> : <Play size={20} fill="#000" />}
        </span>
      </div>

      <div className="station-card-meta">
        <span className="station-card-name truncate">{station.name}</span>
        <span className="station-card-sub truncate">
          {station.country || 'Global'}
          {primaryTag ? ` · ${primaryTag}` : ''}
        </span>
      </div>

      {isThisPlaying && <span className="station-card-live-dot" aria-hidden />}
    </button>
  );
}