import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Users, Building2, Target, FileText, Bell, Repeat,
  Plus, Phone, Mail, Calendar, ArrowRight, CheckCircle2, Loader2, FolderKanban, X,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PIPELINE_STAGES = [
  { id: "new", label: "New Lead", color: "border-slate-600 text-slate-300" },
  { id: "qualified", label: "Qualified", color: "border-[#4A9EFF] text-[#4A9EFF]" },
  { id: "proposal_sent", label: "Proposal Sent", color: "border-purple-400 text-purple-300" },
  { id: "negotiation", label: "Negotiation", color: "border-[#F97316] text-[#FF8A3D]" },
  { id: "won", label: "Won / Contracted", color: "border-emerald-400 text-emerald-300" },
];

const fmtMoney = (n) =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function CrmHub() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pipeline");
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);

  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", company: "", email: "", phone: "", estimated_value: "", status: "new", notes: "" });
  const [contactForm, setContactForm] = useState({ name: "", title: "", email: "", phone: "" });
  const [activityForm, setActivityForm] = useState({ type: "call", summary: "", next_followup_date: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [c, l, pr, pj, rec] = await Promise.all([
        base44.entities.Client.list().catch(() => []),
        base44.entities.Lead.list("-created_date").catch(() => []),
        base44.entities.Proposal.list("-created_date").catch(() => []),
        base44.entities.Project.list().catch(() => []),
        base44.entities.RecurringSchedule.list().catch(() => []),
      ]);
      setClients(c || []);
      setLeads(l || []);
      setProposals(pr || []);
      setProjects(pj || []);
      setRecurring(rec || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const pipelineValue = leads.filter((l) => l.status !== "lost").reduce((s, l) => s + Number(l.estimated_value || 0), 0);
    const dueFollowups = clients.filter((c) => c.next_followup_date).length;
    return {
      totalClients: clients.length,
      openLeads: leads.filter((l) => !["won", "lost"].includes(l.status)).length,
      pipelineValue,
      dueFollowups,
      recurringCount: recurring.length + clients.filter((c) => c.recurring_cadence && c.recurring_cadence !== "none").length,
    };
  }, [clients, leads, recurring]);

  const advanceLead = async (lead, nextStage) => {
    setLeads((prev) => prev.map((x) => (x.id === lead.id ? { ...x, status: nextStage } : x)));
    await base44.entities.Lead.update(lead.id, { status: nextStage });
    toast({ title: "Pipeline Updated", description: `${lead.company || lead.name} → ${nextStage}` });
  };

  const createLead = async (e) => {
    e.preventDefault();
    if (!leadForm.name && !leadForm.company) return;
    await base44.entities.Lead.create({
      ...leadForm,
      estimated_value: Number(leadForm.estimated_value || 0),
      source: "CRM Hub",
    });
    setLeadForm({ name: "", company: "", email: "", phone: "", estimated_value: "", status: "new", notes: "" });
    setNewLeadOpen(false);
    toast({ title: "Lead Added", description: "Added to sales pipeline." });
    load();
  };

  const addContactToClient = async (e) => {
    e.preventDefault();
    if (!selectedClient || !contactForm.name) return;
    const contacts = [...(selectedClient.contacts || []), { ...contactForm, id: `ct_${Date.now()}` }];
    const updated = { ...selectedClient, contacts };
    await base44.entities.Client.update(selectedClient.id, { contacts });
    setSelectedClient(updated);
    setClients((prev) => prev.map((c) => (c.id === selectedClient.id ? updated : c)));
    setContactForm({ name: "", title: "", email: "", phone: "" });
    toast({ title: "Contact Saved", description: `Added ${contactForm.name} to ${selectedClient.name}.` });
  };

  const logActivity = async (e) => {
    e.preventDefault();
    if (!selectedClient || !activityForm.summary) return;
    const entry = {
      id: `act_${Date.now()}`,
      date: new Date().toISOString(),
      type: activityForm.type,
      summary: activityForm.summary,
    };
    const activity_log = [entry, ...(selectedClient.activity_log || [])];
    const patch = {
      activity_log,
      ...(activityForm.next_followup_date ? { next_followup_date: activityForm.next_followup_date } : {}),
    };
    const updated = { ...selectedClient, ...patch };
    await base44.entities.Client.update(selectedClient.id, patch);
    setSelectedClient(updated);
    setClients((prev) => prev.map((c) => (c.id === selectedClient.id ? updated : c)));
    setActivityForm({ type: "call", summary: "", next_followup_date: "" });
    toast({ title: "Activity Logged", description: "Customer timeline & follow-up reminder updated." });
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-[#F97316] animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#F97316]" /> Customer Relationship Management (CRM)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage Ad Agencies, Enterprise Brands, contacts, sales pipeline, proposals, follow-up reminders &amp; linked digital twin projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/proposals" className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-white">
            Proposals Builder
          </Link>
          <button
            onClick={() => setNewLeadOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#FB923C] hover:to-[#F97316] text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New Sales Lead
          </button>
        </div>
      </div>

      {/* CRM KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-4">
          <div className="text-xs text-slate-400">Company Profiles</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.totalClients}</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-4">
          <div className="text-xs text-slate-400">Active Leads</div>
          <div className="text-2xl font-bold text-[#4A9EFF] mt-1">{stats.openLeads}</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-4">
          <div className="text-xs text-slate-400">Pipeline Value</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{fmtMoney(stats.pipelineValue)}</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-4">
          <div className="text-xs text-slate-400">Scheduled Follow-Ups</div>
          <div className="text-2xl font-bold text-[#FF8A3D] mt-1">{stats.dueFollowups}</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-4">
          <div className="text-xs text-slate-400">Recurring Accounts</div>
          <div className="text-2xl font-bold text-cyan-300 mt-1">{stats.recurringCount}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "pipeline", label: "Sales Pipeline", icon: Target },
          { id: "companies", label: "Companies, Contacts & Projects", icon: Building2 },
          { id: "proposals", label: "Proposals & Agreements", icon: FileText },
          { id: "reminders", label: "Follow-Up Reminders", icon: Bell },
          { id: "recurring", label: "Recurring Relationships", icon: Repeat },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                tab === t.id ? "bg-[#126DFA] text-white" : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SALES PIPELINE KANBAN */}
      {tab === "pipeline" && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {PIPELINE_STAGES.map((stage, idx) => {
            const stageLeads = leads.filter((l) => {
              const st = l.status === "proposal" ? "proposal_sent" : l.status || l.stage || "new";
              return st === stage.id;
            });
            const nextStage = PIPELINE_STAGES[idx + 1];
            return (
              <div key={stage.id} className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-3 flex flex-col gap-2.5">
                <div className={`pb-2 border-b ${stage.color} flex items-center justify-between text-xs font-bold`}>
                  <span>{stage.label}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">{stageLeads.length}</span>
                </div>
                {stageLeads.length === 0 ? (
                  <div className="text-[11px] text-slate-500 text-center py-6">No deals in stage</div>
                ) : stageLeads.map((l) => (
                  <div key={l.id} className="rounded-lg bg-[#0A1628] border border-slate-800 p-3 space-y-1.5 text-xs">
                    <div className="font-semibold text-white">{l.company || l.name}</div>
                    <div className="text-[11px] text-slate-400">{l.name}</div>
                    {l.estimated_value > 0 && (
                      <div className="text-emerald-400 font-bold">{fmtMoney(l.estimated_value)}</div>
                    )}
                    {l.notes && <p className="text-[11px] text-slate-500 line-clamp-2">{l.notes}</p>}
                    {nextStage && (
                      <button
                        onClick={() => advanceLead(l, nextStage.id)}
                        className="w-full mt-1 py-1 rounded bg-[#126DFA]/20 hover:bg-[#126DFA] text-[#4A9EFF] hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition"
                      >
                        Move to {nextStage.label} <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: COMPANIES, CONTACTS & LINKED DIGITAL TWIN PROJECTS */}
      {tab === "companies" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-2.5">
            {clients.map((c) => {
              const linkedProjects = projects.filter((p) => p.client_id === c.id);
              const isSel = selectedClient?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClient(c)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    isSel
                      ? "bg-[#126DFA]/15 border-[#F97316]"
                      : "bg-[#0D1C33] border-[#1E3A5F] hover:border-[#4A9EFF]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-white text-sm">{c.name}</div>
                    <span className="px-2 py-0.5 rounded bg-[#126DFA]/20 text-[#4A9EFF] text-[10px] font-semibold uppercase">
                      {c.client_type || "enterprise"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1"><FolderKanban className="w-3.5 h-3.5 text-[#FF8A3D]" /> {linkedProjects.length} project(s)</span>
                    <span>{(c.contacts || []).length} contact(s)</span>
                    {c.next_followup_date && <span className="text-amber-300">Follow-up: {c.next_followup_date}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-5 space-y-5">
            {!selectedClient ? (
              <div className="text-center py-16 text-sm text-slate-500">
                Select a client company on the left to manage contacts, communications, follow-ups &amp; linked digital twin projects.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedClient.name}</h2>
                    <div className="text-xs text-slate-400 flex flex-wrap gap-3 mt-1">
                      {selectedClient.billing_email && <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedClient.billing_email}</span>}
                      {selectedClient.billing_phone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedClient.billing_phone}</span>}
                      <span>SLA: {selectedClient.sla_turnaround_hours || 48}h</span>
                    </div>
                  </div>
                  <Link to="/projects" className="px-3 py-1.5 rounded-lg bg-[#126DFA] text-white text-xs font-semibold">
                    View Linked Projects →
                  </Link>
                </div>

                {/* Linked Digital Twin Projects */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A9EFF] mb-2">Linked Digital Twin Projects</h3>
                  <div className="space-y-1.5">
                    {projects.filter((p) => p.client_id === selectedClient.id).length === 0 ? (
                      <p className="text-xs text-slate-500">No projects linked yet.</p>
                    ) : projects.filter((p) => p.client_id === selectedClient.id).map((p) => (
                      <div key={p.id} className="p-2.5 rounded-lg bg-[#0A1628] border border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-medium text-white">{p.name}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 capitalize">{p.lifecycle_stage || p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contacts Management */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF8A3D]">Stakeholder Contacts</h3>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(selectedClient.contacts || []).map((ct, i) => (
                      <div key={ct.id || i} className="p-2.5 rounded-lg bg-[#0A1628] border border-slate-800 text-xs">
                        <div className="font-semibold text-white">{ct.name} {ct.title && <span className="text-slate-400 font-normal">· {ct.title}</span>}</div>
                        <div className="text-[11px] text-slate-400">{ct.email} {ct.phone && `· ${ct.phone}`}</div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={addContactToClient} className="grid sm:grid-cols-4 gap-2 text-xs pt-1">
                    <input placeholder="Contact Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white" />
                    <input placeholder="Title" value={contactForm.title} onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white" />
                    <input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white" />
                    <button type="submit" className="px-3 py-1.5 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-white font-semibold">+ Add Contact</button>
                  </form>
                </div>

                {/* Activity Log & Follow-Up Reminder */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A9EFF]">Communications &amp; Follow-Up Log</h3>
                  <form onSubmit={logActivity} className="grid sm:grid-cols-12 gap-2 text-xs">
                    <select value={activityForm.type} onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })} className="sm:col-span-2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white">
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                      <option value="note">Note</option>
                    </select>
                    <input placeholder="Log customer interaction..." value={activityForm.summary} onChange={(e) => setActivityForm({ ...activityForm, summary: e.target.value })} className="sm:col-span-5 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white" />
                    <input type="date" title="Next Follow-Up Date" value={activityForm.next_followup_date} onChange={(e) => setActivityForm({ ...activityForm, next_followup_date: e.target.value })} className="sm:col-span-3 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white" />
                    <button type="submit" className="sm:col-span-2 px-2 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold">Log</button>
                  </form>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {(selectedClient.activity_log || []).map((a, idx) => (
                      <div key={a.id || idx} className="p-2.5 rounded-lg bg-[#0A1628] border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-[#FF8A3D] mr-2">{a.type}</span>
                          <span className="text-slate-200">{a.summary}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{a.date ? new Date(a.date).toLocaleDateString() : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PROPOSALS & AGREEMENTS */}
      {tab === "proposals" && (
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-800">
                <th className="px-4 py-3">Proposal / Estimate</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No proposals created yet. <Link to="/proposals" className="text-[#4A9EFF] underline">Create one →</Link></td></tr>
              ) : proposals.map((pr) => (
                <tr key={pr.id} className="border-b border-slate-800/60">
                  <td className="px-4 py-3 font-medium text-white">{pr.title || pr.project_name || pr.proposal_number || pr.name || "Enterprise Proposal"}</td>
                  <td className="px-4 py-3 text-slate-300">{pr.client_name || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-400">{fmtMoney(pr.actual_total ?? pr.estimated_total ?? pr.total ?? pr.amount ?? 0)}</td>
                  <td className="px-4 py-3 capitalize text-[#4A9EFF]">{pr.status || "draft"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: FOLLOW-UP REMINDERS */}
      {tab === "reminders" && (
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] divide-y divide-slate-800">
          {clients.filter((c) => c.next_followup_date).length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No follow-up dates scheduled yet. Open any company under <strong>Companies &amp; Contacts</strong> to log a follow-up reminder.
            </div>
          ) : clients.filter((c) => c.next_followup_date).map((c) => (
            <div key={c.id} className="p-4 flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-white">{c.name}</div>
                <div className="text-slate-400 mt-0.5">{c.activity_log?.[0]?.summary || "Scheduled enterprise check-in"}</div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[#F97316]/15 border border-[#F97316]/40 text-[#FF8A3D] font-semibold inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {c.next_followup_date}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: RECURRING RELATIONSHIPS */}
      {tab === "recurring" && (
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Recurring Scan Schedules &amp; Enterprise Retainers</h3>
            <Link to="/recurring-schedules" className="text-xs text-[#4A9EFF] hover:underline">Manage Schedules →</Link>
          </div>
          {recurring.length === 0 ? (
            <p className="text-xs text-slate-500 py-6">No recurring schedules configured yet. Add monthly/quarterly branch refreshes in Recurring Scans.</p>
          ) : recurring.map((r) => (
            <div key={r.id} className="p-3 rounded-lg bg-[#0A1628] border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-white">{r.title || r.project_name || "Recurring Capture"}</div>
                <div className="text-slate-400">{r.frequency || r.cadence || "Monthly"}</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
          ))}
        </div>
      )}

      {/* New Lead Modal */}
      {newLeadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setNewLeadOpen(false)} />
          <form onSubmit={createLead} className="relative w-full max-w-md rounded-2xl bg-[#0D1C33] border border-[#1E3A5F] p-5 space-y-3 text-xs shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Add Enterprise Sales Lead</h2>
              <button type="button" onClick={() => setNewLeadOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <input required placeholder="Company / Agency Name *" value={leadForm.company} onChange={(e) => setLeadForm({ ...leadForm, company: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            <input required placeholder="Contact / Opportunity Title *" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            <div className="grid grid-cols-2 gap-2">
              <input type="email" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
              <input type="number" placeholder="Est. Value ($)" value={leadForm.estimated_value} onChange={(e) => setLeadForm({ ...leadForm, estimated_value: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <textarea rows={2} placeholder="Scope notes (branches, CONUS/AK/HI, SLA)..." value={leadForm.notes} onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setNewLeadOpen(false)} className="px-3 py-2 rounded-lg text-slate-400">Cancel</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#F97316] text-white font-semibold">Save Lead</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
