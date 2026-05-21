// Komponen helper berbentuk baris
function MetricRow({ icon, label, value, highlight = false }: { icon: React.ReactNode, label: string, value: number | string | undefined, highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-3 text-slate-300">
        <span className={highlight ? "text-[#E59500]" : "text-slate-500"}>{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center justify-center min-w-[3.5rem] px-2.5 py-1 bg-[#02040F] border border-slate-700/50 rounded-md">
        <span className={`font-mono text-sm font-bold ${highlight ? "text-[#E59500]" : "text-white"}`}>
          {value?.toLocaleString('id-ID') || '0'}
        </span>
      </div>
    </div>
  );
}

// Komponen helper berbentuk kotak
function MetricBox({ label, value }: { label: string, value: number | string | undefined }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors text-center">
      <span className="text-xs text-slate-400 font-medium mb-2">{label}</span>
      <div className="px-4 py-1.5 bg-[#02040F] border border-slate-700/50 rounded-md w-full">
        <span className="font-mono text-lg font-bold text-white">
          {value?.toLocaleString('id-ID') || '0'}
        </span>
      </div>
    </div>
  );
}

export { MetricRow, MetricBox };