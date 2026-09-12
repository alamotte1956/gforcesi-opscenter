import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Boxes, Wrench, CalendarClock, AlertTriangle } from "lucide-react";
import FormModal from "@/components/FormModal";
import DeleteRecord from "@/components/DeleteRecord";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  checked_out: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  in_maintenance: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};
const inputCls = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";
const emptyForm = () => ({ name: "", type: "LiDAR Scanner", serial_number: "", status: "available", maintenance_due_date: "", calibration_due_date: "", notes: "" });

export default function Equipment() {
  const [items, setItems] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";

  const load = async () => {
    const [data, user] = await Promise.all([base44.entities.Equipment.list(), base44.auth.me().catch(() => null)]);
    setItems(data);
    setMe(user);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return;
    const name = form.name;
    await base44.entities.Equipment.create({
      name,
      type: form.type,
      serial_number: form.serial_number || undefined,
      status: form.status,
      maintenance_due_date: form.maintenance_due_date || undefined,
      calibration_due_date: form.calibration_due_date || undefined,
      notes: form.notes || undefined,
    });
    setForm(emptyForm());
    setShowForm(false);
    toast({ title: "Asset added", description: name });
    load();
  };

  const today = new Date();
  const dueState = (date) => {
    if (!date) return null;
    const diff = (new Date(date) - today) / 86400000;
    if (diff < 0) return "overdue";
    if (diff < 14) return "soon";
    return null;
  };
  const dueRowCls = (state) => state === "overdue" ? "text-rose-400 font-medium" : state === "soon" ? "text-rose-300 font-medium" : "text-slate-400";
  const attentionItems = items.filter((it) => dueState(it.maintenance_due_date) || dueState(it.calibration_due_date));

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Equipment & Assets</h1>
          <p className="text-sm text-slate-500">{items.length} assets tracked</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
            <Plus className="w-4 h-4" /> New Asset
          </button>
        )}
      </div>

      {!loading && attentionItems.length > 0 && (
        <div className="mb-4 flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/40 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-rose-300">{attentionItems.length} asset{attentionItems.length > 1 ? "s" : ""} need attention</span>
            <span className="text-rose-300/70"> — maintenance or calibration due now or overdue.</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className={`bg-slate-900 border rounded-xl p-4 ${(dueState(it.maintenance_due_date) || dueState(it.calibration_due_date)) ? "border-rose-500/50" : "border-slate-800"} hover:border-slate-700 transition-colors flex flex-col lg:flex-row lg:items-center gap-3`}>
              <div className="flex items-center gap-3 min-w-0 lg:w-64">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.name}</div>
                  <div className="text-xs text-slate-500 truncate">{it.type} · {it.serial_number}</div>
                </div>
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
                {it.assigned_to_contractor_name && (
                  <div className="flex gap-2"><span className="text-slate-500">Assigned to</span><span className="text-slate-300">{it.assigned_to_contractor_name}</span></div>
                )}
                {it.maintenance_due_date && (
                  <div className={`flex items-center gap-1 ${dueRowCls(dueState(it.maintenance_due_date))}`}>
                    <Wrench className="w-3 h-3" /> Maint: {it.maintenance_due_date}
                    {dueState(it.maintenance_due_date) === "overdue" && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                  </div>
                )}
                {it.calibration_due_date && (
                  <div className={`flex items-center gap-1 ${dueRowCls(dueState(it.calibration_due_date))}`}>
                    <CalendarClock className="w-3 h-3" /> Calib: {it.calibration_due_date}
                    {dueState(it.calibration_due_date) === "overdue" && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${statusStyles[it.status] || statusStyles.available}`}>{it.status.replace("_", " ")}</span>
                {isAdmin && <DeleteRecord entityName="Equipment" recordId={it.id} recordLabel={it.name} onDeleted={load} className="text-slate-500 hover:text-rose-400" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <FormModal title="New Asset" onClose={() => setShowForm(false)} onSubmit={create} submitLabel="Add Asset">
          <Field label="Asset name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="e.g. Leica BLK360 #2" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
                {["LiDAR Scanner", "Drone", "360 Camera", "Tablet", "Vehicle", "Tripod", "Other"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Serial number"><input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
              {["available", "checked_out", "in_maintenance"].map((s) => <option key={s} value={s} className="capitalize">{s.replace("_", " ")}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maintenance due"><input type="date" value={form.maintenance_due_date} onChange={(e) => setForm({ ...form, maintenance_due_date: e.target.value })} className={inputCls} /></Field>
            <Field label="Calibration due"><input type="date" value={form.calibration_due_date} onChange={(e) => setForm({ ...form, calibration_due_date: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} /></Field>
        </FormModal>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (<div><label className="block text-xs text-slate-400 mb-1">{label}</label>{children}</div>);
}