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
  ShieldAlert,
  Bell,
  Clock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { SignInButton } from "@/components/auth/sign-in-button";
import { useSession } from "@/lib/contexts/session-context";

export function Header() {
  const { isAuthenticated, logout, user } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Fetch self-care and clinical notifications
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let active = true;

    const loadUserNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        // 1. Fetch escalation/cooldown status
        const statusRes = await fetch("/api/emergency/status", { headers });
        const statusData = statusRes.ok ? await statusRes.json() : null;

        // 2. Fetch mood history to see if logged today
        const moodRes = await fetch("/api/mood/history?limit=1", { headers });
        const moodData = moodRes.ok ? await moodRes.json() : null;

        if (!active) return;

        const compiled: any[] = [];

        // Cooldown notification (Active Cooldown Period)
        if (statusData?.onCooldown) {
          compiled.push({
            id: "cooldown",
            title: "Recovery Cooldown Active",
            message: `Your clinical cooldown is active. Take this time to reflect. Active until ${new Date(statusData.cooldownExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            type: "SAFETY",
            actionUrl: "/dashboard",
          });
        }

        // Setup emergency contacts reminder
        if (statusData && statusData.contactCount === 0) {
          compiled.push({
            id: "no-contacts",
            title: "Configure Safety Plan",
            message: "For your safety, please add at least one emergency contact to your settings.",
            type: "EXERCISE",
            actionUrl: "/settings/emergency",
          });
        }

        // Daily Mood check-in nudge
        let loggedToday = false;
        if (moodData && moodData.length > 0) {
          const lastMoodDate = new Date(moodData[0].timestamp || moodData[0].createdAt).toDateString();
          const todayDate = new Date().toDateString();
          if (lastMoodDate === todayDate) {
            loggedToday = true;
          }
        }

        if (!loggedToday) {
          compiled.push({
            id: "mood-nudge",
            title: "Daily Mood Nudge",
            message: "You haven't checked in with your mood today. Take 15 seconds to reflect.",
            type: "MOOD_CHECK",
            actionUrl: "/dashboard?action=mood",
          });
        }

        // Calming exercise nudge (Nurturing)
        compiled.push({
          id: "wellness-grounding",
          title: "Mindful Grounding",
          message: "Feeling stressed? Try a quick 5-4-3-2-1 grounding activity to ease your mind.",
          type: "COOLDOWN",
          actionUrl: "/dashboard?action=breathing",
        });

        // Check dismissed notifications from localStorage
        const dismissedRaw = localStorage.getItem("patient_dismissed_notifications");
        const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];

        // Only display notifications that have NOT been dismissed
        const visibleCompiled = compiled.filter((n: any) => !dismissedIds.includes(n.id));

        setNotifications(visibleCompiled);
        setUnreadCount(visibleCompiled.length);
      } catch (err) {
        console.error("Error loading user notifications:", err);
      }
    };

    loadUserNotifications();
    const interval = setInterval(loadUserNotifications, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleDismissNotification = (id: string) => {
    const dismissedRaw = localStorage.getItem("patient_dismissed_notifications");
    const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
    if (!dismissedIds.includes(id)) {
      dismissedIds.push(id);
      localStorage.setItem("patient_dismissed_notifications", JSON.stringify(dismissedIds));
    }
    setNotifications(prev => prev.filter((n: any) => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = () => {
    const dismissedRaw = localStorage.getItem("patient_dismissed_notifications");
    const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
    
    notifications.forEach((n: any) => {
      if (!dismissedIds.includes(n.id)) {
        dismissedIds.push(n.id);
      }
    });
    
    localStorage.setItem("patient_dismissed_notifications", JSON.stringify(dismissedIds));
    setNotifications([]);
    setUnreadCount(0);
  };

  const navItems = [
    { href: "/features", label: "Features" },
    { href: "/about", label: "About AuraPulse" },
  ];

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="w-full fixed top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="absolute inset-0 border-b border-primary/10" />

      <header ref={menuRef} className="relative max-w-screen-2xl mx-auto px-4 md:px-20">
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

              {/* EMERGENCY SETTINGS (DESKTOP) */}
              {isAuthenticated && (
                <Link
                  href="/settings/emergency"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition-colors relative group flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Emergency
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                </Link>
              )}
            </nav>

            <ThemeToggle />

            {/* USER NOTIFICATIONS */}
            {isAuthenticated && (
              <div className="relative" ref={notifDropdownRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowNotifDropdown(!showNotifDropdown);
                  }}
                  className="relative rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors cursor-pointer active:scale-95"
                >
                  <Bell className="w-5 h-5 text-primary" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse border-2 border-background" />
                  )}
                </Button>

                {showNotifDropdown && (
                  <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 w-auto sm:w-96 top-16 sm:top-auto sm:mt-3 bg-card border border-primary/10 rounded-xl shadow-2xl overflow-hidden z-50 py-2">
                    <div className="px-4 py-2 border-b border-primary/5 flex justify-between items-center bg-card">
                      <span className="text-xs font-semibold text-foreground">Notifications</span>
                      {notifications.length > 0 && (
                        <button 
                          onClick={handleMarkAllAsRead}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-[320px] overflow-y-auto divide-y divide-primary/5">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-xs text-muted-foreground/60">
                          <CheckCircle2 className="w-8 h-8 text-primary/30 mx-auto mb-2" />
                          All caught up on your notifications!
                        </div>
                      ) : (
                        notifications.map((notif: any) => {
                          let IconComp = Sparkles;
                          let iconColor = "text-primary";
                          let bgIconColor = "bg-primary/10";

                          if (notif.type === "SAFETY") {
                            IconComp = ShieldAlert;
                            iconColor = "text-red-500";
                            bgIconColor = "bg-red-500/10";
                          } else if (notif.type === "MOOD_CHECK") {
                            IconComp = MessageCircle;
                            iconColor = "text-amber-500";
                            bgIconColor = "bg-amber-500/10";
                          } else if (notif.type === "COOLDOWN") {
                            IconComp = Clock;
                            iconColor = "text-blue-500";
                            bgIconColor = "bg-blue-500/10";
                          } else if (notif.type === "EXERCISE") {
                            IconComp = User;
                            iconColor = "text-green-500";
                            bgIconColor = "bg-green-500/10";
                          }

                          return (
                            <Link
                              key={notif.id}
                              href={notif.actionUrl}
                              onClick={() => {
                                setShowNotifDropdown(false);
                                handleDismissNotification(notif.id);
                              }}
                              className="p-3 hover:bg-primary/5 cursor-pointer transition-colors flex gap-3 items-start block"
                            >
                              <div className={`w-8 h-8 rounded-lg ${bgIconColor} flex items-center justify-center flex-shrink-0 border border-primary/5`}>
                                <IconComp className={`w-4 h-4 ${iconColor}`} />
                              </div>
                              <div className="overflow-hidden flex-1">
                                <h4 className="text-xs font-semibold text-foreground leading-none mb-1">
                                  {notif.title}
                                </h4>
                                <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">
                                  {notif.message}
                                </p>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                  className="hidden md:flex px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors items-center gap-2"
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
          <div className="md:hidden border-t border-primary/10 max-h-[calc(100vh-4rem)] overflow-y-auto">
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

              {/* EMERGENCY SETTINGS (MOBILE) */}
              {isAuthenticated && (
                <Link
                  href="/settings/emergency"
                  onClick={closeMenu}
                  className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/5 rounded-md transition-colors flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Emergency
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