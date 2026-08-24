import React, { useState } from "react";
import { KeyRound, ChevronDown, ChevronUp, ExternalLink, ShieldCheck } from "lucide-react";

// Credentials the app needs stored as secrets. Each entry tells the admin
// exactly how to obtain the value and the secret name to enter it under.
const CREDENTIALS = [
  {
    name: "MATTERPORT_CLIENT_ID",
    label: "Matterport Client ID",
    usedBy: "Matterport model sync",
    steps: [
      "Sign in to the Matterport Developer Portal at https://developer.matterport.com using your Matterport account.",
      "Create a new app (or open an existing one).",
      "On the app's Credentials page, copy the Client ID.",
      "Paste it into the app's Secrets (Environment Variables) area as MATTERPORT_CLIENT_ID.",
    ],
    link: "https://developer.matterport.com",
  },
  {
    name: "MATTERPORT_CLIENT_SECRET",
    label: "Matterport Client Secret",
    usedBy: "Matterport model sync",
    steps: [
      "On the same Matterport Developer app Credentials page as the Client ID, copy the Client Secret.",
      "Paste it into the app's Secrets (Environment Variables) area as MATTERPORT_CLIENT_SECRET.",
      "Keep it private — never share it outside the Secrets area.",
    ],
    link: "https://developer.matterport.com",
  },
];

export default function CredentialsHelp() {
  const [open, setOpen] = useState(null);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3.5 border-b border-slate-800 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
          <KeyRound className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-100">Credentials & Secrets</div>
          <div className="text-xs text-slate-500">How to obtain each credential and where to enter it</div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-800/40 rounded-lg p-3">
          <ShieldCheck className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
          <span>
            Some integrations need API credentials stored as <span className="text-slate-200">secrets</span>. Get the value from each provider below, then have the app builder enter it in the app's <span className="text-slate-200">Secrets (Environment Variables)</span> area. Google Sheets uses a secure OAuth sign-in (no secret needed); QuickBooks is managed by the app builder.
          </span>
        </div>

        {CREDENTIALS.map((c, i) => {
          const isOpen = open === i;
          return (
            <div key={c.name} className="border border-slate-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-slate-800/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-100">{c.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Used by {c.usedBy} · secret name <code className="text-cyan-300 font-mono">{c.name}</code>
                  </div>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-3.5 pb-3.5 pt-1">
                  <ol className="space-y-1.5">
                    {c.steps.map((s, idx) => (
                      <li key={idx} className="flex gap-2 text-xs text-slate-300">
                        <span className="text-cyan-400 font-medium shrink-0">{idx + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                  {c.link && (
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      Open provider portal <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}