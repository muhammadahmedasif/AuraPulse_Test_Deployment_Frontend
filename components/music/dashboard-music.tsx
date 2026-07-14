"use client";

import { useEffect, useState } from "react";
import { getDashboardMusic, SpotifyPlaylist } from "@/lib/api/music";
import { SpotifyCard } from "./spotify-card";
import { Loader2, Music } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function DashboardMusic() {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function fetchMusic() {
      setLoading(true);
      try {
        const response = await getDashboardMusic();
        if (response.success) {
          setPlaylists(response.playlists);
          setQuery(response.query);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard music:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMusic();
  }, []);

  return (
    <Card className="border-primary/10 flex flex-col overflow-hidden h-full">
      <CardHeader className="bg-gradient-to-r from-[#1DB954]/10 to-transparent pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="bg-[#1DB954] p-1.5 rounded-full shadow-sm">
            <Music className="w-4 h-4 text-black" />
          </div>
          Music For You
        </CardTitle>
        <CardDescription>
          Curated playlists based on your recent mood tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 bg-background/50 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1DB954]" />
            <p className="text-sm text-muted-foreground animate-pulse">Curating your sounds...</p>
          </div>
        ) : playlists.length > 0 ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground mb-3 px-1">
              Because your mood indicates a need for <strong>{query}</strong>:
            </p>
            {/* Reuse the SpotifyCard but we strip the outer padding since we're already in a Card */}
            <div className="bg-[#121212] rounded-xl overflow-hidden border border-white/5 shadow-inner">
               <SpotifyCard playlists={playlists} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4">
            <Music className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              We couldn't fetch music recommendations right now. Please try again later.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
