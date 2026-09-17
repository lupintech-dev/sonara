// frontend/src/hooks/usePlayerAudio.js
import { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { recordPlay } from '../api/history';
import { EQ_FREQUENCIES, EQ_PRESETS } from '../utils/eqPresets';
import { getTrackBlob } from '../utils/downloadManager';
import { getStoredUser } from '../utils/auth';

function createGraph() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();

  const eqInput = ctx.createGain();
  eqInput.gain.value = 1;

  const filters = EQ_FREQUENCIES.map((freq, i) => {
    const f = ctx.createBiquadFilter();
    if (i === 0) { f.type = 'lowshelf'; f.frequency.value = freq; }
    else if (i === EQ_FREQUENCIES.length - 1) { f.type = 'highshelf'; f.frequency.value = freq; }
    else { f.type = 'peaking'; f.frequency.value = freq; f.Q.value = 1; }
    f.gain.value = 0;
    return f;
  });

  const masterVolume = ctx.createGain();
  masterVolume.gain.value = 1;

  eqInput.connect(filters[0]);
  for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
  filters[filters.length - 1].connect(masterVolume);
  masterVolume.connect(ctx.destination);

  return { ctx, eqInput, filters, masterVolume };
}

function levelMultiplier(level) {
  if (level === 'quiet') return 0.55;
  if (level === 'loud') return 1.0;
  return 0.8;
}

function currentOwner() {
  try {
    const u = getStoredUser();
    return u?.id ? `user:${u.id}` : 'anon';
  } catch { return 'anon'; }
}

async function resolveAudioUrl(track) {
  if (!track?.id) return null;
  // Live radio can't be cached — always use the network
  if (track.isLive) return track.audio || track.audioUrl || null;
  try {
    const blob = await getTrackBlob(currentOwner(), track.id);
    if (blob) return URL.createObjectURL(blob);
  } catch {}
  return track.audio || track.audioUrl || null;
}

export function usePlayerAudio() {
  const graphRef       = useRef(null);
  const elARef         = useRef(null);
  const elBRef         = useRef(null);
  const gainARef       = useRef(null);
  const gainBRef       = useRef(null);
  const activeSlotRef  = useRef('A');
  const crossfadingRef = useRef({ active: false, trackId: null });
  const recordedRef    = useRef(null);
  const blobUrlsRef    = useRef(new Set());

  const currentTrack = usePlayerStore(s => s.currentTrack);
  const isPlaying    = usePlayerStore(s => s.isPlaying);
  const volume       = usePlayerStore(s => s.volume);
  const muted        = usePlayerStore(s => s.muted);

  const volumeLevel = useSettingsStore(s => s.volumeLevel);
  const eqPreset    = useSettingsStore(s => s.eqPreset);

  const getActiveEl   = () => (activeSlotRef.current === 'A' ? elARef.current : elBRef.current);
  const getIdleEl     = () => (activeSlotRef.current === 'A' ? elBRef.current : elARef.current);
  const getActiveGain = () => (activeSlotRef.current === 'A' ? gainARef.current : gainBRef.current);
  const getIdleGain   = () => (activeSlotRef.current === 'A' ? gainBRef.current : gainARef.current);

  const targetVolume = () => (muted ? 0 : volume * levelMultiplier(volumeLevel));

  const setGainNow = (gainNode, value) => {
    const graph = graphRef.current;
    if (!gainNode || !graph) return;
    const now = graph.ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(value, now);
  };

  const rampGain = (gainNode, from, to, duration) => {
    const graph = graphRef.current;
    if (!gainNode || !graph) return;
    const now = graph.ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(Math.max(0, from), now);
    gainNode.gain.linearRampToValueAtTime(Math.max(0, to), now + Math.max(0.05, duration));
  };

  const revokeBlobUrls = () => {
    for (const u of blobUrlsRef.current) URL.revokeObjectURL(u);
    blobUrlsRef.current.clear();
  };

  const hardResetElements = () => {
    [elARef.current, elBRef.current].forEach(el => {
      if (!el) return;
      try { el.pause(); el.removeAttribute('src'); el.load(); } catch {}
    });
    setGainNow(gainARef.current, 1);
    setGainNow(gainBRef.current, 0);
    activeSlotRef.current = 'A';
    crossfadingRef.current = { active: false, trackId: null };
    revokeBlobUrls();
  };

  useEffect(() => {
    const graph = createGraph();
    graphRef.current = graph;

    const mk = () => {
      const el = new Audio();
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      return el;
    };
    elARef.current = mk();
    elBRef.current = mk();

    if (graph) {
      try {
        const srcA = graph.ctx.createMediaElementSource(elARef.current);
        const srcB = graph.ctx.createMediaElementSource(elBRef.current);

        const gA = graph.ctx.createGain();
        const gB = graph.ctx.createGain();
        gA.gain.value = 1;
        gB.gain.value = 0;

        srcA.connect(gA); gA.connect(graph.eqInput);
        srcB.connect(gB); gB.connect(graph.eqInput);

        gainARef.current = gA;
        gainBRef.current = gB;
      } catch (err) {
        console.warn('[audio] Web Audio routing failed; using plain element volume', err.message);
        graphRef.current = null;
      }
    }

    return () => {
      [elARef.current, elBRef.current].forEach(el => {
        if (!el) return;
        try { el.pause(); el.removeAttribute('src'); el.load(); } catch {}
      });
      revokeBlobUrls();
      try { graphRef.current?.ctx?.close(); } catch {}
    };
  }, []);

  useEffect(() => {
    const elA = elARef.current;
    const elB = elBRef.current;
    if (!elA || !elB) return;

    const make = (el, slot) => {
      const onTime = () => {
        if (slot !== activeSlotRef.current) return;
        usePlayerStore.getState().setProgress(el.currentTime);
        if (crossfadingRef.current.active) return;

        // Live streams never crossfade
        const track = usePlayerStore.getState().currentTrack;
        if (track?.isLive) return;

        // Skip duration for streams that report Infinity
        if (!isFinite(el.duration) || el.duration <= 0) return;

        const cf = useSettingsStore.getState().crossfadeSeconds;
        if (cf > 0) {
          const remaining = el.duration - el.currentTime;
          if (remaining <= cf && remaining > 0.4) triggerCrossfade(el, cf);
        }
      };
      const onMeta = () => {
        if (slot !== activeSlotRef.current) return;
        const track = usePlayerStore.getState().currentTrack;
        // For live streams, mark duration as Infinity so UI shows LIVE
        const dur = el.duration;
        usePlayerStore.getState().setDuration(
          track?.isLive || !isFinite(dur) ? Infinity : (dur || 0)
        );
      };
      const onEnded = () => {
        if (slot !== activeSlotRef.current) return;
        if (crossfadingRef.current.active) return;
        const { repeatMode, next, currentTrack } = usePlayerStore.getState();
        if (currentTrack?.isLive) return;
        if (repeatMode === 'one') {
          el.currentTime = 0;
          el.play().catch(() => {});
        } else {
          next(true);
        }
      };
      const onErr = () => {
        if (slot !== activeSlotRef.current) return;
        console.warn('[audio] element error (non-fatal)');
      };
      return { onTime, onMeta, onEnded, onErr };
    };

    const hA = make(elA, 'A');
    const hB = make(elB, 'B');

    elA.addEventListener('timeupdate', hA.onTime);
    elA.addEventListener('loadedmetadata', hA.onMeta);
    elA.addEventListener('ended', hA.onEnded);
    elA.addEventListener('error', hA.onErr);

    elB.addEventListener('timeupdate', hB.onTime);
    elB.addEventListener('loadedmetadata', hB.onMeta);
    elB.addEventListener('ended', hB.onEnded);
    elB.addEventListener('error', hB.onErr);

    return () => {
      elA.removeEventListener('timeupdate', hA.onTime);
      elA.removeEventListener('loadedmetadata', hA.onMeta);
      elA.removeEventListener('ended', hA.onEnded);
      elA.removeEventListener('error', hA.onErr);

      elB.removeEventListener('timeupdate', hB.onTime);
      elB.removeEventListener('loadedmetadata', hB.onMeta);
      elB.removeEventListener('ended', hB.onEnded);
      elB.removeEventListener('error', hB.onErr);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const el = getActiveEl();
      if (!el) return;
      try { el.currentTime = e.detail; } catch {}
      usePlayerStore.getState().setProgress(e.detail);
    };
    window.addEventListener('sonara-seek', handler);
    return () => window.removeEventListener('sonara-seek', handler);
  }, []);

  const triggerCrossfade = useCallback((currentEl, cfDuration) => {
    const { queue, queueIndex, repeatMode, currentTrack } = usePlayerStore.getState();
    if (currentTrack?.isLive) return;
    if (!queue.length) return;
    let nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeatMode === 'all') nextIdx = 0;
      else return;
    }
    const nextTrack = queue[nextIdx];
    if (!nextTrack) return;

    crossfadingRef.current = { active: true, trackId: nextTrack.id };

    const idleEl   = getIdleEl();
    const idleGain = getIdleGain();
    const curGain  = getActiveGain();

    setGainNow(idleGain, 0);

    (async () => {
      const url = await resolveAudioUrl(nextTrack);
      if (!url) return;
      try {
        idleEl.src = url;
        idleEl.currentTime = 0;
        idleEl.load();
      } catch {}

      idleEl.play().then(() => {
        rampGain(curGain, 1, 0, cfDuration);
        rampGain(idleGain, 0, 1, cfDuration);

        activeSlotRef.current = activeSlotRef.current === 'A' ? 'B' : 'A';

        const store = usePlayerStore.getState();
        store.setProgress(0);
        store.next(true);

        const applyDuration = () => {
          const dur = idleEl.duration;
          if (dur && isFinite(dur) && dur > 0) {
            usePlayerStore.getState().setDuration(dur);
            return true;
          }
          return false;
        };
        if (!applyDuration()) {
          const onMeta = () => { applyDuration(); idleEl.removeEventListener('loadedmetadata', onMeta); };
          idleEl.addEventListener('loadedmetadata', onMeta, { once: true });
          if (idleEl.readyState >= 1) onMeta();
        }

        setTimeout(() => {
          if (!crossfadingRef.current.active) return;
          try { currentEl.pause(); currentEl.removeAttribute('src'); currentEl.load(); } catch {}
          setGainNow(getIdleGain(), 0);
          crossfadingRef.current = { active: false, trackId: null };
        }, Math.ceil(cfDuration * 1000) + 120);
      }).catch(err => {
        console.warn('[crossfade] play failed', err.message);
        crossfadingRef.current = { active: false, trackId: null };
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentTrack) {
      hardResetElements();
      recordedRef.current = null;
      return;
    }

    if (crossfadingRef.current.active && crossfadingRef.current.trackId === currentTrack.id) {
      return;
    }

    if (crossfadingRef.current.active) {
      crossfadingRef.current = { active: false, trackId: null };
      hardResetElements();
    }

    const el = getActiveEl();
    const g  = getActiveGain();
    if (!el) return;

    const idle = getIdleEl();
    const idleGain = getIdleGain();
    try { idle.pause(); } catch {}
    setGainNow(idleGain, 0);
    setGainNow(g, 1);

    (async () => {
      const url = await resolveAudioUrl(currentTrack);
      if (!url) return;

      if (el.src !== url && !el.src.endsWith(url)) {
        try {
          el.src = url;
          el.load();
          usePlayerStore.getState().setProgress(0);
          // Don't reset duration for live streams — let loadedmetadata decide
          if (!currentTrack.isLive) {
            usePlayerStore.getState().setDuration(0);
          }
        } catch (err) {
          console.warn('[audio] failed to load new src:', err.message);
        }
      }

      if (usePlayerStore.getState().isPlaying) {
        const ctx = graphRef.current?.ctx;
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
        el.play().catch(err => {
          if (err.name !== 'AbortError') console.warn('[audio] play failed:', err.message);
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack) return;

    if (!isPlaying) {
      [elARef.current, elBRef.current].forEach(el => { if (el) el.pause(); });
      if (crossfadingRef.current.active) {
        crossfadingRef.current = { active: false, trackId: null };
        setGainNow(getActiveGain(), 1);
        setGainNow(getIdleGain(), 0);
      }
      return;
    }

    const el = getActiveEl();
    if (!el) return;
    const ctx = graphRef.current?.ctx;
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    const p = el.play();
    if (p && p.catch) {
      p.catch(err => {
        if (err.name !== 'AbortError') console.warn('[audio play blocked]', err.message);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const vol = targetVolume();
    const graph = graphRef.current;
    if (graph) {
      const now = graph.ctx.currentTime;
      graph.masterVolume.gain.cancelScheduledValues(now);
      graph.masterVolume.gain.setValueAtTime(vol, now);
      [elARef.current, elBRef.current].forEach(el => { if (el) el.volume = vol; });
    } else {
      [elARef.current, elBRef.current].forEach(el => { if (el) el.volume = vol; });
    }
  }, [volume, muted, volumeLevel]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const preset = EQ_PRESETS[eqPreset] || EQ_PRESETS.off;
    graph.filters.forEach((f, i) => {
      const g = preset.bands[i] ?? 0;
      const now = graph.ctx.currentTime;
      f.gain.cancelScheduledValues(now);
      f.gain.linearRampToValueAtTime(g, now + 0.08);
    });
  }, [eqPreset]);

  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack.isLive) return; // don't record radio in history
    if (recordedRef.current === currentTrack.id) return;
    if (usePlayerStore.getState().progress < 3) return;
    recordedRef.current = currentTrack.id;
    recordPlay(currentTrack).catch(err => console.warn('[history]', err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack, isPlaying]);

  const seek = useCallback((t) => {
    const el = getActiveEl();
    if (!el) return;
    if (usePlayerStore.getState().currentTrack?.isLive) return;
    try { el.currentTime = t; } catch {}
    usePlayerStore.getState().setProgress(t);
  }, []);

  return { seek };
}