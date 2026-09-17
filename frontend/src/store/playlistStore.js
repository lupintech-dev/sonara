// frontend/src/store/playlistStore.js
import { create } from 'zustand';
import * as api from '../api/playlists';

export const usePlaylistStore = create((set, get) => ({
  playlists: [],
  folders: [],
  loading: false,
  loadedOnce: false,

  /* ---------- Playlists ---------- */

  refresh: async () => {
    set({ loading: true });
    try {
      const [playlists, folders] = await Promise.all([
        api.listPlaylists(),
        api.listFolders(),
      ]);
      set({ playlists, folders, loadedOnce: true });
    } catch (err) {
      console.warn('[playlists] refresh failed:', err.message);
    } finally {
      set({ loading: false });
    }
  },

  create: async ({ name, description, isPublic }) => {
    const playlist = await api.createPlaylist({ name, description, isPublic });
    set({ playlists: [playlist, ...get().playlists] });
    return playlist;
  },

  update: async (id, patch) => {
    const updated = await api.updatePlaylist(id, patch);
    set({
      playlists: get().playlists.map(p => p.id === id ? { ...p, ...updated } : p),
    });
    return updated;
  },

  remove: async (id) => {
    await api.deletePlaylist(id);
    set({
      playlists: get().playlists.filter(p => p.id !== id),
      folders: get().folders.map(f => ({
        ...f,
        playlists: f.playlists.filter(p => p.id !== id),
      })),
    });
  },

  bumpTrackCount: (id, delta) => {
    set({
      playlists: get().playlists.map(p =>
        p.id === id ? { ...p, trackCount: Math.max(0, (p.trackCount || 0) + delta) } : p
      ),
    });
  },

  /* ---------- Sharing ---------- */

  enableShare: async (id) => {
    const shareCode = await api.generateShareCode(id);
    set({
      playlists: get().playlists.map(p =>
        p.id === id ? { ...p, shareCode, isCollaborative: true } : p
      ),
    });
    return shareCode;
  },

  disableShare: async (id) => {
    await api.revokeShareCode(id);
    set({
      playlists: get().playlists.map(p =>
        p.id === id ? { ...p, shareCode: null, isCollaborative: false } : p
      ),
    });
  },

  /* ---------- Folders ---------- */

  refreshFolders: async () => {
    try {
      const folders = await api.listFolders();
      set({ folders });
    } catch (err) {
      console.warn('[folders] refresh failed:', err.message);
    }
  },

  createFolder: async (name) => {
    const folder = await api.createFolder(name);
    set({ folders: [...get().folders, { ...folder, playlists: [] }] });
    return folder;
  },

  renameFolder: async (id, name) => {
    await api.renameFolder(id, name);
    set({
      folders: get().folders.map(f => f.id === id ? { ...f, name } : f),
    });
  },

  deleteFolder: async (id) => {
    await api.deleteFolder(id);
    set({ folders: get().folders.filter(f => f.id !== id) });
  },

  addPlaylistToFolder: async (folderId, playlistId) => {
    await api.addPlaylistToFolder(folderId, playlistId);
    // Refresh folders from server to get the full playlist payload
    await get().refreshFolders();
  },

  removePlaylistFromFolder: async (folderId, playlistId) => {
    await api.removePlaylistFromFolder(folderId, playlistId);
    set({
      folders: get().folders.map(f =>
        f.id === folderId
          ? { ...f, playlists: f.playlists.filter(p => p.id !== playlistId) }
          : f
      ),
    });
  },

  reorderFolderPlaylists: async (folderId, order) => {
    await api.reorderFolder(folderId, order);
    // Optimistic local reorder
    set({
      folders: get().folders.map(f => {
        if (f.id !== folderId) return f;
        const byId = new Map(f.playlists.map(p => [p.id, p]));
        const reordered = order.map(id => byId.get(id)).filter(Boolean);
        return { ...f, playlists: reordered };
      }),
    });
  },
}));