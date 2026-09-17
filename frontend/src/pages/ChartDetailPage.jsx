// frontend/src/pages/ChartDetailPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, ExternalLink, Music2, AlertCircle, Globe,
} from 'lucide-react';
import { getTopChart, getContinentChart } from '../api/charts';
import { findChartById, CONTINENT_CHARTS, meshGradient } from '../data/chartConfig';
import './ChartDetailPage.css';

export default function ChartDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const config = findChartById(id);
  const isContinent = !!config && CONTINENT_CHARTS.some(c => c.id === config.id);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!config) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetch = isContinent
      ? getContinentChart(config.countries, 25)
      : getTopChart(config.country, 100);

    fetch
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [config?.id, isContinent]);

  if (!config) {
    return (
      <div className="cd-state">
        <p>Chart not found.</p>
        <button className="btn-primary" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const tracks = data?.tracks || [];
  const rankLabel = 'Top 100';

  const openTrack = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="cd">
      <header className="cd-hero">
        <button className="cd-back" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={20} />
        </button>

        <div
          className="cd-art"
          style={{ background: meshGradient(config.palette) }}
        >
          <div className="cd-art-overlay" />
          <div className="cd-art-label">
            <span className="cd-art-rank">{rankLabel}</span>
            <span className="cd-art-brand">Apple Music</span>
          </div>
          <div className="cd-art-name">{config.label}</div>
        </div>

        <div className="cd-meta">
          <span className="cd-meta-label">
            {isContinent ? 'Continental Chart' : 'Daily Chart'}
          </span>
          <h1 className="cd-meta-title">{rankLabel}: {config.fullName}</h1>
          <p className="cd-meta-sub">
            {isContinent
              ? `Aggregated from ${config.countries.length} countries · ${tracks.length} tracks`
              : `Updated daily by Apple Music · ${tracks.length} tracks`}
          </p>
          {isContinent && (
            <p className="cd-meta-updated">
              <Globe size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Sources: {config.countries.map(c => c.toUpperCase()).join(' · ')}
            </p>
          )}
          {!isContinent && data?.updatedAt && (
            <p className="cd-meta-updated">
              Feed last updated {new Date(data.updatedAt).toLocaleString()}
            </p>
          )}
          <div className="cd-notice">
            <AlertCircle size={14} />
            <span>
              {isContinent
                ? 'Aggregated from Apple Music top charts in the region. Streaming requires an Apple Music subscription.'
                : 'These charts are displayed for reference. Streaming requires Apple Music.'}
            </span>
          </div>
        </div>
      </header>

      {loading && (
        <div className="cd-state">
          <Loader2 size={22} className="cd-spin" />
          Loading chart…
        </div>
      )}
      {error && !loading && (
        <div className="cd-state cd-error">
          <AlertCircle size={22} />
          <p>Couldn't load the chart: {error}</p>
        </div>
      )}

      {!loading && !error && tracks.length > 0 && (
        <ol className="cd-list">
          {tracks.map(t => (
            <li
              key={`${t.rank}-${t.id || t.title}`}
              className={`cd-item ${t.url ? 'is-clickable' : ''}`}
              onClick={t.url ? () => openTrack(t.url) : undefined}
              role={t.url ? 'button' : undefined}
              tabIndex={t.url ? 0 : undefined}
              onKeyDown={t.url ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openTrack(t.url);
                }
              } : undefined}
            >
              <span className="cd-rank">{String(t.rank).padStart(2, '0')}</span>
              <span className="cd-cover">
                {t.image
                  ? <img src={t.image} alt="" loading="lazy" />
                  : <Music2 size={20} />}
              </span>
              <span className="cd-info">
                <span className="cd-title truncate">{t.title}</span>
                <span className="cd-artist truncate">
                  {t.artist}
                  {isContinent && t.country && (
                    <span className="cd-country-tag"> · {t.country.toUpperCase()}</span>
                  )}
                </span>
              </span>
              {t.url && (
                <a
                  className="cd-link"
                  href={t.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open on Apple Music"
                >
                  <ExternalLink size={14} />
                  <span>Apple Music</span>
                </a>
              )}
            </li>
          ))}
        </ol>
      )}

      {!loading && !error && tracks.length === 0 && (
        <div className="cd-state">
          <p>No tracks in this chart right now.</p>
        </div>
      )}
    </div>
  );
}