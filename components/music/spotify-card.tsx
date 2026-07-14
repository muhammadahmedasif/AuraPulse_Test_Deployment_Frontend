import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, ExternalLink } from "lucide-react";
import Image from "next/image";

interface SpotifyPlaylist {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  spotifyUrl: string;
}

interface SpotifyCardProps {
  playlists: SpotifyPlaylist[];
  reason?: string;
}

export function SpotifyCard({ playlists, reason }: SpotifyCardProps) {
  if (!playlists || playlists.length === 0) return null;

  return (
    <div className="mt-4 p-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#181818] to-[#121212] shadow-2xl relative overflow-hidden w-full min-w-0">
      {/* Decorative ambient glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-[#1DB954]/10 blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-3 relative z-10">
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-[#1DB954]">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
        <h4 className="font-bold text-sm text-white tracking-wide truncate">Spotify</h4>
      </div>

      {reason && (
        <p className="text-xs text-zinc-400 mb-3 italic line-clamp-2 break-words relative z-10">
          {reason}
        </p>
      )}

      <div className="space-y-2 relative z-10 min-w-0">
        {playlists.map((playlist) => (
          <a
            key={playlist.id}
            href={playlist.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2.5 rounded-xl bg-[#282828]/50 hover:bg-[#282828] transition-colors group cursor-pointer w-full overflow-hidden min-w-0"
          >
            {/* Album art */}
            <div className="relative w-11 h-11 rounded-md overflow-hidden shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
              {playlist.imageUrl ? (
                <Image
                  src={playlist.imageUrl}
                  alt={playlist.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#383838] flex items-center justify-center">
                  <Music className="w-5 h-5 text-[#b3b3b3]" />
                </div>
              )}
            </div>

            {/* Text content — critically important: min-w-0 + overflow-hidden to prevent stretching */}
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate group-hover:text-[#1DB954] transition-colors leading-tight">
                {playlist.title}
              </p>
              <p className="text-xs text-[#b3b3b3] truncate mt-0.5 leading-tight">
                {playlist.description || "Spotify Playlist"}
              </p>
            </div>

            {/* External link icon */}
            <ExternalLink className="w-4 h-4 text-[#b3b3b3] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  );
}
