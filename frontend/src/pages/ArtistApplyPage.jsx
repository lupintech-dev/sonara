// frontend/src/pages/ArtistApplyPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic2, Loader2, ArrowRight, Music, Disc3, Users, Monitor, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { applyAsArtist } from '../api/artist';
import './ArtistApplyPage.css';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 768
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export default function ArtistApplyPage() {
  const navigate = useNavigate();
  const { user, isAuthed, setUserDirect } = useAuth();
  const isMobile = useIsMobile();

  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { if (!isAuthed) navigate('/login'); }, [isAuthed, navigate]);
  useEffect(() => {
    if (user) setName(user.display_name || user.username || '');
  }, [user]);

  // Already an artist? go straight to dashboard
  useEffect(() => {
    if (user?.is_verified_artist) navigate('/artist/dashboard', { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  // ---------- Mobile block ----------
  if (isMobile) {
    return (
      <div className="aap aap-mobile-block">
        <div className="aap-mobile-icon">
          <Monitor size={40} />
        </div>
        <h1>Switch to desktop</h1>
        <p>
          Artist applications can only be submitted on a computer.
          Open Sonara on your laptop or desktop, then head to
          <strong> Profile → Become an Artist</strong>.
        </p>
        <div className="aap-mobile-note">
          <Smartphone size={16} />
          <span>
            Once you're approved as an artist, you can upload, manage, and publish
            tracks from your phone.
          </span>
        </div>
        <div className="aap-mobile-actions">
          <button className="aap-submit" onClick={() => navigate(-1)}>
            Go back
          </button>
          <button
            className="aap-cancel"
            onClick={() => navigate('/')}
          >
            Return home
          </button>
        </div>
      </div>
    );
  }

  // ---------- Desktop form ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setError(null);
    try {
      const updated = await applyAsArtist(name.trim());
      setUserDirect(updated);
      navigate('/artist/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="aap">
      <header className="aap-hero">
        <div className="aap-hero-icon"><Mic2 size={32} /></div>
        <h1>Become a Sonara Artist</h1>
        <p>Upload your music, build albums, and share them with the world — free.</p>
      </header>

      <section className="aap-perks">
        <div className="aap-perk">
          <Music size={22} />
          <div>
            <strong>Unlimited uploads</strong>
            <span>Publish tracks straight from your browser.</span>
          </div>
        </div>
        <div className="aap-perk">
          <Disc3 size={22} />
          <div>
            <strong>Create albums</strong>
            <span>Group your tracks into releases.</span>
          </div>
        </div>
        <div className="aap-perk">
          <Users size={22} />
          <div>
            <strong>Build a following</strong>
            <span>Get a public artist page with follower counts.</span>
          </div>
        </div>
      </section>

      <form className="aap-form" onSubmit={handleSubmit}>
        <label className="aap-field">
          <span>Artist name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should fans find you?"
            maxLength={60}
            autoFocus
          />
          <small>You can change this later in your account settings.</small>
        </label>

        {error && <p className="aap-error">{error}</p>}

        <div className="aap-actions">
          <button type="submit" className="aap-submit" disabled={!name.trim() || busy}>
            {busy
              ? <><Loader2 size={16} className="aap-spin" /> Setting up…</>
              : <>Become an Artist <ArrowRight size={16} /></>}
          </button>
          <button
            type="button"
            className="aap-cancel"
            onClick={() => navigate(-1)}
            disabled={busy}
          >
            Not now
          </button>
        </div>
      </form>

      <p className="aap-fine">
        By continuing you agree to upload only music you have the rights to distribute.
      </p>
    </div>
  );
}