import { useEffect, useRef } from "react";
import { Network, Pickaxe, Sparkles } from "lucide-react";

interface TerminalMonitorProps {
  action: string;
  progress: number;
  logs: string[];
}

export default function TerminalMonitor({ action, progress, logs }: TerminalMonitorProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 py-10">
      {/* Animasi Spinner */}
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-800 border-t-[#E59500] rounded-full animate-spin"></div>
        {action === "scrap" && (
          <Pickaxe
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#E59500]"
            size={24}
          />
        )}
        {action === "cluster" && (
          <Network
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#E59500]"
            size={24}
          />
        )}
        {action === "generate" && (
          <Sparkles
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#E59500]"
            size={24}
          />
        )}
      </div>

      {/* Progress Bar Dinamis */}
      <div className="w-full bg-slate-800 rounded-full h-2 mb-2 border border-slate-700/50 overflow-hidden shadow-inner">
        <div
          className="bg-linear-to-r from-amber-500 to-[#E59500] h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-xs font-semibold text-[#E59500] uppercase tracking-wider">
        {progress}% Selesai
      </p>

      {/* Terminal Mini (Log Stream) */}
      <div className="w-full bg-[#0A0E1A] border border-slate-700/50 rounded-xl p-4 py-0 h-48 overflow-y-auto flex flex-col gap-1.5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
        <div className="sticky top-0 bg-[#0A0E1A] py-2 mb-2 border-b border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-mono uppercase">
          <span>Backend Execution Log</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live
          </span>
        </div>

        {/* Looping teks log */}
        {logs.map((log, idx) => (
          <div key={idx} className="font-mono text-xs text-emerald-400 wrap-break-words flex gap-3">
            <span className="text-slate-600 shrink-0">
              [{new Date().toLocaleTimeString("id-ID", { hour12: false })}]
            </span>
            <span>{log}</span>
          </div>
        ))}

        {/* Efek kursor berkedip */}
        <div className="font-mono text-xs text-slate-500 flex gap-3">
          <span className="shrink-0">
            [{new Date().toLocaleTimeString("id-ID", { hour12: false })}]
          </span>
          <span className="w-2 h-3 bg-slate-500 animate-pulse"></span>
        </div>

        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  );
}
