import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Phone, Radio } from "lucide-react";

const statusDot = {
  available: "bg-emerald-400",
  en_route: "bg-blue-400",
  on_site: "bg-amber-400",
  off_duty: "bg-slate-500",
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.Employee.list();
    setEmployees(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Employees</h1>
          <p className="text-sm text-slate-500">{employees.length} team members</p>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
          <Plus className="w-4 h-4" /> New Employee
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Skills</th>
                <th className="px-4 py-3 font-medium">Pay</th>
                <th className="px-4 py-3 font-medium">QB ID</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-semibold text-sm">
                          {e.name?.charAt(0)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${statusDot[e.current_status] || "bg-slate-500"}`} />
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">{e.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          {e.phone && <><Phone className="w-3 h-3" />{e.phone}</>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{e.role}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs capitalize text-slate-300">
                      {e.location_sharing && <Radio className="w-3 h-3 text-emerald-400" />}
                      {e.current_status?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{(e.skills || []).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {e.pay_type === "hourly" ? `$${e.pay_rate}/hr` : e.pay_type === "salary" ? `$${e.pay_rate}/yr` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{e.quickbooks_employee_id || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}