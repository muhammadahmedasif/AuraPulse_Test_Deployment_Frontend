"use client";

import { WeeklySummary } from "@/components/progress/weekly-summary";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ProgressPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 container mx-auto px-4 py-24 max-w-5xl">
        <div className="flex items-center mb-8 gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Progress</h1>
            <p className="text-muted-foreground mt-1">Track your mood, activities, and therapy sessions over time.</p>
          </div>
        </div>

        <WeeklySummary />
      </main>
    </div>
  );
}
