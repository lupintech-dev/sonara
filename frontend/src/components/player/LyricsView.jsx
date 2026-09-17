// frontend/src/components/player/LyricsView.jsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { Music2, Loader2 } from 'lucide-react';
import { fetchLyrics } from '../../api/lyrics';
import { parseLrc, activeLineIndex } from '../../utils/lrc';
import { usePlayerStore } from '../../store/playerStore';
import './LyricsView.css';

export default function LyricsView({ track }) {
  const [state, setState] = useState({
    status: 'idle',
    lines: [],
    plain: null,
    error: null,
    lyricsDuration: null,
  });
  const containerRef = useRef(null);
  const activeRef = useRef(null);

  const progress = usePlayerStore(s => s.progress);
  const audioDuration = usePlayerStore(s => s.duration);

  useEffect(() => {
    if (!track) return;
    let cancelled = false;
    setState({ status: 'loading', lines: [], plain: null, error: null, lyricsDuration: null });

    fetchLyrics({
      artist: track.artist?.name,
      title: track.title,
      album: track.album?.name,
      duration: track.duration,
    })
      .then(result => {
        if (cancelled) return;
        if (!result) {
          setState({ status: 'empty', lines: [], plain: null, error: null, lyricsDuration: null });
          return;
        }
        if (result.instrumental) {
          setState({ status: 'instrumental', lines: [], plain: null, error: null, lyricsDuration: null });
          return;
        }
        if (result.syncedLyrics) {
          setState({
            status: 'synced',
            lines: parseLrc(result.syncedLyrics),
            plain: null,
            error: null,
            lyricsDuration: result.duration || null,
          });
        } else if (result.plainLyrics) {
          setState({
            status: 'plain',
            lines: [],
            plain: result.plainLyrics,
            error: null,
            lyricsDuration: null,
          });
        } else {
          setState({ status: 'empty', lines: [], plain: null, error: null, lyricsDuration: null });
        }
      })
      .catch(err => {
        if (!cancelled) {
          setState({ status: 'error', lines: [], plain: null, error: err.message, lyricsDuration: null });
        }
      });

    return () => { cancelled = true; };
  }, [track?.id]);

  // Auto-scale lyric timestamps when the audio duration differs from the source.
  // Handles slowed + reverb, sped up, extended edits.
  const scale = useMemo(() => {
    if (state.status !== 'synced') return 1;
    if (!state.lyricsDuration || !audioDuration) return 1;
    const ratio = audioDuration / state.lyricsDuration;
    if (Math.abs(ratio - 1) < 0.02) return 1;
    return ratio;
  }, [state.status, state.lyricsDuration, audioDuration]);

  const scaledLines = useMemo(() => {
    if (scale === 1) return state.lines;
    return state.lines.map(l => ({
      ...l,
      time: l.time == null ? null : l.time * scale,
    }));
  }, [state.lines, scale]);

  const activeIdx = useMemo(
    () => activeLineIndex(scaledLines, progress),
    [scaledLines, progress]
  );

  useEffect(() => {
    if (state.status !== 'synced') return;
    const container = containerRef.current;
    const el = activeRef.current;
    if (!container || !el) return;
    const top = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    container.scrollTo({ top, behavior: 'smooth' });
  }, [activeIdx, state.status]);

  if (state.status === 'loading') {
    return (
      <div className="lyr-state">
        <Loader2 size={22} className="lyr-spin" />
        <p>Loading lyrics…</p>
      </div>
    );
  }

  if (state.status === 'empty' || state.status === 'error') {
    return (
      <div className="lyr-state">
        <Music2 size={36} />
        <p>{state.error ? `Couldn't load lyrics.` : `No lyrics found for this track.`}</p>
        {state.error && <small className="lyr-hint">{state.error}</small>}
      </div>
    );
  }

  if (state.status === 'instrumental') {
    return (
      <div className="lyr-state">
        <Music2 size={36} />
        <p>Instrumental</p>
      </div>
    );
  }

  if (state.status === 'plain') {
    return (
      <div className="lyr-plain scroll-y">
        {state.plain.split(/\r?\n/).map((line, i) => (
          <p key={i}>{line || '\u00A0'}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="lyr-wrapper">
      <div className="lyr-scroll scroll-y" ref={containerRef}>
        <div className="lyr-spacer" />
        {scaledLines.map((line, i) => {
          const isActive = i === activeIdx;
          const isPast = i < activeIdx;
          return (
            <p
              key={i}
              ref={isActive ? activeRef : null}
              className={`lyr-line ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
            >
              {line.text}
            </p>
          );
        })}
        <div className="lyr-spacer" />
      </div>
    </div>
  );
}