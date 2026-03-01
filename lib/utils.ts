import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parse a fetch Response as JSON. Avoids "Unexpected token '<'" when the
 * server returns HTML (e.g. 404, 500, or auth redirect) instead of JSON.
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    const status = response.status;
    throw new Error(
      status === 404
        ? "API route not found. Check that the server is running and the URL is correct."
        : status === 401 || status === 403
          ? "Please sign in to continue."
          : `Server returned an error (${status}). Please try again or contact support.`
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid response from server: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? "…" : ""}`);
  }
}
