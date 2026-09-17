// frontend/src/store/settingsStore.js
import { create } from 'zustand';
import { getStoredUser } from '../utils/auth';
import { ownerOf, loadSettings, saveSettings } from '../utils/likeStorage';

const DEFAULTS = {
  crossfadeSeconds: 0,
  gapless: true,
  volumeLevel: 'normal',
  showNowPlayingAnimations: true,
  language: 'en',
  eqPreset: 'off',
};

// Theme is device-wide (matches Apple Music's "device settings" model)
const DEVICE_THEME_KEY = 'sonara_theme_device';

function loadDeviceTheme() {
  try { return localStorage.getItem(DEVICE_THEME_KEY) || 'dark'; } catch { return 'dark'; }
}
function saveDeviceTheme(theme) {
  try { localStorage.setItem(DEVICE_THEME_KEY, theme); } catch {}
}

function currentOwner() {
  return ownerOf(getStoredUser());
}

export const useSettingsStore = create((set, get) => {
  const owner = currentOwner();
  const saved = loadSettings(owner) || {};

  return {
    ...DEFAULTS,
    ...saved,
    theme: loadDeviceTheme(),
    owner,

    /** Called by AuthContext when the logged-in user changes. */
    setOwner: (newOwner) => {
      if (get().owner === newOwner) return;
      const fresh = loadSettings(newOwner) || {};
      set({
        ...DEFAULTS,
        ...fresh,
        theme: loadDeviceTheme(), // keep theme as-is (device-wide)
        owner: newOwner,
      });
    },

    set: (key, value) => {
      if (key === 'theme') {
        saveDeviceTheme(value);
        set({ theme: value });
        return;
      }
      const owner = currentOwner();
      const next = { ...get(), [key]: value };
      const { set: _s, setOwner: _so, reset: _r, owner: _o, ...clean } = next;
      saveSettings(owner, clean);
      set({ [key]: value });
    },

    reset: () => {
      const owner = currentOwner();
      const fresh = { ...DEFAULTS, theme: loadDeviceTheme() };
      saveSettings(owner, DEFAULTS);
      set(fresh);
    },
  };
});