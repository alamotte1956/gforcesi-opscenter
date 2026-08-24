import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Clock, AlertTriangle } from "lucide-react";

const statusStyles = {
  open: "bg-slate-700 text-slate-300 border-slate-600",
  submitted: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  locked: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

export default function Timesheets() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.TimeEntry.list("-clock_in");
    setEntries(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const approve = async (entry) => {
    await base44.entities.TimeEntry.update(entry.id, { status: "approved", approved_by: "manager" });
    load();
  };

  const totalHours = entries.reduce((s, e) => s + (e.regular_hours || 0) + (e.overtime_hours || 0), 0);
  const pending = entries.filter((e) => e.status === "submitted").length;
  const flagged = entries.filter((e) => !e.clock_out && e.status !== "open").length;

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">Timesheets</h1>
        <p className="text-sm text-slate-500">Payroll preparation & time approval</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-500">Total Hours</div>
          <div className="text-xl font-semibold mt-1">{totalHours.toFixed(1)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending Approval</div>
          <div className="text-xl font-semibold mt-1 text-amber-300">{pending}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="text-xs text-slate-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Missing Clock-out</div>
          <div className="text-xl font-semibold mt-1 text-rose-300">{flagged}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Contractor</th>
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Clock In</th>
                <th className="px-4 py-3 font-medium">Clock Out</th>
                <th className="px-4 py-3 font-medium text-right">Reg</th>
                <th className="px-4 py-3 font-medium text-right">OT</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-slate-200">{e.contractor_name}</td>
                  <td className="px-4 py-3 text-slate-400">{e.job_title || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{e.clock_in ? new Date(e.clock_in).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{e.clock_out ? new Date(e.clock_out).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{e.regular_hours?.toFixed(1) || "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-300">{e.overtime_hours?.toFixed(1) || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[e.status] || statusStyles.open}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {e.status === "submitted" && (
                      <button onClick={() => approve(e)} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-xs">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}