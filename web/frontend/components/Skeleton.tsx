/** Skeleton berbentuk Baris (Untuk Scrap & Generate) */
function MetricRowSkeleton({ highlight = false }: { highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl animate-pulse">
      <div className="flex items-center gap-3">
        {/* Placeholder Ikon */}
        <div className={`w-4 h-4 rounded-full ${highlight ? "bg-[#E59500]/20" : "bg-slate-700/50"}`}></div>
        {/* Placeholder Teks Label */}
        <div className="h-4 w-28 bg-slate-700/50 rounded-md"></div>
      </div>
      {/* Placeholder Kotak Angka */}
      <div className={`min-w-[3.5rem] h-6 rounded-md ${highlight ? "bg-[#E59500]/10 border border-[#E59500]/20" : "bg-slate-700/50"}`}></div>
    </div>
  );
}

/** Skeleton berbentuk Kotak (Untuk Cluster) */
function MetricBoxSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-xl animate-pulse text-center">
      {/* Placeholder Teks Label Atas */}
      <div className="h-3 w-16 bg-slate-700/50 rounded-md mb-2.5"></div>
      {/* Placeholder Kotak Angka Besar */}
      <div className="w-full h-9 bg-slate-700/50 rounded-md"></div>
    </div>
  );
}

export { MetricRowSkeleton, MetricBoxSkeleton };