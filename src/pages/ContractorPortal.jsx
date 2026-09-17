import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { DollarSign, Briefcase, Clock, TrendingUp, CheckCircle2, Calendar, MapPin, ChevronRight, Radio, Navigation, ShieldCheck, FileSignature, Archive } from "lucide-react";
import ManualLocation from "@/components/field/ManualLocation";
import { logContractorEvent, captureGeolocation } from "@/lib/contractorStatus";
import { useToast } from "@/components/ui/use-toast";

const statusStyles = {
  scheduled: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  en_route: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  on_site: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  scanning: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  processing: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  complete: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  invoiced: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

const fmtMoney = (v) => v != null ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—";
const fmtTime = (v) => v ? new Date(v).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

const myStatuses = [
  { key: "available", label: "Available", color: "bg-emerald-500" },
  { key: "en_route", label: "En Route", color: "bg-blue-400" },
  { key: "on_site", label: "On Site", color: "bg-amber-400" },
  { key: "off_duty", label: "Off Duty", color: "bg-slate-500" },
];

export default function ContractorPortal() {
  const [me, setMe] = useState(null);
  const [contractor, setContractor] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusSaving, setStatusSaving] = useState(false);
  const [offers, setOffers] = useState([]);
  const [responding, setResponding] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [signingContract, setSigningContract] = useState(null);
  const [sigName, setSigName] = useState("");
  const [sigInsurance, setSigInsurance] = useState(false);
  const [sigIrs, setSigIrs] = useState(false);
  const [sigEsign, setSigEsign] = useState(false);
  const [sigSaving, setSigSaving] = useState(false);
  const [viewingContract, setViewingContract] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      const user = await base44.auth.me();
      setMe(user);
      if (!user?.email) { setLoading(false); return; }
      const cons = await base44.entities.Contractor.filter({ email: user.email });
      const myContractor = cons[0] || null;
      setContractor(myContractor);
      if (myContractor) {
        const [allJobs, myOffers, myContracts] = await Promise.all([
          base44.entities.Job.list(),
          base44.entities.JobOffer.filter({ contractor_id: myContractor.id }),
          base44.entities.JobContract.filter({ contractor_id: myContractor.id }),
        ]);
        setJobs(allJobs.filter((j) => (j.assigned_contractor_ids || []).includes(myContractor.id)));
        setOffers(myOffers);
        setContracts(myContracts);
      }
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const respondOffer = async (offer, decision) => {
    setResponding(offer.id);
    try {
      await base44.functions.invoke("respondToJobOffer", { offer_id: offer.id, response: decision });
      toast({ title: decision === "accept" ? "Offer accepted" : "Offer declined", description: offer.job_title });
      await load();
    } catch (e) {
      toast({ title: "Could not respond", description: e.message, variant: "destructive" });
    }
    setResponding(null);
  };

  const signContract = async () => {
    if (!signingContract) return;
    if (!sigName.trim()) { toast({ title: "Type your full name to sign", variant: "destructive" }); return; }
    if (!sigInsurance || !sigIrs || !sigEsign) { toast({ title: "Acknowledge all required terms", variant: "destructive" }); return; }
    setSigSaving(true);
    try {
      await base44.functions.invoke("signJobContract", {
        contract_id: signingContract.id,
        signature_name: sigName.trim(),
        insurance_acknowledged: true,
        irs_acknowledged: true,
        esign_consent: true,
      });
      toast({ title: "Contract signed", description: signingContract.job_title });
      setSigningContract(null); setSigName(""); setSigInsurance(false); setSigIrs(false); setSigEsign(false);
      await load();
    } catch (e) {
      toast({ title: "Sign failed", description: e.message, variant: "destructive" });
    }
    setSigSaving(false);
  };

  const setStatus = async (status) => {
    if (!contractor) return;
    setStatusSaving(true);
    const geo = await captureGeolocation().catch(() => null);
    const patch = { current_status: status, last_status_at: new Date().toISOString() };
    if (geo) { patch.current_latitude = geo.latitude; patch.current_longitude = geo.longitude; patch.last_location_at = new Date().toISOString(); }
    setContractor((c) => ({ ...c, ...patch }));
    try {
      await base44.entities.Contractor.update(contractor.id, patch);
      await logContractorEvent({ ...contractor, ...patch }, "status_change", { status, latitude: geo?.latitude, longitude: geo?.longitude, note: `Status set to ${status}` });
    } catch {}
    setStatusSaving(false);
  };

  const completedJobs = useMemo(() => jobs.filter((j) => ["complete", "invoiced"].includes(j.status)), [jobs]);
  const activeJobs = useMemo(() => jobs.filter((j) => ["en_route", "on_site", "scanning", "processing"].includes(j.status)), [jobs]);

  const estimatedEarnings = useMemo(() => {
    if (!contractor) return 0;
    return completedJobs.reduce((sum, j) => {
      if (j.billable_rate_type === "hourly" && j.estimated_duration_hours) return sum + j.billable_rate * j.estimated_duration_hours;
      if (j.billable_rate_type === "flat" || j.billable_rate_type === "daily") return sum + (j.billable_rate || 0);
      if (j.billable_rate_type === "per_sqft") return sum + (j.billable_rate || 0);
      return sum;
    }, 0);
  }, [completedJobs, contractor]);

  const pendingEarnings = useMemo(() => {
    if (!contractor) return 0;
    return activeJobs.reduce((sum, j) => {
      if (j.billable_rate_type === "hourly" && j.estimated_duration_hours) return sum + j.billable_rate * j.estimated_duration_hours;
      if (j.billable_rate_type === "flat" || j.billable_rate_type === "daily") return sum + (j.billable_rate || 0);
      return sum;
    }, 0);
  }, [activeJobs, contractor]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-xl font-bold text-slate-950">
          {contractor?.name?.charAt(0) || me?.full_name?.charAt(0) || "?"}
        </div>
        <div>
          <h1 className="text-xl font-semibold">{contractor?.name || me?.full_name || "Contractor Portal"}</h1>
          <p className="text-sm text-slate-500">{contractor?.role || "Field Contractor"}</p>
        </div>
      </div>

      {!contractor && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <DollarSign className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No contractor profile linked to your account.</div>
          <div className="text-xs text-slate-500 mt-1">Contact your administrator to link your contractor record and view earnings.</div>
        </div>
      )}

      {contractor && me && me.role !== "admin" && !me.access_level ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">Your portal access is pending.</div>
          <div className="text-xs text-slate-500 mt-1">Once an administrator assigns your security level after your onboarding is complete, your portal will be available. You may need to sign out and back in after access is granted.</div>
        </div>
      ) : contractor && (
        <>
          {offers.filter((o) => o.status === "offered").length > 0 && (
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-4 mb-6">
              <h2 className="text-sm font-medium text-cyan-300 mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4" /> Job Opportunities</h2>
              <div className="space-y-2">
                {offers.filter((o) => o.status === "offered").map((o) => (
                  <div key={o.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-200">{o.job_title}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{o.site_address || "—"}</span>
                          {o.scheduled_start && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtTime(o.scheduled_start)}</span>}
                          {o.scan_window_start && <span>Window: {o.scan_window_start}{o.scan_window_end ? `–${o.scan_window_end}` : ""}</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {o.client_name} · {o.billable_rate_type === "hourly" ? `${fmtMoney(o.billable_rate)}/hr` : o.billable_rate_type === "flat" ? `${fmtMoney(o.billable_rate)} flat` : fmtMoney(o.billable_rate)}{o.estimated_duration_hours ? ` · ${o.estimated_duration_hours}h` : ""}
                        </div>
                        {o.notes && <div className="text-xs text-slate-500 mt-1">{o.notes}</div>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => respondOffer(o, "accept")} disabled={responding === o.id} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-medium hover:bg-emerald-400 disabled:opacity-50">Accept</button>
                        <button onClick={() => respondOffer(o, "decline")} disabled={responding === o.id} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700 disabled:opacity-50">Decline</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {contracts.filter((c) => c.status === "pending").length > 0 && (
            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 mb-6">
              <h2 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2"><FileSignature className="w-4 h-4" /> Contracts to Sign</h2>
              <div className="space-y-2">
                {contracts.filter((c) => c.status === "pending").map((c) => (
                  <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-200">{c.job_title}</div>
                      <div className="text-xs text-slate-500">{c.client_name} · {c.site_address}</div>
                    </div>
                    <button onClick={() => setSigningContract(c)} className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-medium hover:bg-amber-400 shrink-0">Review & Sign</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {contracts.filter((c) => c.status !== "pending").length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
              <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2"><Archive className="w-4 h-4 text-slate-400" /> Archived Contracts</h2>
              <div className="space-y-2">
                {contracts.filter((c) => c.status !== "pending").map((c) => (
                  <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-200 flex items-center gap-2">{c.job_title}
                        {c.status === "signed" ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Signed</span> : <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">Declined</span>}
                      </div>
                      <div className="text-xs text-slate-500">{c.client_name} · {c.site_address}{c.signed_at ? ` · Signed ${new Date(c.signed_at).toLocaleDateString()}` : ""}</div>
                    </div>
                    <button onClick={() => setViewingContract(c)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 shrink-0">View</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2"><Radio className="w-4 h-4 text-cyan-400" /> My Status & Location</h2>
              <Link to="/field" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">Open Field App <Navigation className="w-3.5 h-3.5" /></Link>
            </div>
            <div className="text-xs text-slate-500 mb-3">
              Current status: <span className="capitalize text-slate-200 font-medium">{contractor.current_status?.replace("_", " ") || "off duty"}</span>
              {contractor.last_status_at && <> · updated {fmtTime(contractor.last_status_at)}</>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {myStatuses.map((s) => (
                <button key={s.key} onClick={() => setStatus(s.key)} disabled={statusSaving} className={`py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 ${contractor.current_status === s.key ? "bg-cyan-500 text-slate-950" : "bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700"}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} /> {s.label}
                </button>
              ))}
            </div>
            <ManualLocation contractor={contractor} onUpdated={load} />
            {contractor.current_latitude != null && (
              <div className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Last reported: {contractor.current_latitude.toFixed(4)}, {contractor.current_longitude.toFixed(4)}
                {contractor.last_location_at && <> · {fmtTime(contractor.last_location_at)}</>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={DollarSign} label="Earned (Completed)" value={fmtMoney(estimatedEarnings)} accent="text-emerald-400" />
            <StatCard icon={TrendingUp} label="Pending (Active)" value={fmtMoney(pendingEarnings)} accent="text-amber-400" />
            <StatCard icon={CheckCircle2} label="Jobs Completed" value={completedJobs.length} accent="text-cyan-400" />
            <StatCard icon={Clock} label="Active Jobs" value={activeJobs.length} accent="text-blue-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Pay Rate</div>
              <div className="text-lg font-semibold text-slate-200">
                {contractor.pay_type === "hourly" ? `${fmtMoney(contractor.pay_rate)}/hr` : contractor.pay_type === "salary" ? `${fmtMoney(contractor.pay_rate)}/yr` : contractor.pay_type === "flat" ? `${fmtMoney(contractor.pay_rate)} flat` : "—"}
              </div>
              <div className="text-xs text-slate-500 capitalize mt-1">{contractor.pay_type}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Onboarding</div>
              <div className="text-lg font-semibold text-slate-200 capitalize">{contractor.onboarding_status?.replace("_", " ") || "—"}</div>
              <div className="flex gap-1.5 mt-2">
                <Badge label="W-9" ok={contractor.w9_on_file} />
                <Badge label="Contract" ok={contractor.contract_signed} />
                <Badge label="Insurance" ok={contractor.insurance_on_file} />
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 mb-2">Skills & Certs</div>
              <div className="flex flex-wrap gap-1">
                {(contractor.skills || []).map((s) => <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">{s}</span>)}
                {(contractor.certifications || []).map((c) => <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300">{c}</span>)}
                {!contractor.skills?.length && !contractor.certifications?.length && <span className="text-xs text-slate-500">—</span>}
              </div>
            </div>
          </div>

          <h2 className="text-sm font-medium text-slate-300 mb-3">Recent Jobs</h2>
          {jobs.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <Briefcase className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <div className="text-sm text-slate-400">No jobs assigned yet.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.slice(0, 10).map((j) => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="block bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200 truncate">{j.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border capitalize shrink-0 ${statusStyles[j.status] || ""}`}>{j.status?.replace("_", " ")}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{j.scheduled_start ? new Date(j.scheduled_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{j.site_address || "—"}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {signingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSigningContract(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <h2 className="text-base font-semibold mb-1">Job Contract — {signingContract.job_title}</h2>
            <p className="text-xs text-slate-500 mb-3">Review the agreement, then sign electronically below.</p>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded-lg p-3 mb-4 max-h-60 overflow-y-auto font-sans">{signingContract.terms}</pre>
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={sigInsurance} onChange={(e) => setSigInsurance(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800" />
                I confirm I maintain required insurance (general liability & workers' comp) and will provide certificates on request.
              </label>
              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={sigIrs} onChange={(e) => setSigIrs(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800" />
                I acknowledge I am an independent contractor responsible for my own taxes (IRS), and no taxes will be withheld from my pay.
              </label>
              <label className="flex items-start gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={sigEsign} onChange={(e) => setSigEsign(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-800" />
                I consent to sign this agreement electronically and agree it has the same legal effect as a handwritten signature.
              </label>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Type your full legal name to sign</label>
                <input value={sigName} onChange={(e) => setSigName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" placeholder="Full legal name" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setSigningContract(null)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Cancel</button>
              <button onClick={signContract} disabled={sigSaving} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-medium text-sm hover:bg-amber-400 disabled:opacity-50">{sigSaving ? "Signing…" : "Sign Contract"}</button>
            </div>
          </div>
        </div>
      )}

      {viewingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setViewingContract(null)} />
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Contract — {viewingContract.job_title}</h2>
              <button onClick={() => setViewingContract(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-[60vh] overflow-y-auto font-sans">{viewingContract.terms}</pre>
            {viewingContract.status === "signed" && (
              <div className="mt-3 text-xs text-slate-400 space-y-0.5">
                <div>Signed by: <span className="text-slate-200">{viewingContract.signature_name}</span></div>
                <div>Date: {viewingContract.signed_at ? new Date(viewingContract.signed_at).toLocaleString() : "—"}</div>
                <div>Acknowledgments: Insurance ✓ · IRS/Tax ✓ · E-sign consent ✓</div>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button onClick={() => setViewingContract(null)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className={`w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center mb-3 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function Badge({ label, ok }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${ok ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
      {ok ? "✓ " : ""}{label}
    </span>
  );
}