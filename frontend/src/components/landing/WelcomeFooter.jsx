// frontend/src/components/landing/WelcomeFooter.jsx
import { useNavigate } from 'react-router-dom';
import { Github, Heart } from 'lucide-react';
import './WelcomeFooter.css';

export default function WelcomeFooter() {
  const navigate = useNavigate();
  return (
    <footer className="wfooter">
      <div className="wfooter-inner">
        <div className="wfooter-brand">
          <img src="/sonara-logo.png" alt="" />
          <span>Sonara</span>
        </div>
        <p className="wfooter-tag">
          Free, legal, open-source music streaming. Built with React, Express, and Jamendo + Audius APIs.
        </p>

        <nav className="wfooter-links">
          <button onClick={() => navigate('/')}>Open app</button>
          <button onClick={() => navigate('/search')}>Search</button>
          <button onClick={() => navigate('/radio')}>Radio</button>
          <button onClick={() => navigate('/ai-playlist')}>AI Playlist</button>
        </nav>

        <div className="wfooter-credits">
          <span>Powered by Audius · Jamendo · Radio Browser</span>
          <span className="wfooter-heart">
            Made with <Heart size={12} fill="currentColor" /> for the love of music
          </span>
        </div>
      </div>
    </footer>
  );
}