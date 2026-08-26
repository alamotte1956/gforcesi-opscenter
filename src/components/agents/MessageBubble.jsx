import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, XCircle } from "lucide-react";

const statusMap = {
  pending: { icon: Loader2, text: "Queued", cls: "text-slate-400", spin: true },
  running: { icon: Loader2, text: "Running", cls: "text-cyan-400", spin: true },
  in_progress: { icon: Loader2, text: "Working", cls: "text-cyan-400", spin: true },
  completed: { icon: CheckCircle2, text: "Done", cls: "text-emerald-400" },
  success: { icon: CheckCircle2, text: "Done", cls: "text-emerald-400" },
  failed: { icon: XCircle, text: "Failed", cls: "text-rose-400" },
  error: { icon: XCircle, text: "Error", cls: "text-rose-400" },
};

function pretty(v) {
  if (v == null) return "";
  if (typeof v === "string") { try { return JSON.stringify(JSON.parse(v), null, 2); } catch { return v; } }
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}

function ToolCall({ toolCall }) {
  const [open, setOpen] = useState(false);
  const proj = toolCall.display_projection || {};
  const hide = proj.hide_details && proj.details_redacted;
  const status = toolCall.status || "pending";
  const s = statusMap[status] || statusMap.pending;
  const Icon = s.icon;
  const failed = status === "failed" || status === "error";
  let parsed = toolCall.results;
  try { parsed = typeof toolCall.results === "string" ? JSON.parse(toolCall.results) : toolCall.results; } catch {}
  let args = toolCall.arguments_string;
  try { args = JSON.parse(toolCall.arguments_string); } catch {}
  const hiddenLabel = hide ? (failed ? proj.error_label : (["pending", "running", "in_progress"].includes(status) ? proj.active_label : proj.label)) : null;
  return (
    <div className="mt-2 text-xs border-t border-slate-700/50 pt-1.5">
      <button onClick={() => !hide && setOpen(!open)} disabled={hide} className="flex items-center gap-1.5 w-full text-left">
        <Icon className={`w-3.5 h-3.5 ${s.spin ? "animate-spin" : ""} ${s.cls}`} />
        <span className="font-medium text-slate-200">{toolCall.name}</span>
        {!hide && (open ? <ChevronDown className="w-3 h-3 ml-auto text-slate-500" /> : <ChevronRight className="w-3 h-3 ml-auto text-slate-500" />)}
      </button>
      {hide ? (
        <div className={`mt-0.5 ${failed ? "text-rose-400" : "text-slate-400"}`}>{hiddenLabel}</div>
      ) : open ? (
        <div className="mt-1.5 space-y-1">
          <div className="text-slate-500">Parameters</div>
          <pre className="bg-slate-900 rounded p-1.5 overflow-x-auto text-[10px]">{pretty(args)}</pre>
          <div className="text-slate-500">Result</div>
          <pre className={`bg-slate-900 rounded p-1.5 overflow-x-auto text-[10px] ${failed ? "text-rose-300" : ""}`}>{pretty(parsed)}</pre>
        </div>
      ) : null}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${isUser ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-100"}`}>
        {message.content && (isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <ReactMarkdown className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">{message.content}</ReactMarkdown>
        ))}
        {message.tool_calls?.map((tc, i) => <ToolCall key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}