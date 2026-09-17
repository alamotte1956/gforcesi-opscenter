import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, MapPin, Clock, Phone, Navigation2, Search, Archive } from "lucide-react";
import FormModal from "@/components/FormModal";
import BulkCsvUpload from "@/components/BulkCsvUpload";
import CrudActions from "@/components/CrudActions";
import { useToast } from "@/components/ui/use-toast";

const inputClass = "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500";

export default function Sites() {
  const [sites, setSites] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();
  const isAdmin = me?.role === "admin";

  const load = async () => {
    const [s, j, c, user] = await Promise.all([
      base44.entities.Site.list(),
      base44.entities.Job.list(),
      base44.entities.Client.list(),
      base44.auth.me().catch(() => null),
    ]);
    setSites(s);
    setJobs(j);
    setClients(c);
    setMe(user);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const jobCountBySite = useMemo(() => {
    const map = {};
    jobs.forEach((j) => { if (j.site_address) map[j.site_address] = (map[j.site_address] || 0) + 1; });
    return map;
  }, [jobs]);

  const filtered = useMemo(
    () => sites.filter((s) =>
      (showArchived ? s.archived : !s.archived) &&
      (!search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.toLowerCase().includes(search.toLowerCase()) ||
      s.client_name?.toLowerCase().includes(search.toLowerCase()))
    ),
    [sites, search, showArchived]
  );

  const submit = async () => {
    if (!form.name || !form.address) {
      toast({ title: "Required fields", description: "Name and address are required.", variant: "destructive" });
      return;
    }
    const client = clients.find((c) => c.id === form.client_id);
    const payload = {
      ...form,
      client_name: client?.name || "",
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
    };
    await base44.entities.Site.create(payload);
    toast({ title: "Site created", description: form.name });
    setShowForm(false);
    setForm(emptyForm());
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Sites</h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">{sites.length} locations · {filtered.length} shown</p>
            <button onClick={() => setShowArchived((v) => !v)} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${showArchived ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"}`}>
              <Archive className="w-4 h-4" /> {showArchived ? "Showing archived" : "Show archived"}
            </button>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <BulkCsvUpload
              entityName="Site"
              ctx={{ clients }}
              onImported={load}
              templateColumns={[
                { key: "name", label: "name", example: "North Campus Building A", required: true },
                { key: "address", label: "address", example: "123 Main St, Minneapolis, MN", required: true },
                { key: "latitude", label: "latitude", example: "44.9778" },
                { key: "longitude", label: "longitude", example: "-93.2650" },
                { key: "client_name", label: "client_name", example: "Acme Corp" },
                { key: "opening_time", label: "opening_time", example: "07:00" },
                { key: "closing_time", label: "closing_time", example: "18:00" },
                { key: "contact_name", label: "contact_name", example: "Jane Doe" },
                { key: "contact_phone", label: "contact_phone", example: "555-0100" },
                { key: "access_notes", label: "access_notes", example: "Gate code 1234" },
                { key: "notes", label: "notes", example: "" },
              ]}
              transform={(r, ctx) => {
                if (!r.name || !r.address) return null;
                const client = (ctx.clients || []).find((c) => c.name.toLowerCase() === (r.client_name || "").toLowerCase());
                return {
                  name: r.name,
                  address: r.address,
                  latitude: r.latitude ? Number(r.latitude) : undefined,
                  longitude: r.longitude ? Number(r.longitude) : undefined,
                  client_id: client?.id || undefined,
                  client_name: r.client_name || client?.name || undefined,
                  opening_time: r.opening_time || undefined,
                  closing_time: r.closing_time || undefined,
                  contact_name: r.contact_name || undefined,
                  contact_phone: r.contact_phone || undefined,
                  access_notes: r.access_notes || undefined,
                  notes: r.notes || undefined,
                };
              }}
            />
            <button onClick={() => { setForm(emptyForm()); setShowForm(true); }} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400">
              <Plus className="w-4 h-4" /> Add Site
            </button>
          </div>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sites, addresses, clients…" className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
          <MapPin className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <div className="text-sm text-slate-400">No sites found.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-3 min-w-0 lg:w-60">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-200 truncate">{s.name}</div>
                  {s.client_name && <div className="text-xs text-cyan-400/80 truncate">{s.client_name}</div>}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1.5 text-sm text-slate-400">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-500" />
                  <span className="truncate">{s.address || "—"}</span>
                </div>
                {s.access_notes && <div className="text-xs text-slate-500 mt-1 truncate ml-5">{s.access_notes}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 shrink-0">
                {(s.opening_time || s.closing_time) && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.opening_time || "—"} – {s.closing_time || "—"}</span>
                )}
                {s.contact_phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.contact_phone}</span>
                )}
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{jobCountBySite[s.address] || 0} jobs</span>
                {s.latitude && s.longitude && (
                  <a href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-cyan-400 hover:underline">
                    <Navigation2 className="w-3.5 h-3.5" /> Maps
                  </a>
                )}
                {isAdmin && <CrudActions entityName="Site" record={s} label={s.name} onSaved={load} fields={siteFields} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <FormModal title="Add Site" onClose={() => setShowForm(false)} onSubmit={submit} submitLabel="Create Site">
          <Field label="Site Name *">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. North Campus Building A" />
          </Field>
          <Field label="Address *">
            <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input className={inputClass} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="44.9778" />
            </Field>
            <Field label="Longitude">
              <input className={inputClass} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="-93.2650" />
            </Field>
          </div>
          <Field label="Client">
            <select className={inputClass} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">—</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opening Time">
              <input className={inputClass} value={form.opening_time} onChange={(e) => setForm({ ...form, opening_time: e.target.value })} placeholder="07:00" />
            </Field>
            <Field label="Closing Time">
              <input className={inputClass} value={form.closing_time} onChange={(e) => setForm({ ...form, closing_time: e.target.value })} placeholder="18:00" />
            </Field>
          </div>
          <Field label="Site Contact">
            <input className={inputClass} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="On-site contact name" />
          </Field>
          <Field label="Contact Phone">
            <input className={inputClass} value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="Phone number" />
          </Field>
          <Field label="Access Notes">
            <textarea className={inputClass} rows={2} value={form.access_notes} onChange={(e) => setForm({ ...form, access_notes: e.target.value })} placeholder="Gate codes, parking, check-in instructions…" />
          </Field>
        </FormModal>
      )}
    </div>
  );
}

const siteFields = [
  { key: "name", label: "Site name", type: "text" },
  { key: "address", label: "Address", type: "text" },
  { key: "latitude", label: "Latitude", type: "number" },
  { key: "longitude", label: "Longitude", type: "number" },
  { key: "opening_time", label: "Opening time", type: "time" },
  { key: "closing_time", label: "Closing time", type: "time" },
  { key: "contact_name", label: "Site contact", type: "text" },
  { key: "contact_phone", label: "Contact phone", type: "text" },
  { key: "access_notes", label: "Access notes", type: "textarea" },
  { key: "notes", label: "Notes", type: "textarea" },
];

function emptyForm() {
  return { name: "", address: "", latitude: "", longitude: "", client_id: "", opening_time: "", closing_time: "", contact_name: "", contact_phone: "", access_notes: "", notes: "" };
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}