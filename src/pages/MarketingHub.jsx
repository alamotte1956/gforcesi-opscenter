import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Megaphone, Sparkles, Send, Calendar, CheckCircle2, AlertCircle,
  Loader2, BarChart3, Globe, RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const NETWORKS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "X (Twitter)" },
  { id: "youtube", label: "YouTube" },
  { id: "gmb", label: "Google Business" },
];

export default function MarketingHub() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metricoolConnected, setMetricoolConnected] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [composer, setComposer] = useState({
    text: "",
    networks: ["linkedin", "instagram"],
    publicationDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    mediaUrl: "",
    campaignTopic: "50-State Bank & Retail 3D Digital Twins (CONUS, Alaska & Hawaii)",
  });

  const loadMetricool = async () => {
    setLoading(true);
    try {
      const [statusRes, postsRes, analyticsRes, leadsList] = await Promise.all([
        base44.functions.invoke("syncMetricool", { action: "status" }).catch(() => ({ data: { configured: false } })),
        base44.functions.invoke("syncMetricool", { action: "getScheduledPosts" }).catch(() => ({ data: { posts: [] } })),
        base44.functions.invoke("syncMetricool", { action: "getAnalytics" }).catch(() => ({ data: null })),
        base44.entities.Lead.list("-created_date", 100).catch(() => []),
      ]);
      setMetricoolConnected(Boolean(statusRes?.data?.configured));
      setScheduledPosts(postsRes?.data?.posts || []);
      setAnalytics(analyticsRes?.data || null);
      setLeads(leadsList || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMetricool(); }, []);

  const toggleNetwork = (id) => {
    setComposer((prev) => ({
      ...prev,
      networks: prev.networks.includes(id)
        ? prev.networks.filter((n) => n !== id)
        : [...prev.networks, id],
    }));
  };

  const generateAiCopy = async () => {
    setGenerating(true);
    try {
      const prompt = `Write a crisp, high-converting B2B social media post for G-Force SI (GForcesi.com), a nationwide 50-state (CONUS, Alaska & Hawaii) Matterport Pro3 / LiDAR 3D digital twin capture partner for Fortune 500 enterprise clients (e.g. Bank of America) and Ad Agencies. Focus topic: "${composer.campaignTopic}". Include a strong CTA to request a multi-site SLA quote at GForcesi.com and 4 relevant hashtags. Keep under 140 words.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const text = typeof res === "string" ? res : res?.text || res?.output || "";
      if (text) {
        setComposer((prev) => ({ ...prev, text: text.trim() }));
        toast({ title: "AI Campaign Draft Ready", description: "Review and schedule to Metricool." });
      }
    } catch (e) {
      toast({ title: "AI Copywriter error", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const scheduleToMetricool = async (e) => {
    e.preventDefault();
    if (!composer.text.trim() || composer.networks.length === 0) {
      toast({ title: "Incomplete post", description: "Add post copy and select at least one social network.", variant: "destructive" });
      return;
    }
    setPublishing(true);
    try {
      const res = await base44.functions.invoke("syncMetricool", {
        action: "schedulePost",
        text: composer.text,
        networks: composer.networks,
        publicationDate: composer.publicationDate,
        mediaUrls: composer.mediaUrl ? [composer.mediaUrl] : [],
      });
      if (res?.data?.error) throw new Error(res.data.error);
      toast({
        title: "Scheduled via Metricool",
        description: `Queued across ${composer.networks.join(", ")}.`,
      });
      setComposer((prev) => ({ ...prev, text: "", mediaUrl: "" }));
      await loadMetricool();
    } catch (err) {
      toast({ title: "Metricool scheduling failed", description: err?.response?.data?.error || err.message, variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#4A9EFF]" />
            <h1 className="text-2xl font-bold text-white">Social Media Marketing &amp; Metricool Hub</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              metricoolConnected
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
            }`}>
              {metricoolConnected ? "Metricool API Live" : "Set Metricool Secrets"}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Plan, AI-draft, and publish multi-network campaigns for GForcesi.com through Metricool while tracking inbound enterprise RFP leads.
          </p>
        </div>
        <button
          onClick={loadMetricool}
          disabled={loading}
          className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-white flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh Metricool
        </button>
      </div>

      {!metricoolConnected && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/90 space-y-1">
            <div className="font-semibold text-amber-200">Connect Your Metricool Workspace</div>
            <p>
              Add <code className="text-cyan-300">METRICOOL_API_TOKEN</code>, <code className="text-cyan-300">METRICOOL_USER_ID</code>, and <code className="text-cyan-300">METRICOOL_BLOG_ID</code> in your Base44 App Secrets to publish directly to LinkedIn, Instagram, Facebook, X, YouTube, and Google Business Profile.
            </p>
          </div>
        </div>
      )}

      {/* Funnel + Metricool KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Metricool Scheduled Queue</div>
          <div className="text-2xl font-bold text-white mt-1">{scheduledPosts.length}</div>
          <div className="text-xs text-slate-500 mt-1">Upcoming social posts</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Inbound Sales Leads</div>
          <div className="text-2xl font-bold text-[#4A9EFF] mt-1">{leads.length}</div>
          <div className="text-xs text-slate-500 mt-1">From GForcesi.com &amp; campaigns</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Connected Channels</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{NETWORKS.length}</div>
          <div className="text-xs text-slate-500 mt-1">LinkedIn · IG · FB · X · YT · GBP</div>
        </div>
        <div className="rounded-xl bg-[#0D1C33] border border-slate-800 p-4">
          <div className="text-xs text-slate-400">Metricool Analytics</div>
          <div className="text-2xl font-bold text-white mt-1">
            {analytics?.totalImpressions?.toLocaleString?.() || (metricoolConnected ? "Synced" : "Pending")}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> 30-day brand reach
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Composer */}
        <form onSubmit={scheduleToMetricool} className="lg:col-span-3 rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Metricool Multi-Network Composer</h2>
            <button
              type="button"
              onClick={generateAiCopy}
              disabled={generating}
              className="px-3 py-1.5 rounded-lg bg-[#126DFA]/15 border border-[#126DFA]/40 text-[#4A9EFF] hover:bg-[#126DFA]/25 text-xs font-semibold flex items-center gap-1.5"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Draft with AI
            </button>
          </div>

          <div className="text-xs">
            <label className="block text-slate-400 mb-1">Campaign Angle / Showcase Topic</label>
            <input
              value={composer.campaignTopic}
              onChange={(e) => setComposer({ ...composer, campaignTopic: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="text-xs">
            <label className="block text-slate-400 mb-1.5">Target Social Channels</label>
            <div className="flex flex-wrap gap-2">
              {NETWORKS.map((n) => {
                const active = composer.networks.includes(n.id);
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => toggleNetwork(n.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                      active
                        ? "bg-[#126DFA] border-[#126DFA] text-white"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-400 mb-1">Post Copy</label>
            <textarea
              rows={5}
              value={composer.text}
              onChange={(e) => setComposer({ ...composer, text: e.target.value })}
              placeholder="Write your G-Force SI campaign post or click 'Draft with AI'..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Publish Date &amp; Time</label>
              <input
                type="datetime-local"
                value={composer.publicationDate}
                onChange={(e) => setComposer({ ...composer, publicationDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Media / 3D Thumbnail URL (optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={composer.mediaUrl}
                onChange={(e) => setComposer({ ...composer, mediaUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={publishing}
            className="w-full py-2.5 rounded-lg bg-[#126DFA] hover:bg-[#105CE0] disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-2"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Schedule Post via Metricool
          </button>
        </form>

        {/* Scheduled Queue & Recent Leads */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-[#4A9EFF]" /> Scheduled Metricool Queue
            </h3>
            {scheduledPosts.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No scheduled posts returned from Metricool yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {scheduledPosts.map((post, idx) => (
                  <div key={post.id || idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <div className="text-slate-200 line-clamp-2">{post.text || post.caption || "Scheduled post"}</div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>{post.publicationDate?.dateTime || post.date || "Scheduled"}</span>
                      <span className="text-emerald-400 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Queued</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-emerald-400" /> Latest Inbound RFP Leads
            </h3>
            {leads.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No leads captured yet.</p>
            ) : (
              <div className="space-y-2">
                {leads.slice(0, 5).map((l) => (
                  <div key={l.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <div className="font-medium text-white truncate">{l.company || l.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{l.email || l.source || "GForcesi.com"}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px] font-semibold uppercase">
                      {l.status || "new"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
