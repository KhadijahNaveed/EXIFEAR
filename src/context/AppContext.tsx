// Covers R8.6, R8.7 — application-wide state via useReducer + React context

import React, { createContext, useContext, useReducer } from 'react';
import type {
  Action,
  AppState,
  AiFingerprintResult,
  ExtractedMetadata,
  GpsCluster,
  Photo,
  StoryResult,
} from '../types/index';

// ── Initial state ─────────────────────────────────────────────────────────────

const initialState: AppState = {
  photos: [],
  clusters: [],
  story: null,
  aiFingerprintResults: {},
  isSampleSession: false,
  osmNoticeAcknowledged: false,
  isMuted: true,
};

// ── Reducer ───────────────────────────────────────────────────────────────────

function updatePhoto(
  photos: Photo[],
  photoId: string,
  patch: Partial<Photo>,
): Photo[] {
  return photos.map((p) => (p.id === photoId ? { ...p, ...patch } : p));
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'PHOTOS_LOADED': {
      const isSampleSession = action.photos.some((p) => p.source === 'sample');
      return {
        ...state,
        photos: action.photos,
        isSampleSession,
        clusters: [],
        story: null,
        aiFingerprintResults: {},
      };
    }

    case 'EXTRACTION_DONE': {
      const metadata: ExtractedMetadata = action.metadata;
      return {
        ...state,
        photos: updatePhoto(state.photos, action.photoId, { metadata }),
      };
    }

    case 'EXTRACTION_ERROR':
      return {
        ...state,
        photos: updatePhoto(state.photos, action.photoId, {
          extractionError: action.error,
        }),
      };

    case 'CLUSTERS_COMPUTED': {
      const clusters: GpsCluster[] = action.clusters;
      return { ...state, clusters };
    }

    case 'STORY_GENERATED': {
      const story: StoryResult = action.story;
      return { ...state, story };
    }

    case 'AI_FINGERPRINT_DONE': {
      const result: AiFingerprintResult = action.result;
      return {
        ...state,
        aiFingerprintResults: {
          ...state.aiFingerprintResults,
          [action.photoId]: result,
        },
      };
    }

    case 'CLEAN_START':
      return {
        ...state,
        photos: updatePhoto(state.photos, action.photoId, {
          cleanStatus: 'pending',
        }),
      };

    case 'CLEAN_DONE':
      return {
        ...state,
        photos: updatePhoto(state.photos, action.photoId, {
          cleanStatus: 'done',
          cleanObjectUrl: action.objectUrl,
        }),
      };

    case 'CLEAN_ERROR':
      return {
        ...state,
        photos: updatePhoto(state.photos, action.photoId, {
          cleanStatus: 'error',
          cleanError: action.error,
        }),
      };

    case 'OSM_NOTICE_ACK':
      return { ...state, osmNoticeAcknowledged: true };

    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };

    case 'RESET':
      return initialState;

    case 'SET_ERROR':
      // Error is handled via UI dispatch convention; state unchanged.
      return state;

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (ctx === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}
