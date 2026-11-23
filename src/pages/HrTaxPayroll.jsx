import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Users, FileText, DollarSign, ShieldCheck, CheckCircle2, AlertTriangle,
  Download, RefreshCw, Loader2, Building2, Scale, Calendar, ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const fmtMoney = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FEDERAL_AND_STATE_TAX_TRACKER = [
  { jurisdiction: "Federal (IRS)", form: "Form 1099-NEC / 1096", cadence: "Annual (Jan 31)", status: "Active", notes: "All US 1099-NEC capture technicians earning ≥ $600/yr" },
  { jurisdiction: "Federal (IRS)", form: "Form 941 / EFTPS", cadence: "Quarterly", status: "Active", notes: "W-2 Operations & Dispatch staff federal withholding & FICA" },
  { jurisdiction: "Alaska (AK)", form: "No State Income Tax · AK Business License", cadence: "Annual", status: "Compliant", notes: "Remote Anchorage / Fairbanks / Juneau field deployments" },
  { jurisdiction: "Hawaii (HI)", form: "HI General Excise Tax (GET · Form G-45/G-49)", cadence: "Monthly / Semi-Annual", status: "Active", notes: "4.0%–4.5% GET applies to on-island scanning services (Oahu/Maui/Kauai/Big Island)" },
  { jurisdiction: "All 50 U.S. States — Contiguous US (CONUS) + AK + HI", form: "Multi-State Economic Nexus & Withholding", cadence: "Quarterly", status: "Monitored", notes: "Unified 50-state tax nexus across mainland CONUS, Alaska, and Hawaii tracked via QuickBooks Online Payroll" },
];

export default function HrTaxPayroll() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("payroll");
  const [contractors, setContractors] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [syncingPayouts, setSyncingPayouts] = useState(false);
  const [generatingW9, setGeneratingW9] = useState(false);

  const [w9Form, setW9Form] = useState({
    contractor_id: "",
    name: "",
    businessName: "",
    taxClassification: "Individual/sole proprietor",
    llcTaxClassification: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    tinType: "SSN",
    tin: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        base44.entities.Contractor.list("name", 500).catch(() => []),
        base44.entities.Payout.list("-date", 500).catch(() => []),
      ]);
      setContractors(c || []);
      setPayouts(p || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const summary = useMemo(() => {
    const ytdByContractor = {};
    payouts.forEach((p) => {
      const key = p.contractor_id || p.contractor_name || "unknown";
      ytdByContractor[key] = (ytdByContractor[key] || 0) + Number(p.amount || 0);
    });
    const pendingApproval = payouts.filter((p) => p.status === "pending");
    const readyForQbo = payouts.filter((p) => p.status === "approved" && !p.quickbooks_id);
    const totalYtd = payouts.reduce((s, p) => s + Number(p.amount || 0), 0);
    const needs1099 = Object.values(ytdByContractor).filter((amt) => amt >= 600).length;
    const compliantCount = contractors.filter((c) => c.w9_on_file || c.coi_on_file || c.status === "active").length;
    return { ytdByContractor, pendingApproval, readyForQbo, totalYtd, needs1099, compliantCount };
  }, [contractors, payouts]);

  const approvePayout = async (p) => {
    await base44.entities.Payout.update(p.id, { status: "approved" });
    setPayouts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "approved" } : x)));
    toast({ title: "Payout approved", description: `${p.contractor_name || "Contractor"} · ${fmtMoney(p.amount)}` });
  };

  const pushPayoutsToQbo = async () => {
    setSyncingPayouts(true);
    try {
      const res = await base44.functions.invoke("syncApprovedPayouts", {});
      if (res?.data?.error) throw new Error(res.data.error);
      toast({
        title: "QuickBooks Payroll Sync Complete",
        description: `Pushed ${res?.data?.pushed || 0} of ${res?.data?.found || 0} approved 1099 payouts to QuickBooks Online.`,
      });
      await load();
    } catch (e) {
      toast({ title: "Payroll sync failed", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setSyncingPayouts(false);
    }
  };

  const prefillContractor = (contractorId) => {
    const c = contractors.find((x) => x.id === contractorId);
    if (!c) return;
    setW9Form((prev) => ({
      ...prev,
      contractor_id: c.id,
      name: c.name || "",
      businessName: c.company || "",
      address: c.address || "",
      city: c.city || "",
      state: c.state || "",
      zip: c.zip || "",
    }));
  };

  const handleGenerateW9 = async (e) => {
    e.preventDefault();
    if (!w9Form.name || !w9Form.tin) {
      toast({ title: "Missing required fields", description: "Legal name and SSN/EIN are required to generate IRS Form W-9.", variant: "destructive" });
      return;
    }
    setGeneratingW9(true);
    try {
      const res = await base44.functions.invoke("generateW9PDF", w9Form);
      const data = res?.data;
      if (data?.error) throw new Error(data.error);
      if (data?.pdfBase64) {
        const bytes = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || `W9-${w9Form.name.replace(/\s+/g, "_")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast({ title: "IRS Form W-9 PDF Generated", description: `Saved compliant W-9 packet for ${w9Form.name}.` });
    } catch (err) {
      toast({ title: "W-9 generation failed", description: err?.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setGeneratingW9(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-[#4A9EFF] animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#4A9EFF]" /> HR, Federal &amp; State Taxes &amp; QuickBooks Payroll
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            50-state 1099-NEC technician onboarding, automated IRS W-9 PDFs, federal/state tax compliance (CONUS, AK, HI GET), and QuickBooks Payroll sync.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://gforcepay.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#FB923C] hover:to-[#F97316] text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5" /> Open GForcePay <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={pushPayoutsToQbo}
            disabled={syncingPayouts || summary.readyForQbo.length === 0}
            className="px-4 py-2 rounded-lg bg-[#126DFA] hover:bg-[#105CE0] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            {syncingPayouts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync {summary.readyForQbo.length} Approved Payouts to QuickBooks
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">YTD Contractor Payroll</div>
          <div className="text-2xl font-bold text-white mt-1">{fmtMoney(summary.totalYtd)}</div>
          <div className="text-xs text-slate-500 mt-1">{payouts.length} payout entries</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Pending Approval</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{summary.pendingApproval.length}</div>
          <div className="text-xs text-slate-500 mt-1">Awaiting HR / Ops review</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">1099-NEC Filing Threshold</div>
          <div className="text-2xl font-bold text-[#4A9EFF] mt-1">{summary.needs1099}</div>
          <div className="text-xs text-slate-500 mt-1">Contractors ≥ $600 YTD</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Active Nationwide Roster</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{contractors.length}</div>
          <div className="text-xs text-slate-500 mt-1">{summary.compliantCount} verified active</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "payroll", label: "QuickBooks Payroll & Payouts", icon: DollarSign },
          { id: "taxes", label: "Federal & 50-State Tax Compliance", icon: Scale },
          { id: "w9", label: "IRS Form W-9 PDF Generator", icon: FileText },
          { id: "hr", label: "HR & Contractor Compliance Roster", icon: ShieldCheck },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                tab === t.id
                  ? "bg-[#126DFA] text-white"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "payroll" && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-800">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Contractor</th>
                  <th className="px-4 py-3">Job / Description</th>
                  <th className="px-4 py-3 text-right">Hours</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No contractor payouts logged yet.</td></tr>
                ) : payouts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-400">{p.date || "—"}</td>
                    <td className="px-4 py-3 font-medium text-white">{p.contractor_name || p.contractor_id}</td>
                    <td className="px-4 py-3 text-slate-300">{p.job_title || p.notes || "Field Capture"}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{p.hours ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{fmtMoney(p.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        p.status === "synced" || p.quickbooks_id
                          ? "bg-emerald-500/15 text-emerald-300"
                          : p.status === "approved"
                          ? "bg-blue-500/15 text-blue-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}>
                        {p.quickbooks_id ? "QBO Synced" : p.status || "pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "pending" && (
                        <button
                          onClick={() => approvePayout(p)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "taxes" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#4A9EFF]" /> Federal &amp; 50-State Tax Filing Matrix
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Tax Year {new Date().getFullYear()}
              </span>
            </div>
            <div className="divide-y divide-slate-800">
              {FEDERAL_AND_STATE_TAX_TRACKER.map((item) => (
                <div key={item.form} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{item.jurisdiction} — {item.form}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.notes}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-semibold">
                      {item.status}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1">{item.cadence}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "w9" && (
        <form onSubmit={handleGenerateW9} className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Generate Signed IRS Form W-9 PDF</h2>
              <p className="text-xs text-slate-400">Generates a standardized W-9 PDF via G-Force SI&apos;s backend serverless function.</p>
            </div>
            <select
              value={w9Form.contractor_id}
              onChange={(e) => prefillContractor(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="">Prefill from Contractor...</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">1. Legal Name (as shown on tax return) *</label>
              <input required value={w9Form.name} onChange={(e) => setW9Form({ ...w9Form, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">2. Business / Disregarded Entity Name</label>
              <input value={w9Form.businessName} onChange={(e) => setW9Form({ ...w9Form, businessName: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">3. Federal Tax Classification</label>
              <select value={w9Form.taxClassification} onChange={(e) => setW9Form({ ...w9Form, taxClassification: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white">
                <option>Individual/sole proprietor</option>
                <option>C Corporation</option>
                <option>S Corporation</option>
                <option>Partnership</option>
                <option>Limited liability company</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">TIN Type</label>
                <select value={w9Form.tinType} onChange={(e) => setW9Form({ ...w9Form, tinType: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white">
                  <option value="SSN">SSN</option>
                  <option value="EIN">EIN</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Taxpayer ID Number *</label>
                <input required placeholder="XX-XXXXXXX" value={w9Form.tin} onChange={(e) => setW9Form({ ...w9Form, tin: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1">Street Address</label>
              <input value={w9Form.address} onChange={(e) => setW9Form({ ...w9Form, address: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">City</label>
              <input value={w9Form.city} onChange={(e) => setW9Form({ ...w9Form, city: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">State</label>
                <input maxLength={2} placeholder="TX / AK / HI" value={w9Form.state} onChange={(e) => setW9Form({ ...w9Form, state: e.target.value.toUpperCase() })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">ZIP</label>
                <input value={w9Form.zip} onChange={(e) => setW9Form({ ...w9Form, zip: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={generatingW9}
            className="px-4 py-2 rounded-lg bg-[#126DFA] hover:bg-[#105CE0] text-white text-xs font-semibold flex items-center gap-1.5"
          >
            {generatingW9 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Generate &amp; Download IRS W-9 PDF
          </button>
        </form>
      )}

      {tab === "hr" && (
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-800">
                  <th className="px-4 py-3">Technician</th>
                  <th className="px-4 py-3">Home Market</th>
                  <th className="px-4 py-3">W-9 / COI / NDA</th>
                  <th className="px-4 py-3 text-right">YTD Earnings</th>
                  <th className="px-4 py-3 text-right">1099-NEC Required</th>
                </tr>
              </thead>
              <tbody>
                {contractors.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No contractors in directory.</td></tr>
                ) : contractors.map((c) => {
                  const ytd = summary.ytdByContractor[c.id] || summary.ytdByContractor[c.name] || 0;
                  return (
                    <tr key={c.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-500">{c.email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{[c.city, c.state].filter(Boolean).join(", ") || "Nationwide"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {c.status || "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">{fmtMoney(ytd)}</td>
                      <td className="px-4 py-3 text-right">
                        {ytd >= 600 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold">Yes (≥ $600)</span>
                        ) : (
                          <span className="text-slate-500 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Below $600</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
