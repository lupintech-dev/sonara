// frontend/src/utils/eqPresets.js

/** Center frequencies (Hz) for our 10-band EQ. */
export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

/**
 * Preset definitions. Each `bands` array is 10 gain values in dB (‑12…+12),
 * one per EQ_FREQUENCIES entry.
 */
export const EQ_PRESETS = {
  off:           { name: 'Off',            bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  acoustic:      { name: 'Acoustic',       bands: [5, 4, 3, 1, 0, 0, 2, 3, 3, 2] },
  classical:     { name: 'Classical',      bands: [5, 4, 3, 2, 0, 0, 0, 2, 3, 4] },
  dance:         { name: 'Dance',          bands: [6, 5, 4, 2, 1, 0, -1, -2, -3, -4] },
  deep:          { name: 'Deep',           bands: [6, 5, 3, 1, 0, 0, -1, -2, -3, -4] },
  electronic:    { name: 'Electronic',     bands: [5, 4, 2, 0, -1, 0, 1, 2, 4, 5] },
  flat:          { name: 'Flat',           bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  hipHop:        { name: 'Hip-Hop',        bands: [5, 4, 2, 3, -1, -1, 1, 1, 3, 3] },
  increaseBass:  { name: 'Increase Bass',  bands: [7, 6, 5, 3, 1, 0, 0, 0, 0, 0] },
  jazz:          { name: 'Jazz',           bands: [4, 3, 2, 1, 0, 0, 1, 2, 3, 4] },
  latin:         { name: 'Latin',          bands: [5, 3, 0, 1, -1, -1, -2, -2, -2, -3] },
  loudness:      { name: 'Loudness',       bands: [6, 4, 1, 0, -2, 0, -1, -3, -4, -6] },
  lounge:        { name: 'Lounge',         bands: [3, 2, 1, 0, -1, -2, 0, 1, 2, 3] },
  piano:         { name: 'Piano',          bands: [3, 2, 1, 0, 1, 2, 3, 3, 2, 1] },
  pop:           { name: 'Pop',            bands: [-1, -1, 0, 2, 4, 4, 2, 0, -1, -2] },
  rnb:           { name: 'R&B',            bands: [6, 4, 2, 1, 0, 0, 1, 2, 3, 4] },
  reduceBass:    { name: 'Reduce Bass',    bands: [-7, -6, -5, -3, -1, 0, 0, 0, 0, 0] },
  rock:          { name: 'Rock',           bands: [5, 4, 3, 1, -1, -1, 0, 2, 3, 4] },
  smallSpeakers: { name: 'Small Speakers', bands: [6, 5, 4, 3, 2, 1, 0, -1, -2, -3] },
  spokenWord:    { name: 'Spoken Word',    bands: [-4, -3, -2, 0, 3, 5, 5, 4, 2, 0] },
  trebleBooster: { name: 'Treble Booster', bands: [0, 0, 0, 0, 0, 0, 2, 4, 5, 6] },
  trebleReducer: { name: 'Treble Reducer', bands: [0, 0, 0, 0, 0, 0, -2, -4, -5, -6] },
};

/** Ordered list for the picker page. */
export const EQ_PRESET_ORDER = [
  'off', 'acoustic', 'classical', 'dance', 'deep', 'electronic', 'flat',
  'hipHop', 'increaseBass', 'jazz', 'latin', 'loudness', 'lounge', 'piano',
  'pop', 'rnb', 'reduceBass', 'rock', 'smallSpeakers', 'spokenWord',
  'trebleBooster', 'trebleReducer',
];