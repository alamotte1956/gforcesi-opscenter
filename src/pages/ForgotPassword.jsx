import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44, isBase44CloudMode } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, KeyRound, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("email"); // email | token | recovery
  const [email, setEmail] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  const handleEmailReset = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await base44.auth.resetPasswordRequest(email);
      setStatusMsg(
        res?.message ||
          "If an account exists for that email, a password reset has been issued."
      );
    } catch {
      setStatusMsg("If an account exists for that email, a password reset has been issued.");
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  const handleTokenContinue = (e) => {
    e.preventDefault();
    const cleaned = tokenInput.trim();
    if (!cleaned) return;
    navigate(`/reset-password?token=${encodeURIComponent(cleaned)}`);
  };

  const handleRecoveryReset = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({
        email: email.trim(),
        recoveryKey: recoveryKey.trim(),
        newPassword,
      });
      window.location.href = "/login?reset=success";
    } catch (err) {
      setError(err.message || "Invalid email, recovery key, or password policy not met.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={mode === "recovery" ? ShieldCheck : mode === "token" ? KeyRound : Mail}
      title="Reset Password"
      subtitle="Choose how you want to securely reset your account password"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to Sign In
        </Link>
      }
    >
      {!isBase44CloudMode && (
        <div className="grid grid-cols-3 gap-1.5 mb-5 p-1 rounded-lg bg-muted">
          <button
            type="button"
            onClick={() => { setMode("email"); setError(""); setSent(false); }}
            className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
              mode === "email" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Email Link
          </button>
          <button
            type="button"
            onClick={() => { setMode("token"); setError(""); }}
            className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
              mode === "token" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Reset Token
          </button>
          <button
            type="button"
            onClick={() => { setMode("recovery"); setError(""); }}
            className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
              mode === "recovery" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Recovery Key
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {mode === "email" && (
        sent ? (
          <div className="space-y-4 text-center">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm flex items-start gap-2 text-left">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMsg}</span>
            </div>
            {!isBase44CloudMode && (
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setMode("token")}>
                  Enter Reset Token
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMode("recovery")}>
                  Use Recovery Key
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleEmailReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Account Email</Label>
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
            <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Requesting Reset...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        )
      )}

      {mode === "token" && (
        <form onSubmit={handleTokenContinue} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Paste the one-time reset token issued by your Master Admin or password reset email.
          </p>
          <div className="space-y-2">
            <Label htmlFor="reset-token">One-Time Reset Token</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="reset-token"
                type="text"
                autoFocus
                placeholder="Paste reset token here"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="pl-10 h-12 font-mono text-xs"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium">
            Continue to Set New Password
          </Button>
        </form>
      )}

      {mode === "recovery" && (
        <form onSubmit={handleRecoveryReset} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Use your saved Emergency Recovery Key (`GFSI-...`) to immediately rotate your password and revoke all prior sessions.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="rec-email">Account Email</Label>
            <Input
              id="rec-email"
              type="email"
              placeholder="admin@gforcesi.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-key">Emergency Recovery Key</Label>
            <Input
              id="rec-key"
              type="text"
              placeholder="GFSI-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
              value={recoveryKey}
              onChange={(e) => setRecoveryKey(e.target.value)}
              className="h-11 font-mono text-xs"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-pw">New Strong Password (12+ chars)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="rec-pw"
                type="password"
                autoComplete="new-password"
                placeholder="Upper, lower, number & symbol"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 h-11"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rec-confirm">Confirm New Password</Label>
            <Input
              id="rec-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11"
              required
            />
          </div>
          <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetting Password...
              </>
            ) : (
              "Reset Password Immediately"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
