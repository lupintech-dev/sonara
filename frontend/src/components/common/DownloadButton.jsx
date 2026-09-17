// frontend/src/components/common/DownloadButton.jsx
import { useEffect, useState } from 'react';
import { Download, Check, Loader2, Trash2 } from 'lucide-react';
import { useDownloadStore } from '../../store/downloadStore';
import './DownloadButton.css';

export default function DownloadButton({ track, size = 'md', showLabel = false, onRemove }) {
  const entries = useDownloadStore(s => s.entries);
  const downloading = useDownloadStore(s => s.downloading);
  const progress = useDownloadStore(s => s.progress);
  const download = useDownloadStore(s => s.download);
  const remove = useDownloadStore(s => s.remove);

  const isDownloaded = !!entries[track?.id];
  const isDownloading = downloading.has(track?.id);
  const pct = progress[track?.id] ?? 0;

  const [error, setError] = useState(null);

  // Clear error after a few seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  if (!track) return null;

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (isDownloading) return;

    if (isDownloaded) {
      // Toggle removal — never auto-delete without confirm unless parent handles it
      if (onRemove) {
        onRemove(track.id);
        return;
      }
      if (!confirm(`Remove "${track.title}" from downloads?`)) return;
      try {
        await remove(track.id);
      } catch (err) {
        setError('Failed to remove');
      }
      return;
    }

    try {
      await download(track);
    } catch (err) {
      setError(err.message || 'Download failed');
    }
  };

  const className = [
    'dl-btn',
    size,
    isDownloaded ? 'downloaded' : '',
    isDownloading ? 'downloading' : '',
    error ? 'error' : '',
  ].filter(Boolean).join(' ');

  let icon = <Download size={size === 'lg' ? 22 : 16} />;
  if (isDownloaded) icon = <Check size={size === 'lg' ? 22 : 16} />;
  else if (isDownloading) icon = <Loader2 size={size === 'lg' ? 22 : 16} className="dl-spin" />;

  let label = 'Download';
  if (isDownloaded) label = 'Downloaded';
  else if (isDownloading) label = `${Math.round(pct * 100)}%`;
  if (error) label = error;

  return (
    <button
      className={className}
      onClick={handleClick}
      disabled={isDownloading}
      aria-label={label}
      title={label}
    >
      {icon}
      {showLabel && <span>{label}</span>}
    </button>
  );
}