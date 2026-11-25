# Privacy and Security Rules

These rules are non-negotiable. Any change that would violate them must be explicitly rejected by code review and the Kiro privacy hook.

## Core Invariant: No Photo Data Leaves the Browser
1. Photo binary data, file names, extracted EXIF fields, GPS coordinates, and inferred location labels must never be passed to `fetch()`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon()`, or any equivalent outbound channel.
2. The only permitted outbound network requests are OpenStreetMap tile fetches made by Leaflet. These must only occur after the user has acknowledged the OSM disclosure notice.
3. If `exifr`, Canvas, or FileReader throws an error, the error handler must display a local message via the reducer. It must not make a network call or log sensitive data to an external service.

## OpenStreetMap Disclosure
4. The `<OsmNoticeModal>` component must be shown and dismissed by the user before Leaflet makes its first tile request. The map must not render (Leaflet must not be mounted) until the user clicks "I understand."
5. The disclosure text must include: "Map tiles are fetched from OpenStreetMap. This reveals the approximate area you are viewing to OpenStreetMap's tile servers."

## Sample Data
6. All GPS coordinates in the ten bundled sample photos must be synthetic. Use coordinates that do not correspond to any private residential address. Document the chosen coordinates in `src/assets/samples/README.md`.
7. Sample data must be clearly identified in the UI with a "Demo Data" badge on every field and inference that derives from it.

## Canvas Cleaning Caveat
8. A photo must not be labelled "clean" or offered for download until `canvas.convertToBlob()` (or `toBlob`) resolves successfully.
9. Every cleaned photo's download UI must display: "Standard EXIF metadata has been removed. This process cannot guarantee removal of steganographic content or non-standard metadata."

## Inference Labelling
10. The inference engine must never produce output containing the phrases "your home", "you live at", "your workplace", or "your school" as bare declarative statements. Every inference must be prefixed with "Inference:" and use qualified language (e.g., "you may spend…").

## console.error Rule
11. `console.error` must not be called in any module. Use the `dispatch({ type: 'SET_ERROR', … })` reducer action instead. Errors that surface to `console.error` during the full export pipeline constitute a failing test.

## Dependency Rule
12. Never add a dependency that sends data to an external server (analytics, error tracking, AI APIs). Check new `npm install` additions against this rule before committing.
