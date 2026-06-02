export interface DailyProgressData {
  date: string;
  dayLabel: string;
  activitiesCount: number;
  activityDuration: number;
  averageMood: number | null;
}

export interface ProgressSummary {
  totalActivities: number;
  totalDuration: number;
  therapySessionsCount: number;
  currentStreak: number;
}

export interface WeeklyProgressResponse {
  success: boolean;
  data: {
    dailyData: DailyProgressData[];
    summary: ProgressSummary;
  };
}

export async function getWeeklyProgress(): Promise<WeeklyProgressResponse> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated");

  const response = await fetch("/api/progress/weekly", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch weekly progress");
  }

  return response.json();
}
