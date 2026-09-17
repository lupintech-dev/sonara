// frontend/src/components/layout/SearchDropdown.jsx
import { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { searchAudius } from '../../api/audius';
import { usePlayerStore } from '../../store/playerStore';
import './SearchDropdown.css';

export default function SearchDropdown() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const playTrack = usePlayerStore(s => s.playTrack);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const tracks = await searchAudius(q, 8);
        setResults(tracks);
      } catch (err) {
        console.error('[search] failed', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 260);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const handlePick = (track) => {
    playTrack(track, results);
    setOpen(false);
  };

  return (
    <div className="search-dropdown" ref={wrapRef}>
      <div className="sd-input-wrap">
        <SearchIcon size={16} className="sd-icon" />
        <input
          className="sd-input"
          type="text"
          placeholder="What do you want to play?"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button className="sd-clear" onClick={() => { setQ(''); setResults([]); }}>
            <X size={14} />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="sd-panel">
          {loading && <p className="sd-hint">Searching…</p>}
          {!loading && results.length === 0 && <p className="sd-hint">No results</p>}
          {!loading && results.map(t => (
            <button key={t.id} className="sd-result" onClick={() => handlePick(t)}>
              <span className="sd-result-cover">
                {t.image ? <img src={t.image} alt="" /> : <span className="sd-result-cover-fallback" />}
              </span>
              <span className="sd-result-meta">
                <span className="sd-result-title truncate">{t.title}</span>
                <span className="sd-result-artist truncate">{t.artist?.name}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}