// frontend/src/components/player/NowPlaying.jsx
import { useState } from 'react';
import {
  ChevronDown, Heart, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Volume2, VolumeX, ListMusic, Sparkles,
  Mic2, Disc3, Radio as RadioIcon, ExternalLink,
} from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { useShuffleClick } from '../../hooks/useShuffleClick';
import TrackMenu from '../common/TrackMenu';
import DownloadButton from '../common/DownloadButton';
import LyricsView from './LyricsView';
import './NowPlaying.css';

function fmt(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function NowPlaying() {
  const [pane, setPane] = useState('art');

  const track        = usePlayerStore(s => s.currentTrack);
  const isOpen       = usePlayerStore(s => s.isNowPlayingOpen);
  const isPlaying    = usePlayerStore(s => s.isPlaying);
  const progress     = usePlayerStore(s => s.progress);
  const duration     = usePlayerStore(s => s.duration);
  const volume       = usePlayerStore(s => s.volume);
  const muted        = usePlayerStore(s => s.muted);
  const shuffleMode  = usePlayerStore(s => s.shuffleMode);
  const repeatMode   = usePlayerStore(s => s.repeatMode);
  const isLiked      = usePlayerStore(s => (track ? !!s.likedTracks[track.id] : false));

  const closeNowPlaying = usePlayerStore(s => s.closeNowPlaying);
  const togglePlay      = usePlayerStore(s => s.togglePlay);
  const next            = usePlayerStore(s => s.next);
  const prev            = usePlayerStore(s => s.prev);
  const cycleRepeat     = usePlayerStore(s => s.cycleRepeat);
  const setVolume       = usePlayerStore(s => s.setVolume);
  const toggleMute      = usePlayerStore(s => s.toggleMute);
  const toggleLike      = usePlayerStore(s => s.toggleLike);
  const toggleQueue     = usePlayerStore(s => s.toggleQueue);

  const onShuffleClick = useShuffleClick();
  const isIdle = useIdleTimer(3000);

  if (!track) return null;

  const isLive = !!track.isLive;
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
  const isShuffling = shuffleMode !== 'off';
  const isSmart     = shuffleMode === 'smart';

  const seek = (e) => {
    const t = parseFloat(e.target.value);
    usePlayerStore.getState().setProgress(t);
    window.dispatchEvent(new CustomEvent('sonara-seek', { detail: t }));
  };

  const progressPct = (duration && isFinite(duration)) ? (progress / duration) * 100 : 0;
  const volumePct   = (muted ? 0 : volume) * 100;

  const albumName = track.album?.name || null;
  const radioMeta = track.radio || null;

  return (
    <div
      className={`nowplaying ${isOpen ? 'open' : ''} ${isIdle ? 'idle' : ''} ${isLive ? 'is-live' : ''}`}
      aria-hidden={!isOpen}
    >
      {track.image && (
        <div className="np-bg" style={{ backgroundImage: `url(${track.image})` }} />
      )}
      <div className="np-bg-overlay" />

      <header className="np-topbar">
        <button className="btn-icon np-close" onClick={closeNowPlaying} aria-label="Close">
          <ChevronDown size={26} />
        </button>
        <div className="np-source">
          <span className="np-source-label">
            {isLive ? 'Live Radio' : 'Artist'}
          </span>
          <span className="np-source-value">
            {isLive ? (radioMeta?.country || 'Global') : (track.artist?.name || 'Unknown Artist')}
          </span>
        </div>
        <div className="np-menu-slot">
          {!isLive && <TrackMenu track={track} />}
        </div>
      </header>

      <div className={`np-body ${pane === 'lyrics' ? 'lyrics-open' : ''}`}>
        <div className="np-stage">
          {pane === 'art' || isLive ? (
            <div className="np-art">
              {track.image
                ? <img src={track.image} alt="" />
                : <div className="np-art-fallback"><RadioIcon size={64} /></div>}
            </div>
          ) : (
            <div className="np-lyrics-stage">
              <LyricsView track={track} />
            </div>
          )}
        </div>

        <div className="np-side">
          <div className="np-info">
            <h1 className="np-title">{track.title}</h1>
            <p className="np-artist">
              {isLive
                ? (radioMeta?.country || 'Live Radio')
                : (track.artist?.name || 'Unknown Artist')}
            </p>
            {!isLive && albumName && <p className="np-album">{albumName}</p>}

            {isLive && (
              <div className="np-live-meta">
                {radioMeta?.tags?.length > 0 && (
                  <div className="np-live-tags">
                    {radioMeta.tags.slice(0, 5).map(t => (
                      <span key={t} className="np-live-tag">{t}</span>
                    ))}
                  </div>
                )}
                <div className="np-live-facts">
                  {radioMeta?.codec && <span>{radioMeta.codec}</span>}
                  {radioMeta?.bitrate > 0 && <span>{radioMeta.bitrate} kbps</span>}
                  {radioMeta?.votes > 0 && <span>{radioMeta.votes.toLocaleString()} votes</span>}
                </div>
                {radioMeta?.homepage && (
                  <a
                    className="np-live-link"
                    href={radioMeta.homepage}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={12} /> Station website
                  </a>
                )}
              </div>
            )}
          </div>

          {isLive ? (
            <div className="np-progress np-progress-live">
              <div className="np-live-indicator">
                <span className="np-live-dot" />
                <span className="np-live-label">LIVE BROADCAST</span>
              </div>
            </div>
          ) : (
            <div className="np-progress">
              <input
                className="np-range"
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={progress}
                onChange={seek}
                aria-label="Seek"
                style={{ '--pct': `${progressPct}%` }}
              />
              <div className="np-times">
                <span>{fmt(progress)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>
          )}

          {isLive ? (
            <div className="np-controls np-controls-live">
              <button className="np-play" onClick={togglePlay} aria-label="Play/Pause">
                {isPlaying ? <Pause size={34} fill="#000" /> : <Play size={34} fill="#000" />}
              </button>
            </div>
          ) : (
            <div className="np-controls">
              <button
                className={`btn-icon np-ctrl ${isShuffling ? 'is-on' : ''} ${isSmart ? 'is-smart' : ''}`}
                onClick={onShuffleClick}
                aria-label={isSmart ? 'Smart shuffle' : 'Shuffle'}
                title="Click: shuffle · Double-click: smart shuffle"
              >
                {isSmart ? <Sparkles size={22} /> : <Shuffle size={22} />}
              </button>
              <button className="btn-icon np-ctrl" onClick={prev} aria-label="Previous">
                <SkipBack size={32} fill="currentColor" />
              </button>
              <button className="np-play" onClick={togglePlay} aria-label="Play/Pause">
                {isPlaying ? <Pause size={34} fill="#000" /> : <Play size={34} fill="#000" />}
              </button>
              <button className="btn-icon np-ctrl" onClick={() => next(false)} aria-label="Next">
                <SkipForward size={32} fill="currentColor" />
              </button>
              <button
                className={`btn-icon np-ctrl ${repeatMode !== 'off' ? 'is-on' : ''}`}
                onClick={cycleRepeat}
                aria-label="Repeat"
              >
                <RepeatIcon size={22} />
              </button>
            </div>
          )}

          <div className="np-footer">
            {!isLive && (
              <button
                className={`btn-icon np-ctrl ${isLiked ? 'is-liked' : ''}`}
                onClick={() => toggleLike(track)}
                aria-label="Like"
              >
                <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />
              </button>
            )}

            {!isLive && <DownloadButton track={track} size="lg" />}

            {!isLive && (
              <button
                className={`btn-icon np-ctrl ${pane === 'lyrics' ? 'is-on' : ''}`}
                onClick={() => setPane(p => p === 'lyrics' ? 'art' : 'lyrics')}
                aria-label="Lyrics"
                title="Lyrics"
              >
                {pane === 'lyrics' ? <Disc3 size={22} /> : <Mic2 size={22} />}
              </button>
            )}

            {!isLive && (
              <button className="btn-icon np-ctrl" onClick={toggleQueue} aria-label="Queue">
                <ListMusic size={22} />
              </button>
            )}

            <div className="np-volume">
              <button className="btn-icon np-ctrl" onClick={toggleMute} aria-label="Mute">
                {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                className="np-range np-range-vol"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Volume"
                style={{ '--pct': `${volumePct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}