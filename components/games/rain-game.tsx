"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CloudRain, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

const SESSION_DURATION = 5 * 60; // 5 minutes in seconds

// Raindrops for animation
const DROPS = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 3,
  duration: 1.5 + Math.random() * 1.5,
  opacity: 0.1 + Math.random() * 0.3,
  length: 6 + Math.random() * 8,
}));

export function RainGame() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio("/sounds/rain sound.mp3");
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          setProgress(((SESSION_DURATION - newTime) / SESSION_DURATION) * 100);
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-[400px] space-y-8">
      {/* Visual: rain scene */}
      <div className="relative w-48 h-48 overflow-hidden rounded-full">
        {/* Sky gradient */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-indigo-900/80 via-slate-700/60 to-slate-800/80" />

        {/* Glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-indigo-400/5 blur-xl"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Raindrops */}
        {isPlaying &&
          DROPS.map((drop) => (
            <motion.div
              key={drop.id}
              className="absolute rounded-full bg-sky-200/50"
              style={{
                left: `${drop.x}%`,
                top: 0,
                width: 1,
                height: drop.length,
              }}
              animate={{ y: ["-10%", "110%"], opacity: [0, drop.opacity, 0] }}
              transition={{
                duration: drop.duration,
                repeat: Infinity,
                delay: drop.delay,
                ease: "linear",
              }}
            />
          ))}

        {/* Cloud icon centered */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={isPlaying ? { scale: [1, 1.02, 1], y: [0, -2, 0] } : {}}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <CloudRain
              className="w-20 h-20"
              style={{ color: "#94a3b8", filter: "drop-shadow(0 0 6px #475569)" }}
            />
          </motion.div>
        </div>

        {/* Ripple rings at the bottom */}
        {isPlaying && (
          <>
            {[0, 1.2, 2.4].map((delay) => (
              <motion.div
                key={delay}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-sky-200/20"
                style={{ width: 16, height: 4 }}
                animate={{ scaleX: [1, 2.5], scaleY: [1, 1.5], opacity: [0.3, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, delay, ease: "easeOut" }}
              />
            ))}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="w-64 space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Volume</span>
            <span>{volume}%</span>
          </div>
          <div className="flex items-center gap-2">
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <Slider
              value={[volume]}
              onValueChange={(value) => setVolume(value[0])}
              max={100}
              step={1}
            />
          </div>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{formatTime(timeLeft)}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlay}
            className="rounded-full border-indigo-400/40 hover:bg-indigo-500/10"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            {formatTime(SESSION_DURATION)}
          </span>
        </div>
      </div>
    </div>
  );
}
