import React from "react";
import { Link } from "react-router-dom";
import {
  Map, KanbanSquare, Route as RouteIcon, Repeat, Users, MapPin,
  ClipboardList, AlertTriangle, Printer, Rocket, CheckCircle2, ArrowRight
} from "lucide-react";

const workflows = [
  {
    icon: Map,
    title: "1. Live Map — Your real-time operations view",
    subtitle: "See every field tech and active job on one map",
    route: "/",
    cta: "Open Live Map",
    steps: [
      "Open the Live Map from the sidebar — it's the home screen.",
      "Each colored dot is a field tech; their current status (available, en route, on site, off duty) is color-coded in the legend.",
      "Click any dot to see the tech's name, current job, and ETA.",
      "Use the status filters above the map to focus on just the crew you care about (e.g. only 'on site').",
      "Use the region filter to narrow to a geographic area.",
    ],
  },
  {
    icon: KanbanSquare,
    title: "2. Jobs — Create, assign, and track every scan",
    subtitle: "The heart of daily logistics",
    route: "/jobs",
    cta: "Open Jobs",
    steps: [
      "Go to Jobs and click 'New Job' to create a scan.",
      "Pick the project, enter the site address, and set the priority.",
      "Assign one or more contractors from the dropdown.",
      "Set the scheduled start/end time and the SLA due date so you never miss a deadline.",
      "As the crew works, update the status inline: Scheduled → En Route → On Site → Scanning → Processing → Complete → Invoiced.",
      "Use the search bar and status filter to find any job fast.",
    ],
  },
  {
    icon: RouteIcon,
    title: "3. Route Planning — Optimize the day's driving",
    subtitle: "Turn a list of jobs into an efficient route",
    route: "/routes",
    cta: "Open Route Planning",
    steps: [
      "Open Route Planning and select the jobs for the day.",
      "The map plots each stop and orders them into an efficient sequence.",
      "Review the suggested order and reassign jobs between techs if needed.",
      "Send the optimized route to the assigned contractor.",
    ],
  },
  {
    icon: Repeat,
    title: "4. Recurring Scans — Automate repeat work",
    subtitle: "Set it once; jobs generate themselves",
    route: "/recurring-schedules",
    cta: "Open Recurring Scans",
    steps: [
      "Go to Recurring Scans and click 'New Schedule'.",
      "Choose the client, site, and cadence (weekly, biweekly, monthly, quarterly).",
      "Assign the crew and required equipment.",
      "Set the next run date — the system auto-creates jobs on schedule (runs every morning at 6am CT).",
      "Toggle a schedule active/inactive anytime without deleting it.",
    ],
  },
  {
    icon: Users,
    title: "5. Contractors — Your field team roster",
    subtitle: "Know who's available and what they're certified for",
    route: "/contractors",
    cta: "Open Contractors",
    steps: [
      "Open Contractors to see every field tech, pilot, and dispatcher.",
      "Check each person's current status, role, certifications, and assigned equipment.",
      "Filter by region or status to find the right person for a job.",
      "Click a contractor to view their full profile and contact info.",
    ],
  },
  {
    icon: MapPin,
    title: "6. Sites — Every location's details in one place",
    subtitle: "Addresses, access notes, hours, and contacts",
    route: "/sites",
    cta: "Open Sites",
    steps: [
      "Open Sites to browse every job location.",
      "Each site card shows the address, client, access hours, on-site contact, and how many jobs are tied to it.",
      "Click the map link for turn-by-turn directions to the site.",
      "Use search to find a site by name, address, or client.",
    ],
  },
  {
    icon: ClipboardList,
    title: "7. Daily Reports & Issues — Stay on top of the field",
    subtitle: "What happened today, and what needs fixing",
    route: "/daily-reports",
    cta: "Open Daily Reports",
    steps: [
      "Daily Reports: review what each crew completed, hours worked, weather, and delays — submitted by the field.",
      "Issues: track punch-list items and problems flagged on site, with severity and assignment.",
      "Filter by status to see what's open vs. resolved.",
      "Acknowledge or escalate issues directly from the list.",
    ],
  },
];

const tips = [
  "Start every morning on the Live Map — it's your single source of truth for where the crew is.",
  "Create recurring scans for any client on a fixed cadence so you never hand-build a weekly job again.",
  "Set SLA due dates on every job; the Jobs page flags anything overdue in red.",
  "Use Route Planning before dispatching to cut drive time and fit more scans per day.",
  "When something goes wrong on site, it lands in Issues — check it before end of day.",
];

export default function LogisticsQuickStart() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Rocket className="w-5 h-5 text-cyan-400" /> Logistics Quick Start
          </h1>
          <p className="text-sm text-slate-500 mt-1">Everything a dispatcher needs to run the day — in order.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5 hover:bg-slate-700"
        >
          <Printer className="w-4 h-4" /> Print / PDF
        </button>
      </div>

      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-cyan-300 mb-1">Welcome, Terry 👋</h2>
        <p className="text-sm text-slate-300">
          This guide walks through the seven core workflows you'll use every day, in the order you'll use them.
          Follow the steps under each section, then click the button to jump straight into that part of the app.
        </p>
      </div>

      <div className="space-y-5">
        {workflows.map((w) => {
          const Icon = w.icon;
          return (
            <section key={w.title} className="bg-slate-900 border border-slate-800 rounded-xl p-5 break-inside-avoid">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-cyan-400">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-slate-100">{w.title}</h2>
                  <p className="text-sm text-slate-500">{w.subtitle}</p>
                </div>
              </div>
              <ol className="space-y-2 mb-4">
                {w.steps.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-300">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 text-[11px] font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <Link
                to={w.route}
                className="print:hidden inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300 hover:text-cyan-200"
              >
                {w.cta} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </section>
          );
        })}
      </div>

      <section className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-5 break-inside-avoid">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Pro tips for your first week
        </h2>
        <ul className="space-y-2">
          {tips.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-300">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs text-slate-600 mt-6">
        GForceSI Ops Control · Logistics Quick Start · {new Date().getFullYear()}
      </p>
    </div>
  );
}