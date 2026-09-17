// frontend/src/pages/Search.jsx
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, ChevronLeft, Clock, ArrowRight, Play, BadgeCheck } from 'lucide-react';
import { getAudiusPopular, searchAudius } from '../api/audius';
import { getJamendoPopular, searchJamendo } from '../api/jamendo';
import { searchUsers } from '../api/follows';
import { useSearchStore } from '../store/searchStore';
import { usePlayerStore } from '../store/playerStore';
import { useFollowStore } from '../store/followStore';
import TrackRow from '../components/common/TrackRow';
import FollowButton from '../components/common/FollowButton';
import './Search.css';

const GENRES = [
  { id: 'Electronic',  gradient: 'linear-gradient(135deg, #7d4bff, #4a2fd8)' },
  { id: 'Hip-Hop/Rap', gradient: 'linear-gradient(135deg, #ff8a3d, #d6491e)' },
  { id: 'Lo-Fi',       gradient: 'linear-gradient(135deg, #e91e63, #a81448)' },
  { id: 'House',       gradient: 'linear-gradient(135deg, #1ed760, #0f9e45)' },
  { id: 'Ambient',     gradient: 'linear-gradient(135deg, #3d8bff, #1e5fbf)' },
  { id: 'Techno',      gradient: 'linear-gradient(135deg, #9c27b0, #6a1b7a)' },
  { id: 'Drum & Bass', gradient: 'linear-gradient(135deg, #ff5722, #c63f14)' },
  { id: 'Trap',        gradient: 'linear-gradient(135deg, #607d8b, #37474f)' },
  { id: 'Dubstep',     gradient: 'linear-gradient(135deg, #4caf50, #2e7d32)' },
  { id: 'R&B/Soul',    gradient: 'linear-gradient(135deg, #b0413e, #7a2927)' },
  { id: 'Rock',        gradient: 'linear-gradient(135deg, #e53935, #b71c1c)' },
  { id: 'Pop',         gradient: 'linear-gradient(135deg, #ec407a, #ad1457)' },
  { id: 'Jazz',        gradient: 'linear-gradient(135deg, #ffa000, #b26a00)' },
  { id: 'Classical',   gradient: 'linear-gradient(135deg, #795548, #4e342e)' },
  { id: 'Vaporwave',   gradient: 'linear-gradient(135deg, #00bcd4, #00838f)' },
];

const initialsOf = (s) => s ? s.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() : '?';
const gradientFromId = (id) => {
  const p = [['#ff6b6b','#c92a2a'],['#845ef7','#5f3dc4'],['#20c997','#087f5b'],['#ffd43b','#e67700'],['#4dabf7','#1864ab'],['#ff922b','#d9480f']];
  const i = [...String(id)].reduce((a,c)=>a+c.charCodeAt(0),0) % p.length;
  return `linear-gradient(135deg, ${p[i][0]}, ${p[i][1]})`;
};

/** Interleave two track arrays so results from both sources alternate. */
function interleave(a, b) {
  const out = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = params.get('q') || '';

  const [query, setQuery]     = useState(initialQ);
  const [genre, setGenre]     = useState(null);
  const [tracks, setTracks]   = useState([]);
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const history = useSearchStore(s => s.history);
  const addSearch = useSearchStore(s => s.add);
  const playTracks = usePlayerStore(s => s.playTracks);
  const refreshFollows = useFollowStore(s => s.refresh);

  useEffect(() => {
    if (initialQ) setQuery(initialQ);
    refreshFollows();
  }, [initialQ, refreshFollows]);

  const runSearch = useCallback(async (q, g) => {
    setLoading(true);
    setError(null);
    try {
      if (q && q.trim()) {
        // Fire all sources in parallel; tolerate individual failures
        const [audiusRes, jamendoRes, usersRes] = await Promise.allSettled([
          searchAudius(q, 20),
          searchJamendo(q, 20),
          searchUsers(q),
        ]);

        const audiusTracks  = audiusRes.status === 'fulfilled' ? audiusRes.value : [];
        const jamendoTracks = jamendoRes.status === 'fulfilled' ? jamendoRes.value : [];
        const foundUsers    = usersRes.status === 'fulfilled' ? usersRes.value : [];

        // Interleave for a mixed-source Top Results and Songs list
        setTracks(interleave(audiusTracks, jamendoTracks));
        setUsers(foundUsers);

        const errors = [];
        if (audiusRes.status === 'rejected')  errors.push('Audius');
        if (jamendoRes.status === 'rejected') errors.push('Jamendo');
        if (errors.length) setError(`Couldn't reach: ${errors.join(', ')}`);
      } else if (g) {
        // Genre browse — mix both sources
        const [audiusRes, jamendoRes] = await Promise.allSettled([
          getAudiusPopular(20, g),
          getJamendoPopular(20, g),
        ]);
        const a = audiusRes.status === 'fulfilled' ? audiusRes.value : [];
        const j = jamendoRes.status === 'fulfilled' ? jamendoRes.value : [];
        setTracks(interleave(a, j));
        setUsers([]);
      } else {
        setTracks([]);
        setUsers([]);
      }
    } catch (err) {
      console.error('[search]', err);
      setError(err.message);
      setTracks([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() && !genre) {
      setTracks([]); setUsers([]); setLoading(false); setError(null);
      return;
    }
    if (query.trim()) {
      debounceRef.current = setTimeout(() => runSearch(query, null), 300);
    } else {
      runSearch('', genre);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, genre, runSearch]);

  useEffect(() => {
    if (!query.trim()) return;
    const t = setTimeout(() => addSearch(query), 1200);
    return () => clearTimeout(t);
  }, [query, addSearch]);

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) return;
    setGenre(null);
    setParams({ q });
    addSearch(q);
    runSearch(q, null);
    if (window.innerWidth < 769) inputRef.current?.blur();
  };

  const clearQuery = () => { setQuery(''); setParams({}); inputRef.current?.focus(); };
  const openGenre = (g) => { setQuery(''); setGenre(g); };
  const closeGenre = () => { setGenre(null); setQuery(''); };
  const runChipSearch = (q) => {
    setQuery(q); setGenre(null); setParams({ q }); runSearch(q, null);
  };

  const topSongs = useMemo(() => tracks.slice(0, 6), [tracks]);

  const artists = useMemo(() => {
    // Merge artists by name (a Jamendo and Audius artist with the same name merge)
    const map = new Map();
    for (const t of tracks) {
      const name = t.artist?.name;
      if (!name) continue;
      if (!map.has(name)) {
        map.set(name, {
          id: t.artist.id,
          source: t.source,
          name,
          handle: t.artist.handle,
          image: t.artist.image,
        });
      }
    }
    return [...map.values()];
  }, [tracks]);

  const showGrid    = !query.trim() && !genre;
  const showResults = !showGrid;

  return (
    <div className="search-page">
      <div className="search-input-wrap">
        <SearchIcon size={18} className="search-input-icon" />
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          inputMode="search"
          enterKeyHint="search"
          placeholder="What do you want to play?"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setGenre(null); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button className="search-input-clear" onClick={clearQuery} aria-label="Clear">
            <X size={16} />
          </button>
        )}
      </div>

      {showGrid && (
        <>
          {history.length > 0 && (
            <section className="search-history">
              <header className="search-history-header">
                <h2>Recent searches</h2>
                <button className="search-history-viewall" onClick={() => navigate('/search/history')}>
                  View all <ArrowRight size={14} />
                </button>
              </header>
              <div className="search-chips">
                {history.slice(0, 6).map(q => (
                  <button key={q} className="search-chip" onClick={() => runChipSearch(q)}>
                    <Clock size={12} /><span className="truncate">{q}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="browse">
            <h1 className="browse-title">Browse all</h1>
            <div className="browse-grid">
              {GENRES.map(g => (
                <button key={g.id} type="button" className="browse-tile"
                  style={{ background: g.gradient }} onClick={() => openGenre(g.id)}>
                  <span className="browse-tile-label">{g.id}</span>
                  <span className="browse-tile-art" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {showResults && (
        <div className="results">
          <header className="results-header">
            {genre && (
              <button className="results-back" onClick={closeGenre} aria-label="Back to Browse">
                <ChevronLeft size={22} />
              </button>
            )}
            <div className="results-heading">
              <h2 className="results-title">
                {query.trim() ? `Showing results for "${query.trim()}"` : genre}
              </h2>
            </div>
          </header>

          {loading && <p className="results-hint">Searching…</p>}
          {!loading && error && <p className="results-hint results-error">{error}</p>}
          {!loading && !error && tracks.length === 0 && users.length === 0 && (
            <p className="results-hint">No results.</p>
          )}

          {!loading && topSongs.length > 0 && (
            <section className="result-section">
              <h3 className="result-section-title">Top Results</h3>
              <div className="top-results-grid">
                {topSongs.map(t => (
                  <button key={t.id} className="top-result-card"
                    onClick={() => playTracks(tracks, tracks.findIndex(x => x.id === t.id))}>
                    <div className="top-result-art">
                      {t.image ? <img src={t.image} alt="" /> : <div className="top-result-fallback" />}
                      <span className="top-result-play"><Play size={18} fill="#000" /></span>
                    </div>
                    <div className="top-result-meta">
                      <span className="top-result-title truncate">{t.title}</span>
                      <span className="top-result-sub truncate">Song · {t.artist?.name || 'Unknown'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!loading && users.length > 0 && (
            <section className="result-section">
              <h3 className="result-section-title">Profiles</h3>
              <div className="artist-results-grid">
                {users.map(u => (
                  <div
                    key={u.id}
                    className="artist-result-card clickable"
                    onClick={() => navigate(`/artist/${u.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/artist/${u.id}`); }}
                  >
                    <div
                      className="artist-result-avatar"
                      style={!u.avatar_path ? { background: gradientFromId(u.id) } : undefined}
                    >
                      {u.avatar_path
                        ? <img src={u.avatar_path} alt="" />
                        : <span>{initialsOf(u.display_name || u.username)}</span>}
                    </div>
                    <div className="artist-result-meta">
                      <span className="artist-result-name truncate">
                        {u.display_name || u.username}
                        {u.isVerifiedArtist && <BadgeCheck size={12} className="artist-verified" />}
                      </span>
                      <span className="artist-result-handle truncate">@{u.username}</span>
                    </div>
                    <FollowButton userId={u.id} size="sm" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && artists.length > 0 && (
            <section className="result-section">
              <h3 className="result-section-title">Artists</h3>
              <div className="artist-results-grid">
                {artists.slice(0, 10).map(a => (
                  <div
                    key={`${a.source}-${a.id || a.name}`}
                    className="artist-result-card clickable"
                    onClick={() => {
                      if (a.source === 'audius' && a.id) {
                        navigate(`/artist/external/audius/${a.id}`);
                      } else if (a.source === 'jamendo' && a.id) {
                        navigate(`/artist/external/jamendo/${a.id}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      if (a.source === 'audius' && a.id) navigate(`/artist/external/audius/${a.id}`);
                      else if (a.source === 'jamendo' && a.id) navigate(`/artist/external/jamendo/${a.id}`);
                    }}
                  >
                    <div className="artist-result-avatar">
                      {a.image
                        ? <img src={a.image} alt="" />
                        : <span>{initialsOf(a.name)}</span>}
                    </div>
                    <div className="artist-result-meta">
                      <span className="artist-result-name truncate">{a.name}</span>
                      <span className="artist-result-handle truncate">
                        {a.source === 'audius' ? 'Audius' : a.source === 'jamendo' ? 'Jamendo' : 'Artist'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && tracks.length > 0 && (
            <section className="result-section">
              <h3 className="result-section-title">Songs</h3>
              <div className="track-list">
                {tracks.map(t => <TrackRow key={t.id} track={t} queue={tracks} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}