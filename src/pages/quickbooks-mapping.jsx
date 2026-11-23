import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Layers, RefreshCw, Save, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const EXPENSE_CATEGORIES = [
  { key: "labor", label: "Field Labor & 1099 Technicians" },
  { key: "equipment", label: "Matterport Pro3 / LiDAR Equipment" },
  { key: "materials", label: "Scanning Supplies & Materials" },
  { key: "travel", label: "CONUS / AK / HI Airfare, Lodging & Mileage" },
  { key: "software", label: "Matterport / SaaS Subscriptions" },
  { key: "other", label: "General & Administrative" },
];

export default function QuickBooksMapping() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [mappings, setMappings] = useState({});
  const [existingRecords, setExistingRecords] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const records = await base44.entities.QuickBooksAccountMapping.list().catch(() => []);
      setExistingRecords(records || []);
      const map = {};
      (records || []).forEach((r) => {
        map[r.expense_category] = {
          quickbooks_account_id: r.quickbooks_account_id || "",
          quickbooks_account_name: r.quickbooks_account_name || "",
          quickbooks_account_type: r.quickbooks_account_type || "Expense",
        };
      });
      setMappings(map);
    } finally {
      setLoading(false);
    }
  };

  const fetchQboAccounts = async () => {
    setFetchingAccounts(true);
    try {
      const res = await base44.functions.invoke("fetchChartOfAccounts", {});
      if (res?.data?.error) throw new Error(res.data.error);
      const list = res?.data?.accounts || [];
      setAccounts(list);
      toast({ title: "Chart of Accounts loaded", description: `${list.length} expense/COGS accounts retrieved from QuickBooks.` });
    } catch (e) {
      toast({ title: "Could not fetch QuickBooks accounts", description: e?.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setFetchingAccounts(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSelect = (categoryKey, accountId) => {
    const acc = accounts.find((a) => String(a.id) === String(accountId));
    setMappings((prev) => ({
      ...prev,
      [categoryKey]: {
        quickbooks_account_id: accountId,
        quickbooks_account_name: acc?.name || prev[categoryKey]?.quickbooks_account_name || "",
        quickbooks_account_type: acc?.type || "Expense",
      },
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const cat of EXPENSE_CATEGORIES) {
        const current = mappings[cat.key];
        if (!current?.quickbooks_account_id) continue;
        const existing = existingRecords.find((r) => r.expense_category === cat.key);
        const payload = {
          expense_category: cat.key,
          quickbooks_account_id: String(current.quickbooks_account_id),
          quickbooks_account_name: current.quickbooks_account_name || cat.label,
          quickbooks_account_type: current.quickbooks_account_type || "Expense",
          is_active: true,
        };
        if (existing) await base44.entities.QuickBooksAccountMapping.update(existing.id, payload);
        else await base44.entities.QuickBooksAccountMapping.create(payload);
      }
      toast({ title: "Account mappings saved", description: "Future QuickBooks expense pushes will route to these accounts." });
      await load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-[#4A9EFF] animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/finance" className="text-xs text-[#4A9EFF] hover:underline inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Financials
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#4A9EFF]" /> QuickBooks Chart of Accounts Mapping
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Map G-Force SI expense categories to your exact QuickBooks Online GL accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchQboAccounts}
            disabled={fetchingAccounts}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center gap-1.5"
          >
            {fetchingAccounts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Load QBO Accounts
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[#126DFA] hover:bg-[#105CE0] text-xs font-semibold text-white flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Mappings
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-slate-900 border border-slate-800 divide-y divide-slate-800">
        {EXPENSE_CATEGORIES.map((cat) => {
          const val = mappings[cat.key] || {};
          return (
            <div key={cat.key} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  {cat.label}
                  {val.quickbooks_account_id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-xs text-slate-500">Category key: <code className="text-slate-400">{cat.key}</code></div>
              </div>
              <div className="flex items-center gap-2 min-w-[280px]">
                {accounts.length > 0 ? (
                  <select
                    value={val.quickbooks_account_id || ""}
                    onChange={(e) => handleSelect(cat.key, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="">-- Select QBO Account --</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={val.quickbooks_account_id || ""}
                    onChange={(e) => handleSelect(cat.key, e.target.value)}
                    placeholder={val.quickbooks_account_name ? `${val.quickbooks_account_name} (ID: ${val.quickbooks_account_id})` : "Enter QBO Account ID or click Load QBO Accounts"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
