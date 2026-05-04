"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  MessageCircle,
  AudioWaveform,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { SignInButton } from "@/components/auth/sign-in-button";
import { useSession } from "@/lib/contexts/session-context";

export function Header() {
  const { isAuthenticated, logout, user } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const navItems = [
    { href: "/features", label: "Features" },
    { href: "/about", label: "About AuraPulse" },
  ];

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="w-full fixed top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="absolute inset-0 border-b border-primary/10" />

      <header ref={menuRef} className="relative max-w-6xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">

          {/* LOGO */}
          <Link href="/" className="flex items-center space-x-2 transition-opacity hover:opacity-80">
            <AudioWaveform className="h-7 w-7 text-primary animate-pulse-gentle" />
            <div className="flex flex-col">
              <span className="font-semibold text-lg bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                AuraPulse
              </span>
              <span className="text-xs dark:text-muted-foreground">
                Your mental health Companion
              </span>
            </div>
          </Link>

          {/* RIGHT */}
          <div className="flex items-center gap-4">

            {/* DESKTOP NAV */}
            <nav className="hidden md:flex items-center space-x-1">

              {/* FEATURES + ABOUT (RESTORED UNDERLINE) */}
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                >
                  {item.label}
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                </Link>
              ))}

              {/* PROFILE (UNDERLINE RESTORED) */}
              {isAuthenticated && (
                <Link
                  href="/profile"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group flex items-center gap-2"
                >
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt="profile"
                      className="w-6 h-6 rounded-full object-cover border border-primary/20"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  Profile

                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                </Link>
              )}
            </nav>

            <ThemeToggle />

            {/* AUTH */}
            {isAuthenticated ? (
              <>
                <Button asChild className="hidden md:flex gap-2 bg-primary/90 hover:bg-primary">
                  <Link href="/dashboard">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Dashboard
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  onClick={logout}
                  className="hidden md:flex px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <SignInButton />
            )}

            {/* MOBILE TOGGLE */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-primary/10">
            <nav className="flex flex-col space-y-1 py-4">

              {/* FEATURES + ABOUT (NO UNDERLINE NEEDED MOBILE STYLE) */}
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-md transition-colors"
                >
                  {item.label}
                </Link>
              ))}

              {/* DASHBOARD */}
              {isAuthenticated && (
                <Link
                  href="/dashboard"
                  onClick={closeMenu}
                  className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-md transition-colors flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Dashboard
                </Link>
              )}

              {/* PROFILE (FIXED IMAGE + CLEAN UI) */}
              {isAuthenticated && (
                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-md transition-colors flex items-center gap-2"
                >
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt="profile"
                      className="w-5 h-5 rounded-full object-cover border border-primary/20"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  Profile
                </Link>
              )}

              {/* SIGNOUT (FIXED ALIGNMENT) */}
              {isAuthenticated && (
                <button
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                  className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-md transition-colors flex items-center gap-2 w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              )}
            </nav>
          </div>
        )}
      </header>
    </div>
  );
}