"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Archive,
  Search,
  Filter,
  Clock,
  ChevronDown,
  Database,
  LayoutGrid,
  Download,
  UploadCloud,
  Loader2,
  Trash2
} from "lucide-react";
import { EditableTitleBox } from "@/components/editableTitleBox";
import { EditableContentBox } from "@/components/EditableContentBox";
import ConfirmationModal from "@/components/ConfirmationModal";
import { sysLog } from "@/utils/logger";
import { ArticleData } from "@/types/types";
import { API_V1 } from "@/utils/api";

const STATUS_STYLES: Record<string, string> = {
  slug_only: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  vectorized: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  clustered: "bg-[#E59500]/10 text-[#E59500] border-[#E59500]/20",
  generated: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  outlier_cluster: "bg-red-500/10 text-red-400 border-red-500/20"
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

  // State Export & Import & Reset
  const [isResetting, setIsResetting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State modal confirm
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isExportConfirmOpen, setIsExportConfirmOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // Tunggu 500 ms setelah ketikan terakhir

    // Cleanup function: jika ada pengetikkan lagi sebelum 500ms, batalkan timer sebelumnya
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pemanggilan data
  const fetchArticles = useCallback(async () => {
    const exec_time = "0";
    sysLog("info", "Mencoba mengambil daftar artikel", exec_time);
    setIsLoading(true);

    try {
      const queryParams = new URLSearchParams({
        search: debouncedSearch,
        type: filterType,
        sort: sortOrder,
        limit: limit
      });

      const dataArticlesAPI = `${API_V1}/data/articles?${queryParams.toString()}`;
      const response = await fetch(dataArticlesAPI, {
        method: "GET",
        credentials: "include"
      });

      const result = await response.json();
      if (result.status_code != 200) throw new Error(result.message || result.detail);

      setArticles(result.data);
      sysLog("success", result.message, result.exec_time);

      if (result.data.length > 0) {
        setSelectedArticleId((prevId) => {
          const isSelectedStillExist = result.data.some((a: ArticleData) => a.id === prevId);
          return isSelectedStillExist ? prevId : result.data[0].id;
        });
      } else {
        setSelectedArticleId(null);
      }
    } catch (error) {
      sysLog("error", `Gagal memuat daftar storage artikel: ${error}`, exec_time);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, filterType, sortOrder, limit]);

  // Export
  const handleExportClick = () => setIsExportConfirmOpen(true);

  const handleExportExecute = useCallback(() => {
    setIsExporting(true);
    sysLog("info", "Memulai proses export database...", "0");

    const exportAPI = `${API_V1}/data/export`;
    setTimeout(() => {
      window.open(exportAPI, "_blank");
      setIsExporting(false);
      sysLog("success", "File database berhasil diunduh.", "0");
    }, 1000);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsImportConfirmOpen(true);
    }
  };

  // Import
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportExecute = useCallback(async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    sysLog("info", `Memulai proses import file: ${selectedFile.name}...`, "0");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const importAPI = `${API_V1}/data/import`;
      const response = await fetch(importAPI, {
        method: "POST",
        body: formData,
        credentials: "include"
      });

      const result = await response.json();
      if (result.status_code !== 200) throw new Error(result.message);

      sysLog("success", result.message, result.exec_time || "0");

      // Refresh
      await fetchArticles();
    } catch (error) {
      sysLog("error", `Gagal melakukan import: ${error}`, "0");
    } finally {
      setIsImporting(false);
    }
  }, [fetchArticles, selectedFile]);

  // Reset
  const handleResetClick = () => setIsResetConfirmOpen(true);

  const handleResetExecute = useCallback(async () => {
    setIsResetting(true);

    try {
      const resetAPI = `${API_V1}/data/reset`;
      const response = await fetch(resetAPI, {
        method: "DELETE",
        credentials: "include"
      });

      const result = await response.json();

      if (result.status_code != 200) throw new Error(result.message);

      await fetchArticles();

      sysLog("success", result.message, result.exec_time || "0");
    } catch (error) {
      sysLog("error", `Gagal melakukan reset: ${error}`, "0");
    } finally {
      setIsResetting(false);
    }
  }, [fetchArticles]);

  useEffect(() => {
    const escapeCascadingRender = setTimeout(() => {
      fetchArticles();
    }, 0);

    return () => clearTimeout(escapeCascadingRender);
  }, [fetchArticles]);

  const selectedArticle = articles.find((a) => a.id === selectedArticleId);

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 relative pb-10">
      {/* ================= HEADER STICKY ================= */}
      <div className="bg-[#002642]/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-md flex items-center justify-between">
        {/* Bagian Kiri: Judul */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl text-cyan-400 bg-cyan-500/10 border border-blue-500/20 shadow-inner">
            <Archive size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Storage Overview</h2>
            <p className="text-sm text-slate-400 mt-1">
              Kelola, cari, dan tinjau kembali artikel yang telah disimpan di database.
            </p>
          </div>
        </div>

        {/* Aksi Database (Export/Import/Reset) */}
        <div className="flex items-center gap-3">
          {/* Input File Tersembunyi */}
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Tombol Import */}
          <button
            onClick={handleImportClick}
            disabled={isImporting || isExporting || isResetting}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isImporting ? (
              <Loader2 size={16} className="animate-spin text-emerald-400" />
            ) : (
              <UploadCloud
                size={16}
                className="text-slate-400 group-hover:text-emerald-400 transition-colors"
              />
            )}
            <span className="text-sm font-semibold">Import Articles</span>
          </button>

          {/* Tombol Export */}
          <button
            onClick={handleExportClick}
            disabled={isExporting || isImporting || isResetting}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#E59500]/10 hover:bg-[#E59500]/20 text-[#E59500] rounded-xl border border-[#E59500]/30 shadow-[0_0_10px_rgba(229,149,0,0.1)] hover:shadow-[0_0_15px_rgba(229,149,0,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            <span className="text-sm font-semibold">Export Articles</span>
          </button>

          {/* Tombol Reset DB */}
          <button
            onClick={handleResetClick}
            disabled={isExporting || isImporting || isResetting}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isResetting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
            )}
            <span className="text-sm font-semibold">Reset DB</span>
          </button>
        </div>
      </div>

      {/* ================= SPLIT LAYOUT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative h-[calc(100vh-180px)]">
        {/* PANEL KIRI: CONFIGURE & LIST (col-span-5) */}
        <div className="lg:col-span-5 bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-xl flex flex-col h-full min-h-150">
          <div className="flex items-center gap-2 mb-5 border-b border-slate-700/50 pb-3 shrink-0">
            <Database size={18} className="text-slate-400" />
            <h3 className="text-base font-semibold text-white">Repository</h3>
          </div>

          {/* 1. Baris Filter (Type, Sort, Limit) */}
          <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Type
              </label>
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-[#02040F] border border-slate-700 text-slate-300 text-xs rounded-lg p-2.5 outline-none appearance-none cursor-pointer hover:border-slate-500 transition-colors"
                >
                  <option value="all">All Types</option>
                  <option value="slug_only">Slug Only</option>
                  <option value="vectorized">Vectorize/Scraped</option>
                  <option value="clustered">Clustered</option>
                  <option value="outlier_cluster">Outlier Clustered</option>
                  <option value="generated">Generated</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Sort
              </label>
              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full bg-[#02040F] border border-slate-700 text-slate-300 text-xs rounded-lg p-2.5 outline-none appearance-none cursor-pointer hover:border-slate-500 transition-colors"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="az">A - Z</option>
                  <option value="za">Z - A</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Limit
              </label>
              <div className="relative">
                <select
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full bg-[#02040F] border border-slate-700 text-slate-300 text-xs rounded-lg p-2.5 outline-none appearance-none cursor-pointer hover:border-slate-500 transition-colors"
                >
                  <option value="5">5 Items</option>
                  <option value="10">10 Items</option>
                  <option value="25">25 Items</option>
                  <option value="50">50 Items</option>
                  <option value="all">All Data</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                />
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
            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest block mb-2">
              Article List ({articles.length})
            </span>

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
                  <h4
                    className={`text-sm font-bold line-clamp-2 mb-2 ${selectedArticleId === article.id ? "text-[#E59500]" : "text-slate-200 group-hover:text-blue-400"}`}
                  >
                    {article.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                    {article.content?.replace(/#|\*|>/g, "") ||
                      "Konten tidak tersedia atau gagal dimuat."}
                  </p>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-800/50">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Clock size={12} /> {article.date}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        STATUS_STYLES[article.status] ||
                        "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {article.status?.replace("_", " ")}
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
                <EditableTitleBox initialTitle={selectedArticle.title} titleText="Title Article" />
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
              <p className="text-sm">
                Pilih artikel dari daftar di sebelah kiri untuk melihat detail.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL EXPORT */}
      <ConfirmationModal
        isOpen={isExportConfirmOpen}
        onClose={() => setIsExportConfirmOpen(false)}
        onConfirm={handleExportExecute}
        title="Export Database"
        message="Apakah Anda yakin ingin mengunduh seluruh data artikel saat ini ke dalam format JSON? Proses ini aman dan tidak akan menghapus data di server."
        confirmText="Ya, Eksekusi Export"
        icon={<Download size={24} />}
      >
        {/* <div className="bg-[#02040F] border border-slate-800 rounded-xl p-4 flex justify-between items-center mt-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Total Artikel
          </span>
          <span className="text-sm font-bold text-[#E59500]">{articles.length} Data</span>
        </div> */}
      </ConfirmationModal>

      {/* MODAL IMPORT */}
      <ConfirmationModal
        isOpen={isImportConfirmOpen}
        onClose={() => {
          setIsImportConfirmOpen(false);
          if (fileInputRef.current) fileInputRef.current.value = ""; // Batalkan pilihan file
        }}
        onConfirm={handleImportExecute}
        title="Import Database"
        message="Anda akan mengimpor data artikel dari file JSON. Jika terdapat ID yang sama, data lama akan ditimpa (diperbarui) dengan data dari file ini."
        confirmText="Ya, Import Sekarang"
        icon={<UploadCloud size={24} />}
        isDestructive={true} // Import punya risiko overwrite, kita beri warna merah
      >
        {selectedFile && (
          <div className="bg-[#02040F] border border-slate-800 rounded-xl p-4 flex justify-between items-center mt-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              File Terpilih
            </span>
            <span className="text-xs font-bold text-slate-200 truncate max-w-50">
              {selectedFile.name}
            </span>
          </div>
        )}
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetExecute}
        title="Reset Database"
        message="Apakah Anda yakin ingin me-reset seluruh data dalam database ?"
        confirmText="Ya, Eksekusi Reset Database"
        icon={<Trash2 size={24} />}
      >
        {/* <div className="bg-[#02040F] border border-slate-800 rounded-xl p-4 flex justify-between items-center mt-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Total Artikel
          </span>
          <span className="text-sm font-bold text-[#E59500]">{articles.length} Data</span>
        </div> */}
      </ConfirmationModal>
    </div>
  );
}
