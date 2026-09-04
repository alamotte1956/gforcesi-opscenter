import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, UserCheck, ShieldCheck, FileText, DollarSign, Briefcase } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const steps = [
  { key: "profile", label: "Profile", icon: Briefcase },
  { key: "skills", label: "Skills & Certs", icon: ShieldCheck },
  { key: "pay", label: "Pay Details", icon: DollarSign },
  { key: "compliance", label: "Documents & Disclosures", icon: FileText },
];

const blank = {
  name: "", email: "", phone: "", role: "Field Technician", region: "",
  skills: [], certifications: [],
  pay_type: "hourly", pay_rate: 0, quickbooks_id: "",
  w9_on_file: false, contract_signed: false, insurance_on_file: false, mn_ic_exemption_on_file: false, workers_comp_on_file: false, esign_consent: false, emergency_contact: "",
};

const docs = [
  {
    key: "contract_signed",
    title: "Independent Contractor Agreement & Liability",
    disclosure: `You acknowledge that you are engaged as an independent contractor and not as an employee of GForceSI. You are responsible for your own federal and state income taxes, including self-employment tax, and will receive Form 1099-NEC where required. You are not entitled to employee benefits, paid time off, unemployment insurance, or employer-provided workers' compensation.\n\nLiability & Indemnification: You agree to perform services in a professional and workmanlike manner. You assume responsibility for your own acts and omissions and agree to indemnify and hold harmless GForceSI, its clients, and their agents from claims, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or resulting from your negligent acts, errors, or omissions in performance of the services, to the fullest extent permitted by law.\n\nYou retain control over the manner and means of performing the services, subject to the agreed scope of work and schedule.`,
  },
  {
    key: "w9_on_file",
    title: "IRS Form W-9 — Request for Taxpayer Identification",
    disclosure: `You must furnish a completed IRS Form W-9 providing your correct taxpayer identification number (TIN). GForceSI uses this information to file Form 1099-NEC with the Internal Revenue Service as required by federal tax law.\n\nUnder penalties of perjury, you certify that the information provided on Form W-9 is true, correct, and complete, and that you are not subject to backup withholding.`,
  },
  {
    key: "mn_ic_exemption_on_file",
    title: "MN Independent Contractor Exemption Certificate",
    disclosure: `Under Minnesota Statutes § 181.723, individuals performing services in the construction industry must obtain an Independent Contractor Exemption Certificate from the Minnesota Department of Labor and Industry to be classified as an independent contractor rather than an employee.\n\nBy signing, you represent that you have obtained, or will obtain prior to commencing work, this certificate where your services require it, and that you are not an employee for purposes of Minnesota workers' compensation and unemployment insurance. You understand that misclassification may result in penalties, back taxes, and liability for unpaid premiums.`,
  },
  {
    key: "insurance_on_file",
    title: "Certificate of Insurance — General Liability",
    disclosure: `You must maintain Commercial General Liability insurance with limits of not less than $1,000,000 per occurrence and $2,000,000 general aggregate, naming GForceSI and its clients as additional insureds.\n\nYou agree to furnish a Certificate of Insurance evidencing this coverage before commencing any work, to provide renewal certificates, and to maintain continuous coverage throughout the engagement. You understand that failure to maintain required coverage may result in suspension or termination of assignments.`,
  },
  {
    key: "workers_comp_on_file",
    title: "Workers' Compensation Coverage",
    disclosure: `Under Minnesota Statutes chapter 176, employers must generally carry workers' compensation insurance for their employees. As an independent contractor, you represent that you either (a) maintain your own workers' compensation coverage for any personnel you employ, or (b) qualify for and hold a valid Minnesota Independent Contractor Exemption Certificate that exempts you from the requirement.\n\nYou agree to provide proof of coverage or exemption upon request and to notify GForceSI of any lapse in coverage.`,
  },
  {
    key: "esign_consent",
    title: "Electronic Signature Consent",
    disclosure: `By signing electronically, you consent to conduct transactions and to execute this and related documents electronically under the Electronic Signatures in Global and National Commerce Act (ESIGN, 15 U.S.C. § 7001 et seq.) and the Minnesota Uniform Electronic Transactions Act (Minn. Stat. ch. 325L).\n\nYou acknowledge that your electronic signature has the same legal force and effect as a handwritten signature, that you may request a paper copy of any signed document, and that you may withdraw this electronic consent by notifying GForceSI in writing (which may affect your continued engagement).`,
  },
];

export default function ContractorOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(blank);
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [sigs, setSigs] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [selfLoading, setSelfLoading] = useState(true);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addTag = (k, val, reset) => {
    const v = val.trim();
    if (!v) return;
    setForm((f) => ({ ...f, [k]: [...(f[k] || []), v] }));
    reset("");
  };
  const removeTag = (k, idx) => setForm((f) => ({ ...f, [k]: f[k].filter((_, i) => i !== idx) }));

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me().catch(() => null);
        if (user && user.role !== "admin") {
          const list = await base44.entities.Contractor.filter({ email: user.email });
          const rec = list.find((c) => ["pending", "in_progress"].includes(c.onboarding_status)) || list[0];
          if (rec) {
            setEditingId(rec.id);
            setForm({
              name: rec.name || "", email: rec.email || "", phone: rec.phone || "", role: rec.role || "Field Technician", region: rec.region || "",
              skills: rec.skills || [], certifications: rec.certifications || [],
              pay_type: rec.pay_type || "hourly", pay_rate: rec.pay_rate ?? 0, quickbooks_id: rec.quickbooks_id || "",
              w9_on_file: !!rec.w9_on_file,
              contract_signed: !!rec.contract_signed, insurance_on_file: !!rec.insurance_on_file, mn_ic_exemption_on_file: !!rec.mn_ic_exemption_on_file, workers_comp_on_file: !!rec.workers_comp_on_file, esign_consent: !!rec.esign_consent,
              emergency_contact: rec.emergency_contact || "",
            });
          }
        }
      } catch (e) {}
      setSelfLoading(false);
    })();
  }, []);

  const handleSign = (key, value) => {
    setSigs((s) => ({ ...s, [key]: value }));
    const matched = value.trim() !== "" && form.name.trim() !== "" && value.trim().toLowerCase() === form.name.trim().toLowerCase();
    set(key, matched);
  };

  const canNext = () => {
    if (step === 0) return form.name && form.role;
    if (step === 2) return form.pay_type && form.pay_rate != null;
    return true;
  };

  const submit = async () => {
    setSaving(true);
    const complianceReady = form.w9_on_file && form.contract_signed && form.mn_ic_exemption_on_file && form.workers_comp_on_file && form.insurance_on_file && form.esign_consent;
    const payload = {
      ...form,
      pay_rate: Number(form.pay_rate) || 0,
      onboarding_status: complianceReady ? "complete" : "in_progress",
      onboarded_date: complianceReady ? new Date().toISOString().slice(0, 10) : undefined,
      current_status: "off_duty",
      shift_status: "off_duty",
      location_sharing: false,
    };
    try {
      if (editingId) {
        await base44.entities.Contractor.update(editingId, payload);
        toast({ title: complianceReady ? "Onboarding complete" : "Progress saved", description: complianceReady ? "You're fully onboarded." : "Finish the remaining documents when ready." });
        navigate("/contractor-portal");
      } else {
        await base44.entities.Contractor.create(payload);
        toast({ title: "Contractor onboarded", description: `${form.name} added. Grant app access from the Contractors page.` });
        navigate("/contractors");
      }
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setSaving(false);
    }
  };

  if (selfLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <Link to={editingId ? "/contractor-portal" : "/contractors"} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4">
        <ChevronLeft className="w-4 h-4" /> {editingId ? "Back to portal" : "Back to contractors"}
      </Link>
      <h1 className="text-xl font-semibold mb-1">{editingId ? "Complete Your Onboarding" : "Contractor Onboarding"}</h1>
      <p className="text-sm text-slate-500 mb-6">{editingId ? "Fill out your details and sign each required legal form to finish onboarding." : "Add a new contractor to the GForceSI field roster."}</p>
      {editingId && (
        <div className="mb-6 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-sm text-cyan-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" /> You were invited to onboard — your details will be saved to your contractor record.
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <React.Fragment key={s.key}>
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  done ? "bg-emerald-500 border-emerald-500 text-slate-950" : active ? "bg-cyan-500 border-cyan-500 text-slate-950" : "bg-slate-900 border-slate-700 text-slate-500"
                }`}>
                  {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-[11px] ${active ? "text-slate-200" : "text-slate-500"}`}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < step ? "bg-emerald-500" : "bg-slate-800"}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Full name *">
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Jane Doe" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Email">
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} disabled={!!editingId} className={`${inputCls} disabled:opacity-60`} placeholder="jane@example.com" />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="(415) 555-0100" />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Role *">
                <select value={form.role} onChange={(e) => set("role", e.target.value)} className={inputCls}>
                  {["Field Technician", "Field Pilot", "Dispatcher", "Billing Manager", "Admin"].map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Region">
                <input value={form.region} onChange={(e) => set("region", e.target.value)} className={inputCls} placeholder="San Francisco" />
              </Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Skills">
              <TagInput value={skillInput} onChange={setSkillInput} onAdd={() => addTag("skills", skillInput, setSkillInput)} placeholder="LiDAR scanning" />
              <TagList tags={form.skills} onRemove={(i) => removeTag("skills", i)} />
            </Field>
            <Field label="Certifications">
              <TagInput value={certInput} onChange={setCertInput} onAdd={() => addTag("certifications", certInput, setCertInput)} placeholder="Part 107 UAV" />
              <TagList tags={form.certifications} onRemove={(i) => removeTag("certifications", i)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Pay type *">
              <select value={form.pay_type} onChange={(e) => set("pay_type", e.target.value)} className={inputCls}>
                <option value="hourly">Hourly</option>
                <option value="flat">Flat rate</option>
                <option value="salary">Salary</option>
              </select>
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Pay rate *">
                <input type="number" value={form.pay_rate} onChange={(e) => set("pay_rate", e.target.value)} className={inputCls} placeholder="48" />
              </Field>
              <Field label="QuickBooks ID">
                <input value={form.quickbooks_id} onChange={(e) => set("quickbooks_id", e.target.value)} className={inputCls} placeholder="QB-VEND-3001" />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Review and sign each disclosure below. Type your full name exactly as entered in your profile to apply your electronic signature.</p>
            {docs.map((doc) => (
              <div key={doc.key} className="rounded-lg border border-slate-700 bg-slate-800/40 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800">
                  <div className="text-sm font-medium text-slate-200">{doc.title}</div>
                  {form[doc.key]
                    ? <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><Check className="w-3 h-3" /> Signed</span>
                    : <span className="text-[10px] text-rose-300">Required</span>}
                </div>
                <div className="px-3 py-2.5 max-h-36 overflow-y-auto text-xs text-slate-400 leading-relaxed whitespace-pre-line">{doc.disclosure}</div>
                <div className="px-3 py-2 border-t border-slate-700">
                  {form[doc.key]
                    ? <div className="text-xs text-emerald-300 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Signed electronically by {sigs[doc.key] || form.name}</div>
                    : <input value={sigs[doc.key] || ""} onChange={(e) => handleSign(doc.key, e.target.value)} className={inputCls} placeholder={`Type "${form.name || "your full name"}" to sign`} />}
                </div>
              </div>
            ))}
            <Field label="Emergency contact">
              <input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} className={inputCls} placeholder="Name & phone" />
            </Field>
            <div className={`mt-2 p-3 rounded-lg text-xs flex items-center gap-2 ${
              form.w9_on_file && form.contract_signed && form.mn_ic_exemption_on_file && form.workers_comp_on_file && form.insurance_on_file && form.esign_consent
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-amber-500/10 text-amber-300"
            }`}>
              <UserCheck className="w-4 h-4" />
              {form.w9_on_file && form.contract_signed && form.mn_ic_exemption_on_file && form.workers_comp_on_file && form.insurance_on_file && form.esign_consent
                ? "All documents signed — contractor will be marked fully onboarded."
                : "Incomplete — contractor will be saved as in_progress until all documents are signed."}
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => (step === 0 ? navigate("/contractors") : setStep(step - 1))}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => canNext() && setStep(step + 1)}
              disabled={!canNext()}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={saving || !form.name}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-emerald-400 disabled:opacity-40"
            >
              {saving ? <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <UserCheck className="w-4 h-4" />}
              {saving ? "Saving..." : "Complete Onboarding"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TagInput({ value, onChange, onAdd, placeholder }) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())}
        className={inputCls}
        placeholder={placeholder}
      />
      <button onClick={onAdd} className="px-3 rounded-lg bg-slate-700 text-slate-200 text-sm hover:bg-slate-600">Add</button>
    </div>
  );
}

function TagList({ tags, onRemove }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((t, i) => (
        <span key={i} className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200">
          {t}
          <button onClick={() => onRemove(i)} className="text-slate-500 hover:text-rose-400">×</button>
        </span>
      ))}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-left"
    >
      <div>
        <div className="text-sm font-medium text-slate-200">{label}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      <div className={`w-11 h-6 rounded-full transition-colors relative ${checked ? "bg-emerald-500" : "bg-slate-600"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </button>
  );
}