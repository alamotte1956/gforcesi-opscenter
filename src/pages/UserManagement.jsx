import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { UserCog, Mail, Crown, Plus, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const roleStyles = {
  admin: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  user: "bg-slate-700 text-slate-300 border-slate-600",
};

const fmtDate = (v) => v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "user" });
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

  const changeRole = async (u, role) => {
    try {
      await base44.entities.User.update(u.id, { role });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
      toast({ title: "Role updated", description: `${u.email} → ${role}` });
    } catch (e) {
      toast({ title: "Could not update role", description: e.message, variant: "destructive" });
    }
  };

  const sendInvite = async () => {
    if (!inviteForm.email.trim()) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteForm.email.trim(), inviteForm.role);
      toast({ title: "Invitation sent", description: inviteForm.email });
      setInviteOpen(false);
      setInviteForm({ email: "", role: "user" });
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
          <p className="text-sm text-slate-500">{users.length} app users · assign roles after onboarding</p>
        </div>
        <button onClick={() => setInviteOpen(true)} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
          <Plus className="w-4 h-4" /> Invite User
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
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
                    value={u.role || "user"}
                    onChange={(e) => changeRole(u, e.target.value)}
                    className={`text-xs px-2 py-1 rounded border capitalize focus:outline-none focus:ring-1 focus:ring-cyan-500 ${roleStyles[u.role] || roleStyles.user}`}
                  >
                    <option value="user" className="bg-slate-800 text-slate-200">user</option>
                    <option value="admin" className="bg-slate-800 text-slate-200">admin</option>
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
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="user">User — standard access</option>
                <option value="admin">Admin — full access, can manage users</option>
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