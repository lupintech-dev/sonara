import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

// ---------- CORS ----------
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
}));

// ---------- Body Parsers ----------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ---------- Static Uploads (local dev only) ----------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- Health Check ----------
app.get('/health', async (req, res) => {
  try {
    const { db } = await import('./db/turso.js');
    await db.execute('SELECT 1');
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// ---------- API Routes ----------
import adminRouter from './routes/admin.js';
import aiPlaylistRouter from './routes/aiPlaylist.js';
import artistRouter from './routes/artist.js';
import audioRouter from './routes/audio.js';
import audiusRouter from './routes/audius.js';
import authRouter from './routes/auth.js';
import chartsRouter from './routes/charts.js';
import favoritesRouter from './routes/favorites.js';
import followsRouter from './routes/follows.js';
import historyRouter from './routes/history.js';
import jamendoRouter from './routes/jamendo.js';
import localTracksRouter from './routes/localTracks.js';
import lyricsRouter from './routes/lyrics.js';
import messagesRouter from './routes/messages.js';
import playlistsRouter from './routes/playlists.js';
import profileRouter from './routes/profile.js';
import radioRouter from './routes/radio.js';
import socialRouter from './routes/social.js';
import statsRouter from './routes/stats.js';
import uploadRouter from './routes/upload.js';

app.use('/api/admin', adminRouter);
app.use('/api/aiPlaylist', aiPlaylistRouter);
app.use('/api/artist', artistRouter);
app.use('/api/audio', audioRouter);
app.use('/api/audius', audiusRouter);
app.use('/api/auth', authRouter);
app.use('/api/charts', chartsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/follows', followsRouter);
app.use('/api/history', historyRouter);
app.use('/api/jamendo', jamendoRouter);
app.use('/api/localTracks', localTracksRouter);
app.use('/api/lyrics', lyricsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/radio', radioRouter);
app.use('/api/social', socialRouter);
app.use('/api/stats', statsRouter);
app.use('/api/upload', uploadRouter);


// ---------- Root Fallback ----------
app.get('/', (req, res) => {
  res.json({ name: 'Sonara API', status: 'running' });
});

// ---------- Graceful Shutdown ----------
process.on('SIGTERM', () => {
  console.log('[server] SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[server] SIGINT received, shutting down...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log('[server] Sonara backend running on port ' + PORT);
  console.log('[server] Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('[server] Mounted routes:');
  console.log('  - /api/admin');
  console.log('  - /api/aiPlaylist');
  console.log('  - /api/artist');
  console.log('  - /api/audio');
  console.log('  - /api/audius');
  console.log('  - /api/auth');
  console.log('  - /api/charts');
  console.log('  - /api/favorites');
  console.log('  - /api/follows');
  console.log('  - /api/history');
  console.log('  - /api/jamendo');
  console.log('  - /api/localTracks');
  console.log('  - /api/lyrics');
  console.log('  - /api/messages');
  console.log('  - /api/playlists');
  console.log('  - /api/profile');
  console.log('  - /api/radio');
  console.log('  - /api/social');
  console.log('  - /api/stats');
  console.log('  - /api/upload');

});
