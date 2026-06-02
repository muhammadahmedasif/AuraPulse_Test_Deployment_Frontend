"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { FaceEmotionModal } from './FaceEmotionModal';

interface FaceEmotionLauncherProps {
  onMoodConfirmed: (score: number, mood: string) => void;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  text?: string;
}

export function FaceEmotionLauncher({ 
  onMoodConfirmed, 
  className = "", 
  variant = "outline",
  text = "Use Camera Mood" 
}: FaceEmotionLauncherProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button 
        type="button" 
        variant={variant} 
        className={className}
        onClick={() => setIsModalOpen(true)}
      >
        <Camera className="w-4 h-4 mr-2" />
        {text}
      </Button>

      <FaceEmotionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={onMoodConfirmed}
      />
    </>
  );
}
