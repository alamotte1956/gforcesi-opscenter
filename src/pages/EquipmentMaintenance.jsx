import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Wrench, CalendarClock, AlertTriangle, Boxes, CheckCircle2,
  ArrowDownUp, MapPin, User, Loader2,
} from "lucide-react";

const TODAY = new Date();
const SOON_DAYS = 14;
const dayDiff = (date) => (!date ? null : Math.round((new Date(date) - TODAY) / 86400000));

function urgencyScore(it) {
  const m = dayDiff(it.maintenance_due_date);
  const c = dayDiff(it.calibration_due_date);
  const vals = [m, c].filter((v) => v !== null);
  if (!vals.length) return Infinity;
  return Math.min(...vals);
}

export default function EquipmentMaintenance() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("action"); // action | in_field | all

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.Equipment.list();
        setItems(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const enriched = useMemo(() => {
    return items.map((it) => {
      const mDays = dayDiff(it.maintenance_due_date);
      const cDays = dayDiff(it.calibration_due_date);
      const mState = mDays === null ? null : mDays < 0 ? "overdue" : mDays < SOON_DAYS ? "soon" : "ok";
      const cState = cDays === null ? null : cDays < 0 ? "overdue" : cDays < SOON_DAYS ? "soon" : "ok";
      const needsAction = mState === "overdue" || mState === "soon" || cState === "overdue" || cState === "soon";
      const inField = it.status === "checked_out";
      return { ...it, mDays, cDays, mState, cState, needsAction, inField, urgency: urgencyScore(it) };
    });
  }, [items]);

  const counts = useMemo(() => ({
    overdue: enriched.filter((it) => it.mState === "overdue" || it.cState === "overdue").length,
    soon: enriched.filter((it) =>
      (it.mState === "soon" || it.cState === "soon") &&
      !(it.mState === "overdue" || it.cState === "overdue")
    ).length,
    inMaintenance: enriched.filter((it) => it.status === "in_maintenance").length,
    inFieldNeedsAction: enriched.filter((it) => it.inField && it.needsAction).length,
    total: enriched.length,
  }), [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filter === "action") list = enriched.filter((it) => it.needsAction);
    else if (filter === "in_field") list = enriched.filter((it) => it.inField);
    return [...list].sort((a, b) => a.urgency - b.urgency);
  }, [enriched, filter]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Wrench className="w-5 h-5 text-cyan-400" /> Maintenance Dashboard
        </h1>
        <p className="text-sm text-slate-500">Track upcoming and overdue service — spot what needs to be pulled from the field.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SummaryCard icon={AlertTriangle} label="Overdue" value={counts.overdue} accent="text-rose-300" bg="bg-rose-500/10" border="border-rose-500/30" />
        <SummaryCard icon={CalendarClock} label="Due Soon" value={counts.soon} accent="text-amber-300" bg="bg-amber-500/10" border="border-amber-500/30" sub="within 14 days" />
        <SummaryCard icon={Wrench} label="In Maintenance" value={counts.inMaintenance} accent="text-blue-300" bg="bg-blue-500/10" border="border-blue-500/30" />
        <SummaryCard icon={MapPin} label="In Field · Needs Service" value={counts.inFieldNeedsAction} accent="text-orange-300" bg="bg-orange-500/10" border="border-orange-500/30" sub="checked out + overdue/soon" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { key: "action", label: `Needs Action (${counts.overdue + counts.soon})` },
          { key: "in_field", label: `In Field (${counts.inFieldNeedsAction} need service)` },
          { key: "all", label: `All Assets (${counts.total})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === t.key
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-slate-300 font-medium">All clear</p>
          <p className="text-sm text-slate-500">No assets match this filter — everything is up to date.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3 font-medium flex items-center gap-1"><ArrowDownUp className="w-3 h-3" /> Asset</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assigned To</th>
                <th className="px-4 py-3 font-medium">Maintenance</th>
                <th className="px-4 py-3 font-medium">Calibration</th>
                <th className="px-4 py-3 font-medium">Urgency</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const pullFromField = it.inField && it.needsAction;
                return (
                  <tr key={it.id} className={`border-b border-slate-800/60 hover:bg-slate-800/40 ${pullFromField ? "bg-orange-500/5" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{it.name}</div>
                          <div className="text-xs text-slate-500">{it.type}{it.serial_number ? ` · ${it.serial_number}` : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={it.status} />
                      {pullFromField && (
                        <div className="mt-1 text-[10px] text-orange-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> PULL FROM FIELD
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {it.assigned_to_contractor_name ? (
                        <span className="flex items-center gap-1.5"><User className="w-3 h-3" />{it.assigned_to_contractor_name}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3"><DueCell date={it.maintenance_due_date} days={it.mDays} state={it.mState} /></td>
                    <td className="px-4 py-3"><DueCell date={it.calibration_due_date} days={it.cDays} state={it.cState} /></td>
                    <td className="px-4 py-3"><UrgencyPill urgency={it.urgency} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent, bg, border, sub }) {
  return (
    <div className={`bg-slate-900 border rounded-xl p-4 ${border}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center ${accent}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    checked_out: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    in_maintenance: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${map[status] || map.available}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function DueCell({ date, days, state }) {
  if (!date) return <span className="text-slate-600 text-xs">—</span>;
  const cls = state === "overdue" ? "text-rose-400 font-semibold" : state === "soon" ? "text-amber-300 font-medium" : "text-slate-400";
  const label = state === "overdue" ? `${Math.abs(days)}d overdue` : state === "soon" ? `in ${days}d` : date;
  return (
    <div className={cls}>
      <div className="flex items-center gap-1">
        {state === "overdue" && <AlertTriangle className="w-3 h-3" />}
        {date}
      </div>
      <div className="text-[10px] opacity-80">{label}</div>
    </div>
  );
}

function UrgencyPill({ urgency }) {
  if (urgency === Infinity) return <span className="text-xs text-slate-600">No dates</span>;
  if (urgency < 0) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">Overdue</span>;
  if (urgency < SOON_DAYS) return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">Due soon</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">OK</span>;
}