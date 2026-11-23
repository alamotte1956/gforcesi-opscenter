import React from "react";

/**
 * Executive G-Force SI vector emblem in Signature Cobalt Blue (#126DFA / #4A9EFF)
 * and Energy Orange (#F97316 / #FF6B1A).
 */
export function GForceLogo({ size = 36, showWordmark = true, subtitle = "50-State 3D Digital Twins" }) {
  return (
    <div className="inline-flex items-center gap-3 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="G-Force SI 3D LiDAR Emblem"
        className="shrink-0 drop-shadow-[0_0_12px_rgba(18,109,250,0.45)]"
      >
        <defs>
          <linearGradient id="gfBlue" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4A9EFF" />
            <stop offset="100%" stopColor="#126DFA" />
          </linearGradient>
          <linearGradient id="gfOrange" x1="16" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8A3D" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="14" fill="#0D1C33" stroke="url(#gfBlue)" strokeWidth="2.5" />
        {/* Isometric 3D LiDAR Cube */}
        <polygon points="32,12 50,22 32,32 14,22" fill="url(#gfBlue)" fillOpacity="0.28" stroke="#4A9EFF" strokeWidth="2" strokeLinejoin="round" />
        <polygon points="14,22 32,32 32,52 14,42" fill="#126DFA" fillOpacity="0.45" stroke="#4A9EFF" strokeWidth="1.8" strokeLinejoin="round" />
        <polygon points="50,22 32,32 32,52 50,42" fill="url(#gfOrange)" fillOpacity="0.88" stroke="#FF8A3D" strokeWidth="1.8" strokeLinejoin="round" />
        {/* Laser scan crosshair */}
        <circle cx="32" cy="32" r="4" fill="#FFFFFF" />
        <circle cx="32" cy="32" r="7.5" stroke="#F97316" strokeWidth="1.5" strokeDasharray="2.5 2.5" />
      </svg>
      {showWordmark && (
        <div className="leading-tight">
          <div className="font-extrabold tracking-tight text-white text-base flex items-center gap-1">
            <span>G-FORCE</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF8A3D] to-[#F97316]">SI</span>
          </div>
          {subtitle && (
            <div className="text-[10px] font-medium uppercase tracking-widest text-[#4A9EFF]">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * High-precision 50-state (CONUS + Alaska + Hawaii) Orange & Blue Spatial Coverage Graphic
 */
export function SpatialUSAMapGraphic() {
  const hubs = [
    { x: 165, y: 92, label: "SEA", name: "Seattle" },
    { x: 155, y: 185, label: "LAX", name: "Los Angeles" },
    { x: 280, y: 165, label: "DEN", name: "Denver" },
    { x: 350, y: 235, label: "DFW", name: "Dallas" },
    { x: 420, y: 145, label: "ORD", name: "Chicago" },
    { x: 470, y: 215, label: "ATL", name: "Atlanta" },
    { x: 525, y: 140, label: "NYC", name: "New York" },
    { x: 500, y: 270, label: "MIA", name: "Miami" },
  ];

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-[#0B1930] via-[#0F2342] to-[#091426] border border-[#1E3A5F] p-5 overflow-hidden shadow-2xl">
      {/* Subtle Orange + Blue ambient glow */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#F97316]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#126DFA]/20 blur-3xl" />

      <div className="relative flex items-center justify-between mb-3">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F97316]/15 border border-[#F97316]/40 text-[#FF8A3D] text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
            All 50 U.S. States · Live LiDAR Network
          </span>
          <h3 className="text-sm font-bold text-white mt-1.5">
            Contiguous US (CONUS) + Alaska (AK) + Hawaii (HI) Dispatch Grid
          </h3>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs font-mono text-[#4A9EFF] font-semibold">PRO3 · E57 · PME</div>
          <div className="text-[11px] text-slate-400">24–48h SLA Guaranteed</div>
        </div>
      </div>

      <svg
        viewBox="0 0 640 340"
        className="relative w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="G-Force SI 50-state spatial capture map covering the Contiguous United States, Alaska, and Hawaii"
      >
        <defs>
          <pattern id="spatialGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1E3A5F" strokeWidth="0.6" strokeOpacity="0.55" />
          </pattern>
          <linearGradient id="flightArc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="50%" stopColor="#4A9EFF" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
          <linearGradient id="conusFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#126DFA" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#0E346E" stopOpacity="0.45" />
          </linearGradient>
          <filter id="orangeGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="640" height="340" rx="12" fill="url(#spatialGrid)" />

        {/* Stylized CONUS Polygon */}
        <path
          d="M148,78 L215,74 L305,76 L390,82 L455,95 L505,88 L552,102 L560,126 L536,158 L512,196 L516,258 L496,282 L474,254 L432,246 L385,260 L356,286 L328,255 L268,244 L196,232 L152,202 L134,148 Z"
          fill="url(#conusFill)"
          stroke="#4A9EFF"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Inter-hub Cobalt Blue Routing Mesh */}
        <g stroke="#4A9EFF" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="4 4">
          <line x1="165" y1="92" x2="280" y2="165" />
          <line x1="155" y1="185" x2="280" y2="165" />
          <line x1="280" y1="165" x2="350" y2="235" />
          <line x1="280" y1="165" x2="420" y2="145" />
          <line x1="350" y1="235" x2="470" y2="215" />
          <line x1="420" y1="145" x2="525" y2="140" />
          <line x1="470" y1="215" x2="525" y2="140" />
          <line x1="470" y1="215" x2="500" y2="270" />
        </g>

        {/* Alaska Inset Card */}
        <g transform="translate(18, 224)">
          <rect width="128" height="98" rx="10" fill="#0B1B34" stroke="#F97316" strokeOpacity="0.55" strokeWidth="1.4" />
          <text x="10" y="18" fill="#FF8A3D" fontSize="10" fontWeight="700" fontFamily="monospace">ALASKA (AK)</text>
          <path
            d="M28,44 L54,32 L86,38 L104,54 L92,72 L70,68 L52,82 L30,70 L20,58 Z"
            fill="#126DFA"
            fillOpacity="0.35"
            stroke="#4A9EFF"
            strokeWidth="1.4"
          />
          <circle cx="64" cy="54" r="4.5" fill="#F97316" filter="url(#orangeGlow)" />
          <text x="73" y="57" fill="#FFFFFF" fontSize="9" fontWeight="600">ANC</text>
          <text x="10" y="90" fill="#94A3B8" fontSize="8.5">Bundled Flight Dispatch</text>
        </g>

        {/* Hawaii Inset Card */}
        <g transform="translate(158, 248)">
          <rect width="128" height="74" rx="10" fill="#0B1B34" stroke="#F97316" strokeOpacity="0.55" strokeWidth="1.4" />
          <text x="10" y="18" fill="#FF8A3D" fontSize="10" fontWeight="700" fontFamily="monospace">HAWAII (HI)</text>
          <circle cx="34" cy="40" r="4" fill="#4A9EFF" />
          <circle cx="52" cy="44" r="5" fill="#F97316" filter="url(#orangeGlow)" />
          <circle cx="72" cy="48" r="4.5" fill="#4A9EFF" />
          <circle cx="94" cy="54" r="6" fill="#126DFA" stroke="#4A9EFF" strokeWidth="1" />
          <text x="61" y="38" fill="#FFFFFF" fontSize="9" fontWeight="600">HNL</text>
          <text x="10" y="67" fill="#94A3B8" fontSize="8.5">Inter-Island Pro3 Teams</text>
        </g>

        {/* Flight Logistics Arcs to AK & HI */}
        <path d="M165,92 Q85,155 82,276" fill="none" stroke="url(#flightArc)" strokeWidth="1.8" strokeDasharray="5 4" />
        <path d="M155,185 Q185,225 210,290" fill="none" stroke="url(#flightArc)" strokeWidth="1.8" strokeDasharray="5 4" />

        {/* CONUS Hubs */}
        {hubs.map((h) => (
          <g key={h.label}>
            <circle cx={h.x} cy={h.y} r="9" fill="#F97316" fillOpacity="0.18" />
            <circle cx={h.x} cy={h.y} r="4.2" fill="#F97316" stroke="#FFFFFF" strokeWidth="1.2" filter="url(#orangeGlow)" />
            <text x={h.x + 8} y={h.y + 3} fill="#E2E8F0" fontSize="9.5" fontWeight="700" fontFamily="monospace">
              {h.label}
            </text>
          </g>
        ))}

        {/* Legend Pill */}
        <g transform="translate(458, 294)">
          <rect width="166" height="32" rx="8" fill="#0A1628" fillOpacity="0.9" stroke="#1E3A5F" />
          <circle cx="14" cy="16" r="4" fill="#F97316" />
          <text x="24" y="19" fill="#E2E8F0" fontSize="9.5" fontWeight="600">Active Capture Hub</text>
        </g>
      </svg>
    </div>
  );
}
