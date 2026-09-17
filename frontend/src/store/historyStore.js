// frontend/src/store/historyStore.js
import { create } from 'zustand';
import { fetchHistory } from '../api/history';

export const useHistoryStore = create((set) => ({
  recent: [],
  loading: false,
  loadedOnce: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const entries = await fetchHistory({ limit: 30, unique: true });
      const tracks = entries.map(e => e.track).filter(Boolean);
      set({ recent: tracks, loadedOnce: true });
    } catch (err) {
      console.warn('[history] refresh failed:', err.message);
    } finally {
      set({ loading: false });
    }
  },
}));