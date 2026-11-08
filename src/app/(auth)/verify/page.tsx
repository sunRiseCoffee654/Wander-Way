"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertCircle, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const VerifyPageContent = () => {
  const router = useRouter();
  const push = router.push as unknown as (url: string) => void;
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash") ?? "";
  const email = searchParams.get("email") ?? "";
  const type = searchParams.get("type") ?? "email";
  const next = searchParams.get("next") ?? "/trips";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      if (!tokenHash) {
        setError("No verification code found in the link.");
        return;
      }

      setIsLoading(true);
      const supabase = createClient();

      const { error: err } = await supabase.auth.verifyOtp({
        token: tokenHash,
        email,
        type: type as "email",
      });

      setIsLoading(false);
      if (err) {
        setError(err.message);
        return;
      }

      if (mounted) {
        push(next);
      }
    };

    verify();
    return () => {
      mounted = false;
    };
  }, [tokenHash, email, type, next, push]);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-[320px] w-full space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-info-bg text-info-fg">
            <Mail className="size-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-text-primary">
            Check your inbox
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            {email ? `We sent a sign-in link to ${email}.` : "Check your email for the sign-in link."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-error-bg border border-error-fg bg-error-bg p-3 text-sm text-error-fg">
            <AlertCircle className="shrink-0 size-4 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <Button variant="primary" disabled className="w-full">
            Verifying…
          </Button>
        ) : (
          <>
            <Button variant="primary" onClick={() => push("/login")} className="w-full">
              Back to sign in
            </Button>
            <p className="mt-4 text-xs text-text-muted">
              Didn’t receive an email? Request a new code on the sign-in page.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">Verifying…</div>}>
      <VerifyPageContent />
    </Suspense>
  );
}
