import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VoiceState } from "@/lib/hooks/useVoiceAgent";

interface MicButtonProps {
  state: VoiceState;
  onClick: () => void;
  disabled?: boolean;
  size?: "default" | "lg" | "icon";
  className?: string;
}

export function MicButton({
  state,
  onClick,
  disabled = false,
  size = "default",
  className,
}: MicButtonProps) {
  const isActive = state === "listening";
  const isProcessing = state === "processing";
  const isSpeaking = state === "speaking";

  const getButtonVariant = () => {
    if (isActive) return "destructive";
    if (disabled) return "outline";
    return "default";
  };

  const getIcon = () => {
    if (isProcessing) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (isSpeaking) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (isActive) return <Square className="w-4 h-4" />;
    return <Mic className="w-4 h-4" />;
  };

  const getLabel = () => {
    if (isProcessing) return "Processing...";
    if (isSpeaking) return "Speaking...";
    if (isActive) return "Stop";
    return "Listen";
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={getButtonVariant()}
      size={size}
      className={cn(
        "gap-2",
        isActive && "bg-red-500 hover:bg-red-600",
        className
      )}
    >
      {getIcon()}
      {size !== "icon" && getLabel()}
    </Button>
  );
}
