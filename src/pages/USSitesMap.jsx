import React from "react";
import { Link } from "react-router-dom";
import { MapPin, FolderKanban, Plus } from "lucide-react";
import USSitesByProjectMap from "@/components/operations/USSitesByProjectMap";

export default function USSitesMap() {
  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#F97316]" />
            Real-Time United States Sites by Project
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Live 50-state view (CONUS + Alaska + Hawaii) color-coded by project with real-time scan status, 3D twin links, and field crews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/projects"
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#0D1C33] border border-[#1E3A5F] text-slate-200 hover:border-[#4A9EFF] flex items-center gap-1.5"
          >
            <FolderKanban className="w-3.5 h-3.5 text-[#4A9EFF]" /> Manage Projects
          </Link>
          <Link
            to="/sites"
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#F97316] hover:bg-[#FB923C] text-white flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add / Import Sites
          </Link>
        </div>
      </div>

      <USSitesByProjectMap />
    </div>
  );
}
