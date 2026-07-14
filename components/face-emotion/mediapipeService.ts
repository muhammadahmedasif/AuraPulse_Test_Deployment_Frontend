/**
 * mediapipeService.ts
 * Singleton service for MediaPipe FaceLandmarker.
 * Lazily loads WASM + model from CDN. Returns raw landmarks only.
 */

// ── Types ──────────────────────────────────────────────────────────
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface LandmarkDetectionResult {
  landmarks: NormalizedLandmark[];
  blendshapes?: { categoryName: string; score: number }[];
  timestamp: number;
}

// ── CDN paths ──────────────────────────────────────────────────────
const WASM_CDN =
  "/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// ── Singleton state ────────────────────────────────────────────────
let landmarkerInstance: any | null = null;
let initPromise: Promise<void> | null = null;
let lastTimestamp = -1;

// ── Public API ─────────────────────────────────────────────────────

/**
 * Lazily initialise the FaceLandmarker. Safe to call multiple times –
 * concurrent calls await the same promise; subsequent calls return instantly.
 */
export async function initializeLandmarker(): Promise<void> {
  if (landmarkerInstance) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log("[MediaPipe] Loading WASM + model…");
      // Dynamic import – keeps the module out of SSR bundles
      const vision = await import("@mediapipe/tasks-vision");
      const { FaceLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(WASM_CDN);

      landmarkerInstance = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        }
      );
      console.log("[MediaPipe] FaceLandmarker ready ✅");
    } catch (err) {
      initPromise = null; // allow retry on failure
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Detect face landmarks from a live <video> element.
 * Returns null if no face is found or the video is not ready.
 * The timestamp MUST be monotonically increasing between calls.
 */
export function detectLandmarks(
  video: HTMLVideoElement
): LandmarkDetectionResult | null {
  if (!landmarkerInstance) return null;
  if (video.readyState < 4 || video.videoWidth === 0) return null;

  // Guarantee monotonically increasing timestamps
  let ts = performance.now();
  if (ts <= lastTimestamp) ts = lastTimestamp + 1;
  lastTimestamp = ts;

  try {
    const result = landmarkerInstance.detectForVideo(video, ts);
    if (!result?.faceLandmarks?.length) return null;

    console.log("Land Marks", result.faceLandmarks[0]);

    return {
      landmarks: result.faceLandmarks[0] as NormalizedLandmark[],
      blendshapes: result.faceBlendshapes?.[0]?.categories || [],
      timestamp: ts,
    };
  } catch (err) {
    console.error("[MediaPipe] Detection error:", err);
    return null;
  }
}

/**
 * Clean up the landmarker instance and release GPU resources.
 */
export function dispose(): void {
  if (landmarkerInstance) {
    try {
      landmarkerInstance.close();
    } catch (_) {
      /* swallow */
    }
    landmarkerInstance = null;
  }
  initPromise = null;
  lastTimestamp = -1;
  console.log("[MediaPipe] Disposed ✅");
}
