// frontend/src/pages/RadioPage.jsx
import { useEffect, useRef, useState } from 'react';
import { Radio as RadioIcon, Search as SearchIcon, X, Loader2, AlertCircle } from 'lucide-react';
import {
  getFeaturedStations,
  getStationsByTag,
  getStationsByCountry,
  searchRadio,
  getRadioTags,
  getRadioCountries,
} from '../api/radio';
import StationCard from '../components/common/StationCard';
import './RadioPage.css';

const TABS = [
  { id: 'featured', label: 'Featured' },
  { id: 'genres',   label: 'Genres' },
  { id: 'countries', label: 'Countries' },
];

export default function RadioPage() {
  const [tab, setTab] = useState('featured');
  const [query, setQuery] = useState('');

  const [stations, setStations] = useState([]);
  const [tags, setTags] = useState([]);
  const [countries, setCountries] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const [activeCountry, setActiveCountry] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  // Featured on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    getFeaturedStations(40)
      .then(list => { if (!cancelled) setStations(list); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Load tags & countries lazily when those tabs open
  useEffect(() => {
    if (tab === 'genres' && tags.length === 0) {
      getRadioTags(30).then(setTags).catch(() => {});
    }
    if (tab === 'countries' && countries.length === 0) {
      getRadioCountries(30).then(setCountries).catch(() => {});
    }
  }, [tab, tags.length, countries.length]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      // restore current tab content
      if (activeTag) {
        setLoading(true);
        getStationsByTag(activeTag, 40).then(setStations).finally(() => setLoading(false));
      } else if (activeCountry) {
        setLoading(true);
        getStationsByCountry(activeCountry, 40).then(setStations).finally(() => setLoading(false));
      } else {
        setLoading(true);
        getFeaturedStations(40).then(setStations).finally(() => setLoading(false));
      }
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const list = await searchRadio(q, 40);
        setStations(list);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(debounceRef.current);
  }, [query, activeTag, activeCountry]);

  const selectTag = async (tagName) => {
    setQuery('');
    setActiveCountry(null);
    setActiveTag(tagName);
    setLoading(true); setError(null);
    try {
      const list = await getStationsByTag(tagName, 40);
      setStations(list);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const selectCountry = async (code) => {
    setQuery('');
    setActiveTag(null);
    setActiveCountry(code);
    setLoading(true); setError(null);
    try {
      const list = await getStationsByCountry(code, 40);
      setStations(list);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetToFeatured = async () => {
    setQuery('');
    setActiveTag(null);
    setActiveCountry(null);
    setLoading(true); setError(null);
    try {
      const list = await getFeaturedStations(40);
      setStations(list);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const headerTitle =
    activeTag ? `Genre · ${activeTag}` :
    activeCountry ? `Country · ${activeCountry}` :
    query.trim() ? `Results for "${query.trim()}"` :
    'Live Radio';

  return (
    <div className="radio-page">
      <header className="radio-header">
        <div className="radio-header-text">
          <span className="radio-label">
            <RadioIcon size={12} /> Live Streams
          </span>
          <h1>Radio</h1>
          <p>50,000+ live stations from around the world. Press play — no queue, no ads.</p>
        </div>
      </header>

      <div className="radio-search-wrap">
        <SearchIcon size={16} className="radio-search-icon" />
        <input
          type="text"
          className="radio-search"
          placeholder="Search stations (BBC, jazz, Lagos…)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button className="radio-search-clear" onClick={() => setQuery('')} aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Tabs (only when not searching) */}
      {!query.trim() && (
        <nav className="radio-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`radio-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => { setTab(t.id); if (t.id === 'featured') resetToFeatured(); }}
            >
              {t.label}
            </button>
          ))}
          {(activeTag || activeCountry) && (
            <button className="radio-reset" onClick={resetToFeatured}>
              Clear filter
            </button>
          )}
        </nav>
      )}

      {/* Genres chip list */}
      {tab === 'genres' && !query.trim() && (
        <div className="radio-chips">
          {tags.length === 0 && <p className="radio-hint">Loading genres…</p>}
          {tags.map(t => (
            <button
              key={t.name}
              className={`radio-chip ${activeTag === t.name ? 'active' : ''}`}
              onClick={() => selectTag(t.name)}
            >
              {t.name}
              <span className="radio-chip-count">{t.stationCount.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      {/* Countries chip list */}
      {tab === 'countries' && !query.trim() && (
        <div className="radio-chips">
          {countries.length === 0 && <p className="radio-hint">Loading countries…</p>}
          {countries.map(c => (
            <button
              key={c.code || c.name}
              className={`radio-chip ${activeCountry === c.code ? 'active' : ''}`}
              onClick={() => c.code && selectCountry(c.code)}
            >
              {c.name}
              <span className="radio-chip-count">{c.stationCount.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      {/* Result heading */}
      <div className="radio-section-head">
        <h2>{headerTitle}</h2>
      </div>

      {loading && (
        <div className="radio-loading">
          <Loader2 size={22} className="radio-spin" />
          <span>Loading stations…</span>
        </div>
      )}

      {error && !loading && (
        <div className="radio-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!loading && !error && stations.length === 0 && (
        <p className="radio-hint">No stations found. Try another search or genre.</p>
      )}

      {!loading && !error && stations.length > 0 && (
        <div className="radio-grid">
          {stations.map(s => <StationCard key={s.id} station={s} />)}
        </div>
      )}
    </div>
  );
}