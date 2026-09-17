// frontend/src/store/followStore.js
import { create } from 'zustand';
import * as api from '../api/follows';
import { getToken } from '../utils/auth';

export const useFollowStore = create((set, get) => ({
  following: new Set(),
  loaded: false,

  refresh: async () => {
    if (!getToken()) {
      set({ following: new Set(), loaded: true });
      return;
    }
    try {
      const ids = await api.fetchFollowing();
      set({ following: new Set(ids), loaded: true });
    } catch (err) {
      console.warn('[follows] refresh failed:', err.message);
      set({ loaded: true });
    }
  },

  isFollowing: (userId) => get().following.has(userId),

  toggle: async (userId) => {
    if (!getToken()) {
      window.dispatchEvent(new CustomEvent('sonara-need-auth'));
      return;
    }

    const before = new Set(get().following);
    const was = before.has(userId);

    // Optimistic update
    const optimistic = new Set(before);
    if (was) optimistic.delete(userId);
    else optimistic.add(userId);
    set({ following: optimistic });

    try {
      if (was) await api.unfollowUser(userId);
      else await api.followUser(userId);
      // Confirm with server — ensures nothing drifts
      await get().refresh();
    } catch (err) {
      console.warn('[follows] toggle failed, rolling back:', err.message);
      set({ following: before });
    }
  },
}));