import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44, isBase44CloudMode } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { isPropertyPortalHost } from "@/lib/portalHost";

export default function Login() {
  const portalHost = isPropertyPortalHost();
  const [searchParams] = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaChallengeToken, setMfaChallengeToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = safeReturnTo();
  const defaultDest = portalHost ? "/" : "/executive";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.auth.loginViaEmailPassword(email, password);
      if (res?.mfaRequired && res?.challengeToken) {
        setMfaChallengeToken(res.challengeToken);
        setMfaCode("");
        return;
      }
      window.location.href = returnTo === "/" ? defaultDest : returnTo;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.verifyMfaChallenge(mfaChallengeToken, mfaCode);
      window.location.href = returnTo === "/" ? defaultDest : returnTo;
    } catch (err) {
      setError(err.message || "Invalid 6-digit authenticator code");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", returnTo);
  };

  return (
    <AuthLayout
      icon={mfaChallengeToken ? ShieldCheck : LogIn}
      title={
        mfaChallengeToken
          ? "Two-Factor Verification"
          : portalHost
          ? "Property Owner Portal"
          : "G-Force SI Enterprise Login"
      }
      subtitle={
        mfaChallengeToken
          ? "Enter the 6-digit code from your authenticator app"
          : portalHost
          ? "Sign in to view your properties, 3D tours & reports"
          : "Authorized personnel & Master Admin access only"
      }
      footer={
        <div className="space-y-2">
          <div>
            Need to reset your password?{" "}
            <Link to="/forgot-password" className="text-primary font-medium hover:underline">
              Reset Password
            </Link>
          </div>
          {isBase44CloudMode ? (
            <div>
              Don't have an account?{" "}
              <Link
                to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
                className="text-primary font-medium hover:underline"
              >
                Create one
              </Link>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Invite-Only · PBKDF2-SHA256 · TOTP MFA · Brute-Force Protected
            </div>
          )}
        </div>
      }
    >
      {isBase44CloudMode && !mfaChallengeToken && (
        <>
          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium mb-6"
            onClick={handleGoogle}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground">or</span>
            </div>
          </div>
        </>
      )}

      {resetSuccess && !error && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Password reset complete. Sign in with your new password.</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {mfaChallengeToken ? (
        <form onSubmit={handleMfaSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">6-Digit Authenticator Code</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="pl-10 h-12 tracking-[0.4em] font-mono text-lg text-center"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading || mfaCode.length !== 6}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Sign In"
            )}
          </Button>
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => {
                setMfaChallengeToken("");
                setMfaCode("");
                setError("");
              }}
              className="text-muted-foreground hover:text-foreground underline"
            >
              Back to password login
            </button>
            <Link to="/forgot-password" className="text-primary hover:underline">
              Reset password / recovery
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="admin@gforcesi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary font-medium hover:underline">
                Forgot / Reset password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In Securely"
            )}
          </Button>
        </form>
      )}
      <p className="text-center text-xs text-muted-foreground mt-4">
        By continuing, you agree to our{" "}
        <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{" "}
        and{" "}
        <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>.
      </p>
    </AuthLayout>
  );
}