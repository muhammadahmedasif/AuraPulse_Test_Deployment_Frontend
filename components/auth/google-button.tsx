import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface GoogleButtonProps {
  onSuccess: (token: string) => void;
  onError: (error: any) => void;
  text?: string;
}

export function GoogleButton({ onSuccess, onError, text = "Continue with Google" }: GoogleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setIsLoading(true);
      onSuccess(tokenResponse.access_token);
    },
    onError: (error) => {
      setIsLoading(false);
      onError(error);
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full py-2 text-base rounded-xl font-bold bg-card text-foreground border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 shadow-sm"
      onClick={() => {
        setIsLoading(true);
        // useGoogleLogin will handle the popup, if user closes it without logging in we should reset loading
        // We'll set a timeout to reset loading just in case the popup fails to trigger onError
        setTimeout(() => setIsLoading(false), 30000); 
        login();
      }}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <svg
          className="mr-3 h-5 w-5"
          aria-hidden="true"
          focusable="false"
          data-prefix="fab"
          data-icon="google"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 488 512"
        >
          <path
            fill="currentColor"
            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
          ></path>
        </svg>
      )}
      {text}
    </Button>
  );
}
