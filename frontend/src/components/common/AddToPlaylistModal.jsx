// frontend/src/components/common/AddToPlaylistModal.jsx
import { useEffect, useState } from 'react';
import { X, Plus, Check, ListMusic, Loader2, Users } from 'lucide-react';
import { usePlaylistStore } from '../../store/playlistStore';
import { addTrackToPlaylist } from '../../api/playlists';
import './AddToPlaylistModal.css';

export default function AddToPlaylistModal({ track, onClose }) {
  const playlists = usePlaylistStore(s => s.playlists);
  const refresh   = usePlaylistStore(s => s.refresh);
  const create    = usePlaylistStore(s => s.create);
  const bump      = usePlaylistStore(s => s.bumpTrackCount);

  const [busyId, setBusyId] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const handleAdd = async (playlistId) => {
    setBusyId(playlistId);
    setError(null);
    try {
      await addTrackToPlaylist(playlistId, track);
      setAddedId(playlistId);
      bump(playlistId, 1);
      setTimeout(() => setAddedId(null), 1400);
    } catch (err) {
      if (err.message.includes('already')) {
        setAddedId(playlistId);
        setTimeout(() => setAddedId(null), 1400);
      } else {
        setError(err.message);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const pl = await create({ name: newName });
      setNewName('');
      setCreating(false);
      handleAdd(pl.id);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  // Only show playlists the user can add to
  const editable = playlists.filter(p => p.isOwner !== false);

  return (
    <div className="atm-backdrop" onClick={onClose}>
      <div className="atm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="atm-header">
          <h3>Add to playlist</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        <div className="atm-track">
          <span className="atm-track-cover">
            {track.image ? <img src={track.image} alt="" /> : <span className="atm-track-cover-fallback" />}
          </span>
          <span className="atm-track-meta">
            <span className="atm-track-title truncate">{track.title}</span>
            <span className="atm-track-artist truncate">{track.artist?.name || 'Unknown'}</span>
          </span>
        </div>

        <form className="atm-create" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="New playlist name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={creating}
          />
          <button type="submit" disabled={!newName.trim() || creating}>
            {creating ? <Loader2 size={16} className="atm-spin" /> : <Plus size={16} />}
            <span>Create</span>
          </button>
        </form>

        {error && <p className="atm-error">{error}</p>}

        <div className="atm-list scroll-y">
          {editable.length === 0 && (
            <p className="atm-empty">No playlists yet. Create one above.</p>
          )}
          {editable.map(p => {
            const isBusy = busyId === p.id;
            const isDone = addedId === p.id;
            return (
              <button
                key={p.id}
                className={`atm-item ${isDone ? 'done' : ''}`}
                onClick={() => handleAdd(p.id)}
                disabled={isBusy}
              >
                <span className="atm-item-art"><ListMusic size={18} /></span>
                <span className="atm-item-meta">
                  <span className="atm-item-name truncate">
                    {p.name}
                    {p.isCollaborator && <Users size={11} style={{ marginLeft: 6, verticalAlign: 'middle' }} />}
                  </span>
                  <span className="atm-item-count">
                    {p.trackCount || 0} {p.trackCount === 1 ? 'song' : 'songs'}
                    {p.isCollaborator && ' · collaborative'}
                  </span>
                </span>
                <span className="atm-item-action">
                  {isBusy && <Loader2 size={16} className="atm-spin" />}
                  {isDone && <Check size={16} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}