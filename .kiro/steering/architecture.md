# Architecture and Coding Standards

## Project Stack
- React 18 with functional components and hooks only — no class components.
- Vite as the build tool; TypeScript strict mode (`"strict": true` in tsconfig).
- All shared types live in `src/types/index.ts`. Never duplicate type definitions.
- State is managed exclusively via `useReducer` + React context (`AppContext`). No external state library.
- Side effects (file reading, EXIF extraction, Canvas operations) run inside custom hooks that dispatch into the reducer. Components are display-only.

## Module Boundaries
Nine modules own distinct concerns and must not cross-import each other directly:

| Module | Location | Rule |
|---|---|---|
| `extractor` | `src/modules/extractor.ts` | Only dependency is `exifr`. Never calls fetch or Canvas. |
| `inferenceEngine` | `src/modules/inferenceEngine.ts` | Pure functions only. No I/O, no React imports. |
| `storyEngine` | `src/modules/storyEngine.ts` | Pure functions only. No I/O, no React imports. |
| `cleaner` | `src/modules/cleaner.ts` | Only uses Canvas API. Never calls fetch or exifr. |
| `c2paInspector` | `src/modules/c2paInspector.ts` | Reads from exifr XMP output. No network calls. |
| `soundSystem` | `src/modules/soundSystem.ts` | Wraps Web Audio API. No React imports. |
| `sampleLoader` | `src/modules/sampleLoader.ts` | Uses Vite static asset imports. No exifr calls. |
| `heicChecker` | `src/modules/heicChecker.ts` | Uses `createImageBitmap` probe only. |
| `mapLayer` | `src/components/map/` | React-Leaflet components only. No metadata logic. |

## File and Folder Structure
```
src/
  types/index.ts          # All shared TypeScript interfaces
  context/
    AppContext.tsx
    SoundContext.tsx
    ReducedMotionContext.tsx
  modules/                # Pure business logic, no React
  components/
    layout/               # BottomNav, SideNav, FlashlightOverlay, MuteToggle
    screens/              # One file per screen
    map/                  # MapView, PhotoMarker, MarkerDetailPanel
    ghost/                # GhostCharacter, StoryReveal
    particles/            # ParticleCanvas
    ui/                   # Shared presentational components
  hooks/                  # Custom React hooks (useExtractor, useCleaner, etc.)
  styles/                 # theme.css, global.css, reduced-motion.css
  assets/samples/         # 10 bundled sample JPEG files
```

## Coding Rules
1. No `any` types. Use `unknown` with a type guard if the shape is uncertain.
2. Every async function must handle its rejection path explicitly — no unhandled promise rejections.
3. Never use `console.error` in production paths. Use the error action in the reducer instead.
4. Import order: React → third-party → internal modules → styles.
5. Component files export one default component. Utility exports use named exports.
6. Magic numbers belong in `src/types/constants.ts` (e.g., `MAX_PHOTOS = 50`, `CLUSTER_RADIUS_M = 500`, `SPOTLIGHT_RADIUS_PX = 150`).
