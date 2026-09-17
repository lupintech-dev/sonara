// frontend/src/pages/AIPlaylistPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Loader2, Play, Save, RefreshCw, AlertCircle, X, ListMusic,
} from 'lucide-react';
import { generateAIPlaylist } from '../api/aiPlaylist';
import { usePlayerStore } from '../store/playerStore';
import { usePlaylistStore } from '../store/playlistStore';
import { addTrackToPlaylist } from '../api/playlists';
import TrackRow from '../components/common/TrackRow';
import './AIPlaylistPage.css';

const EXAMPLES = [
  'Rainy Sunday lo-fi for studying',
  'Late-night drive through neon city',
  'Warm acoustic morning coffee',
  'Hyperpop for a gym session',
  'Ambient focus for deep work',
  'Chill jazz for dinner party',
];

export default function AIPlaylistPage() {
  const navigate = useNavigate();
  const playTracks = usePlayerStore(s => s.playTracks);
  const createPlaylist = usePlaylistStore(s => s.create);
  const bumpTrackCount = usePlaylistStore(s => s.bumpTrackCount);

  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { concept, tracks }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  const generate = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setSaved(null);
    try {
      const data = await generateAIPlaylist(prompt.trim(), 20);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const useExample = (text) => {
    setPrompt(text);
    setError(null);
  };

  const reset = () => {
    setResult(null);
    setPrompt('');
    setError(null);
    setSaved(null);
  };

  const handlePlayNow = () => {
    if (result?.tracks?.length) playTracks(result.tracks, 0);
  };

  const handleSave = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const pl = await createPlaylist({
        name: result.concept.name,
        description: result.concept.description,
        isPublic: false,
      });

      // Sequentially add tracks so we don't hammer the DB
      for (const t of result.tracks) {
        try {
          await addTrackToPlaylist(pl.id, t);
          bumpTrackCount(pl.id, 1);
        } catch (e) {
          // Ignore duplicate-track errors
        }
      }

      setSaved(pl);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="aip">
      <header className="aip-header">
        <div className="aip-badge"><Sparkles size={22} /></div>
        <div>
          <h1>AI Playlist</h1>
          <p>Describe a vibe and let Sonara build the playlist.</p>
        </div>
      </header>

      <section className="aip-prompt-wrap">
        <textarea
          className="aip-prompt"
          rows={3}
          placeholder="Describe the vibe you want…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={busy}
          maxLength={400}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate();
          }}
        />

        <div className="aip-prompt-footer">
          <span className="aip-prompt-count">{prompt.length}/400</span>
          <div className="aip-prompt-actions">
            {result && (
              <button className="aip-btn ghost" onClick={reset} disabled={busy}>
                <X size={14} /> Clear
              </button>
            )}
            <button
              className="aip-btn primary"
              onClick={generate}
              disabled={busy || !prompt.trim()}
            >
              {busy ? <Loader2 size={14} className="aip-spin" /> : <Sparkles size={14} />}
              <span>{busy ? 'Generating…' : result ? 'Regenerate' : 'Generate playlist'}</span>
            </button>
          </div>
        </div>
      </section>

      {!result && !busy && !error && (
        <section className="aip-examples">
          <h3>Try one of these</h3>
          <div className="aip-chips">
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                className="aip-chip"
                onClick={() => useExample(ex)}
              >
                <Sparkles size={12} />
                <span>{ex}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="aip-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {busy && (
        <div className="aip-loading">
          <div className="aip-loading-bars">
            <span /><span /><span /><span /><span />
          </div>
          <p>Composing your playlist…</p>
        </div>
      )}

      {result && !busy && (
        <section className="aip-result">
          <div className="aip-result-head">
            <div className="aip-result-meta">
              <span className="aip-result-label">AI Playlist</span>
              <h2>{result.concept.name}</h2>
              {result.concept.description && (
                <p>{result.concept.description}</p>
              )}
              <div className="aip-queries">
                {result.concept.queries.map(q => (
                  <span key={q} className="aip-query">{q}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="aip-result-actions">
            <button className="aip-play" onClick={handlePlayNow} aria-label="Play now">
              <Play size={22} fill="#000" />
            </button>
            {!saved ? (
              <button className="aip-btn primary" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 size={14} className="aip-spin" /> : <Save size={14} />}
                <span>{saving ? 'Saving…' : 'Save to my library'}</span>
              </button>
            ) : (
              <button className="aip-btn ghost" onClick={() => navigate(`/playlist/${saved.id}`)}>
                <ListMusic size={14} />
                <span>Open saved playlist</span>
              </button>
            )}
            <button className="aip-btn ghost" onClick={generate} disabled={busy}>
              <RefreshCw size={14} />
              <span>Different mix</span>
            </button>
          </div>

          <div className="aip-tracklist">
            {result.tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} queue={result.tracks} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}