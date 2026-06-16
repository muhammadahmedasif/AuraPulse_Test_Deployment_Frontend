"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/lib/contexts/session-context";
import { Loader2 } from "lucide-react";

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/about",
  "/features"
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (loading) return; // Wait for session check to complete

    const isPublicRoute = publicRoutes.includes(pathname);

    if (!isAuthenticated && !isPublicRoute) {
      // User is not logged in and trying to access a protected route
      router.replace("/login");
    } else if (isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
      // User is already logged in, no need to see login/signup pages
      router.replace("/dashboard");
    } else {
      // Allowed to view the route
      setIsReady(true);
    }
  }, [isAuthenticated, loading, pathname, router]);

  // Show a loading state while checking authentication or if we are about to redirect
  if (loading || !isReady) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
