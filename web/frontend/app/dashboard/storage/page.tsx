"use client";

import { useEffect, useState } from "react";
import { 
  Archive, Search, Filter, Clock, FileText, 
  ChevronDown, Database, LayoutGrid
} from "lucide-react";
import { EditableTitleBox } from "@/components/editableTitleBox";
import { EditableContentBox } from "@/components/EditableContentBox";
import { sysLog } from "@/utils/logger";
import { ArticleData } from "@/types/types";

const STATUS_STYLES: Record<string, string> = {
  "slug_only": "bg-slate-500/10 text-slate-400 border-slate-500/20",
  "vectorized": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "clustered": "bg-[#E59500]/10 text-[#E59500] border-[#E59500]/20",
  "generated": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "outlier_cluster": "bg-red-500/10 text-red-400 border-red-500/20"
};

export default function StoragePage() {
  // State Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [limit, setLimit] = useState("5");

  // State debounce
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // State Data & Loadingw
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // Tunggu 500 ms setelah ketikan terakhir

    // Cleanup function: jika ada pengetikkan lagi sebelum 500ms, batalkan timer sebelumnya
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pemanggilan data
  useEffect(() => {
    const fetchArticles = async () => {
      setIsLoading(true);

      try {
        const queryParams = new URLSearchParams({
          search: debouncedSearch,
          type: filterType,
          sort: sortOrder,
          limit: limit
        });

        console.log("qParams", queryParams);

        const dataArticlesAPI = `http://localhost:8000/api/v1/data/articles?${queryParams.toString()}`;
        const response = await fetch(dataArticlesAPI, {
          method: "GET",
          credentials: "include"
        });

        if (!response.ok) throw new Error("Gagal mengambil data dari server");

        const result = await response.json();
        setArticles(result.data);

        console.log("result", result)

        // Otomatis select artikel pertama jika ada artikel
        if (result.data.length > 0) {
          const isSelectedStillExist = result.data.some((a: ArticleData) => a.id === selectedArticleId)
          if (!isSelectedStillExist) setSelectedArticleId(result.data[0].id);
        } else {
          setSelectedArticleId(null);
        }
      } catch (error) {
        sysLog("error", "Gagal memuat daftar storage artikel.", "0");
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Jalankan fetch setiap salah satu dari 4 variabel/komponen ini berubah
    fetchArticles();
  }, [debouncedSearch, filterType, sortOrder, limit]);
  
  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 relative pb-10">

      {/* ================= HEADER STICKY ================= */}
      <div className="sticky top-0 z-10 bg-[#002642]/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl text-cyan-400 bg-cyan-500/10 border border-blue-500/20 shadow-inner">
            <Archive size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Article Storage</h2>
            <p className="text-sm text-slate-400 mt-1">Kelola, cari, dan tinjau kembali artikel yang telah disimpan di database.</p>
          </div>
        </div>
      </div>

      {/* ================= SPLIT LAYOUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative h-[calc(100vh-180px)]">
        
        {/* PANEL KIRI: CONFIGURE & LIST (col-span-5) */}
        <div className="lg:col-span-5 bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-xl flex flex-col h-full min-h-[600px]">
          
          <div className="flex items-center gap-2 mb-5 border-b border-slate-700/50 pb-3 shrink-0">
            <Database size={18} className="text-slate-400" />
            <h3 className="text-base font-semibold text-white">Repository</h3>
          </div>

          {/* 1. Baris Filter (Type, Sort, Limit) */}
          <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</label>
              <div className="relative">
                <select 
                  value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-[#02040F] border border-slate-700 text-slate-300 text-xs rounded-lg p-2.5 outline-none appearance-none cursor-pointer hover:border-slate-500 transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="slug_only">Slug Only</option>
                  <option value="vectorized">Vectorize/Scraped</option>
                  <option value="clustered">Clustered</option>
                  <option value="outlier_cluster">Outlier Clustered</option>
                  <option value="generated">Generated</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sort</label>
              <div className="relative">
                <select 
                  value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full bg-[#02040F] border border-slate-700 text-slate-300 text-xs rounded-lg p-2.5 outline-none appearance-none cursor-pointer hover:border-slate-500 transition-colors"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="az">A - Z</option>
                  <option value="za">Z - A</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Limit</label>
              <div className="relative">
                <select 
                  value={limit} onChange={(e) => setLimit(e.target.value)}
                  className="w-full bg-[#02040F] border border-slate-700 text-slate-300 text-xs rounded-lg p-2.5 outline-none appearance-none cursor-pointer hover:border-slate-500 transition-colors"
                >
                  <option value="5">5 Items</option>
                  <option value="10">10 Items</option>
                  <option value="25">25 Items</option>
                  <option value="50">50 Items</option>
                  <option value="all">All Data</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 2. Search Bar */}
          <div className="relative mb-5 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <Search size={16} />
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan judul atau konten..." 
              className="w-full bg-[#02040F] border border-slate-700 text-slate-200 pl-10 pr-4 py-3 text-sm rounded-xl focus:border-[#E59500] outline-none transition-colors placeholder:text-slate-600 shadow-inner"
            />
          </div>

          {/* 3. Daftar Artikel (Scrollable) */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 min-h-0">
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest block mb-2">Article List ({articles.length})</span>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <div className="w-6 h-6 border-2 border-slate-700 border-t-[#E59500] rounded-full animate-spin"></div>
                <span className="text-xs text-slate-500 animate-pulse">Memuat data...</span>
              </div>
            ) : articles.length > 0 ? (
              /* TAMPILKAN DAFTAR ARTIKEL JIKA ADA */
              articles.map((article) => (
                <div 
                  key={article.id}
                  onClick={() => setSelectedArticleId(article.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                    selectedArticleId === article.id 
                      ? "bg-[#E59500]/10 border-[#E59500]/50 shadow-[0_0_15px_rgba(229,149,0,0.1)]" 
                      : "bg-[#02040F] border-slate-800 hover:border-slate-600 hover:bg-slate-800/30"
                  }`}
                >
                  <h4 className={`text-sm font-bold line-clamp-2 mb-2 ${selectedArticleId === article.id ? "text-[#E59500]" : "text-slate-200 group-hover:text-blue-400"}`}>
                    {article.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {article.content.replace(/#|\*|>/g, '')}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/50">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Clock size={12} /> {article.date}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      STATUS_STYLES[article.type] || "bg-slate-500/10 text-slate-400 border-slate-500/20"
                    }`}>
                      {article.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              /* TAMPILKAN EMPTY STATE JIKA KOSONG */
              <div className="flex flex-col items-center justify-center text-slate-500 py-10 opacity-60">
                <Filter size={32} className="mb-2" />
                <p className="text-sm">Tidak ada artikel yang sesuai kriteria.</p>
              </div>
            )}
          </div>
        </div>

        {/* PANEL KANAN: VIEWER (col-span-7) */}
        <div className="lg:col-span-7 flex flex-col h-full">
          {selectedArticle ? (
            <div className="animate-in slide-in-from-right-4 duration-500 flex flex-col h-full gap-4">
              
              {/* Box Judul */}
              <div className="bg-[#002642]/60 p-5 rounded-2xl border border-blue-500/20 shadow-xl shrink-0">
                <EditableTitleBox
                  initialTitle={selectedArticle.title}
                  titleText="Title Article" 
                />
              </div>

              {/* Box Konten (Menggunakan EditableContentBox) */}
              <div className="flex-1 min-h-0 shadow-xl rounded-2xl">
                <EditableContentBox 
                  initialContent={selectedArticle.content}
                  titleText="Content Article"
                />
              </div>

            </div>
          ) : (
            // Empty State Panel Kanan
            <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-60">
              <LayoutGrid size={48} strokeWidth={1} />
              <p className="text-sm">Pilih artikel dari daftar di sebelah kiri untuk melihat detail.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}