"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Flame, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

const SESSION_DURATION = 5 * 60; // 5 minutes in seconds

// Ember/spark particles for animation
const SPARKS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: 40 + Math.random() * 20,
  delay: Math.random() * 3,
  duration: 2.5 + Math.random() * 2,
  size: 1.5 + Math.random() * 2,
}));

// Stars
const STARS = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 50,
  delay: Math.random() * 4,
  size: 1 + Math.random() * 1.5,
}));

// Flame layers
const FLAME_LAYERS = [
  { scale: 1,    color: "#ea580c", blur: 2,  y: 0  },
  { scale: 0.75, color: "#d97706", blur: 4,  y: 6  },
  { scale: 0.5,  color: "#fcd34d", blur: 6,  y: 14 },
];

export function CampfireGame() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio("/sounds/campfire.mp3");
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
      {/* Visual: campfire scene */}
      <div className="relative w-48 h-48 overflow-hidden rounded-full">
        {/* Night sky gradient */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-slate-900/95 via-slate-800/80 to-amber-950/40" />

        {/* Stars */}
        {STARS.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={isPlaying ? { opacity: [0.1, 0.6, 0.1] } : { opacity: 0.2 }}
            transition={{
              duration: 3 + star.delay,
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Warm ground glow */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 rounded-full"
          style={{ background: "radial-gradient(ellipse, #ea580c88, transparent 70%)" }}
          animate={isPlaying ? { opacity: [0.3, 0.6, 0.3], scaleX: [1, 1.05, 1] } : { opacity: 0.2 }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Flame layers */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-90">
          {FLAME_LAYERS.map((layer, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{
                width: 32 * layer.scale,
                height: 40 * layer.scale,
                background: `radial-gradient(ellipse at bottom, ${layer.color}, transparent)`,
                filter: `blur(${layer.blur}px)`,
                marginBottom: -layer.y,
              }}
              animate={
                isPlaying
                  ? {
                      scaleX: [1, 1.05, 0.95, 1.05, 1],
                      scaleY: [1, 1.03, 1.08, 0.98, 1],
                    }
                  : {}
              }
              transition={{
                duration: 2 + i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          ))}

          {/* Flame icon on top */}
          <motion.div
            className="mt-1"
            animate={isPlaying ? { scale: [1, 1.03, 0.98, 1.02, 1] } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame
              className="w-10 h-10"
              style={{ color: "#f97316", filter: "drop-shadow(0 0 8px #ea580c)" }}
            />
          </motion.div>
        </div>

        {/* Floating sparks/embers */}
        {isPlaying &&
          SPARKS.map((spark) => (
            <motion.div
              key={spark.id}
              className="absolute rounded-full bg-orange-300/80"
              style={{
                left: `${spark.x}%`,
                bottom: "30%",
                width: spark.size,
                height: spark.size,
              }}
              animate={{
                y: [0, -(40 + Math.random() * 30)],
                x: [0, (Math.random() - 0.5) * 20],
                opacity: [0.6, 0],
                scale: [1, 0.5],
              }}
              transition={{
                duration: spark.duration,
                repeat: Infinity,
                delay: spark.delay,
                ease: "easeOut",
              }}
            />
          ))}
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
            className="rounded-full border-amber-500/40 hover:bg-amber-500/10"
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
