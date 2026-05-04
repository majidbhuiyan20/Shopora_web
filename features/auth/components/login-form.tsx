"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { loginAdmin } from "../api/login";
import type { LoginCredentials } from "../types";

const initialCredentials: LoginCredentials = {
  email: "majid.bhuiyan20@gmail.com",
  password: "admin123",
};

export function LoginForm() {
  const router = useRouter();
  const [credentials, setCredentials] =
    useState<LoginCredentials>(initialCredentials);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await loginAdmin(credentials);
      const token = response.data?.token ?? response.token;

      if (token) {
        window.localStorage.setItem("shopora_admin_token", token);
      }

      setStatus("success");
      setMessage(response.data?.message ?? response.message ?? "Login successful.");
      router.push("/home");
      router.refresh();
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
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={credentials.password}
            onChange={(event) =>
              setCredentials((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            className="h-12 w-full rounded-lg border border-[#d9e4dc] bg-white px-4 pr-12 text-base text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            placeholder="Enter password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink/55 transition hover:bg-primary-soft hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="m3 3 18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c5 0 9 4.5 10 8a12.8 12.8 0 0 1-3.2 4.8" />
                <path d="M6.1 6.1A12.2 12.2 0 0 0 2 12c1 3.5 5 8 10 8a10.8 10.8 0 0 0 4.1-.8" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
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
