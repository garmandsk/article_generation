import { useEffect, useRef } from "react";
import { useLogStore } from "@/store/logStore";
import { Terminal, Trash2 } from "lucide-react"; 

export default function RightSidebar({ isOpen }: { isOpen: boolean }){
  const { logs, clearLogs } = useLogStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getLogsColor = (type: string) => {
    switch (type) {
      case "success": return "text-green-400";
      case "error": return "text-red-400";
      case "warning": return "text-yellow-400";
      default: return "text-slate-300" // info
    }
  };

  if (!isOpen) return null;
  
  return (
    <aside
      className={`${
        isOpen
        ? "w-80 my-5 opacity-100"
        : "w-0 m-0 opacity-0 overflow-hidden"  
      } transition-all duration-300 ease-in-out bg-[#002642]/80 backdrop-blue-xl border border-slate-700/50 rounded-2xl flex flex-col shadow-2xl relative z-20`}
    >
      {/* Header */}
      <div className={`h-15 px-4 border-b border-slate-700/50 flex items-center justify-between`}>
        <h3 className={`font-semibold text-white flex items-center gap-2`}>
          <Terminal size={18} className="text-[#E59500]"/>
          System Logs
        </h3>
        <button
          onClick={clearLogs}
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
          title="Clear Logs"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto font-mono p-4 text-xs space-y-1.5 bg-[#02040F]/50">
        {logs.length === 0 
        ? 
          (
            <div className="text-slate-600 italic">Waiting for events...</div>
          )
        : (
            logs.map((log) => (
              <div 
                key={log.id}
                className="flex gap-3 leading-relaxed animate-in fade-in duration-200"
              >
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span className={`${getLogsColor(log.type)} wrap-break-words`}>{log.message}</span>
              </div>
            ))
          )
        }
        <div ref={bottomRef} />
      </div>
    </aside>
  );
}