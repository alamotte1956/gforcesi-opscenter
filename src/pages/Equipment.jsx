import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Boxes, Wrench, CalendarClock } from "lucide-react";

const statusStyles = {
  available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  checked_out: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  in_maintenance: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

export default function Equipment() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await base44.entities.Equipment.list();
    setItems(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const today = new Date();
  const dueSoon = (date) => date && (new Date(date) - today) / 86400000 < 14 && (new Date(date) - today) / 86400000 > 0;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Equipment & Assets</h1>
          <p className="text-sm text-slate-500">{items.length} assets tracked</p>
        </div>
        <button className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
          <Plus className="w-4 h-4" /> New Asset
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-slate-500">{it.type} · {it.serial_number}</div>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[it.status] || statusStyles.available}`}>
                  {it.status.replace("_", " ")}
                </span>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                {it.assigned_to_employee_name && (
                  <div className="flex justify-between"><span className="text-slate-500">Assigned to</span><span className="text-slate-300">{it.assigned_to_employee_name}</span></div>
                )}
                {it.maintenance_due_date && (
                  <div className={`flex justify-between items-center ${dueSoon(it.maintenance_due_date) ? "text-amber-300" : "text-slate-400"}`}>
                    <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Maintenance</span>
                    <span>{it.maintenance_due_date}</span>
                  </div>
                )}
                {it.calibration_due_date && (
                  <div className={`flex justify-between items-center ${dueSoon(it.calibration_due_date) ? "text-amber-300" : "text-slate-400"}`}>
                    <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Calibration</span>
                    <span>{it.calibration_due_date}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}