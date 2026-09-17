// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ============================================================
// PWA install prompt capture
// Chrome fires beforeinstallprompt ONCE per page load, usually
// before WelcomePage is mounted. Store it globally so the
// "Install" buttons can always trigger the native prompt.
// ============================================================
window.__sonaraInstallPrompt = null;
window.__sonaraIsInstalled =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__sonaraInstallPrompt = e;
  window.dispatchEvent(new CustomEvent('sonara-install-available'));
});

window.addEventListener('appinstalled', () => {
  window.__sonaraInstallPrompt = null;
  window.__sonaraIsInstalled = true;
  window.dispatchEvent(new CustomEvent('sonara-installed'));
});

