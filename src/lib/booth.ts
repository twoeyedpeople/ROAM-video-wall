/**
 * The browser's half of the booth wire.
 *
 * Every call goes to `/api/booth/<name>`, same-origin, and `src/app/api/booth/[...path]`
 * forwards it. The browser holds this app's display token and nothing else; the booth's
 * `WALL_ACCESS_TOKEN` is swapped in on the server and never reaches the screen. The same
 * shape as `roam-tablet/src/lib/booth.ts`.
 */

export class BoothError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BoothError";
    this.status = status;
  }
}

/**
 * The display token arrives once in the URL (`?token=`), is kept, and is stripped from the
 * address bar. `localStorage` is what lets a kiosked browser reload, or the wall's own
 * scheduled reload, without anyone retyping the link.
 */
const TOKEN_STORAGE_KEY = "roam:wall-display-token";

let cachedToken: string | null = null;

export function readDisplayToken(): string {
  if (cachedToken !== null) return cachedToken;
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);
  const fromUrl = (params.get("token") || "").trim();

  if (fromUrl) {
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, fromUrl);
    } catch {
      // Storage disabled. The token still works for this page view.
    }
    params.delete("token");
    const query = params.toString();
    window.history.replaceState({}, document.title, `${window.location.pathname}${query ? `?${query}` : ""}`);
    cachedToken = fromUrl;
    return cachedToken;
  }

  try {
    cachedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  } catch {
    cachedToken = "";
  }
  return cachedToken;
}

export interface BoothRequest {
  method?: "GET" | "HEAD";
  query?: Record<string, string>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export function boothUrl(endpoint: string, query: Record<string, string> = {}): string {
  const search = new URLSearchParams(query).toString();
  return `/api/booth/${endpoint}${search ? `?${search}` : ""}`;
}

export function boothFetch(endpoint: string, options: BoothRequest = {}): Promise<Response> {
  const { method = "GET", query = {}, headers = {}, signal } = options;
  const token = readDisplayToken();
  return fetch(boothUrl(endpoint, query), {
    method,
    headers: { ...headers, ...(token ? { "x-display-token": token } : {}) },
    cache: "no-store",
    signal,
  });
}

export async function boothJson<T>(endpoint: string, options: BoothRequest = {}): Promise<T> {
  const response = await boothFetch(endpoint, options);
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) message = payload.error;
    } catch {
      // A platform error (a gateway timeout, say) is not JSON. Keep the status.
    }
    throw new BoothError(message, response.status);
  }
  return (await response.json()) as T;
}
