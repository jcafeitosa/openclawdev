import React from "react";

interface ProAgentHeaderProps {
  name: string;
  status: "online" | "busy" | "offline";
}

export function ProAgentHeader({ name, status }: ProAgentHeaderProps) {
  return (
    <div className="h-[80px] border-b border-white/5 bg-black/20 backdrop-blur-3xl flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white shadow-xl shadow-blue-500/20">
            {name[0].toUpperCase()}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#0A0A0A] ${
              status === "online" ? "bg-emerald-500" : "bg-amber-500"
            }`}
          ></div>
        </div>
        <div>
          <div className="text-white font-black tracking-tight leading-none mb-1 text-lg">
            {name}
          </div>
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-blue-500"></span>
            Neural Engine Active • Latency 24ms
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </button>
        <button className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </button>
        <div className="h-6 w-px bg-white/10 mx-2"></div>
        <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 transition-all">
          Configurar
        </button>
      </div>
    </div>
  );
}
