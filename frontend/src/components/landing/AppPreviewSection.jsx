// frontend/src/components/landing/AppPreviewSection.jsx
import { Play, Heart, Shuffle, SkipBack, SkipForward, Repeat, Sparkles } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';
import './AppPreviewSection.css';

export default function AppPreviewSection() {
  const ref = useReveal();
  return (
    <section className="preview" ref={ref}>
      <div className="preview-inner">
        <div className="preview-copy">
          <span className="preview-label">The experience</span>
          <h2 className="preview-title">
            A player that feels<br />like it should.
          </h2>
          <p className="preview-text">
            Beautifully crafted, distraction-free playback. Gesture controls, on-screen
            queue, synced lyrics, and a Now Playing screen that fades out of your way.
          </p>

          <ul className="preview-list">
            <li><span className="preview-bullet" />Synced lyrics with one tap</li>
            <li><span className="preview-bullet" />Gesture-controlled shuffle & repeat</li>
            <li><span className="preview-bullet" />Smart queue you can drag to reorder</li>
            <li><span className="preview-bullet" />10-band equalizer with 22 presets</li>
          </ul>
        </div>

        {/* Phone mockup */}
        <div className="preview-phone">
          <div className="preview-phone-notch" />
          <div className="preview-phone-screen">
            <div className="preview-art">
              <div className="preview-art-overlay" />
              <Sparkles size={60} className="preview-art-icon" />
            </div>
            <div className="preview-info">
              <div className="preview-title-row">EvilL Laughter</div>
              <div className="preview-artist-row">@iLLPeTiLL</div>
            </div>
            <div className="preview-progress">
              <div className="preview-progress-fill" />
            </div>
            <div className="preview-times">
              <span>1:24</span>
              <span>3:59</span>
            </div>
            <div className="preview-controls">
              <Shuffle size={16} className="preview-ctrl" />
              <SkipBack size={20} fill="currentColor" className="preview-ctrl" />
              <div className="preview-play">
                <Play size={20} fill="#000" />
              </div>
              <SkipForward size={20} fill="currentColor" className="preview-ctrl" />
              <Repeat size={16} className="preview-ctrl" />
            </div>
            <div className="preview-footer">
              <Heart size={16} className="preview-ctrl" />
              <span className="preview-footer-spacer" />
              <div className="preview-mini-vol" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}