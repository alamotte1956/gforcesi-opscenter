import React, { useEffect, useState, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Mail, MessageSquare, Search, Clock } from "lucide-react";

export default function Messages() {
  const [me, setMe] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const bottomRef = useRef(null);

  const load = async () => {
    const [user, cons, msgs] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.Contractor.list(),
      base44.entities.Message.list("created_date"),
    ]);
    setMe(user);
    setContractors(cons);
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

  const directory = contractors.filter((c) => c.id !== myId && c.name?.toLowerCase().includes(query.toLowerCase()));

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
    const partner = contractors.find((c) => c.id === selected);
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
        <p className="text-sm text-slate-500">Coordinate with your crew in-app, or send a copy to their email.</p>
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
            {directory.map((c) => {
              const unread = unreadFrom(c.id);
              const last = lastMsg(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => selectPartner(c.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-800/60 text-left hover:bg-slate-800/40 ${selected === c.id ? "bg-slate-800/60" : ""}`}
                >
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold shrink-0">{c.name?.charAt(0)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-200 truncate">{c.name}</div>
                    <div className="text-xs text-slate-500 truncate capitalize">{c.role?.replace("_", " ")}</div>
                  </div>
                  {unread > 0 && <span className="bg-cyan-500 text-slate-950 text-[10px] font-bold rounded-full px-1.5 py-0.5">{unread}</span>}
                </button>
              );
            })}
            {directory.length === 0 && <div className="text-center text-xs text-slate-600 py-6">No team members</div>}
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
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold">
                  {contractors.find((c) => c.id === selected)?.name?.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{contractors.find((c) => c.id === selected)?.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{contractors.find((c) => c.id === selected)?.role?.replace("_", " ")}</div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {thread.map((m) => {
                  const mine = m.sender_id === myId;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-xl px-3 py-2 ${mine ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}>
                        <div className="text-sm whitespace-pre-wrap">{m.body}</div>
                        <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "text-slate-700" : "text-slate-500"}`}>
                          {m.channel === "email" && <Mail className="w-3 h-3" />}
                          {fmtTime(m.created_date)}
                        </div>
                      </div>
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
                  <button onClick={() => send(true)} disabled={sending || !text.trim()} className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-1.5 hover:bg-slate-700 disabled:opacity-50">
                    <Mail className="w-4 h-4" /> Send & Email
                  </button>
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