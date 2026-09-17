// frontend/src/store/playerStore.js
import { create } from 'zustand';
import * as favApi from '../api/favorites';
import { getToken, getStoredUser } from '../utils/auth';
import { ownerOf, loadLikes, saveLikes } from '../utils/likeStorage';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function smartShuffleArray(tracks, likedTracks) {
  const weights = {};
  for (const t of Object.values(likedTracks || {})) {
    const name = t?.artist?.name;
    if (name) weights[name] = (weights[name] || 0) + 1;
  }
  const scored = tracks.map(t => ({
    track: t,
    weight: 1 + (weights[t?.artist?.name] || 0),
    r: Math.random(),
  }));
  scored.sort((a, b) => (b.weight * b.r) - (a.weight * a.r));
  return scored.map(s => s.track);
}

function needAuth() {
  window.dispatchEvent(new CustomEvent('sonara-need-auth'));
}

const initialOwner = ownerOf(getStoredUser());

export const usePlayerStore = create((set, get) => ({
  currentTrack: null,
  queue: [],
  originalQueue: [],
  queueIndex: -1,
  isPlaying: false,
  shuffleMode: 'off',
  repeatMode: 'off',
  volume: 1,
  muted: false,
  progress: 0,
  duration: 0,

  isNowPlayingOpen: false,
  isQueueOpen: false,

  owner: initialOwner,
  likedTracks: loadLikes(initialOwner),

  setOwner: (owner) => {
    if (get().owner === owner) return;
    set({ owner, likedTracks: loadLikes(owner) });
  },

  isLiked: (id) => !!get().likedTracks[id],

  hydrateFavorites: (tracks) => {
    const owner = get().owner;
    const merged = { ...get().likedTracks };
    for (const t of tracks) if (t?.id) merged[t.id] = t;
    saveLikes(owner, merged);
    set({ likedTracks: merged });
  },

  toggleLike: async (track) => {
    if (!track?.id) return;
    if (track.isLive) return; // can't like live radio
    if (!getToken()) { needAuth(); return; }

    const owner = get().owner;
    const prev = get().likedTracks;
    const next = { ...prev };
    const wasLiked = !!next[track.id];
    if (wasLiked) delete next[track.id];
    else next[track.id] = track;

    saveLikes(owner, next);
    set({ likedTracks: next });

    try {
      if (wasLiked) await favApi.removeFavorite(track);
      else await favApi.addFavorite(track);
    } catch (err) {
      console.warn('[favorites] sync failed, rolling back', err.message);
      saveLikes(owner, prev);
      set({ likedTracks: prev });
    }
  },

  playTrack: (track, contextQueue) => {
    if (!track) return;
    if (!getToken()) { needAuth(); return; }

    const queue = contextQueue?.length ? contextQueue : [track];
    const { shuffleMode } = get();
    const idx = queue.findIndex(t => t.id === track.id);

    if (shuffleMode === 'off') {
      set({
        currentTrack: track,
        queue,
        originalQueue: queue,
        queueIndex: idx >= 0 ? idx : 0,
        isPlaying: true,
        progress: 0,
        duration: 0,
      });
    } else {
      const rest = queue.filter(t => t.id !== track.id);
      const shuffled =
        shuffleMode === 'smart'
          ? smartShuffleArray(rest, get().likedTracks)
          : shuffleArray(rest);
      set({
        currentTrack: track,
        queue: [track, ...shuffled],
        originalQueue: queue,
        queueIndex: 0,
        isPlaying: true,
        progress: 0,
        duration: 0,
      });
    }
  },

  /** Play a live radio station â€” no auth required. */
  playRadio: (station) => {
    if (!station?.id) return;
    if (!getToken()) { needAuth(); return; }
    const track = {
      id: `radio:${station.id}`,
      source: 'radio',
      sourceId: station.id,
      title: station.name,
      isLive: true,
      audio: `/api/radio/stream/${station.id}`,
      image: station.favicon || null,
      artist: {
        id: null,
        name: station.country || 'Live Radio',
        handle: null,
        image: null,
      },
      radio: {
        country: station.country,
        countryCode: station.countryCode,
        state: station.state,
        tags: station.tags || [],
        codec: station.codec,
        bitrate: station.bitrate,
        homepage: station.homepage,
        votes: station.votes,
      },
    };
    set({
      currentTrack: track,
      queue: [track],
      originalQueue: [track],
      queueIndex: 0,
      isPlaying: true,
      progress: 0,
      duration: 0,
    });
  },

  playTracks: (tracks, startIndex = 0) => {
    if (!tracks?.length) return;
    get().playTrack(tracks[startIndex], tracks);
  },

  stopPlayback: () => set({
    currentTrack: null,
    isPlaying: false,
    queue: [],
    originalQueue: [],
    queueIndex: -1,
    progress: 0,
    duration: 0,
    isNowPlayingOpen: false,
    isQueueOpen: false,
  }),

  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),
  setPlaying: (v) => set({ isPlaying: v }),

  next: (auto = false) => {
    const { queue, queueIndex, repeatMode, currentTrack } = get();
    if (!queue.length) return;
    // Live radio has a single-station queue; nothing to advance to
    if (currentTrack?.isLive) return;
    let nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') nextIdx = 0;
      else { if (auto) set({ isPlaying: false }); return; }
    }
    set({
      queueIndex: nextIdx,
      currentTrack: queue[nextIdx],
      progress: 0,
      duration: 0,
      isPlaying: true,
    });
  },

  prev: () => {
    const { queue, queueIndex, progress, currentTrack } = get();
    if (!queue.length) return;
    if (currentTrack?.isLive) return;
    if (progress > 3) {
      set({ progress: 0 });
      window.dispatchEvent(new CustomEvent('sonara-seek', { detail: 0 }));
      return;
    }
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) prevIdx = 0;
    set({
      queueIndex: prevIdx,
      currentTrack: queue[prevIdx],
      progress: 0,
      duration: 0,
      isPlaying: true,
    });
  },

  playNext: (track) => {
    if (!track) return;
    const { currentTrack } = get();
    if (currentTrack?.isLive) return;
    const { queue, queueIndex } = get();
    if (!queue.length) { get().playTrack(track); return; }
    if (currentTrack && track.id === currentTrack.id) return;

    const without = queue.filter(t => t.id !== track.id);
    let curIdx = currentTrack ? without.findIndex(t => t.id === currentTrack.id) : -1;
    if (curIdx < 0) curIdx = Math.min(queueIndex, without.length - 1);
    if (curIdx < 0) curIdx = 0;

    const insertAt = curIdx + 1;
    set({
      queue: [...without.slice(0, insertAt), track, ...without.slice(insertAt)],
      queueIndex: curIdx,
    });
  },

  addToQueue: (track) => {
    if (!track) return;
    const { queue, currentTrack } = get();
    if (currentTrack?.isLive) return;
    if (queue.some(t => t.id === track.id)) return;
    set({ queue: [...queue, track] });
  },

  removeFromQueue: (index) => {
    const { queue, queueIndex } = get();
    if (index < 0 || index >= queue.length) return;
    const newQueue = queue.filter((_, i) => i !== index);
    let newIdx = queueIndex;
    if (index < queueIndex) newIdx -= 1;
    else if (index === queueIndex) newIdx = Math.min(queueIndex, newQueue.length - 1);
    set({
      queue: newQueue,
      queueIndex: newIdx,
      currentTrack: newQueue[newIdx] || null,
      isPlaying: newQueue[newIdx] ? get().isPlaying : false,
    });
  },

  reorderQueue: (fromIndex, toIndex) => {
    const { queue, queueIndex } = get();
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= queue.length || toIndex >= queue.length) return;
    const next = [...queue];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    let newIdx = queueIndex;
    if (fromIndex === queueIndex) newIdx = toIndex;
    else if (fromIndex < queueIndex && toIndex >= queueIndex) newIdx = queueIndex - 1;
    else if (fromIndex > queueIndex && toIndex <= queueIndex) newIdx = queueIndex + 1;
    set({ queue: next, queueIndex: newIdx });
  },

  clearQueue: () => set({ queue: [], queueIndex: -1, currentTrack: null, isPlaying: false }),

  setProgress: (v) => set({ progress: v }),
  setDuration: (v) => set({ duration: v }),

  setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: false }),
  toggleMute: () => set(s => ({ muted: !s.muted })),

  applyShuffle: () => {
    const { queue, originalQueue, currentTrack, shuffleMode, likedTracks } = get();
    if (!queue.length || !currentTrack) return;
    if (currentTrack.isLive) return;

    if (shuffleMode === 'off') {
      if (!originalQueue.length) return;
      const idx = originalQueue.findIndex(t => t.id === currentTrack.id);
      set({ queue: originalQueue, queueIndex: idx >= 0 ? idx : 0 });
      return;
    }

    const rest = queue.filter(t => t.id !== currentTrack.id);
    const shuffled =
      shuffleMode === 'smart'
        ? smartShuffleArray(rest, likedTracks)
        : shuffleArray(rest);
    set({ queue: [currentTrack, ...shuffled], queueIndex: 0 });
  },

  cycleShuffle: () => {
    const current = get().shuffleMode;
    const next = current === 'off' ? 'on' : 'off';
    set({ shuffleMode: next });
    get().applyShuffle();
  },

  setShuffleMode: (mode) => {
    if (!['off', 'on', 'smart'].includes(mode)) return;
    set({ shuffleMode: mode });
    get().applyShuffle();
  },

  cycleRepeat: () => {
    const modes = ['off', 'all', 'one'];
    set({ repeatMode: modes[(modes.indexOf(get().repeatMode) + 1) % modes.length] });
  },

  openNowPlaying:  () => set({ isNowPlayingOpen: true }),
  closeNowPlaying: () => set({ isNowPlayingOpen: false }),
  toggleNowPlaying: () => set(s => ({ isNowPlayingOpen: !s.isNowPlayingOpen })),

  openQueue:  () => set({ isQueueOpen: true }),
  closeQueue: () => set({ isQueueOpen: false }),
  toggleQueue: () => set(s => ({ isQueueOpen: !s.isQueueOpen })),
}));
