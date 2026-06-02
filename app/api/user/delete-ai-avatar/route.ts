import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/getBackendUrl";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const BACKEND_API_URL = getBackendUrl();
    const response = await fetch(`${BACKEND_API_URL}/user/delete-ai-avatar`, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error deleting AI avatar proxy:", error);
    return NextResponse.json({ error: "Failed to delete AI avatar. Backend API is unavailable." }, { status: 500 });
  }
}
