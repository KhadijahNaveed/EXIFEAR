// Covers R8.6, R8.7 — shared types for entire application

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

export interface GpsCluster {
  centroid: GpsData;
  photoIds: string[];
  inferenceLabel?: string;  // always prefixed with "Inference: "
}

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

export type AiFingerprintStatus = 'detected' | 'not_detected' | 'error';

export interface AiFingerprintResult {
  status: AiFingerprintStatus;
  detectedFields?: Array<{ field: string; value: string }>;
  errorMessage?: string;
}

export interface AppState {
  photos: Photo[];
  clusters: GpsCluster[];
  story: StoryResult | null;
  aiFingerprintResults: Record<string, AiFingerprintResult>; // keyed by photo.id
  isSampleSession: boolean;
  osmNoticeAcknowledged: boolean;
  isMuted: boolean;
}

export type Action =
  | { type: 'PHOTOS_LOADED'; photos: Photo[] }
  | { type: 'EXTRACTION_DONE'; photoId: string; metadata: ExtractedMetadata }
  | { type: 'EXTRACTION_ERROR'; photoId: string; error: string }
  | { type: 'CLUSTERS_COMPUTED'; clusters: GpsCluster[] }
  | { type: 'STORY_GENERATED'; story: StoryResult }
  | { type: 'AI_FINGERPRINT_DONE'; photoId: string; result: AiFingerprintResult }
  | { type: 'CLEAN_START'; photoId: string }
  | { type: 'CLEAN_DONE'; photoId: string; objectUrl: string }
  | { type: 'CLEAN_ERROR'; photoId: string; error: string }
  | { type: 'OSM_NOTICE_ACK' }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'RESET' }
  | { type: 'SET_ERROR'; error: string };
