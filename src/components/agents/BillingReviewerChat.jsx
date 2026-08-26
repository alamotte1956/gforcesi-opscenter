import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Loader2, Sparkles, Plus, Receipt } from "lucide-react";
import MessageBubble from "@/components/agents/MessageBubble";

const AGENT = "billing_reviewer";

export default function BillingReviewerChat() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const convRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.agents.listConversations({ agent_name: AGENT });
        setConversations(list);
        if (list.length) setActiveId(list[0].id);
      } catch {}
      setLoadingList(false);
    })();
  }, []);

  useEffect(() => {
    if (!activeId) { setMessages([]); convRef.current = null; return; }
    let unsub;
    (async () => {
      try {
        const conv = await base44.agents.getConversation(activeId);
        convRef.current = conv;
        setMessages(conv.messages || []);
      } catch {}
      unsub = base44.agents.subscribeToConversation(activeId, (data) => setMessages(data.messages || []));
    })();
    return () => { if (unsub) unsub(); };
  }, [activeId]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  const startNew = async () => {
    const conv = await base44.agents.createConversation({ agent_name: AGENT, metadata: { name: "Billing review" } });
    convRef.current = conv;
    setConversations((c) => [conv, ...c]);
    setActiveId(conv.id);
    setMessages([]);
  };

  const send = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    const text = input.trim();
    setInput("");
    try {
      let conv = convRef.current;
      if (!conv) {
        conv = await base44.agents.createConversation({ agent_name: AGENT, metadata: { name: "Billing review" } });
        convRef.current = conv;
        setConversations((c) => [conv, ...c]);
        setActiveId(conv.id);
      }
      await base44.agents.addMessage(conv, { role: "user", content: text });
    } catch (e) {
      setInput(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)]">
      {/* Conversation list */}
      <div className="w-56 shrink-0 hidden md:flex flex-col bg-slate-900 border border-slate-800 rounded-xl">
        <button onClick={startNew} className="m-2 px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-cyan-400">
          <Plus className="w-4 h-4" /> New review
        </button>
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {loadingList ? (
            <div className="text-center text-xs text-slate-500 py-6">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-xs text-slate-600 py-6">No conversations yet.</div>
          ) : conversations.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate ${activeId === c.id ? "bg-slate-800 text-slate-100" : "text-slate-400 hover:bg-slate-800/60"}`}>
              {c.metadata?.name || "Billing review"}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl min-w-0">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-slate-950" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Billing Review Assistant</div>
            <div className="text-[11px] text-slate-500">Ask about invoices, line items, or expenses</div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-3">
              <Receipt className="w-10 h-10 text-slate-700" />
              <div className="text-sm max-w-xs">Ask things like "Explain invoice INV-1042" or "Why is my expense for Acme still pending?"</div>
            </div>
          ) : messages.map((m) => <MessageBubble key={m.id} message={m} />)}
        </div>

        <div className="p-3 border-t border-slate-800">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Ask about an invoice or expense…"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-cyan-500 max-h-32"
            />
            <button onClick={send} disabled={busy || !input.trim()} className="px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}