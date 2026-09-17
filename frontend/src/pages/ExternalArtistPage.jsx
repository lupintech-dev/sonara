// frontend/src/pages/ExternalArtistPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Loader2, ExternalLink, Radio, BadgeCheck, Music2, Globe,
} from 'lucide-react';
import { getAudiusArtist, getAudiusArtistTracks } from '../api/audius';
import { getJamendoArtist, getJamendoArtistTracks } from '../api/jamendo';
import { usePlayerStore } from '../store/playerStore';
import TrackRow from '../components/common/TrackRow';
import './ExternalArtistPage.css';

const SOURCE_LABELS = {
  audius: 'Audius',
  jamendo: 'Jamendo',
};

function initials(name) {
  if (!name) return 'U';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function ExternalArtistPage() {
  const { source, id } = useParams();
  const navigate = useNavigate();
  const playTracks = usePlayerStore(s => s.playTracks);

  const [artist, setArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setArtist(null);
    setTracks([]);

    (async () => {
      try {
        if (source === 'audius') {
          const [a, t] = await Promise.all([
            getAudiusArtist(id),
            getAudiusArtistTracks(id, 50),
          ]);
          if (cancelled) return;
          setArtist(a);
          setTracks(t || []);
        } else if (source === 'jamendo') {
          const [a, t] = await Promise.all([
            getJamendoArtist(id),
            getJamendoArtistTracks(id, 50),
          ]);
          if (cancelled) return;
          setArtist(a);
          setTracks(t || []);
        } else {
          throw new Error(`Unsupported source: ${source}`);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [source, id]);

  if (loading) {
    return (
      <div className="extart-loading">
        <Loader2 size={26} className="extart-spin" /> Loading artist…
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="extart-loading">
        <p>{error || 'Artist not found'}</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const hasTracks = tracks.length > 0;
  const handlePlayAll = () => { if (hasTracks) playTracks(tracks, 0); };

  // External link — only shown for Audius (user requested no redirects for Jamendo)
  const externalUrl =
    source === 'audius' && artist.handle
      ? `https://audius.co/${artist.handle}`
      : null;

  const showFollowers = source === 'audius' && artist.followerCount > 0;
  const showTracksCount = source === 'audius' && artist.trackCount > 0;

  return (
    <div className="extart">
      {artist.image && (
        <div
          className="extart-hero-bg"
          style={{ backgroundImage: `url(${artist.image})` }}
        />
      )}

      <header className="extart-hero">
        <div className="extart-avatar">
          {artist.image
            ? <img src={artist.image} alt="" />
            : <span>{initials(artist.name)}</span>}
        </div>

        <div className="extart-meta">
          <span className="extart-label">
            Artist · {SOURCE_LABELS[source] || source}
          </span>
          <h1 className="extart-name">
            {artist.name}
            {artist.verified && <BadgeCheck size={28} className="extart-verified" />}
          </h1>

          {source === 'audius' && artist.handle && (
            <p className="extart-handle">@{artist.handle.replace(/^@/, '')}</p>
          )}

          {source === 'jamendo' && artist.website && (
            <p className="extart-handle">
              <Globe size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {artist.website.replace(/^https?:\/\//, '')}
            </p>
          )}

          {(showFollowers || showTracksCount) && (
            <p className="extart-listeners">
              <Radio size={13} />
              {showFollowers && `${artist.followerCount.toLocaleString()} followers`}
              {showFollowers && showTracksCount && ' · '}
              {showTracksCount && `${artist.trackCount.toLocaleString()} tracks`}
            </p>
          )}

          <div className="extart-actions-row">
            {hasTracks && (
              <button className="extart-play-all" onClick={handlePlayAll} aria-label="Play">
                <Play size={20} fill="#000" />
              </button>
            )}
            {externalUrl && (
              <a
                className="extart-external"
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} /> View on {SOURCE_LABELS[source]}
              </a>
            )}
          </div>
        </div>
      </header>

      {artist.bio && (
        <section className="extart-section">
          <p className="extart-bio">{artist.bio}</p>
        </section>
      )}

      {hasTracks ? (
        <section className="extart-section">
          <header className="extart-section-header">
            <h2>Popular tracks</h2>
          </header>
          <div className="extart-tracklist">
            {tracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                queue={tracks}
                index={i}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="extart-empty">
          <Music2 size={40} />
          <p>No tracks available for this artist.</p>
        </div>
      )}
    </div>
  );
}