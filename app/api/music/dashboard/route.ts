import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/getBackendUrl";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const BACKEND_API_URL = getBackendUrl();
    const response = await fetch(`${BACKEND_API_URL}/music/dashboard`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      // Do not cache to ensure we get the latest results every time
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard music proxy error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
