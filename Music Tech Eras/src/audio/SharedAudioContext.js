/**
 * SharedAudioContext.js
 * Singleton Web Audio manager, AudioWorklet loader, and global stop/mute coordinator
 * so switching between any of the 20 DSP modules never leaves orphan audio playing.
 */

let sharedCtx = null;
let workletsPromise = null;
const loadedWorklets = new Set();
const activeStopCallbacks = new Set();
const audioStateListeners = new Set();
let activePlayingCount = 0;

const WORKLET_MODULES = [
  { name: 'pultec-eq-processor', path: 'worklets/PultecWorklet.js' },
  { name: 'vari-mu-processor', path: 'worklets/VariMuWorklet.js' },
  { name: 'tape-machine-processor', path: 'worklets/TapeWorklet.js' },
  { name: 'plate-reverb-processor', path: 'worklets/PlateReverbWorklet.js' }
];

export function getSharedAudioContext() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    sharedCtx = new AudioCtx({ latencyHint: 'interactive' });
    workletsPromise = null;
    loadedWorklets.clear();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

export async function ensureAudioWorklets() {
  const ctx = getSharedAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (_) {}
  }

  if (!workletsPromise) {
    const baseUrl = import.meta.env.BASE_URL || '/';
    workletsPromise = Promise.all(
      WORKLET_MODULES.map(async (w) => {
        if (loadedWorklets.has(w.name)) return;
        try {
          await ctx.audioWorklet.addModule(`${baseUrl}${w.path}`);
          loadedWorklets.add(w.name);
        } catch (err) {
          console.warn(`[AudioWorklet] Failed to load ${w.name}:`, err);
        }
      })
    );
  }

  await workletsPromise;
  return ctx;
}

export function isWorkletReady(processorName) {
  return loadedWorklets.has(processorName);
}

/**
 * Registers a module's stop callback so global "Silence All" or Era/Module navigation
 * cleanly halts all oscillators, stems, and timers.
 */
export function registerStopCallback(fn) {
  activeStopCallbacks.add(fn);
  return () => {
    activeStopCallbacks.delete(fn);
  };
}

export function stopAllAudio() {
  activeStopCallbacks.forEach((fn) => {
    try {
      fn();
    } catch (_) {}
  });
  activePlayingCount = 0;
  notifyAudioListeners();
}

export function notifyPlayingChange(isPlaying) {
  if (isPlaying) {
    activePlayingCount += 1;
  } else {
    activePlayingCount = Math.max(0, activePlayingCount - 1);
  }
  notifyAudioListeners();
}

function notifyAudioListeners() {
  const anyPlaying = activePlayingCount > 0;
  audioStateListeners.forEach((cb) => {
    try {
      cb(anyPlaying);
    } catch (_) {}
  });
}

export function subscribeAudioStatus(cb) {
  audioStateListeners.add(cb);
  cb(activePlayingCount > 0);
  return () => {
    audioStateListeners.delete(cb);
  };
}
