"use client";

import { useState, useEffect } from "react";
import { 
  Pickaxe, Database, FileText, Server, Network, BrainCircuit, 
  Sparkles, LayoutGrid, FileBox, RefreshCw 
} from "lucide-react";
import { sysLog } from "@/utils/logger"; 
import { DashboardStats } from "@/types/types";
import { MetricRow, MetricBox } from "@/components/Box";
import { MetricRowSkeleton, MetricBoxSkeleton } from "@/components/Skeleton";

export default function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    sysLog("info", "Meminta data statistik terbaru dari server...");

    try {
      const dataStatsAPI = "http://localhost:8000/api/v1/data/stats"
      const response = await fetch(dataStatsAPI, {
        method: "GET",
        credentials: "include"
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const response_json = await response.json();
      const data: DashboardStats = response_json.data;
      setStats(data)
      sysLog("success", "Berhasil menyinkronkan data dashboard dari Backend.");
    } catch (error) {
      sysLog("error", "Gagal mengambil data dari server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 relative">
      
      {/* HEADER */}
      <div className="bg-[#002642]/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">System Overview</h2>
          <p className="text-sm text-slate-400 mt-1">Status pipeline data keseluruhan.</p>
        </div>
        
        <button 
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-slate-700/50 rounded-lg text-slate-300 transition-all disabled:opacity-50 z-10"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin text-[#E59500]" : ""} />
          <span>{isLoading ? "Syncing..." : "Refresh Data"}</span>
        </button>
      </div>

      {/* Grid 3 Kolom Utama */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative z-10">
        
        {/* ================= CARD 1: SCRAP ================= */}
        <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 hover:border-[#E59500]/40 transition-all duration-300 rounded-2xl p-6 shadow-xl flex flex-col">
          {/* Header Card ... */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Pickaxe size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Scrap</h3>
          </div>
          
          <div className="space-y-4 flex-1">
            {isLoading ? (
              // Tampilkan 3 Skeleton Row
              <> <MetricRowSkeleton /> <MetricRowSkeleton /> <MetricRowSkeleton /> </>
            ) : (
              // Tampilkan Data Asli
              <>
                <MetricRow icon={<FileText size={16} />} label="List Article" value={stats?.scrap.total_data_list} />
                <MetricRow icon={<FileBox size={16} />} label="Content Article" value={stats?.scrap.total_data_content} />
                <MetricRow icon={<Server size={16} />} label="Database" value={stats?.scrap.total_data_db} />
              </>
            )}
          </div>
        </div>

        {/* ================= CARD 2: CLUSTER ================= */}
        <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 hover:border-[#E59500]/40 transition-all duration-300 rounded-2xl p-6 shadow-xl flex flex-col relative overflow-hidden">
          {/* Efek Glow Tipis ... */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E59500]/5 blur-[60px] rounded-full pointer-events-none" />

          {/* Header Card ... */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50 relative z-10">
            <div className="p-2 bg-[#E59500]/10 rounded-lg text-[#E59500]">
              <Network size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Cluster</h3>
          </div>
          
          {/* Menggunakan Grid 2 Kolom untuk Cluster */}
          <div className="grid grid-cols-2 gap-4 flex-1 relative z-10">
            {isLoading ? (
              // Tampilkan 4 Skeleton Box
              <> <MetricBoxSkeleton /> <MetricBoxSkeleton /> <MetricBoxSkeleton /> <MetricBoxSkeleton /> </>
            ) : (
              // Tampilkan Data Asli
              <>
                <MetricBox label="Topic" value={stats?.cluster.total_data_topic} />
                <MetricBox label="Rec. Topic" value={stats?.cluster.total_data_rec_topic} />
                <MetricBox label="Keyword" value={stats?.cluster.total_data_keyword} />
                <MetricBox label="Rec. Keyword" value={stats?.cluster.total_data_rec_keyword} />
              </>
            )}
          </div>
        </div>

        {/* ================= CARD 3: GENERATE ================= */}
        <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 hover:border-[#E59500]/40 transition-all duration-300 rounded-2xl p-6 shadow-xl flex flex-col">
          {/* Header Card ... */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <Sparkles size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Generate</h3>
          </div>
          
          <div className="space-y-4 flex-1">
            {isLoading ? (
              // Tampilkan 3 Skeleton Row
              <> <MetricRowSkeleton highlight /> <MetricRowSkeleton /> <MetricRowSkeleton /> </>
            ) : (
              // Tampilkan Data Asli
              <>
                <MetricRow icon={<Database size={16} />} label="Generated" value={stats?.generate.total_data_generate} highlight />
                <MetricRow icon={<FileText size={16} />} label="Lorem ipsum" value="lorem" />
                <MetricRow icon={<LayoutGrid size={16} />} label="Lorem ipsum" value="lorem" />
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}