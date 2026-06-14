import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendUrl } from "@/lib/getBackendUrl";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const API_URL = getBackendUrl();

    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || "Authentication failed" },
        { status: res.status }
      );
    }

    // Set the token in an HTTP-only cookie if the project uses that, otherwise just return it.
    // The existing /api/auth/login/route.ts likely sets the cookie.
    if (data.token) {
      cookies().set({
        name: "token",
        value: data.token,
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Google login error:", error);
    return NextResponse.json(
      { message: "An error occurred during authentication" },
      { status: 500 }
    );
  }
}
