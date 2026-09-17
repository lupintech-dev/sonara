// frontend/src/pages/WrappedPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Sparkles, Clock, Headphones, User as UserIcon, Music2,
  Play, TrendingUp, AlertCircle, BarChart3,
} from 'lucide-react';
import { getMyStats } from '../api/stats';
import { usePlayerStore } from '../store/playerStore';
import './WrappedPage.css';

function formatMinutes(mins) {
  if (!mins) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function formatHour(h) {
  if (h === null || h === undefined) return '—';
  const ampm = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${ampm}`;
}

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return d.toLocaleString(undefined, { month: 'short' });
}

export default function WrappedPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const playTracks = usePlayerStore(s => s.playTracks);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMyStats();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="wr-loading">
        <Loader2 size={26} className="wr-spin" />
        Loading your listening history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="wr-loading">
        <AlertCircle size={26} />
        <p>{error}</p>
        <button className="wr-cta" onClick={() => navigate('/')}>Go home</button>
      </div>
    );
  }

  const { stats, topTracks, topArtists, topGenres, monthly } = data || {};
  const isEmpty = !stats || stats.totalPlays === 0;

  if (isEmpty) {
    return (
      <div className="wr">
        <div className="wr-empty">
          <div className="wr-empty-art"><BarChart3 size={56} /></div>
          <h1>No listening data yet</h1>
          <p>Play a few tracks and come back — your Wrapped page will fill up as you listen.</p>
          <button className="wr-cta" onClick={() => navigate('/')}>
            <Play size={16} /> Start listening
          </button>
        </div>
      </div>
    );
  }

  const maxMonth = Math.max(1, ...monthly.map(m => m.count));
  const heroArtists = topArtists.slice(0, 5);
  const heroTop = heroArtists[0];

  return (
    <div className="wr">
      {/* Hero — big stats */}
      <section className="wr-hero">
        <div className="wr-hero-bg" />
        <div className="wr-hero-content">
          <span className="wr-hero-label">
            <Sparkles size={14} /> Sonara Wrapped
          </span>
          <h1>Your listening, all time.</h1>
          <p className="wr-hero-sub">
            A look at what you've been playing since day one.
          </p>

          <div className="wr-hero-stats">
            <div className="wr-hero-stat">
              <Clock size={22} />
              <div className="wr-hero-value">{formatMinutes(stats.totalMinutes)}</div>
              <div className="wr-hero-label-sm">Minutes listened</div>
            </div>
            <div className="wr-hero-stat">
              <Headphones size={22} />
              <div className="wr-hero-value">{stats.totalPlays.toLocaleString()}</div>
              <div className="wr-hero-label-sm">Tracks played</div>
            </div>
            <div className="wr-hero-stat">
              <UserIcon size={22} />
              <div className="wr-hero-value">{stats.uniqueArtists.toLocaleString()}</div>
              <div className="wr-hero-label-sm">Artists</div>
            </div>
            <div className="wr-hero-stat">
              <Music2 size={22} />
              <div className="wr-hero-value">{stats.uniqueTracks.toLocaleString()}</div>
              <div className="wr-hero-label-sm">Tracks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Artists */}
      {topArtists.length > 0 && (
        <section className="wr-section">
          <h2 className="wr-section-title">
            <TrendingUp size={18} /> Your top artists
          </h2>

          {heroTop && (
            <div className="wr-artist-hero">
              <div className="wr-artist-hero-cover">
                {heroTop.image
                  ? <img src={heroTop.image} alt="" />
                  : <span>{heroTop.name[0]?.toUpperCase()}</span>}
              </div>
              <div className="wr-artist-hero-meta">
                <span className="wr-artist-hero-rank">#1</span>
                <h3>{heroTop.name}</h3>
                <p>{heroTop.count} {heroTop.count === 1 ? 'play' : 'plays'}</p>
              </div>
            </div>
          )}

          {heroArtists.length > 1 && (
            <div className="wr-artist-row">
              {heroArtists.slice(1).map((a, i) => (
                <div key={a.name} className="wr-artist-card">
                  <span className="wr-artist-rank">#{i + 2}</span>
                  <div className="wr-artist-cover">
                    {a.image
                      ? <img src={a.image} alt="" />
                      : <span>{a.name[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="wr-artist-name truncate">{a.name}</div>
                  <div className="wr-artist-count">{a.count} plays</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Top Tracks */}
      {topTracks.length > 0 && (
        <section className="wr-section">
          <h2 className="wr-section-title">
            <Play size={18} /> Your top tracks
          </h2>
          <div className="wr-tracklist">
            {topTracks.map((item, i) => {
              const t = item.track;
              return (
                <button
                  key={t.id}
                  className="wr-track-row"
                  onClick={() => playTracks(topTracks.map(x => x.track), i)}
                >
                  <span className="wr-track-rank">{i + 1}</span>
                  <span className="wr-track-cover">
                    {t.image ? <img src={t.image} alt="" /> : <span />}
                  </span>
                  <span className="wr-track-meta">
                    <span className="wr-track-title truncate">{t.title}</span>
                    <span className="wr-track-artist truncate">{t.artist?.name || 'Unknown'}</span>
                  </span>
                  <span className="wr-track-count">{item.count} {item.count === 1 ? 'play' : 'plays'}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Monthly chart */}
      {monthly.length > 0 && (
        <section className="wr-section">
          <h2 className="wr-section-title">
            <BarChart3 size={18} /> Plays per month
          </h2>
          <div className="wr-chart">
            {monthly.map(m => (
              <div key={m.month} className="wr-chart-col">
                <div className="wr-chart-bar-wrap">
                  <div
                    className="wr-chart-bar"
                    style={{ height: `${(m.count / maxMonth) * 100}%` }}
                    title={`${m.count} plays`}
                  />
                </div>
                <div className="wr-chart-label">{monthLabel(m.month)}</div>
                <div className="wr-chart-count">{m.count}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Genres */}
      {topGenres.length > 0 && (
        <section className="wr-section">
          <h2 className="wr-section-title">
            <Sparkles size={18} /> Your genres
          </h2>
          <div className="wr-genres">
            {topGenres.map((g, i) => (
              <div key={g.name} className="wr-genre-pill" data-rank={i}>
                <span className="wr-genre-name">{g.name}</span>
                <span className="wr-genre-count">{g.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Peak hour */}
      {stats.peakHour !== null && (
        <section className="wr-section wr-section-small">
          <div className="wr-peak">
            <Clock size={18} />
            <span>You listen most around</span>
            <strong>{formatHour(stats.peakHour)}</strong>
          </div>
        </section>
      )}

      <div className="wr-footer">
        <p>Keep listening — the numbers keep climbing.</p>
      </div>
    </div>
  );
}