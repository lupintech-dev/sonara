// frontend/src/pages/ArtistDashboardPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic2, Upload, Disc3, Music, Users, Play, Trash2, Loader2, Plus,
  MessageSquare, Send, X, Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePlayerStore } from '../store/playerStore';
import { getMyArtistProfile, deleteTrack } from '../api/artist';
import { sendMessage, getMyMessages } from '../api/messages';
import TrackRow from '../components/common/TrackRow';
import './ArtistDashboardPage.css';

export default function ArtistDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthed } = useAuth();
  const playTracks = usePlayerStore(s => s.playTracks);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showContact, setShowContact] = useState(false);

  useEffect(() => { if (!isAuthed) navigate('/login'); }, [isAuthed, navigate]);

  useEffect(() => {
    if (!user?.is_verified_artist) return;
    let cancelled = false;
    setLoading(true);
    getMyArtistProfile()
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user?.is_verified_artist]);

  if (!user) return null;

  if (!user.is_verified_artist) {
    return (
      <div className="adash">
        <div className="adash-empty">
          <div className="adash-empty-icon"><Mic2 size={40} /></div>
          <h1>You're not an artist yet</h1>
          <p>Apply to become an artist and start uploading your music for free.</p>
          <button className="adash-primary" onClick={() => navigate('/artist/apply')}>
            <Mic2 size={16} /> Become an Artist
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="adash"><div className="adash-loading"><Loader2 size={26} className="adash-spin" /> Loading…</div></div>;
  }

  if (error) {
    return <div className="adash"><div className="adash-empty"><p className="adash-error">Couldn't load: {error}</p></div></div>;
  }

  const stats = data?.stats || { plays: 0, followers: 0, trackCount: 0, albumCount: 0 };
  const tracks = data?.tracks || [];
  const albums = data?.albums || [];

  const handleDelete = async (track) => {
    if (!confirm(`Delete "${track.title}"? This can't be undone.`)) return;
    setDeleting(track.dbId);
    try {
      await deleteTrack(track.dbId);
      setData(d => ({
        ...d,
        tracks: d.tracks.filter(t => t.dbId !== track.dbId),
        stats: { ...d.stats, trackCount: d.stats.trackCount - 1 },
      }));
    } catch (err) { alert(err.message); }
    finally { setDeleting(null); }
  };

  const handlePlayAll = () => { if (tracks.length) playTracks(tracks, 0); };

  return (
    <div className="adash">
      <header className="adash-header">
        <div className="adash-header-text">
          <span className="adash-label">Artist Dashboard</span>
          <h1>{user.display_name || user.username}</h1>
        </div>
        <div className="adash-header-actions">
          <button className="adash-primary" onClick={() => navigate('/artist/upload')}>
            <Upload size={16} /> Upload track
          </button>
          <button className="adash-secondary" onClick={() => setShowContact(true)}>
            <MessageSquare size={16} /> Contact admin
          </button>
          <button className="adash-secondary" onClick={() => navigate(`/artist/${user.id}`)}>
            View public page
          </button>
        </div>
      </header>

      <section className="adash-stats">
        <div className="adash-stat">
          <Music size={18} />
          <div>
            <span className="adash-stat-value">{stats.trackCount}</span>
            <span className="adash-stat-label">Tracks</span>
          </div>
        </div>
        <div className="adash-stat">
          <Disc3 size={18} />
          <div>
            <span className="adash-stat-value">{stats.albumCount}</span>
            <span className="adash-stat-label">Albums</span>
          </div>
        </div>
        <div className="adash-stat">
          <Play size={18} />
          <div>
            <span className="adash-stat-value">{stats.plays}</span>
            <span className="adash-stat-label">Total plays</span>
          </div>
        </div>
        <div className="adash-stat">
          <Users size={18} />
          <div>
            <span className="adash-stat-value">{stats.followers}</span>
            <span className="adash-stat-label">Followers</span>
          </div>
        </div>
      </section>

      <section className="adash-section">
        <h2>Your tracks</h2>
        {tracks.length === 0 ? (
          <div className="adash-empty-inline">
            <p>No tracks yet.</p>
            <button className="adash-primary" onClick={() => navigate('/artist/upload')}>
              <Plus size={16} /> Upload your first track
            </button>
          </div>
        ) : (
          <>
            <div className="adash-track-actions">
              <button className="adash-play-all" onClick={handlePlayAll}>
                <Play size={20} fill="#000" />
              </button>
              <span className="adash-track-count">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
            </div>
            <div className="track-list">
              {tracks.map(t => (
                <div key={t.id} className="adash-track-wrap">
                  <TrackRow track={t} queue={tracks} />
                  <button
                    className="btn-icon adash-delete"
                    onClick={() => handleDelete(t)}
                    disabled={deleting === t.dbId}
                    aria-label="Delete track"
                  >
                    {deleting === t.dbId ? <Loader2 size={14} className="adash-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="adash-section">
        <h2>Your albums</h2>
        {albums.length === 0 ? (
          <p className="adash-hint">No albums yet. Albums are created automatically when you upload a track with a new album name.</p>
        ) : (
          <div className="adash-album-grid">
            {albums.map(al => (
              <div key={al.id} className="adash-album-card">
                <div className="adash-album-cover">
                  {al.coverPath ? <img src={al.coverPath} alt="" /> : <Disc3 size={32} />}
                </div>
                <div className="adash-album-name truncate">{al.name}</div>
                <div className="adash-album-count">{al.trackCount} {al.trackCount === 1 ? 'track' : 'tracks'}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showContact && <ContactAdminModal onClose={() => setShowContact(false)} />}
    </div>
  );
}

function ContactAdminModal({ onClose }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [myMessages, setMyMessages] = useState([]);

  useEffect(() => { getMyMessages().then(setMyMessages).catch(() => {}); }, [sent]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setBusy(true); setError(null);
    try {
      await sendMessage({ subject: subject.trim(), body: body.trim() });
      setSubject(''); setBody('');
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="adash-modal-backdrop" onClick={onClose}>
      <div className="adash-modal" onClick={(e) => e.stopPropagation()}>
        <header className="adash-modal-header">
          <h3>Contact admin</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>

        <div className="adash-modal-body">
          <form onSubmit={handleSend} className="adash-contact-form">
            <label>
              <span>Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Display name change request"
                maxLength={200}
                required
              />
            </label>
            <label>
              <span>Message</span>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe what you need help with…"
                maxLength={5000}
                required
              />
            </label>

            {error && <p className="adash-modal-error">{error}</p>}
            {sent && (
              <p className="adash-modal-success">
                <Check size={14} /> Sent — the admin will reply here.
              </p>
            )}

            <button type="submit" className="adash-primary" disabled={busy || !subject.trim() || !body.trim()}>
              {busy ? <Loader2 size={14} className="adash-spin" /> : <Send size={14} />}
              <span>{busy ? 'Sending…' : 'Send to admin'}</span>
            </button>
          </form>

          {myMessages.length > 0 && (
            <div className="adash-contact-history">
              <h4>Your previous messages</h4>
              <ul>
                {myMessages.slice(0, 5).map(m => (
                  <li key={m.id}>
                    <div className="adash-contact-history-title">
                      <strong>{m.subject}</strong>
                      <span className={`adash-status-pill ${m.status}`}>{m.status}</span>
                    </div>
                    <div className="adash-contact-history-sub">
                      {m.createdAt}
                      {m.replyCount > 0 && ` · ${m.replyCount} ${m.replyCount === 1 ? 'reply' : 'replies'}`}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}