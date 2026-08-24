import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import {
  Satellite, LogOut, ArrowLeft, Navigation, Clock, MapPin,
  CheckCircle2, Truck, Camera, Flag, User, Briefcase,
  MessageSquare, Send, Mail, ClipboardList,
} from "lucide-react";
import AiAdvisor from "@/components/AiAdvisor";
import GuideDownload from "@/components/GuideDownload";

const fieldRoles = ["Field Technician", "Field Pilot"];
const myStatuses = [
  { key: "available", label: "Available", color: "bg-emerald-500" },
  { key: "en_route", label: "En Route", color: "bg-blue-400" },
  { key: "on_site", label: "On Site", color: "bg-amber-400" },
  { key: "off_duty", label: "Off Duty", color: "bg-slate-500" },
];
const order = ["scheduled", "en_route", "on_site", "scanning", "processing", "complete", "invoiced"];
const statusStyles = {
  scheduled: "bg-slate-700 text-slate-300",
  en_route: "bg-blue-500/15 text-blue-300",
  on_site: "bg-amber-500/15 text-amber-300",
  scanning: "bg-purple-500/15 text-purple-300",
  processing: "bg-indigo-500/15 text-indigo-300",
  complete: "bg-emerald-500/15 text-emerald-300",
  invoiced: "bg-cyan-500/15 text-cyan-300",
};
const advanceLabel = { en_route: "En Route", on_site: "On Site", scanning: "Scanning", processing: "Processing", complete: "Complete" };

const navUrl = (job) => job.latitude != null && job.longitude != null
  ? `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`
  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.site_address || "")}`;

const fmtTime = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default function FieldApp() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [contractor, setContractor] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState("jobs");
  const [threadPartner, setThreadPartner] = useState(null);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState({ report_date: new Date().toISOString().slice(0, 10), job_id: "", weather: "", work_completed: "", hours_worked: "", crew_count: "1", delays: "" });
  const [reportSaved, setReportSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [user, cons, cls] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.Contractor.list(),
        base44.entities.Client.list(),
      ]);
      setMe(user);
      setContractors(cons);
      setClients(cls);
      const matched = cons.find((c) => c.email && user?.email && c.email.toLowerCase() === user.email.toLowerCase());
      if (matched) setContractor(matched);
      setLoading(false);
    })();
  }, []);

  const reload = async () => {
    if (!contractor) return;
    const [allJobs, cons] = await Promise.all([
      base44.entities.Job.list(),
      base44.entities.Contractor.list(),
    ]);
    setJobs(allJobs);
    const updated = cons.find((c) => c.id === contractor.id);
    if (updated) setContractor(updated);
  };

  useEffect(() => {
    if (!contractor) return;
    (async () => {
      const allJobs = await base44.entities.Job.list();
      setJobs(allJobs);
    })();
  }, [contractor?.id]);

  useEffect(() => {
    if (!contractor) return;
    const loadMsgs = async () => setMessages(await base44.entities.Message.list("created_date"));
    loadMsgs();
    const unsub = base44.entities.Message.subscribe(loadMsgs);
    return unsub;
  }, [contractor?.id]);

  const isAdmin = me?.role === "admin";
  const myJobs = jobs
    .filter((j) => (j.assigned_contractor_ids || []).includes(contractor?.id))
    .sort((a, b) => new Date(a.scheduled_start || 0) - new Date(b.scheduled_start || 0));
  const completedJobs = myJobs.filter((j) => ["complete", "invoiced"].includes(j.status)).length;

  const setMyStatus = async (s) => {
    await base44.entities.Contractor.update(contractor.id, {
      current_status: s,
      shift_status: s === "off_duty" ? "off_duty" : "on_duty",
    });
    reload();
  };

  const setJobStatus = async (job, status) => {
    await base44.functions.invoke("updateJobStatus", { job_id: job.id, status });
    const map = {
      en_route: { current_status: "en_route" },
      on_site: { current_status: "on_site" },
      scanning: { current_status: "on_site" },
      processing: { current_status: "on_site" },
      complete: { current_status: "available", current_job_id: "", current_job_title: "" },
    };
    if (map[status]) await base44.entities.Contractor.update(contractor.id, map[status]);
    reload();
  };

  const logout = async () => { await base44.auth.logout(); navigate("/login"); };

  const myMsgId = contractor?.id;
  const conversations = useMemo(() => {
    const map = {};
    messages.forEach((m) => {
      if (m.sender_id !== myMsgId && m.recipient_id !== myMsgId) return;
      const otherId = m.sender_id === myMsgId ? m.recipient_id : m.sender_id;
      const otherName = m.sender_id === myMsgId ? m.recipient_name : m.sender_name;
      if (!map[otherId]) map[otherId] = { id: otherId, name: otherName || "Team", last: m, unread: 0 };
      if (new Date(m.created_date) > new Date(map[otherId].last.created_date)) map[otherId].last = m;
      if (m.recipient_id === myMsgId && !m.read) map[otherId].unread++;
    });
    return Object.values(map).sort((a, b) => new Date(b.last.created_date) - new Date(a.last.created_date));
  }, [messages, myMsgId]);

  const thread = useMemo(() => messages
    .filter((m) => (m.sender_id === myMsgId && m.recipient_id === threadPartner) || (m.sender_id === threadPartner && m.recipient_id === myMsgId))
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date)), [messages, myMsgId, threadPartner]);

  const sendMsg = async (alsoEmail) => {
    if (!msgText.trim() || !threadPartner) return;
    setSending(true);
    const partner = conversations.find((c) => c.id === threadPartner);
    await base44.entities.Message.create({
      sender_id: myMsgId, sender_name: contractor.name,
      recipient_id: threadPartner, recipient_name: partner?.name,
      body: msgText.trim(), channel: alsoEmail ? "email" : "app", read: false,
    });
    if (alsoEmail) {
      try { await base44.functions.invoke("sendTeamEmail", { recipient_id: threadPartner, body: msgText.trim(), sender_name: contractor.name }); } catch (e) {}
    }
    setMsgText(""); setSending(false);
  };

  const fileReport = async () => {
    if (!report.work_completed.trim()) return;
    const job = myJobs.find((j) => j.id === report.job_id);
    await base44.entities.DailyReport.create({
      report_date: report.report_date,
      job_id: report.job_id || undefined,
      job_title: job?.title,
      project_id: job?.project_id,
      project_name: job?.project_name,
      filed_by_id: contractor.id,
      filed_by_name: contractor.name,
      weather: report.weather,
      work_completed: report.work_completed,
      hours_worked: Number(report.hours_worked) || 0,
      crew_count: Number(report.crew_count) || 1,
      delays: report.delays,
      status: "submitted",
    });
    setReport({ report_date: new Date().toISOString().slice(0, 10), job_id: "", weather: "", work_completed: "", hours_worked: "", crew_count: "1", delays: "" });
    setReportSaved(true);
    setTimeout(() => setReportSaved(false), 2500);
  };

  const clientHours = (job) => {
    const c = clients.find((cl) => cl.id === job.client_id);
    return c && c.opening_time && c.closing_time ? `${c.opening_time}–${c.closing_time}` : null;
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-slate-800 border-t-cyan-400 rounded-full animate-spin" /></div>;

  if (!contractor) {
    return (
      <Shell me={me} onLogout={logout} summary={{}}>
        <div className="max-w-md mx-auto mt-16 text-center">
          <Briefcase className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">{isAdmin ? "Select a field crew to preview" : "Field access not configured"}</h2>
          <p className="text-sm text-slate-500 mb-6">
            {isAdmin ? "Preview the mobile field app as any crew member." : "Your account isn't linked to a field crew profile. Contact your dispatcher."}
          </p>
          {isAdmin && (
            <select
              value={contractor?.id || ""}
              onChange={(e) => setContractor(contractors.find((c) => c.id === e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm w-full max-w-xs"
            >
              <option value="">Select crew member…</option>
              {contractors.filter((c) => fieldRoles.includes(c.role)).map((c) => <option key={c.id} value={c.id}>{c.name} — {c.role}</option>)}
            </select>
          )}
        </div>
      </Shell>
    );
  }

  const next = (job) => {
    const i = order.indexOf(job.status);
    if (i < 0 || i >= 5) return null;
    return { status: order[i + 1], label: advanceLabel[order[i + 1]] };
  };

  return (
    <Shell me={me} onLogout={logout} contractor={contractor} summary={{ contractor: contractor.name, status: contractor.current_status, assignedJobs: myJobs.length, completedJobs, jobStatuses: myJobs.reduce((m, j) => { m[j.status] = (m[j.status] || 0) + 1; return m; }, {}) }}>
      {/* Status card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-slate-500">Your status</div>
            <div className="text-sm font-medium capitalize">{contractor.current_status?.replace("_", " ")}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Shift</div>
            <div className={`text-sm font-medium ${contractor.shift_status === "on_duty" ? "text-emerald-300" : "text-slate-400"}`}>
              {contractor.shift_status === "on_duty" ? "On Duty" : "Off Duty"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {myStatuses.map((s) => (
            <button
              key={s.key}
              onClick={() => setMyStatus(s.key)}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[11px] font-medium transition-colors ${
                contractor.current_status === s.key
                  ? "bg-slate-800 border-cyan-500/40 text-slate-100"
                  : "bg-slate-800/40 border-slate-700/50 text-slate-400"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <Briefcase className="w-4 h-4 text-cyan-400 mb-1.5" />
          <div className="text-xl font-semibold">{myJobs.length}</div>
          <div className="text-xs text-slate-500">Assigned jobs</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 mb-1.5" />
          <div className="text-xl font-semibold">{completedJobs}</div>
          <div className="text-xs text-slate-500">Completed</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("jobs")} className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${tab === "jobs" ? "bg-slate-800 text-slate-100 border border-slate-700" : "text-slate-400"}`}>
          <Briefcase className="w-4 h-4" /> Jobs
        </button>
        <button onClick={() => setTab("reports")} className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${tab === "reports" ? "bg-slate-800 text-slate-100 border border-slate-700" : "text-slate-400"}`}>
          <ClipboardList className="w-4 h-4" /> Report
        </button>
        <button onClick={() => setTab("messages")} className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${tab === "messages" ? "bg-slate-800 text-slate-100 border border-slate-700" : "text-slate-400"}`}>
          <MessageSquare className="w-4 h-4" /> Messages
          {conversations.reduce((s, c) => s + c.unread, 0) > 0 && <span className="bg-cyan-500 text-slate-950 text-[10px] font-bold rounded-full px-1.5">{conversations.reduce((s, c) => s + c.unread, 0)}</span>}
        </button>
      </div>

      {tab === "messages" ? (
        <div className="space-y-3">
          {!threadPartner ? (
            <>
              {conversations.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">No messages yet. Your dispatcher will reach out here.</div>
              ) : conversations.map((c) => (
                <button key={c.id} onClick={() => setThreadPartner(c.id)} className="w-full text-left bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3 hover:border-slate-700">
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">{c.name?.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-xs text-slate-500 truncate">{c.last.body}</div>
                  </div>
                  {c.unread > 0 && <span className="bg-cyan-500 text-slate-950 text-[10px] font-bold rounded-full px-1.5">{c.unread}</span>}
                </button>
              ))}
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col" style={{ minHeight: "55vh" }}>
              <div className="px-3 py-2.5 border-b border-slate-800 flex items-center gap-2">
                <button onClick={() => setThreadPartner(null)} className="text-slate-400 text-xs">← Back</button>
                <div className="text-sm font-medium">{conversations.find((c) => c.id === threadPartner)?.name}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {thread.map((m) => {
                  const mine = m.sender_id === myMsgId;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${mine ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
                        <div className="whitespace-pre-wrap">{m.body}</div>
                        <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "text-slate-700" : "text-slate-500"}`}>{m.channel === "email" && <Mail className="w-3 h-3" />}{fmtTime(m.created_date)}</div>
                      </div>
                    </div>
                  );
                })}
                {thread.length === 0 && <div className="text-center text-sm text-slate-600 py-6">Start the conversation</div>}
              </div>
              <div className="p-3 border-t border-slate-800">
                <textarea value={msgText} onChange={(e) => setMsgText(e.target.value)} rows={2} placeholder="Reply…" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 resize-none" />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => sendMsg(true)} disabled={sending || !msgText.trim()} className="flex-1 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"><Mail className="w-4 h-4" /> Email</button>
                  <button onClick={() => sendMsg(false)} disabled={sending || !msgText.trim()} className="flex-1 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"><Send className="w-4 h-4" /> Send</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : tab === "reports" ? (
        <div className="space-y-3">
          <div className="text-xs font-medium text-slate-400 mb-2">File Daily Report</div>
          {reportSaved && <div className="bg-emerald-500/15 text-emerald-300 text-sm rounded-lg p-3">Report submitted — your dispatcher has been notified.</div>}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Job</label>
              <select value={report.job_id} onChange={(e) => setReport({ ...report, job_id: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
                <option value="">— General / no specific job —</option>
                {myJobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-slate-400 mb-1">Date</label><input type="date" value={report.report_date} onChange={(e) => setReport({ ...report, report_date: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Weather</label><input value={report.weather} onChange={(e) => setReport({ ...report, weather: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Sunny, 72°F" /></div>
            </div>
            <div><label className="block text-xs text-slate-400 mb-1">Work completed</label><textarea value={report.work_completed} onChange={(e) => setReport({ ...report, work_completed: e.target.value })} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm resize-none" placeholder="What was accomplished today…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-slate-400 mb-1">Hours worked</label><input type="number" value={report.hours_worked} onChange={(e) => setReport({ ...report, hours_worked: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="0" /></div>
              <div><label className="block text-xs text-slate-400 mb-1">Crew count</label><input type="number" value={report.crew_count} onChange={(e) => setReport({ ...report, crew_count: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div><label className="block text-xs text-slate-400 mb-1">Delays / issues</label><input value={report.delays} onChange={(e) => setReport({ ...report, delays: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" placeholder="Any delays or blockers" /></div>
            <button onClick={fileReport} disabled={!report.work_completed.trim()} className="w-full py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm disabled:opacity-50">Submit Daily Report</button>
          </div>
        </div>
      ) : (
        <>
      {/* Jobs */}
      <div className="text-xs font-medium text-slate-400 mb-2">Assigned Jobs</div>
      {myJobs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-sm text-slate-500">No jobs assigned yet.</div>
      ) : (
        <div className="space-y-3">
          {myJobs.map((job) => {
            const n = next(job);
            return (
              <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100">{job.title}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3 shrink-0" />{job.site_address || "Remote"}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{job.project_name} {job.scheduled_start && `· ${fmtTime(job.scheduled_start)}`}</div>
                    {clientHours(job) && <div className="text-xs text-cyan-300/80 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />Site hours: {clientHours(job)}</div>}
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full capitalize shrink-0 ${statusStyles[job.status] || statusStyles.scheduled}`}>{job.status?.replace("_", " ")}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <a href={navUrl(job)} target="_blank" rel="noreferrer" className="flex-1 py-2.5 rounded-lg bg-blue-500/15 text-blue-300 text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                    <Navigation className="w-4 h-4" /> Navigate
                  </a>
                  {n && (
                    <button onClick={() => setJobStatus(job, n.status)} className="flex-1 py-2.5 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
                      {n.status === "complete" ? <CheckCircle2 className="w-4 h-4" /> : n.status === "en_route" ? <Truck className="w-4 h-4" /> : n.status === "scanning" ? <Camera className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
                      {n.label}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </Shell>
  );
}

function Shell({ me, onLogout, contractor, children, summary }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Satellite className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-sm">GForceSI</div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-cyan-400/80">Field App</div>
          </div>
          {contractor && <div className="ml-1 text-xs text-slate-400 truncate hidden sm:block">· {contractor.name}</div>}
          <div className="ml-auto flex items-center gap-3">
            <GuideDownload label="Guide" className="text-xs text-slate-400 hover:text-cyan-300" />
            {me?.role === "admin" && (
              <Link to="/" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Ops
              </Link>
            )}
            <button onClick={onLogout} className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 py-4 pb-10">{children}</main>
      <AiAdvisor page="Field App" summary={summary} />
    </div>
  );
}