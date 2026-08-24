import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Loader2 } from "lucide-react";

export default function GuideDownload({ label = "User Guide", className = "" }) {
  const [loading, setLoading] = useState(false);
  const download = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("generateUserGuide", {});
      const bin = atob(res.data.pdf);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const blob = new Blob([u8], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.data.filename || "GForceSI-guide.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Couldn't generate the guide. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <button onClick={download} disabled={loading} className={`flex items-center gap-1.5 ${className}`}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      <span>{label}</span>
    </button>
  );
}