"use client";

import React, { useEffect, useRef, useCallback } from "react";
import * as faceapi from "face-api.js";
import { useToast } from "@/components/ui/use-toast";

interface AutoMoodDetectorProps {
  isActive: boolean;
  intervalMinutes?: number;
  onMoodShiftDetected: (score: number, mood: string) => void;
}

// ── Helpers (pure functions, no hooks) ──

function mapExpressionsToScore(exp: faceapi.FaceExpressions): number {
  const happy = exp.happy || 0;
  const neutral = exp.neutral || 0;
  const sad = exp.sad || 0;
  const angry = exp.angry || 0;
  const surprised = exp.surprised || 0;

  const raw =
    happy * 1.0 + surprised * 0.6 + neutral * 0.5 + angry * 0.1 + sad * 0.0;
  const total = happy + surprised + neutral + angry + sad;
  if (total === 0) return 0.5;
  return Math.min(Math.max(raw / total, 0), 1);
}

function getMoodCategory(score: number): string {
  if (score >= 0.7) return "positive";
  if (score <= 0.4) return "negative";
  return "neutral";
}

// ── Model loader (singleton) ──
let modelsLoaded = false;
let modelsLoading: Promise<void> | null = null;

async function ensureModels(url = "/models") {
  if (modelsLoaded) return;
  if (modelsLoading) return modelsLoading;
  modelsLoading = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(url),
      faceapi.nets.faceExpressionNet.loadFromUri(url),
    ]);
    modelsLoaded = true;
    console.log("[AutoMood] face-api models loaded ✅");
  })();
  return modelsLoading;
}

// ── Component ──

export function AutoMoodDetector({
  isActive,
  intervalMinutes = process.env.NODE_ENV === "production" ? 60 : 1,
  onMoodShiftDetected,
}: AutoMoodDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readingsRef = useRef<number[]>([]);
  const lastMoodRef = useRef<string | null>(null);
  const isRunningRef = useRef(false);

  // Keep callback ref fresh
  const callbackRef = useRef(onMoodShiftDetected);
  callbackRef.current = onMoodShiftDetected;

  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // ── Camera helpers ──

  const openCamera = useCallback(async (): Promise<boolean> => {
    try {
      if (!videoRef.current) {
        console.error("[AutoMood] No video element");
        return false;
      }

      // Already have a stream
      if (streamRef.current && streamRef.current.active) {
        console.log("[AutoMood] Reusing active stream");
        return true;
      }

      console.log("[AutoMood] Requesting camera…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Wait for the video to actually start playing
      await new Promise<void>((resolve) => {
        const v = videoRef.current!;
        if (v.readyState >= 2) return resolve();
        const h = () => { v.removeEventListener("loadeddata", h); resolve(); };
        v.addEventListener("loadeddata", h);
        setTimeout(resolve, 4000); // safety fallback
      });

      await videoRef.current.play().catch(() => {});
      console.log(
        `[AutoMood] Camera open: ${videoRef.current.videoWidth}×${videoRef.current.videoHeight}`
      );
      return true;
    } catch (err) {
      console.error("[AutoMood] Camera error:", err);
      return false;
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (detectionTimerRef.current) {
      clearInterval(detectionTimerRef.current);
      detectionTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isRunningRef.current = false;
    console.log("[AutoMood] Camera closed");
  }, []);

  // ── Single mood-check cycle ──

  const runMoodCheck = useCallback(async () => {
    if (isRunningRef.current) {
      console.log("[AutoMood] Check already running, skipping.");
      return;
    }
    isRunningRef.current = true;
    readingsRef.current = [];

    try {
      // 1. Open camera
      const ok = await openCamera();
      if (!ok) { isRunningRef.current = false; return; }

      // 2. Load models
      await ensureModels();

      // 3. Wait 2 s warmup
      await new Promise((r) => setTimeout(r, 2000));

      // 4. Collect 5 readings at 500 ms intervals
      await new Promise<void>((resolve) => {
        let count = 0;
        const maxAttempts = 20; // 10 seconds max
        let attempts = 0;

        detectionTimerRef.current = setInterval(async () => {
          attempts++;
          const video = videoRef.current;
          if (!video || video.readyState < 4 || video.videoWidth === 0) {
            console.log(`[AutoMood] Frame ${attempts}: video not ready (readyState=${video?.readyState})`);
            if (attempts >= maxAttempts) {
              console.log("[AutoMood] Max attempts reached, aborting.");
              if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
              resolve();
            }
            return;
          }

          try {
            const det = await faceapi
              .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({
                inputSize: 224,
                scoreThreshold: 0.3, // lowered for better detection
              }))
              .withFaceExpressions();

            if (det) {
              const score = mapExpressionsToScore(det.expressions);
              readingsRef.current.push(score);
              count++;
              console.log(
                `[AutoMood] ✅ Reading ${count}/5: score=${score.toFixed(2)} (${getMoodCategory(score)})`
              );
            } else {
              console.log(`[AutoMood] Frame ${attempts}: no face detected`);
            }
          } catch (err) {
            console.error("[AutoMood] Detection error:", err);
          }

          if (count >= 5 || attempts >= maxAttempts) {
            if (detectionTimerRef.current) clearInterval(detectionTimerRef.current);
            resolve();
          }
        }, 500);
      });

      // 5. Process readings
      if (readingsRef.current.length >= 3) {
        const sorted = [...readingsRef.current].sort((a, b) => a - b);
        // Remove outliers if we have enough
        if (sorted.length >= 5) {
          sorted.shift();
          sorted.pop();
        }
        const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
        const mood = getMoodCategory(avg);

        console.log(`[AutoMood] 🎯 Final: score=${avg.toFixed(2)}, mood=${mood}`);

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
        console.log(
          `[AutoMood] Only ${readingsRef.current.length} readings — not enough, skipping.`
        );
      }
    } catch (err) {
      console.error("[AutoMood] runMoodCheck error:", err);
    } finally {
      closeCamera();
    }
  }, [openCamera, closeCamera]);

  // ── Schedule checks when active ──

  useEffect(() => {
    if (!isActive) {
      console.log("[AutoMood] Toggle OFF");
      closeCamera();
      if (checkTimerRef.current) { clearTimeout(checkTimerRef.current); checkTimerRef.current = null; }
      if (checkIntervalRef.current) { clearInterval(checkIntervalRef.current); checkIntervalRef.current = null; }
      return;
    }

    console.log(
      `[AutoMood] Toggle ON — first check in 3 s, then every ${intervalMinutes} min`
    );

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
