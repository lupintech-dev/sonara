// frontend/src/pages/ArtistUploadPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Music2, Image as ImageIcon, X, Loader2, Disc3, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getMyArtistProfile, uploadTrack } from '../api/artist';
import './ArtistUploadPage.css';

function readAudioDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = url;
    audio.addEventListener('loadedmetadata', () => {
      resolve({ duration: audio.duration || 0, url });
    });
    audio.addEventListener('error', () => resolve({ duration: 0, url }));
  });
}

export default function ArtistUploadPage() {
  const navigate = useNavigate();
  const { user, isAuthed } = useAuth();

  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [duration, setDuration] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [title, setTitle] = useState('');
  const [albumMode, setAlbumMode] = useState('none'); // 'none' | 'existing' | 'new'
  const [albumId, setAlbumId] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [albums, setAlbums] = useState([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const audioInputRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => { if (!isAuthed) navigate('/login'); }, [isAuthed, navigate]);

  useEffect(() => {
    if (!user?.is_verified_artist) {
      navigate('/artist/apply');
      return;
    }
    getMyArtistProfile()
      .then(res => setAlbums(res.albums || []))
      .catch(() => {});
  }, [user, navigate]);

  const handleAudio = async (file) => {
    if (!file) return;
    setAudioFile(file);
    // Auto-fill title from filename
    if (!title) {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      if (name) setTitle(name);
    }
    const { duration: dur, url } = await readAudioDuration(file);
    setDuration(dur);
    setAudioPreview(url);
  };

  const handleImage = (file) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const reset = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setAudioFile(null); setAudioPreview(null); setDuration(0);
    setImageFile(null); setImagePreview(null);
    setTitle(''); setAlbumMode('none'); setAlbumId(''); setAlbumName('');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile || !title.trim()) return;
    setBusy(true); setError(null);
    try {
      const track = await uploadTrack({
        audioFile,
        imageFile,
        title: title.trim(),
        duration,
        albumId: albumMode === 'existing' ? albumId : null,
        albumName: albumMode === 'new' ? albumName : null,
      });
      setSuccess(track);
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!user?.is_verified_artist) return null;

  const fmt = (s) => {
    if (!s || !isFinite(s)) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className="aup">
      <header className="aup-header">
        <h1>Upload a track</h1>
        <p>Add audio, cover art, and metadata. Your track goes live instantly.</p>
      </header>

      {success && (
        <div className="aup-success">
          <Check size={18} />
          <span>
            Uploaded <strong>{success.title}</strong> — it's now on your artist page.
          </span>
          <button onClick={() => setSuccess(null)}><X size={14} /></button>
        </div>
      )}

      <form className="aup-form" onSubmit={handleSubmit}>
        {/* Audio file */}
        <div className="aup-row">
          <label className="aup-label">Audio file</label>
          {!audioFile ? (
            <button
              type="button"
              className="aup-dropzone"
              onClick={() => audioInputRef.current?.click()}
            >
              <Music2 size={28} />
              <strong>Choose an audio file</strong>
              <span>MP3, M4A, WAV, OGG, FLAC · up to 100 MB</span>
            </button>
          ) : (
            <div className="aup-file-card">
              <div className="aup-file-icon"><Music2 size={20} /></div>
              <div className="aup-file-meta">
                <strong className="truncate">{audioFile.name}</strong>
                <span>{fmt(duration)} · {(audioFile.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <button
                type="button"
                className="aup-file-remove"
                onClick={reset}
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={(e) => handleAudio(e.target.files?.[0])}
            hidden
          />
        </div>

        {/* Cover image */}
        <div className="aup-row">
          <label className="aup-label">Cover art <em>(optional)</em></label>
          {!imageFile ? (
            <button
              type="button"
              className="aup-cover-picker"
              onClick={() => imageInputRef.current?.click()}
            >
              <ImageIcon size={20} />
              <span>Add cover image</span>
            </button>
          ) : (
            <div className="aup-cover-preview">
              <img src={imagePreview} alt="" />
              <button
                type="button"
                className="aup-cover-remove"
                onClick={() => {
                  URL.revokeObjectURL(imagePreview);
                  setImageFile(null); setImagePreview(null);
                }}
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImage(e.target.files?.[0])}
            hidden
          />
        </div>

        {/* Title */}
        <label className="aup-row">
          <span className="aup-label">Title</span>
          <input
            type="text"
            className="aup-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Track title"
            maxLength={120}
            required
          />
        </label>

        {/* Album */}
        <div className="aup-row">
          <span className="aup-label">Album</span>
          <div className="aup-album-tabs">
            {['none', 'existing', 'new'].map(m => (
              <button
                key={m}
                type="button"
                className={`aup-album-tab ${albumMode === m ? 'active' : ''}`}
                onClick={() => setAlbumMode(m)}
                disabled={m === 'existing' && albums.length === 0}
              >
                {m === 'none' ? 'Single' : m === 'existing' ? 'Existing album' : 'New album'}
              </button>
            ))}
          </div>

          {albumMode === 'existing' && (
            <select
              className="aup-input"
              value={albumId}
              onChange={(e) => setAlbumId(e.target.value)}
              required
            >
              <option value="">Choose an album…</option>
              {albums.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.trackCount})</option>
              ))}
            </select>
          )}

          {albumMode === 'new' && (
            <input
              type="text"
              className="aup-input"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              placeholder="Album name"
              maxLength={120}
              required
            />
          )}
        </div>

        {error && <p className="aup-error">{error}</p>}

        <div className="aup-actions">
          <button
            type="submit"
            className="aup-submit"
            disabled={!audioFile || !title.trim() || busy}
          >
            {busy
              ? <><Loader2 size={16} className="aup-spin" /> Uploading…</>
              : <><Upload size={16} /> Publish track</>}
          </button>
          <button
            type="button"
            className="aup-cancel"
            onClick={() => navigate('/artist/dashboard')}
            disabled={busy}
          >
            Back to dashboard
          </button>
        </div>
      </form>
    </div>
  );
}