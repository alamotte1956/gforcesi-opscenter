import React, { useState, useEffect } from "react";
import { Navigation, DollarSign, Info } from "lucide-react";

const inputCls =
  "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#4A9EFF]";

export default function MileageCalculator({
  mileageDriven = 0,
  mileageRate = 0.7,
  startLocation = "",
  endLocation = "",
  onChange,
}) {
  const [miles, setMiles] = useState(mileageDriven);
  const [rate, setRate] = useState(mileageRate);
  const [start, setStart] = useState(startLocation);
  const [end, setEnd] = useState(endLocation);

  const reimbursement = (parseFloat(miles) || 0) * (parseFloat(rate) || 0);

  useEffect(() => {
    onChange?.({
      mileage_driven: parseFloat(miles) || 0,
      mileage_rate: parseFloat(rate) || 0.7,
      mileage_reimbursement: Number(reimbursement.toFixed(2)),
      start_location: start,
      end_location: end,
    });
  }, [miles, rate, start, end]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
      <div className="px-4 py-3 bg-[#0A1628] border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Navigation className="w-4 h-4 text-[#4A9EFF]" />
          IRS Mileage Reimbursement Calculator
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-[#126DFA]/15 text-[#4A9EFF] border border-[#126DFA]/30">
          2026 IRS Rate: $0.70/mi
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-[#126DFA]/25 bg-[#126DFA]/10 px-3 py-2 text-xs text-slate-300 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#4A9EFF] shrink-0" />
          Auto-calculates reimbursable field travel for CONUS, Alaska, and Hawaii site visits.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Start Location</label>
            <input value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} placeholder="Depot / Airport / Hotel" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Destination Branch</label>
            <input value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} placeholder="e.g. BoA Branch #0142" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Miles Driven</label>
            <input type="number" step="0.1" min="0" value={miles} onChange={(e) => setMiles(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rate ($ / mile)</label>
            <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-emerald-200">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Calculated Reimbursement</span>
          </div>
          <div className="text-lg font-bold text-emerald-300">${reimbursement.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
