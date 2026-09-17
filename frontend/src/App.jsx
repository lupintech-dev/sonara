// frontend/src/App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useTheme } from './hooks/useTheme';
import { usePlayerStore } from './store/playerStore';
import { useDownloadStore } from './store/downloadStore';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import MobileNav from './components/layout/MobileNav';
import Player from './components/Player';
import NowPlaying from './components/player/NowPlaying';
import QueuePanel from './components/player/QueuePanel';
import Home from './pages/Home';
import Search from './pages/Search';
import SearchHistoryPage from './pages/SearchHistoryPage';
import RadioPage from './pages/RadioPage';
import Library from './pages/Library';
import LibrarySongs from './pages/LibrarySongs';
import LibraryRecent from './pages/LibraryRecent';
import LibraryArtists from './pages/LibraryArtists';
import LibraryAlbums from './pages/LibraryAlbums';
import AllPlaylists from './pages/AllPlaylists';
import PlaylistDetail from './pages/PlaylistDetail';
import FolderDetailPage from './pages/FolderDetailPage';
import JoinPlaylistPage from './pages/JoinPlaylistPage';
import Downloads from './pages/Downloads';
import AIPlaylistPage from './pages/AIPlaylistPage';
import WrappedPage from './pages/WrappedPage';
import ChartDetailPage from './pages/ChartDetailPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import EQPage from './pages/EQPage';
import SocialPage from './pages/SocialPage';
import ArtistApplyPage from './pages/ArtistApplyPage';
import ArtistDashboardPage from './pages/ArtistDashboardPage';
import ArtistUploadPage from './pages/ArtistUploadPage';
import ArtistProfilePage from './pages/ArtistProfilePage';
import ArtistTracksPage from './pages/ArtistTracksPage';
import ArtistAlbumsPage from './pages/ArtistAlbumsPage';
import ArtistAlbumDetailPage from './pages/ArtistAlbumDetailPage';
import ExternalArtistPage from './pages/ExternalArtistPage';
import AdminPage from './pages/AdminPage';
import WelcomePage from './pages/WelcomePage';
import { usePlayerAudio } from './hooks/usePlayerAudio';

function Shell() {
  usePlayerAudio();
  useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const hasTrack = usePlayerStore(s => !!s.currentTrack);
  const refreshDownloads = useDownloadStore(s => s.refresh);

  useEffect(() => { refreshDownloads(); }, [refreshDownloads]);

  useEffect(() => {
    const handler = () => {
      if (location.pathname === '/login') return;
      navigate('/login', { state: { from: location }, replace: false });
    };
    window.addEventListener('sonara-need-auth', handler);
    return () => window.removeEventListener('sonara-need-auth', handler);
  }, [navigate, location]);

  useEffect(() => {
    usePlayerStore.getState().closeNowPlaying();
    usePlayerStore.getState().closeQueue();
  }, [location.pathname]);

  return (
    <div className={`app-shell ${hasTrack ? 'has-player' : ''}`}>
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/search/history" element={<SearchHistoryPage />} />
            <Route path="/radio" element={<RadioPage />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/recent" element={<LibraryRecent />} />
            <Route path="/library/artists" element={<LibraryArtists />} />
            <Route path="/library/albums" element={<LibraryAlbums />} />
            <Route path="/library/songs" element={<LibrarySongs />} />
            <Route path="/library/liked" element={<LibrarySongs />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/ai-playlist" element={<AIPlaylistPage />} />
            <Route path="/wrapped" element={<WrappedPage />} />
            <Route path="/charts/:id" element={<ChartDetailPage />} />

            <Route path="/playlists" element={<AllPlaylists />} />
            <Route path="/playlists/folder/:id" element={<FolderDetailPage />} />
            <Route path="/playlist/:id" element={<PlaylistDetail />} />
            <Route path="/join/:code" element={<JoinPlaylistPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/account" element={<AccountSettingsPage />} />
            <Route path="/settings/eq" element={<EQPage />} />
            <Route path="/account" element={<Navigate to="/settings/account" replace />} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/admin" element={<AdminPage />} />

            <Route path="/artist/apply" element={<ArtistApplyPage />} />
            <Route path="/artist/dashboard" element={<ArtistDashboardPage />} />
            <Route path="/artist/upload" element={<ArtistUploadPage />} />
            <Route path="/artist/external/:source/:id" element={<ExternalArtistPage />} />
            <Route path="/artist/:userId/tracks" element={<ArtistTracksPage />} />
            <Route path="/artist/:userId/albums" element={<ArtistAlbumsPage />} />
            <Route path="/artist/:userId/albums/:albumId" element={<ArtistAlbumDetailPage />} />
            <Route path="/artist/:userId" element={<ArtistProfilePage />} />
          </Routes>
        </main>
      </div>
      <MobileNav />
      {hasTrack && <Player />}
      <NowPlaying />
      <QueuePanel />
    </div>
  );
}

function RootRoutes() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/*" element={<Shell />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RootRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(err => console.warn('[pwa] SW registration failed:', err.message));
  });
}