// frontend/src/pages/PlaylistDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play, Pencil, Trash2, X, Check, ListMusic, GripVertical,
  Share2, Users, UserMinus, Copy, LogOut, Loader2,
} from 'lucide-react';
import {
  getPlaylist, removeTrackFromPlaylist, reorderPlaylist,
  updatePlaylist, deletePlaylist, generateShareCode, revokeShareCode,
  removeCollaborator,
} from '../api/playlists';
import { usePlayerStore } from '../store/playerStore';
import { usePlaylistStore } from '../store/playlistStore';
import { useAuth } from '../contexts/AuthContext';
import TrackRow from '../components/common/TrackRow';
import './PlaylistDetail.css';

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [showShare, setShowShare] = useState(false);

  const playTracks  = usePlayerStore(s => s.playTracks);
  const refreshLists = usePlaylistStore(s => s.refresh);
  const removeLocal  = usePlaylistStore(s => s.remove);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPlaylist(id);
      setData(res);
      setDraftName(res.playlist.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const handlePlayAll = () => {
    if (data?.tracks?.length) playTracks(data.tracks, 0);
  };

  const handleRemove = async (item) => {
    if (!confirm(`Remove "${item.title}" from this playlist?`)) return;
    try {
      await removeTrackFromPlaylist(data.playlist.id, item._ptId);
      setData(d => ({ ...d, tracks: d.tracks.filter(t => t._ptId !== item._ptId) }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRename = async () => {
    const nextName = draftName.trim();
    if (!nextName || nextName === data.playlist.name) {
      setEditing(false);
      setDraftName(data.playlist.name);
      return;
    }
    try {
      const updated = await updatePlaylist(data.playlist.id, { name: nextName });
      setData(d => ({ ...d, playlist: { ...d.playlist, ...updated } }));
      setEditing(false);
      refreshLists();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete playlist "${data.playlist.name}"? This can't be undone.`)) return;
    try {
      await deletePlaylist(data.playlist.id);
      removeLocal(data.playlist.id);
      navigate('/playlists');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    if (!confirm(`Leave "${data.playlist.name}"? You'll lose edit access.`)) return;
    try {
      await removeCollaborator(data.playlist.id, `user:${user.id}`);
      navigate('/playlists');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDragStart = (i) => setDragIndex(i);
  const handleDragOver  = (e) => { e.preventDefault(); };
  const handleDrop = async (i) => {
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); return; }
    const next = [...data.tracks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setData(d => ({ ...d, tracks: next }));
    setDragIndex(null);
    try {
      await reorderPlaylist(data.playlist.id, next.map(t => t._ptId));
    } catch (err) {
      console.warn('[reorder] failed, reloading', err.message);
      load();
    }
  };

  if (loading) return <div className="pd-state">Loading playlist…</div>;
  if (error)   return <div className="pd-state pd-error">{error}</div>;
  if (!data)   return null;

  const { playlist, tracks, isOwner, isCollaborator, canEdit } = data;
  const collaborators = playlist.collaborators || [];

  return (
    <div className="pd">
      <header className="pd-hero">
        <div className="pd-cover">
          <ListMusic size={64} />
        </div>
        <div className="pd-meta">
          <span className="pd-label">
            {isCollaborator ? 'Collaborative playlist' : playlist.isPublic ? 'Public playlist' : 'Playlist'}
          </span>
          {editing ? (
            <div className="pd-rename">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditing(false); setDraftName(playlist.name); } }}
                autoFocus
              />
              <button className="btn-icon" onClick={handleRename} aria-label="Save"><Check size={18} /></button>
              <button className="btn-icon" onClick={() => { setEditing(false); setDraftName(playlist.name); }} aria-label="Cancel"><X size={18} /></button>
            </div>
          ) : (
            <h1 className="pd-title">
              {playlist.name}
              {isOwner && (
                <button className="btn-icon pd-rename-btn" onClick={() => setEditing(true)} aria-label="Rename">
                  <Pencil size={16} />
                </button>
              )}
            </h1>
          )}
          <p className="pd-count">
            {tracks.length} {tracks.length === 1 ? 'song' : 'songs'}
            {!isOwner && ' · Collaborating'}
          </p>

          {/* Collaborator avatars */}
          {collaborators.length > 0 && (
            <div className="pd-collab-row">
              <Users size={14} className="pd-collab-icon" />
              <div className="pd-collab-avatars">
                {collaborators.slice(0, 5).map(c => (
                  <span
                    key={c.userId}
                    className="pd-collab-avatar"
                    title={c.displayName || c.username || c.userId}
                  >
                    {c.avatarPath
                      ? <img src={c.avatarPath} alt="" />
                      : <span>{(c.displayName || c.username || '?')[0]?.toUpperCase()}</span>}
                  </span>
                ))}
                {collaborators.length > 5 && (
                  <span className="pd-collab-avatar more">+{collaborators.length - 5}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="pd-actions">
        <button className="pd-play-all" onClick={handlePlayAll} disabled={!tracks.length} aria-label="Play">
          <Play size={22} fill="#000" />
        </button>
        {isOwner && (
          <button className="pd-share" onClick={() => setShowShare(true)}>
            <Share2 size={16} />
            <span>Invite</span>
          </button>
        )}
        {isOwner && (
          <button className="btn-icon pd-delete" onClick={handleDelete} aria-label="Delete playlist">
            <Trash2 size={18} />
          </button>
        )}
        {isCollaborator && (
          <button className="pd-leave" onClick={handleLeave}>
            <LogOut size={15} />
            <span>Leave</span>
          </button>
        )}
      </div>

      {tracks.length === 0 ? (
        <p className="pd-empty">This playlist is empty. Add tracks from the ⋯ menu anywhere.</p>
      ) : (
        <div className="pd-list">
          {tracks.map((track, i) => (
            <div
              key={track._ptId}
              className="pd-item"
              draggable={canEdit}
              onDragStart={() => handleDragStart(i)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(i)}
            >
              {canEdit && <span className="pd-grip"><GripVertical size={14} /></span>}
              <TrackRow track={track} queue={tracks} />
              {canEdit && (
                <button className="btn-icon pd-remove" onClick={() => handleRemove(track)} aria-label="Remove">
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showShare && isOwner && (
        <ShareModal playlist={playlist} onClose={() => setShowShare(false)} onChange={load} />
      )}
    </div>
  );
}

/* ---------- Share modal ---------- */

function ShareModal({ playlist, onClose, onChange }) {
  const [code, setCode] = useState(playlist.shareCode || null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = code ? `${window.location.origin}/join/${code}` : null;

  const enable = async () => {
    setBusy(true);
    try {
      const c = await generateShareCode(playlist.id);
      setCode(c);
      onChange?.();
    } catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };

  const disable = async () => {
    if (!confirm('Stop inviting new collaborators? Existing ones keep access.')) return;
    setBusy(true);
    try {
      await revokeShareCode(playlist.id);
      setCode(null);
      onChange?.();
    } catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };

  const removeCollab = async (userId) => {
    if (!confirm('Remove this collaborator?')) return;
    setBusy(true);
    try {
      await removeCollaborator(playlist.id, userId);
      onChange?.();
    } catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="pd-modal-backdrop" onClick={onClose}>
      <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
        <header className="pd-modal-header">
          <h3>Invite collaborators</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="pd-modal-body">
          {!code ? (
            <div className="pd-share-off">
              <p>Turn on collaboration to share this playlist with others. Anyone with the invite link can add and remove tracks.</p>
              <button className="pd-btn primary" onClick={enable} disabled={busy}>
                {busy ? <Loader2 size={14} className="pd-spin" /> : <Share2 size={14} />}
                <span>Turn on collaboration</span>
              </button>
            </div>
          ) : (
            <>
              <div className="pd-share-link">
                <label>Invite link</label>
                <div className="pd-share-row">
                  <input type="text" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
                  <button className="pd-btn" onClick={copy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <small>Anyone signed in can join and edit this playlist.</small>
              </div>

              <div className="pd-collab-list">
                <label>Collaborators ({playlist.collaborators?.length || 0})</label>
                {(playlist.collaborators?.length || 0) === 0 && (
                  <p className="pd-empty-inline">No one has joined yet.</p>
                )}
                {playlist.collaborators?.map(c => (
                  <div key={c.userId} className="pd-collab-item">
                    <span className="pd-collab-item-avatar">
                      {c.avatarPath
                        ? <img src={c.avatarPath} alt="" />
                        : <span>{(c.displayName || c.username || '?')[0]?.toUpperCase()}</span>}
                    </span>
                    <span className="pd-collab-item-meta">
                      <span className="pd-collab-item-name truncate">{c.displayName || c.username || c.userId}</span>
                      <span className="pd-collab-item-handle truncate">@{c.username || c.userId}</span>
                    </span>
                    <button className="btn-icon pd-collab-remove" onClick={() => removeCollab(c.userId)} aria-label="Remove">
                      <UserMinus size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pd-share-footer">
                <button className="pd-btn danger" onClick={disable} disabled={busy}>
                  Stop inviting new collaborators
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}