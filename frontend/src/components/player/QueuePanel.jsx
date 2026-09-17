// frontend/src/components/player/QueuePanel.jsx
import { useEffect, useRef, useState } from 'react';
import { X, GripVertical, Trash2, Play, Pause, Clock, ListMusic } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';
import { fetchHistory } from '../../api/history';
import './QueuePanel.css';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 768
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isMobile;
}

export default function QueuePanel() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('queue');
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Mobile bottom-sheet state: 'half' | 'full'
  const [sheetState, setSheetState] = useState('half');
  const [dragOffset, setDragOffset] = useState(null); // null = use class, else translateY ratio 0..1
  const dragRef = useRef({ dragging: false, startY: 0, startOffset: 0, currentOffset: 0 });

  const isOpen       = usePlayerStore(s => s.isQueueOpen);
  const isNpOpen     = usePlayerStore(s => s.isNowPlayingOpen);
  const queue        = usePlayerStore(s => s.queue);
  const queueIndex   = usePlayerStore(s => s.queueIndex);
  const isPlaying    = usePlayerStore(s => s.isPlaying);
  const closeQueue   = usePlayerStore(s => s.closeQueue);
  const playTracks   = usePlayerStore(s => s.playTracks);
  const removeFromQueue = usePlayerStore(s => s.removeFromQueue);
  const clearQueue   = usePlayerStore(s => s.clearQueue);
  const reorderQueue = usePlayerStore(s => s.reorderQueue);

  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const nowPlaying = queue[queueIndex];
  const upNext     = queue.slice(queueIndex + 1);

  // Reset mobile sheet state on open / close
  useEffect(() => {
    if (isOpen && isMobile) setSheetState('half');
    if (!isOpen) { setDragOffset(null); dragRef.current.currentOffset = 0; }
  }, [isOpen, isMobile]);

  // Load history when History tab opens
  useEffect(() => {
    if (!isOpen || tab !== 'history') return;
    let cancelled = false;
    setHistoryLoading(true);
    fetchHistory({ limit: 50, unique: false })
      .then(entries => {
        if (!cancelled) setHistoryEntries(entries.filter(e => e.track));
      })
      .catch(err => console.warn('[queue history]', err.message))
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, tab]);

  // -------- Mobile drag handle --------
  const onHandleDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current.dragging = true;
    dragRef.current.startY = e.clientY;
    dragRef.current.startOffset = sheetState === 'full' ? 0 : 0.45;
    dragRef.current.currentOffset = dragRef.current.startOffset;
  };

  const onHandleMove = (e) => {
    if (!dragRef.current.dragging) return;
    const deltaY = e.clientY - dragRef.current.startY;
    const deltaRatio = deltaY / window.innerHeight;
    const next = Math.max(0, Math.min(0.95, dragRef.current.startOffset + deltaRatio));
    dragRef.current.currentOffset = next;
    setDragOffset(next);
  };

  const onHandleUp = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    const offset = dragRef.current.currentOffset;
    setDragOffset(null);

    if (offset > 0.7) {
      closeQueue();
    } else if (offset > 0.28) {
      setSheetState('half');
    } else {
      setSheetState('full');
    }
  };

  // -------- Desktop drag-to-reorder --------
  const handleDragStart = (i) => setDragIndex(i);
  const handleDragOver  = (e, i) => { e.preventDefault(); setOverIndex(i); };
  const handleDrop      = (i) => {
    if (dragIndex !== null && dragIndex !== i) reorderQueue(dragIndex, i);
    setDragIndex(null);
    setOverIndex(null);
  };

  // Inline style during drag; otherwise classes control the transform
  const sheetStyle = dragOffset !== null
    ? { transform: `translateY(${dragOffset * 100}%)` }
    : undefined;

  return (
    <>
      {isOpen && (
        <div
          className={`queue-backdrop ${isNpOpen ? 'over-np' : ''}`}
          onClick={closeQueue}
        />
      )}

      <aside
        className={[
          'queue-panel',
          isOpen ? 'open' : '',
          isNpOpen ? 'over-np' : '',
          isMobile ? `sheet-${sheetState}` : '',
          dragOffset !== null ? 'dragging' : '',
        ].filter(Boolean).join(' ')}
        style={sheetStyle}
        aria-hidden={!isOpen}
      >
        {isMobile && (
          <div
            className="queue-sheet-handle"
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
            aria-label="Drag to resize"
            role="button"
          >
            <span className="queue-sheet-bar" />
          </div>
        )}

        <header className="queue-header">
          <div className="queue-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'queue'}
              className={`queue-tab ${tab === 'queue' ? 'active' : ''}`}
              onClick={() => setTab('queue')}
            >
              Queue
            </button>
            <button
              role="tab"
              aria-selected={tab === 'history'}
              className={`queue-tab ${tab === 'history' ? 'active' : ''}`}
              onClick={() => setTab('history')}
            >
              History
            </button>
          </div>
          <div className="queue-header-actions">
            {tab === 'queue' && queue.length > 0 && (
              <button className="btn-icon" onClick={clearQueue} aria-label="Clear queue" title="Clear queue">
                <Trash2 size={16} />
              </button>
            )}
            <button className="btn-icon" onClick={closeQueue} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </header>

        {tab === 'queue' && (
          <div className="queue-body scroll-y">
            {nowPlaying ? (
              <section className="queue-section">
                <h4 className="queue-section-title">Now Playing</h4>
                <QueueItem
                  track={nowPlaying}
                  isCurrent
                  isPlaying={isPlaying}
                  onPlay={() => playTracks(queue, queueIndex)}
                />
              </section>
            ) : (
              <div className="queue-empty-state">
                <ListMusic size={40} />
                <p>Your queue is empty.</p>
                <small>Play a track to get started.</small>
              </div>
            )}

            {nowPlaying && (
              <section className="queue-section">
                <h4 className="queue-section-title">
                  Next up {upNext.length > 0 && <span className="queue-count">{upNext.length}</span>}
                </h4>

                {upNext.length === 0 && (
                  <p className="queue-empty">Nothing up next. Add tracks from any list.</p>
                )}

                <ul className="queue-list">
                  {upNext.map((track, i) => {
                    const realIndex = queueIndex + 1 + i;
                    return (
                      <li
                        key={`${track.id}-${realIndex}`}
                        draggable={!isMobile}
                        onDragStart={() => handleDragStart(realIndex)}
                        onDragOver={(e) => handleDragOver(e, realIndex)}
                        onDragLeave={() => setOverIndex(null)}
                        onDrop={() => handleDrop(realIndex)}
                        className={`queue-item-wrap ${overIndex === realIndex ? 'over' : ''} ${dragIndex === realIndex ? 'dragging' : ''}`}
                      >
                        {!isMobile && <span className="queue-grip"><GripVertical size={14} /></span>}
                        <QueueItem
                          track={track}
                          isCurrent={false}
                          isPlaying={false}
                          onPlay={() => playTracks(queue, realIndex)}
                          onRemove={() => removeFromQueue(realIndex)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="queue-body scroll-y">
            {historyLoading && <p className="queue-empty">Loading history…</p>}
            {!historyLoading && historyEntries.length === 0 && (
              <div className="queue-empty-state">
                <Clock size={40} />
                <p>No history yet.</p>
                <small>Play a track and it'll appear here.</small>
              </div>
            )}
            {!historyLoading && historyEntries.length > 0 && (
              <ul className="queue-list history-list">
                {historyEntries.map((entry, i) => {
                  const t = entry.track;
                  return (
                    <li key={`${entry.source}-${entry.refId}-${i}`} className="queue-item-wrap history-wrap">
                      <QueueItem
                        track={t}
                        isCurrent={false}
                        isPlaying={false}
                        onPlay={() => playTracks([t], 0)}
                        timestamp={entry.playedAt}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

function formatAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function QueueItem({ track, isCurrent, isPlaying, onPlay, onRemove, timestamp }) {
  return (
    <div className={`queue-item ${isCurrent ? 'current' : ''}`}>
      <button className="queue-item-main" onClick={onPlay}>
        <span className="queue-item-cover">
          {track.image
            ? <img src={track.image} alt="" loading="lazy" />
            : <span className="queue-item-cover-fallback" />}
          <span className="queue-item-play">
            {isPlaying ? <Pause size={16} fill="#000" /> : <Play size={16} fill="#000" />}
          </span>
        </span>
        <span className="queue-item-meta">
          <span className="queue-item-title truncate">{track.title}</span>
          <span className="queue-item-artist truncate">
            {track.artist?.name || 'Unknown'}
            {timestamp && <span className="queue-item-time"> · {formatAgo(timestamp)}</span>}
          </span>
        </span>
      </button>
      {onRemove && (
        <button className="btn-icon queue-item-remove" onClick={onRemove} aria-label="Remove">
          <X size={14} />
        </button>
      )}
    </div>
  );
}