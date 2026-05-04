import type { LoginCredentials, LoginResponse } from "../types";

export async function loginAdmin(
  credentials: LoginCredentials,
): Promise<LoginResponse> {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
        : "Login failed. Please check your credentials.";

    throw new Error(message);
  }

  return data as LoginResponse;
}
