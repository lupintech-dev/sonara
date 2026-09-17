// frontend/src/components/Player.jsx
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Heart, ListMusic, ChevronUp, Sparkles, Radio as RadioIcon,
} from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { useShuffleClick } from '../hooks/useShuffleClick';
import DownloadButton from './common/DownloadButton';
import './Player.css';

function fmt(sec) {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Player() {
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying    = usePlayerStore(s => s.isPlaying);
  const progress     = usePlayerStore(s => s.progress);
  const duration     = usePlayerStore(s => s.duration);
  const volume       = usePlayerStore(s => s.volume);
  const muted        = usePlayerStore(s => s.muted);
  const shuffleMode  = usePlayerStore(s => s.shuffleMode);
  const repeatMode   = usePlayerStore(s => s.repeatMode);
  const isLiked      = usePlayerStore(s => (currentTrack ? !!s.likedTracks[currentTrack.id] : false));

  const togglePlay     = usePlayerStore(s => s.togglePlay);
  const next           = usePlayerStore(s => s.next);
  const prev           = usePlayerStore(s => s.prev);
  const cycleRepeat    = usePlayerStore(s => s.cycleRepeat);
  const setVolume      = usePlayerStore(s => s.setVolume);
  const toggleMute     = usePlayerStore(s => s.toggleMute);
  const toggleLike     = usePlayerStore(s => s.toggleLike);
  const toggleQueue    = usePlayerStore(s => s.toggleQueue);
  const openNowPlaying = usePlayerStore(s => s.openNowPlaying);

  const onShuffleClick = useShuffleClick();

  const seek = (e) => {
    const t = parseFloat(e.target.value);
    usePlayerStore.getState().setProgress(t);
    window.dispatchEvent(new CustomEvent('sonara-seek', { detail: t }));
  };

  if (!currentTrack) return null;

  const isLive = !!currentTrack.isLive;
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
  const isShuffling = shuffleMode !== 'off';
  const isSmart     = shuffleMode === 'smart';

  const progressPct = (duration && isFinite(duration)) ? (progress / duration) * 100 : 0;
  const volumePct   = (muted ? 0 : volume) * 100;

  return (
    <div className={`player ${isLive ? 'player-live' : ''}`}>
      <div
        className="player-now"
        onClick={openNowPlaying}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') openNowPlaying(); }}
      >
        <div className="player-cover">
          {currentTrack.image
            ? <img src={currentTrack.image} alt="" />
            : <span className="player-cover-fallback"><RadioIcon size={20} /></span>}
          <span className="player-cover-expand"><ChevronUp size={18} /></span>
        </div>
        <div className="player-meta">
          <span className="player-title truncate">
            {isLive && <span className="player-live-dot" aria-hidden />}
            {currentTrack.title}
          </span>
          <span className="player-artist truncate">{currentTrack.artist?.name || 'Unknown'}</span>
        </div>
        {!isLive && (
          <button
            className={`btn-icon player-like ${isLiked ? 'is-liked' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }}
            aria-label="Like"
          >
            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        )}
        {!isLive && <DownloadButton track={currentTrack} size="md" />}
      </div>

      <div className="player-center">
        {isLive ? (
          <>
            {/* Live: simple transport, no scrubber */}
            <div className="player-controls player-controls-live">
              <button className="player-play player-ctrl-play" onClick={togglePlay} aria-label="Play/Pause">
                {isPlaying ? <Pause size={22} fill="#000" /> : <Play size={22} fill="#000" />}
              </button>
              <span className="player-live-badge">
                <span className="player-live-badge-dot" />
                LIVE
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="player-controls">
              <button
                className={`btn-icon player-ctrl-shuffle ${isShuffling ? 'is-on' : ''} ${isSmart ? 'is-smart' : ''}`}
                onClick={onShuffleClick}
                aria-label={isSmart ? 'Smart shuffle' : 'Shuffle'}
                title="Click: shuffle · Double-click: smart shuffle"
              >
                {isSmart ? <Sparkles size={18} /> : <Shuffle size={18} />}
              </button>
              <button className="btn-icon player-ctrl-prev" onClick={prev} aria-label="Previous">
                <SkipBack size={20} fill="currentColor" />
              </button>
              <button className="player-play player-ctrl-play" onClick={togglePlay} aria-label="Play/Pause">
                {isPlaying ? <Pause size={22} fill="#000" /> : <Play size={22} fill="#000" />}
              </button>
              <button className="btn-icon player-ctrl-next" onClick={() => next(false)} aria-label="Next">
                <SkipForward size={20} fill="currentColor" />
              </button>
              <button
                className={`btn-icon player-ctrl-repeat ${repeatMode !== 'off' ? 'is-on' : ''}`}
                onClick={cycleRepeat}
                aria-label="Repeat"
              >
                <RepeatIcon size={18} />
              </button>
            </div>

            <div className="player-scrubber">
              <span className="player-time">{fmt(progress)}</span>
              <input
                className="player-range player-range-progress"
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={progress}
                onChange={seek}
                style={{ '--pct': `${progressPct}%` }}
              />
              <span className="player-time">{fmt(duration)}</span>
            </div>
          </>
        )}
      </div>

      <div className="player-right">
        {!isLive && (
          <button className="btn-icon" onClick={toggleQueue} aria-label="Queue">
            <ListMusic size={18} />
          </button>
        )}
        <button className="btn-icon" onClick={toggleMute} aria-label="Mute">
          {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          className="player-range player-range-vol"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{ '--pct': `${volumePct}%` }}
        />
      </div>
    </div>
  );
}