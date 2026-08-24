import React from "react";
import { Link } from "react-router-dom";
import { Satellite, ArrowLeft } from "lucide-react";

export default function LegalLayout({ title, subtitle, lastUpdated, children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 h-14 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Satellite className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">GForceSI</div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-cyan-400/80">{title}</div>
          </div>
          <Link to="/" className="ml-auto text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to app
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
        <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
        {lastUpdated && <p className="text-xs text-slate-500 mt-1">Last updated: {lastUpdated}</p>}
        <div className="mt-6">{children}</div>
        <div className="mt-10 pt-6 border-t border-slate-800 flex items-center gap-4 text-xs text-slate-500">
          <Link to="/privacy" className="hover:text-cyan-300">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-cyan-300">Terms of Service</Link>
          <Link to="/login" className="hover:text-cyan-300 ml-auto">Sign in</Link>
        </div>
      </main>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section className="mt-7">
      <h2 className="text-base font-semibold text-slate-100 mb-2">{title}</h2>
      <div className="space-y-2 text-sm text-slate-300 leading-relaxed">{children}</div>
    </section>
  );
}

export function Bullets({ children }) {
  return <ul className="list-disc pl-5 space-y-1">{children}</ul>;
}