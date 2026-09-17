import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Phone, Radio, UserCheck, Clock, AlertCircle, KeyRound, Mail, Send, History } from "lucide-react";
import DeleteRecord from "@/components/DeleteRecord";
import StatusTimeline from "@/components/contractors/StatusTimeline";
import { useToast } from "@/components/ui/use-toast";
import { ACCESS_LEVELS } from "@/lib/accessLevels";

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
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grant, setGrant] = useState(null);
  const [grantLevel, setGrantLevel] = useState("viewer");
  const [granting, setGranting] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "Field Technician" });
  const [inviting, setInviting] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testName, setTestName] = useState("");
  const [sending, setSending] = useState(false);
  const [timelineFor, setTimelineFor] = useState(null);
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";
  const isFullAccess = isAdmin || me?.access_level === "full";

  const load = async () => {
    const [data, user] = await Promise.all([base44.entities.Contractor.list(), base44.auth.me().catch(() => null)]);
    setContractors(data);
    setMe(user);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const changeRole = async (c, role) => {
    await base44.entities.Contractor.update(c.id, { role });
    setContractors((prev) => prev.map((x) => (x.id === c.id ? { ...x, role } : x)));
  };

  const openGrant = (c) => {
    setGrant(c);
    setGrantLevel(c.role === "Admin" ? "full" : "viewer");
  };

  const submitGrant = async () => {
    if (!grant?.email) {
      toast({ title: "No email on file", description: "Add an email to this contractor before granting access.", variant: "destructive" });
      return;
    }
    setGranting(true);
    try {
      const def = ACCESS_LEVELS[grantLevel] || ACCESS_LEVELS.viewer;
      try { await base44.users.inviteUser(grant.email.trim(), def.role); } catch {}
      let assigned = false;
      try {
        const list = await base44.entities.User.list();
        const found = list.find((u) => u.email === grant.email.trim());
        if (found) {
          await base44.entities.User.update(found.id, { role: def.role, access_level: grantLevel });
          assigned = true;
        }
      } catch {}
      toast({ title: assigned ? "Access granted" : "Invitation sent", description: `${grant.name} → ${def.label}` });
      setGrant(null);
    } catch (e) {
      toast({ title: "Could not grant access", description: e.message, variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

  const submitInvite = async () => {
    const name = inviteForm.name.trim();
    const email = inviteForm.email.trim();
    if (!name || !email) {
      toast({ title: "Name and email required", variant: "destructive" });
      return;
    }
    setInviting(true);
    try {
      await base44.entities.Contractor.create({
        name, email, role: inviteForm.role,
        onboarding_status: "pending",
        current_status: "off_duty", shift_status: "off_duty", location_sharing: false,
      });
      try { await base44.users.inviteUser(email, "user"); } catch {}
      try {
        const list = await base44.entities.User.list();
        const found = list.find((u) => u.email === email);
        if (found) await base44.entities.User.update(found.id, { access_level: "field" });
      } catch {}
      let onboardingEmailed = false;
      try {
        await base44.functions.invoke("inviteContractorToOnboard", { name, email });
        onboardingEmailed = true;
      } catch {}
      toast({
        title: "Invitation sent",
        description: onboardingEmailed
          ? `${name} (${email}) received an onboarding email with a direct link.`
          : `${name} (${email}) received a platform invite — after sign-in they'll be taken straight to onboarding.`,
      });
      setInviteOpen(false);
      setInviteForm({ name: "", email: "", role: "Field Technician" });
      load();
    } catch (e) {
      toast({ title: "Invite failed", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const sendTestInvite = async () => {
    const email = testEmail.trim();
    const name = testName.trim() || "Test Recipient";
    if (!email) {
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await base44.functions.invoke("inviteContractorToOnboard", { name, email });
      toast({ title: "Test invite sent", description: `Check ${email} (inbox and spam folder).` });
      setTestOpen(false);
      setTestEmail("");
      setTestName("");
    } catch (e) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const onboarded = contractors.filter((c) => c.onboarding_status === "complete").length;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Contractors</h1>
          <p className="text-sm text-slate-500">{contractors.length} contractors · {onboarded} fully onboarded</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTestOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm flex items-center gap-1.5 hover:bg-slate-700"
          >
            <Send className="w-4 h-4" /> Send Test Invite
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400"
          >
            <Mail className="w-4 h-4" /> Invite to Onboard
          </button>
          <Link
            to="/contractors/onboarding"
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm flex items-center gap-1.5 hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" /> Manual
          </Link>
        </div>
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
                <th className="px-4 py-3 font-medium">Onboarding Status</th>
                <th className="px-4 py-3 font-medium">Skills</th>
                <th className="px-4 py-3 font-medium">Pay</th>
                <th className="px-4 py-3 font-medium">QB ID</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
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
                    <span className={`text-[10px] px-2 py-0.5 rounded border inline-flex items-center gap-1 ${onboardingStyles[c.onboarding_status] || onboardingStyles.pending}`}>
                      {c.onboarding_status === "complete" ? <UserCheck className="w-3 h-3" /> : c.onboarding_status === "in_progress" ? <Clock className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {c.onboarding_status === "complete" ? "Onboarded" : c.onboarding_status === "in_progress" ? "In Progress" : "Invitation Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{(c.skills || []).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {c.pay_type === "hourly" ? `$${c.pay_rate}/hr` : c.pay_type === "salary" ? `$${c.pay_rate}/yr` : c.pay_type === "flat" ? `$${c.pay_rate} flat` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{c.quickbooks_id || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setTimelineFor(c)} title="Status timeline" className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700">
                        <History className="w-4 h-4" />
                      </button>
                      {isAdmin && c.onboarding_status === "complete" && (
                        <button onClick={() => openGrant(c)} title="Grant app access" className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20">
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}
                      {isFullAccess && <DeleteRecord entityName="Contractor" recordId={c.id} recordLabel={c.name} onDeleted={load} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {grant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setGrant(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-base font-semibold mb-1">Grant app access</h2>
            <p className="text-sm text-slate-500 mb-4">
              Invite <span className="text-slate-300">{grant.name}</span> ({grant.email || "no email on file"}) and assign a security level.
            </p>
            <label className="block text-xs text-slate-400 mb-1">Access level</label>
            <select value={grantLevel} onChange={(e) => setGrantLevel(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-cyan-500">
              {Object.entries(ACCESS_LEVELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label} — {v.description}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setGrant(null)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={submitGrant} disabled={granting} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50">
                {granting ? "Granting…" : "Invite & assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {testOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setTestOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2"><Send className="w-4 h-4 text-cyan-400" /> Send Test Invite</h2>
            <p className="text-sm text-slate-500 mb-4">Send a test onboarding invitation to any email address to verify deliverability (check inbox and spam).</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Recipient name (optional)</label>
                <input value={testName} onChange={(e) => setTestName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" placeholder="Test Recipient" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email address</label>
                <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" placeholder="you@example.com" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setTestOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={sendTestInvite} disabled={sending} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5">
                {sending ? "Sending…" : <><Send className="w-4 h-4" /> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setInviteOpen(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2"><Mail className="w-4 h-4 text-cyan-400" /> Invite contractor to onboard</h2>
            <p className="text-sm text-slate-500 mb-4">We'll create their record and email them a link to complete onboarding themselves.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full name</label>
                <input value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" placeholder="jane@example.com" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Role</label>
                <select value={inviteForm.role} onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value }))} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
                  {["Field Technician", "Field Pilot", "Dispatcher", "Billing Manager", "Admin"].map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setInviteOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={submitInvite} disabled={inviting} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5">
                {inviting ? "Sending…" : <><Mail className="w-4 h-4" /> Send invite</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {timelineFor && <StatusTimeline contractor={timelineFor} onClose={() => setTimelineFor(null)} />}
    </div>
  );
}