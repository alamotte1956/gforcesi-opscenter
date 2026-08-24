import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sparkles, X, RefreshCw, Loader2 } from "lucide-react";

const pageLabels = {
  "/": "Live Map Dashboard",
  "/jobs": "Jobs",
  "/routes": "Route Planning",
  "/projects": "Projects",
  "/contractors": "Contractors",
  "/clients": "Clients",
  "/invoices": "Invoices",
  "/equipment": "Equipment",
  "/analytics": "Analytics",
  "/settings": "QuickBooks Settings",
  "/compliance": "Compliance Center",
  "/users": "User Management",
  "/import": "Data Import",
  "/messages": "Messages",
  "/expenses": "Expenses",
  "/daily-reports": "Daily Reports",
  "/issues": "Issues",
  "/inspections": "Inspections",
  "/integrations": "Integrations",
  "/matterport": "Matterport",
  "/contractors/onboarding": "Contractor Onboarding",
  "/portal": "Client Portal",
  "/field": "Field App",
};

const IDLE_MS = 45000;
const COOLDOWN_MS = 180000;

async function buildSnapshot() {
  const [jobs, contractors, invoices, projects] = await Promise.all([
    base44.entities.Job.list().catch(() => []),
    base44.entities.Contractor.list().catch(() => []),
    base44.entities.Invoice.list().catch(() => []),
    base44.entities.Project.list().catch(() => []),
  ]);
  const byStatus = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
  return {
    jobs: { total: jobs.length, byStatus: byStatus(jobs, (j) => j.status) },
    contractors: { total: contractors.length, byStatus: byStatus(contractors, (c) => c.current_status), onDuty: contractors.filter((c) => c.shift_status === "on_duty").length },
    invoices: { total: invoices.length, byStatus: byStatus(invoices, (i) => i.status), outstanding: invoices.filter((i) => ["sent", "synced", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0) },
    projects: { total: projects.length, byStatus: byStatus(projects, (p) => p.status) },
  };
}

export default function AiAdvisor({ page, summary: summaryOverride }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const stuckRef = useRef(false);
  const dismissedAtRef = useRef(0);
  const showPromptRef = useRef(false);

  const currentPage = page || pageLabels[location.pathname] || "this page";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const stuck = stuckRef.current;
    const run = async () => {
      setLoading(true); setError("");
      try {
        const summary = summaryOverride ? summaryOverride : await buildSnapshot();
        let role = "user";
        try { const me = await base44.auth.me(); role = me?.role || "user"; } catch {}
        const res = await base44.functions.invoke("getAiAdvice", { page: currentPage, summary, role, stuck });
        stuckRef.current = false;
        if (!cancelled) setAdvice(res.data?.advice || "No advice available right now.");
      } catch (e) {
        if (!cancelled) setError("Couldn't load AI advice. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open, currentPage, refreshKey, summaryOverride]);

  useEffect(() => { showPromptRef.current = showPrompt; }, [showPrompt]);

  useEffect(() => {
    let idleTimer;
    const reset = () => {
      clearTimeout(idleTimer);
      if (open || showPromptRef.current) return;
      if (Date.now() - dismissedAtRef.current < COOLDOWN_MS) return;
      idleTimer = setTimeout(() => setShowPrompt(true), IDLE_MS);
    };
    const onActivity = () => { if (!showPromptRef.current) reset(); };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    reset();
    return () => { clearTimeout(idleTimer); events.forEach((e) => window.removeEventListener(e, onActivity)); };
  }, [open]);

  const acceptHelp = () => {
    setShowPrompt(false);
    stuckRef.current = true;
    setRefreshKey((k) => k + 1);
    setOpen(true);
  };
  const dismissPrompt = () => {
    setShowPrompt(false);
    dismissedAtRef.current = Date.now();
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          aria-label="Open AI advisor"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end justify-center p-0 sm:p-5">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:w-[380px] max-h-[80vh] bg-slate-900 border border-slate-700 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">AI Advisor</div>
                <div className="text-[11px] text-slate-500 truncate">{currentPage}</div>
              </div>
              <button onClick={() => setOpen(false)} className="ml-auto text-slate-400 hover:text-slate-200 p-1.5" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs">Analyzing your data…</span>
                </div>
              ) : error ? (
                <div className="text-sm text-rose-300 text-center py-8">{error}<button onClick={() => setRefreshKey((k) => k + 1)} className="block mx-auto mt-3 text-cyan-400 text-xs">Retry</button></div>
              ) : (
                <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{advice}</div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-[10px] text-slate-600">Real-time, based on live data</span>
              <button onClick={() => setRefreshKey((k) => k + 1)} disabled={loading} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 flex items-center gap-1.5 hover:bg-slate-700 disabled:opacity-40">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>
        </div>
      )}
      {showPrompt && !open && (
        <div className="fixed bottom-24 right-5 z-40 w-72 bg-slate-900 border border-cyan-500/30 rounded-xl shadow-xl p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-100">Need a hand?</div>
              <div className="text-xs text-slate-400 mt-0.5">I can walk you through this page for your role.</div>
              <div className="flex gap-2 mt-2.5">
                <button onClick={acceptHelp} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-medium hover:bg-cyan-400">Yes, help me</button>
                <button onClick={dismissPrompt} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700">Not now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}