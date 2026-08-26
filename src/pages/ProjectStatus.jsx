import React from "react";
import { FolderKanban } from "lucide-react";
import ProjectStatusChat from "@/components/agents/ProjectStatusChat";

export default function ProjectStatus() {
  return (
    <div className="p-4 lg:p-6 flex flex-col h-full">
      <div className="mb-4">
        <h1 className="text-xl font-semibold flex items-center gap-2"><FolderKanban className="w-5 h-5 text-cyan-400" /> Project Status Assistant</h1>
        <p className="text-sm text-slate-500">Check the current status of any project and view its job completion timelines.</p>
      </div>
      <div className="flex-1 min-h-0">
        <ProjectStatusChat />
      </div>
    </div>
  );
}