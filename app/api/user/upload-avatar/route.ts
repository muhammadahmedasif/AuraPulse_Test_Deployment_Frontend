import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const BACKEND_API_URL = process.env.BACKEND_API_URL;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const formData = await req.formData();
    
    // We need to forward the multipart form data to the backend
    const response = await fetch(`${BACKEND_API_URL}/user/upload-avatar`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error uploading avatar proxy:", error);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}
