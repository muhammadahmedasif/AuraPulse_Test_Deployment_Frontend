import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_API_URL = process.env.BACKEND_API_URL;

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

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
    return NextResponse.json({ error: "Failed to delete AI avatar" }, { status: 500 });
  }
}
