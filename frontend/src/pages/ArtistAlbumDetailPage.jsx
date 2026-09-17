// frontend/src/pages/ArtistAlbumDetailPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Disc3, Loader2 } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { getArtistProfile } from '../api/artist';
import TrackRow from '../components/common/TrackRow';
import './ArtistAlbumDetailPage.css';

export default function ArtistAlbumDetailPage() {
  const { userId, albumId } = useParams();
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
      <div className="adp-loading">
        <Loader2 size={26} className="adp-spin" /> Loading album…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="adp-loading">
        <p>{error || 'Not found'}</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>Back</button>
      </div>
    );
  }

  const { artist, albums = [], tracks: allTracks = [] } = data;
  const album = albums.find(a => a.id === parseInt(albumId, 10));
  const albumTracks = allTracks.filter(t => t.album?.id === parseInt(albumId, 10));

  if (!album) {
    return (
      <div className="adp-loading">
        <p>Album not found</p>
        <button className="btn-primary" onClick={() => navigate(`/artist/${userId}/albums`)}>
          All albums
        </button>
      </div>
    );
  }

  const totalPlays = albumTracks.reduce((s, t) => s + (t.playCount || 0), 0);

  return (
    <div className="adp">
      <button className="adp-back" onClick={() => navigate(`/artist/${userId}/albums`)} aria-label="Back">
        <ArrowLeft size={20} />
      </button>

      <header className="adp-hero">
        <div className="adp-cover">
          {album.coverPath ? <img src={album.coverPath} alt="" /> : <Disc3 size={64} />}
        </div>
        <div className="adp-meta">
          <span className="adp-label">Album</span>
          <h1 className="adp-title">{album.name}</h1>
          <p className="adp-sub">
            <button
              className="adp-artist-link"
              onClick={() => navigate(`/artist/${artist.id}`)}
            >
              {artist.displayName}
            </button>
            {' · '}
            {album.trackCount} {album.trackCount === 1 ? 'track' : 'tracks'}
            {totalPlays > 0 && ` · ${totalPlays} plays`}
          </p>
        </div>
      </header>

      <div className="adp-actions">
        <button
          className="adp-play-all"
          onClick={() => albumTracks.length && playTracks(albumTracks, 0)}
          disabled={!albumTracks.length}
          aria-label="Play album"
        >
          <Play size={22} fill="#000" />
        </button>
      </div>

      {albumTracks.length === 0 ? (
        <p className="adp-empty">No tracks in this album yet.</p>
      ) : (
        <div className="track-list">
          {albumTracks.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              queue={albumTracks}
              index={i}
              showPlays
            />
          ))}
        </div>
      )}
    </div>
  );
}