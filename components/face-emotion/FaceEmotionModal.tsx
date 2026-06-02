import React, { useEffect } from 'react';
import { useFaceEmotion } from './useFaceEmotion';
import { Button } from '@/components/ui/button';
import { X, Camera, RefreshCcw, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface FaceEmotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (score: number, mood: string) => void;
}

export function FaceEmotionModal({ isOpen, onClose, onConfirm }: FaceEmotionModalProps) {
  const {
    videoRef,
    isInitializing,
    error,
    liveScore,
    liveMood,
    isStable,
    startCamera,
    stopCamera,
    retry
  } = useFaceEmotion();

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (liveScore !== null && liveMood) {
      onConfirm(liveScore, liveMood);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Camera Mood Detection</DialogTitle>
          <DialogDescription>
            Look into the camera. We'll analyze your facial expression to suggest a mood.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${!isInitializing && !error ? 'opacity-100' : 'opacity-0'}`}
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          
          {isInitializing && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm text-sm">
              <Camera className="w-8 h-8 mb-2 animate-pulse" />
              <p>Starting camera...</p>
            </div>
          )}

          {!isInitializing && !isStable && !error && liveScore !== null && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur px-4 py-2 rounded-full text-sm font-medium">
              Detecting... {liveMood} ({Math.round(liveScore * 100)}%)
            </div>
          )}
          
          {isStable && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-10">
              <div className="text-center mb-6">
                <p className="text-muted-foreground mb-1">Suggested Mood</p>
                <h3 className="text-3xl font-bold capitalize text-primary">{liveMood}</h3>
                <p className="text-xl mt-2">{Math.round(liveScore! * 100)} / 100</p>
              </div>
              
              <div className="flex gap-4">
                <Button variant="outline" onClick={retry}>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                <Button onClick={handleConfirm}>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground text-center mt-2">
          Note: Camera mood is supplementary and not medically reliable.
        </p>
      </DialogContent>
    </Dialog>
  );
}
