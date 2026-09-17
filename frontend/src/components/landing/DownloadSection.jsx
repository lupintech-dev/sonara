// frontend/src/components/landing/DownloadSection.jsx
import { Monitor, Smartphone, Globe } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';
import './DownloadSection.css';

export default function DownloadSection({ onInstallDesktop, onInstallAndroid, onContinue }) {
  const ref = useReveal();

  const cards = [
    {
      id: 'desktop',
      icon: Monitor,
      title: 'Desktop',
      subtitle: 'Windows · macOS · Linux',
      note: 'Install as app',
      action: onInstallDesktop,
      cta: 'Install for desktop',
    },
    {
      id: 'android',
      icon: Smartphone,
      title: 'Android',
      subtitle: 'Chrome · Brave · Edge',
      note: 'Add to home screen',
      action: onInstallAndroid,
      cta: 'Install for Android',
    },
    {
      id: 'web',
      icon: Globe,
      title: 'Web',
      subtitle: 'Any modern browser',
      note: 'No install required',
      action: onContinue,
      cta: 'Open web app',
    },
  ];

  return (
    <section className="dl" ref={ref}>
      <header className="dl-header">
        <span className="dl-label">Choose your platform</span>
        <h2 className="dl-title">Take Sonara with you.</h2>
        <p className="dl-sub">
          Installable everywhere. Your library, downloads, and playlists sync automatically.
        </p>
      </header>

      <div className="dl-grid">
        {cards.map(({ id, icon: Icon, title, subtitle, note, action, cta }) => (
          <article key={id} className={`dl-card dl-card-${id}`}>
            <div className="dl-card-icon"><Icon size={26} /></div>
            <div className="dl-card-meta">
              <h3>{title}</h3>
              <span className="dl-card-subtitle">{subtitle}</span>
            </div>
            <span className="dl-card-note">{note}</span>
            <button className="dl-card-btn" onClick={action}>{cta}</button>
          </article>
        ))}
      </div>

      <p className="dl-footnote">
        On iPhone / iPad: open in Safari, tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
      </p>
    </section>
  );
}