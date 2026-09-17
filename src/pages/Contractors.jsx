import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, Phone, Radio, UserCheck, Clock, AlertCircle, KeyRound, Mail, Send, History, Archive, Loader2, Briefcase } from "lucide-react";
import CrudActions from "@/components/CrudActions";
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
  const [users, setUsers] = useState([]);
  const [invitingAll, setInvitingAll] = useState(false);
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
  const [showArchived, setShowArchived] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [offers, setOffers] = useState([]);
  const [offerFor, setOfferFor] = useState(null);
  const [offerJobId, setOfferJobId] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";
  const isFullAccess = isAdmin || me?.access_level === "full";

  const normalizeEmail = (e) => (e || "").trim().toLowerCase().replace(/\+.*@/, "@").replace(/@(googlemail|gmail)\.com$/, "@gmail.com");
  const accountReady = (c) => !!(c.email && users.some((u) => normalizeEmail(u.email) === normalizeEmail(c.email)));

  const load = async () => {
    const [data, userList, user, jobList, offerList] = await Promise.all([
      base44.entities.Contractor.list(),
      base44.entities.User.list().catch(() => []),
      base44.auth.me().catch(() => null),
      base44.entities.Job.list().catch(() => []),
      base44.entities.JobOffer.list().catch(() => []),
    ]);
    setContractors(data);
    setUsers(userList);
    setMe(user);
    setJobs(jobList);
    setOffers(offerList);
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

  const withAccount = contractors.filter((c) => accountReady(c)).length;
  const missingAccount = contractors.filter((c) => c.email && !accountReady(c));

  const inviteAll = async () => {
    if (missingAccount.length === 0) { toast({ title: "All set", description: "Every contractor with an email already has a sign-in account." }); return; }
    setInvitingAll(true);
    let ok = 0, fail = 0;
    for (const c of missingAccount) {
      try { await base44.users.inviteUser(c.email.trim(), "user"); ok++; }
      catch { fail++; }
    }
    setInvitingAll(false);
    await load();
    toast({ title: "Invitations sent", description: `${ok} contractor(s) invited to create their sign-in${fail ? `, ${fail} failed` : ""}.` });
  };

  const onboarded = contractors.filter((c) => c.onboarding_status === "complete").length;

  const availableJobsFor = (c) => {
    if (!c) return [];
    const activeOfferJobIds = new Set(offers.filter((o) => o.contractor_id === c.id && ["offered", "accepted"].includes(o.status)).map((o) => o.job_id));
    return jobs.filter((j) => j.status === "scheduled" && !(j.assigned_contractor_ids || []).includes(c.id) && !activeOfferJobIds.has(j.id));
  };

  const submitOffer = async () => {
    if (!offerFor || !offerJobId) { toast({ title: "Select a job to offer", variant: "destructive" }); return; }
    const job = jobs.find((j) => j.id === offerJobId);
    if (!job) return;
    setCreating(true);
    try {
      await base44.entities.JobOffer.create({
        job_id: job.id,
        job_title: job.title,
        project_name: job.project_name,
        client_name: job.client_name,
        site_address: job.site_address,
        latitude: job.latitude,
        longitude: job.longitude,
        contractor_id: offerFor.id,
        contractor_name: offerFor.name,
        contractor_email: offerFor.email,
        status: "offered",
        offered_at: new Date().toISOString(),
        scheduled_start: job.scheduled_start,
        scan_window_start: job.scan_window_start,
        scan_window_end: job.scan_window_end,
        priority: job.priority,
        estimated_duration_hours: job.estimated_duration_hours,
        billable_rate_type: job.billable_rate_type,
        billable_rate: job.billable_rate,
        notes: offerNotes,
      });
      toast({ title: "Offer sent", description: `${offerFor.name} was offered "${job.title}".` });
      setOfferFor(null); setOfferJobId(""); setOfferNotes("");
      load();
    } catch (e) {
      toast({ title: "Failed to send offer", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Contractors</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">{contractors.length} contractors · {onboarded} fully onboarded · {withAccount}/{contractors.length} have sign-in</p>
            <button onClick={() => setShowArchived((v) => !v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${showArchived ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"}`}>
              <Archive className="w-4 h-4" /> {showArchived ? "Showing archived" : "Show archived"}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={inviteAll}
            disabled={invitingAll || missingAccount.length === 0}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium text-sm flex items-center gap-1.5 hover:bg-emerald-500/25 disabled:opacity-50"
            title={missingAccount.length ? `${missingAccount.length} contractor(s) without a sign-in account` : "All contractors have sign-in access"}
          >
            {invitingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            Invite all ({missingAccount.length})
          </button>
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
                <th className="px-4 py-3 font-medium">Sign-in</th>
                <th className="px-4 py-3 font-medium">Skills / Days</th>
                <th className="px-4 py-3 font-medium">Pay</th>
                <th className="px-4 py-3 font-medium">QB ID</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contractors.filter((c) => (showArchived ? c.archived : !c.archived)).map((c) => (
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
                  <td className="px-4 py-3">
                    {accountReady(c) ? (
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-300 border-emerald-500/30 inline-flex items-center gap-1"><UserCheck className="w-3 h-3" />Ready</span>
                    ) : c.email ? (
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/30 inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" />No account</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded border bg-rose-500/15 text-rose-300 border-rose-500/30 inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" />No email</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    <div>{(c.skills || []).join(", ") || "—"}</div>
                    {c.available_days?.length > 0 && <div className="text-[10px] text-cyan-400/80 mt-0.5">Days: {c.available_days.join(", ")}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {c.pay_type === "hourly" ? `$${c.pay_rate}/hr` : c.pay_type === "salary" ? `$${c.pay_rate}/yr` : c.pay_type === "flat" ? `$${c.pay_rate} flat` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{c.quickbooks_id || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setTimelineFor(c)} title="Status timeline" className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700">
                        <History className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => { setOfferFor(c); setOfferJobId(""); setOfferNotes(""); }} title="Offer a job" className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700">
                          <Briefcase className="w-4 h-4" />
                        </button>
                      )}
                      {isAdmin && c.onboarding_status === "complete" && (
                        <button onClick={() => openGrant(c)} title="Grant app access" className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20">
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}
                      {isFullAccess && <CrudActions entityName="Contractor" record={c} label={c.name} onSaved={load} fields={contractorFields} />}
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

      {offerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOfferFor(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold flex items-center gap-2"><Briefcase className="w-4 h-4 text-cyan-400" /> Offer a job to {offerFor.name}</h2>
              <button onClick={() => setOfferFor(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select a job</label>
                {availableJobsFor(offerFor).length === 0 ? (
                  <div className="text-sm text-slate-500 bg-slate-950 border border-slate-800 rounded-lg p-3">No scheduled jobs available to offer this contractor.</div>
                ) : (
                  <select value={offerJobId} onChange={(e) => setOfferJobId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
                    <option value="">— Choose a job —</option>
                    {availableJobsFor(offerFor).map((j) => (
                      <option key={j.id} value={j.id}>{j.title}{j.client_name ? ` · ${j.client_name}` : ""}{j.scheduled_start ? ` · ${new Date(j.scheduled_start).toLocaleDateString()}` : ""}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
                <textarea value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 resize-none" placeholder="Details for the contractor…" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setOfferFor(null)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={submitOffer} disabled={creating || !offerJobId} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-1.5">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const contractorFields = [
  { key: "name", label: "Name", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "phone", label: "Phone", type: "text" },
  { key: "role", label: "Role", type: "select", options: ["Field Technician", "Field Pilot", "Dispatcher", "Billing Manager", "Admin"] },
  { key: "region", label: "Region", type: "text" },
  { key: "base_address", label: "Home base / depot address", type: "text" },
  { key: "shift_start", label: "Shift start", type: "time" },
  { key: "shift_end", label: "Shift end", type: "time" },
  { key: "max_daily_hours", label: "Max daily hours", type: "number" },
  { key: "available_days", label: "Available days (mon, tue, wed, thu, fri, sat, sun)", type: "tags" },
  { key: "pay_type", label: "Pay type", type: "select", options: ["hourly", "flat", "salary"] },
  { key: "pay_rate", label: "Pay rate", type: "number" },
  { key: "quickbooks_id", label: "QuickBooks ID", type: "text" },
  { key: "skills", label: "Skills (comma-separated)", type: "tags" },
  { key: "certifications", label: "Certifications (comma-separated)", type: "tags" },
  { key: "assigned_equipment", label: "Assigned equipment (comma-separated)", type: "tags" },
  { key: "emergency_contact", label: "Emergency contact", type: "text" },
];