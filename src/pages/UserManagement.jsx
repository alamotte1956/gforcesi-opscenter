import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { UserCog, Mail, Crown, Plus, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ACCESS_LEVELS } from "@/lib/accessLevels";

const levelStyles = {
  full: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  dispatcher: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  billing: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  viewer: "bg-slate-700 text-slate-300 border-slate-600",
  field: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  client: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

const fmtDate = (v) => v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", access_level: "viewer" });
  const [inviting, setInviting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    try {
      const data = await base44.entities.User.list();
      setUsers(data);
    } catch (e) {
      setDenied(true);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const changeAccess = async (u, level) => {
    const def = ACCESS_LEVELS[level];
    if (!def) return;
    try {
      await base44.entities.User.update(u.id, { role: def.role, access_level: level });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: def.role, access_level: level } : x)));
      toast({ title: "Access updated", description: `${u.email} → ${def.label}` });
    } catch (e) {
      toast({ title: "Could not update access", description: e.message, variant: "destructive" });
    }
  };

  const sendInvite = async () => {
    if (!inviteForm.email.trim()) return;
    setInviting(true);
    try {
      const def = ACCESS_LEVELS[inviteForm.access_level] || ACCESS_LEVELS.viewer;
      await base44.users.inviteUser(inviteForm.email.trim(), def.role);
      try {
        const list = await base44.entities.User.list();
        const created = list.find((x) => x.email === inviteForm.email.trim());
        if (created) await base44.entities.User.update(created.id, { access_level: inviteForm.access_level });
      } catch {}
      toast({ title: "Invitation sent", description: inviteForm.email });
      setInviteOpen(false);
      setInviteForm({ email: "", access_level: "viewer" });
      load();
    } catch (e) {
      toast({ title: "Invite failed", description: e.message, variant: "destructive" });
    }
    setInviting(false);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  if (denied) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center mt-16">
        <ShieldAlert className="w-12 h-12 text-slate-700 mb-4" />
        <h2 className="text-lg font-semibold mb-1">Admin access required</h2>
        <p className="text-sm text-slate-500">Only administrators can manage user roles.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><UserCog className="w-5 h-5 text-cyan-400" /> User Management</h1>
          <p className="text-sm text-slate-500">{users.length} app users · assign a security access level to control what each user can reach</p>
        </div>
        <button onClick={() => setInviteOpen(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
          <Plus className="w-4 h-4" /> Invite User
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-5">
        {Object.entries(ACCESS_LEVELS).map(([k, v]) => (
          <div key={k} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
            <div className="text-xs font-medium text-slate-200">{v.label}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{v.description}</div>
          </div>
        ))}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Access Level</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-semibold text-sm">
                      {u.full_name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="font-medium text-slate-200">{u.full_name || "—"}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.access_level || (u.role === "admin" ? "full" : "viewer")}
                    onChange={(e) => changeAccess(u, e.target.value)}
                    className={`text-xs px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${levelStyles[u.access_level || (u.role === "admin" ? "full" : "viewer")] || levelStyles.viewer}`}
                  >
                    {Object.entries(ACCESS_LEVELS).map(([k, v]) => (
                      <option key={k} value={k} className="bg-slate-800 text-slate-200">{v.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(u.created_date)}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={inviteOpen} onOpenChange={(v) => !v && setInviteOpen(false)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="w-4 h-4 text-cyan-400" /> Invite a new user</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email address</label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                placeholder="colleague@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Access level</label>
              <select
                value={inviteForm.access_level}
                onChange={(e) => setInviteForm((f) => ({ ...f, access_level: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              >
                {Object.entries(ACCESS_LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} — {v.description}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setInviteOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200">Cancel</button>
            <button onClick={sendInvite} disabled={inviting || !inviteForm.email.trim()} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5">
              {inviting ? "Sending…" : <><Mail className="w-4 h-4" /> Send invite</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}