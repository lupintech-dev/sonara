# Sonara 🎵

> **Your music. Everywhere.** — A self-hosted, ad-free music streaming web app that aggregates free and open music catalogs from Audius, Jamendo, and 50,000+ live radio stations worldwide.

[![Live Demo](https://img.shields.io/badge/demo-sonara--two.vercel.app-1ed760?style=for-the-badge)](https://sonara-two.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-1ed760?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-1ed760?style=for-the-badge)](https://react.dev)
[![Node](https://img.shields.io/badge/Node-22+-1ed760?style=for-the-badge)](https://nodejs.org)

## 🎧 Try It Live

**→ [sonara-two.vercel.app](https://sonara-two.vercel.app)**

Free forever. No ads. No subscription. No credit card.

## ✨ Features

### Player
- Unified audio proxy for all streaming sources (Audius, Jamendo, live radio)
- Dual-element crossfade for gapless playback
- 10-band equalizer with 22 presets
- Volume levels (Quiet / Normal / Loud)
- Idle-fade on Now Playing screen

### Live Radio
- 50,000+ live stations via Radio Browser
- Stream proxy handles CORS + mixed-content issues
- Dedicated live-mode player UI
- Browse by featured, genre, or country

### Discovery
- Time-aware hero banner (morning / afternoon / evening / night)
- Discover shelf with local uploads + Audius + Jamendo
- Daily Top 100 and Continental Top 100 charts (Apple Music feed)
- City Charts for major cities worldwide

### Library & Social
- Liked Songs, Recently Played, Songs, Artists, Albums, Downloads
- Full playlist CRUD with folders and drag-and-drop
- Collaborative playlists via share-code links
- Follow users, view follower/following lists
- Public artist pages with verification badges

### Artist & Admin
- Apply to become an artist → auto-verified dashboard
- Upload tracks with album grouping + ID3 metadata extraction
- Bulk ZIP import with filename parsing
- Automatic artist creation from uploaded metadata
- Embedded cover art extraction
- Admin user management, message inbox, activity log

### AI Playlist
- Describe a vibe ("warm acoustic morning coffee")
- Groq LLM generates search queries
- Results merged from Audius + Jamendo, saved as playlist

### Wrapped
- Listening statistics page (total time, top tracks, artists, genres, monthly chart, peak hour)

### Progressive Web App
- Installable on desktop (Chrome/Edge) and Android
- Offline audio via IndexedDB downloads
- Service worker caches app shell

## 🏗 Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, react-router-dom, Zustand, lucide-react, plain CSS |
| Backend | Node.js ESM, Express, @libsql/client, jsonwebtoken, bcryptjs, multer, adm-zip, music-metadata |
| Database | SQLite (dev) → Turso (production, libSQL cloud) |
| File storage | Local disk (dev) → Cloudinary (production) |
| Auth | JWT + device-ID header for anonymous sessions |
| Hosting | Vercel · Render · Turso · Cloudinary |

### External APIs

| Source | Purpose | Auth |
|---|---|---|
| Audius | Primary streaming | None |
| Jamendo | Secondary streaming | Free client ID |
| Groq | AI Playlist generation | API key |
| Apple Marketing Tools | Charts | None |
| Radio Browser | Live radio directory | None |
| LRCLIB | Synced lyrics | None |

## 🚀 Local Development

Requires Node.js 22+ and npm 10+.

```bash
git clone https://github.com/lupintech-dev/sonara.git
cd sonara

# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
# → http://localhost:5000

# Frontend (new terminal)
cd ../frontend
npm install
npm run dev
# → http://localhost:3000