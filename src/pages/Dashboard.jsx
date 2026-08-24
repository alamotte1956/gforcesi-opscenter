import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import OperationsMap from "@/components/operations/OperationsMap";
import { Filter, Radio, MapPin, Users, Activity, X, Navigation2 } from "lucide-react";

const statusStyles = {
  available: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  en_route: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  on_site: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  off_duty: "text-slate-500 bg-slate-500/10 border-slate-500/20",
};

const statusBg = {
  available: "bg-emerald-400",
  en_route: "bg-blue-400",
  on_site: "bg-amber-400",
  off_duty: "bg-slate-500",
};

export default function Dashboard() {
  const [employees, setEmployees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = async () => {
    const [emps, jbs] = await Promise.all([
      base44.entities.Contractor.list(),
      base44.entities.Job.list(),
    ]);
    setEmployees(emps);
    setJobs(jbs);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Contractor.subscribe(() => load());
    return unsub;
  }, []);

  const filteredEmployees = useMemo(
    () => (statusFilter === "all" ? employees : employees.filter((e) => e.current_status === statusFilter)),
    [employees, statusFilter]
  );

  const stats = useMemo(() => {
    const onDuty = employees.filter((e) => e.shift_status === "on_duty").length;
    const activeJobs = jobs.filter((j) => ["en_route", "on_site", "scanning", "processing"].includes(j.status)).length;
    const scheduled = jobs.filter((j) => j.status === "scheduled").length;
    const completed = jobs.filter((j) => ["complete", "invoiced"].includes(j.status)).length;
    return { onDuty, activeJobs, scheduled, completed };
  }, [employees, jobs]);

  return (
    <div className="flex flex-col h-screen">
      {/* Stat bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-950 border-b border-slate-800">
        <StatCard icon={Users} label="On Duty" value={stats.onDuty} accent="text-emerald-400" />
        <StatCard icon={Activity} label="Active Jobs" value={stats.activeJobs} accent="text-amber-400" />
        <StatCard icon={MapPin} label="Scheduled" value={stats.scheduled} accent="text-blue-400" />
        <StatCard icon={Radio} label="Completed" value={stats.completed} accent="text-cyan-400" />
      </div>

      <div className="flex flex-1 flex-col lg:flex-row min-h-0">
        {/* Map */}
        <div className="relative flex-1 min-h-[400px] lg:min-h-0">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" />
            </div>
          ) : (
            <OperationsMap
              employees={filteredEmployees}
              jobs={jobs}
              selectedEmployeeId={selectedEmployee?.id}
              onSelectEmployee={setSelectedEmployee}
              onSelectJob={setSelectedJob}
            />
          )}
          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[500] bg-slate-900/90 backdrop-blur border border-slate-700 rounded-lg p-3 text-xs space-y-1.5">
            <div className="text-slate-400 font-medium mb-1">Field Employees</div>
            {[
              ["available", "Available"],
              ["en_route", "En Route"],
              ["on_site", "On Site"],
              ["off_duty", "Off Duty"],
            ].map(([k, label]) => (
              <div key={k} className="flex items-center gap-2 text-slate-300">
                <span className={`w-2.5 h-2.5 rounded-full ${statusBg[k]}`} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-full lg:w-80 shrink-0 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col max-h-[50vh] lg:max-h-none">
          <div className="p-3 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-2 text-slate-300 text-sm font-medium">
              <Filter className="w-4 h-4" /> Filter by status
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["all", "available", "en_route", "on_site", "off_duty"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-xs capitalize transition-colors ${
                    statusFilter === s
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "bg-slate-800 text-slate-400 border border-transparent hover:text-slate-200"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {selectedEmployee && (
              <DetailCard title={selectedEmployee.name} subtitle={selectedEmployee.role} onClose={() => setSelectedEmployee(null)}>
                <DetailRow label="Status" value={selectedEmployee.current_status} />
                <DetailRow label="Shift" value={selectedEmployee.shift_status} />
                {selectedEmployee.current_job_title && <DetailRow label="Current job" value={selectedEmployee.current_job_title} />}
                {selectedEmployee.eta_minutes > 0 && <DetailRow label="ETA" value={`${selectedEmployee.eta_minutes} min`} />}
                <DetailRow label="Phone" value={selectedEmployee.phone || "—"} />
                <DetailRow label="Skills" value={(selectedEmployee.skills || []).join(", ") || "—"} />
                {selectedEmployee.current_latitude && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedEmployee.current_latitude},${selectedEmployee.current_longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-cyan-400 text-xs hover:underline"
                  >
                    <Navigation2 className="w-3.5 h-3.5" /> Open in Google Maps
                  </a>
                )}
              </DetailCard>
            )}
            {selectedJob && (
              <DetailCard title={selectedJob.title} subtitle={selectedJob.site_address} onClose={() => setSelectedJob(null)}>
                <DetailRow label="Status" value={selectedJob.status} />
                <DetailRow label="Priority" value={selectedJob.priority} />
                <DetailRow label="Project" value={selectedJob.project_name} />
                <DetailRow label="Team" value={(selectedJob.assigned_contractor_names || []).join(", ") || "Unassigned"} />
                <DetailRow label="Equipment" value={(selectedJob.required_equipment || []).join(", ") || "—"} />
              </DetailCard>
            )}

            <div className="text-xs text-slate-500 font-medium pt-1">Active Field Team</div>
            {filteredEmployees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => setSelectedEmployee(emp)}
                className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-center gap-3 ${
                  selectedEmployee?.id === emp.id
                    ? "bg-slate-800 border-cyan-500/30"
                    : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800"
                }`}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold">
                    {emp.name?.charAt(0)}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                      statusBg[emp.current_status] || "bg-slate-500"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-200 truncate">{emp.name}</div>
                  <div className="text-xs text-slate-500 truncate">{emp.current_job_title || emp.role}</div>
                </div>
                {emp.location_sharing && <Radio className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            ))}
            {!loading && filteredEmployees.length === 0 && (
              <div className="text-center text-slate-500 text-sm py-8">No employees match this filter.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-semibold leading-none">{value}</div>
        <div className="text-xs text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  );
}

function DetailCard({ title, subtitle, onClose, children }) {
  return (
    <div className="bg-slate-800 border border-cyan-500/20 rounded-lg p-3 space-y-1.5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="font-medium text-slate-100 text-sm truncate">{title}</div>
          <div className="text-xs text-slate-500 truncate">{subtitle}</div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="pt-1 space-y-1">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-slate-500 capitalize">{label}</span>
      <span className="text-slate-300 text-right capitalize">{value || "—"}</span>
    </div>
  );
}