# Design Document

## Overview

Exifear is a single-page application that runs entirely in the browser. Users upload personal photographs (or load ten bundled sample photos), and the app extracts EXIF metadata, narrates privacy findings through an animated ghost character, plots photo locations on an interactive Leaflet map, infers location roles (home/work) from GPS clusters, and lets users strip metadata with the Canvas API. No data leaves the device at any point except the OpenStreetMap tile requests that occur only after an explicit user acknowledgement.

The app is built with React 18, Vite, and TypeScript. It uses `exifr` for EXIF extraction, `react-leaflet` with `Leaflet.markercluster` for maps, the Canvas API for metadata removal, the Web Audio API for horror sound effects, and CSS animations plus a Canvas 2D particle system for visual atmosphere.

---

## Architecture

### High-Level Data Flow

```
User selects files                       Sample Photos button
      │                                         │
      ▼                                         ▼
 FileReader API                        fetch() bundled assets
      │                                         │
      └──────────────┬──────────────────────────┘
                     ▼
              Extractor module
              (exifr.parse)
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   InferenceEngine         C2PA_Inspector
   (GPS clustering)        (XMP / c2pa fields)
          │
          ▼
    StoryEngine
    (template selection
     + substitution)
          │
          ▼
    AppState (React context)
          │
    ┌─────┴──────────────────┐
    ▼                        ▼
  MapView              GhostSpeaksView
  (Leaflet)             PhotoGridView
                        PhotoDetailView
                        BlindGhostView
                        PreventionGuideView
```

### Screen Flow

```
EntryScreen
  │  upload files / load samples
  ▼
GhostSpeaksScreen   ◄──────────────┐
  │  navigate                      │
  ├─► MapScreen                    │
  ├─► PhotoGridScreen              │
  │     └─► PhotoDetailScreen      │
  ├─► BlindGhostScreen             │
  └─► PreventionGuideScreen ───────┘
```

Navigation persists across screens via a bottom navigation bar (mobile, < 768 px) and a sidebar / top bar (desktop, ≥ 768 px).

### Module Boundaries

| Module | Responsibility | Key Dependency |
|---|---|---|
| `extractor` | Calls `exifr.parse`, normalises output to `ExtractedMetadata` | `exifr` |
| `inferenceEngine` | Clusters GPS coordinates, assigns time-window labels | none |
| `storyEngine` | Selects template, substitutes values | none |
| `cleaner` | Canvas decode → redraw → `toBlob` pipeline | Canvas API |
| `c2paInspector` | Reads XMP / C2PA fields from exifr output | `exifr` (XMP segment) |
| `soundSystem` | AudioContext graph, named triggers, mute state | Web Audio API |
| `sampleLoader` | `fetch` bundled JPEG assets, construct `Photo` objects | Vite asset imports |
| `heicChecker` | Extension detection + `createImageBitmap` codec probe | Browser API |
| `mapLayer` | React-Leaflet component tree, cluster group | `react-leaflet`, `leaflet.markercluster` |
| `particleSystem` | Canvas 2D fog animation on entry screen | Canvas API |
| `flashlightCursor` | CSS/Canvas cursor overlay at ≥ 1024 px | CSS custom property |

---

## Components and Interfaces

### Component Tree

```
<App>
  <AppProvider>              // React context — holds AppState
    <SoundProvider>          // manages AudioContext lifecycle
      <ReducedMotionProvider>// reads prefers-reduced-motion
        <Router>
          <EntryScreen>
            <PrivacyBanner />
            <FileDropZone />
            <SamplePhotosButton />
            <ParticleCanvas />       // fog effect
          </EntryScreen>
          <GhostSpeaksScreen>
            <GhostCharacter />       // animated SVG ghost
            <StoryReveal />          // typewriter text reveal
          </GhostSpeaksScreen>
          <MapScreen>
            <OsmNoticeModal />       // shown once before first tile load
            <MapView>
              <TileLayer />
              <MarkerClusterGroup>
                <PhotoMarker /> ×N
              </MarkerClusterGroup>
              <MarkerDetailPanel />
            </MapView>
          </MapScreen>
          <PhotoGridScreen>
            <PhotoThumbnail /> ×N    // glowing-eye / dim-eye indicator
          </PhotoGridScreen>
          <PhotoDetailScreen>
            <MetadataTable />
            <AiFingerprintBadge />
            <InferenceList />
          </PhotoDetailScreen>
          <BlindGhostScreen>
            <CleanPhotoCard /> ×N
            <BulkCleanButton />
          </BlindGhostScreen>
          <PreventionGuideScreen>
            <PlatformTabs>
              <AndroidSteps />
              <IphoneSteps />
            </PlatformTabs>
          </PreventionGuideScreen>
          <MuteToggle />             // visible on every screen
          <BottomNav />              // < 768 px only
          <SideNav />                // ≥ 768 px only
          <FlashlightOverlay />      // ≥ 1024 px only
        </Router>
      </ReducedMotionProvider>
    </SoundProvider>
  </AppProvider>
</App>
```

### Key Component Contracts

**`<FileDropZone>`** — accepts drag-and-drop or click-to-browse. Validates MIME type and file size before dispatching to the extractor. Emits per-file warnings for unsupported formats and oversized files. Caps selection at 50 files.

**`<GhostCharacter>`** — an SVG/CSS animated ghost that plays its walk cycle while story text is being revealed and idles (paused) afterwards. Closes eyes on successful clean operations.

**`<MapView>`** — wraps `react-leaflet` `MapContainer`. Defers rendering until the OSM notice has been dismissed. Uses `leaflet.markercluster` for automatic clustering of overlapping markers.

**`<FlashlightOverlay>`** — a fixed `<div>` covering the viewport at z-index 999 on screens ≥ 1024 px. Its CSS `radial-gradient` mask is updated on `mousemove` via a CSS custom property `--cursor-x` / `--cursor-y`, creating the 150 px illuminated radius effect.

**`<ParticleCanvas>`** — a full-screen `<canvas>` on the entry screen that runs a `requestAnimationFrame` loop drawing translucent white ellipses drifting upward to simulate fog. Disabled entirely when `Reduced_Motion` is active.

---

## Data Models

```typescript
// ── Core photo record ────────────────────────────────────────────────────────

export type PhotoSource = 'user' | 'sample';
export type CleanStatus = 'idle' | 'pending' | 'done' | 'error';
export type HeicSupport = 'unknown' | 'supported' | 'unsupported' | 'timeout';

export interface GpsData {
  latitude: number;         // decimal degrees, −90..90
  longitude: number;        // decimal degrees, −180..180
  altitude?: number;        // metres above sea level
}

export interface ExtractedMetadata {
  gps?: GpsData;
  timestamp?: Date;         // DateTimeOriginal, normalised to JS Date
  cameraMake?: string;
  cameraModel?: string;
  gpsBearing?: number;      // 0..359 degrees
  xmpCreatorTool?: string;
  xmpDcDescription?: string;
  photoshopHistory?: string;
  c2paClaimPresent: boolean;
  rawXmpFields: Record<string, unknown>;  // full XMP block for C2PA scan
}

export interface Photo {
  id: string;               // crypto.randomUUID()
  file: File;               // original File object (never leaves browser)
  objectUrl: string;        // URL.createObjectURL result
  source: PhotoSource;
  metadata: ExtractedMetadata | null;
  extractionError?: string; // non-fatal warning message
  cleanStatus: CleanStatus;
  cleanObjectUrl?: string;  // URL after successful canvas clean
  cleanError?: string;
  heicSupport?: HeicSupport;
}

// ── Inference engine ─────────────────────────────────────────────────────────

export interface GpsCluster {
  centroid: GpsData;
  photoIds: string[];
  inferenceLabel?: string;  // always prefixed with "Inference: "
}

// ── Story engine ─────────────────────────────────────────────────────────────

export type TemplateCondition =
  | 'gps_present'
  | 'gps_absent'
  | 'timestamps_present'
  | 'camera_model_present'
  | 'multiple_locations'
  | 'no_metadata';

export interface StoryTemplate {
  id: string;
  conditions: TemplateCondition[];  // all must match; more = higher priority
  template: string;                 // e.g. "The ghost saw you at {{location}}…"
  requiredFields: string[];         // placeholder keys that must have real values
}

export interface StoryResult {
  text: string;
  templateId: string;
}

// ── C2PA inspection ──────────────────────────────────────────────────────────

export type AiFingerprintStatus = 'detected' | 'not_detected' | 'error';

export interface AiFingerprintResult {
  status: AiFingerprintStatus;
  detectedFields?: Array<{ field: string; value: string }>;
  errorMessage?: string;
}

// ── App state ────────────────────────────────────────────────────────────────

export interface AppState {
  photos: Photo[];
  clusters: GpsCluster[];
  story: StoryResult | null;
  aiFingerprintResults: Record<string, AiFingerprintResult>; // keyed by photo.id
  isSampleSession: boolean;
  osmNoticeAcknowledged: boolean;
  isMuted: boolean;
}
```

---

## File/Folder Structure

```
src/
├── main.tsx
├── App.tsx
├── context/
│   ├── AppContext.tsx          // AppState + dispatch
│   └── SoundContext.tsx
│   └── ReducedMotionContext.tsx
├── modules/
│   ├── extractor.ts            // exifr wrapper → ExtractedMetadata
│   ├── inferenceEngine.ts      // GPS clustering + time-window labelling
│   ├── storyEngine.ts          // template selection + substitution
│   ├── cleaner.ts              // Canvas clean pipeline
│   ├── c2paInspector.ts        // XMP / C2PA field scan
│   ├── soundSystem.ts          // Web Audio API graph
│   ├── sampleLoader.ts         // fetch + synthesise Photo objects
│   └── heicChecker.ts          // extension + codec probe
├── components/
│   ├── layout/
│   │   ├── BottomNav.tsx
│   │   ├── SideNav.tsx
│   │   ├── MuteToggle.tsx
│   │   └── FlashlightOverlay.tsx
│   ├── screens/
│   │   ├── EntryScreen.tsx
│   │   ├── GhostSpeaksScreen.tsx
│   │   ├── MapScreen.tsx
│   │   ├── PhotoGridScreen.tsx
│   │   ├── PhotoDetailScreen.tsx
│   │   ├── BlindGhostScreen.tsx
│   │   └── PreventionGuideScreen.tsx
│   ├── ghost/
│   │   └── GhostCharacter.tsx
│   ├── map/
│   │   ├── MapView.tsx
│   │   ├── PhotoMarker.tsx
│   │   └── MarkerDetailPanel.tsx
│   ├── photo/
│   │   ├── FileDropZone.tsx
│   │   ├── PhotoThumbnail.tsx
│   │   ├── MetadataTable.tsx
│   │   ├── AiFingerprintBadge.tsx
│   │   └── CleanPhotoCard.tsx
│   ├── particles/
│   │   └── ParticleCanvas.tsx
│   └── ui/
│       ├── OsmNoticeModal.tsx
│       ├── PrivacyBanner.tsx
│       └── PlatformTabs.tsx
├── hooks/
│   ├── useExtraction.ts
│   ├── useInference.ts
│   ├── useStory.ts
│   └── useCleaner.ts
├── assets/
│   └── samples/               // 10 × synthetic JPEG files
├── styles/
│   ├── global.css
│   ├── theme.css              // CSS custom properties: colours, radii
│   └── reduced-motion.css
└── types/
    └── index.ts               // all shared TypeScript types
```

---

## State Management Approach

Application state lives in a single `AppContext` driven by `useReducer`. This keeps state transitions explicit and testable without introducing a third-party state library.

```typescript
type Action =
  | { type: 'PHOTOS_LOADED';    photos: Photo[] }
  | { type: 'EXTRACTION_DONE';  photoId: string; metadata: ExtractedMetadata }
  | { type: 'EXTRACTION_ERROR'; photoId: string; error: string }
  | { type: 'CLUSTERS_COMPUTED'; clusters: GpsCluster[] }
  | { type: 'STORY_GENERATED';  story: StoryResult }
  | { type: 'AI_FINGERPRINT_DONE'; photoId: string; result: AiFingerprintResult }
  | { type: 'CLEAN_START';      photoId: string }
  | { type: 'CLEAN_DONE';       photoId: string; objectUrl: string }
  | { type: 'CLEAN_ERROR';      photoId: string; error: string }
  | { type: 'OSM_NOTICE_ACK' }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'RESET' };
```

Side effects (extraction, cleaning, inference) are triggered in `useEffect` hooks within custom hooks (`useExtraction`, `useInference`, etc.) and dispatch actions back into the reducer on completion.

---

## Key Algorithms

### 1. EXIF Extraction (extractor.ts)

`exifr.parse` is called with an explicit tag allowlist to avoid reading unnecessary data:

```typescript
const PARSE_OPTIONS = {
  gps: true,
  tiff: true,
  xmp: true,
  icc: false,
  iptc: false,
  jfif: false,
  translateKeys: true,
  translateValues: true,
  reviveValues: true,
  sanitize: true,
  mergeOutput: false,
};
```

The raw output is normalised into `ExtractedMetadata`:
- `latitude` / `longitude` are already in decimal degrees when `gps: true` and `reviveValues: true` are set — `exifr` performs DMS→DD conversion automatically.
- `DateTimeOriginal` is parsed into a JS `Date` with `reviveValues: true`.
- `GPSImgDirection` maps to `gpsBearing`.
- If `exifr.parse` throws, the error is caught; a non-fatal warning is logged to the browser console and the photo's `extractionError` field is set.

### 2. HEIC Detection (heicChecker.ts)

```
1. Check file.name extension (case-insensitive) for .heic / .heif
2. If extension matches, attempt createImageBitmap(file) with a 5-second timeout via Promise.race
3. If createImageBitmap resolves → HeicSupport = 'supported'
4. If createImageBitmap rejects  → HeicSupport = 'unsupported'
5. If the race times out          → HeicSupport = 'timeout' → treated as unsupported
```

### 3. GPS Clustering — Inference Engine (inferenceEngine.ts)

The algorithm is a single-pass greedy centroid clustering with a 500 m radius threshold, chosen for simplicity and low computational cost on ≤ 50 photos.

```
INPUT: photos[] with gps fields

1. Extract all photos that have gps data.
2. clusters = []
3. For each photo P in GPS-tagged photos:
   a. Find the first existing cluster C whose centroid is within 500 m of P.gps
      (distance computed by the Haversine formula).
   b. If found: add P to C.photoIds; recompute C.centroid as the mean of all
      member latitudes and longitudes.
   c. If not found: create a new cluster { centroid: P.gps, photoIds: [P.id] }.
4. Discard clusters with fewer than 3 photos.
5. For each remaining cluster, analyse timestamps of member photos:
   a. Count photos with local hour in [20, 23] ∪ [0, 7] → "evening" count.
   b. Count photos with local hour in [8, 17] on Mon–Fri → "weekday" count.
   c. If evening count / total > 0.5 → label = "Inference: you may spend a large part of your evenings here."
   d. Else if weekday count / total > 0.5 → label = "Inference: you may spend a large part of your weekday hours here."
   e. Else → no label assigned.
6. Return clusters with ≥ 3 members.
```

**Haversine distance** (metres) between two decimal-degree GPS points:

```
R = 6_371_000
φ₁, φ₂ = lat₁, lat₂ in radians
Δφ = φ₂ − φ₁
Δλ = (lon₂ − lon₁) in radians
a = sin²(Δφ/2) + cos(φ₁)·cos(φ₂)·sin²(Δλ/2)
d = 2R·arcsin(√a)
```

### 4. Story Template Selection (storyEngine.ts)

```
1. Build a ConditionSet from the current photo collection:
   - 'gps_present'          if any photo has gps data
   - 'gps_absent'           if any photo lacks gps data
   - 'timestamps_present'   if any photo has a timestamp
   - 'camera_model_present' if any photo has a camera model
   - 'multiple_locations'   if clusters.length ≥ 2
   - 'no_metadata'          if no photo has any metadata field

2. Score each template: score = count of template.conditions that are
   present in ConditionSet.  Templates whose conditions are NOT all present
   receive score −∞ (disqualified).

3. Select the template with the highest score. Break ties by template.id
   lexicographic order for determinism.

4. Substitute placeholders:
   - {{location}}   → first cluster place name or "an unknown place"
   - {{date}}       → earliest photo timestamp (formatted) or "an unrecorded time"
   - {{camera}}     → camera make + model or "an unknown device"
   - {{inference}}  → first inference label or "patterns in your movement"
   No visible placeholder may remain after substitution.
```

### 5. Metadata Cleaning Pipeline (cleaner.ts)

```
INPUT: photo.file (File object)

1. createImageBitmap(photo.file) → ImageBitmap
   (async; no server call; native browser decoding)
2. Create OffscreenCanvas(bitmap.width, bitmap.height)
3. ctx.drawImage(bitmap, 0, 0)
   — Canvas discards all metadata segments; only pixel data survives.
4. canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
   — For PNG source files use 'image/png' (lossless).
5. blob → URL.createObjectURL(blob) → stored as photo.cleanObjectUrl
6. Dispatch CLEAN_DONE action.
   — If any step throws, dispatch CLEAN_ERROR with the error message.

NOTE: Canvas re-encode removes standard EXIF, IPTC, XMP, and C2PA/JUMBF
segments. Steganographic or non-standard data embedded in pixel values is
not removed. The UI displays this caveat to the user (Requirement 9.7).
```

### 6. C2PA / XMP Inspection (c2paInspector.ts)

The `exifr.parse` call already extracts the full XMP block into `rawXmpFields`. The inspector runs synchronously on this output:

```typescript
const AI_TOOL_PATTERNS = [
  /dall[\s-]?e/i,
  /midjourney/i,
  /stable[\s-]?diffusion/i,
  /firefly/i,
  /adobe[\s-]?generative[\s-]?fill/i,
];

const SCANNED_FIELDS = [
  'xmp:CreatorTool',
  'dc:description',
  'photoshop:History',
];

function inspectAiFingerprint(metadata: ExtractedMetadata): AiFingerprintResult {
  if (metadata.c2paClaimPresent) {
    return { status: 'detected', detectedFields: [{ field: 'c2pa:claim', value: 'present' }] };
  }
  const hits: Array<{ field: string; value: string }> = [];
  for (const field of SCANNED_FIELDS) {
    const val = getXmpField(metadata.rawXmpFields, field);
    if (val && AI_TOOL_PATTERNS.some(p => p.test(val))) {
      hits.push({ field, value: val });
    }
  }
  return hits.length > 0
    ? { status: 'detected', detectedFields: hits }
    : { status: 'not_detected' };
}
```

### 7. Sound System (soundSystem.ts)

```
AudioContext is created lazily on the first user gesture to satisfy the
browser autoplay policy.

Mute state is implemented as a master GainNode (gain = 0.0 when muted,
1.0 when unmuted) placed between all source nodes and AudioContext.destination.

Sound triggers and their corresponding audio files:
  - 'entry_load'       → assets/sounds/entry-creak.mp3
  - 'gps_hover'        → assets/sounds/ghost-whisper.mp3
  - 'analysis_done'    → assets/sounds/thunder-rumble.mp3

Each trigger calls:
  1. audioCtx.createBufferSource() with the pre-decoded AudioBuffer
  2. sourceNode.connect(masterGain) → masterGain.connect(audioCtx.destination)
  3. sourceNode.start()

AudioBuffers are decoded once at startup (after first gesture) and cached.
Default state: isMuted = true (masterGain.gain.value = 0.0).
```

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Unsupported file format | Per-file warning; file skipped; session continues |
| File > 20 MB | Per-file warning; file skipped; session continues |
| > 50 files selected | Warning shown; only first 50 accepted |
| `exifr.parse` throws | `extractionError` set; console warning; photo still displayed without metadata |
| HEIC codec unsupported | Per-file error message per Requirement 11.3 |
| HEIC codec check times out | Treated as unsupported; same error message |
| Sample assets unavailable | Error message on entry screen; app remains on entry screen |
| Canvas clean fails | Per-photo error indicator; download not offered |
| Bulk clean partial failure | Per-photo error indicators; successful photos still downloadable |
| C2PA parse failure | "AI fingerprint inspection could not be completed" notice on photo detail |
| `AudioContext` creation blocked | Sound silently unavailable; mute toggle remains visible but inert |
| OpenStreetMap tiles unavailable | Leaflet shows blank tile placeholders; map panning/zooming still works |

---

## Testing Strategy

### Unit Tests (Vitest)

Unit tests target the pure logic modules: `inferenceEngine`, `storyEngine`, `extractor` normalisation, `c2paInspector`, and `heicChecker`. They cover specific examples, edge cases, and error conditions.

Focus areas for unit tests:
- `inferenceEngine`: clusters of exactly 2 photos (below threshold), exactly 3, mixed time-window counts at exactly 50 % (boundary).
- `storyEngine`: tie-breaking is deterministic, all 8 required templates are present, every placeholder is substituted.
- `extractor`: absent fields → `undefined` in `ExtractedMetadata`; corrupt EXIF → non-fatal warning only.
- `c2paInspector`: each AI tool name pattern matches; `c2pa:claim` present triggers detection regardless of other fields.

### Property Tests (fast-check)

Property-based tests use [fast-check](https://fast-check.io/) and are co-located with unit tests in `*.property.test.ts` files. Each test runs at minimum 100 iterations.

Tag format for each test:
```
// Feature: exifear, Property N: <property text>
```

### Integration Tests (Playwright)

Integration tests cover:
- Full upload → extract → map → clean pipeline with one real JPEG.
- OSM notice appears before first tile load; tiles load after dismissal.
- Mute toggle persists across screen transitions.
- Sample photos load and show "Demo Data" indicator on every metadata field.

PBT is applicable here because the core modules (`inferenceEngine`, `storyEngine`, `extractor` normalisation, `c2paInspector`, `cleaner`) are pure functions or near-pure with well-defined input/output shapes, and their input spaces are large enough that property testing will find edge cases example tests would miss.


---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: File validation rejects out-of-range selection counts

*For any* array of files of arbitrary size and type, the file validation logic SHALL accept between 1 and 50 files and reject the rest, returning an accepted count in [1, 50] and a warning when the original count exceeds 50 or is 0.

**Validates: Requirements 2.1, 2.5**

---

### Property 2: Invalid file formats are rejected with a per-file warning

*For any* file whose extension or MIME type is not JPEG, PNG, or WebP, the validator SHALL mark that file as rejected and include a warning entry referencing the file's name; the file SHALL NOT appear in the set of photos passed to the extractor.

**Validates: Requirements 2.3**

---

### Property 3: Oversized files are rejected with a per-file warning

*For any* file whose size exceeds 20 MB (20 × 1024 × 1024 bytes), the validator SHALL mark that file as rejected and include a warning entry referencing the file's name; the file SHALL NOT appear in the set of photos passed to the extractor.

**Validates: Requirements 2.4**

---

### Property 4: Sample photos contain valid synthetic EXIF data

*For every* Sample_Photo in the bundled set of ten, the extracted `ExtractedMetadata` SHALL contain: GPS latitude in [−90, 90], GPS longitude in [−180, 180], a timestamp representing a date in [2000-01-01, today], a non-empty camera make string, a non-empty camera model string, and a bearing value in [0, 359].

**Validates: Requirements 3.5**

---

### Property 5: Extractor normalisation preserves absent fields

*For any* photo whose raw EXIF is missing a subset of fields (GPS, timestamp, cameraMake, cameraModel, gpsBearing), the `ExtractedMetadata` returned by the extractor SHALL have those fields set to `undefined` and SHALL NOT fabricate any value for a missing field.

**Validates: Requirements 4.1, 4.2**

---

### Property 6: MetadataTable renders "not found" for every absent field

*For any* `ExtractedMetadata` object in which an arbitrary subset of fields is `undefined`, the `MetadataTable` component SHALL render a "not found" indicator for each absent field and SHALL NOT leave that field's row empty or display a raw `undefined` value.

**Validates: Requirements 4.3**

---

### Property 7: GPS clustering enforces the 3-photo minimum and 500 m radius

*For any* array of `GpsData` points, `inferenceEngine.cluster` SHALL produce clusters in which every cluster contains at least 3 member points and every member point lies within 500 m (Haversine) of the cluster centroid; any set of fewer than 3 mutually within-500 m points SHALL NOT form a cluster.

**Validates: Requirements 6.1, 6.6**

---

### Property 8: Evening time-window labelling is applied iff majority timestamps qualify

*For any* cluster whose member photos have timestamps, if strictly more than 50 % of those timestamps have a local hour in {20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6, 7}, the cluster's inference label SHALL contain the substring "evenings"; if 50 % or fewer timestamps fall in that window, the label SHALL NOT contain "evenings".

**Validates: Requirements 6.2**

---

### Property 9: Weekday time-window labelling is applied iff majority timestamps qualify

*For any* cluster whose member photos have timestamps, if strictly more than 50 % of those timestamps have a local hour in [8, 17] on a Monday through Friday, the cluster's inference label SHALL contain the substring "weekday"; if 50 % or fewer qualify, the label SHALL NOT contain "weekday".

**Validates: Requirements 6.3**

---

### Property 10: All inference labels use qualified language and bear the required prefix

*For any* cluster that receives a label, the label string SHALL start with "Inference: " and SHALL NOT contain any of the banned declarative phrases: "this is your home", "you live here", "this is your work", "this is your school".

**Validates: Requirements 6.4, 6.5**

---

### Property 11: Story template selection always picks the highest-scoring match

*For any* set of extracted metadata representing a photo session, `storyEngine.selectTemplate` SHALL return the template whose conditions are all present in the derived `ConditionSet` and whose condition count is the maximum among all qualifying templates; if two templates tie, the result SHALL be deterministic (lexicographic template ID order).

**Validates: Requirements 7.1**

---

### Property 12: Story substitution leaves no visible placeholders and fills absences with fallbacks

*For any* `StoryTemplate` and any `ExtractedMetadata`, `storyEngine.substitute` SHALL return a string containing no substring matching the pattern `\{\{[^}]+\}\}` (a raw placeholder); any placeholder whose required metadata field is `undefined` SHALL be replaced by its designated fallback phrase (e.g., "an unknown place", "an unrecorded time").

**Validates: Requirements 7.2**

---

### Property 13: Canvas clean pipeline strips metadata (round-trip property)

*For any* JPEG or PNG `File` object that the extractor can read with at least one metadata field present, running the file through the cleaner pipeline and then passing the resulting `Blob` back through the extractor SHALL yield an `ExtractedMetadata` object in which all GPS, timestamp, cameraMake, cameraModel, and gpsBearing fields are `undefined`.

**Validates: Requirements 9.1**

---

### Property 14: Clean filename follows the [original-filename]-clean.[ext] convention

*For any* original filename string, the cleaner's filename generator SHALL return a string equal to `<basename>-clean.<ext>` where `<basename>` is the original filename without extension and `<ext>` is the original extension (lowercase); filenames without an extension SHALL produce `<name>-clean` with no trailing dot.

**Validates: Requirements 9.3**

---

### Property 15: C2PA / XMP inspector detects AI tool patterns across all scanned fields

*For any* `ExtractedMetadata` where at least one of the fields `xmp:CreatorTool`, `dc:description`, or `photoshop:History` contains a known AI tool name (as matched by the defined patterns), or where `c2paClaimPresent` is `true`, the inspector SHALL return `status: 'detected'`; for metadata where none of these conditions hold, the inspector SHALL return `status: 'not_detected'`.

**Validates: Requirements 12.1, 12.2, 12.3**

---

### Property 16: AI fingerprint disclosure is rendered for every inspection result

*For any* `AiFingerprintResult` with status `'detected'`, `'not_detected'`, or `'error'`, the `AiFingerprintBadge` component SHALL render the disclosure text stating that absence of markers does not guarantee a photo is not AI-generated and presence does not guarantee it is AI-generated.

**Validates: Requirements 12.4**
