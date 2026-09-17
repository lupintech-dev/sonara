// frontend/src/pages/ArtistProfilePage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Disc3, Loader2, ListMusic, Mic2, Shuffle, Radio, Sparkles,
} from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { getArtistProfile } from '../api/artist';
import { useAuth } from '../contexts/AuthContext';
import { useFollowStore } from '../store/followStore';
import VerifiedBadge from '../components/common/VerifiedBadge';
import FollowButton from '../components/common/FollowButton';
import TrackRow from '../components/common/TrackRow';
import './ArtistProfilePage.css';

const POPULAR_LIMIT = 5;
const ALBUM_PREVIEW = 6;

function initials(name) {
  if (!name) return 'U';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function ArtistProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const playTracks = usePlayerStore(s => s.playTracks);
  const setShuffleMode = usePlayerStore(s => s.setShuffleMode);
  const refreshFollows = useFollowStore(s => s.refresh);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const numericId = parseInt(userId, 10);
  const isSelf = user && user.id === numericId;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getArtistProfile(userId)
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    refreshFollows();
    return () => { cancelled = true; };
  }, [userId, refreshFollows]);

  if (loading) {
    return <div className="artp-loading"><Loader2 size={26} className="artp-spin" /> Loading artist…</div>;
  }

  if (error || !data) {
    return (
      <div className="artp-loading">
        <p>{error || 'User not found'}</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const { artist, tracks = [], albums = [], playlists = [], stats } = data;
  const isArtist = artist.verified;
  const isManaged = !!artist.managedBySonara;

  const popularTracks = tracks.slice(0, POPULAR_LIMIT);
  const hasMoreTracks = tracks.length > POPULAR_LIMIT;
  const previewAlbums = albums.slice(0, ALBUM_PREVIEW);
  const hasMoreAlbums = albums.length > ALBUM_PREVIEW;

  const handlePlayAll = () => { if (popularTracks.length) playTracks(popularTracks, 0); };
  const handleShuffleAll = () => {
    if (!popularTracks.length) return;
    setShuffleMode('on');
    playTracks(tracks, 0);
  };

  return (
    <div className="artp">
      {artist.avatarPath && (
        <div className="artp-hero-bg" style={{ backgroundImage: `url(${artist.avatarPath})` }} />
      )}

      <header className="artp-hero">
        <div className="artp-avatar">
          {artist.avatarPath
            ? <img src={artist.avatarPath} alt="" />
            : <span>{initials(artist.displayName)}</span>}
        </div>

        <div className="artp-meta">
          <span className="artp-label">
            {isArtist ? 'Artist' : 'Profile'}
            {isManaged && <> · Managed by Sonara</>}
          </span>

          <h1 className="artp-name">
            {artist.displayName}
            {isArtist && <VerifiedBadge size="lg" />}
          </h1>

          {isArtist && stats.plays > 0 && (
            <p className="artp-listeners">
              <Radio size={13} /> {stats.plays.toLocaleString()} plays
            </p>
          )}

          {isManaged && (
            <div className="artp-managed-note">
              <Sparkles size={13} />
              <span>
                This profile is powered by Sonara and not officially affiliated with the artist.
                If you are the artist and want to claim it, contact us via an artist account.
              </span>
            </div>
          )}

          <div className="artp-actions-row">
            {isArtist && popularTracks.length > 0 && (
              <>
                <button className="artp-play-all" onClick={handlePlayAll} aria-label="Play">
                  <Play size={20} fill="#000" />
                </button>
                <button className="artp-shuffle" onClick={handleShuffleAll} aria-label="Shuffle">
                  <Shuffle size={18} />
                </button>
              </>
            )}
            {!isSelf && !isManaged && <FollowButton userId={artist.id} size="md" />}
            {isSelf && !isArtist && (
              <button className="artp-self-btn" onClick={() => navigate('/artist/apply')}>
                <Mic2 size={14} /> Become an Artist
              </button>
            )}
            {isSelf && isArtist && (
              <button className="artp-self-btn" onClick={() => navigate('/artist/dashboard')}>
                <Mic2 size={14} /> Artist Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="artp-stats">
        {!isManaged && (
          <button
            className="artp-stat clickable"
            onClick={() => navigate(`/social?tab=followers&userId=${artist.id}`)}
          >
            <span className="artp-stat-value">{stats.followers.toLocaleString()}</span>
            <span className="artp-stat-label">Followers</span>
          </button>
        )}
        {!isManaged && (
          <button
            className="artp-stat clickable"
            onClick={() => navigate(`/social?tab=following&userId=${artist.id}`)}
          >
            <span className="artp-stat-value">{stats.following.toLocaleString()}</span>
            <span className="artp-stat-label">Following</span>
          </button>
        )}
        {isArtist && (
          <>
            <button
              className="artp-stat clickable"
              onClick={() => navigate(`/artist/${artist.id}/tracks`)}
            >
              <span className="artp-stat-value">{stats.trackCount}</span>
              <span className="artp-stat-label">Tracks</span>
            </button>
            <button
              className="artp-stat clickable"
              onClick={() => navigate(`/artist/${artist.id}/albums`)}
            >
              <span className="artp-stat-value">{stats.albumCount}</span>
              <span className="artp-stat-label">Albums</span>
            </button>
          </>
        )}
      </section>

      {artist.bio && (
        <section className="artp-section">
          <p className="artp-bio">{artist.bio}</p>
        </section>
      )}

      {isArtist && popularTracks.length > 0 && (
        <section className="artp-section">
          <header className="artp-section-header">
            <h2>Popular</h2>
            {hasMoreTracks && (
              <button className="artp-see-all" onClick={() => navigate(`/artist/${artist.id}/tracks`)}>
                See all
              </button>
            )}
          </header>
          <div className="artp-tracklist">
            {popularTracks.map((t, i) => (
              <TrackRow key={t.id} track={t} queue={tracks} index={i} showPlays />
            ))}
          </div>
        </section>
      )}

      {isArtist && albums.length > 0 && (
        <section className="artp-section">
          <header className="artp-section-header">
            <h2>Discography</h2>
            {hasMoreAlbums && (
              <button className="artp-see-all" onClick={() => navigate(`/artist/${artist.id}/albums`)}>
                See all
              </button>
            )}
          </header>
          <div className="artp-album-grid">
            {previewAlbums.map(al => (
              <button
                key={al.id}
                className="artp-album"
                onClick={() => navigate(`/artist/${artist.id}/albums/${al.id}`)}
              >
                <div className="artp-album-cover">
                  {al.coverPath ? <img src={al.coverPath} alt="" /> : <Disc3 size={32} />}
                </div>
                <div className="artp-album-name truncate">{al.name}</div>
                <div className="artp-album-meta">
                  Album · {al.trackCount} {al.trackCount === 1 ? 'track' : 'tracks'}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {playlists.length > 0 && (
        <section className="artp-section">
          <h2>Public playlists</h2>
          <div className="artp-playlist-grid">
            {playlists.map(pl => (
              <button
                key={pl.id}
                className="artp-playlist"
                onClick={() => navigate(`/playlist/${pl.id}`)}
              >
                <div
                  className="artp-playlist-cover"
                  style={pl.firstTrackImage ? { background: `url(${pl.firstTrackImage}) center/cover` } : undefined}
                >
                  {!pl.firstTrackImage && <ListMusic size={28} />}
                </div>
                <div className="artp-playlist-name truncate">{pl.name}</div>
                <div className="artp-playlist-count">
                  {pl.trackCount} {pl.trackCount === 1 ? 'song' : 'songs'}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {isArtist && tracks.length === 0 && albums.length === 0 && (
        <div className="artp-empty">
          <p>This artist hasn't published any tracks yet.</p>
        </div>
      )}
    </div>
  );
}