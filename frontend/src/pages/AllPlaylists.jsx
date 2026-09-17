// frontend/src/pages/AllPlaylists.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListMusic, Plus, FolderPlus, Loader2 } from 'lucide-react';
import { usePlaylistStore } from '../store/playlistStore';
import FolderCard from '../components/common/FolderCard';
import './AllPlaylists.css';

export default function AllPlaylists() {
  const navigate = useNavigate();
  const playlists = usePlaylistStore(s => s.playlists);
  const folders   = usePlaylistStore(s => s.folders);
  const refresh   = usePlaylistStore(s => s.refresh);
  const create    = usePlaylistStore(s => s.create);
  const createFolder = usePlaylistStore(s => s.createFolder);
  const addToFolder  = usePlaylistStore(s => s.addPlaylistToFolder);

  const [dragPlaylistId, setDragPlaylistId] = useState(null);
  const [hoverFolderId, setHoverFolderId]   = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreatePlaylist = async () => {
    const name = prompt('Playlist name?');
    if (!name?.trim()) return;
    try {
      const pl = await create({ name: name.trim() });
      navigate(`/playlist/${pl.id}`);
    } catch (err) { alert(err.message); }
  };

  const handleCreateFolder = async () => {
    const name = prompt('Folder name?');
    if (!name?.trim()) return;
    try {
      await createFolder(name.trim());
    } catch (err) { alert(err.message); }
  };

  // Playlists that aren't in any folder
  const foldedIds = new Set(folders.flatMap(f => f.playlists.map(p => p.id)));
  const unfolded = playlists.filter(p => !foldedIds.has(p.id));

  const handleDropOnFolder = async (folderId) => {
    if (!dragPlaylistId) return;
    setBusy(true);
    try {
      await addToFolder(folderId, dragPlaylistId);
    } catch (err) { alert(err.message); }
    finally {
      setDragPlaylistId(null);
      setHoverFolderId(null);
      setBusy(false);
    }
  };

  return (
    <div className="allpl">
      <header className="allpl-header">
        <h1>All Playlists</h1>
        <div className="allpl-actions">
          <button className="allpl-new-btn" onClick={handleCreateFolder}>
            <FolderPlus size={16} />
            <span>New folder</span>
          </button>
          <button className="allpl-new-btn primary" onClick={handleCreatePlaylist}>
            <Plus size={16} />
            <span>New playlist</span>
          </button>
        </div>
      </header>

      {/* Folders */}
      {folders.length > 0 && (
        <section className="allpl-section">
          <h2>Folders</h2>
          <div className="allpl-folder-grid">
            {folders.map(folder => {
              const isHover = hoverFolderId === folder.id;
              return (
                <div
                  key={folder.id}
                  className={`allpl-folder-wrap ${isHover ? 'drop-target' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setHoverFolderId(folder.id); }}
                  onDragLeave={() => setHoverFolderId(null)}
                  onDrop={() => handleDropOnFolder(folder.id)}
                >
                  <FolderCard folder={folder} onOpen={() => navigate(`/playlists/folder/${folder.id}`)} />
                </div>
              );
            })}
          </div>
          {busy && <p className="allpl-hint"><Loader2 size={13} className="allpl-spin" /> Updating…</p>}
        </section>
      )}

      {/* Unfiled playlists */}
      <section className="allpl-section">
        <div className="allpl-section-head">
          <h2>{folders.length > 0 ? 'Playlists' : 'Your playlists'}</h2>
          {folders.length > 0 && unfolded.length > 0 && (
            <span className="allpl-hint-inline">Drag a playlist onto a folder to file it</span>
          )}
        </div>

        {unfolded.length === 0 && folders.length === 0 && (
          <div className="allpl-empty">
            <div className="allpl-empty-art"><ListMusic size={56} /></div>
            <h2>Create your first playlist</h2>
            <p>It's easy — we'll help you.</p>
            <button className="allpl-new-btn primary" onClick={handleCreatePlaylist}>
              <Plus size={16} /><span>New playlist</span>
            </button>
          </div>
        )}

        {unfolded.length === 0 && folders.length > 0 && (
          <p className="allpl-hint">All your playlists are in folders.</p>
        )}

        {unfolded.length > 0 && (
          <div className="pl-grid">
            {unfolded.map(pl => (
              <button
                key={pl.id}
                className="pl-card"
                draggable
                onDragStart={() => setDragPlaylistId(pl.id)}
                onDragEnd={() => { setDragPlaylistId(null); setHoverFolderId(null); }}
                onClick={() => navigate(`/playlist/${pl.id}`)}
              >
                <div
                  className="pl-card-cover"
                  style={pl.firstTrackImage ? { background: `url(${pl.firstTrackImage}) center/cover` } : undefined}
                >
                  {!pl.firstTrackImage && <ListMusic size={40} />}
                </div>
                <div className="pl-card-meta">
                  <span className="pl-card-name truncate">{pl.name}</span>
                  <span className="pl-card-count">
                    {pl.trackCount || 0} {pl.trackCount === 1 ? 'song' : 'songs'}
                    {pl.isCollaborative && ' · collaborative'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}