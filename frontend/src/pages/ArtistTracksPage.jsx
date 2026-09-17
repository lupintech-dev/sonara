// frontend/src/pages/ArtistTracksPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { getArtistProfile } from '../api/artist';
import TrackRow from '../components/common/TrackRow';
import './ArtistTracksPage.css';

export default function ArtistTracksPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const playTracks = usePlayerStore(s => s.playTracks);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getArtistProfile(userId)
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="atp-loading">
        <Loader2 size={26} className="atp-spin" /> Loading tracks…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="atp-loading">
        <p>{error || 'Not found'}</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  const { artist, tracks, stats } = data;

  return (
    <div className="atp">
      <header className="atp-header">
        <button className="btn-icon" onClick={() => navigate(`/artist/${artist.id}`)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="atp-header-text">
          <span className="atp-label">All tracks</span>
          <h1>{artist.displayName}</h1>
          <p className="atp-meta">
            {stats.trackCount} {stats.trackCount === 1 ? 'track' : 'tracks'} · {stats.plays} total plays
          </p>
        </div>
      </header>

      {tracks.length === 0 ? (
        <p className="atp-empty">This artist hasn't published any tracks yet.</p>
      ) : (
        <>
          <div className="atp-actions">
            <button className="atp-play-all" onClick={() => playTracks(tracks, 0)} aria-label="Play all">
              <Play size={20} fill="#000" />
            </button>
            <span className="atp-count">{tracks.length} tracks</span>
          </div>
          <div className="track-list">
            {tracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                queue={tracks}
                index={i}
                showPlays
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}