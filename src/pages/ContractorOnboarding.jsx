import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, UserCheck, ShieldCheck, FileText, DollarSign, Briefcase } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const steps = [
  { key: "profile", label: "Profile", icon: Briefcase },
  { key: "skills", label: "Skills & Certs", icon: ShieldCheck },
  { key: "pay", label: "Pay Details", icon: DollarSign },
  { key: "compliance", label: "Compliance", icon: FileText },
];

const blank = {
  name: "", email: "", phone: "", role: "Field Technician", region: "",
  skills: [], certifications: [],
  pay_type: "hourly", pay_rate: 0, quickbooks_id: "",
  w9_on_file: false, contract_signed: false, insurance_on_file: false, mn_ic_exemption_on_file: false, workers_comp_on_file: false, esign_consent: false, emergency_contact: "",
};

export default function ContractorOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(blank);
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addTag = (k, val, reset) => {
    const v = val.trim();
    if (!v) return;
    setForm((f) => ({ ...f, [k]: [...(f[k] || []), v] }));
    reset("");
  };
  const removeTag = (k, idx) => setForm((f) => ({ ...f, [k]: f[k].filter((_, i) => i !== idx) }));

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
      await base44.entities.Contractor.create(payload);
      toast({ title: "Contractor onboarded", description: `${form.name} added to the roster.` });
      navigate("/contractors");
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-2xl">
      <Link to="/contractors" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4">
        <ChevronLeft className="w-4 h-4" /> Back to contractors
      </Link>
      <h1 className="text-xl font-semibold mb-1">Contractor Onboarding</h1>
      <p className="text-sm text-slate-500 mb-6">Add a new contractor to the GForceSI field roster.</p>

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
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="jane@example.com" />
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
            <p className="text-sm text-slate-400">Collect compliance documents before activating this contractor. All three are required for full onboarding.</p>
            <Toggle label="W-9 on file" desc="IRS form for 1099 reporting" checked={form.w9_on_file} onChange={(v) => set("w9_on_file", v)} />
            <Toggle label="Contract signed" desc="Independent contractor agreement executed" checked={form.contract_signed} onChange={(v) => set("contract_signed", v)} />
            <Toggle label="MN IC Exemption Cert." desc="Required for construction-related services (Minn. Stat. § 181.723)" checked={form.mn_ic_exemption_on_file} onChange={(v) => set("mn_ic_exemption_on_file", v)} />
            <Toggle label="Workers' Comp COI" desc="Certificate of workers' comp insurance" checked={form.workers_comp_on_file} onChange={(v) => set("workers_comp_on_file", v)} />
            <Toggle label="Insurance on file" desc="Certificate of general liability insurance" checked={form.insurance_on_file} onChange={(v) => set("insurance_on_file", v)} />
            <Toggle label="E-sign consent" desc="Consent to electronic signatures (ESIGN / MN UETA)" checked={form.esign_consent} onChange={(v) => set("esign_consent", v)} />
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
                ? "All compliance docs received — contractor will be marked fully onboarded."
                : "Incomplete — contractor will be saved as in_progress until all compliance docs are received."}
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