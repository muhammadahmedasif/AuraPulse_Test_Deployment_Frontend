/**
 * Get the backend API URL from environment variables
 * Prioritizes BACKEND_API_URL, then falls back to NEXT_PUBLIC_API_URL
 * @returns The backend API URL
 * @throws Error if neither environment variable is set
 */
export function getBackendUrl(): string {
  const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!backendUrl) {
    throw new Error(
      "Backend API URL not configured. Set BACKEND_API_URL or NEXT_PUBLIC_API_URL environment variable."
    );
  }

  return backendUrl;
}
