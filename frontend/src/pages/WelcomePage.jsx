import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Download, Smartphone, Headphones, Radio, Sparkles, Zap, Shield, Globe, Disc, ListMusic } from 'lucide-react';
import './WelcomePage.css';

export default function WelcomePage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installMessage, setInstallMessage] = useState('');
  const heroRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // PWA Install Logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async (platform) => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
    } else {
      // Fallback instructions for unsupported browsers (Safari, Firefox)
      if (platform === 'android') {
        setInstallMessage('To install on Android: Tap the browser menu (three dots) and select "Add to Home screen" or "Install app".');
      } else {
        setInstallMessage('To install on Desktop: Click the install icon in your browser address bar, or open the browser menu and select "Install Sonara".');
      }
      setTimeout(() => setInstallMessage(''), 8000);
    }
  };

  return (
    <div className={`landing-wrapper ${mounted ? 'mounted' : ''}`} ref={heroRef}>
      {/* Animated Mesh Gradient Background */}
      <div className="mesh-gradient" />
      <div className="bg-grid" />

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-brand">
          <img src="/sonara-logo.png" alt="Sonara Logo" className="nav-logo-img" />
          <span className="nav-logo-text">Sonara</span>
        </div>
        <button className="nav-cta" onClick={() => (function(){ try { localStorage.setItem('sonara_seen_welcome','1'); } catch {} navigate('/'); })()}>
          Open web app
        </button>
      </nav>

      {/* Split Hero Section */}
      <section className="hero-section">
        {/* Left Column: Text Content */}
        <div className="hero-left">
          <div className="hero-badge stagger-left">
            <span className="badge-dot" />
            Free forever · No ads · No subscription
          </div>

          <h1 className="hero-title stagger-left">
            Your music.<br />
            <span className="gradient-text">Everywhere.</span>
          </h1>

          <p className="hero-subtitle stagger-left">
            Stream independent artists from Audius, Jamendo, and 50,000+ live radio stations.
            Free, ad-free, and open — on desktop, Android, and the web.
          </p>

          <div className="hero-actions stagger-left">
            <button className="btn-primary" onClick={() => (function(){ try { localStorage.setItem('sonara_seen_welcome','1'); } catch {} navigate('/'); })()}>
              <Play size={20} fill="currentColor" />
              Continue in browser
            </button>
          </div>

          <div className="hero-stats stagger-left">
            <div className="stat-item">
              <span className="stat-value">650k+</span>
              <span className="stat-label">Tracks</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">50k+</span>
              <span className="stat-label">Radio Stations</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">$0</span>
              <span className="stat-label">Forever</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Mockup */}
        <div className="hero-right stagger-right" style={{
          transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`
        }}>
          <div className="glass-card">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span /><span /><span />
              </div>
              <span className="mockup-title">Now Playing</span>
            </div>
            <div className="mockup-body">
              <div className="mockup-art">
                <img src="/sonara-logo.png" alt="Album Art" />
              </div>
              <div className="mockup-info">
                <h4>Sonara Radio</h4>
                <p>Live · 24/7</p>
              </div>
              <div className="mockup-waveform">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div key={i} className="wave-bar" style={{
                    height: `${Math.random() * 60 + 20}%`,
                    animationDelay: `${i * 0.05}s`
                  }} />
                ))}
              </div>
              <div className="mockup-controls">
                <Disc size={20} />
                <Play size={28} fill="currentColor" className="play-btn" />
                <ListMusic size={20} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Side CTA Buttons (Desktop Only) */}
      <button className="side-cta side-cta-left" onClick={() => handleInstallClick('desktop')}>
        <Download size={18} />
        <span>Install for desktop</span>
      </button>
      <button className="side-cta side-cta-right" onClick={() => handleInstallClick('android')}>
        <Smartphone size={18} />
        <span>Install for Android</span>
      </button>

      {/* Install Toast Notification */}
      {installMessage && (
        <div className="install-toast">
          <p>{installMessage}</p>
          <button onClick={() => setInstallMessage('')}>Close</button>
        </div>
      )}

      {/* Features Section */}
      <section className="features-section" id="features">
        <h2 className="section-title">Why Sonara?</h2>
        <p className="section-subtitle">Built for music lovers, by music lovers.</p>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><Globe size={24} /></div>
            <h3>Open Ecosystem</h3>
            <p>We aggregate from Audius, Jamendo, and Radio Browser. No walled gardens, no exclusives.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Zap size={24} /></div>
            <h3>Lightning Fast</h3>
            <p>Built on Vite and React. Instant page loads, gapless playback, and zero bloat.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Shield size={24} /></div>
            <h3>Privacy First</h3>
            <p>Self-hosted. Your data stays on your server. No tracking pixels, no selling your data.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Headphones size={24} /></div>
            <h3>10-Band EQ</h3>
            <p>Studio-grade equalizer with 22 presets. Tune your audio exactly how you like it.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Radio size={24} /></div>
            <h3>Live Radio</h3>
            <p>50,000+ live stations from around the world. Featured, by genre, or by country.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Sparkles size={24} /></div>
            <h3>AI Playlists</h3>
            <p>Describe a vibe and let our AI curate the perfect playlist from millions of tracks.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img src="/sonara-logo.png" alt="Sonara Logo" className="footer-logo-img" />
            <span>Sonara</span>
          </div>
          <p className="footer-text">Your music. Everywhere. Free forever.</p>
          <p className="footer-copyright">&copy; {new Date().getFullYear()} Sonara. Open source.</p>
          <p className="footer-credit">Developed by Lupin Tech</p>
        </div>
      </footer>
    </div>
  );
}

