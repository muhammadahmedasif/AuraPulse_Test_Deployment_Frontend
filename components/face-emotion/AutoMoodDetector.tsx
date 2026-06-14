"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { initializeLandmarker, detectLandmarks, dispose } from "./mediapipeService";
import { extractFeatures } from "./emotionFeatureExtractor";
import { EmotionSmoothingEngine } from "./emotionSmoothingEngine";
import { calculateRawScore } from "./emotionScoringEngine";
import { getMoodCategory } from "@/lib/utils/moodMapper";

interface AutoMoodDetectorProps {
  isActive: boolean;
  intervalMinutes?: number;
  onMoodShiftDetected: (score: number, mood: string) => void;
}

export function AutoMoodDetector({
  isActive,
  intervalMinutes = process.env.NODE_ENV === "production" ? 60 : 1,
  onMoodShiftDetected,
}: AutoMoodDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const isRunningRef = useRef(false);
  const lastMoodRef = useRef<string | null>(null);

  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const callbackRef = useRef(onMoodShiftDetected);
  callbackRef.current = onMoodShiftDetected;

  // ── Camera helpers ──
  const openCamera = useCallback(async (): Promise<boolean> => {
    try {
      if (!videoRef.current) return false;
      if (streamRef.current && streamRef.current.active) return true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      await new Promise<void>((resolve) => {
        const v = videoRef.current!;
        if (v.readyState >= 2) return resolve();
        const h = () => { v.removeEventListener("loadeddata", h); resolve(); };
        v.addEventListener("loadeddata", h);
        setTimeout(resolve, 4000); 
      });

      await videoRef.current.play().catch(() => {});
      return true;
    } catch (err) {
      console.error("[AutoMood] Camera error:", err);
      return false;
    }
  }, []);

  const closeCamera = useCallback(() => {
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
    isRunningRef.current = false;
    console.log("[AutoMood] Camera closed");
  }, []);

  // ── Single mood-check cycle ──
  const runMoodCheck = useCallback(async () => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    try {
      const ok = await openCamera();
      if (!ok) { isRunningRef.current = false; return; }

      await initializeLandmarker();

      // Wait 2 s warmup
      await new Promise((r) => setTimeout(r, 2000));

      // We'll run MediaPipe until stable or timeout
      const smoothingEngine = new EmotionSmoothingEngine(10, 2000); // 2s stability needed
      
      const startTime = performance.now();
      const maxDuration = 10000; // 10s max

      let finalAvgScore = -1;

      await new Promise<void>((resolve) => {
        const detectFrame = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
             animationFrameRef.current = requestAnimationFrame(detectFrame);
             return;
          }

          const now = performance.now();
          if (now - startTime > maxDuration) {
             console.log("[AutoMood] Timeout reaching stable score.");
             resolve();
             return;
          }

          const result = detectLandmarks(videoRef.current);
          if (result) {
            const rawFeatures = extractFeatures(result.landmarks);
            // Skipping calibration here for background checks, or assuming neutral baseline.
            // Using raw features directly for background checks is acceptable.
            const rawScore = calculateRawScore(rawFeatures);
            const { smoothedScore, isStable } = smoothingEngine.processScore(rawScore, result.timestamp);

            if (isStable) {
               finalAvgScore = smoothedScore;
               resolve();
               return;
            }
          }

          await new Promise(r => setTimeout(r, 50)); // throttle to ~20FPS
          animationFrameRef.current = requestAnimationFrame(detectFrame);
        };

        animationFrameRef.current = requestAnimationFrame(detectFrame);
      });

      if (finalAvgScore !== -1) {
        const avg = Math.max(0, Math.min(100, Math.round(finalAvgScore)));
        const mood = getMoodCategory(avg);

        console.log(`[AutoMood] 🎯 Final: score=${avg}, mood=${mood}`);

        if (mood !== lastMoodRef.current) {
          lastMoodRef.current = mood;
          toastRef.current({
            title: "🎭 Auto Mood Detected",
            description: `Your mood has been detected as: ${mood}`,
            duration: 4000,
          });
          callbackRef.current(avg, mood);
        } else {
          console.log(`[AutoMood] Mood unchanged (${mood}), skipping save.`);
        }
      } else {
         console.log(`[AutoMood] Could not get a stable reading.`);
      }

    } catch (err) {
      console.error("[AutoMood] runMoodCheck error:", err);
    } finally {
      closeCamera();
    }
  }, [openCamera, closeCamera]);

  useEffect(() => {
    if (!isActive) {
      console.log("[AutoMood] Toggle OFF");
      closeCamera();
      if (checkTimerRef.current) { clearTimeout(checkTimerRef.current); checkTimerRef.current = null; }
      if (checkIntervalRef.current) { clearInterval(checkIntervalRef.current); checkIntervalRef.current = null; }
      return;
    }

    console.log(`[AutoMood] Toggle ON — first check in 3 s, then every ${intervalMinutes} min`);

    checkTimerRef.current = setTimeout(() => {
      runMoodCheck();
    }, 3000);

    checkIntervalRef.current = setInterval(() => {
      runMoodCheck();
    }, intervalMinutes * 60 * 1000);

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      closeCamera();
    };
  }, [isActive, intervalMinutes, runMoodCheck, closeCamera]);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{ width: 640, height: 480 }}
      className="fixed top-0 left-0 opacity-0 pointer-events-none -z-50"
    />
  );
}
