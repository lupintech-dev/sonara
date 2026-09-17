// frontend/src/pages/ArtistAlbumsPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Disc3, Loader2 } from 'lucide-react';
import { getArtistProfile } from '../api/artist';
import './ArtistAlbumsPage.css';

export default function ArtistAlbumsPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
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
      <div className="aap-loading">
        <Loader2 size={26} className="aap-spin" /> Loading albums…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="aap-loading">
        <p>{error || 'Not found'}</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  const { artist, albums, stats } = data;

  return (
    <div className="aap">
      <header className="aap-header">
        <button className="btn-icon" onClick={() => navigate(`/artist/${artist.id}`)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <div className="aap-header-text">
          <span className="aap-label">All albums</span>
          <h1>{artist.displayName}</h1>
          <p className="aap-meta">
            {stats.albumCount} {stats.albumCount === 1 ? 'album' : 'albums'}
          </p>
        </div>
      </header>

      {albums.length === 0 ? (
        <p className="aap-empty">This artist hasn't released any albums yet.</p>
      ) : (
        <div className="aap-grid">
          {albums.map(al => (
            <button
              key={al.id}
              className="aap-card"
              onClick={() => navigate(`/artist/${artist.id}/albums/${al.id}`)}
            >
              <div className="aap-cover">
                {al.coverPath ? <img src={al.coverPath} alt="" /> : <Disc3 size={40} />}
              </div>
              <div className="aap-card-meta">
                <span className="aap-card-name truncate">{al.name}</span>
                <span className="aap-card-count">
                  {al.trackCount} {al.trackCount === 1 ? 'track' : 'tracks'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}