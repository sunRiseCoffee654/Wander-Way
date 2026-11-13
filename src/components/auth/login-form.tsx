"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";

interface LoginFormProps {
  onSuccess?: () => void;
  currentUserEmail?: string | null;
  nextPath?: string;
}

export function LoginForm({ onSuccess, currentUserEmail, nextPath }: LoginFormProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = nextPath || searchParams.get("next") || "/";

  const [mode, setMode] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSentNotice, setOtpSentNotice] = useState(false);

  const supabase = createClient();

  const handleEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify`,
      },
    });

    setIsLoading(false);
    if (err) {
      setError(err.message);
      return;
    }

    setOtpSentNotice(true);
    setMode("verify");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    setIsLoading(false);
    if (err) {
      setError(err.message);
      return;
    }

    onSuccess?.();
    router.push(next as Route);
  };

  const handleGoogleSignIn = async () => {
    setError("");
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(
          next,
        )}`,
      },
    });

    if (err) {
      setError(err.message);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-surface text-on-surface">
      <div className="relative w-full min-h-screen flex items-center justify-center">
        {/* Full-screen alpine vista backdrop */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Explorer standing atop alpine mountain peak overlooking a sweeping sea of clouds under bright morning sky"
          className="absolute inset-0 w-full h-full object-cover object-center"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1RF5i0jeukk9On78J9hrEeMHr6IiLHG7M6wswImCFDY6yyMke_A2giW-jBG23xjLUirJxWDKUS9eGdi-ylsYHw7DlR3d8ulPNktiZKT7GtsCLm7ODjLILSqmsaUcEQAYGLqn4OMxkFeyrS4XpaajjD1yjt8QR6gXbnc_HzfnOVr4GPRHoRVUBOBJbKcUZtfRv9wsg2PDl82Jsv6VH86b7NAZIVpzKDGZyPE379c4NaZqmxEcUpSM3og"
        />

        {/* Deep blue and radial contrast overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#001e30]/90 via-[#001e30]/40 to-[#001e30]/30 pointer-events-none" />
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12 py-10 min-h-screen flex flex-col justify-between">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center group py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nav_logo.png"
                alt="WanderWay"
                className="h-10 w-auto max-w-[200px] object-contain drop-shadow-md group-hover:scale-105 transition-transform"
              />
            </Link>
            <span className="px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-xl text-white text-xs font-medium border border-white/30 shadow-md">
              v3.2 Secure
            </span>
          </div>

          {/* Central 2-Column Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 py-8 mt-auto items-end">
            {/* Left Column: Editorial Typography */}
            <div className="lg:col-span-7 flex flex-col gap-6 order-2 lg:order-1 justify-end">
              <div className="flex flex-col gap-3 max-w-xl text-white">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-xl border border-white/25 text-primary-fixed text-xs font-semibold uppercase tracking-widest shadow-sm self-start">
                  <span className="material-symbols-outlined text-[16px]">
                    flight_takeoff
                  </span>
                  <span>Autonomous Voyage Engine</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight drop-shadow-md leading-[1.08]">
                  Escape from <br className="hidden sm:block" />
                  <span className="font-light italic tracking-normal text-primary-fixed">
                    the world.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-white/90 leading-relaxed font-normal max-w-lg drop-shadow-sm pt-2">
                  Discover uncharted horizons, plan with deterministic precision, and
                  travel with total clarity across cloud vault synchronizations.
                </p>
              </div>
            </div>

            {/* Right Column: Frosted Glass Form Card */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end order-1 lg:order-2">
              <div className="w-full max-w-md bg-white/80 dark:bg-stone-900/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/40 dark:border-white/15 text-on-surface ring-1 ring-black/5">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center pb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/nav_logo.png"
                        alt="WanderWay"
                        className="h-9 w-auto max-w-[180px] object-contain"
                      />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-medium text-on-surface tracking-tight">
                      {mode === "request" ? "Welcome back" : "Enter access code"}
                    </h2>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {mode === "request"
                        ? "Sign in to access your itineraries, travel vault, and offline route intelligence."
                        : `We dispatched a 6-digit verification code to ${email}.`}
                    </p>
                  </div>

                  {currentUserEmail && (
                    <div className="p-3 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-between text-xs shadow-2xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                          account_circle
                        </span>
                        <span className="truncate">
                          Signed in as <strong>{currentUserEmail}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href="/trips"
                          className="px-2.5 py-1 rounded-full bg-primary text-on-primary font-semibold hover:bg-primary-hover text-[11px] transition-colors"
                        >
                          Dashboard →
                        </Link>
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="px-2 py-1 rounded-full text-on-primary-fixed hover:bg-primary-fixed-dim text-[11px] font-medium transition-colors"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] shrink-0 text-error">
                        error
                      </span>
                      <span>{error}</span>
                    </div>
                  )}

                  {otpSentNotice && mode === "verify" && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed text-xs font-medium">
                      <span className="material-symbols-outlined text-[18px] text-tertiary">
                        mark_email_read
                      </span>
                      <span>6-digit secure code transmitted to your inbox. Check active tabs.</span>
                    </div>
                  )}

                  {/* Continue with Google */}
                  {mode === "request" && (
                    <>
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container active:scale-[0.99] text-on-surface transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.28 14.27a7.22 7.22 0 0 1 0-4.54V6.58H1.25a11.96 11.96 0 0 0 0 10.84l4.03-3.15z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                            fill="#EA4335"
                          />
                        </svg>
                        <span className="text-sm font-medium tracking-wide">
                          Continue with Google
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant ml-auto">
                          arrow_forward
                        </span>
                      </button>

                      <div className="relative flex items-center justify-center my-0.5">
                        <div className="w-full h-px bg-surface-variant" />
                        <span className="absolute px-3 bg-surface-container-lowest text-on-surface-variant text-xs rounded-full">
                          or sign in with email OTP
                        </span>
                      </div>
                    </>
                  )}

                  {/* Email OTP form */}
                  {mode === "request" ? (
                    <form onSubmit={handleEmailOtp} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="email-field"
                          className="text-xs font-semibold text-on-surface-variant flex items-center justify-between"
                        >
                          <span>Email address</span>
                          <span className="text-tertiary font-normal flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">
                              lock_open
                            </span>
                            No password needed
                          </span>
                        </label>
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                            mail
                          </span>
                          <input
                            id="email-field"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="aarav.sharma@wanderway.in"
                            className="w-full bg-surface-container-low focus:bg-surface text-on-surface placeholder:text-on-surface-variant/70 pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all shadow-inner focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-1 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container text-sm font-medium tracking-wide shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                      >
                        <span>{isLoading ? "Transmitting..." : "Send Verification Code"}</span>
                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                          send
                        </span>
                      </button>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/70 mt-1">
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={keepSignedIn}
                            onChange={(e) => setKeepSignedIn(e.target.checked)}
                            className="size-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                          />
                          <span className="text-xs text-on-surface">
                            Keep me signed in on this trusted device
                          </span>
                        </label>
                        <span
                          className="material-symbols-outlined text-[16px] text-on-surface-variant"
                          title="Saves tokens in local storage for seamless travel"
                        >
                          info
                        </span>
                      </div>
                    </form>
                  ) : (
                    /* Verify OTP Code step */
                    <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="otp-code-field"
                          className="text-xs font-semibold text-on-surface-variant"
                        >
                          6-Digit Verification Code
                        </label>
                        <div className="relative flex items-center">
                          <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[20px] pointer-events-none">
                            pin
                          </span>
                          <input
                            id="otp-code-field"
                            type="text"
                            required
                            autoFocus
                            maxLength={8}
                            value={token}
                            onChange={(e) => setToken(e.target.value.trim())}
                            placeholder="123456"
                            className="w-full bg-surface-container-low focus:bg-surface text-on-surface placeholder:text-on-surface-variant/70 pl-11 pr-4 py-3 rounded-xl text-lg font-mono tracking-widest text-center outline-none transition-all shadow-inner focus:ring-2 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-1 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container text-sm font-medium tracking-wide shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                      >
                        <span>{isLoading ? "Verifying..." : "Verify & Sign In"}</span>
                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </button>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setMode("request")}
                          className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_back
                          </span>
                          <span>Change email address</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Alpine Vista Metadata Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-white/20 text-white/90">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary-fixed">
                landscape
              </span>
              <span className="text-xs tracking-tight">
                Himalayan Ridge, Khardung La • 5,359m Elevation
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5">
                <span className="size-6 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-[10px] text-white shadow-xs">
                  4K
                </span>
                <span className="size-6 rounded-full bg-white/30 backdrop-blur-xl border border-white/30 flex items-center justify-center text-[10px] text-white shadow-xs">
                  RAW
                </span>
              </div>
              <span className="text-xs text-white/80">Captured over Himalayan passes</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
