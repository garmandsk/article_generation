"use client";

import { useState, useEffect } from "react";
import { 
  Pickaxe, Database, FileText, Server, Network, 
  Sparkles, LayoutGrid, FileBox, RefreshCw, PieChartIcon, 
  BarChartHorizontalIcon, ArrowUpDown, Home, 
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from "recharts";
import { sysLog } from "@/utils/logger"; 
import { DashboardStats, DashboardAnalytics } from "@/types/types";
import { MetricRow, MetricBox } from "@/components/Box";
import { MetricRowSkeleton, MetricBoxSkeleton, PieChartSkeleton, BarChartSkeleton } from "@/components/Skeleton";

const STATUS_COLORS: Record<string, string> = {
  "slug_only": "#64748b",      // Slate (Abu-abu) untuk data mentah
  "vectorized": "#3b82f6",     // Blue
  "clustered": "#E59500",      // Gold (Tahap akhir yang paling berharga)
  "generated": "#a855f7",      // Purple
  "outlier_cluster": "#ef4444" // Red (Untuk data yang terbuang)
};

export default function DashboardHome() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardAnalytics | null>(null);
  const [topicSort, setTopicSort] = useState<"desc" | "asc">("desc");

  const fetchDashboardStats = async () => {
    const exec_time: string | null = "0";
    sysLog("info", "Meminta data stats terbaru dari server...", exec_time);

    try {
      const dataStatsAPI = "http://localhost:8000/api/v1/data/stats"
      const response = await fetch(dataStatsAPI, {
        method: "GET",
        credentials: "include"
      })

      const result = await response.json();
      console.log("result", result);

      if (result.status_code != 200) throw new Error(result.message || result.detail);
      
      const data: DashboardStats = result.data;
      setStats(data)
      sysLog("success", result.message, result.exec_time);
    } catch (error) {
      sysLog("error", `Gagal mengambil data stats dari server: ${error}`, exec_time);
    } 
  };


  const fetchDashboardAnalytics = async (currentSort: "desc" | "asc" = "desc") => {
    const exec_time: string | null = "0";
    sysLog("info", "Meminta data analytics terbaru dari server...", exec_time);

    try {
      const dataAnalyticsAPI = `http://localhost:8000/api/v1/data/analytics?topic_sort=${currentSort}`;
      const response = await fetch(dataAnalyticsAPI, {
        method: "GET",
        credentials: "include"
      })

      const result = await response.json();
      if (result.status_code != 200) throw new Error(result.message || result.detail);

      const data: DashboardAnalytics = result.data;
      setCharts(data);
      sysLog("success", result.message, result.exec_time);
    } catch (error) {
      sysLog("error", `Gagal mengambil data analytics dari server: ${error}`, exec_time);
    }
  }

  const handleToggleSort = () => {
    const newSortMode = topicSort === "desc" ? "asc" : "desc";
    setTopicSort(newSortMode);
    fetchDashboardAnalytics(newSortMode);
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      await Promise.all([
        fetchDashboardStats(),
        fetchDashboardAnalytics()
      ]);

      setIsLoading(false)
    }
    fetchData();
  }, []);


  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 relative">
      
      {/* HEADER */}
      <div className="bg-[#002642]/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-gray-400 border border-blue-500/20">
            <Home size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">System Overview</h2>
            <p className="text-sm text-slate-400 mt-1">Status pipeline data keseluruhan.</p>
          </div>
        </div>

          <button 
            onClick={fetchData}
            disabled={isLoading}
            className="flex gap-2 ml-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-slate-700/50 rounded-lg text-slate-300 transition-all disabled:opacity-50 z-10"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-[#E59500]" : ""} />
            <span>{isLoading ? "Syncing..." : "Refresh Data"}</span>
          </button>

      </div>

      {/* Stats Data */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative">
        
        {/* ================= CARD 1: SCRAP ================= */}
        <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 hover:border-[#E59500]/40 transition-all duration-300 rounded-2xl p-6 shadow-xl flex flex-col">

          {/* Header Card ... */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Pickaxe size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Scrap</h3>
          </div>
          
          {/* Stats */}
          <div className="flex-1 flex flex-col justify-evenly">
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
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/50 relative">
            <div className="p-2 bg-[#E59500]/10 rounded-lg text-[#E59500]">
              <Network size={24} />
            </div>
            <h3 className="text-xl font-bold text-white">Cluster</h3>
          </div>
          
          {/* Menggunakan Grid 2 Kolom untuk Cluster */}
          <div className="grid grid-cols-2 gap-4 flex-1 relative">
            {isLoading ? (
              // Tampilkan 4 Skeleton Box
              <> <MetricBoxSkeleton /> <MetricBoxSkeleton /> <MetricBoxSkeleton /> <MetricBoxSkeleton /> <MetricBoxSkeleton /> <MetricBoxSkeleton />
              </>
            ) : (
              // Tampilkan Data Asli
              <>
                <MetricBox label="Clus. Article" value={stats?.cluster.total_data_article_clustered} />
                <MetricBox label="Out. Article" value={stats?.cluster.total_data_article_outlier} />
                <MetricBox label="Val. Topic" value={stats?.cluster.total_data_topic} />
                <MetricBox label="Rec. Topic" value={stats?.cluster.total_data_rec_topic} />
                <MetricBox label="Val. Keyword" value={stats?.cluster.total_data_keyword} />
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
          
          <div className="flex-1 flex flex-col justify-evenly">
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

      {/* == Analytics Data */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 bg-slate-950 min-h-screen text-slate-100 relative">
        
        {/* ================= CARD 1: Pie Chart ================= */}
        <div className=" bg-[#0A0E1A]/80 backdrop-blur-md border  border-slate-700/50 hover:border-[#E59500]/40 transition-all duration-300 p-6 rounded-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-2 pb-4 border-b border-slate-700/50">
            <div className="p-2 rounded-lg text-cyan-400 bg-cyan-500/10">
              <PieChartIcon size={24} />
            </div>
            <h3 className="text-lg font-semibold">Article Status</h3>
          </div>
          <p className="text-xs text-slate-400 mb-6">Proporsi data di dalam pipeline state machine</p>
          
          {/* Lingkaran donut */}
          <div className="h-80 w-full flex flex-1 items-center justify-center">
            {isLoading ? (
                <PieChartSkeleton /> 
              )
              : (
                <ResponsiveContainer className="" width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts?.pie_data}
                      cx="50%"
                      cy="45%"
                      innerRadius={75} 
                      outerRadius={"80%"}
                      paddingAngle={0.5}
                      dataKey="value"
                    >
                      {charts?.pie_data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#8884d8"} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                    />
    
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )
            }
          </div>
        </div>
  
        {/* ================= CARD 2: HORIZONTAL BAR CHART ================= */}
        <div className="bg-[#0A0E1A]/80 backdrop-blur-md border  border-slate-700/50 hover:border-[#E59500]/40 transition-all duration-300 p-6 rounded-2xl flex flex-col justify-between">

          {/* Header */}
          <div className="flex items-center gap-3 mb-2 pb-4 border-b border-slate-700/50">
            <div className="p-2 rounded-lg text-emerald-400 bg-emerald-500/10">
              <BarChartHorizontalIcon size={24} />
            </div>
            <h3 className="text-lg font-semibold">Top 10 Topics</h3>

            <button
              onClick={handleToggleSort}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
            >
              <ArrowUpDown size={14} className={topicSort === "asc" ? "rotate-180 transition-transform" : "transition-transform"} />
              <span>Sort: {topicSort === "desc" ? "Desc" : "Asc"}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-6">Klaster topik AI yang berhasil diekstraksi oleh BERTopic</p>

          <div className="h-80 w-full flex flex-1 items-center justify-center">
            {isLoading ? (
              <BarChartSkeleton />
            )
            :
            (
              <ResponsiveContainer className="" width="100%" height="100%">
                <BarChart
                  data={charts?.bar_data}
                  layout="vertical"
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  
                  {/* Sumbu X bertipe angka, Sumbu Y bertipe kategori nama topik */}
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                  <YAxis 
                    type="category" 
                    dataKey="topic" 
                    stroke="#94a3b8" 
                    fontSize={10}
                    width={100}
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value} // Potong teks jika terlalu panjang di sumbu Y
                  />
                  
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", color: "#f8fafc" }}
                    cursor={{ fill: "rgba(51, 65, 85, 0.3)" }}
                  />
                  
                  {/* Batang Grafik dengan sudut melengkung border-radius (radius=[0, 4, 4, 0]) */}
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={16}>
                    {charts?.bar_data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#60a5fa" : "#3b82f6"} /> // Beri warna lebih terang khusus peringkat #1
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div> 
      </div>
    </div>
  );
}