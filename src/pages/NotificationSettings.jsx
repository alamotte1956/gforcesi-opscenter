import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Save, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const EVENT_OPTIONS = [
  { key: "job_assigned", label: "Job Assignments", desc: "When a new job is assigned to you" },
  { key: "status_changed", label: "Job Status Changes", desc: "When a job you're on changes status" },
  { key: "maintenance_due", label: "Equipment Maintenance", desc: "When assigned equipment needs service or calibration" },
  { key: "daily_report", label: "Daily Operations Report", desc: "Daily summary email of operations activity" },
  { key: "expense_approved", label: "Expense Approved", desc: "When an expense you filed is approved" },
  { key: "expense_rejected", label: "Expense Rejected", desc: "When an expense you filed is rejected" },
];

const CHANNEL_OPTIONS = [
  { key: "push", label: "Push Notification", desc: "Mobile push notifications (requires app install)" },
  { key: "email", label: "Email", desc: "Notifications sent to your email address" },
  { key: "in_app", label: "In-App", desc: "Notifications inside the OpsCenter app" },
];

const DEFAULT_PREFS = {
  job_assigned: true,
  status_changed: true,
  maintenance_due: true,
  daily_report: false,
  expense_approved: true,
  expense_rejected: true,
  channels: { push: true, email: true, in_app: true },
};

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (me?.notification_preferences) {
          setPrefs({ ...DEFAULT_PREFS, ...me.notification_preferences, channels: { ...DEFAULT_PREFS.channels, ...(me.notification_preferences.channels || {}) } });
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const toggleEvent = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));
  const toggleChannel = (key) => setPrefs((p) => ({ ...p, channels: { ...p.channels, [key]: !p.channels[key] } }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ notification_preferences: prefs });
      toast({ title: "Preferences saved", description: "Your notification settings have been updated." });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message || "Could not save preferences.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Notification Settings</h1>
          <p className="text-sm text-slate-500">Choose what you get notified about and how</p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-slate-300 mb-1">Notification Events</h2>
          <p className="text-xs text-slate-500 mb-4">Toggle the events you want to receive alerts for.</p>
          <div className="space-y-1">
            {EVENT_OPTIONS.map((opt) => (
              <ToggleRow key={opt.key} label={opt.label} desc={opt.desc} checked={!!prefs[opt.key]} onToggle={() => toggleEvent(opt.key)} />
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-medium text-slate-300 mb-1">Delivery Channels</h2>
          <p className="text-xs text-slate-500 mb-4">Choose how you'd like to receive notifications.</p>
          <div className="space-y-1">
            {CHANNEL_OPTIONS.map((opt) => (
              <ToggleRow key={opt.key} label={opt.label} desc={opt.desc} checked={!!prefs.channels?.[opt.key]} onToggle={() => toggleChannel(opt.key)} />
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-2 hover:bg-cyan-400 disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          Save Preferences
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/60 transition-colors text-left"
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-200">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      <div className={`w-10 h-6 rounded-full transition-colors flex items-center shrink-0 ml-3 ${checked ? "bg-cyan-500" : "bg-slate-700"}`}>
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}