// frontend/src/pages/FolderDetailPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FolderOpen, ListMusic, Loader2, MoreHorizontal,
  GripVertical, X, Play,
} from 'lucide-react';
import { usePlaylistStore } from '../store/playlistStore';
import { usePlayerStore } from '../store/playerStore';
import './FolderDetailPage.css';

export default function FolderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const folderId = parseInt(id, 10);

  const folders = usePlaylistStore(s => s.folders);
  const refresh = usePlaylistStore(s => s.refresh);
  const removeFromFolder = usePlaylistStore(s => s.removePlaylistFromFolder);
  const reorder = usePlaylistStore(s => s.reorderFolderPlaylists);

  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [loading, setLoading] = useState(!folders.length);

  useEffect(() => {
    if (!folders.length) {
      setLoading(true);
      refresh().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [folders.length, refresh]);

  const folder = folders.find(f => f.id === folderId);

  if (loading) {
    return (
      <div className="folder-page">
        <div className="folder-loading">
          <Loader2 size={22} className="folder-spin" />
          Loading folder…
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="folder-page">
        <button className="folder-back" onClick={() => navigate('/playlists')}>
          <ArrowLeft size={20} /> Back to playlists
        </button>
        <p className="folder-empty">Folder not found.</p>
      </div>
    );
  }

  const handleDrop = async (toIndex) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...folder.playlists];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, moved);
    setDragIndex(null);
    setOverIndex(null);
    try {
      await reorder(folder.id, next.map(p => p.id));
    } catch (err) {
      console.warn('[folder reorder] failed:', err.message);
      refresh();
    }
  };

  const handleRemove = async (e, plId) => {
    e.stopPropagation();
    if (!confirm('Remove this playlist from the folder? The playlist itself is kept.')) return;
    try {
      await removeFromFolder(folder.id, plId);
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="folder-page">
      <header className="folder-hero">
        <button className="folder-back" onClick={() => navigate('/playlists')} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="folder-hero-icon"><FolderOpen size={40} /></div>
        <div className="folder-hero-meta">
          <span className="folder-hero-label">Folder</span>
          <h1 className="folder-hero-title">{folder.name}</h1>
          <p className="folder-hero-count">
            {folder.playlists.length} {folder.playlists.length === 1 ? 'playlist' : 'playlists'}
          </p>
        </div>
      </header>

      {folder.playlists.length === 0 ? (
        <div className="folder-empty-state">
          <div className="folder-empty-art"><ListMusic size={48} /></div>
          <h2>This folder is empty</h2>
          <p>Drag playlists onto this folder from the All Playlists page.</p>
          <button className="folder-empty-btn" onClick={() => navigate('/playlists')}>
            Go to playlists
          </button>
        </div>
      ) : (
        <div className="folder-list">
          {folder.playlists.map((pl, i) => {
            const isDragging = dragIndex === i;
            const isOver = overIndex === i;
            return (
              <div
                key={pl.id}
                className={`folder-item ${isDragging ? 'dragging' : ''} ${isOver ? 'over' : ''}`}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
                onDragLeave={() => setOverIndex(null)}
                onDrop={() => handleDrop(i)}
                onClick={() => navigate(`/playlist/${pl.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/playlist/${pl.id}`); }}
              >
                <span className="folder-item-grip"><GripVertical size={14} /></span>
                <div
                  className="folder-item-cover"
                  style={pl.firstTrackImage ? { background: `url(${pl.firstTrackImage}) center/cover` } : undefined}
                >
                  {!pl.firstTrackImage && <ListMusic size={22} />}
                </div>
                <div className="folder-item-meta">
                  <span className="folder-item-name truncate">{pl.name}</span>
                  <span className="folder-item-count">
                    {pl.trackCount || 0} {pl.trackCount === 1 ? 'song' : 'songs'}
                  </span>
                </div>
                <button
                  className="folder-item-remove"
                  onClick={(e) => handleRemove(e, pl.id)}
                  aria-label="Remove from folder"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}