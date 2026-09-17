// frontend/src/pages/JoinPlaylistPage.jsx
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Users, Check, AlertCircle, Music2 } from 'lucide-react';
import { joinPlaylist } from '../api/playlists';
import { useAuth } from '../contexts/AuthContext';
import { usePlaylistStore } from '../store/playlistStore';
import './JoinPlaylistPage.css';

export default function JoinPlaylistPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { isAuthed, loading: authLoading } = useAuth();
  const refreshPlaylists = usePlaylistStore(s => s.refresh);

  const [status, setStatus] = useState('idle'); // 'idle' | 'joining' | 'joined' | 'error'
  const [error, setError] = useState(null);
  const [playlistId, setPlaylistId] = useState(null);
  const triedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthed) {
      // Bounce to login, then return here
      navigate('/login', { state: { from: { pathname: `/join/${code}` } } });
      return;
    }
    if (triedRef.current) return;
    triedRef.current = true;

    (async () => {
      setStatus('joining');
      try {
        const res = await joinPlaylist(code);
        setPlaylistId(res.playlistId);
        setStatus('joined');
        await refreshPlaylists();
        // Small delay so the user sees the success state, then jump in
        setTimeout(() => navigate(`/playlist/${res.playlistId}`, { replace: true }), 900);
      } catch (err) {
        setError(err.message);
        setStatus('error');
      }
    })();
  }, [authLoading, isAuthed, code, navigate, refreshPlaylists]);

  return (
    <div className="join-page">
      <div className="join-card">
        <div className="join-icon"><Users size={36} /></div>

        {status === 'idle' || status === 'joining' ? (
          <>
            <h1>Joining playlist…</h1>
            <p>Adding you as a collaborator.</p>
            <Loader2 size={22} className="join-spin" />
          </>
        ) : status === 'joined' ? (
          <>
            <div className="join-check"><Check size={28} /></div>
            <h1>You're in!</h1>
            <p>Opening the playlist…</p>
          </>
        ) : (
          <>
            <div className="join-error-icon"><AlertCircle size={28} /></div>
            <h1>Couldn't join</h1>
            <p>{error || 'This invite may be invalid or expired.'}</p>
            <button className="join-btn" onClick={() => navigate('/playlists')}>
              <Music2 size={16} /> Go to my playlists
            </button>
          </>
        )}
      </div>
    </div>
  );
}