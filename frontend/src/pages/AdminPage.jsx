// frontend/src/pages/AdminPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, Music, ListMusic, Loader2, Search, Mic2, Crown,
  Activity, Sparkles, Upload, FileArchive, MessageSquare, Check,
  X, Inbox, Send, FileText, Plus, AlertCircle, Image as ImageIcon,
  Trash2, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as adminApi from '../api/admin';
import './AdminPage.css';

const TABS = [
  { id: 'users',    label: 'Users',    icon: Users },
  { id: 'upload',   label: 'Upload',   icon: Upload },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('users');

  useEffect(() => {
    if (!user || !user.is_admin) navigate('/');
  }, [user, navigate]);

  if (!user?.is_admin) return null;

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-badge"><Shield size={22} /></div>
        <div>
          <h1>Admin</h1>
          <p>Manage users, uploads, artist messages, and activity.</p>
        </div>
      </header>

      <AdminStats />

      <nav className="admin-tabs">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`admin-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={16} /> <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {tab === 'users'    && <UsersTab meId={user.id} />}
      {tab === 'upload'   && <UploadTab />}
      {tab === 'messages' && <MessagesTab />}
      {tab === 'activity' && <ActivityTab />}
    </div>
  );
}

function AdminStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => { adminApi.getStats().then(setStats).catch(() => {}); }, []);

  if (!stats) {
    return (
      <div className="admin-stats-skeleton">
        {[1,2,3,4].map(i => <div key={i} className="admin-stat-skeleton" />)}
      </div>
    );
  }

  const tiles = [
    { label: 'Users',        value: stats.totalUsers,   icon: Users },
    { label: 'Artists',      value: stats.artists,      icon: Mic2 },
    { label: 'Local tracks', value: stats.localTracks,  icon: Music },
    { label: 'Playlists',    value: stats.playlists,    icon: ListMusic },
    { label: 'Total plays',  value: stats.totalPlays,   icon: Sparkles },
    { label: 'Open msgs',    value: stats.openMessages, icon: Inbox, highlight: stats.openMessages > 0 },
  ];

  return (
    <div className="admin-stats">
      {tiles.map(t => {
        const Icon = t.icon;
        return (
          <div key={t.label} className={`admin-stat ${t.highlight ? 'highlight' : ''}`}>
            <Icon size={16} />
            <div className="admin-stat-value">{t.value.toLocaleString()}</div>
            <div className="admin-stat-label">{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function UsersTab({ meId }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async (query = q) => {
    setLoading(true);
    try { setUsers(await adminApi.getUsers(query)); }
    catch (err) { console.warn(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(''); /* eslint-disable-next-line */ }, []);

  const handle = async (e, id, action) => {
    e.stopPropagation();
    setBusyId(id);
    try {
      if (action === 'verify')        await adminApi.verifyArtist(id);
      else if (action === 'unverify') await adminApi.unverifyArtist(id);
      else if (action === 'grant')    await adminApi.grantAdmin(id);
      else if (action === 'revoke')   await adminApi.revokeAdmin(id);
      await load();
    } catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const handleDelete = async (e, u) => {
    e.stopPropagation();
    const isManaged = u.isManaged;
    const warning = isManaged
      ? `Delete "${u.displayName || u.username}"?\n\nThis permanently removes the artist, all their tracks, albums, and follows. This cannot be undone.`
      : `Delete REAL USER "${u.displayName || u.username}"?\n\nThis is a real account. Deleting will remove:\n• All their uploaded tracks & files\n• Their albums, playlists, favorites, and history\n• All their follows\n\nThis CANNOT be undone.`;
    if (!confirm(warning)) return;

    setBusyId(u.id);
    try {
      const res = await adminApi.deleteUser(u.id, { force: !isManaged });
      await load();
      console.log('[admin] deleted:', res);
    } catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const openProfile = (u) => {
    navigate(`/artist/${u.id}`);
  };

  return (
    <section className="admin-section">
      <form className="admin-search" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <Search size={16} />
        <input
          type="text"
          placeholder="Search username, display name, or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      {loading && <p className="admin-hint">Loading…</p>}
      {!loading && users.length === 0 && <p className="admin-hint">No users found.</p>}

      {!loading && users.length > 0 && (
        <ul className="admin-list">
          {users.map(u => (
            <li
              key={u.id}
              className="admin-row clickable"
              onClick={() => openProfile(u)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') openProfile(u); }}
              title="Click to open profile"
            >
              <div className="admin-row-avatar">
                {u.avatarPath ? <img src={u.avatarPath} alt="" /> : <span>{u.username[0]?.toUpperCase()}</span>}
              </div>
              <div className="admin-row-main">
                <div className="admin-row-title">
                  <strong>{u.displayName || u.username}</strong>
                  {u.isAdmin && <span className="admin-pill admin-pill-crown"><Crown size={10} /> Admin</span>}
                  {u.isVerifiedArtist && <span className="admin-pill admin-pill-artist">Artist</span>}
                  {u.isManaged && <span className="admin-pill admin-pill-managed">Managed</span>}
                </div>
                <div className="admin-row-sub">
                  @{u.username}{u.email && ` · ${u.email}`} · joined {new Date(u.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString()}
                </div>
              </div>
              <div className="admin-row-actions">
                {u.isVerifiedArtist ? (
                  <button className="admin-action" onClick={(e) => handle(e, u.id, 'unverify')} disabled={busyId === u.id}>
                    Unverify
                  </button>
                ) : (
                  <button className="admin-action" onClick={(e) => handle(e, u.id, 'verify')} disabled={busyId === u.id}>
                    Verify artist
                  </button>
                )}
                {u.isAdmin ? (
                  u.id !== meId && (
                    <button className="admin-action reject" onClick={(e) => handle(e, u.id, 'revoke')} disabled={busyId === u.id}>
                      Revoke admin
                    </button>
                  )
                ) : (
                  <button className="admin-action" onClick={(e) => handle(e, u.id, 'grant')} disabled={busyId === u.id}>
                    Grant admin
                  </button>
                )}
                {u.id !== meId && (
                  <button
                    className="admin-action danger"
                    onClick={(e) => handleDelete(e, u)}
                    disabled={busyId === u.id}
                    title={u.isManaged ? 'Delete managed artist' : 'Delete real user (dangerous)'}
                  >
                    {busyId === u.id ? <Loader2 size={14} className="admin-spin" /> : <Trash2 size={14} />}
                  </button>
                )}
                <ChevronRight size={16} className="admin-row-chevron" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UploadTab() {
  const [mode, setMode] = useState('single');

  return (
    <section className="admin-section">
      <div className="admin-subtabs">
        {[
          { id: 'single',  label: 'Single track' },
          { id: 'zip',     label: 'ZIP archive' },
          { id: 'artists', label: 'Bulk artists' },
        ].map(m => (
          <button
            key={m.id}
            className={`admin-subtab ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'single'  && <SingleUpload />}
      {mode === 'zip'     && <ZipUpload />}
      {mode === 'artists' && <BulkArtists />}
    </section>
  );
}

function SingleUpload() {
  const audioRef = useRef(null);
  const imageRef = useRef(null);
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const reset = () => {
    setAudioFile(null); setImageFile(null);
    setTitle(''); setArtistName(''); setAlbumName('');
    setError(null);
    if (audioRef.current) audioRef.current.value = '';
    if (imageRef.current) imageRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile || !title.trim() || !artistName.trim()) return;
    setBusy(true); setError(null); setSuccess(null);
    try {
      const duration = await new Promise((resolve) => {
        const url = URL.createObjectURL(audioFile);
        const a = new Audio();
        a.preload = 'metadata';
        a.src = url;
        a.onloadedmetadata = () => { const d = a.duration; URL.revokeObjectURL(url); resolve(d || 0); };
        a.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
      });

      const track = await adminApi.uploadSingleTrack({
        audioFile, imageFile, title: title.trim(),
        artistName: artistName.trim(), albumName: albumName.trim(), duration,
      });
      setSuccess(track);
      reset();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form className="admin-upload-form" onSubmit={handleSubmit}>
      {success && (
        <div className="admin-upload-success">
          <Check size={16} />
          <span>Uploaded <strong>{success.title}</strong> by <strong>{success.artist?.name}</strong></span>
          <button type="button" onClick={() => setSuccess(null)}><X size={14} /></button>
        </div>
      )}

      <label className="admin-upload-field">
        <span>Audio file *</span>
        <input ref={audioRef} type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} required />
        <small>Cover art and duration are pulled from the file's tags if no image is provided.</small>
      </label>

      <label className="admin-upload-field">
        <span>Cover art (optional — overrides embedded)</span>
        <input ref={imageRef} type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
      </label>

      <label className="admin-upload-field">
        <span>Title *</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" maxLength={160} required />
      </label>

      <label className="admin-upload-field">
        <span>Artist name *</span>
        <input type="text" value={artistName} onChange={(e) => setArtistName(e.target.value)} placeholder="Artist display name (auto-created if new)" maxLength={100} required />
        <small>If this artist isn't on Sonara, a managed profile is created automatically.</small>
      </label>

      <label className="admin-upload-field">
        <span>Album (optional)</span>
        <input type="text" value={albumName} onChange={(e) => setAlbumName(e.target.value)} placeholder="Leave blank for a single" maxLength={160} />
      </label>

      {error && <p className="admin-error"><AlertCircle size={14} /> {error}</p>}

      <div className="admin-upload-actions">
        <button type="submit" className="admin-action approve" disabled={busy || !audioFile || !title.trim() || !artistName.trim()}>
          {busy ? <Loader2 size={14} className="admin-spin" /> : <Upload size={14} />}
          <span>{busy ? 'Uploading…' : 'Upload track'}</span>
        </button>
        <button type="button" className="admin-action" onClick={reset} disabled={busy}>Clear</button>
      </div>
    </form>
  );
}

function ZipUpload() {
  const fileRef = useRef(null);
  const [zipFile, setZipFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!zipFile) return;
    setBusy(true); setError(null); setResult(null); setProgress(0);
    try {
      const data = await adminApi.uploadZip(zipFile, (p) => setProgress(p));
      setResult(data);
      setZipFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setProgress(0);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form className="admin-upload-form" onSubmit={handleSubmit}>
      <div className="admin-upload-note">
        <FileArchive size={16} />
        <div>
          <strong>ZIP archive naming rules</strong>
          <p>Sonara reads artist names from folder structure or filenames. Supported layouts:</p>
          <ul>
            <li><code>Artist - Title.mp3</code></li>
            <li><code>Artist – Title.mp3</code> (en-dash also works)</li>
            <li><code>Artist - Album - Title.mp3</code></li>
            <li><code>Artist/Title.mp3</code></li>
            <li><code>Artist/Album/Title.mp3</code></li>
            <li><code>01 - Title.mp3</code> (uses parent folder as artist)</li>
          </ul>
          <p>
            <strong>Cover art and duration are auto-extracted</strong> from each track's embedded
            tags. If a track has no embedded art, it will use a placeholder.
          </p>
          <p>Artists that don't exist yet are created as managed profiles automatically.</p>
        </div>
      </div>

      <label className="admin-upload-field">
        <span>ZIP file *</span>
        <input ref={fileRef} type="file" accept=".zip,application/zip" onChange={(e) => setZipFile(e.target.files?.[0] || null)} required />
      </label>

      {busy && (
        <div className="admin-progress">
          <div className="admin-progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
          <span>{Math.round(progress * 100)}%</span>
        </div>
      )}

      {error && <p className="admin-error"><AlertCircle size={14} /> {error}</p>}

      {result && (
        <div className="admin-upload-result">
          <h4>Import complete</h4>
          <div className="admin-upload-stats">
            <div><strong>{result.summary.imported}</strong> imported</div>
            <div><strong>{result.summary.skipped}</strong> skipped</div>
            <div><strong>{result.summary.artistsCreated}</strong> artists created</div>
            <div><strong>{result.summary.artistsReused}</strong> artists reused</div>
            <div>
              <ImageIcon size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              <strong>{result.summary.coversExtracted || 0}</strong> covers extracted
            </div>
          </div>
          {result.imported.length > 0 && (
            <>
              <h5>Imported</h5>
              <ul className="admin-upload-list">
                {result.imported.map((t, i) => (
                  <li key={i}>
                    <strong>{t.title}</strong> — {t.artist}
                    {t.album && <> · <em>{t.album}</em></>}
                    {t.hasCover && <span className="admin-badge-mini">cover</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {result.skipped.length > 0 && (
            <>
              <h5>Skipped</h5>
              <ul className="admin-upload-list skipped">
                {result.skipped.map((s, i) => (
                  <li key={i}><strong>{s.name}</strong> — {s.reason}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="admin-upload-actions">
        <button type="submit" className="admin-action approve" disabled={busy || !zipFile}>
          {busy ? <Loader2 size={14} className="admin-spin" /> : <Upload size={14} />}
          <span>{busy ? 'Importing…' : 'Upload ZIP'}</span>
        </button>
      </div>
    </form>
  );
}

function BulkArtists() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const names = text.split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) return;
    setBusy(true); setError(null); setResult(null);
    try {
      const data = await adminApi.bulkCreateArtists(names);
      setResult(data);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <form className="admin-upload-form" onSubmit={handleSubmit}>
      <div className="admin-upload-note">
        <FileText size={16} />
        <div>
          <strong>Bulk artist creation</strong>
          <p>Paste one artist name per line. Each becomes a managed Sonara artist profile that admin-uploaded tracks can be assigned to. Existing artists are reused by name.</p>
        </div>
      </div>

      <label className="admin-upload-field">
        <span>Artist names (one per line)</span>
        <textarea
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Aurora Waves\nThe Midnight Echo\nDJ Simba\nKaya Bloom"}
        />
      </label>

      {error && <p className="admin-error"><AlertCircle size={14} /> {error}</p>}

      {result && (
        <div className="admin-upload-result">
          <h4>Done</h4>
          <div className="admin-upload-stats">
            <div><strong>{result.created.length}</strong> created</div>
            <div><strong>{result.existing.length}</strong> already existed</div>
            <div><strong>{result.skipped.length}</strong> skipped (duplicates)</div>
          </div>
          {result.created.length > 0 && (
            <>
              <h5>Created</h5>
              <ul className="admin-upload-list">
                {result.created.map((a, i) => <li key={i}><strong>{a.name}</strong></li>)}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="admin-upload-actions">
        <button type="submit" className="admin-action approve" disabled={busy || !text.trim()}>
          {busy ? <Loader2 size={14} className="admin-spin" /> : <Plus size={14} />}
          <span>{busy ? 'Creating…' : 'Create artists'}</span>
        </button>
      </div>
    </form>
  );
}

function MessagesTab() {
  const [status, setStatus] = useState('open');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [thread, setThread] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (s = status) => {
    setLoading(true);
    try { setMessages(await adminApi.getMessages(s)); }
    catch (err) { console.warn(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const openThread = async (id) => {
    setOpenId(id);
    try {
      const data = await adminApi.getMessage(id);
      setThread(data);
    } catch (err) { alert(err.message); }
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !openId) return;
    setBusy(true);
    try {
      await adminApi.replyToMessage(openId, replyBody.trim());
      setReplyBody('');
      await openThread(openId);
      await load();
    } catch (err) { alert(err.message); }
    finally { setBusy(false); }
  };

  const handleResolve = async (id) => {
    try {
      await adminApi.resolveMessage(id);
      setOpenId(null); setThread(null);
      await load();
    } catch (err) { alert(err.message); }
  };

  const handleReopen = async (id) => {
    try {
      await adminApi.reopenMessage(id);
      setOpenId(null); setThread(null);
      await load();
    } catch (err) { alert(err.message); }
  };

  if (openId && thread) {
    return (
      <section className="admin-section">
        <button className="admin-back" onClick={() => { setOpenId(null); setThread(null); }}>
          ← Back to inbox
        </button>

        <div className="admin-thread-header">
          <h3>{thread.message.subject}</h3>
          <div className="admin-thread-meta">
            <span>{thread.message.createdAt}</span>
            <span className={`admin-status-pill ${thread.message.status}`}>{thread.message.status}</span>
          </div>
        </div>

        <div className="admin-thread-body">
          <div className="admin-thread-bubble original">
            <div className="admin-thread-author">
              <div className="admin-thread-avatar"><Send size={14} /></div>
              <div>
                <strong>{thread.message.artistDisplayName || thread.message.artistUsername}</strong>
                <em>original message</em>
              </div>
            </div>
            <p>{thread.message.body}</p>
          </div>

          {thread.replies.map(r => (
            <div key={r.id} className={`admin-thread-bubble ${r.isAdmin ? 'admin' : 'artist'}`}>
              <div className="admin-thread-author">
                <div className="admin-thread-avatar">
                  {r.authorAvatar ? <img src={r.authorAvatar} alt="" /> : <span>{r.authorUsername?.[0]?.toUpperCase()}</span>}
                </div>
                <div>
                  <strong>{r.authorDisplayName || r.authorUsername}</strong>
                  <em>{r.isAdmin ? 'admin' : 'artist'} · {r.createdAt}</em>
                </div>
              </div>
              <p>{r.body}</p>
            </div>
          ))}
        </div>

        <div className="admin-thread-reply">
          <textarea
            rows={3}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply…"
          />
          <div className="admin-thread-reply-actions">
            <button className="admin-action approve" onClick={handleReply} disabled={busy || !replyBody.trim()}>
              {busy ? <Loader2 size={14} className="admin-spin" /> : <Send size={14} />}
              <span>Send reply</span>
            </button>
            {thread.message.status === 'open' ? (
              <button className="admin-action" onClick={() => handleResolve(openId)}>
                <Check size={14} /> Mark resolved
              </button>
            ) : (
              <button className="admin-action" onClick={() => handleReopen(openId)}>
                Reopen
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-section">
      <div className="admin-subtabs">
        {['open', 'resolved'].map(s => (
          <button
            key={s}
            className={`admin-subtab ${status === s ? 'active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p className="admin-hint">Loading…</p>}
      {!loading && messages.length === 0 && (
        <div className="admin-empty">
          <Inbox size={36} />
          <p>{status === 'open' ? 'No open messages.' : 'No resolved messages.'}</p>
        </div>
      )}

      {!loading && messages.length > 0 && (
        <ul className="admin-list">
          {messages.map(m => (
            <li key={m.id} className="admin-row clickable" onClick={() => openThread(m.id)}>
              <div className="admin-row-avatar">
                {m.artistAvatar ? <img src={m.artistAvatar} alt="" /> : <span>{m.artistUsername[0]?.toUpperCase()}</span>}
              </div>
              <div className="admin-row-main">
                <div className="admin-row-title">
                  <strong>{m.subject}</strong>
                  {m.replyCount > 0 && <span className="admin-pill admin-pill-artist">{m.replyCount} replies</span>}
                </div>
                <div className="admin-row-sub">
                  @{m.artistUsername} · {m.createdAt}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getActivity(30)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="admin-hint">Loading…</p>;
  if (!data) return null;

  const fmt = (iso) => new Date(iso.replace(' ', 'T') + 'Z').toLocaleString();

  return (
    <section className="admin-section">
      <h3 className="admin-section-title">Recent uploads</h3>
      {data.uploads.length === 0 ? (
        <p className="admin-hint">No uploads yet.</p>
      ) : (
        <ul className="admin-list">
          {data.uploads.map(u => (
            <li key={u.id} className="admin-row compact">
              <Music size={16} />
              <div className="admin-row-main">
                <div className="admin-row-title"><strong>{u.title}</strong></div>
                <div className="admin-row-sub">by @{u.username} · {fmt(u.createdAt)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="admin-section-title">New users</h3>
      <ul className="admin-list">
        {data.newUsers.map(u => (
          <li key={u.id} className="admin-row compact">
            <Users size={16} />
            <div className="admin-row-main">
              <div className="admin-row-title"><strong>{u.displayName || u.username}</strong></div>
              <div className="admin-row-sub">@{u.username} · {fmt(u.createdAt)}</div>
            </div>
          </li>
        ))}
      </ul>

      <h3 className="admin-section-title">New playlists</h3>
      <ul className="admin-list">
        {data.newPlaylists.map(p => (
          <li key={p.id} className="admin-row compact">
            <ListMusic size={16} />
            <div className="admin-row-main">
              <div className="admin-row-title"><strong>{p.name}</strong></div>
              <div className="admin-row-sub">{fmt(p.createdAt)}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}