"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider as CustomSessionProvider } from "@/lib/contexts/session-context";
import { AuthGuard } from "@/components/auth/auth-guard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CustomSessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthGuard>
          {children}
        </AuthGuard>
      </ThemeProvider>
    </CustomSessionProvider>
  );
}
