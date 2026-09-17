// frontend/src/components/common/ChartCard.jsx
import { useNavigate } from 'react-router-dom';
import { ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { meshGradient } from '../../data/chartConfig';
import './ChartCard.css';

export default function ChartCard({ chart, kind = 'country', loading = false }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="chart-card chart-card-skeleton">
        <div className="chart-card-header">
          <div className="chart-card-title">
            <span className="chart-card-rank">Top 100</span>
            <span className="chart-card-brand">Apple Music</span>
          </div>
          <div className="chart-card-name" />
        </div>
        <div className="chart-card-art" />
        <div className="chart-card-meta">
          <span className="chart-card-meta-line" />
          <span className="chart-card-meta-line small" />
        </div>
      </div>
    );
  }

  const isCity = kind === 'city';
  const rankLabel = isCity ? 'Top 25' : 'Top 100';

  return (
    <button
      type="button"
      className="chart-card"
      onClick={() => navigate(`/charts/${chart.id}`)}
      aria-label={`Open ${chart.label} chart`}
    >
      <div className="chart-card-header">
        <div className="chart-card-title">
          <span className="chart-card-rank">{rankLabel}</span>
          <span className="chart-card-brand"> Apple Music</span>
        </div>
      </div>

      <div className="chart-card-name">{chart.label}</div>

      <div
        className={`chart-card-art ${isCity ? 'is-city' : 'is-country'}`}
        style={{ background: meshGradient(chart.palette) }}
      >
        {isCity && (
          <div className="chart-card-city-art" data-city={chart.id} />
        )}
      </div>

      <div className="chart-card-meta">
        <span className="chart-card-meta-title">
          {isCity ? `Top 25: ${chart.label}` : `Top 100: ${chart.fullName}`}
        </span>
        <span className="chart-card-meta-brand">Apple Music</span>
      </div>
    </button>
  );
}