import type { ApiResponse } from "../types";

const TOKEN_KEY = "shopora_admin_token";

export function getAdminToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export async function adminRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getAdminToken();
  const response = await fetch(`/api/admin/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? "Request failed.");
  }

  return data;
}
