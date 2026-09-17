import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, UserCheck, ShieldCheck, FileText, DollarSign, Briefcase, Upload, Eye, FileCheck2, AlertTriangle } from "lucide-react";
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
  business_entity_type: "", tin_type: "",
  w9_on_file: false, contract_signed: false, insurance_on_file: false, mn_ic_exemption_on_file: false, workers_comp_on_file: false, esign_consent: false,
  w9_document_uri: "", coi_document_uri: "", coi_expiry: "",
  mn_ic_exemption_document_uri: "", mn_ic_exemption_expiry: "",
  workers_comp_document_uri: "", workers_comp_expiry: "",
  emergency_contact: "",
};

const docs = [
  {
    key: "contract_signed",
    title: "Independent Contractor Agreement & Liability",
    signOnly: true,
    disclosure: `You acknowledge that you are engaged as an independent contractor and not as an employee of GForceSI. You are responsible for your own federal and state income taxes, including self-employment tax, and will receive Form 1099-NEC where required (generally when paid $600 or more in a calendar year). You are not entitled to employee benefits, paid time off, unemployment insurance, or employer-provided workers' compensation.\n\nIRS Independent Contractor Classification: You represent that you meet the IRS common-law test for independent contractor status: (1) Behavioral Control — you, not GForceSI, control the manner and means of performing the services, subject only to the agreed scope of work and schedule; (2) Financial Control — you have a significant investment in your own equipment and business, you are responsible for your own expenses, and you offer your services to other clients; (3) Relationship Type — this Agreement provides no employee benefits, no indefinite employment, and no continuing employer-employee relationship, and the parties intend an independent contractor relationship. You understand that either party may request an IRS Form SS-8 determination if classification is disputed.\n\nLiability & Indemnification: You agree to perform services in a professional and workmanlike manner. You assume responsibility for your own acts and omissions and agree to indemnify and hold harmless GForceSI, its clients, and their agents from claims, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or resulting from your negligent acts, errors, or omissions in performance of the services, to the fullest extent permitted by law.\n\nYou retain control over the manner and means of performing the services, subject to the agreed scope of work and schedule.`,
  },
  {
    key: "w9_on_file",
    title: "IRS Form W-9 — Request for Taxpayer Identification",
    uriField: "w9_document_uri",
    disclosure: `You must furnish a completed and signed IRS Form W-9 providing your correct taxpayer identification number (TIN). GForceSI uses this information to file Form 1099-NEC with the Internal Revenue Service as required by federal tax law for any contractor paid $600 or more in a calendar year.\n\nUnder penalties of perjury, you certify that the information provided on Form W-9 is true, correct, and complete, and that you are not subject to backup withholding under section 3406(a) of the Internal Revenue Code. You must notify GForceSI if you later become subject to backup withholding.\n\nUpload your completed and signed Form W-9 below. GForceSI stores this document securely in your contractor file and uses the TIN solely for required tax reporting.`,
  },
  {
    key: "mn_ic_exemption_on_file",
    title: "MN Independent Contractor Exemption Certificate",
    uriField: "mn_ic_exemption_document_uri",
    expiryField: "mn_ic_exemption_expiry",
    disclosure: `Under Minnesota Statutes § 176.015, subd. 2, an individual performing services in the construction industry must obtain an Independent Contractor Exemption Certificate from the Minnesota Department of Labor and Industry to be classified as an independent contractor for workers' compensation purposes, rather than being presumed an employee. Minnesota Statutes § 181.723 defines "independent contractor" for the construction industry and sets out the factors used to determine independent contractor status.\n\nBy signing, you represent that, where your services for GForceSI fall within the construction industry as defined by Minnesota law, you have obtained, or will obtain prior to commencing work, a valid Independent Contractor Exemption Certificate, and that you are not an employee for purposes of Minnesota workers' compensation and unemployment insurance. You understand that misclassification may result in penalties, back taxes, and liability for unpaid premiums.\n\nUpload your valid Independent Contractor Exemption Certificate and enter its expiration date below.`,
  },
  {
    key: "insurance_on_file",
    title: "Certificate of Insurance — General Liability",
    uriField: "coi_document_uri",
    expiryField: "coi_expiry",
    disclosure: `You must maintain Commercial General Liability insurance with limits of not less than $1,000,000 per occurrence and $2,000,000 general aggregate, naming GForceSI and its clients as additional insureds.\n\nYou agree to furnish a Certificate of Insurance evidencing this coverage before commencing any work, to provide renewal certificates, and to maintain continuous coverage throughout the engagement. You understand that failure to maintain required coverage may result in suspension or termination of assignments.\n\nUpload your Certificate of Insurance and enter its expiration date below.`,
  },
  {
    key: "workers_comp_on_file",
    title: "Workers' Compensation Coverage",
    uriField: "workers_comp_document_uri",
    expiryField: "workers_comp_expiry",
    disclosure: `Under Minnesota Statutes chapter 176, employers must generally carry workers' compensation insurance for their employees. As an independent contractor, you represent that you either (a) maintain your own workers' compensation coverage for any personnel you employ, or (b) qualify for and hold a valid Minnesota Independent Contractor Exemption Certificate that exempts you from the requirement.\n\nYou agree to provide proof of coverage or exemption upon request and to notify GForceSI of any lapse in coverage.\n\nUpload your workers' compensation policy or exemption proof and enter its expiration date below.`,
  },
  {
    key: "esign_consent",
    title: "Electronic Signature Consent",
    signOnly: true,
    disclosure: `By signing electronically, you consent to conduct transactions and to execute this and related documents electronically under the Electronic Signatures in Global and National Commerce Act (ESIGN, 15 U.S.C. § 7001 et seq.) and the Minnesota Uniform Electronic Transactions Act (Minn. Stat. ch. 325L).\n\nYou acknowledge that your electronic signature has the same legal force and effect as a handwritten signature, that you may request a paper copy of any signed document, and that you may withdraw this electronic consent by notifying GForceSI in writing (which may affect your continued engagement).`,
  },
];

const entityLabels = {
  sole_proprietor: "Sole Proprietor", llc: "LLC", s_corp: "S-Corp", c_corp: "C-Corp",
  partnership: "Partnership", trust_estate: "Trust / Estate", other: "Other",
};

export default function ContractorOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(blank);
  const [skillInput, setSkillInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [sigs, setSigs] = useState({});
  const [uploading, setUploading] = useState({});
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
              business_entity_type: rec.business_entity_type || "", tin_type: rec.tin_type || "",
              w9_on_file: !!rec.w9_on_file, contract_signed: !!rec.contract_signed, insurance_on_file: !!rec.insurance_on_file,
              mn_ic_exemption_on_file: !!rec.mn_ic_exemption_on_file, workers_comp_on_file: !!rec.workers_comp_on_file, esign_consent: !!rec.esign_consent,
              w9_document_uri: rec.w9_document_uri || "", coi_document_uri: rec.coi_document_uri || "", coi_expiry: rec.coi_expiry || "",
              mn_ic_exemption_document_uri: rec.mn_ic_exemption_document_uri || "", mn_ic_exemption_expiry: rec.mn_ic_exemption_expiry || "",
              workers_comp_document_uri: rec.workers_comp_document_uri || "", workers_comp_expiry: rec.workers_comp_expiry || "",
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

  const uploadDoc = async (file, uriField) => {
    if (!file) return;
    setUploading((u) => ({ ...u, [uriField]: true }));
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      set(uriField, file_uri);
      toast({ title: "Document uploaded", description: file.name });
    } catch (e) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
    setUploading((u) => ({ ...u, [uriField]: false }));
  };

  const viewDoc = async (uri) => {
    try {
      const { signed_url } = await base44.functions.invoke("getContractorDocumentUrl", { file_uri: uri });
      window.open(signed_url, "_blank");
    } catch (e) {
      toast({ title: "Could not open document", description: e.message, variant: "destructive" });
    }
  };

  const expiryStatus = (d) => {
    if (!d) return { label: "Expiry required", tone: "amber" };
    const exp = new Date(d + "T23:59:59");
    const today = new Date(new Date().toDateString());
    const days = Math.round((exp - today) / 86400000);
    if (days < 0) return { label: `Expired ${new Date(d).toLocaleDateString()}`, tone: "rose" };
    if (days <= 30) return { label: `Expires in ${days}d (${new Date(d).toLocaleDateString()})`, tone: "amber" };
    return { label: `Valid until ${new Date(d).toLocaleDateString()}`, tone: "emerald" };
  };

  const allSigned = form.w9_on_file && form.contract_signed && form.mn_ic_exemption_on_file && form.workers_comp_on_file && form.insurance_on_file && form.esign_consent;
  const allUploaded = form.w9_document_uri && form.coi_document_uri && form.mn_ic_exemption_document_uri && form.workers_comp_document_uri;
  const expiriesValid = ["coi_expiry", "mn_ic_exemption_expiry", "workers_comp_expiry"].every((k) => {
    const d = form[k];
    if (!d) return false;
    return new Date(d + "T23:59:59") >= new Date(new Date().toDateString());
  });
  const complianceReady = allSigned && allUploaded && expiriesValid && form.business_entity_type && form.tin_type;

  const canNext = () => {
    if (step === 0) return form.name && form.role;
    if (step === 2) return form.pay_type && form.pay_rate != null;
    return true;
  };

  const submit = async () => {
    setSaving(true);
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
      <p className="text-sm text-slate-500 mb-6">{editingId ? "Fill out your details, upload each required compliance document, and sign each legal form to finish onboarding." : "Add a new contractor to the GForceSI field roster."}</p>
      {editingId && (
        <div className="mb-6 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-sm text-cyan-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" /> You were invited to onboard — your details and documents are saved to your contractor record.
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
            <p className="text-sm text-slate-400">Provide your W-9 tax classification, upload each required compliance document with its expiration date, and sign each disclosure by typing your full name exactly as entered in your profile.</p>

            {/* Tax classification (W-9) */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              <div className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-cyan-400" /> W-9 Tax Classification</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Business entity type *">
                  <select value={form.business_entity_type} onChange={(e) => set("business_entity_type", e.target.value)} className={inputCls}>
                    <option value="">— Select —</option>
                    {Object.entries(entityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="TIN type *">
                  <select value={form.tin_type} onChange={(e) => set("tin_type", e.target.value)} className={inputCls}>
                    <option value="">— Select —</option>
                    <option value="ssn">SSN (Social Security Number)</option>
                    <option value="ein">EIN (Employer Identification Number)</option>
                  </select>
                </Field>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">The actual TIN is collected on your uploaded Form W-9 — do not enter it here.</p>
            </div>

            {docs.map((doc) => {
              const signed = !!form[doc.key];
              const uploaded = doc.uriField ? !!form[doc.uriField] : true;
              const exp = doc.expiryField ? expiryStatus(form[doc.expiryField]) : null;
              const toneCls = { emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", amber: "bg-amber-500/15 text-amber-300 border-amber-500/30", rose: "bg-rose-500/15 text-rose-300 border-rose-500/30" };
              return (
                <div key={doc.key} className="rounded-lg border border-slate-700 bg-slate-800/40 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700 bg-slate-800 gap-2 flex-wrap">
                    <div className="text-sm font-medium text-slate-200">{doc.title}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {signed ? <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><Check className="w-3 h-3" /> Signed</span> : <span className="text-[10px] text-rose-300">Signature required</span>}
                      {doc.uriField && (uploaded ? <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"><FileCheck2 className="w-3 h-3" /> Uploaded</span> : <span className="text-[10px] text-amber-300">Upload required</span>)}
                      {exp && <span className={`text-[10px] px-2 py-0.5 rounded border ${toneCls[exp.tone]}`}>{exp.label}</span>}
                    </div>
                  </div>
                  <div className="px-3 py-2.5 max-h-36 overflow-y-auto text-xs text-slate-400 leading-relaxed whitespace-pre-line">{doc.disclosure}</div>
                  <div className="px-3 py-2 border-t border-slate-700 space-y-2">
                    {signed
                      ? <div className="text-xs text-emerald-300 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Signed electronically by {sigs[doc.key] || form.name}</div>
                      : <input value={sigs[doc.key] || ""} onChange={(e) => handleSign(doc.key, e.target.value)} className={inputCls} placeholder={`Type "${form.name || "your full name"}" to sign`} />}
                    {doc.uriField && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                        {uploaded ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => viewDoc(form[doc.uriField])} className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium hover:bg-slate-700 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> View uploaded</button>
                            <label className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium hover:bg-slate-700 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer">
                              <Upload className="w-3.5 h-3.5" /> Replace
                              <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => uploadDoc(e.target.files?.[0], doc.uriField)} />
                            </label>
                          </div>
                        ) : (
                          <label className={`px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-medium hover:bg-cyan-400 flex items-center gap-1.5 cursor-pointer ${uploading[doc.uriField] ? "opacity-60 pointer-events-none" : ""}`}>
                            {uploading[doc.uriField] ? <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {uploading[doc.uriField] ? "Uploading…" : "Upload document"}
                            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => uploadDoc(e.target.files?.[0], doc.uriField)} />
                          </label>
                        )}
                        {doc.expiryField && (
                          <div className="sm:ml-auto flex items-center gap-2">
                            <label className="text-[11px] text-slate-400">Expires</label>
                            <input type="date" value={form[doc.expiryField] || ""} onChange={(e) => set(doc.expiryField, e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <Field label="Emergency contact">
              <input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} className={inputCls} placeholder="Name & phone" />
            </Field>
            <div className={`mt-2 p-3 rounded-lg text-xs flex items-start gap-2 ${complianceReady ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
              {complianceReady ? <UserCheck className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
              <div>
                {complianceReady
                  ? "All documents signed and uploaded with valid expiration dates — contractor will be marked fully onboarded."
                  : "Incomplete — onboarding will be saved as in progress until every disclosure is signed, every document is uploaded, and all expiration dates are valid."}
              </div>
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