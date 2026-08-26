import React from "react";
import { Sparkles } from "lucide-react";
import BillingReviewerChat from "@/components/agents/BillingReviewerChat";

export default function BillingReview() {
  return (
    <div className="p-4 lg:p-6 flex flex-col h-full">
      <div className="mb-4">
        <h1 className="text-xl font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-cyan-400" /> Billing Review Assistant</h1>
        <p className="text-sm text-slate-500">Review invoice details and get plain-language explanations of billing items or expense entries.</p>
      </div>
      <div className="flex-1 min-h-0">
        <BillingReviewerChat />
      </div>
    </div>
  );
}