// frontend/src/store/downloadStore.js
import { create } from 'zustand';
import {
  listDownloads,
  downloadTrack as doDownload,
  deleteDownload,
  clearAllDownloads,
  getTotalSize,
  listOwners,
  clearOtherOwners,
} from '../utils/downloadManager';
import { getStoredUser } from '../utils/auth';

/* Read the current owner from localStorage — always in sync with auth. */
function currentOwner() {
  try {
    const u = getStoredUser();
    return u?.id ? `user:${u.id}` : 'anon';
  } catch {
    return 'anon';
  }
}

export const useDownloadStore = create((set, get) => ({
  /** Map of trackId -> { track, size, savedAt } for the CURRENT user */
  entries: {},
  totalSize: 0,
  loaded: false,
  /** Progress 0..1 keyed by trackId while downloading */
  progress: {},
  /** Set of trackIds currently downloading */
  downloading: new Set(),
  /** Other accounts on this device with cached downloads */
  otherOwners: [],
  /** Cached owner string for the current session */
  owner: currentOwner(),

  reset: () => set({
    entries: {},
    totalSize: 0,
    loaded: false,
    progress: {},
    downloading: new Set(),
    otherOwners: [],
    owner: currentOwner(),
  }),

  refresh: async () => {
    const owner = currentOwner();
    set({ owner });
    try {
      const list = await listDownloads(owner);
      const entries = {};
      for (const item of list) entries[item.trackId] = item;
      const totalSize = await getTotalSize(owner);

      // Fetch downloads belonging to other accounts on this device
      let otherOwners = [];
      try {
        otherOwners = await listOwners({ excludeOwner: owner });
      } catch {}

      set({ entries, totalSize, otherOwners, loaded: true });
    } catch (err) {
      console.warn('[downloads] refresh failed:', err.message);
      set({ loaded: true });
    }
  },

  isDownloaded: (trackId) => !!get().entries[trackId],
  isDownloading: (trackId) => get().downloading.has(trackId),
  getProgress: (trackId) => get().progress[trackId] ?? null,

  download: async (track) => {
    if (!track?.id) return;
    if (get().entries[track.id]) return;      // already downloaded
    if (get().downloading.has(track.id)) return; // already in flight

    const owner = currentOwner();
    if (owner !== get().owner) set({ owner });

    const downloading = new Set(get().downloading);
    downloading.add(track.id);
    set({ downloading, progress: { ...get().progress, [track.id]: 0 } });

    try {
      const { size } = await doDownload(owner, track, (p) => {
        const cur = get().progress[track.id];
        if (cur !== p) set({ progress: { ...get().progress, [track.id]: p } });
      });

      const entries = {
        ...get().entries,
        [track.id]: { track, size, savedAt: Date.now() },
      };
      const totalSize = get().totalSize + size;

      const doneDl = new Set(get().downloading);
      doneDl.delete(track.id);
      const doneProg = { ...get().progress };
      delete doneProg[track.id];

      set({ entries, totalSize, downloading: doneDl, progress: doneProg });
    } catch (err) {
      const doneDl = new Set(get().downloading);
      doneDl.delete(track.id);
      const doneProg = { ...get().progress };
      delete doneProg[track.id];
      set({ downloading: doneDl, progress: doneProg });
      throw err;
    }
  },

  remove: async (trackId) => {
    const owner = currentOwner();
    const entry = get().entries[trackId];
    await deleteDownload(owner, trackId);
    const entries = { ...get().entries };
    delete entries[trackId];
    const totalSize = Math.max(0, get().totalSize - (entry?.size || 0));
    set({ entries, totalSize });
  },

  clearAll: async () => {
    const owner = currentOwner();
    await clearAllDownloads(owner);
    set({ entries: {}, totalSize: 0 });
  },

  /** Remove cached downloads belonging to every other account on this device. */
  clearOtherOwners: async () => {
    const owner = currentOwner();
    const result = await clearOtherOwners(owner);
    await get().refresh();
    return result;
  },
}));