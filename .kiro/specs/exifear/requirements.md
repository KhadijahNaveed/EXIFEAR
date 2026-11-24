# Requirements Document

## Introduction

Exifear is a browser-based haunted photo privacy scanner submitted to the Kiroween 2026 Devpost Costume Contest (deadline December 4, 2026). Users upload personal photographs (or load synthetic sample photos) and discover what EXIF metadata inside those photos reveals about their locations, routines, and devices. A ghost character narrates the findings as a creepy story, photo locations appear on an interactive map, and users can strip metadata from photos to "blind the ghost." All processing happens locally in the browser — no photos are ever uploaded to a server.

The application is built with React, Vite, and TypeScript. It uses `exifr` for EXIF extraction, Leaflet with OpenStreetMap tiles for maps, the Canvas API for metadata removal, and the Web Audio API for optional sound effects.

---

## Glossary

- **App**: The Exifear single-page web application running entirely in the user's browser.
- **User**: A person visiting the App in a desktop or mobile browser.
- **Photo**: A JPEG, PNG, or WebP image file provided by the User via the file picker, or one of the Sample Photos bundled with the App.
- **EXIF**: Exchangeable Image File Format — machine-readable metadata embedded in a Photo by the camera or phone that captured it.
- **Extractor**: The App module that uses `exifr` to read EXIF data from a Photo without sending the Photo to any server.
- **GPS_Data**: The latitude, longitude, and optional altitude values read from a Photo's EXIF by the Extractor.
- **Sample_Photos**: Ten bundled JPEG files containing realistic synthetic EXIF and GPS data, used to demonstrate the App without requiring a User to upload personal photos.
- **Ghost**: The animated character element rendered in the App that narrates privacy findings to the User.
- **Story_Engine**: The App module that selects and fills creepy story templates using actual extracted metadata values.
- **Map**: The interactive Leaflet map rendered in the App that displays Photo locations using OpenStreetMap tiles.
- **Marker**: A clickable map element placed at the GPS coordinates of a Photo.
- **Inference_Engine**: The App module that analyzes clusters of GPS coordinates and timestamps to produce cautious location-role inferences (e.g., home, work).
- **Cleaner**: The App module that uses the Canvas API to decode a Photo and redraw it without EXIF metadata, producing a downloadable clean copy.
- **Prevention_Guide**: The in-app screen presenting step-by-step instructions for disabling camera location tagging on Android and iPhone.
- **C2PA_Inspector**: The optional App module that reads C2PA and XMP provenance metadata to identify AI-generated image signals.
- **Privacy_Score**: The optional numeric summary (0–100) reflecting the privacy exposure level of the User's uploaded Photos.
- **Reduced_Motion**: The operating-system accessibility preference `prefers-reduced-motion: reduce`.

---

## Requirements

### Requirement 1: Local-Only Photo Processing

**User Story:** As a privacy-conscious user, I want all my photos to stay in my browser so that I never risk exposing my personal images to a third-party server.

#### Acceptance Criteria

1. THE App SHALL process every Photo exclusively in browser memory using JavaScript APIs (FileReader, exifr, Canvas).
2. THE App SHALL never transmit any Photo binary data, file name, or extracted metadata fields (including but not limited to GPS coordinates, timestamps, camera model, and author fields) to any server or third-party endpoint.
3. THE App SHALL display a privacy assurance statement on the entry screen that states, at minimum, that photos are processed locally in the browser and that no photo data is uploaded to any server.
4. WHEN the User first activates the map feature, THE App SHALL display a notice that tile images are fetched from OpenStreetMap and that the User's approximate location may be inferred from those requests, before the first tile request is made.
5. IF photo processing via FileReader, exifr, or Canvas raises an error, THEN THE App SHALL present an error message indicating the failure and SHALL NOT transmit any photo data or partial metadata to any server or third-party endpoint.

---

### Requirement 2: Photo Upload

**User Story:** As a user, I want to upload multiple photos at once so that I can analyze my entire photo library in a single session.

#### Acceptance Criteria

1. WHEN the User activates the photo file picker, THE App SHALL accept between 1 and 50 JPEG, PNG, or WebP files in a single selection.
2. WHEN the User selects files, THE App SHALL load all selected Photos into browser memory and pass each to the Extractor, completing the loading of all files within 5 seconds per file.
3. IF a selected file is not a supported format, THEN THE App SHALL display a per-file warning identifying the unsupported file by name and skip that file without halting the session.
4. IF a selected file exceeds 20 MB, THEN THE App SHALL display a per-file warning identifying the oversized file by name and skip that file without halting the session.
5. IF the User selects more than 50 files, THEN THE App SHALL display a warning indicating the selection limit has been exceeded and accept only the first 50 files.
6. WHEN all Photos have been successfully loaded into browser memory, THE App SHALL transition to the Ghost Speaks screen.

---

### Requirement 3: Sample Photos Mode

**User Story:** As a user who does not want to upload personal photos, I want to load synthetic sample photos so that I can experience the full App without risk.

#### Acceptance Criteria

1. WHILE no Photos are loaded, THE App SHALL display a "Try Sample Photos" button on the entry screen.
2. WHEN the user activates the "Try Sample Photos" button, THE App SHALL load all ten Sample_Photos without prompting for any file upload.
3. IF the Sample_Photos assets cannot be loaded, THEN THE App SHALL display an error message indicating that the sample data is unavailable and leave the entry screen in its previous state.
4. WHEN Sample_Photos are loaded, THE App SHALL display a "Demo Data" indicator alongside every metadata field value and every inference result shown in the UI.
5. THE App SHALL ensure each Sample_Photo contains the following bundled synthetic EXIF data: GPS coordinates with latitude in the range −90 to 90 and longitude in the range −180 to 180, a timestamp in ISO 8601 format representing a date between 2000-01-01 and the current date, a non-empty camera make string, a non-empty camera model string, and a camera direction value in the range 0 to 359 degrees.
6. WHEN Sample_Photos are active, THE App SHALL provide the same functionality as user-uploaded Photos including map display, storytelling, and metadata cleaning.

---

### Requirement 4: EXIF Metadata Extraction

**User Story:** As a user, I want to know exactly what personal information is embedded in my photos so that I understand my privacy exposure.

#### Acceptance Criteria

1. WHEN a Photo in JPEG, PNG, HEIC, or WebP format is passed to the Extractor, THE Extractor SHALL attempt to read GPS coordinates (latitude, longitude), capture timestamp, camera manufacturer, phone model, and camera direction (GPS bearing).
2. WHEN a metadata field is absent from a Photo, THE Extractor SHALL record that field as absent.
3. IF a metadata field is recorded as absent, THEN THE App SHALL display a "not found" indicator for that field rather than inventing a value.
4. IF GPS coordinates are present in a Photo, THEN THE App SHALL display the GPS coordinates alongside the Photo and place a Marker on the Map.
5. IF GPS coordinates are absent from a Photo, THEN THE App SHALL omit a Marker for that Photo and display a "No location data" indicator on the Photo detail view.
6. THE Extractor SHALL complete extraction for a single Photo of up to 10 MB within 2000 milliseconds.
7. IF the Extractor encounters a corrupt or unreadable EXIF metadata block in a Photo that otherwise loads successfully, THEN THE Extractor SHALL log a non-fatal warning to the browser console and continue processing remaining Photos.

---

### Requirement 5: Interactive Map

**User Story:** As a user, I want to see all my photo locations on one map so that I can grasp how much location information my photos reveal at a glance.

#### Acceptance Criteria

1. WHEN at least one Photo with GPS_Data has been processed, THE App SHALL render the Map plotting all GPS-tagged Photo locations within a single map view.
2. THE Map SHALL place one Marker per Photo that has GPS_Data; IF two or more Photos share identical GPS coordinates, THEN THE App SHALL render a clustered Marker at that position indicating the count of overlapping Photos.
3. WHEN the User clicks a Marker, THE App SHALL open a detail panel showing the corresponding Photo's preview, GPS coordinates, capture timestamp, camera make and model, and any location inferences derived from the GPS_Data such as a resolved place name; if a detail panel is already open, THE App SHALL replace its content with the newly selected Photo's data.
4. THE Map SHALL use Leaflet with OpenStreetMap tiles and SHALL NOT use any proprietary mapping API.
5. IF all processed Photos lack GPS_Data, THEN THE App SHALL display an informational message on the Map screen explaining that no location data was found rather than rendering an empty map.
6. THE Map SHALL support pan and zoom interactions at zoom levels 0 through 19 on both desktop and mobile viewports.

---

### Requirement 6: Home/Work/School Location Inference

**User Story:** As a user, I want the App to surface patterns in my photo locations so that I understand what my photos collectively reveal about my daily routine.

#### Acceptance Criteria

1. WHEN at least three Photos share GPS coordinates within a 500-meter radius of their centroid, THE Inference_Engine SHALL identify that cluster as a candidate location.
2. WHEN more than 50% of Photos in a candidate location were captured between 20:00 and 07:59 local time, THE Inference_Engine SHALL label that location with the inference "you may spend a large part of your evenings here."
3. WHEN more than 50% of Photos in a candidate location were captured between 08:00 and 17:59 local time on Monday through Friday, THE Inference_Engine SHALL label that location with the inference "you may spend a large part of your weekday hours here."
4. THE Inference_Engine SHALL prefix every inference label with the word "Inference:".
5. THE Inference_Engine SHALL present every location label as a qualified possibility and SHALL NOT present any location label using unqualified declarative language such as "this is your home" or "you live here".
6. WHEN fewer than three Photos have GPS_Data, THE App SHALL omit the inference section entirely rather than displaying unsupported inferences.

---

### Requirement 7: Ghost Storytelling

**User Story:** As a user, I want the ghost to narrate my privacy findings as a creepy story so that the privacy implications feel real and memorable.

#### Acceptance Criteria

1. WHEN Photos have been processed, THE Story_Engine SHALL select the story template whose metadata conditions are the closest match to the set of metadata fields actually found, with more-specific templates (matching more conditions) taking priority over less-specific ones.
2. THE Story_Engine SHALL substitute real extracted values (location names, dates, camera models, inferences) into story templates to produce a narrative; IF a required substitution value is absent from the extracted metadata, THEN THE Story_Engine SHALL replace that placeholder with a generic fallback phrase (e.g., "an unknown place", "an unrecorded time") rather than leaving the placeholder visible.
3. THE Story_Engine SHALL include at least eight distinct story templates, with at least one template dedicated to each of the following conditions: GPS present, GPS absent, timestamps present, specific camera model present, and multiple distinct locations present.
4. THE Story_Engine SHALL generate all story text locally without calling any external AI API.
5. WHILE the story text is being revealed to the User, THE App SHALL display a continuously animated Ghost character, where the animation pauses within one second of the story reveal completing.
6. WHEN no metadata of any kind is found across all Photos, THE Story_Engine SHALL select a template that acknowledges the absence of metadata and contains a message indicating the User's photos are free of trackable information.

---

### Requirement 8: Haunted Visual Design

**User Story:** As a user, I want a dark, atmospheric horror experience so that the privacy lesson is emotionally engaging and memorable.

#### Acceptance Criteria

1. THE App SHALL apply a dark atmospheric color scheme (deep blacks, dark greens, desaturated purples) throughout all screens.
2. THE App SHALL render an animated fog or smoke particle effect on the entry screen.
3. WHEN the viewport width is 1024 px or greater, THE App SHALL apply a flashlight cursor effect that renders a circular illuminated spotlight of 150 px radius centered on the pointer, darkening all content outside that radius.
4. WHEN a Photo has GPS_Data, THE App SHALL render a red glowing-eye indicator on that Photo's thumbnail in the photo grid.
5. WHEN a Photo lacks GPS_Data, THE App SHALL render an eye indicator at 30% opacity on that Photo's thumbnail.
6. THE App SHALL include horror-themed sound effects, where each sound effect is triggered by a named user interaction (entry screen load, GPS_Data indicator hover, and photo analysis completion), and all sound effects SHALL be muted by default on first load.
7. THE App SHALL provide a mute/unmute toggle button that is visible and operable on every screen.
8. WHEN the User's browser reports Reduced_Motion preference, THE App SHALL disable particle animations and all CSS animations or transitions with a displacement greater than 2 px, while retaining static visual styling.

---

### Requirement 9: Metadata Cleaning (Blind the Ghost)

**User Story:** As a user, I want to remove metadata from my photos so that I can share them without revealing my location or device information.

#### Acceptance Criteria

1. WHEN the User activates the clean action for a Photo, THE Cleaner SHALL decode the Photo using the Canvas API, redraw the pixel data onto a new canvas without EXIF metadata, and encode the result as a JPEG or PNG.
2. THE App SHALL offer both individual Photo cleaning and a bulk "Clean All" action that applies the clean action to all Photos in the current session simultaneously.
3. WHEN a clean operation completes successfully, THE App SHALL make the clean Photo available for download as a file named `[original-filename]-clean.[ext]`.
4. WHEN a clean operation completes successfully, THE App SHALL animate the Ghost character closing its eyes.
5. THE App SHALL NOT label a Photo as clean until the Canvas encode-and-download step has completed without error.
6. IF the Canvas clean operation fails for a Photo, THEN THE App SHALL display an error message indicating the reason for that Photo and SHALL NOT offer a download for the failed Photo.
7. THE App SHALL display a warning that Canvas-based cleaning removes standard EXIF metadata but cannot guarantee removal of all steganographic or non-standard data.
8. WHILE a clean operation is in progress for one or more Photos, THE App SHALL display a visible in-progress indicator for each Photo being processed.
9. IF the User activates the bulk "Clean All" action and one or more Photos fail, THEN THE App SHALL display per-Photo error indicators for each failed Photo while making successfully cleaned Photos available for download.

---

### Requirement 10: Prevention Guide

**User Story:** As a user who wants to protect my future photos, I want step-by-step instructions for disabling location tagging on my phone so that my photos no longer embed GPS data.

#### Acceptance Criteria

1. THE App SHALL provide a Prevention_Guide screen accessible from the main navigation within at most 2 taps from any screen.
2. THE Prevention_Guide SHALL include an Android tab and an iPhone tab, each containing numbered steps for disabling GPS location tagging in that platform's default camera app, where each step contains a plain-language instruction of no more than 100 characters.
3. THE Prevention_Guide SHALL include, within each platform tab, numbered steps for navigating to the device's app permission settings and revoking the camera app's location permission.
4. IF the User opens the Prevention_Guide screen, THEN THE App SHALL display the Android tab by default.
5. THE App SHALL NOT request device location, microphone, or camera permissions at any point during app use.

---

### Requirement 11: HEIC Format Handling

**User Story:** As an iPhone user, I want the App to inform me clearly when my HEIC photos cannot be processed so that I am not confused by missing results.

#### Acceptance Criteria

1. WHEN the User selects a file with a `.heic` or `.heif` extension (case-insensitive), THE App SHALL detect the format by checking the file extension and verify whether the browser's native codec supports decoding it before attempting any further processing.
2. WHEN HEIC decoding is supported by the browser, THE App SHALL process the Photo using the same extraction pipeline as JPEG files and display the same metadata output fields.
3. WHEN HEIC decoding is not supported by the browser, THE App SHALL display a per-file error message indicating that HEIC format is not supported in the current browser and that the file should be converted to JPEG before uploading, without partially processing or silently skipping the file.
4. IF a file has a `.heic` or `.heif` extension but the codec support check itself fails to complete within 5 seconds, THEN THE App SHALL treat the file as unsupported and display the same per-file error message as criterion 3.

---

### Requirement 12: AI Fingerprint Inspection (C2PA / XMP)

**User Story:** As a user, I want to know if any of my photos contain AI-generation metadata so that I understand what provenance information is embedded in them.

#### Acceptance Criteria

1. WHEN a Photo is processed, THE C2PA_Inspector SHALL check for AI-generation indicators by scanning the following fields: `xmp:CreatorTool`, `dc:description`, `photoshop:History`, and any field within a `c2pa:claim` block; a field constitutes an indicator when its value contains a known AI tool name (e.g. "DALL-E", "Midjourney", "Stable Diffusion", "Firefly", "Adobe Generative Fill") or when a `c2pa:claim` block is present regardless of its value.
2. WHEN AI-generation indicators are found, THE App SHALL display a labeled "AI Fingerprint Detected" notice on the Photo detail view alongside each detected field name and its corresponding value.
3. WHEN no AI-generation indicators are found, THE App SHALL display a "No AI fingerprint detected" notice on the Photo detail view.
4. THE App SHALL accompany every AI fingerprint result with a disclosure stating that absence of C2PA/XMP markers does not guarantee a photo is not AI-generated, and that presence of markers does not guarantee it is.
5. IF the C2PA_Inspector cannot read or parse the photo file's metadata, THEN THE App SHALL display an error notice on the Photo detail view indicating that AI fingerprint inspection could not be completed, and SHALL NOT display either the "AI Fingerprint Detected" or "No AI fingerprint detected" notice.

---

### Requirement 13: Responsive Layout

**User Story:** As a user on a mobile device, I want the App to be usable on a small screen so that I can experience it on the same phone that takes the photos I am analyzing.

#### Acceptance Criteria

1. THE App SHALL render all screens without horizontal scroll on viewports as narrow as 375 pixels.
2. THE App SHALL render the Map at a minimum height of 250 pixels on viewports narrower than 768 pixels.
3. THE App SHALL size all interactive touch targets to a minimum of 44 × 44 pixels on viewports where the primary input pointer is coarse (touch-based).
4. THE App SHALL display a bottom navigation bar on viewports narrower than 768 pixels.

---

### Requirement 14: Kiro-Native Development Standards

**User Story:** As a developer maintaining this project, I want spec-driven development artifacts and automation hooks so that the codebase stays coherent and privacy-safe.

#### Acceptance Criteria

1. THE App's repository SHALL contain a `.kiro/specs/exifear/` directory with `requirements.md`, `design.md`, and `tasks.md` files, each containing at least their required section headings and one or more entries (not empty files).
2. THE App's repository SHALL contain at least four files under `.kiro/steering/`, with each of the following topics addressed by at least one dedicated file: architecture and coding standards, haunted visual identity, privacy and security rules, and testing and Git workflow; each file SHALL contain at least one rule or guideline statement specific to its topic.
3. WHEN a `.ts` or `.tsx` file is saved in the repository, THE App's repository SHALL trigger at least one Kiro Agent Hook that performs an automated check and emits a result to stdout indicating either a pass or the count and location of violations found.
4. WHILE the App is running and a user loads the interface and processes at least one image through the full export pipeline, THE App SHALL produce no unhandled promise rejections and no `console.error` output.
5. WHEN `vite build` is executed, THE App SHALL exit with code 0 and report zero TypeScript type errors.
