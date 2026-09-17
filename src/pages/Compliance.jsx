import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import {
  ShieldCheck, FileText, Clock, Database, PenLine, Eye,
  AlertTriangle, CheckCircle2, XCircle, Trash2, Info,
  FileCheck2, CalendarClock,
} from "lucide-react";
import { contractorCompliance } from "@/lib/contractorCompliance";

const complianceFields = [
  { key: "w9_on_file", label: "W-9 on file", ref: "IRS 1099-NEC reporting" },
  { key: "contract_signed", label: "IC agreement signed", ref: "FLSA / IRS classification" },
  { key: "mn_ic_exemption_on_file", label: "MN IC Exemption Cert.", ref: "Minn. Stat. § 181.723" },
  { key: "workers_comp_on_file", label: "Workers' Comp COI", ref: "Minn. Stat. § 176" },
  { key: "insurance_on_file", label: "General Liability COI", ref: "Contractual requirement" },
  { key: "esign_consent", label: "E-sign consent", ref: "ESIGN / Minn. Stat. § 325L" },
];

const docColumns = [
  { key: "w9", label: "W-9" },
  { key: "coi", label: "GL COI" },
  { key: "mn_ic", label: "MN IC Exemption" },
  { key: "wc", label: "Workers' Comp" },
];
const expiryTone = (state) => state === "expired" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : state === "expiring" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

export default function Compliance() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purgeId, setPurgeId] = useState("");
  const [docBusy, setDocBusy] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    const c = await base44.entities.Contractor.list();
    setContractors(c);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const isCompliant = (c) => complianceFields.every((f) => c[f.key]);
  const compliantCount = contractors.filter(isCompliant).length;
  const expiredCount = contractors.filter((c) => contractorCompliance(c).expiredDocs.length).length;
  const expiringCount = contractors.filter((c) => contractorCompliance(c).expiringSoon.length).length;

  const viewDoc = async (uri) => {
    setDocBusy(uri);
    try {
      const { signed_url } = await base44.functions.invoke("getContractorDocumentUrl", { file_uri: uri });
      window.open(signed_url, "_blank");
    } catch (e) {
      toast({ title: "Could not open document", description: e.message, variant: "destructive" });
    }
    setDocBusy(null);
  };

  const purge = async () => {
    if (!purgeId) return;
    const c = contractors.find((x) => x.id === purgeId);
    if (!window.confirm(`Permanently delete ${c?.name}? This cannot be undone.`)) return;
    await base44.entities.Contractor.delete(purgeId);
    toast({ title: "Contractor purged", description: `${c?.name} deleted.` });
    setPurgeId("");
    load();
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-5 h-5 text-cyan-400" />
        <h1 className="text-xl font-semibold">Compliance Center</h1>
      </div>
      <p className="text-sm text-slate-500 mb-4">Federal & Minnesota legal requirements tracked across the platform</p>

      {/* Disclaimer */}
      <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-200/90">
          <span className="font-medium">Not legal advice.</span> This dashboard tracks whether compliance-related documents and controls are in place. It does not certify legal compliance. Consult a Minnesota-licensed attorney for a formal review of your obligations under federal and Minnesota law.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard icon={CheckCircle2} label="Fully Compliant" value={compliantCount} accent="text-emerald-400" />
        <SummaryCard icon={XCircle} label="Action Needed" value={contractors.length - compliantCount} accent="text-rose-400" />
        <SummaryCard icon={CalendarClock} label="Docs Expired" value={expiredCount} accent="text-rose-400" />
        <SummaryCard icon={AlertTriangle} label="Expiring ≤30d" value={expiringCount} accent="text-amber-400" />
      </div>

      {/* Contractor classification */}
      <Section icon={FileText} title="Contractor Classification & Documentation" refs="Federal FLSA / IRS 1099-NEC · Minn. Stat. § 181.723 (Independent Contractor Exemption) · Minn. Stat. § 176 (Workers' Compensation)">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                  <th className="px-3 py-2.5 font-medium">Contractor</th>
                  {complianceFields.map((f) => (
                    <th key={f.key} className="px-3 py-2.5 font-medium text-center" title={f.ref}>{f.label}</th>
                  ))}
                  <th className="px-3 py-2.5 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {contractors.map((c) => {
                  const ok = isCompliant(c);
                  return (
                    <tr key={c.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-200">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.role}</div>
                      </td>
                      {complianceFields.map((f) => (
                        <td key={f.key} className="px-3 py-2.5 text-center">
                          {c[f.key] ? <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" /> : <XCircle className="w-4 h-4 text-rose-400/70 inline" />}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${ok ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"}`}>
                          {ok ? "Compliant" : "Action needed"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Minnesota requires an Independent Contractor Exemption Certificate for certain construction-related services. Misclassifying employees as contractors carries penalties under both federal FLSA and Minnesota law.
            </p>
          </div>
        )}
      </Section>

      {/* Document vault */}
      <Section icon={FileCheck2} title="Document Vault & Expiration Tracking" refs="W-9 (IRS) · Certificate of Insurance · MN Independent Contractor Exemption Certificate (§176.015 / §181.723) · Workers' Compensation (§176)">
        {loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[940px]">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                  <th className="px-3 py-2.5 font-medium">Contractor</th>
                  {docColumns.map((d) => (
                    <th key={d.key} className="px-3 py-2.5 font-medium text-center">{d.label}</th>
                  ))}
                  <th className="px-3 py-2.5 font-medium text-center">Eligible for Offers</th>
                </tr>
              </thead>
              <tbody>
                {contractors.map((c) => {
                  const comp = contractorCompliance(c);
                  return (
                    <tr key={c.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-200">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.role}</div>
                      </td>
                      {comp.docs.map((d) => (
                        <td key={d.key} className="px-3 py-2.5 text-center">
                          {d.uploaded ? (
                            <div className="flex flex-col items-center gap-1">
                              <button onClick={() => viewDoc(c[d.uri])} disabled={docBusy === c[d.uri]} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 flex items-center gap-1 disabled:opacity-50">
                                <Eye className="w-3 h-3" /> View
                              </button>
                              {d.expiry && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${expiryTone(d.exp.state)}`}>{d.exp.label}</span>}
                            </div>
                          ) : (
                            <span className="text-[10px] text-rose-400/80">Not uploaded</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${comp.canReceiveOffers ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-rose-500/15 text-rose-300 border-rose-500/30"}`}>
                          {comp.canReceiveOffers ? "Eligible" : "Blocked"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Job offers are blocked for contractors with missing or expired required documents. Renew COI, MN IC Exemption, and Workers' Comp before their expiration dates to keep contractors eligible.
            </p>
          </div>
        )}
      </Section>

      {/* Data privacy */}
      <Section icon={Database} title="Data Privacy & Breach Notification" refs="Minn. Stat. § 325E.61 (Security Breach Notification) · MN Government Data Practices Act (where applicable)">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-2">Personal Data (PII) Stored</div>
            <ul className="text-xs text-slate-400 space-y-1">
              {["Name, email, phone, emergency contact", "Pay rate & QuickBooks vendor ID", "W-9 (taxpayer ID) and certification records", "Live GPS location (when sharing enabled)"].map((p) => (
                <li key={p} className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-500" />{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-400 mb-2">Data Minimization / Right to Erasure</div>
            <p className="text-xs text-slate-500 mb-2">Permanently remove a contractor's record when their data is no longer needed.</p>
            <div className="flex gap-2">
              <select value={purgeId} onChange={(e) => setPurgeId(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <option value="">Select contractor…</option>
                {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={purge} disabled={!purgeId} className="px-3 py-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-sm flex items-center gap-1.5 hover:bg-rose-500/30 disabled:opacity-40">
                <Trash2 className="w-4 h-4" /> Purge
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Minnesota law requires notifying affected residents of a security breach involving personal information. Ensure access to this data is role-restricted and that breach response procedures are documented outside the platform.
        </p>
      </Section>

      {/* E-sign */}
      <Section icon={PenLine} title="Electronic Signatures" refs="ESIGN Act (15 U.S.C. § 7001) · Minn. Stat. ch. 325L (Minnesota UETA)">
        <p className="text-sm text-slate-400">
          {contractors.filter((c) => c.esign_consent).length} of {contractors.length} contractors have recorded e-sign consent. Electronic signatures are legally valid only where consent is obtained and recorded.
        </p>
      </Section>

      {/* Accessibility */}
      <Section icon={Eye} title="Accessibility" refs="Americans with Disabilities Act (Title III) · WCAG 2.1 AA · Minnesota Human Rights Act">
        <p className="text-sm text-slate-400">
          This application targets WCAG 2.1 AA conformance (color contrast, keyboard navigation, semantic structure). A full accessibility audit and remediation pass is recommended before public deployment.
        </p>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, refs, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5">
      <div className="flex items-center gap-2.5 mb-1">
        <Icon className="w-4 h-4 text-cyan-400" />
        <h2 className="text-sm font-medium text-slate-200">{title}</h2>
      </div>
      <p className="text-[11px] text-slate-500 mb-4">{refs}</p>
      {children}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center mb-3 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;
}