import React, { useEffect, useState } from 'react';
import './LoadingScreen.css';

export default function LoadingScreen({ onFinish }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onFinish, 600); // Wait for fade out animation
    }, 1200); // Minimum display time
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`loading-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="loading-content">
        <div className="loading-logo">
          <span className="logo-text">Sonara</span>
          <div className="loading-bar">
            <div className="loading-bar-fill"></div>
          </div>
        </div>
        <p className="loading-text">Your music. Everywhere.</p>
      </div>
    </div>
  );
}
