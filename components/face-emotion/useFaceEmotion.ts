/**
 * useFaceEmotion.ts
 * Central hook for face emotion detection using MediaPipe.
 */

import { useState, useRef, useCallback } from "react";
import { initializeLandmarker, detectLandmarks, dispose } from "./mediapipeService";
import { extractFeatures } from "./emotionFeatureExtractor";
import { calculateRawScore, applyTemporalSmoothingStep, resetScoringState } from "./emotionScoringEngine";
import { EmotionSmoothingEngine } from "./emotionSmoothingEngine";
import { getMoodCategory } from "@/lib/utils/moodMapper";

export function useFaceEmotion() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveScore, setLiveScore] = useState<number>(50); // 0-100
  const [liveMood, setLiveMood] = useState<string>("😊 Content");
  const [isStable, setIsStableState] = useState(false);
  const isStableRef = useRef(false);

  const setIsStable = useCallback((val: boolean) => {
    setIsStableState(val);
    isStableRef.current = val;
  }, []);

  // Engines: Window size 12 (~0.6s at 20fps), lock time 3000ms (3s)
  const smoothingEngineRef = useRef(new EmotionSmoothingEngine(12, 3000));

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    dispose();
    
    smoothingEngineRef.current.reset();
    
    setIsInitializing(false);
    setIsStable(false);
    setError(null);
  }, []);

  const processFrame = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      const result = detectLandmarks(videoRef.current);
      if (result) {
        // 2. Feature Extraction (Directly from Blendshapes)
        const rawFeatures = extractFeatures(result.landmarks, result.blendshapes);

        // 3. Score calculation
        const rawScore = calculateRawScore(rawFeatures);
        
        // 4. EWMA temporal step to kill camera noise
        const ewmaScore = applyTemporalSmoothingStep(rawScore);

        // 5. Advanced Smoothing (Spike rejection, Rolling Window, Stability)
        const { smoothedScore, isStable: stableNow } = smoothingEngineRef.current.processScore(ewmaScore, result.timestamp);
        
        if (!isStableRef.current) {
          const finalScore = Math.max(0, Math.min(100, Math.round(smoothedScore)));
          setLiveScore(finalScore);
          setLiveMood(getMoodCategory(finalScore));
          
          if (stableNow) {
            setIsStable(true);
          }
        }
      }
    } catch (e) {
      console.error("Frame processing error:", e);
    }

    // ~20 FPS throttle using requestAnimationFrame loop
    // In a strict implementation we might use setTimeout but rAF is better for battery
    // We can throttle it slightly by doing it every 2nd frame roughly, but for now standard rAF is ~60fps
    // Let's manually throttle to ~20 FPS.
    await new Promise(r => setTimeout(r, 50)); 
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsInitializing(true);
      setIsStable(false);
      setLiveScore(50);
      setLiveMood("😊 Content");
      
      smoothingEngineRef.current.reset();
      resetScoringState();

      await initializeLandmarker();

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user" 
        } 
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsInitializing(false);
            animationFrameRef.current = requestAnimationFrame(processFrame);
          }).catch(e => {
            console.error("Video play error:", e);
            setError("Failed to play video");
            setIsInitializing(false);
          });
        };
      } else {
        setIsInitializing(false);
      }
    } catch (err: any) {
      console.error("Camera start error:", err);
      setError(err.message || "Failed to start camera");
      setIsInitializing(false);
    }
  }, [processFrame]);

  const retry = useCallback(() => {
    stopCamera();
    setTimeout(() => {
      startCamera();
    }, 500);
  }, [startCamera, stopCamera]);

  return {
    videoRef,
    isInitializing,
    error,
    liveScore,
    liveMood,
    isStable,
    startCamera,
    stopCamera,
    retry
  };
}
