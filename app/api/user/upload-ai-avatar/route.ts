import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/getBackendUrl";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const formData = await req.formData();
    
    const BACKEND_API_URL = getBackendUrl();
    const response = await fetch(`${BACKEND_API_URL}/user/upload-ai-avatar`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error uploading AI avatar proxy:", error);
    return NextResponse.json({ error: "Failed to upload AI avatar. Backend API is unavailable." }, { status: 500 });
  }
}
