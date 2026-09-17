// frontend/src/pages/Downloads.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HardDriveDownload, Play, Trash2, Loader2, AlertCircle,
  Music2, RefreshCw, X,
} from 'lucide-react';
import { useDownloadStore } from '../store/downloadStore';
import { usePlayerStore } from '../store/playerStore';
import TrackRow from '../components/common/TrackRow';
import './Downloads.css';

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / 1024 / 1024;
  if (mb < 1000) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export default function Downloads() {
  const navigate = useNavigate();
  const entries = useDownloadStore(s => s.entries);
  const totalSize = useDownloadStore(s => s.totalSize);
  const loaded = useDownloadStore(s => s.loaded);
  const refresh = useDownloadStore(s => s.refresh);
  const clearAll = useDownloadStore(s => s.clearAll);
  const remove = useDownloadStore(s => s.remove);
  const playTracks = usePlayerStore(s => s.playTracks);

  const [busy, setBusy] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  const list = Object.values(entries).sort((a, b) => b.savedAt - a.savedAt);
  const tracks = list.map(e => e.track);

  const handlePlayAll = () => {
    if (tracks.length) playTracks(tracks, 0);
  };

  const handleClearAll = async () => {
    if (!confirm(`Remove all ${list.length} downloads? This can't be undone.`)) return;
    setBusy(true);
    try { await clearAll(); }
    catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };

  const handleRemoveOne = async (trackId) => {
    setBusy(true);
    try { await remove(trackId); }
    catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };

  if (!loaded) {
    return (
      <div className="dl-page">
        <div className="dl-loading">
          <Loader2 size={22} className="dl-spin" /> Loading downloads…
        </div>
      </div>
    );
  }

  return (
    <div className="dl-page">
      <header className="dl-header">
        <div className="dl-header-text">
          <span className="dl-label">Library</span>
          <h1>Downloads</h1>
          <p>
            {list.length === 0
              ? 'No tracks saved for offline playback yet.'
              : `${list.length} ${list.length === 1 ? 'track' : 'tracks'} · ${formatBytes(totalSize)}`}
          </p>
        </div>
        <div className="dl-header-actions">
          <button className="dl-btn-ghost" onClick={refresh} disabled={busy}>
            <RefreshCw size={14} /> Refresh
          </button>
          {list.length > 0 && (
            <button className="dl-btn-danger" onClick={handleClearAll} disabled={busy}>
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>
      </header>

      {list.length === 0 ? (
        <div className="dl-empty">
          <div className="dl-empty-art"><HardDriveDownload size={56} /></div>
          <h2>No downloads yet</h2>
          <p>
            Save any track for offline playback with the <DownloadIconInline /> button
            on the player bar, in Now Playing, or from a track's ⋯ menu.
          </p>
          <button className="dl-empty-cta" onClick={() => navigate('/')}>
            <Music2 size={16} /> Browse music
          </button>
        </div>
      ) : (
        <>
          <div className="dl-actions">
            <button className="dl-play-all" onClick={handlePlayAll} aria-label="Play all">
              <Play size={22} fill="#000" />
            </button>
            <span className="dl-actions-count">{tracks.length} tracks</span>
          </div>

          <div className="track-list">
            {tracks.map(track => (
              <div key={track.id} className="dl-track-wrap">
                <TrackRow track={track} queue={tracks} />
                <button
                  className="dl-remove-one"
                  onClick={() => {
                    if (confirm(`Remove "${track.title}" from downloads?`)) handleRemoveOne(track.id);
                  }}
                  aria-label="Remove download"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Tiny helper so we can use an icon inline in the empty-state copy
function DownloadIconInline() {
  return (
    <span className="dl-inline-icon" aria-hidden="true">⬇︎</span>
  );
}