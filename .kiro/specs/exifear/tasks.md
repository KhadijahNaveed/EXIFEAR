# Implementation Plan: Exifear

## Overview

Build Exifear as a browser-only single-page application using React 18, Vite, and TypeScript. Processing runs entirely in-browser; no photo data ever leaves the device. The plan follows eight development phases: foundation scaffolding, visual shell, metadata engine, ghost intelligence, map and details, metadata cleaning, prevention guide, optional C2PA features, and QA/build verification. Property-based tests (fast-check) are co-located with the implementation tasks they validate.

---

## Tasks

### Phase 0 — Foundation

- [ ] 0. Set up project scaffold and Kiro automation
  - [ ] 0.1 Initialise Vite + React + TypeScript project and install dependencies
    - Run `npm create vite@latest . -- --template react-ts` in the workspace root
    - Install runtime dependencies: `exifr`, `react-leaflet`, `leaflet`, `leaflet.markercluster`, `fast-check` (dev), `vitest` (dev), `@testing-library/react` (dev), `@playwright/test` (dev)
    - Add `"test": "vitest --run"` and `"build": "vite build"` scripts to `package.json`
    - Verify `vite build` exits with code 0 on a clean scaffold before any feature code is added
    - _Requirements: R14.5_

  - [ ] 0.2 Create Kiro steering files
    - Create `.kiro/steering/architecture.md` covering module boundaries, no-server-call rule, `useReducer`-based state management, and file/folder structure from the design
    - Create `.kiro/steering/visual-identity.md` covering the dark atmospheric palette, horror typography, fog/flashlight effects, and animation specifications
    - Create `.kiro/steering/privacy-security.md` covering the local-only processing rule, no-transmission invariant, OSM tile disclosure requirement, and Canvas cleaning caveat
    - Create `.kiro/steering/testing-workflow.md` covering Vitest unit test conventions, fast-check property test file naming (`*.property.test.ts`), Playwright integration test conventions, and Git commit/branch rules
    - Each file must contain at least one specific rule statement for its topic
    - _Requirements: R14.2_

  - [ ] 0.3 Create Kiro agent hook for TypeScript file saves
    - Create a `.kiro/hooks/` hook configuration that fires when a `.ts` or `.tsx` file is saved
    - The hook must run `tsc --noEmit` (or equivalent) and emit a result to stdout indicating either "✓ no type errors" or the count and location of violations found
    - _Requirements: R14.3_

- [ ] 1. Checkpoint — verify scaffold
  - Ensure `npm run build` exits 0 and `npm test` runs without error. Ask the user if any setup questions arise.

---

### Phase 1 — Visual Foundation

- [ ] 2. Implement app shell, design tokens, and global styles
  - [ ] 2.1 Define CSS design tokens and global stylesheet
    - Create `src/styles/theme.css` with CSS custom properties: deep-black background (`#0a0a0a`), dark-green accent, desaturated-purple secondary, border-radius scale, and typography scale
    - Create `src/styles/global.css` importing `theme.css` and applying base resets
    - Create `src/styles/reduced-motion.css` with a `@media (prefers-reduced-motion: reduce)` block that disables particle animations and all CSS transitions/animations with displacement > 2 px
    - _Requirements: R8.1, R8.8_

  - [ ] 2.2 Implement `AppContext` and `SoundContext` providers
    - Create `src/types/index.ts` with all shared TypeScript types from the design (`Photo`, `ExtractedMetadata`, `GpsData`, `GpsCluster`, `StoryTemplate`, `StoryResult`, `AiFingerprintResult`, `AppState`, `Action`)
    - Create `src/context/AppContext.tsx` with `useReducer`-based state, all 13 action types, and a typed `useAppContext` hook
    - Create `src/context/SoundContext.tsx` with lazy `AudioContext` creation, master `GainNode` mute control, and named trigger dispatch (`entry_load`, `gps_hover`, `analysis_done`)
    - Create `src/context/ReducedMotionContext.tsx` reading `prefers-reduced-motion` via `window.matchMedia`
    - _Requirements: R8.6, R8.7_

  - [ ] 2.3 Implement responsive navigation shell
    - Create `src/components/layout/BottomNav.tsx` rendered only when viewport width < 768 px; include links to Ghost Speaks, Map, Photo Grid, Blind Ghost, and Prevention Guide screens
    - Create `src/components/layout/SideNav.tsx` for viewport width ≥ 768 px with the same links
    - Create `src/components/layout/MuteToggle.tsx` as a 44 × 44 px minimum button visible on every screen, dispatching `TOGGLE_MUTE`
    - Wire all navigation into `src/App.tsx` with a `<Router>` and all screen routes
    - _Requirements: R8.7, R13.3, R13.4_

  - [ ] 2.4 Implement entry screen with privacy banner and fog particle effect
    - Create `src/components/screens/EntryScreen.tsx` containing `<PrivacyBanner />`, `<FileDropZone />`, `<SamplePhotosButton />`, and `<ParticleCanvas />`
    - Create `src/components/ui/PrivacyBanner.tsx` displaying the required privacy assurance statement (photos processed locally; no data uploaded)
    - Create `src/components/particles/ParticleCanvas.tsx` using `requestAnimationFrame` to draw translucent fog ellipses drifting upward; disable the loop entirely when `Reduced_Motion` is active
    - _Requirements: R1.3, R8.1, R8.2, R8.8_

  - [ ] 2.5 Implement flashlight cursor overlay
    - Create `src/components/layout/FlashlightOverlay.tsx` as a fixed `<div>` covering the viewport at z-index 999, only mounted when viewport width ≥ 1024 px
    - Update the overlay's `radial-gradient` mask via CSS custom properties `--cursor-x` / `--cursor-y` on `mousemove`, producing a 150 px illuminated radius effect
    - Disable the overlay when `Reduced_Motion` is active (displacement > 2 px)
    - _Requirements: R8.3, R8.8_

- [ ] 3. Checkpoint — visual shell
  - Confirm entry screen renders with fog, flashlight activates at ≥ 1024 px, bottom nav appears at < 768 px, mute toggle is visible, and reduced-motion disables animations. Ask the user if any design questions arise.

---

### Phase 2 — Metadata Engine

- [ ] 4. Implement file upload, validation, and EXIF extraction
  - [ ] 4.1 Implement file validation logic (pure module)
    - Create `src/modules/fileValidator.ts` exporting a `validateFiles(files: File[]): { accepted: File[]; warnings: string[] }` function
    - Reject files with unsupported format (not JPEG, PNG, or WebP by MIME type and extension); include the file name in the warning
    - Reject files exceeding 20 MB; include the file name in the warning
    - Cap accepted count at 50; emit a warning when the input exceeds 50 files; return only the first 50
    - Return accepted count in [0, 50] and warnings for all rejected files
    - _Requirements: R2.1, R2.3, R2.4, R2.5_

  - [ ]* 4.2 Write property tests for file validation
    - **Property 1: File validation rejects out-of-range selection counts**
    - **Validates: Requirements R2.1, R2.5**
    - **Property 2: Invalid file formats are rejected with a per-file warning**
    - **Validates: Requirements R2.3**
    - **Property 3: Oversized files are rejected with a per-file warning**
    - **Validates: Requirements R2.4**
    - Co-locate in `src/modules/fileValidator.property.test.ts`

  - [ ] 4.3 Implement `FileDropZone` component
    - Create `src/components/photo/FileDropZone.tsx` supporting drag-and-drop and click-to-browse file input
    - Pass selected files through `validateFiles`; dispatch per-file warning toasts for rejected files
    - On successful validation, dispatch `PHOTOS_LOADED` and navigate to `GhostSpeaksScreen`
    - _Requirements: R2.1, R2.2, R2.3, R2.4, R2.5, R2.6_

  - [ ] 4.4 Implement EXIF extractor module
    - Create `src/modules/extractor.ts` calling `exifr.parse` with the `PARSE_OPTIONS` allowlist from the design (`gps: true`, `tiff: true`, `xmp: true`, `icc: false`, `iptc: false`, `jfif: false`, `translateKeys: true`, `translateValues: true`, `reviveValues: true`, `sanitize: true`, `mergeOutput: false`)
    - Normalise raw output to `ExtractedMetadata`: map `latitude`/`longitude` to `GpsData`, map `DateTimeOriginal` to a JS `Date`, map `GPSImgDirection` to `gpsBearing`
    - Set any absent field to `undefined` — never fabricate a value
    - On `exifr.parse` throw, log a non-fatal console warning and set `extractionError`; do not throw
    - Extraction must complete within 2 000 ms for a single ≤ 10 MB photo
    - _Requirements: R4.1, R4.2, R4.6, R4.7_

  - [ ]* 4.5 Write property tests for extractor normalisation
    - **Property 5: Extractor normalisation preserves absent fields**
    - **Validates: Requirements R4.1, R4.2**
    - Co-locate in `src/modules/extractor.property.test.ts`

  - [ ] 4.6 Implement `useExtraction` custom hook
    - Create `src/hooks/useExtraction.ts` that fires `exifr.parse` for each photo in `AppState.photos` with `extractionError` not yet set and `metadata === null`
    - Dispatch `EXTRACTION_DONE` on success or `EXTRACTION_ERROR` on failure for each photo
    - _Requirements: R4.1, R4.7_

  - [ ] 4.7 Implement HEIC format checker
    - Create `src/modules/heicChecker.ts` checking file extension (case-insensitive `.heic` / `.heif`)
    - If the extension matches, run `Promise.race([createImageBitmap(file), timeout(5000)])` to probe codec support
    - Return `HeicSupport`: `'supported'`, `'unsupported'`, or `'timeout'` (treat timeout as unsupported)
    - _Requirements: R11.1, R11.2, R11.3, R11.4_

  - [ ] 4.8 Integrate HEIC checker into upload pipeline
    - In `FileDropZone` (or `useExtraction`), call `heicChecker` before passing a HEIC file to the extractor
    - Display per-file error message per R11.3 when HEIC is unsupported or timed out
    - When HEIC is supported, process via the same extraction pipeline as JPEG
    - _Requirements: R11.2, R11.3, R11.4_

  - [ ] 4.9 Implement sample photos loader
    - Add ten synthetic JPEG files to `src/assets/samples/` (sample_01.jpg … sample_10.jpg), each containing valid synthetic EXIF: GPS lat in [−90, 90], GPS lng in [−180, 180], ISO 8601 timestamp in [2000-01-01, today], non-empty camera make, non-empty camera model, bearing in [0, 359]
    - Create `src/modules/sampleLoader.ts` that `fetch`es each bundled asset, constructs a `File` and `Photo` object for each, and sets `source: 'sample'`
    - On load failure, throw an error so `EntryScreen` can display the "sample data unavailable" message
    - _Requirements: R3.1, R3.2, R3.3, R3.5_

  - [ ]* 4.10 Write property tests for sample photo EXIF validity
    - **Property 4: Sample photos contain valid synthetic EXIF data**
    - **Validates: Requirements R3.5**
    - Co-locate in `src/modules/sampleLoader.property.test.ts`

  - [ ] 4.11 Implement `SamplePhotosButton` and "Demo Data" indicator
    - Create `src/components/screens/EntryScreen.tsx` wiring for the "Try Sample Photos" button (shown only when no photos are loaded)
    - On click, call `sampleLoader`; dispatch `PHOTOS_LOADED` with `isSampleSession: true`; on failure, display error message
    - In `MetadataTable` and inference display, render a "Demo Data" badge alongside every value when `isSampleSession` is true
    - _Requirements: R3.1, R3.2, R3.3, R3.4, R3.6_

  - [ ] 4.12 Implement `MetadataTable` component with absent-field indicators
    - Create `src/components/photo/MetadataTable.tsx` rendering a row for each field (GPS, timestamp, camera make, camera model, bearing, AI fingerprint)
    - When a field value is `undefined`, render a "not found" indicator text; never render `undefined` or leave the cell empty
    - _Requirements: R4.3, R4.4, R4.5_

  - [ ]* 4.13 Write property tests for MetadataTable absent-field rendering
    - **Property 6: MetadataTable renders "not found" for every absent field**
    - **Validates: Requirements R4.3**
    - Co-locate in `src/components/photo/MetadataTable.property.test.ts`

- [ ] 5. Checkpoint — metadata engine
  - Confirm multi-file upload works, per-file warnings fire correctly, extraction runs and stores metadata, sample photos load with Demo Data badges, and MetadataTable shows "not found" for missing fields. Ask the user if any questions arise.

---

### Phase 3 — Ghost Intelligence

- [ ] 6. Implement inference engine
  - [ ] 6.1 Implement Haversine distance utility and GPS clustering
    - Create `src/modules/inferenceEngine.ts` exporting `haversineMetres(a: GpsData, b: GpsData): number` and `cluster(photos: Photo[]): GpsCluster[]`
    - Implement the single-pass greedy centroid clustering algorithm from the design: iterate photos with GPS, assign to first cluster whose centroid is within 500 m (Haversine), recompute centroid on each addition, create new cluster otherwise
    - Discard clusters with fewer than 3 photos
    - Assign time-window labels: evening (local hour in {20–23, 0–7}) if > 50 % qualify; weekday (local hour 8–17, Mon–Fri) if > 50 % qualify; prefix every label with "Inference: "
    - Never use unqualified declarative phrases ("this is your home", "you live here", etc.)
    - Return empty array when fewer than 3 photos have GPS data
    - _Requirements: R6.1, R6.2, R6.3, R6.4, R6.5, R6.6_

  - [ ]* 6.2 Write property tests for GPS clustering
    - **Property 7: GPS clustering enforces the 3-photo minimum and 500 m radius**
    - **Validates: Requirements R6.1, R6.6**
    - Co-locate in `src/modules/inferenceEngine.property.test.ts`

  - [ ]* 6.3 Write property tests for time-window labelling
    - **Property 8: Evening time-window labelling is applied iff majority timestamps qualify**
    - **Property 9: Weekday time-window labelling is applied iff majority timestamps qualify**
    - **Validates: Requirements R6.2, R6.3**
    - Co-locate in `src/modules/inferenceEngine.property.test.ts`

  - [ ]* 6.4 Write property tests for inference label language
    - **Property 10: All inference labels use qualified language and bear the required prefix**
    - **Validates: Requirements R6.4, R6.5**
    - Co-locate in `src/modules/inferenceEngine.property.test.ts`

  - [ ] 6.5 Implement `useInference` hook
    - Create `src/hooks/useInference.ts` that fires after all extractions complete, calls `inferenceEngine.cluster`, and dispatches `CLUSTERS_COMPUTED`
    - _Requirements: R6.1, R6.6_

- [ ] 7. Implement story engine and ghost narration
  - [ ] 7.1 Define story templates (≥ 8) and implement template selection
    - Create `src/modules/storyEngine.ts` with an exported `TEMPLATES: StoryTemplate[]` array of at least 8 templates
    - Include at least one template for each required condition: `gps_present`, `gps_absent`, `timestamps_present`, `camera_model_present`, `multiple_locations`, `no_metadata` (the remaining two templates may target any condition combination)
    - Implement `selectTemplate(photos: Photo[], clusters: GpsCluster[]): StoryTemplate`: build `ConditionSet`, score each template (count of matching conditions; disqualify templates with any unmet condition), select highest score, break ties by lexicographic `id` order
    - _Requirements: R7.1, R7.3, R7.4_

  - [ ]* 7.2 Write property tests for story template selection
    - **Property 11: Story template selection always picks the highest-scoring match**
    - **Validates: Requirements R7.1**
    - Co-locate in `src/modules/storyEngine.property.test.ts`

  - [ ] 7.3 Implement placeholder substitution
    - Implement `substitute(template: StoryTemplate, photos: Photo[], clusters: GpsCluster[]): StoryResult` in `storyEngine.ts`
    - Replace `{{location}}`, `{{date}}`, `{{camera}}`, `{{inference}}` with real extracted values or designated fallback phrases ("an unknown place", "an unrecorded time", "an unknown device", "patterns in your movement")
    - After substitution, assert that no substring matching `\{\{[^}]+\}\}` remains
    - _Requirements: R7.2_

  - [ ]* 7.4 Write property tests for placeholder substitution
    - **Property 12: Story substitution leaves no visible placeholders and fills absences with fallbacks**
    - **Validates: Requirements R7.2**
    - Co-locate in `src/modules/storyEngine.property.test.ts`

  - [ ] 7.5 Implement `useStory` hook
    - Create `src/hooks/useStory.ts` that fires after `CLUSTERS_COMPUTED`, calls `selectTemplate` then `substitute`, and dispatches `STORY_GENERATED`
    - _Requirements: R7.1, R7.2_

  - [ ] 7.6 Implement `GhostCharacter` SVG component and `GhostSpeaksScreen`
    - Create `src/components/ghost/GhostCharacter.tsx` as an animated SVG ghost with a walk cycle; the cycle plays while story text is being revealed and idles (paused) within 1 second of the reveal completing; closes eyes on `cleanStatus === 'done'`
    - Create `src/components/screens/GhostSpeaksScreen.tsx` with `<GhostCharacter />` and `<StoryReveal />` (typewriter text reveal at ~40 chars/s)
    - Respect `Reduced_Motion`: disable displacement animations > 2 px
    - _Requirements: R7.5, R8.8, R9.4_

  - [ ] 7.7 Implement photo grid with glowing-eye indicators
    - Create `src/components/photo/PhotoThumbnail.tsx`: render a red glowing-eye indicator when the photo has GPS data; render an eye indicator at 30 % opacity when it lacks GPS data
    - Create `src/components/screens/PhotoGridScreen.tsx` listing all loaded photo thumbnails
    - Trigger the `gps_hover` sound effect on GPS indicator hover
    - _Requirements: R8.4, R8.5, R8.6_

- [ ] 8. Checkpoint — ghost intelligence
  - Confirm story engine selects the correct template, all placeholders are substituted, ghost animates during reveal and idles after, inference labels appear on the detail view, eye indicators display correctly on the grid, and all property tests pass. Ask the user if any questions arise.

---

### Phase 4 — Map and Details

- [ ] 9. Implement interactive map and photo detail view
  - [ ] 9.1 Implement OSM notice modal
    - Create `src/components/ui/OsmNoticeModal.tsx` informing the user that tile images are fetched from OpenStreetMap and that their approximate location may be inferred from those requests
    - Show the modal once, the first time the user navigates to the Map screen, before any tile request is issued
    - Dispatch `OSM_NOTICE_ACK` on dismissal; defer `MapView` mounting until acknowledged
    - _Requirements: R1.4_

  - [ ] 9.2 Implement `MapView` with clustering
    - Create `src/components/map/MapView.tsx` using `react-leaflet` `MapContainer` with `TileLayer` (OpenStreetMap tiles, attribution present)
    - Wrap markers in `MarkerClusterGroup` from `leaflet.markercluster`; a clustered marker displays the count of overlapping photos when two or more share identical GPS coordinates
    - Support pan and zoom levels 0–19
    - If all photos lack GPS data, render no map and display the "no location data found" informational message instead
    - _Requirements: R5.1, R5.2, R5.4, R5.5, R5.6_

  - [ ] 9.3 Implement `PhotoMarker` and `MarkerDetailPanel`
    - Create `src/components/map/PhotoMarker.tsx` placing one marker per GPS-tagged photo
    - Create `src/components/map/MarkerDetailPanel.tsx` opening on marker click, showing: photo preview, GPS coordinates, timestamp, camera make and model, resolved place name or inference; replace existing open panel content with newly selected photo's data
    - _Requirements: R5.3_

  - [ ] 9.4 Implement `PhotoDetailScreen`
    - Create `src/components/screens/PhotoDetailScreen.tsx` displaying `<MetadataTable />`, `<AiFingerprintBadge />` (placeholder for Phase 7), and `<InferenceList />` (shows "Inference: …" labels for the photo's cluster, or nothing when fewer than 3 GPS photos exist)
    - _Requirements: R4.4, R4.5, R6.6_

  - [ ] 9.5 Wire map trigger sound
    - In `PhotoGridScreen` or via `AppContext`, trigger the `analysis_done` sound once after all extractions complete
    - _Requirements: R8.6_

- [ ] 10. Checkpoint — map and details
  - Confirm OSM notice fires before first tile load, map renders all GPS-tagged photos with correct clustering, detail panel opens on marker click, non-GPS photos show "No location data", and inference labels appear only when ≥ 3 GPS photos cluster. Ask the user if any questions arise.

---

### Phase 5 — Blind the Ghost

- [ ] 11. Implement Canvas metadata cleaning pipeline
  - [ ] 11.1 Implement `cleaner` module
    - Create `src/modules/cleaner.ts` implementing the five-step pipeline from the design: `createImageBitmap` → `OffscreenCanvas` → `drawImage` → `convertToBlob` (JPEG 0.92 for JPEG sources, PNG for PNG sources) → `URL.createObjectURL`
    - Generate download filename as `<basename>-clean.<ext>` (lowercase extension); filenames without extension produce `<name>-clean` with no trailing dot
    - Dispatch `CLEAN_DONE` with `objectUrl` on success; dispatch `CLEAN_ERROR` with error message on any step failure
    - _Requirements: R9.1, R9.3_

  - [ ]* 11.2 Write property tests for Canvas clean pipeline
    - **Property 13: Canvas clean pipeline strips metadata (round-trip property)**
    - **Validates: Requirements R9.1**
    - Co-locate in `src/modules/cleaner.property.test.ts`

  - [ ]* 11.3 Write property tests for clean filename generation
    - **Property 14: Clean filename follows the [original-filename]-clean.[ext] convention**
    - **Validates: Requirements R9.3**
    - Co-locate in `src/modules/cleaner.property.test.ts`

  - [ ] 11.4 Implement `useCleaner` hook
    - Create `src/hooks/useCleaner.ts` with `cleanPhoto(id: string)` and `cleanAll()` functions
    - Dispatch `CLEAN_START` before each clean operation and `CLEAN_DONE` / `CLEAN_ERROR` on completion
    - _Requirements: R9.2, R9.6_

  - [ ] 11.5 Implement `BlindGhostScreen` with individual and bulk clean UI
    - Create `src/components/photo/CleanPhotoCard.tsx` per-photo card showing: in-progress indicator while `cleanStatus === 'pending'`, download link when `cleanStatus === 'done'`, error message when `cleanStatus === 'error'`; never label a photo clean until the encode-and-download step completes
    - Create `src/components/screens/BlindGhostScreen.tsx` with `<BulkCleanButton />` triggering `cleanAll()`, listing all `<CleanPhotoCard />`s, and displaying per-photo error indicators when bulk clean partially fails
    - Display the Canvas-cleaning caveat warning (non-standard / steganographic data may remain)
    - _Requirements: R9.2, R9.5, R9.6, R9.7, R9.8, R9.9_

  - [ ] 11.6 Wire ghost eye-closing animation on successful clean
    - In `GhostCharacter`, watch for any `photo.cleanStatus === 'done'` transition in `AppState` and play the eye-closing animation
    - _Requirements: R9.4_

- [ ] 12. Checkpoint — Blind the Ghost
  - Confirm individual clean downloads a metadata-free JPEG/PNG with correct filename, bulk clean handles partial failure correctly, in-progress indicators show during processing, ghost closes eyes on clean, and Canvas caveat warning is visible. Ask the user if any questions arise.

---

### Phase 6 — Prevention Guide

- [ ] 13. Implement Prevention Guide screen
  - [ ] 13.1 Implement `PlatformTabs` with Android and iPhone steps
    - Create `src/components/ui/PlatformTabs.tsx` with an Android tab (default) and an iPhone tab
    - Create `src/components/screens/PreventionGuideScreen.tsx` using `PlatformTabs`
    - Each tab must contain: numbered plain-language steps (≤ 100 chars each) for disabling GPS location tagging in the platform's default camera app; numbered steps for navigating to app permission settings and revoking the camera app's location permission
    - Android tab must be shown by default when the screen is opened
    - _Requirements: R10.1, R10.2, R10.3, R10.4_

  - [ ] 13.2 Verify no device permission requests are made
    - Audit all code paths to confirm the app never calls `navigator.geolocation`, `navigator.mediaDevices`, or any permission API during app use
    - _Requirements: R10.5_

  - [ ] 13.3 Ensure Prevention Guide is reachable within 2 taps from any screen
    - Confirm `BottomNav` and `SideNav` both include a direct link to `PreventionGuideScreen`
    - _Requirements: R10.1_

- [ ] 14. Checkpoint — Prevention Guide
  - Confirm Android tab is default, all steps are present and within character limit, no location/camera permissions are requested, and the guide is reachable in ≤ 2 taps. Ask the user if any questions arise.

---

### Phase 7 — Optional Features

- [ ] 15. Implement C2PA / XMP AI fingerprint inspection
  - [ ] 15.1 Implement `c2paInspector` module
    - Create `src/modules/c2paInspector.ts` with the `AI_TOOL_PATTERNS` array and `SCANNED_FIELDS` list from the design
    - Implement `inspectAiFingerprint(metadata: ExtractedMetadata): AiFingerprintResult`:
      - If `c2paClaimPresent` is `true`, return `status: 'detected'` with `detectedFields: [{ field: 'c2pa:claim', value: 'present' }]`
      - Otherwise scan `xmp:CreatorTool`, `dc:description`, `photoshop:History` against each pattern; collect hits
      - Return `status: 'detected'` with all hit fields, or `status: 'not_detected'`; on parse failure return `status: 'error'`
    - _Requirements: R12.1, R12.2, R12.3, R12.5_

  - [ ]* 15.2 Write property tests for C2PA inspector
    - **Property 15: C2PA / XMP inspector detects AI tool patterns across all scanned fields**
    - **Validates: Requirements R12.1, R12.2, R12.3**
    - Co-locate in `src/modules/c2paInspector.property.test.ts`

  - [ ] 15.3 Implement `AiFingerprintBadge` component and wire inspection into pipeline
    - Create `src/components/photo/AiFingerprintBadge.tsx` rendering:
      - "AI Fingerprint Detected" with field names and values when `status === 'detected'`
      - "No AI fingerprint detected" when `status === 'not_detected'`
      - "AI fingerprint inspection could not be completed" when `status === 'error'`
      - For every status, also render the disclosure text (absence ≠ not AI-generated; presence ≠ AI-generated)
    - Add `c2paInspector` call in `useExtraction` after extraction completes; dispatch `AI_FINGERPRINT_DONE`
    - _Requirements: R12.2, R12.3, R12.4, R12.5_

  - [ ]* 15.4 Write property tests for AI fingerprint disclosure rendering
    - **Property 16: AI fingerprint disclosure is rendered for every inspection result**
    - **Validates: Requirements R12.4**
    - Co-locate in `src/components/photo/AiFingerprintBadge.property.test.ts`

- [ ] 16. Checkpoint — C2PA inspection
  - Confirm all five AI tool name patterns trigger detection, C2PA claim presence alone triggers detection, `status: 'error'` renders the error notice without either positive/negative badge, and disclosure text is present for all three statuses. Ask the user if any questions arise.

---

### Phase 8 — QA and Deployment

- [ ] 17. Final build verification and no-error audit
  - [ ] 17.1 Verify zero TypeScript type errors on `vite build`
    - Run `vite build` and confirm exit code 0 with zero TypeScript errors reported
    - Fix any remaining type errors; re-run until clean
    - _Requirements: R14.5_

  - [ ] 17.2 Audit for unhandled promise rejections and `console.error` output
    - Run the full upload → extract → map → clean pipeline in the browser developer console
    - Confirm zero unhandled promise rejections and zero `console.error` calls during the pipeline
    - _Requirements: R14.4_

  - [ ] 17.3 Add Netlify / Vercel deployment config
    - Create `netlify.toml` (or `vercel.json`) with build command `npm run build`, publish directory `dist`, and a redirect rule routing all paths to `index.html` for SPA routing
    - Confirm the build artefact in `dist/` loads correctly when served from the config's publish directory

  - [ ] 17.4 Run all property tests and confirm all pass
    - Execute `npm test` (Vitest) and confirm every `*.property.test.ts` file passes all 16 properties
    - _Requirements: R14.1_

  - [ ]* 17.5 Write Playwright integration tests
    - Full upload → extract → map → clean pipeline with one real JPEG
    - OSM notice appears before first tile load; tiles load after dismissal
    - Mute toggle state persists across screen transitions
    - Sample photos load and show "Demo Data" indicator on every metadata field value
    - Co-locate in `tests/integration/` directory

- [ ] 18. Final checkpoint — ship
  - Ensure `npm run build` exits 0, `npm test` passes all suites, no console errors during full pipeline, deployment config is present. Ask the user if any final questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; all 16 correctness properties have an associated `*` task.
- Each task references specific requirements (R1–R14) for traceability.
- Property tests (fast-check) are co-located with the modules they test in `*.property.test.ts` files and tagged `// Feature: exifear, Property N: <text>`.
- Checkpoints enforce incremental validation and prevent silently broken phases from propagating.
- The `cleaner` round-trip property (Property 13) requires a real JPEG with EXIF present; use one of the synthetic sample files from `src/assets/samples/`.
- All processing remains browser-local; never introduce a server call, API proxy, or cloud function.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["0.1", "0.2", "0.3"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["4.1", "4.4", "4.7", "4.9"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.5", "4.8", "4.10", "4.12"] },
    { "id": 5, "tasks": ["4.6", "4.11", "4.13"] },
    { "id": 6, "tasks": ["6.1", "7.1"] },
    { "id": 7, "tasks": ["6.2", "6.3", "6.4", "6.5", "7.2", "7.3"] },
    { "id": 8, "tasks": ["7.4", "7.5", "7.6", "7.7"] },
    { "id": 9, "tasks": ["9.1", "9.4", "13.1", "13.2", "13.3"] },
    { "id": 10, "tasks": ["9.2", "9.3", "9.5"] },
    { "id": 11, "tasks": ["11.1", "11.4"] },
    { "id": 12, "tasks": ["11.2", "11.3", "11.5", "15.1"] },
    { "id": 13, "tasks": ["11.6", "15.2", "15.3"] },
    { "id": 14, "tasks": ["15.4", "17.1", "17.2", "17.3"] },
    { "id": 15, "tasks": ["17.4", "17.5"] }
  ]
}
```
