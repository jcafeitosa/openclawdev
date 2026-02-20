import { useStore } from "@nanostores/react";
import React from "react";
import { $activeSession, $sessions } from "../../stores/app";

export function ProSidebar() {
  const activeSession = useStore($activeSession);
  const sessions = useStore($sessions);

  return (
    <div className="w-[280px] h-full bg-[#080808] border-r border-white/5 flex flex-col overflow-hidden">
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20">
            O
          </div>
          <span className="text-sm font-black text-white uppercase tracking-widest">
            OpenClaw Pro
          </span>
        </div>

        <button
          className="w-full py-3 px-4 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold text-xs hover:bg-white/[0.06] transition-all flex items-center justify-between group uppercase tracking-widest"
          onClick={() => window.dispatchEvent(new CustomEvent("chat:new-session"))}
        >
          <span>Nova Missão</span>
          <svg
            className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-1 chat-scrollable pb-10">
        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] px-3 mb-4 mt-2">
          Chronology
        </div>

        {sessions.map((session: any) => (
          <button
            key={session.id}
            className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all flex items-center gap-3 group relative overflow-hidden ${
              activeSession === session.id
                ? "bg-blue-600/10 text-blue-400"
                : "text-white/30 hover:bg-white/[0.02] hover:text-white/60"
            }`}
            onClick={() => $activeSession.set(session.id)}
          >
            {activeSession === session.id && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[4px_0_15px_rgba(59,130,246,0.5)]"></div>
            )}
            <div className="flex-1 truncate font-bold text-xs tracking-tight">
              {session.label || "Sessão Sem Nome"}
            </div>
            <div className="opacity-0 group-hover:opacity-20 transition-opacity">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className="p-6 border-t border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20"></div>
          <div className="flex-1 overflow-hidden">
            <div className="text-[10px] font-black text-white uppercase tracking-wider truncate">
              Julio Cezar
            </div>
            <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest truncate">
              Senior Engineer
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
