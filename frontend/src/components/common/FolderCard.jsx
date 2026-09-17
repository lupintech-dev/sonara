// frontend/src/components/common/FolderCard.jsx
import { useState } from 'react';
import { Folder, FolderOpen, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { usePlaylistStore } from '../../store/playlistStore';
import './FolderCard.css';

export default function FolderCard({ folder, onOpen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const renameFolder = usePlaylistStore(s => s.renameFolder);
  const deleteFolder = usePlaylistStore(s => s.deleteFolder);

  const covers = folder.playlists
    .map(p => p.firstTrackImage)
    .filter(Boolean)
    .slice(0, 4);

  const handleRename = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    const next = prompt('Rename folder', folder.name);
    if (!next?.trim() || next.trim() === folder.name) return;
    try {
      await renameFolder(folder.id, next.trim());
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (!confirm(`Delete folder "${folder.name}"? Playlists inside will be kept.`)) return;
    try {
      await deleteFolder(folder.id);
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="folder-card" onClick={onOpen}>
      <div className="folder-card-cover">
        {covers.length >= 2 ? (
          <div className="folder-card-mosaic">
            {covers.map((src, i) => (
              <span key={i} style={{ backgroundImage: `url(${src})` }} />
            ))}
            {Array.from({ length: 4 - covers.length }).map((_, i) => (
              <span key={`empty-${i}`} className="folder-card-mosaic-empty" />
            ))}
          </div>
        ) : covers.length === 1 ? (
          <div className="folder-card-single" style={{ backgroundImage: `url(${covers[0]})` }} />
        ) : (
          <Folder size={40} />
        )}
      </div>

      <div className="folder-card-meta">
        <div className="folder-card-name-row">
          <FolderOpen size={14} className="folder-card-icon" />
          <span className="folder-card-name truncate">{folder.name}</span>
        </div>
        <span className="folder-card-count">
          {folder.playlists.length} {folder.playlists.length === 1 ? 'playlist' : 'playlists'}
        </span>
      </div>

      <button
        className="folder-card-menu-btn"
        onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o); }}
        aria-label="Folder options"
      >
        <MoreHorizontal size={16} />
      </button>

      {menuOpen && (
        <>
          <div className="folder-card-menu-backdrop" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
          <div className="folder-card-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleRename}>
              <Pencil size={14} /> Rename
            </button>
            <button onClick={handleDelete} className="danger">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}