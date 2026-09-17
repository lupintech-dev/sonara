// frontend/src/store/searchStore.js
import { create } from 'zustand';
import { getStoredUser } from '../utils/auth';
import { ownerOf, loadSearchHistory, saveSearchHistory } from '../utils/likeStorage';

const MAX = 30;

function currentOwner() {
  return ownerOf(getStoredUser());
}

export const useSearchStore = create((set, get) => ({
  owner: currentOwner(),
  history: loadSearchHistory(currentOwner()),

  /** Called by AuthContext when the logged-in user changes. */
  setOwner: (owner) => {
    if (get().owner === owner) return;
    set({ owner, history: loadSearchHistory(owner) });
  },

  add: (query) => {
    const q = query?.trim();
    if (!q || q.length < 2) return;
    const owner = currentOwner();
    const next = [q, ...get().history.filter(h => h.toLowerCase() !== q.toLowerCase())].slice(0, MAX);
    saveSearchHistory(owner, next);
    set({ history: next });
  },

  remove: (query) => {
    const owner = currentOwner();
    const next = get().history.filter(h => h !== query);
    saveSearchHistory(owner, next);
    set({ history: next });
  },

  clear: () => {
    const owner = currentOwner();
    saveSearchHistory(owner, []);
    set({ history: [] });
  },
}));