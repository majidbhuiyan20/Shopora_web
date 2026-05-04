import { LoginForm } from "./login-form";

export function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-[#d9e4dc] bg-surface shadow-2xl shadow-[#153820]/10 md:grid-cols-[1fr_1.08fr]">
        <div className="flex min-h-[420px] flex-col justify-between bg-primary px-8 py-9 text-primary-foreground sm:px-10">
          <div>
            <div className="mb-12 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-black">
              S
            </div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.22em] text-white/70">
              Shopora Admin
            </p>
            <h1 className="max-w-sm text-4xl font-black leading-tight sm:text-5xl">
              Premium control for your store.
            </h1>
          </div>

          <div className="mt-12 grid gap-4 text-sm text-white/78 sm:grid-cols-2">
            <div className="rounded-xl border border-white/15 bg-white/10 p-4">
              <p className="text-2xl font-black text-white">24/7</p>
              <p className="mt-1">Admin access</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-4">
              <p className="text-2xl font-black text-white">Secure</p>
              <p className="mt-1">Protected dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-primary">
                Welcome back
              </p>
              <h2 className="text-3xl font-black text-ink">Sign in</h2>
              <p className="mt-3 text-sm leading-6 text-ink/60">
                Enter your admin credentials to continue to the management
                dashboard.
              </p>
            </div>

            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
