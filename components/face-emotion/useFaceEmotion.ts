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

  const startCamera = async () => {
    try {
      setIsInitializing(true);
      setError(null);
      readingsRef.current = [];
      setIsStable(false);
      isStableRef.current = false;
      setLiveScore(null);
      setLiveMood(null);

      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
      
      await initializeFaceApi();
      
      startTimeRef.current = Date.now();
      startDetection();
    } catch (err: any) {
      console.error(err);
      setError('Could not access camera or load models.');
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startDetection = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    
    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || isStableRef.current) return;
      
      // Ignore first 1.5 seconds for warmup
      if (Date.now() - startTimeRef.current < 1500) return;

      try {
        const expressions = await detectEmotion(videoRef.current);
        if (expressions) {
          const score = mapExpressionsToMoodScore(expressions);
          setLiveScore(score);
          setLiveMood(getMoodCategory(score));

          readingsRef.current.push(score);

          // Need 5 samples
          if (readingsRef.current.length >= 5) {
            finalizeReadings();
          }
        }
      } catch (err) {
        console.error('Detection error:', err);
      }
    }, 400); // Sample every 400ms
  };

  const finalizeReadings = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    
    const readings = [...readingsRef.current];
    // Remove outliers (sort, remove lowest and highest)
    if (readings.length >= 5) {
      readings.sort((a, b) => a - b);
      readings.shift(); // remove lowest
      readings.pop();   // remove highest
    }
    
    const average = readings.reduce((a, b) => a + b, 0) / readings.length;
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
