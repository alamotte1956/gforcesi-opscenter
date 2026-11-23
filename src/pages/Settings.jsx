import React, { useEffect, useState } from "react";
import { base44, isBase44CloudMode } from "@/api/base44Client";
import {
  CheckCircle2, XCircle, RefreshCw, Link2, Unlink, Zap, SlidersHorizontal,
  ShieldCheck, KeyRound, Lock, LogOut, Copy, AlertTriangle, Activity,
} from "lucide-react";

export default function Settings() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoSync, setAutoSync] = useState(false);
  const [connected, setConnected] = useState(false);

  // Master Admin Security Center state
  const [secStatus, setSecStatus] = useState(null);
  const [secBanner, setSecBanner] = useState(null);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [disableMfaPw, setDisableMfaPw] = useState("");
  const [disableMfaCode, setDisableMfaCode] = useState("");
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [recoveryKeyOnce, setRecoveryKeyOnce] = useState("");
  const [issuedReset, setIssuedReset] = useState(null);
  const [secBusy, setSecBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.SyncLog.list("-timestamp");
      setLogs(data);
    } catch {
      setLogs([]);
    }
    if (!isBase44CloudMode && typeof base44.auth.getSecurityStatus === "function") {
      try {
        const status = await base44.auth.getSecurityStatus();
        setSecStatus(status);
      } catch {
        setSecStatus(null);
      }
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startMfaSetup = async () => {
    setSecBusy(true);
    setSecBanner(null);
    try {
      const res = await base44.auth.setupMfa();
      setMfaSetup(res);
      setMfaVerifyCode("");
    } catch (err) {
      setSecBanner({ type: "error", text: err.message || "Failed to initialize 2FA" });
    } finally {
      setSecBusy(false);
    }
  };

  const confirmMfaSetup = async (e) => {
    e.preventDefault();
    setSecBusy(true);
    setSecBanner(null);
    try {
      await base44.auth.verifyMfa(mfaVerifyCode);
      setMfaSetup(null);
      setMfaVerifyCode("");
      setSecBanner({ type: "success", text: "TOTP Two-Factor Authentication is now ACTIVE on your Master Admin account." });
      await load();
    } catch (err) {
      setSecBanner({ type: "error", text: err.message || "Invalid 6-digit code" });
    } finally {
      setSecBusy(false);
    }
  };

  const handleDisableMfa = async (e) => {
    e.preventDefault();
    setSecBusy(true);
    setSecBanner(null);
    try {
      await base44.auth.disableMfa(disableMfaPw, disableMfaCode);
      setDisableMfaPw("");
      setDisableMfaCode("");
      setSecBanner({ type: "success", text: "TOTP 2FA has been disabled." });
      await load();
    } catch (err) {
      setSecBanner({ type: "error", text: err.message || "Failed to disable 2FA" });
    } finally {
      setSecBusy(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSecBanner(null);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setSecBanner({ type: "error", text: "New passwords do not match." });
      return;
    }
    setSecBusy(true);
    try {
      const res = await base44.auth.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSecBanner({ type: "success", text: res.message || "Master password rotated and all other sessions revoked." });
      await load();
    } catch (err) {
      setSecBanner({ type: "error", text: err.message || "Failed to rotate password" });
    } finally {
      setSecBusy(false);
    }
  };

  const handleGenerateRecoveryKey = async () => {
    setSecBusy(true);
    setSecBanner(null);
    try {
      const res = await base44.auth.generateRecoveryKey();
      setRecoveryKeyOnce(res.recoveryKey || "");
      setSecBanner({ type: "success", text: res.message || "Emergency Recovery Key generated — copy and store it safely now." });
      await load();
    } catch (err) {
      setSecBanner({ type: "error", text: err.message || "Failed to generate recovery key" });
    } finally {
      setSecBusy(false);
    }
  };

  const handleIssueUserResetLink = async (userId) => {
    setSecBusy(true);
    setSecBanner(null);
    try {
      const res = await base44.auth.adminCreateResetLink(userId);
      setIssuedReset(res);
      setSecBanner({ type: "success", text: `Issued 15-minute one-time reset link for ${res.email}.` });
      await load();
    } catch (err) {
      setSecBanner({ type: "error", text: err.message || "Failed to issue reset link" });
    } finally {
      setSecBusy(false);
    }
  };

  const handleLogoutAll = async () => {
    setSecBusy(true);
    try {
      await base44.auth.logoutAll();
      window.location.href = "/login";
    } catch (err) {
      setSecBanner({ type: "error", text: err.message || "Failed to revoke sessions" });
      setSecBusy(false);
    }
  };

  const copyText = (txt, label) => {
    navigator.clipboard?.writeText(txt);
    setSecBanner({ type: "success", text: `${label} copied to clipboard.` });
  };

  const statusIcon = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    error: <XCircle className="w-4 h-4 text-rose-400" />,
    pending: <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />,
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-6">
      {/* Master Admin Security Center */}
      {!isBase44CloudMode && secStatus && (
        <div className="bg-[#0D1C33] border border-[#1E3A5F] rounded-2xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E3A5F] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  Master Admin Security Center
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                    Maximum Security
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Invite-only lockdown · Zero demo accounts · PBKDF2-SHA256 (100k) · 12h JWT + JTI revocation · Brute-force 429 lockout
                </p>
              </div>
            </div>
            <button
              onClick={handleLogoutAll}
              disabled={secBusy}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" /> Revoke All Sessions
            </button>
          </div>

          {secBanner && (
            <div
              className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 border ${
                secBanner.type === "error"
                  ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                  : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
              }`}
            >
              {secBanner.type === "error" ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span>{secBanner.text}</span>
            </div>
          )}

          {/* Security Posture Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0A1628] border border-[#1E3A5F]">
              <div className="text-slate-400">2FA / TOTP MFA</div>
              <div className={`font-bold mt-1 ${secStatus.mfaEnabled ? "text-emerald-400" : "text-amber-400"}`}>
                {secStatus.mfaEnabled ? "ENABLED (Protected)" : "READY — Activate Below"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0A1628] border border-[#1E3A5F]">
              <div className="text-slate-400">Active Accounts</div>
              <div className="font-bold text-white mt-1">
                {secStatus.activeUsers?.length || 1} ({secStatus.demoAccountsRemoved ? "Zero Demo Accounts" : "Review Users"})
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0A1628] border border-[#1E3A5F]">
              <div className="text-slate-400">Registration Mode</div>
              <div className="font-bold text-emerald-400 mt-1">Invite-Only (Locked)</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0A1628] border border-[#1E3A5F]">
              <div className="text-slate-400">Edge Protections</div>
              <div className="font-bold text-[#4A9EFF] mt-1">HSTS · CSP · Strict CORS</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* TOTP 2FA Management */}
            <div className="p-4 rounded-xl bg-[#0A1628] border border-[#1E3A5F] space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#F97316]" /> Authenticator App 2FA (TOTP)
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${secStatus.mfaEnabled ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                  {secStatus.mfaEnabled ? "Active" : "Not Enabled"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Use Google Authenticator, Microsoft Authenticator, Authy, or 1Password. Your secret is generated on Cloudflare and never sent to third-party QR servers.
              </p>

              {!secStatus.mfaEnabled && !mfaSetup && (
                <button
                  onClick={startMfaSetup}
                  disabled={secBusy}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white"
                >
                  Generate Authenticator Setup Key
                </button>
              )}

              {mfaSetup && (
                <form onSubmit={confirmMfaSetup} className="space-y-3 pt-1">
                  <div className="p-3 rounded-lg bg-[#0D1C33] border border-[#1E3A5F] space-y-2">
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Manual Setup Key (Base32)</div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono text-[#4A9EFF] break-all">{mfaSetup.secret}</code>
                      <button
                        type="button"
                        onClick={() => copyText(mfaSetup.secret, "Setup key")}
                        className="px-2 py-1 rounded bg-[#1E3A5F] text-white text-[11px] flex items-center gap-1 shrink-0"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={mfaVerifyCode}
                      onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="flex-1 px-3 py-2 rounded-lg bg-[#0D1C33] border border-[#1E3A5F] text-sm font-mono tracking-widest text-white"
                      required
                    />
                    <button
                      type="submit"
                      disabled={secBusy || mfaVerifyCode.length !== 6}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-50"
                    >
                      Verify &amp; Activate
                    </button>
                  </div>
                </form>
              )}

              {secStatus.mfaEnabled && (
                <form onSubmit={handleDisableMfa} className="space-y-2 pt-1 border-t border-[#1E3A5F]">
                  <div className="text-[11px] text-slate-400 pt-2">Disable 2FA (requires password + current 6-digit code):</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="password"
                      placeholder="Master password"
                      value={disableMfaPw}
                      onChange={(e) => setDisableMfaPw(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0D1C33] border border-[#1E3A5F] text-xs text-white"
                      required
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={disableMfaCode}
                      onChange={(e) => setDisableMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0D1C33] border border-[#1E3A5F] text-xs font-mono text-white"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={secBusy}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    Disable 2FA
                  </button>
                </form>
              )}
            </div>

            {/* Rotate Master Password */}
            <form onSubmit={handlePasswordChange} className="p-4 rounded-xl bg-[#0A1628] border border-[#1E3A5F] space-y-2.5">
              <div className="font-semibold text-sm text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#4A9EFF]" /> Rotate Master Admin Password
              </div>
              <p className="text-xs text-slate-400">
                Minimum 12 characters with uppercase, lowercase, number, and symbol. Rotating immediately revokes all other active sessions.
              </p>
              <input
                type="password"
                placeholder="Current password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#0D1C33] border border-[#1E3A5F] text-xs text-white"
                required
              />
              <input
                type="password"
                placeholder="New strong password (12+ chars)"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#0D1C33] border border-[#1E3A5F] text-xs text-white"
                required
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#0D1C33] border border-[#1E3A5F] text-xs text-white"
                required
              />
              <button
                type="submit"
                disabled={secBusy}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#126DFA] hover:bg-[#4A9EFF] text-white"
              >
                Update Password &amp; Revoke Other Sessions
              </button>
            </form>
          </div>

          {/* Emergency Recovery Key & One-Click User Reset Links */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0A1628] border border-[#1E3A5F] space-y-3">
              <div className="font-semibold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Emergency Master Recovery Key
              </div>
              <p className="text-xs text-slate-400">
                Generate a 256-bit Emergency Recovery Key (stored only as a PBKDF2-SHA256 hash) so you can always reset your password directly from <code>/forgot-password</code>.
              </p>
              <button
                type="button"
                onClick={handleGenerateRecoveryKey}
                disabled={secBusy}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              >
                Generate / Rotate Recovery Key
              </button>
              {recoveryKeyOnce && (
                <div className="p-3 rounded-lg bg-[#0D1C33] border border-emerald-500/40 space-y-1.5">
                  <div className="text-[11px] font-semibold text-emerald-300 uppercase">Save Now — Shown Once</div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-white break-all">{recoveryKeyOnce}</code>
                    <button
                      type="button"
                      onClick={() => copyText(recoveryKeyOnce, "Emergency Recovery Key")}
                      className="px-2 py-1 rounded bg-[#1E3A5F] text-white text-[11px] flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#0A1628] border border-[#1E3A5F] space-y-3">
              <div className="font-semibold text-sm text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#FF8A3D]" /> Issue One-Time Password Reset Link
              </div>
              <p className="text-xs text-slate-400">
                Generate a single-use, 15-minute SHA-256 reset link for any active account on the platform.
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {(secStatus.activeUsers || []).map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#0D1C33] border border-[#1E3A5F] text-xs">
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{u.email}</div>
                      <div className="text-[10px] text-slate-400">{u.is_master_admin ? "Master Admin" : u.role}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleIssueUserResetLink(u.id)}
                      disabled={secBusy}
                      className="px-2.5 py-1 rounded bg-[#F97316]/20 text-[#FF8A3D] border border-[#F97316]/40 hover:bg-[#F97316]/30 text-[11px] font-semibold shrink-0"
                    >
                      Create Reset Link
                    </button>
                  </div>
                ))}
              </div>
              {issuedReset && (
                <div className="p-2.5 rounded-lg bg-[#0D1C33] border border-[#4A9EFF]/40 space-y-1.5">
                  <div className="text-[11px] text-[#4A9EFF] font-semibold">
                    15-Min One-Time Reset Link ({issuedReset.email})
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[11px] font-mono text-slate-200 truncate">{issuedReset.resetUrl}</code>
                    <button
                      type="button"
                      onClick={() => copyText(issuedReset.resetUrl, "Reset link")}
                      className="px-2 py-1 rounded bg-[#126DFA] text-white text-[11px] flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Security Audit Log */}
          {secStatus.recentAuditEvents?.length > 0 && (
            <div className="rounded-xl bg-[#0A1628] border border-[#1E3A5F] overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-[#1E3A5F] flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#4A9EFF]" /> Immutable Security Audit Log
                </span>
                <span className="text-slate-400">Append-Only · Last {secStatus.recentAuditEvents.length} events</span>
              </div>
              <div className="divide-y divide-[#1E3A5F]/60 max-h-48 overflow-y-auto text-xs">
                {secStatus.recentAuditEvents.slice(0, 12).map((ev) => (
                  <div key={ev.id} className="px-3.5 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-[#FF8A3D] mr-2">{ev.action}</span>
                      <span className="text-slate-300">{ev.details}</span>
                    </div>
                    <div className="text-slate-500 shrink-0 text-[11px]">
                      {ev.actor} · {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-1">QuickBooks Settings</h2>
        <p className="text-sm text-slate-500 mb-5">Integration, mappings &amp; sync log</p>
      </div>

      {/* Connection */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <div className="font-medium">QuickBooks Online</div>
              <div className="text-sm text-slate-500">
                {connected ? "Connected to GForceSI company file" : "Not connected — OAuth 2.0 required"}
              </div>
            </div>
          </div>
          <button
            onClick={() => setConnected(!connected)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              connected ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            }`}
          >
            {connected ? <><Unlink className="w-4 h-4" /> Disconnect</> : <><Link2 className="w-4 h-4" /> Connect</>}
          </button>
        </div>
      </div>

      {/* Sync mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-medium text-slate-300 mb-3">Sync Mode</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => setAutoSync(true)}
            className={`text-left p-4 rounded-lg border transition-colors ${autoSync ? "border-cyan-500/40 bg-cyan-500/5" : "border-slate-800 hover:border-slate-700"}`}
          >
            <Zap className={`w-5 h-5 mb-2 ${autoSync ? "text-cyan-400" : "text-slate-500"}`} />
            <div className="font-medium text-sm">Auto-sync</div>
            <div className="text-xs text-slate-500 mt-1">Invoices & payroll sync automatically when ready</div>
          </button>
          <button
            onClick={() => setAutoSync(false)}
            className={`text-left p-4 rounded-lg border transition-colors ${!autoSync ? "border-cyan-500/40 bg-cyan-500/5" : "border-slate-800 hover:border-slate-700"}`}
          >
            <SlidersHorizontal className={`w-5 h-5 mb-2 ${!autoSync ? "text-cyan-400" : "text-slate-500"}`} />
            <div className="font-medium text-sm">Manual review</div>
            <div className="text-xs text-slate-500 mt-1">Review each item, then approve sync to QuickBooks</div>
          </button>
        </div>
      </div>

      {/* Mapping tables */}
      <div className="grid md:grid-cols-3 gap-4 mb-5">
        {[
          { title: "Clients → QB Customers", count: 2 },
          { title: "Services → QB Products", count: 4 },
          { title: "Contractors → QB Vendors", count: 4 },
        ].map((m) => (
          <div key={m.title} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-sm font-medium text-slate-300">{m.title}</div>
            <div className="text-2xl font-semibold mt-2 text-cyan-400">{m.count}</div>
            <div className="text-xs text-slate-500 mt-1">mappings configured</div>
          </div>
        ))}
      </div>

      {/* Sync log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-300">Sync Log</h2>
          <button onClick={load} className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                {statusIcon[log.status]}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-200 truncate">{log.entity_label || log.entity_type}</div>
                  <div className="text-xs text-slate-500">{log.message}</div>
                </div>
                <div className="text-xs text-slate-500 shrink-0">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}</div>
                {log.status === "error" && (
                  <button className="text-xs text-cyan-400 hover:underline">Retry</button>
                )}
              </div>
            ))}
            {logs.length === 0 && <div className="text-center text-slate-500 text-sm py-8">No sync events yet</div>}
          </div>
        )}
      </div>
    </div>
  );
}