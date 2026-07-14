export interface SpotifyPlaylist {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  spotifyUrl: string;
}

export interface DashboardMusicResponse {
  success: boolean;
  query: string;
  playlists: SpotifyPlaylist[];
}

const getAuthHeader = (): Record<string, string> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getDashboardMusic = async (): Promise<DashboardMusicResponse> => {
  try {
    const response = await fetch(`/api/music/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard music");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching dashboard music:", error);
    return { success: false, query: "", playlists: [] };
  }
};
