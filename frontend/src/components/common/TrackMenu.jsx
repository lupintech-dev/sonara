// frontend/src/components/common/TrackMenu.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal, Heart, ListPlus, ListEnd, User, Share2, Plus,
  Download, Check, Loader2, Trash2,
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useDownloadStore } from '../../store/downloadStore';
import AddToPlaylistModal from './AddToPlaylistModal';
import './TrackMenu.css';

export default function TrackMenu({ track }) {
  const [open, setOpen] = useState(false);
  const [showAddTo, setShowAddTo] = useState(false);
  const [error, setError] = useState(null);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  const isLiked    = usePlayerStore(s => (track ? !!s.likedTracks[track.id] : false));
  const toggleLike = usePlayerStore(s => s.toggleLike);
  const playNext   = usePlayerStore(s => s.playNext);
  const addToQueue = usePlayerStore(s => s.addToQueue);

  const isDownloaded = useDownloadStore(s => (track ? !!s.entries[track.id] : false));
  const downloading  = useDownloadStore(s => s.downloading);
  const progress     = useDownloadStore(s => s.progress);
  const download     = useDownloadStore(s => s.download);
  const remove       = useDownloadStore(s => s.remove);

  const isDownloading = track ? downloading.has(track.id) : false;
  const dlPct = track ? (progress[track.id] ?? 0) : 0;

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 3000);
    return () => clearTimeout(t);
  }, [error]);

  const handle = (fn) => (e) => {
    e.stopPropagation();
    fn();
    setOpen(false);
  };

  const openAddToPlaylist = (e) => {
    e.stopPropagation();
    setOpen(false);
    setShowAddTo(true);
  };

  const goToArtist = (e) => {
    e.stopPropagation();
    setOpen(false);
    if (!track?.artist?.id) return;

    if (track.source === 'audius') {
      navigate(`/artist/external/audius/${track.artist.id}`);
    } else if (track.source === 'jamendo') {
      navigate(`/artist/external/jamendo/${track.artist.id}`);
    } else if (track.source === 'local') {
      navigate(`/artist/${track.artist.id}`);
    }
  };

  const handleShare = handle(async () => {
    const url = `${window.location.origin}/track/${encodeURIComponent(track.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: track.title, url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  });

  const handleDownloadClick = async (e) => {
    e.stopPropagation();
    if (isDownloading) return;

    if (isDownloaded) {
      // Leave the menu open so the user sees the state, but confirm
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
      setTimeout(() => setError(null), 3000);
    }
  };

  if (!track) return null;

  const hasArtist = !!track.artist?.id;

  // Download label varies by state
  let downloadLabel = 'Download';
  if (isDownloaded) downloadLabel = 'Remove download';
  else if (isDownloading) downloadLabel = `Downloading ${Math.round(dlPct * 100)}%`;
  if (error) downloadLabel = error;

  return (
    <>
      <div className="track-menu" ref={wrapRef}>
        <button
          className="btn-icon track-menu-trigger"
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
          aria-label="More options"
        >
          <MoreHorizontal size={16} />
        </button>

        {open && (
          <div className="track-menu-popover" role="menu">
            <button className="track-menu-item" onClick={handle(() => toggleLike(track))} role="menuitem">
              <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
              <span>{isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}</span>
            </button>
            <button className="track-menu-item" onClick={handle(() => playNext(track))} role="menuitem">
              <ListEnd size={16} />
              <span>Play Next</span>
            </button>
            <button className="track-menu-item" onClick={handle(() => addToQueue(track))} role="menuitem">
              <ListPlus size={16} />
              <span>Add to Queue</span>
            </button>

            <div className="track-menu-sep" />

            <button
              className="track-menu-item"
              onClick={handleDownloadClick}
              role="menuitem"
              disabled={isDownloading}
            >
              {isDownloaded ? (
                <Trash2 size={16} />
              ) : isDownloading ? (
                <Loader2 size={16} className="track-menu-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>{downloadLabel}</span>
            </button>

            <button className="track-menu-item" onClick={openAddToPlaylist} role="menuitem">
              <Plus size={16} />
              <span>Add to Playlist</span>
            </button>

            {hasArtist && (
              <button className="track-menu-item" onClick={goToArtist} role="menuitem">
                <User size={16} />
                <span>Go to Artist</span>
              </button>
            )}

            <button className="track-menu-item" onClick={handleShare} role="menuitem">
              <Share2 size={16} />
              <span>Share</span>
            </button>
          </div>
        )}
      </div>

      {showAddTo && (
        <AddToPlaylistModal track={track} onClose={() => setShowAddTo(false)} />
      )}
    </>
  );
}