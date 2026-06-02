"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { getWeeklyProgress, WeeklyProgressResponse } from "@/lib/api/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Activity, Clock, HeartPulse, Flame } from "lucide-react";

export function WeeklySummary() {
  const [data, setData] =
    useState<WeeklyProgressResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getWeeklyProgress();
        if (response.success) {
          setData(response.data);
        } else {
          setError("Failed to fetch progress data");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-destructive">
        {error || "No data available"}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalActivities}
            </div>
            <p className="text-xs text-muted-foreground">Total this week</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalDuration}{" "}
              <span className="text-lg">min</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Time spent active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Therapy</CardTitle>
            <HeartPulse className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.therapySessionsCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Sessions this week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {data.summary.currentStreak}{" "}
              <span className="text-lg">days</span>
            </div>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Mood Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Mood Trends</CardTitle>
            <CardDescription>
              Your average mood score over the last 7 days
            </CardDescription>
          </CardHeader>

          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dailyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.3}
                />
                <XAxis
                  dataKey="dayLabel"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "hsl(222, 47%, 11%)",
                    color: "#e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    padding: "8px 12px",
                  }}
                  labelStyle={{
                    color: "#94a3b8",
                    marginBottom: "4px",
                  }}
                  formatter={(value: unknown) => {
                    const num =
                      typeof value === "number" ? value : 0;
                    return [`${Math.round(num)}/100`, "Mood"];
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="averageMood"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Activity Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Volume</CardTitle>
            <CardDescription>
              Number of activities completed per day
            </CardDescription>
          </CardHeader>

          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  opacity={0.3}
                />
                <XAxis
                  dataKey="dayLabel"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "hsl(222, 47%, 11%)",
                    color: "#e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                    padding: "8px 12px",
                  }}
                  labelStyle={{
                    color: "#94a3b8",
                    marginBottom: "4px",
                  }}
                  formatter={(value: unknown) => {
                    const num =
                      typeof value === "number" ? value : 0;
                    return [num, "Activities"];
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />

                <Bar
                  dataKey="activitiesCount"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}