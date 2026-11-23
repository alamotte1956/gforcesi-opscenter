import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { GForceLogo } from "@/components/brand/GForceGraphics";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A1628] text-slate-100 px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.14),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(18,109,250,0.2),_transparent_55%)]" />
      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" aria-label="G-Force SI Home">
            <GForceLogo size={32} subtitle="All 50 States · Enterprise" />
          </Link>
          <Link to="/" className="text-xs text-[#4A9EFF] hover:text-white inline-flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" /> GForcesi.com
          </Link>
        </div>

        <div className="text-center mb-7">
          {Icon && (
            <div className="inline-flex items-center justify-center w-13 h-13 p-3 rounded-2xl bg-[#126DFA]/20 border border-[#126DFA]/40 mb-3">
              <Icon className="w-6 h-6 text-[#4A9EFF]" aria-hidden="true" />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-1.5">{subtitle}</p>}
        </div>

        <div className="bg-[#0D1C33]/95 rounded-2xl shadow-2xl border border-[#1E3A5F] p-6 sm:p-8">
          {children}
        </div>

        {footer && (
          <div className="text-center text-sm text-slate-400 mt-6">{footer}</div>
        )}
      </div>
    </div>
  );
}
