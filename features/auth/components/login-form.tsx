"use client";

import { FormEvent, useState } from "react";
import { loginAdmin } from "../api/login";
import type { LoginCredentials } from "../types";

const initialCredentials: LoginCredentials = {
  email: "majid.bhuiyan20@gmail.com",
  password: "admin123",
};

export function LoginForm() {
  const [credentials, setCredentials] =
    useState<LoginCredentials>(initialCredentials);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await loginAdmin(credentials);
      setStatus("success");
      setMessage(response.message ?? "Login successful.");
    } catch (error) {
      setStatus("idle");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-semibold text-ink/80"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={credentials.email}
          onChange={(event) =>
            setCredentials((current) => ({
              ...current,
              email: event.target.value,
            }))
          }
          className="h-12 w-full rounded-lg border border-[#d9e4dc] bg-white px-4 text-base text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          placeholder="admin@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="text-sm font-semibold text-ink/80"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={credentials.password}
          onChange={(event) =>
            setCredentials((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          className="h-12 w-full rounded-lg border border-[#d9e4dc] bg-white px-4 text-base text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          placeholder="Enter password"
          required
        />
      </div>

      {message ? (
        <p
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            status === "success"
              ? "bg-primary-soft text-primary"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="h-12 w-full rounded-lg bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-[#0b6830] focus:outline-none focus:ring-4 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "loading" ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
