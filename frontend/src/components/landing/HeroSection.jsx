// frontend/src/components/landing/HeroSection.jsx
import { Music2, Sparkles, Headphones, Radio, Disc3 } from 'lucide-react';
import './HeroSection.css';

export default function HeroSection({ onContinue, onInstallDesktop, onInstallAndroid }) {
  return (
    <section className="hero">
      {/* Ambient background washes */}
      <div className="hero-glow hero-glow-1" aria-hidden />
      <div className="hero-glow hero-glow-2" aria-hidden />
      <div className="hero-grid-overlay" aria-hidden />

      {/* Floating music icons */}
      <div className="hero-floaters" aria-hidden>
        <Music2   size={26} className="hero-float hero-float-1" />
        <Sparkles size={22} className="hero-float hero-float-2" />
        <Headphones size={28} className="hero-float hero-float-3" />
        <Radio    size={24} className="hero-float hero-float-4" />
        <Disc3    size={30} className="hero-float hero-float-5" />
      </div>

      <div className="hero-inner">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          <span>Free forever · No ads · No subscription</span>
        </div>

        <h1 className="hero-title">
          Your music.<br />
          <span className="hero-title-accent">Everywhere.</span>
        </h1>

        <p className="hero-sub">
          Stream independent artists from Audius, Jamendo, and 50,000+ live radio stations.
          Free, ad-free, and open — on desktop, Android, and the web.
        </p>

        <div className="hero-actions">
          <button className="hero-btn hero-btn-primary" onClick={onContinue}>
            Continue in browser
          </button>
          <button className="hero-btn hero-btn-ghost" onClick={onInstallDesktop}>
            Install for desktop
          </button>
          <button className="hero-btn hero-btn-ghost" onClick={onInstallAndroid}>
            Install for Android
          </button>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-num">650k+</span>
            <span className="hero-stat-label">Tracks</span>
          </div>
          <div className="hero-stat-sep" />
          <div className="hero-stat">
            <span className="hero-stat-num">50k+</span>
            <span className="hero-stat-label">Radio stations</span>
          </div>
          <div className="hero-stat-sep" />
          <div className="hero-stat">
            <span className="hero-stat-num">$0</span>
            <span className="hero-stat-label">Forever</span>
          </div>
        </div>
      </div>

      <div className="hero-scroll-hint" aria-hidden>
        <span className="hero-scroll-line" />
        <span className="hero-scroll-text">Scroll to explore</span>
      </div>
    </section>
  );
}