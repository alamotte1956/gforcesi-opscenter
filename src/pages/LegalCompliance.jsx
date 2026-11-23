import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShieldCheck, Lock, FileText, Scale, BookOpen, Copyright, ArrowLeft, CheckCircle2,
} from "lucide-react";

const TABS = [
  { id: "hipaa", label: "HIPAA & BAA Security", icon: ShieldCheck },
  { id: "terms", label: "Terms of Service & SLA", icon: Scale },
  { id: "privacy", label: "Privacy & Tenant Isolation", icon: Lock },
  { id: "ip", label: "Copyright, IP & ISBN Registry", icon: BookOpen },
];

const ISBN_REGISTRY = [
  { isbn: "979-8-9914201-0-4", title: "G-Force SI Enterprise 3D Capture & Matterport Pro3 SOP Manual (v4.2)", scope: "50-State Field Operations (CONUS, AK, HI)" },
  { isbn: "979-8-9914201-1-1", title: "Financial Institution & High-Security Branch Capture Compliance Guide", scope: "Banking / Vault / PII Redaction Standards" },
  { isbn: "979-8-9914201-2-8", title: "Healthcare Facility HIPAA-Safe Spatial Reality Capture Protocol", scope: "Medical & Clinical Digital Twin Workflows" },
];

export default function LegalCompliance() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname === "/hipaa" ? "hipaa" : "hipaa");

  useEffect(() => {
    if (location.pathname === "/hipaa") setActiveTab("hipaa");
    else if (location.hash === "#terms") setActiveTab("terms");
    else if (location.hash === "#privacy") setActiveTab("privacy");
    else if (location.hash === "#ip") setActiveTab("ip");
  }, [location]);

  return (
    <div className="min-h-screen bg-[#0A1628] text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link to="/" className="text-xs text-[#4A9EFF] hover:underline inline-flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to GForcesi.com
            </Link>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              G-Force SI Legal, Compliance &amp; Governance Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Enterprise legal documentation covering HIPAA/BAA protocols, 24–48h SLA Terms, CCPA/GDPR Privacy, Copyright, and ISBN SOP publications.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Effective 2026 · All 50 U.S. States
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                  activeTab === t.id
                    ? "bg-[#126DFA] text-white shadow-lg shadow-[#126DFA]/25"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 space-y-6 text-sm text-slate-300 leading-relaxed">
          {activeTab === "hipaa" && (
            <>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> HIPAA &amp; Business Associate Agreement (BAA) Compliance Notice
              </h2>
              <p>
                G-Force SI Inc. (<strong>GForcesi.com</strong>) provides reality capture and spatial digital twin services for healthcare networks, clinics, and regulated Fortune 500 environments. When operating inside HIPAA-covered facilities, G-Force SI enforces strict physical, administrative, and technical safeguards under 45 CFR Parts 160 and 164.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h3 className="font-semibold text-white mb-1">Zero-PHI Capture Protocol</h3>
                  <p className="text-xs text-slate-400">
                    Technicians verify that patient charts, whiteboards, monitors, and identifying signage are cleared or obscured prior to Matterport Pro3 LiDAR scanning. Automatic face-blurring and post-capture QA redaction are applied before publishing any Private Model Embed (PME).
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h3 className="font-semibold text-white mb-1">BAA Execution &amp; Encryption</h3>
                  <p className="text-xs text-slate-400">
                    G-Force SI executes mutual Business Associate Agreements (BAAs) for covered entities. All deliverable links, audit logs, and metadata are encrypted in transit (TLS 1.3) and at rest (AES-256) with strict role-based multi-tenant isolation.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === "terms" && (
            <>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Scale className="w-5 h-5 text-[#4A9EFF]" /> Enterprise Terms of Service &amp; 24–48h SLA Guarantee
              </h2>
              <p>
                These Terms govern access to the G-Force SI Platform (<code>GForcesi.com</code>), Client Portal, Field PWA, and nationwide 3D scanning services across all 50 U.S. states — the Contiguous US (CONUS), Alaska (AK), and Hawaii (HI).
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs text-slate-300">
                <li><strong>Standard Turnaround SLA:</strong> Digital twin models, MatterPak bundles, E57 point clouds, and schematic floor plans are delivered within 24–48 business hours of completed on-site capture unless otherwise specified in a Master Services Agreement (MSA).</li>
                <li><strong>Remote AK / HI Mobilization:</strong> Multi-site Alaska and Hawaii engagements are bundled into scheduled flight/travel itineraries with transparent pre-approved airfare, lodging, and per-diem estimates.</li>
                <li><strong>Deliverable Sign-Off &amp; Billing:</strong> Agency and enterprise stakeholders review deliverables via the Client Portal. Approved deliverables trigger automated QuickBooks Online invoicing under agreed Net-30 terms.</li>
                <li><strong>Limitation of Liability:</strong> G-Force SI maintains commercial general liability insurance (COI available upon request) and requires active COI/W-9/NDA compliance from all dispatched 1099 capture technicians.</li>
              </ul>
            </>
          )}

          {activeTab === "privacy" && (
            <>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#4A9EFF]" /> Privacy Policy &amp; Multi-Tenant Data Isolation
              </h2>
              <p>
                G-Force SI respects the confidentiality of every advertising agency, enterprise brand, and field contractor on our platform.
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs text-slate-300">
                <li><strong>Strict Tenant Isolation:</strong> Ad Agency portals are scoped exclusively to their assigned <code>agency_id</code> and authorized brand subsidiaries. Enterprise Direct accounts are isolated strictly to their own <code>client_id</code>.</li>
                <li><strong>Private Model Embeds (PME):</strong> Enterprise digital twins are served via unlisted/private secure embed links so stakeholders can inspect branches without requiring Matterport admin seats.</li>
                <li><strong>CCPA &amp; GDPR Rights:</strong> Users and contractors may request data export, correction, or deletion by emailing <a href="mailto:legal@gforcesi.com" className="text-[#4A9EFF] underline">legal@gforcesi.com</a>.</li>
                <li><strong>Offline Field Storage:</strong> Field PWA data cached in browser IndexedDB for offline vault/remote scans syncs over HTTPS and clears upon sign-out.</li>
              </ul>
            </>
          )}

          {activeTab === "ip" && (
            <>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Copyright className="w-5 h-5 text-amber-400" /> Copyright, Intellectual Property &amp; ISBN SOP Registry
              </h2>
              <p>
                © {new Date().getFullYear()} <strong>G-Force SI Inc.</strong> (<code>GForcesi.com</code>). All rights reserved. The G-Force SI platform software, AI routing algorithms, QA workflows, brand marks, and published technical capture manuals are protected under U.S. and international copyright law.
              </p>
              <p className="text-xs text-slate-400">
                Upon full invoice settlement, enterprise clients receive a perpetual, worldwide commercial license to host, embed, and distribute their commissioned 3D digital twins, E57 point clouds, MatterPak assets, and floor plans as defined in their MSA.
              </p>
              <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden mt-4">
                <div className="px-4 py-3 border-b border-slate-800 text-xs font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4A9EFF]" /> Registered ISBN Technical Manuals &amp; Field SOPs
                </div>
                <div className="divide-y divide-slate-800">
                  {ISBN_REGISTRY.map((doc) => (
                    <div key={doc.isbn} className="p-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-semibold text-white">{doc.title}</div>
                        <div className="text-slate-400 mt-0.5">{doc.scope}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-[#126DFA]/15 border border-[#126DFA]/30 text-[#4A9EFF] font-mono font-semibold">
                        ISBN {doc.isbn}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
