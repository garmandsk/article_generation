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

function PieChartSkeleton() {
  return (
    <div className="h-full w-full flex flex-col">

      {/* Donat */}
      <div className="flex-grow flex items-center justify-center">
        <div className="relative w-110 h-110">
          {/* Lingkaran luar */}
          <div className="absolute inset-0 bg-slate-800 rounded-full animate-pulse"></div>
          {/* Lingkaran dalam (efek bolong donut) */}
          <div className="absolute inset-25  bg-slate-900 rounded-full"></div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-6">
        <div className="h-2 bg-slate-800 rounded w-12 animate-pulse"></div>
        <div className="h-2 bg-slate-800 rounded w-12 animate-pulse"></div>
        <div className="h-2 bg-slate-800 rounded w-12 animate-pulse"></div>
      </div>
    </div>
  )
}

function BarChartSkeleton() {
  return (
  <div className="h-full w-full flex-grow flex flex-col justify-between py-2">

    <div className="flex items-center gap-4">
      <div className="h-3 bg-slate-800 rounded w-20 shrink-0 animate-pulse"></div>
      <div className="h-5 bg-slate-800 rounded w-full animate-pulse"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 bg-slate-800 rounded w-20 shrink-0 animate-pulse"></div>
      <div className="h-5 bg-slate-800 rounded w-[85%] animate-pulse"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 bg-slate-800 rounded w-20 shrink-0 animate-pulse"></div>
      <div className="h-5 bg-slate-800 rounded w-[70%] animate-pulse"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 bg-slate-800 rounded w-20 shrink-0 animate-pulse"></div>
      <div className="h-5 bg-slate-800 rounded w-[60%] animate-pulse"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 bg-slate-800 rounded w-20 shrink-0 animate-pulse"></div>
      <div className="h-5 bg-slate-800 rounded w-[45%] animate-pulse"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 bg-slate-800 rounded w-20 shrink-0 animate-pulse"></div>
      <div className="h-5 bg-slate-800 rounded w-[45%] animate-pulse"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 bg-slate-800 rounded w-20 shrink-0 animate-pulse"></div>
      <div className="h-5 bg-slate-800 rounded w-[45%] animate-pulse"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 bg-slate-800 rounded w-20 shrink-0 animate-pulse"></div>
      <div className="h-5 bg-slate-800 rounded w-[45%] animate-pulse"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 bg-slate-800 rounded w-20 shrink-0 animate-pulse"></div>
      <div className="h-5 bg-slate-800 rounded w-[45%] animate-pulse"></div>
    </div>
    <div className="flex items-center gap-4">
      <div className="h-3 bg-slate-800 rounded w-20 shrink-0 animate-pulse"></div>
      <div className="h-5 bg-slate-800 rounded w-[45%] animate-pulse"></div>
    </div>

  </div>
  );
}

export { MetricRowSkeleton, MetricBoxSkeleton, PieChartSkeleton, BarChartSkeleton };