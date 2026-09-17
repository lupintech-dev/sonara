// frontend/src/components/landing/FeaturesSection.jsx
import {
  Sparkles, Radio as RadioIcon, Headphones, Download, Heart, Zap,
  Music2, Layers,
} from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';
import './FeaturesSection.css';

const FEATURES = [
  { icon: Zap,        title: 'Completely free',   text: 'No subscription, no ads, no paywalls. Stream everything, forever.' },
  { icon: Layers,     title: 'Multi-source',      text: 'Audius, Jamendo, and live radio — one unified catalog in one player.' },
  { icon: RadioIcon,  title: '50,000+ stations',  text: 'Live FM radio from around the world, streaming at your fingertips.' },
  { icon: Sparkles,   title: 'AI playlists',      text: 'Describe a vibe and let Sonara build the perfect playlist in seconds.' },
  { icon: Download,   title: 'Offline playback',  text: 'Save tracks for flight mode. Installable as a PWA on any device.' },
  { icon: Heart,      title: 'Yours, always',     text: 'Open source and self-hostable. Your data, your music, your rules.' },
];

export default function FeaturesSection() {
  const ref = useReveal();
  return (
    <section className="features" ref={ref}>
      <header className="features-header">
        <span className="features-label">Why Sonara</span>
        <h2 className="features-title">Built for people who love music.</h2>
        <p className="features-sub">
          Every feature designed around listening — not around selling you ads or subscriptions.
        </p>
      </header>

      <div className="features-grid">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <article key={title} className="feature-card">
            <div className="feature-icon"><Icon size={22} /></div>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}