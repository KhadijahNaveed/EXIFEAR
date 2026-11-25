// Covers R8.6 — Web Audio API sound system with lazy AudioContext initialisation

import React, { createContext, useContext, useRef } from 'react';

export type SoundName = 'entry_load' | 'gps_hover' | 'analysis_done';

const SOUND_PATHS: Record<SoundName, string> = {
  entry_load: '/assets/sounds/entry-creak.mp3',
  gps_hover: '/assets/sounds/ghost-whisper.mp3',
  analysis_done: '/assets/sounds/thunder-rumble.mp3',
};

// ── Context value shape ───────────────────────────────────────────────────────

interface SoundContextValue {
  playSound: (name: SoundName) => void;
  initAudio: () => Promise<void>;
}

const SoundContext = createContext<SoundContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

interface SoundProviderProps {
  children: React.ReactNode;
}

export function SoundProvider({ children }: SoundProviderProps): React.ReactElement {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const bufferCacheRef = useRef<Map<SoundName, AudioBuffer>>(new Map());
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const initAudio = async (): Promise<void> => {
    // Return the existing promise if initialisation is already in flight.
    if (initPromiseRef.current !== null) {
      return initPromiseRef.current;
    }
    // Already initialised.
    if (audioCtxRef.current !== null) {
      return;
    }

    initPromiseRef.current = (async () => {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const masterGain = ctx.createGain();
        // Default muted — isMuted lives in AppState; consumers set gain to 0 or 1.
        masterGain.gain.value = 0.0;
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;

        // Pre-fetch and decode all audio assets; failures are swallowed silently.
        const entries = Object.entries(SOUND_PATHS) as Array<[SoundName, string]>;
        await Promise.all(
          entries.map(async ([name, path]) => {
            try {
              const response = await fetch(path);
              const arrayBuffer = await response.arrayBuffer();
              const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
              bufferCacheRef.current.set(name, audioBuffer);
            } catch {
              // Silently swallow — sound simply won't play if asset is missing.
            }
          }),
        );
      } catch {
        // AudioContext creation failed (e.g. policy block); swallow silently.
      }
    })();

    return initPromiseRef.current;
  };

  const playSound = (name: SoundName): void => {
    const ctx = audioCtxRef.current;
    const masterGain = masterGainRef.current;
    if (ctx === null || masterGain === null) {
      // AudioContext not yet initialised; do nothing.
      return;
    }

    const buffer = bufferCacheRef.current.get(name);
    if (buffer === undefined) {
      return;
    }

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(masterGain);
      source.start();
    } catch {
      // Silently swallow playback errors.
    }
  };

  return (
    <SoundContext.Provider value={{ playSound, initAudio }}>
      {children}
    </SoundContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSoundContext(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (ctx === undefined) {
    throw new Error('useSoundContext must be used within SoundProvider');
  }
  return ctx;
}
