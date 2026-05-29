"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Pickaxe, Play, Settings, Database, Activity, Clock, 
  CheckCircle2, FileText, FileBox, AlertCircle, ArrowUpRight, History 
} from "lucide-react";
import { sysLog } from "@/utils/logger";
import ConfirmationModal from "@/components/ConfirmationModal";
import { ScrapResult } from "@/types/types";

export default function ScrapPage() {
  // 1. State untuk 5 Input Parameter
  const [formData, setFormData] = useState({
    mode: "both",
    max_scrap: 10,
    overlap_limit: 100,
    page: 1,
    limit_article_per_page: 10
  });

  // 2. State untuk UI & Monitoring
  const [isLoading, setIsLoading] = useState(false);
  const [scrapResult, setScrapResult] = useState<ScrapResult | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // 3. Handler Perubahan Input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      // Konversi ke angka jika bukan input mode
      [name]: name === "mode" ? value : Number(value)
    }));
  };

  // 4. Handler Eksekusi Scrap
  const handleScrapExecute = useCallback(async () => {
    setIsLoading(true);
    setScrapResult(null); // Reset hasil sebelumnya
    const exec_time: string | null = "0";

    const payload = { ...formData };
    if (payload.mode === "older") {
      payload.page = 0;
    }

    sysLog("info", `Memulai proses Scraping dengan mode: ${payload.mode}...`, exec_time);

    try {
      // Sesuaikan URL ini dengan endpoint FastAPI Scrap milikmu
      const scrapAPI = `http://localhost:8000/api/v1/run/scrap`; 
      const response = await fetch(scrapAPI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include"
      });
      
      const result = await response.json();
      if (result.status_code) throw new Error(result.message || result.detail);

      setScrapResult(result);
      sysLog("success", result.message, result.exec_time);
    } catch (error) {
      sysLog("error", `Gagal melakukan scraping: ${error}`, exec_time);
      setScrapResult({ error: true, message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, [formData]);

  // Kontrol confirm dengan keyboard
  useEffect(() => {
    if (!isConfirmOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      // saat enter ditekan -> eksekusi
      if (e.key === "Enter"){
          e.preventDefault();
          handleScrapExecute();
          setIsConfirmOpen(false);
        } 
      // saat esc ditekan -> batal
        else if (e.key === "Escape"){
        setIsConfirmOpen(false);
      }
    };

    window.addEventListener("keydown", handleKey);

    // Bersihkan listener saat tidak digunakan
    return () => window.removeEventListener("keydown", handleKey);
  }, [isConfirmOpen, handleScrapExecute])

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 relative">
      
      {/* HEADER STICKY */}
      <div className="bg-[#002642]/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-md flex items-center justify-between">

        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <Pickaxe size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Article Scraping</h2>
            <p className="text-sm text-slate-400 mt-1">Konfigurasi dan tarik data artikel terbaru dari MyDigiLearn.</p>
          </div>
        </div>
      </div>

      {/* SPLIT LAYOUT: 4 Kolom Kiri (Config), 8 Kolom Kanan (Monitor) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 pb-6 gap-6 relative">
        
        {/* ================= AREA KIRI: CONFIGURATION PANEL ================= */}
        <div className="sticky top-32 lg:col-span-4 space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-700/50 pb-4">
              <Settings size={20} className="text-slate-400" />
              <h3 className="text-lg font-semibold text-white">Configure</h3>
            </div>

            <div className="space-y-5 flex-1">
              {/* 1. Input Mode */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Scrap Mode</label>
                <select 
                  name="mode" 
                  value={formData.mode} 
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-[#E59500] focus:border-[#E59500] block p-3 transition-colors disabled:opacity-50"
                >
                  <option value="both">Both (Older & Newer)</option>
                  <option value="newer">Newer (Terbaru Saja)</option>
                  <option value="older">Older (Data Lama)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 2. Input Max Scrap */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Max Scrap</label>
                  <input 
                    type="number" name="max_scrap" 
                    value={formData.max_scrap} onChange={handleInputChange} disabled={isLoading}
                    className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-[#E59500] focus:border-[#E59500] block p-3 disabled:opacity-50" 
                  />
                </div>

                {/* 3. Input Overlap Limit */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Overlap Limit</label>
                  <input 
                    type="number" name="overlap_limit" 
                    value={formData.overlap_limit} onChange={handleInputChange} disabled={isLoading}
                    className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-[#E59500] focus:border-[#E59500] block p-3 disabled:opacity-50" 
                  />
                </div>

                {/* 4. Input Page */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Start Page</label>
                  <input 
                    type={formData.mode == "older" ? "text" : "number"} 
                    name="page" 
                    value={formData.mode == "older" ? "Auto (System)" : formData.page} 
                    onChange={handleInputChange} 
                    disabled={isLoading || formData.mode === "older"}
                    className={`w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-[#E59500] focus:border-[#E59500] block p-3 transition-all ${
                      formData.mode === "older" ? "cursor-not-allowed bg-slate-950 text-slate-500 border-dashed" : "disabled:opacity-50"
                    }`}
                  />
                </div>

                {/* 5. Input Limit per Page */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Limit / Page</label>
                  <input 
                    type="number" name="limit_article_per_page" 
                    value={formData.limit_article_per_page} onChange={handleInputChange} disabled={isLoading}
                    className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-[#E59500] focus:border-[#E59500] block p-3 disabled:opacity-50" 
                  />
                </div>
              </div>
            </div>

            {/* Tombol Eksekusi Aksi */}
            <button 
              onClick={() => setIsConfirmOpen(true)}
              disabled={isLoading}
              className="mt-8 w-full flex items-center justify-center gap-2 bg-[#E59500] hover:bg-[#E59500]/90 text-[#02040F] font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(229,149,0,0.3)] hover:shadow-[0_0_25px_rgba(229,149,0,0.5)] disabled:opacity-50 disabled:hover:shadow-[0_0_15px_rgba(229,149,0,0.3)] disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#02040F]/30 border-t-[#02040F] rounded-full animate-spin" />
                  <span>Scraping Data...</span>
                </>
              ) : (
                <>
                  <Play size={18} className="fill-current" />
                  <span>Execute Scrap</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================= AREA KANAN: MONITORING & RESULT ================= */}
        <div className="lg:col-span-8 bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between mb-6 border-b border-slate-700/50 pb-4">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Result</h3>
            </div>
            
            {/* Status Badge Live */}
            {isLoading ? (
              <span className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 rounded-full animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                Scraping
              </span>
            ) : scrapResult ? (
               <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 rounded-full">
                <CheckCircle2 size={14} />
                Finished
              </span>
            ) : (
               <span className="flex items-center gap-2 px-3 py-1 bg-slate-800 text-slate-400 text-xs font-medium rounded-full">
                <Clock size={14} />
                Idle
              </span>
            )}
          </div>

          {/* Kondisi 1: Sedang Loading */}
          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-800 border-t-[#E59500] rounded-full animate-spin"></div>
                <Pickaxe className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#E59500] animate-pulse" size={24} />
              </div>
              <p className="animate-pulse tracking-wide">Menjelajahi situs, mohon tunggu...</p>
            </div>
          )}

          {/* Kondisi 2: State Awal (Belum ada aksi) */}
          {!isLoading && !scrapResult && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-60">
              <Database size={48} strokeWidth={1} />
              <p className="text-sm">Silakan konfigurasikan parameter di sebelah kiri dan tekan Execute.</p>
            </div>
          )}

          {/* Kondisi 3: Error */}
          {!isLoading && scrapResult?.error && (
            <div className="flex-1 flex flex-col items-center justify-center text-red-400 space-y-3 bg-red-950/10 rounded-xl border border-red-900/30 p-6 text-center">
              <AlertCircle size={40} className="text-red-500 mb-2" />
              <h4 className="font-semibold text-lg text-red-300">Proses Gagal</h4>
              <p className="text-sm text-red-400/80">{scrapResult.message}</p>
            </div>
          )}

          {/* Kondisi 4: Sukses Render Data */}
          {!isLoading && scrapResult && !scrapResult.error && scrapResult.status === "success" && scrapResult.data && (
            <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-4 duration-500">
              
              {/* 1. HIGHLIGHT BANNER */}
              <div className="flex flex-col items-center justify-center py-6 bg-emerald-950/30 rounded-xl border border-emerald-500/20 mb-6 text-center px-4 relative overflow-hidden">
                {/* Efek Glow Latar Belakang */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none" />
                
                <CheckCircle2 size={40} className="text-emerald-400 mb-3 relative z-10" />
                <h4 className="text-lg font-bold text-emerald-300 mb-1 relative z-10">
                  {scrapResult?.status === "success" ? "Eksekusi Sukses" : "Proses Selesai"}
                </h4>
                <p className="text-sm text-emerald-400/80 relative z-10">
                  {scrapResult?.message}
                </p>
                <div className="mt-4 px-4 py-1 bg-emerald-500/10 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-widest border border-emerald-500/20 relative z-10">
                  Mode: {scrapResult?.data.mode}
                </div>
              </div>

              {/* 2. SYSTEM HEALTH GRID */}
              <div className="mb-6">
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">System Health (Current DB)</h5>
                <div className="grid grid-cols-3 gap-4">
                  {/* Health: Total List */}
                  <div className="bg-[#02040F] p-4 rounded-xl border border-slate-800 flex flex-col justify-center gap-2">
                    <div className="flex items-center gap-2 text-blue-400">
                      <FileText size={16} />
                      <span className="text-xs uppercase font-semibold tracking-wider">Total List</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-200">
                      {scrapResult?.data.system_health?.total_list || 0}
                    </p>
                  </div>
                  
                  {/* Health: Total Content */}
                  <div className="bg-[#02040F] p-4 rounded-xl border border-slate-800 flex flex-col justify-center gap-2">
                    <div className="flex items-center gap-2 text-[#E59500]">
                      <FileBox size={16} />
                      <span className="text-xs uppercase font-semibold tracking-wider">Total Content</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-200">
                      {scrapResult?.data.system_health?.total_content || 0}
                    </p>
                  </div>

                  {/* Health: Total ChromaDB */}
                  <div className="bg-[#02040F] p-4 rounded-xl border border-slate-800 flex flex-col justify-center gap-2">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Database size={16} />
                      <span className="text-xs uppercase font-semibold tracking-wider">Chroma DB</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-200">
                      {scrapResult?.data.system_health?.total_chromadb || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. EXECUTION DETAILS */}
              <div className="flex-1 bg-[#02040F]/80 rounded-xl border border-slate-800 p-5 flex flex-col">
                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-800 pb-3">
                  Scraping Details
                </h5>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {/* Newer Article Box */}
                  <div className="bg-[#0A0E1A] border border-emerald-500/20 p-4 rounded-lg flex items-center justify-between hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-md">
                        <ArrowUpRight size={18} />
                      </div>
                      <span className="text-sm font-medium text-slate-300">Newer Article</span>
                    </div>
                    <span className="text-2xl font-bold text-emerald-400">
                      {scrapResult?.data.details_scrap?.newer_article || 0}
                    </span>
                  </div>

                  {/* Older Article Box */}
                  <div className="bg-[#0A0E1A] border border-slate-700/50 p-4 rounded-lg flex items-center justify-between hover:border-slate-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 text-slate-400 rounded-md">
                        <History size={18} />
                      </div>
                      <span className="text-sm font-medium text-slate-400">Older Article</span>
                    </div>
                    <span className="text-2xl font-bold text-slate-400">
                      {scrapResult?.data.details_scrap?.older_article || 0}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleScrapExecute}
        title="Scrap Article Confirmation"
        message="Apakah Anda yakin ingin memulai proses penarikan data (scraping) dengan parameter berikut? Proses ini akan berjalan di background."
        confirmText="Ya, Mulai Scraping"
        icon={<Pickaxe size={24} />}
      >
        {/* Kotak Ringkasan Data yang Diinput User */}
        <div className="bg-[#02040F] border border-slate-800 rounded-xl p-4 space-y-4 mt-2">
          
          {/* Baris 1: Mode */}
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Scrap Mode</span>
            <span className="text-sm font-bold text-[#E59500] bg-[#E59500]/10 px-3 py-1 rounded-md border border-[#E59500]/20 capitalize shadow-inner">
              {formData.mode}
            </span>
          </div>

          {/* Grid Parameter Angka */}
          <div className="grid grid-cols-2 gap-3">
            
            <div className="bg-[#0A0E1A] border border-slate-800/80 p-3 rounded-lg flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Max Scrap</span>
              <span className="text-sm font-bold text-slate-200">{formData.max_scrap}</span>
            </div>

            <div className="bg-[#0A0E1A] border border-slate-800/80 p-3 rounded-lg flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Overlap Limit</span>
              <span className="text-sm font-bold text-slate-200">{formData.overlap_limit}</span>
            </div>

            <div className="bg-[#0A0E1A] border border-slate-800/80 p-3 rounded-lg flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Start Page</span>
              <span className="text-sm font-bold text-slate-200">
                {formData.mode === "older" ? "Auto" : formData.page}
              </span>
            </div>

            <div className="bg-[#0A0E1A] border border-slate-800/80 p-3 rounded-lg flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Limit/Page</span>
              <span className="text-sm font-bold text-slate-200">{formData.limit_article_per_page}</span>
            </div>
            
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
}