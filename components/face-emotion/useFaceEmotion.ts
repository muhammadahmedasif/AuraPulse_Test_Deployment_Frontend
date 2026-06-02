import { useState, useRef, useEffect, useCallback } from 'react';
import { detectEmotion, initializeFaceApi } from './faceApiService';
import { mapExpressionsToMoodScore, getMoodCategory } from '@/lib/utils/moodMapper';

export function useFaceEmotion() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [liveMood, setLiveMood] = useState<string | null>(null);
  const [isStable, setIsStable] = useState(false);
  const isStableRef = useRef(false);
  
  const readingsRef = useRef<number[]>([]);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /** Wait until the video element has loaded metadata and is playing. */
  const waitForVideoReady = (): Promise<void> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video) return resolve();

      // Already playing
      if (video.readyState >= 2 && video.videoWidth > 0) {
        return resolve();
      }

      const onReady = () => {
        video.removeEventListener('loadeddata', onReady);
        resolve();
      };
      video.addEventListener('loadeddata', onReady);

      // Safety timeout: don't wait forever
      setTimeout(resolve, 5000);
    });
  };

  const startCamera = useCallback(async () => {
    try {
      setIsInitializing(true);
      setError(null);
      readingsRef.current = [];
      setIsStable(false);
      isStableRef.current = false;
      setLiveScore(null);
      setLiveMood(null);

      // Get camera stream
      if (!streamRef.current) {
        console.log('[FaceEmotion] Requesting camera access…');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Explicitly start playing
          try {
            await videoRef.current.play();
          } catch (e) {
            console.warn('[FaceEmotion] play() failed, will retry:', e);
          }
        }
      } else {
        console.log('[FaceEmotion] Reusing existing camera stream.');
      }

      // Load face-api models
      console.log('[FaceEmotion] Loading face-api models…');
      await initializeFaceApi();
      console.log('[FaceEmotion] Models loaded.');

      // Wait for video to actually be rendering frames
      console.log('[FaceEmotion] Waiting for video to be ready…');
      await waitForVideoReady();
      console.log(
        `[FaceEmotion] Video ready: ${videoRef.current?.videoWidth}x${videoRef.current?.videoHeight}, readyState=${videoRef.current?.readyState}`
      );

      startTimeRef.current = Date.now();
      startDetectionLoop();
    } catch (err: any) {
      console.error('[FaceEmotion] startCamera error:', err);
      setError('Could not access camera or load models.');
    } finally {
      setIsInitializing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDetectionLoop = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    console.log('[FaceEmotion] Detection loop started (every 500 ms).');

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || isStableRef.current) return;
      
      // Ignore first 2 seconds for camera warmup
      if (Date.now() - startTimeRef.current < 2000) return;

      try {
        const vw = videoRef.current.videoWidth;
        const vh = videoRef.current.videoHeight;
        const rs = videoRef.current.readyState;
        console.log(`[FaceEmotion] Scan: ${vw}x${vh}, readyState=${rs}`);

        if (rs < 4 || vw === 0) {
          console.log('[FaceEmotion] Video not ready yet, skipping.');
          return;
        }

        const expressions = await detectEmotion(videoRef.current);
        if (expressions) {
          const score = mapExpressionsToMoodScore(expressions);
          setLiveScore(score);
          setLiveMood(getMoodCategory(score));

          readingsRef.current.push(score);
          console.log(
            `[FaceEmotion] ✅ Face detected! Score: ${score.toFixed(2)}, Readings: ${readingsRef.current.length}/5`
          );

          if (readingsRef.current.length >= 5) {
            console.log('[FaceEmotion] 5 samples collected → finalizing.');
            finalizeReadings();
          }
        } else {
          console.log('[FaceEmotion] ⚠ No face/expressions detected this frame.');
        }
      } catch (err) {
        console.error('[FaceEmotion] Detection error:', err);
      }
    }, 500);
  };

  const finalizeReadings = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    const readings = [...readingsRef.current];
    // Remove outliers (sort, remove lowest and highest)
    if (readings.length >= 5) {
      readings.sort((a, b) => a - b);
      readings.shift(); // remove lowest
      readings.pop();   // remove highest
    }
    
    const average = readings.reduce((a, b) => a + b, 0) / readings.length;
    console.log(
      `[FaceEmotion] Finalized: avg score = ${average.toFixed(2)}, mood = ${getMoodCategory(average)}`
    );
    setLiveScore(average);
    setLiveMood(getMoodCategory(average));
    setIsStable(true);
    isStableRef.current = true;
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    isInitializing,
    error,
    liveScore,
    liveMood,
    isStable,
    startCamera,
    stopCamera,
    retry: startCamera
  };
}
