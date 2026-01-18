const API_BASE = "/api/v1";

let tokenCache: string | null = localStorage.getItem("auth_token");

export function setAuthToken(token: string) {
  tokenCache = token;
  localStorage.setItem("auth_token", token);
}

export function getAuthToken() {
  return tokenCache;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (tokenCache) {
    headers.set("Authorization", `Bearer ${tokenCache}`);
  }
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "request_failed");
  }
  return response.json() as Promise<T>;
}
