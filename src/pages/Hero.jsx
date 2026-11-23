import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Satellite, ShieldCheck, Globe2, Sparkles, Upload, CheckCircle2,
  ArrowRight, Building2, MapPin, Plane, Layers, FileSpreadsheet, Play,
  Lock, BarChart3, Smartphone, Loader2, Scale, DollarSign, ExternalLink,
  Download, ClipboardCheck, Award, Briefcase, Menu, X,
} from "lucide-react";
import { GForceLogo, SpatialUSAMapGraphic } from "@/components/brand/GForceGraphics";

const SHOWCASE_DEMOS = [
  {
    id: "banking",
    label: "Enterprise Banking Flagship",
    client: "Bank of America & Fortune 500 Financial Networks",
    specs: "8,400 sq ft · Matterport Pro3 LiDAR · 24h SLA · MatterPak + E57",
    region: "All 50 States · Contiguous US, AK & HI",
    embedUrl: "https://my.matterport.com/show/?m=SxQL3iGyoDo&play=1&qs=1",
    highlights: [
      "Vault foyer & teller line ±20 mm LiDAR precision",
      "Zero-seat Private Model Embed (PME) for executive sign-off",
      "Standardized CAD/BIM floor plans & PII monitor redaction",
    ],
  },
  {
    id: "retail",
    label: "National Agency Retail Campaign",
    client: "National Advertising Agency Experiential Rollout",
    specs: "18,200 sq ft · Interior + Exterior LiDAR · 36h SLA",
    region: "Contiguous US + Hawaii (HI) Flagships",
    embedUrl: "https://my.matterport.com/show/?m=j4RZx7ZGM6T&play=1&qs=1",
    highlights: [
      "Virtual pre-production location scouting for creative directors",
      "Exact fixture, endcap & window signage measurements",
      "White-label multi-brand agency portal with stakeholder QA",
    ],
  },
  {
    id: "remote",
    label: "Alaska & Hawaii Mobilization",
    client: "Arctic & Pacific Enterprise Infrastructure",
    specs: "11,500 sq ft · Flight-Bundled Pro3 Crew · HIPAA De-Identified",
    region: "Alaska (AK) & Hawaii (HI) Hubs",
    embedUrl: "https://my.matterport.com/show/?m=aSx1Mp2s8Q2&play=1&qs=1",
    highlights: [
      "Multi-branch flight bundling reduces AK/HI travel spend by 38%",
      "Offline IndexedDB Field PWA in zero-signal vaults & remote sites",
      "HIPAA & BAA compliant blur protocols with audit trail",
    ],
  },
];

const ENTERPRISE_CASE_STUDIES = [
  {
    tag: "Enterprise Banking Rollout",
    client: "Bank of America — 50-State Financial Center Digital Twins",
    coverage: "Contiguous US + Anchorage/Fairbanks (AK) + Honolulu/Maui (HI)",
    metrics: [
      { value: "120+", label: "Financial Centers" },
      { value: "99.6%", label: "48h SLA Hit Rate" },
      { value: "±20 mm", label: "Pro3 + E57 Accuracy" },
    ],
    summary:
      "Standardized after-hours Matterport Pro3 & E57 LiDAR capture across Manhattan flagships, CONUS regional branches, Alaska financial centers, and Hawaii islands—complete with escorted vault security clearances and PII screen redaction.",
    deliverables: "Private Model Embeds (PME) · E57 Point Clouds · MatterPak · Schematic Floor Plans",
  },
  {
    tag: "National Ad Agency Spatial Campaign",
    client: "Omnicom / Global Retail Agency — 180-Store Experiential Launch",
    coverage: "All 50 States · Tier-1 Metro Flagships, Oahu (HI) & Anchorage (AK)",
    metrics: [
      { value: "64%", label: "Less Recon Travel" },
      { value: "0 Seats", label: "Client PME Access" },
      { value: "36 hr", label: "Turnaround to Creative" },
    ],
    summary:
      "Enabled agency creative directors, fabrication vendors, and brand CMOs to virtually scout 180 retail footprints simultaneously, verify exact merchandising dimensions, and approve installs inside a white-label multi-brand portal.",
    deliverables: "White-Label Agency Portal · TwinScan AI Fixture Counts · BIM/CAD Exports",
  },
  {
    tag: "AK & HI Flight-Bundled Operations",
    client: "Pacific & Arctic Healthcare / Telecom — Remote Facility Capture",
    coverage: "Alaska (ANC · FAI · JNU) & Hawaii (Oahu · Maui · Kauai · Big Island)",
    metrics: [
      { value: "38%", label: "Airfare & Hotel Saved" },
      { value: "100%", label: "HIPAA BAA Compliant" },
      { value: "Offline", label: "IndexedDB Field Sync" },
    ],
    summary:
      "AI-clustered inter-island Hawaii Pro3 teams and flight-bundled Alaska routes eliminated fragmented freelancer markups while maintaining uninterrupted offline capture inside shielded clinical and telecom vaults.",
    deliverables: "Zero-PHI Blurred 3D Twins · Asset Condition Inventory · QBO Reconciled Billing",
  },
];

const OPS_WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Bulk CSV & AI 50-State Dispatch",
    desc: "Upload 10 to 2,000+ locations. OpsCenter auto-classifies Contiguous US (CONUS), Alaska (AK), and Hawaii (HI) sites, clustering drive routes and flight-bundled itineraries.",
    icon: FileSpreadsheet,
  },
  {
    step: "02",
    title: "Certified Pro3 Capture & Vault PWA",
    desc: "W-9/COI/NDA-verified technicians capture Matterport Pro3 + E57 LiDAR using our Offline Field PWA—continuing seamlessly inside zero-signal bank vaults and remote sites.",
    icon: Smartphone,
  },
  {
    step: "03",
    title: "6-Point Enterprise QA & PII Gate",
    desc: "Internal QA engineers verify zero LiDAR drift, balanced lighting, HIPAA/financial monitor blur, MatterPak integrity, and unauthenticated PME playback before release.",
    icon: ClipboardCheck,
  },
  {
    step: "04",
    title: "White-Label Agency Handoff & QBO",
    desc: "Agencies and brand subsidiaries review and approve twins in tenant-isolated portals, triggering TwinScan AI asset counts and automated QuickBooks Online invoicing.",
    icon: Layers,
  },
];

const SAMPLE_50STATE_CSV = [
  "branch_code,name,address,state,sqft",
  'NY-0412,BoA Midtown Manhattan Flagship,"1 Bryant Park, New York, NY 10036",NY,8400',
  'TX-0219,Dallas Arts District Financial Center,"2100 Ross Ave, Dallas, TX 75201",TX,6800',
  'CA-0884,San Francisco Market St Flagship,"345 Montgomery St, San Francisco, CA 94104",CA,9200',
  'IL-0305,Chicago Loop Retail Activation,"135 S LaSalle St, Chicago, IL 60603",IL,7500',
  'AK-0018,Anchorage Financial Center,"550 W 7th Ave, Anchorage, AK 99501",AK,6200',
  'AK-0024,Fairbanks Downtown Branch,"360 Merhar Ave, Fairbanks, AK 99701",AK,5400',
  'HI-0004,Honolulu Bishop St Financial Center,"1001 Bishop St, Honolulu, HI 96813",HI,7100',
  'HI-0011,Maui Kahului Retail Flagship,"275 W Kaahumanu Ave, Kahului, HI 96732",HI,6600',
].join("\n");

// RFC-4180 quote-aware CSV parser so quoted addresses containing commas never shift state/sqft columns
function parseCsvRow(line) {
  const cols = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function parseBulkCsv(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  return lines.slice(1).map((line, idx) => {
    const cols = parseCsvRow(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || "";
    });
    const state = (row.state || row.st || row.region || "").toUpperCase();
    const region_zone =
      state === "AK" || state === "ALASKA"
        ? "AK"
        : state === "HI" || state === "HAWAII"
        ? "HI"
        : "CONUS";
    return {
      branch_code: row.branch_code || row.code || row.id || `BR-${String(idx + 1).padStart(4, "0")}`,
      name: row.name || row.branch || row.location || `Branch ${idx + 1}`,
      address: row.address || [row.street, row.city, state, row.zip].filter(Boolean).join(", ") || "TBD",
      state: state || "US",
      region_zone,
      square_footage: Number(row.square_footage || row.sqft || row.sq_ft || 5000) || 5000,
    };
  });
}

export default function Hero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDemo, setActiveDemo] = useState(SHOWCASE_DEMOS[0]);
  const [rfpForm, setRfpForm] = useState({
    contact_name: "",
    company: "",
    client_type: "ad_agency",
    email: "",
    phone: "",
    sla_tier: "48",
    target_sites: "50",
    notes: "",
  });
  const [csvSites, setCsvSites] = useState([]);
  const [csvName, setCsvName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState(null);
  const [rfpError, setRfpError] = useState("");

  const applyCsvText = (rawText, filename) => {
    const parsed = parseBulkCsv(rawText);
    setCsvName(filename);
    setCsvSites(parsed);
    if (parsed.length > 0) {
      setRfpForm((f) => ({ ...f, target_sites: String(parsed.length) }));
    }
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      applyCsvText(String(reader.result || ""), file.name);
    };
    reader.readAsText(file);
  };

  const loadSampleRolloutCsv = () => {
    applyCsvText(SAMPLE_50STATE_CSV, "sample_50state_rollout_conus_ak_hi.csv");
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([SAMPLE_50STATE_CSV + "\n"], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gforcesi_50state_rollout_template.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const zoneCounts = csvSites.reduce(
    (acc, s) => {
      acc[s.region_zone] = (acc[s.region_zone] || 0) + 1;
      return acc;
    },
    { CONUS: 0, AK: 0, HI: 0 }
  );

  const estimatedSitesCount = csvSites.length > 0 ? csvSites.length : Math.max(1, Number(rfpForm.target_sites) || 1);
  const conusDisplayCount = csvSites.length > 0 ? zoneCounts.CONUS : estimatedSitesCount;
  const basePerSite = rfpForm.sla_tier === "24" ? 695 : 525;
  const remotePremium = (zoneCounts.AK + zoneCounts.HI) * 320;
  const estimatedBudget = estimatedSitesCount * basePerSite + remotePremium;

  const submitRfp = async (e) => {
    e.preventDefault();
    setRfpError("");
    const cleanName = rfpForm.contact_name.trim();
    const cleanCompany = rfpForm.company.trim();
    const cleanEmail = rfpForm.email.trim();

    if (!cleanName || !cleanCompany || !cleanEmail) {
      setRfpError("Please enter your full name, advertising agency or enterprise brand, and work email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setRfpError("Please enter a valid work email address (e.g., producer@agency.com).");
      return;
    }
    if (estimatedSitesCount < 1) {
      setRfpError("Target branch/site count must be at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      const leadNotes = [
        `Client Tier: ${rfpForm.client_type === "ad_agency" ? "National Ad Agency Partner" : "Enterprise Direct Brand"}`,
        `SLA Target: ${rfpForm.sla_tier}-Hour Turnaround`,
        `50-State Scope: ${estimatedSitesCount} total site(s) (Contiguous US: ${conusDisplayCount}, Alaska [AK]: ${zoneCounts.AK}, Hawaii [HI]: ${zoneCounts.HI})`,
        csvName ? `Uploaded CSV: ${csvName} (${csvSites.length} parsed locations)` : "Manual multi-site estimate",
        rfpForm.notes ? `Deliverables & Security Notes: ${rfpForm.notes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const createdLead = await base44.entities.Lead.create({
        name: cleanName,
        contact_name: cleanName,
        company: cleanCompany,
        email: cleanEmail,
        phone: rfpForm.phone.trim() || undefined,
        source: "website_rfp",
        status: "new",
        stage: "new",
        estimated_value: estimatedBudget,
        notes: leadNotes,
      });

      const refCode = createdLead?.id
        ? createdLead.id.toUpperCase().replace(/^LEAD_/, "GF-")
        : `GF-${Date.now().toString().slice(-6)}`;

      setSubmittedRef({
        id: refCode,
        contact: cleanName,
        company: cleanCompany,
        email: cleanEmail,
        sla: rfpForm.sla_tier,
        sites: estimatedSitesCount,
        zones: { CONUS: conusDisplayCount, AK: zoneCounts.AK, HI: zoneCounts.HI },
        estimate: estimatedBudget,
      });
    } catch (err) {
      setRfpError(err?.message || "Could not submit proposal request. Please verify your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSubmittedSummary = () => {
    if (!submittedRef) return;
    const lines = [
      "G-FORCE SI INC. (GForcesi.com) — 50-STATE MULTI-SITE ROLLOUT PROPOSAL REQUEST",
      `Reference ID: ${submittedRef.id}`,
      `Submitted: ${new Date().toISOString()}`,
      `Organization: ${submittedRef.company}`,
      `Primary Contact: ${submittedRef.contact} (${submittedRef.email})`,
      `Coverage Scope: ${submittedRef.sites} site(s) — Contiguous US: ${submittedRef.zones.CONUS} | Alaska (AK): ${submittedRef.zones.AK} | Hawaii (HI): ${submittedRef.zones.HI}`,
      `Guaranteed Turnaround Tier: ${submittedRef.sla}-Hour Enterprise SLA`,
      `Preliminary Ballpark Estimate: $${submittedRef.estimate.toLocaleString()}`,
      "Next Step: Dedicated G-Force SI National Dispatch Director responds within 4 business hours.",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GForceSI-Rollout-Proposal-${submittedRef.id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-slate-100 selection:bg-[#126DFA]/40">
      {/* Top Executive Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0A1628]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="G-Force SI Home">
            <GForceLogo size={36} subtitle="All 50 States · GForcesi.com" />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-300" aria-label="Primary Navigation">
            <a href="#coverage" className="hover:text-[#FF8A3D] transition-colors">All 50 States (CONUS · HI · AK)</a>
            <a href="#case-studies" className="hover:text-[#FF8A3D] transition-colors">Agency &amp; Enterprise Proof</a>
            <a href="#showcase" className="hover:text-[#FF8A3D] transition-colors">Live 3D Twins</a>
            <a href="#workflow" className="hover:text-[#FF8A3D] transition-colors">OpsCenter Workflow</a>
            <a href="#rfp" className="hover:text-[#FF8A3D] transition-colors">Multi-Site Proposal</a>
            <Link to="/legal" className="hover:text-[#FF8A3D] transition-colors">HIPAA &amp; Legal</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/client-portal"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E3A5F] bg-[#0D1C33] text-xs font-medium text-slate-200 hover:border-[#4A9EFF] hover:text-white transition"
            >
              <Building2 className="w-3.5 h-3.5 text-[#4A9EFF]" /> Agency / Client Portal
            </Link>
            <Link
              to="/ops"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#F97316] to-[#FF6B1A] hover:from-[#FB923C] hover:to-[#F97316] text-white text-xs font-semibold shadow-lg shadow-[#F97316]/30 transition"
            >
              Ops Command <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-lg border border-slate-800 bg-[#0D1C33] text-slate-200 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer for 375px / 768px Viewports */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-[#0D1C33] px-4 py-4 space-y-2.5 text-xs font-medium">
            <a href="#coverage" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-slate-200 hover:text-[#FF8A3D]">
              All 50 States Coverage (Contiguous US, Hawaii &amp; Alaska)
            </a>
            <a href="#case-studies" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-slate-200 hover:text-[#FF8A3D]">
              Agency &amp; Bank of America Case Studies
            </a>
            <a href="#showcase" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-slate-200 hover:text-[#FF8A3D]">
              Interactive Matterport Pro3 Showcase
            </a>
            <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-slate-200 hover:text-[#FF8A3D]">
              OpsCenter 4-Gate Execution Workflow
            </a>
            <a href="#rfp" onClick={() => setMobileMenuOpen(false)} className="block py-1.5 text-[#FF8A3D] font-semibold">
              Request Multi-Site Rollout Proposal →
            </a>
            <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
              <Link to="/client-portal" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1.5 rounded-lg bg-[#126DFA] text-white font-semibold">
                Agency / Client Portal
              </Link>
              <Link to="/field" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200">
                Field Technician PWA
              </Link>
              <Link to="/legal" onClick={() => setMobileMenuOpen(false)} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
                HIPAA &amp; Legal
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-800/80">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.18),_transparent_50%),radial-gradient(ellipse_at_bottom_left,_rgba(18,109,250,0.24),_transparent_55%)] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 lg:py-24 relative">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F97316]/15 border border-[#F97316]/40 text-[#FF8A3D] text-[11px] sm:text-xs font-semibold">
                  <Globe2 className="w-3.5 h-3.5 shrink-0" />
                  <span>All 50 U.S. States Dispatch · Contiguous US + Hawaii (HI) + Alaska (AK)</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-white leading-[1.08]">
                  Enterprise 3D Digital Twin Rollouts Across{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4A9EFF] via-[#38BDF8] to-[#FF8A3D]">
                    All 50 States
                  </span>
                </h1>

                <p className="text-sm sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                  G-Force SI mobilizes W-9/COI-certified Matterport Pro3 &amp; E57 LiDAR crews across{" "}
                  <strong className="text-white">every U.S. state — the Contiguous US, Hawaii, and Alaska</strong>.
                  Built for <strong className="text-white">national advertising agencies</strong>, retail chains, and
                  enterprise banking portfolios including <strong className="text-white">Bank of America</strong>{" "}
                  requiring identical spatial deliverables on a guaranteed 24–48 hour SLA.
                </p>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-1">
                  <a
                    href="#rfp"
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#FB923C] hover:to-[#F97316] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#F97316]/30 transition"
                  >
                    <Upload className="w-4 h-4 shrink-0" /> Request Multi-Site Rollout Proposal
                  </a>
                  <Link
                    to="/client-portal"
                    className="px-5 py-3 rounded-xl bg-[#126DFA] hover:bg-[#4A9EFF] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#126DFA]/30 transition"
                  >
                    <Lock className="w-4 h-4 shrink-0" /> White-Label Agency Portal
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <Link
                    to="/field"
                    className="px-3.5 py-2 rounded-lg border border-[#1E3A5F] bg-[#0D1C33]/80 hover:border-[#FF8A3D] text-slate-200 font-medium text-xs flex items-center gap-1.5 transition"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[#FF8A3D]" /> Offline Vault Field PWA
                  </Link>
                  <a
                    href="https://gforcepay.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-lg border border-[#F97316]/40 bg-[#F97316]/10 hover:bg-[#F97316]/20 text-[#FF8A3D] font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> GForcePay Technician Payouts <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
                  <HeroStat value="All 50 States" label="Contiguous US, HI & AK" />
                  <HeroStat value="24–48 hr" label="SLA-Backed Turnaround" />
                  <HeroStat value="±20 mm" label="Matterport Pro3 LiDAR" />
                  <HeroStat value="0 Seats" label="Private Model Embeds" />
                </div>
              </div>

              {/* Right Executive Spatial Graphic + 50-State Regional Telemetry */}
              <div className="lg:col-span-6 space-y-4">
                <SpatialUSAMapGraphic />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      region: "Contiguous US (CONUS)",
                      detail: "All 48 Mainland States · 1,420+ Sites",
                      tag: "99.6% SLA On-Time",
                      accent: "border-[#126DFA]/40 text-[#4A9EFF]",
                    },
                    {
                      region: "Alaska (AK)",
                      detail: "Anchorage · Fairbanks · Juneau",
                      tag: "Flight-Bundled Crews",
                      accent: "border-[#F97316]/40 text-[#FF8A3D]",
                    },
                    {
                      region: "Hawaii (HI)",
                      detail: "Oahu · Maui · Kauai · Big Island",
                      tag: "Inter-Island Pro3 Kits",
                      accent: "border-[#F97316]/40 text-[#FF8A3D]",
                    },
                  ].map((row) => (
                    <div key={row.region} className={`rounded-xl border bg-[#0D1C33]/90 p-3.5 ${row.accent}`}>
                      <div className="text-xs font-bold text-white">{row.region}</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">{row.detail}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mt-1.5">{row.tag}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Executive Trust Strip */}
        <section className="border-b border-slate-800/80 bg-[#071120] py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <span className="uppercase tracking-[0.18em] text-[10px] font-bold text-[#4A9EFF]">
              Engineered For Multi-Location Enterprise &amp; Agency Production
            </span>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-300 font-semibold">
              <span className="inline-flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-[#FF8A3D]" /> National Banking Portfolios (e.g., Bank of America)</span>
              <span className="inline-flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-[#4A9EFF]" /> Holding-Company Ad Agencies</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> HIPAA BAA &amp; Escorted Vault Ready</span>
            </div>
          </div>
        </section>

        {/* 50-State Coverage & Agency Pillars */}
        <section id="coverage" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="text-xs uppercase tracking-[0.2em] text-[#4A9EFF] font-semibold mb-2">
              True 50-State Standardization · Zero Regional Gaps
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              One Unified Operating System Across the Contiguous US, Hawaii &amp; Alaska
            </h2>
            <p className="text-sm text-slate-400 mt-3">
              Replace inconsistent local freelancers with a single national SLA partner. G-Force SI unifies 50-state
              dispatch, AI flight/drive clustering, white-label agency portals, and QuickBooks Online reconciliation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Plane,
                title: "All 50 States (CONUS + AK + HI)",
                desc: "AI clusters mainland branches by drive radius while bundling Alaska and Hawaii airfare, inter-island hops, lodging, and per-diem to cut remote mobilization costs by up to 38%.",
              },
              {
                icon: Layers,
                title: "White-Label Agency Portals",
                desc: "National ad agency producers oversee every brand subsidiary (such as Bank of America or retail flagships) inside a strict tenant-isolated portal with zero-seat PME embeds.",
              },
              {
                icon: Smartphone,
                title: "Offline Bank Vault Field PWA",
                desc: "IndexedDB offline queuing keeps technicians Productive inside Faraday-shielded bank vaults, basements, and remote Arctic/Pacific sites, syncing automatically on reconnect.",
              },
              {
                icon: BarChart3,
                title: "QBO Billing & 50-State Tax Nexus",
                desc: "Automated QuickBooks Online invoice & 1099 payout sync, IRS Form W-9 PDF generation, Hawaii GET (4.5%) & Alaska nexus tracking, and per-branch margin telemetry.",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 hover:border-[#4A9EFF]/40 transition">
                <div className="w-10 h-10 rounded-xl bg-[#126DFA]/15 border border-[#126DFA]/30 flex items-center justify-center text-[#4A9EFF] mb-4">
                  <card.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{card.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Enterprise & National Advertising Agency Case Studies */}
        <section id="case-studies" className="border-t border-slate-800/80 bg-[#081223] py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#FF8A3D] font-semibold mb-2">
                  Proven At National Enterprise Scale
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  Agency &amp; Fortune 500 Multi-Location Rollout Proof
                </h2>
                <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                  From high-security financial centers to rapid 50-state retail experiential campaigns, see how enterprise
                  operations and agency production teams execute with G-Force SI.
                </p>
              </div>
              <a
                href="#rfp"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#126DFA] hover:bg-[#4A9EFF] text-white text-xs font-semibold shrink-0 self-start md:self-auto transition"
              >
                Scope Similar Rollout <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {ENTERPRISE_CASE_STUDIES.map((cs) => (
                <article
                  key={cs.client}
                  className="rounded-2xl border border-[#1E3A5F] bg-[#0D1C33]/90 p-6 flex flex-col justify-between shadow-xl"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-[#F97316]/15 text-[#FF8A3D] border border-[#F97316]/35">
                        {cs.tag}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white leading-snug">{cs.client}</h3>
                      <div className="text-[11px] text-[#4A9EFF] font-medium mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" /> {cs.coverage}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800/90">
                      {cs.metrics.map((m) => (
                        <div key={m.label}>
                          <div className="text-base sm:text-lg font-extrabold text-white">{m.value}</div>
                          <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{m.label}</div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">{cs.summary}</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-200">Deliverables: </span>
                    {cs.deliverables}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Matterport 3D Showcase */}
        <section id="showcase" className="border-y border-slate-800/80 bg-slate-950/60 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#4A9EFF] font-semibold mb-2">
                  Interactive Matterport Pro3 / LiDAR Showcase
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Inspect Enterprise Deliverable Fidelity</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {SHOWCASE_DEMOS.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => setActiveDemo(demo)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition ${
                      activeDemo.id === demo.id
                        ? "bg-[#126DFA] border-[#4A9EFF] text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-[#0A1628] overflow-hidden shadow-2xl">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={activeDemo.embedUrl}
                    title={activeDemo.label}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="xr-spatial-tracking; vr; accelerometer; gyroscope; fullscreen; autoplay"
                  />
                </div>
              </div>
              <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-[#126DFA]/15 text-[#4A9EFF] border border-[#126DFA]/30">
                    <MapPin className="w-3 h-3" /> {activeDemo.region}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{activeDemo.label}</h3>
                    <div className="text-xs text-slate-400 mt-1">{activeDemo.client}</div>
                  </div>
                  <div className="rounded-lg bg-[#0A1628] border border-slate-800 p-3 text-xs text-slate-300 font-mono">
                    {activeDemo.specs}
                  </div>
                  <ul className="space-y-2.5 pt-2">
                    {activeDemo.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-6 border-t border-slate-800 mt-6 space-y-2">
                  <a
                    href="#rfp"
                    className="w-full py-2.5 rounded-xl bg-[#126DFA] hover:bg-[#4A9EFF] text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Play className="w-3.5 h-3.5" /> Request Custom Branch Pilot
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OpsCenter 4-Gate Execution Workflow + Business OS */}
        <section id="workflow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-14">
          <div>
            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="text-xs uppercase tracking-[0.2em] text-[#4A9EFF] font-semibold mb-2">
                G-Force SI OpsCenter Architecture
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                End-to-End Field Dispatch, QA Gate &amp; Deliverable Handoff
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Built for zero-surprise execution across multi-hundred-site banking, retail, and agency schedules.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {OPS_WORKFLOW_STEPS.map((w) => (
                <div key={w.step} className="rounded-2xl border border-[#1E3A5F] bg-[#0D1C33]/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-[#F97316]/15 text-[#FF8A3D] border border-[#F97316]/30">
                      GATE {w.step}
                    </span>
                    <w.icon className="w-5 h-5 text-[#4A9EFF]" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{w.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="platform" className="grid md:grid-cols-3 gap-5 pt-4">
            {[
              {
                title: "Sales, Proposals & Metricool",
                items: [
                  "Bulk CSV RFP Intake & 50-State Pipeline",
                  "Per-Sqft & SLA Enterprise Proposal Builder",
                  "Metricool Multi-Network Campaign Scheduling",
                  "AI Case-Study Copywriter for Agencies",
                ],
                link: "/marketing",
                cta: "Open Marketing Hub",
              },
              {
                title: "HR, 50-State Taxes & QuickBooks",
                items: [
                  "1099-NEC Onboarding & Automated W-9 PDFs",
                  "CONUS, Alaska & Hawaii GET Tax Compliance",
                  "Two-Way QuickBooks Online Sync & Mapping",
                  "GPS Mileage Calculator & Receipt Audit Trail",
                ],
                link: "/hr-tax-payroll",
                cta: "Open HR, Tax & Payroll",
              },
              {
                title: "Legal, HIPAA & IP Governance",
                items: [
                  "HIPAA & Healthcare Facility BAA Safeguards",
                  "Enterprise Terms & 24–48h SLA Guarantee",
                  "Strict Agency & Brand Multi-Tenant Isolation",
                  "ISBN-Registered Capture SOP Manuals",
                ],
                link: "/legal",
                cta: "View Legal & HIPAA Hub",
              },
            ].map((col) => (
              <div key={col.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">{col.title}</h3>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {col.items.map((it) => (
                      <li key={it} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#4A9EFF] shrink-0 mt-0.5" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to={col.link}
                  className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#4A9EFF] hover:text-white transition"
                >
                  {col.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Bulk Multi-Site CSV RFP & Rollout Proposal Intake */}
        <section id="rfp" className="border-t border-slate-800 bg-slate-950/80 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-8 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-[#FF8A3D] font-semibold">
                    All 50 States · Contiguous US + Hawaii + Alaska
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    Request Multi-Site Rollout Proposal
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Instant ballpark pricing with automatic Alaska (AK) &amp; Hawaii (HI) flight-bundling detection.
                  </p>
                </div>
                <div className="rounded-xl bg-[#0A1628] border border-[#126DFA]/40 px-4 py-2.5 sm:text-right">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400">Preliminary Rollout Estimate</div>
                  <div className="text-xl font-bold text-[#4A9EFF]">${estimatedBudget.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400">
                    {estimatedSitesCount} site(s) · {rfpForm.sla_tier}h Guaranteed SLA
                  </div>
                </div>
              </div>

              {submittedRef ? (
                <div className="py-10 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h3 className="text-xl font-bold text-white">
                    Rollout Proposal Logged — Ref #{submittedRef.id}
                  </h3>
                  <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                    Thank you, <strong>{submittedRef.contact}</strong>. Your{" "}
                    <strong>{submittedRef.sites}-location</strong> scope for{" "}
                    <strong>{submittedRef.company}</strong> (Contiguous US: {submittedRef.zones.CONUS}, Alaska:{" "}
                    {submittedRef.zones.AK}, Hawaii: {submittedRef.zones.HI} · Est. $
                    {submittedRef.estimate.toLocaleString()}) is persisted in G-Force SI OpsCenter. A National Dispatch
                    Director will deliver your formal Matterport Pro3 schedule and SLA proposal within{" "}
                    <strong>4 business hours</strong>.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={downloadSubmittedSummary}
                      className="px-4 py-2.5 rounded-lg bg-[#0A1628] border border-[#4A9EFF]/50 text-[#4A9EFF] hover:text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Proposal Scope (.TXT)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmittedRef(null);
                        setCsvSites([]);
                        setCsvName("");
                      }}
                      className="px-4 py-2.5 rounded-lg bg-[#126DFA] text-white text-xs font-semibold hover:bg-[#4A9EFF]"
                    >
                      Submit Another Multi-Site Scope
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitRfp} className="mt-6 space-y-5" noValidate>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="rfp-name" className="block text-xs text-slate-300 mb-1">
                        Full Name &amp; Title *
                      </label>
                      <input
                        id="rfp-name"
                        required
                        value={rfpForm.contact_name}
                        onChange={(e) => setRfpForm({ ...rfpForm, contact_name: e.target.value })}
                        className="w-full bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A9EFF]"
                        placeholder="Jordan Vance, VP Spatial Production"
                      />
                    </div>
                    <div>
                      <label htmlFor="rfp-company" className="block text-xs text-slate-300 mb-1">
                        Advertising Agency or Enterprise Brand *
                      </label>
                      <input
                        id="rfp-company"
                        required
                        value={rfpForm.company}
                        onChange={(e) => setRfpForm({ ...rfpForm, company: e.target.value })}
                        className="w-full bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A9EFF]"
                        placeholder="e.g., Omnicom / Bank of America"
                      />
                    </div>
                    <div>
                      <label htmlFor="rfp-email" className="block text-xs text-slate-300 mb-1">
                        Work Email *
                      </label>
                      <input
                        id="rfp-email"
                        type="email"
                        required
                        value={rfpForm.email}
                        onChange={(e) => setRfpForm({ ...rfpForm, email: e.target.value })}
                        className="w-full bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A9EFF]"
                        placeholder="producer@agency.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="rfp-phone" className="block text-xs text-slate-300 mb-1">
                        Direct Phone (Optional)
                      </label>
                      <input
                        id="rfp-phone"
                        type="tel"
                        value={rfpForm.phone}
                        onChange={(e) => setRfpForm({ ...rfpForm, phone: e.target.value })}
                        className="w-full bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A9EFF]"
                        placeholder="(212) 555-0190"
                      />
                    </div>
                    <div>
                      <label htmlFor="rfp-org-type" className="block text-xs text-slate-300 mb-1">
                        Organization Profile
                      </label>
                      <select
                        id="rfp-org-type"
                        value={rfpForm.client_type}
                        onChange={(e) => setRfpForm({ ...rfpForm, client_type: e.target.value })}
                        className="w-full bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A9EFF]"
                      >
                        <option value="ad_agency">National Ad Agency Managing Enterprise Brand(s)</option>
                        <option value="enterprise_direct">Enterprise Direct (Banking / Retail / Healthcare)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="rfp-sla" className="block text-xs text-slate-300 mb-1">
                          Guaranteed SLA Tier
                        </label>
                        <select
                          id="rfp-sla"
                          value={rfpForm.sla_tier}
                          onChange={(e) => setRfpForm({ ...rfpForm, sla_tier: e.target.value })}
                          className="w-full bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A9EFF]"
                        >
                          <option value="48">48-Hour Enterprise SLA</option>
                          <option value="24">24-Hour Priority Express</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="rfp-sites" className="block text-xs text-slate-300 mb-1">
                          Total Site Count
                        </label>
                        <input
                          id="rfp-sites"
                          type="number"
                          min="1"
                          value={rfpForm.target_sites}
                          onChange={(e) => setRfpForm({ ...rfpForm, target_sites: e.target.value })}
                          className="w-full bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A9EFF]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bulk CSV Dropzone + Instant 50-State Sample Loader */}
                  <div className="rounded-xl border border-dashed border-slate-700 bg-[#0A1628] p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <FileSpreadsheet className="w-8 h-8 text-[#4A9EFF] shrink-0 mt-0.5 sm:mt-0" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {csvName
                              ? `${csvName} (${csvSites.length} locations parsed)`
                              : "Optional: Upload Multi-Location Schedule (.CSV)"}
                          </div>
                          <div className="text-xs text-slate-400">
                            Columns: <code className="text-slate-300">branch_code, name, address, state, sqft</code> —
                            auto-classifies Contiguous US, Alaska (AK) &amp; Hawaii (HI).
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={loadSampleRolloutCsv}
                          className="px-3 py-1.5 rounded-lg bg-[#F97316]/15 hover:bg-[#F97316]/25 border border-[#F97316]/40 text-[#FF8A3D] text-xs font-semibold transition"
                        >
                          Load Sample 50-State CSV
                        </button>
                        <button
                          type="button"
                          onClick={downloadCsvTemplate}
                          className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> Template
                        </button>
                        <label className="px-3.5 py-1.5 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-xs font-semibold text-white cursor-pointer text-center">
                          Upload CSV
                          <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvUpload} />
                        </label>
                      </div>
                    </div>

                    {csvSites.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-[#126DFA]/15 text-[#4A9EFF] border border-[#126DFA]/30 font-medium">
                            Contiguous US (CONUS): {zoneCounts.CONUS}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                            Alaska (AK): {zoneCounts.AK}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                            Hawaii (HI): {zoneCounts.HI}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCsvSites([]);
                            setCsvName("");
                          }}
                          className="text-slate-400 hover:text-rose-300 underline text-[11px]"
                        >
                          Clear CSV
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="rfp-notes" className="block text-xs text-slate-300 mb-1">
                      Deliverables, Agency Branding &amp; Security Notes
                    </label>
                    <textarea
                      id="rfp-notes"
                      rows={3}
                      value={rfpForm.notes}
                      onChange={(e) => setRfpForm({ ...rfpForm, notes: e.target.value })}
                      className="w-full bg-[#0A1628] border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4A9EFF] resize-none"
                      placeholder="MatterPak, E57 point clouds, CAD/BIM floor plans, white-label agency portal, after-hours bank vault escort, HIPAA blur..."
                    />
                  </div>

                  {rfpError && (
                    <div role="alert" className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                      {rfpError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#FB923C] hover:to-[#F97316] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#F97316]/25 disabled:opacity-50 transition"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {submitting ? "Persisting Multi-Site Proposal..." : "Request Multi-Site Rollout Proposal"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Enterprise Footer with Legal, HIPAA, Privacy, Terms, Copyright & ISBN */}
      <footer className="border-t border-slate-800 bg-[#070F1C] py-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <Satellite className="w-4 h-4 text-[#4A9EFF]" /> G-Force SI Inc. · GForcesi.com
            </div>
            <p className="mt-1 text-slate-400">
              © {new Date().getFullYear()} G-Force SI Inc. All Rights Reserved. All 50 U.S. States (Contiguous US, Hawaii &amp; Alaska) 3D Digital Twin Capture.
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              SOP Manual ISBN 979-8-9914201-0-4 · HIPAA BAA Ready · Matterport Enterprise Partner · FAA Part 107 Compliant
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-slate-400">
            <Link to="/legal" className="hover:text-white flex items-center gap-1"><Scale className="w-3.5 h-3.5" /> Legal &amp; IP</Link>
            <Link to="/hipaa" className="hover:text-white flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> HIPAA Notice</Link>
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <Link to="/login" className="hover:text-[#4A9EFF] font-medium">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HeroStat({ value, label }) {
  return (
    <div>
      <div className="text-lg sm:text-2xl font-bold text-white">{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}
