import React, { useEffect, useState, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Mail, MessageSquare, Search, Clock, Trash2 } from "lucide-react";

export default function Messages() {
  const [me, setMe] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [clients, setClients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const bottomRef = useRef(null);

  const load = async () => {
    const [user, cons, cls, msgs] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.Contractor.list(),
      base44.entities.Client.list(),
      base44.entities.Message.list("created_date"),
    ]);
    setMe(user);
    setContractors(cons);
    setClients(cls);
    setMessages(msgs);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Message.subscribe(() => load());
    return unsub;
  }, []);

  const matched = contractors.find((c) => c.email && me?.email && c.email.toLowerCase() === me.email.toLowerCase());
  const myId = matched?.id || me?.id;
  const myName = matched?.name || me?.full_name || me?.email || "Me";
  const isAdmin = me?.role === "admin";

  const deleteMsg = async (id) => {
    try {
      await base44.entities.Message.delete(id);
      load();
    } catch (e) {}
  };

  const partners = useMemo(() => {
    const cons = contractors.filter((c) => c.id !== myId).map((c) => ({ id: c.id, name: c.name, role: c.role, type: "crew" }));
    const cls = clients.map((c) => ({ id: c.id, name: c.name, role: "Client", type: "client" }));
    return [...cons, ...cls].filter((p) => p.name?.toLowerCase().includes(query.toLowerCase()));
  }, [contractors, clients, myId, query]);
  const selectedPartner = partners.find((p) => p.id === selected);

  const thread = useMemo(() => {
    return messages
      .filter((m) =>
        (m.sender_id === myId && m.recipient_id === selected) ||
        (m.sender_id === selected && m.recipient_id === myId)
      )
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [messages, myId, selected]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.length]);

  const unreadFrom = (cid) => messages.filter((m) => m.sender_id === cid && m.recipient_id === myId && !m.read).length;
  const lastMsg = (cid) => {
    const t = messages.filter((m) =>
      (m.sender_id === myId && m.recipient_id === cid) || (m.sender_id === cid && m.recipient_id === myId)
    ).sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    return t;
  };

  const selectPartner = (cid) => {
    setSelected(cid);
    messages.filter((m) => m.sender_id === cid && m.recipient_id === myId && !m.read)
      .forEach((m) => base44.entities.Message.update(m.id, { read: true }));
  };

  const send = async (alsoEmail) => {
    if (!text.trim() || !selected) return;
    setSending(true);
    const partner = [...contractors, ...clients].find((p) => p.id === selected);
    const payload = {
      sender_id: myId,
      sender_name: myName,
      recipient_id: selected,
      recipient_name: partner?.name,
      body: text.trim(),
      channel: alsoEmail ? "email" : "app",
      read: false,
    };
    await base44.entities.Message.create(payload);
    if (alsoEmail) {
      try {
        await base44.functions.invoke("sendTeamEmail", { recipient_id: selected, body: text.trim(), sender_name: myName });
      } catch (e) {}
    }
    setText("");
    setSending(false);
    load();
  };

  const fmtTime = (d) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 lg:p-6 h-screen lg:h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-semibold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-cyan-400" /> Team Messages</h1>
        <p className="text-sm text-slate-500">Message your crew and clients in-app, or send a copy to their email.</p>
      </div>

      <div className="flex-1 flex gap-4 min-h-0 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        {/* Directory */}
        <div className="w-64 shrink-0 border-r border-slate-800 flex flex-col">
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search team…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {partners.map((p) => {
              const unread = unreadFrom(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => selectPartner(p.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-800/60 text-left hover:bg-slate-800/40 ${selected === p.id ? "bg-slate-800/60" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${p.type === "client" ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-700 text-slate-200"}`}>{p.name?.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-200 truncate">{p.name}</div>
                    <div className="text-xs text-slate-500 truncate capitalize">{p.role?.replace("_", " ")}</div>
                  </div>
                  {unread > 0 && <span className="bg-cyan-500 text-slate-950 text-[10px] font-bold rounded-full px-1.5 py-0.5">{unread}</span>}
                </button>
              );
            })}
            {partners.length === 0 && <div className="text-center text-xs text-slate-600 py-6">No contacts found</div>}
          </div>
        </div>

        {/* Thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <MessageSquare className="w-10 h-10 mb-3 text-slate-700" />
              <div className="text-sm">Select a team member to start messaging</div>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${selectedPartner?.type === "client" ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-700 text-slate-200"}`}>
                  {selectedPartner?.name?.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{selectedPartner?.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{selectedPartner?.role?.replace("_", " ")}</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {thread.map((m) => {
                  const mine = m.sender_id === myId;
                  return (
                    <div key={m.id} className={`group flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-xl px-3 py-2 ${mine ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
                        <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                        <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "text-slate-700" : "text-slate-500"}`}>
                          {m.channel === "email" && <Mail className="w-3 h-3" />}
                          {fmtTime(m.created_date)}
                        </div>
                      </div>
                      {(mine || isAdmin) && (
                        <button onClick={() => deleteMsg(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-500 hover:text-rose-400" title="Delete message">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
                {thread.length === 0 && <div className="text-center text-sm text-slate-600 py-8">No messages yet. Say hello 👋</div>}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-slate-800">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(false); } }}
                  rows={2}
                  placeholder="Type a message…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  {selectedPartner?.type !== "client" && (
                    <button onClick={() => send(true)} disabled={sending || !text.trim()} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5 hover:bg-slate-700 disabled:opacity-50">
                      <Mail className="w-4 h-4" /> Send & Email
                    </button>
                  )}
                  <button onClick={() => send(false)} disabled={sending || !text.trim()} className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-medium text-sm flex items-center gap-1.5 hover:bg-cyan-400 disabled:opacity-50">
                    {sending ? "…" : <><Send className="w-4 h-4" /> Send</>}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}