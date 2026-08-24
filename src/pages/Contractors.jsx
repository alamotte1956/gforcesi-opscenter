import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Phone, Radio, UserCheck, Clock, AlertCircle } from "lucide-react";

const statusDot = {
  available: "bg-emerald-400",
  en_route: "bg-blue-400",
  on_site: "bg-amber-400",
  off_duty: "bg-slate-500",
};

const onboardingStyles = {
  complete: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  in_progress: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pending: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export default function Contractors() {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.Contractor.list();
    setContractors(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const changeRole = async (c, role) => {
    await base44.entities.Contractor.update(c.id, { role });
    setContractors((prev) => prev.map((x) => (x.id === c.id ? { ...x, role } : x)));
  };

  const onboarded = contractors.filter((c) => c.onboarding_status === "complete").length;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Contractors</h1>
          <p className="text-sm text-slate-500">{contractors.length} contractors · {onboarded} fully onboarded</p>
        </div>
        <Link
          to="/contractors/onboarding"
          className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400"
        >
          <Plus className="w-4 h-4" /> Onboard Contractor
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Contractor</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Onboarding</th>
                <th className="px-4 py-3 font-medium">Skills</th>
                <th className="px-4 py-3 font-medium">Pay</th>
                <th className="px-4 py-3 font-medium">QB ID</th>
              </tr>
            </thead>
            <tbody>
              {contractors.map((c) => (
                <tr key={c.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-semibold text-sm">
                          {c.name?.charAt(0)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${statusDot[c.current_status] || "bg-slate-500"}`} />
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">{c.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          {c.phone && <><Phone className="w-3 h-3" />{c.phone}</>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.role}
                      onChange={(e) => changeRole(c, e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {["Field Technician", "Field Pilot", "Dispatcher", "Billing Manager", "Admin"].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs capitalize text-slate-300">
                      {c.location_sharing && <Radio className="w-3 h-3 text-emerald-400" />}
                      {c.current_status?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize inline-flex items-center gap-1 ${onboardingStyles[c.onboarding_status] || onboardingStyles.pending}`}>
                      {c.onboarding_status === "complete" ? <UserCheck className="w-3 h-3" /> : c.onboarding_status === "in_progress" ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {c.onboarding_status?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{(c.skills || []).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {c.pay_type === "hourly" ? `$${c.pay_rate}/hr` : c.pay_type === "salary" ? `$${c.pay_rate}/yr` : c.pay_type === "flat" ? `$${c.pay_rate} flat` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{c.quickbooks_id || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}