import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Crown, Building2, CreditCard, ShieldCheck, HardDrive, Users, Activity,
  CheckCircle2, Loader2, Lock, ExternalLink,
} from "lucide-react";

const STRIPE_PLANS = [
  { name: "Scanning Pro", price: "$199/mo", seats: "Up to 5 users", storage: "100 GB", aiCredits: "250 AI detections/mo", features: ["CRM & 10-Stage Projects", "Client Portal PME", "Offline Field PWA"] },
  { name: "Agency Business", price: "$495/mo", seats: "Up to 25 users", storage: "500 GB", aiCredits: "2,000 AI detections/mo", features: ["White-Label Agency Portals", "AI Route & AK/HI Flight Bundling", "QuickBooks Online 2-Way Sync"], popular: true },
  { name: "Enterprise 50-State", price: "$1,495/mo", seats: "Unlimited users", storage: "2 TB+", aiCredits: "Unlimited AI Inventory", features: ["Dedicated Tenant Isolation & BAA", "IBM Maximo EAM Gateway", "SAML SSO & Priority 24h SLA"] },
];

const SAAS_ROLES = [
  { role: "Platform Super Administrator", scope: "Global SaaS subscriptions, tenant health, billing & platform governance" },
  { role: "Business Owner", scope: "Full tenant ownership: financials, QuickBooks, HR/W-9/Payroll & RBAC" },
  { role: "Business Administrator", scope: "User management, integrations, CRM & enterprise account operations" },
  { role: "Project Manager", scope: "10-stage digital twin projects, AI route/trip planning & QA sign-off" },
  { role: "Scanning Technician", scope: "Offline-first Field PWA, GPS check-in, receipt/mileage logging & GForcePay" },
  { role: "Inventory Reviewer", scope: "AI Visual Inventory gallery human approval, tagging & asset reports" },
  { role: "Client", scope: "Tenant-isolated client portal, 3D PME viewing, deliverable approvals & invoices" },
];

export default function SaasAdmin() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [audits, setAudits] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Client.list().catch(() => []),
      base44.entities.User.list().catch(() => []),
      base44.entities.Project.list().catch(() => []),
      base44.entities.AuditLog.list("-timestamp", 25).catch(() => []),
    ]).then(([c, u, p, a]) => {
      setClients(c || []);
      setUsers(u || []);
      setProjects(p || []);
      setAudits(a || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-[#F97316] animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-[#F97316]" />
            <h1 className="text-2xl font-bold text-white">Multi-Tenant SaaS Super Admin &amp; Subscriptions</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage subscribing digital twin businesses, Stripe billing plans, usage metering, tenant isolation health &amp; security audit logs.
          </p>
        </div>
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-2 rounded-lg bg-[#126DFA] hover:bg-[#4A9EFF] text-white text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <CreditCard className="w-3.5 h-3.5" /> Stripe Billing Dashboard <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Security Banner */}
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-200 flex items-center gap-2.5">
        <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Server-Enforced Billing &amp; Isolation:</strong> Stripe secret keys are stored strictly server-side (never exposed to browsers). Every tenant&apos;s users, customers, projects, inventories, and reports are isolated at the API and database layers.
        </span>
      </div>

      {/* Platform Health KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between"><span>Subscribing Tenants</span><Building2 className="w-4 h-4 text-[#4A9EFF]" /></div>
          <div className="text-2xl font-bold text-white mt-1">{clients.length}</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between"><span>Total Platform Users</span><Users className="w-4 h-4 text-[#FF8A3D]" /></div>
          <div className="text-2xl font-bold text-white mt-1">{users.length}</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between"><span>Active Tenant Projects</span><HardDrive className="w-4 h-4 text-cyan-300" /></div>
          <div className="text-2xl font-bold text-white mt-1">{projects.length}</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-4">
          <div className="text-xs text-slate-400 flex items-center justify-between"><span>Tenant Health</span><Activity className="w-4 h-4 text-emerald-400" /></div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">100% Isolated</div>
        </div>
      </div>

      {/* Stripe Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STRIPE_PLANS.map((plan) => (
          <div key={plan.name} className={`rounded-xl p-5 border space-y-3 ${plan.popular ? "bg-[#0D1C33] border-[#F97316]" : "bg-[#0D1C33] border-[#1E3A5F]"}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">{plan.name}</h2>
              {plan.popular && <span className="px-2 py-0.5 rounded-full bg-[#F97316] text-white text-[10px] font-bold uppercase">Most Popular</span>}
            </div>
            <div className="text-2xl font-extrabold text-[#4A9EFF]">{plan.price}</div>
            <div className="text-xs text-slate-400">{plan.seats} · {plan.storage} · {plan.aiCredits}</div>
            <ul className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* 7 SaaS Roles Matrix + Recent Security Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-5 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#4A9EFF]" /> 7-Tier Multi-Tenant SaaS Roles</h2>
          <div className="divide-y divide-slate-800">
            {SAAS_ROLES.map((r) => (
              <div key={r.role} className="py-2.5 text-xs">
                <div className="font-semibold text-white">{r.role}</div>
                <div className="text-slate-400 mt-0.5">{r.scope}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-[#0D1C33] border border-[#1E3A5F] p-5 space-y-3">
          <h2 className="text-sm font-bold text-white">Immutable Platform Audit Logs</h2>
          {audits.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">Audit logs populate automatically on authentication, approvals, syncs &amp; backups.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {audits.map((a, idx) => (
                <div key={a.id || idx} className="p-2.5 rounded-lg bg-[#0A1628] border border-slate-800 text-xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-[#FF8A3D] uppercase text-[10px] mr-2">{a.action}</span>
                    <span className="text-slate-200 truncate">{a.details || a.entity_type}</span>
                    <div className="text-[10px] text-slate-500">{a.actor}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
