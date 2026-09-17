// frontend/src/pages/SearchHistoryPage.jsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, Trash2, Search as SearchIcon } from 'lucide-react';
import { useSearchStore } from '../store/searchStore';
import './SearchHistoryPage.css';

export default function SearchHistoryPage() {
  const navigate = useNavigate();
  const history = useSearchStore(s => s.history);
  const remove = useSearchStore(s => s.remove);
  const clear = useSearchStore(s => s.clear);

  return (
    <div className="shp">
      <header className="shp-header">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1>Recent searches</h1>
        {history.length > 0 && (
          <button className="shp-clear" onClick={() => { if (confirm('Clear all search history?')) clear(); }}>
            <Trash2 size={16} /> Clear all
          </button>
        )}
      </header>

      {history.length === 0 ? (
        <div className="shp-empty">
          <div className="shp-empty-art"><SearchIcon size={44} /></div>
          <h2>No recent searches</h2>
          <p>Your recent searches will appear here.</p>
        </div>
      ) : (
        <ul className="shp-list">
          {history.map(q => (
            <li key={q} className="shp-item">
              <button
                className="shp-item-main"
                onClick={() => navigate(`/search?q=${encodeURIComponent(q)}`)}
              >
                <SearchIcon size={16} />
                <span className="truncate">{q}</span>
              </button>
              <button className="btn-icon shp-remove" onClick={() => remove(q)} aria-label="Remove">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}