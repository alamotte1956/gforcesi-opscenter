import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import {
  Satellite, LogOut, ArrowLeft, Building2, MapPin, Calendar,
  FileText, CheckCircle2, Clock, Activity, Loader2, Send, MessageSquare, ScanLine,
} from "lucide-react";
import AiAdvisor from "@/components/AiAdvisor";
import GuideDownload from "@/components/GuideDownload";

const typeLabel = (t) => ({ "3d_model": "3D Model", floorplan: "Floorplan", pointcloud: "Point Cloud", photos: "Photos", other: "Other" })[t] || t || "";

const stages = [
  { key: "scheduled", label: "Scheduled" },
  { key: "en_route", label: "En Route" },
  { key: "on_site", label: "On Site" },
  { key: "scanning", label: "Scanning" },
  { key: "processing", label: "Processing" },
  { key: "complete", label: "Complete" },
  { key: "invoiced", label: "Invoiced" },
];

const statusStyles = {
  scheduled: "bg-slate-700 text-slate-300",
  en_route: "bg-blue-500/15 text-blue-300",
  on_site: "bg-amber-500/15 text-amber-300",
  scanning: "bg-purple-500/15 text-purple-300",
  processing: "bg-indigo-500/15 text-indigo-300",
  complete: "bg-emerald-500/15 text-emerald-300",
  invoiced: "bg-cyan-500/15 text-cyan-300",
};

export default function ClientPortal() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [previewId, setPreviewId] = useState("");
  const [loading, setLoading] = useState(true);
  const [cMessages, setCMessages] = useState([]);
  const [cReply, setCReply] = useState("");
  const [cSending, setCSending] = useState(false);
  const [deliverables, setDeliverables] = useState([]);
  const [delivBusy, setDelivBusy] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    (async () => {
      const [user, cls, allJobs, allProjects, allInv, allMsgs, allDeliv] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Client.list(),
        base44.entities.Job.list(),
        base44.entities.Project.list(),
        base44.entities.Invoice.list(),
        base44.entities.Message.list("created_date"),
        base44.entities.Deliverable.list().catch(() => []),
      ]);
      setMe(user); setClients(cls); setJobs(allJobs); setProjects(allProjects); setInvoices(allInv); setCMessages(allMsgs); setDeliverables(allDeliv);
      setLoading(false);
    })();
    const unsubJob = base44.entities.Job.subscribe((event) => {
      setJobs((prev) => {
        if (event.type === "delete") return prev.filter((j) => j.id !== event.id);
        const idx = prev.findIndex((j) => j.id === event.id);
        if (idx >= 0) { const copy = [...prev]; copy[idx] = event.data; return copy; }
        return [...prev, event.data];
      });
    });
    const unsubMsg = base44.entities.Message.subscribe(() => {
      base44.entities.Message.list("created_date").then(setCMessages);
    });
    return () => { unsubJob(); unsubMsg(); };
  }, []);

  const isAdmin = me?.role === "admin";
  const matchedClient = clients.find(
    (c) => c.portal_email && me?.email && c.portal_email.toLowerCase() === me.email.toLowerCase()
  );
  const activeClient = isAdmin
    ? (clients.find((c) => c.id === previewId) || matchedClient)
    : matchedClient;

  const clientJobs = activeClient ? jobs.filter((j) => j.client_id === activeClient.id) : [];
  const clientProjects = activeClient ? projects.filter((p) => p.client_id === activeClient.id) : [];
  const clientInvoices = activeClient ? invoices.filter((i) => i.client_id === activeClient.id) : [];
  const clientDeliverables = activeClient ? deliverables.filter((d) => d.client_id === activeClient.id) : [];

  const respondDeliverable = async (d, response, reason) => {
    setDelivBusy(d.id);
    try {
      await base44.functions.invoke("respondToDeliverable", { deliverable_id: d.id, response, rejected_reason: reason || undefined });
      const updated = await base44.entities.Deliverable.list().catch(() => []);
      setDeliverables(updated);
    } catch (e) {}
    setDelivBusy(null);
    setRejectFor(null); setRejectReason("");
  };

  const stats = {
    active: clientJobs.filter((j) => !["complete", "invoiced"].includes(j.status)).length,
    inProgress: clientJobs.filter((j) => ["en_route", "on_site", "scanning", "processing"].includes(j.status)).length,
    complete: clientJobs.filter((j) => j.status === "complete").length,
    invoiced: clientJobs.filter((j) => j.status === "invoiced").length,
  };

  const cThread = useMemo(() => (activeClient ? cMessages
    .filter((m) => m.sender_id === activeClient.id || m.recipient_id === activeClient.id)
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date)) : []), [cMessages, activeClient]);
  const cPartner = useMemo(() => {
    if (!activeClient) return null;
    const inbound = cMessages.filter((m) => m.recipient_id === activeClient.id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    return inbound ? inbound.sender_id : null;
  }, [cMessages, activeClient]);
  const sendClientReply = async () => {
    if (!cReply.trim() || !cPartner || !activeClient) return;
    setCSending(true);
    const partnerMsg = cMessages.find((m) => m.sender_id === cPartner);
    await base44.entities.Message.create({
      sender_id: activeClient.id,
      sender_name: activeClient.company || activeClient.name,
      recipient_id: cPartner,
      recipient_name: partnerMsg?.sender_name,
      body: cReply.trim(),
      channel: "app",
      read: false,
    });
    setCReply(""); setCSending(false);
  };

  const logout = async () => { await base44.auth.logout(); navigate("/login"); };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-slate-800 border-t-cyan-400 rounded-full animate-spin" /></div>;
  }

  if (!activeClient) {
    return (
      <Shell me={me} onLogout={logout} summary={{}}>
        <div className="max-w-md mx-auto mt-20 text-center">
          <Building2 className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">{isAdmin ? "Select a client to preview" : "Portal access not configured"}</h2>
          <p className="text-sm text-slate-500 mb-6">
            {isAdmin ? "Choose any client below to preview their portal experience." : "Your account isn't linked to a client portal. Please contact GForceSI to request access."}
          </p>
          {isAdmin && (
            <select value={previewId} onChange={(e) => setPreviewId(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm w-full max-w-xs">
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
            </select>
          )}
        </div>
      </Shell>
    );
  }

  if (activeClient.portal_access_level === "none" && !isAdmin) {
    return (
      <Shell me={me} onLogout={logout} summary={{}}>
        <div className="max-w-md mx-auto mt-20 text-center">
          <Clock className="w-12 h-12 text-amber-500/50 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access pending</h2>
          <p className="text-sm text-slate-500">Your portal access hasn't been enabled yet. Please contact GForceSI for an update.</p>
        </div>
      </Shell>
    );
  }

  const limited = activeClient.portal_access_level === "limited";

  return (
    <Shell me={me} onLogout={logout} client={activeClient} summary={{ client: activeClient.name, accessLevel: activeClient.portal_access_level, activeJobs: stats.active, inProgress: stats.inProgress, completed: stats.complete, invoiced: stats.invoiced, projects: clientProjects.length, invoices: clientInvoices.length, outstanding: clientInvoices.filter((i) => ["sent", "synced", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0), unreadMessages: cMessages.filter((m) => m.recipient_id === activeClient.id && !m.read).length }}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {activeClient.company || activeClient.name}</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time view of your work orders with GForceSI</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Stat label="Active" value={stats.active} icon={Activity} />
        <Stat label="In Progress" value={stats.inProgress} icon={Loader2} />
        <Stat label="Completed" value={stats.complete} icon={CheckCircle2} />
        <Stat label="Invoiced" value={stats.invoiced} icon={FileText} />
      </div>

      {!limited && clientProjects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Projects</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {clientProjects.map((p) => {
              const pJobs = clientJobs.filter((j) => j.project_id === p.id);
              const done = pJobs.filter((j) => ["complete", "invoiced"].includes(j.status)).length;
              return (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{p.name}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${p.status === "active" ? "bg-emerald-500/15 text-emerald-300" : p.status === "on_hold" ? "bg-amber-500/15 text-amber-300" : "bg-slate-700 text-slate-300"}`}>{p.status?.replace("_", " ")}</span>
                  </div>
                  {p.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{pJobs.length} work orders</span>
                    <span>{done} completed</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-slate-300 mb-3">Work Orders</h2>
        {clientJobs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">No work orders yet.</div>
        ) : (
          <div className="space-y-3">
            {clientJobs.map((job) => {
              const idx = stages.findIndex((s) => s.key === job.status);
              return (
                <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <div className="font-medium">{job.title}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.site_address || "Remote"}</span>
                        {job.scheduled_start && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(job.scheduled_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full capitalize shrink-0 ${statusStyles[job.status] || statusStyles.scheduled}`}>{job.status?.replace("_", " ")}</span>
                  </div>

                  <div className="flex items-center mt-4">
                    {stages.map((s, i) => (
                      <React.Fragment key={s.key}>
                        <div className="flex flex-col items-center w-14 shrink-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 ${
                            i < idx ? "bg-cyan-500 border-cyan-500 text-slate-950"
                            : i === idx ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                            : "bg-slate-800 border-slate-700 text-slate-600"
                          }`}>
                            {i < idx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                          </div>
                          <span className={`text-[9px] mt-1 text-center ${i <= idx ? "text-slate-300" : "text-slate-600"}`}>{s.label}</span>
                        </div>
                        {i < stages.length - 1 && <div className={`flex-1 h-0.5 -mt-5 ${i < idx ? "bg-cyan-500" : "bg-slate-800"}`} />}
                      </React.Fragment>
                    ))}
                  </div>

                  {(job.assigned_contractor_names?.length > 0 || job.deliverables) && (
                    <div className="mt-4 pt-3 border-t border-slate-800 space-y-1 text-xs text-slate-500">
                      {job.assigned_contractor_names?.length > 0 && <div>Assigned: {job.assigned_contractor_names.join(", ")}</div>}
                      {job.deliverables && <div>Deliverables: {job.deliverables}</div>}
                    </div>
                  )}

                  {job.matterport_share_url && ["complete", "invoiced"].includes(job.status) && (
                    <div className="mt-3 pt-3 border-t border-slate-800">
                      <a href={job.matterport_share_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25">
                        <ScanLine className="w-3.5 h-3.5" /> View 3D Model
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {clientDeliverables.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2"><ScanLine className="w-4 h-4 text-cyan-400" /> Digital Twins</h2>
          <div className="space-y-4">
            {clientDeliverables.map((d) => (
              <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="font-medium">{d.job_title || d.deliverable_type}</div>
                    <div className="text-xs text-slate-500 capitalize">{typeLabel(d.deliverable_type)}{d.site_address ? ` · ${d.site_address}` : ""}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded border capitalize shrink-0 ${d.status === "accepted" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : d.status === "rejected" ? "bg-rose-500/15 text-rose-300 border-rose-500/30" : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"}`}>{d.status}</span>
                </div>
                {d.embed_url && d.status !== "rejected" && (
                  <div className="rounded-lg overflow-hidden border border-slate-800 mb-3" style={{ paddingBottom: "56.25%", position: "relative" }}>
                    <iframe src={d.embed_url} className="absolute inset-0 w-full h-full" allowFullScreen allow="vr, xr, accelerometer; fullscreen; autoplay" title={d.job_title} />
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {d.share_url && <a href={d.share_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"><ScanLine className="w-3.5 h-3.5" /> Open in Matterport</a>}
                  {d.download_url && <a href={d.download_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"><FileText className="w-3.5 h-3.5" /> Download deliverables</a>}
                </div>
                {d.status === "delivered" && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button onClick={() => respondDeliverable(d, "accept")} disabled={delivBusy === d.id} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-medium hover:bg-emerald-400 disabled:opacity-50">Accept</button>
                    <button onClick={() => setRejectFor(d)} disabled={delivBusy === d.id} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-50">Request changes</button>
                  </div>
                )}
                {d.status === "accepted" && d.accepted_at && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-emerald-300">Accepted {new Date(d.accepted_at).toLocaleDateString()}{d.accepted_by_name ? ` by ${d.accepted_by_name}` : ""}</div>
                )}
                {d.status === "rejected" && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-rose-300">Changes requested{d.rejected_reason ? `: ${d.rejected_reason}` : ""}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejectFor(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-base font-semibold mb-2">Request changes</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="What needs to be reworked?" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 resize-none" />
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setRejectFor(null)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={() => respondDeliverable(rejectFor, "reject", rejectReason)} disabled={delivBusy === rejectFor?.id} className="px-4 py-2 rounded-lg bg-rose-500 text-slate-950 font-medium text-sm hover:bg-rose-400 disabled:opacity-50">Submit</button>
            </div>
          </div>
        </div>
      )}

      {!limited && clientInvoices.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Invoices</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                  <th className="px-4 py-2.5 font-medium">Invoice</th>
                  <th className="px-4 py-2.5 font-medium">Issued</th>
                  <th className="px-4 py-2.5 font-medium">Due</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {clientInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-800/60">
                    <td className="px-4 py-2.5 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{inv.issue_date}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{inv.due_date}</td>
                    <td className="px-4 py-2.5"><span className="text-[10px] px-2 py-0.5 rounded capitalize bg-slate-700 text-slate-300">{inv.status}</span></td>
                    <td className="px-4 py-2.5 text-right font-medium">${(inv.total || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="mt-8">
        <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-cyan-400" /> Messages with GForceSI</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col" style={{ minHeight: "40vh" }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cThread.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-8">No messages yet. Your GForceSI dispatcher will reach out here — once they do, you can reply below.</div>
            ) : cThread.map((m) => {
              const mine = m.sender_id === activeClient.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${mine ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div className={`text-[10px] mt-1 ${mine ? "text-slate-700" : "text-slate-500"}`}>{new Date(m.created_date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-slate-800">
            <textarea value={cReply} onChange={(e) => setCReply(e.target.value)} rows={2} placeholder={cPartner ? "Reply to GForceSI…" : "Awaiting a message from GForceSI to reply"} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 resize-none" />
            <button onClick={sendClientReply} disabled={cSending || !cReply.trim() || !cPartner} className="mt-2 w-full py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Shell({ me, onLogout, client, children, summary }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 h-16 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Satellite className="w-5 h-5 text-slate-950" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">GForceSI</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/80">Client Portal</div>
          </div>
          {client && <div className="hidden sm:block text-sm text-slate-400 ml-2">| {client.company || client.name}</div>}
          <div className="ml-auto flex items-center gap-4">
            <GuideDownload label="Guide" className="text-xs text-slate-400 hover:text-cyan-300" />
            {me?.role === "admin" && (
              <Link to="/" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Operations
              </Link>
            )}
            <button onClick={onLogout} className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 lg:px-6 py-6">{children}</main>
      <AiAdvisor page="Client Portal" summary={summary} />
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <Icon className="w-4 h-4 text-cyan-400 mb-2" />
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}