"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Network, BrainCircuit, Play, Settings, Layers, 
  Zap, BarChart3, CheckCircle2, Clock, AlertCircle,
  Hash, Star
} from "lucide-react";
import { sysLog } from "@/utils/logger";
import ConfirmationModal from "@/components/ConfirmationModal";
import { ClusterList, ClusterResult } from "@/types/types";

export default function ClusterPage() {
  // 1. State Lengkap sesuai Referensi (5 Group Input)
  const [formData, setFormData] = useState({
    // General
    embedding_model: "all-MiniLM-L6-v2",
    recommend_target: 3,
    min_conf_score: 0.5,
    // UMAP
    n_neighbors: 10,
    n_components: 5,
    min_dist: 0.0,
    metric_umap: "cosine",
    random_state: 42,
    // HDBSCAN
    min_cluster_size: 4,
    min_samples: 2,
    metric_hdbscan: "euclidean",
    cluster_selection_method: "eom",
    prediction_data: true,
    // Vectorizer
    ngram_range: "(1, 6)",
    min_df: 5,
    // CTFIDF
    bm25_weighting: true,
    reduce_frequent_words: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === "checkbox";
    
    setFormData(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : 
               isNaN(Number(value)) || value === "" ? value : Number(value)
    }));
  };

  const handleClusterExecute = useCallback(async () => {
    setIsLoading(true);
    const exec_time: string | null = "0";
    sysLog("info", "Memulai proses Clustering AI...", exec_time);

    try {
      const clusterAPI = "http://localhost:8000/api/v1/run/cluster";
      const response = await fetch(clusterAPI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include"
      });

      const result = await response.json();
      if (result.status_code != 200) throw new Error(result.message || result.detail);
      
      setClusterResult(result);
      sysLog("success", "Clustering selesai dieksekusi.", result.exec_time);
    } catch (error) {
      sysLog("error", `Gagal melakukan clustering: ${error}`, exec_time);
      setClusterResult({ error: true, message: String(error) });
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
          handleClusterExecute();
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
  }, [isConfirmOpen, handleClusterExecute])

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 relative pb-10">
      
      {/* HEADER STICKY */}
      <div className="bg-[#002642]/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-[#E59500] border border-blue-500/20">
            <Network size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Article Clustering</h2>
            <p className="text-sm text-slate-400 mt-1">Ekstraksi topik dan pengelompokan artikel berbasis BERTopic.</p>
          </div>
        </div>
      </div>

      {/* SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 pb-6 gap-6 relative">
        
        {/* ================= AREA KIRI: MULTI-GROUP CONFIG (SCROLLABLE) ================= */}
        <div className="lg:col-span-5 space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto pr-2 sticky top-0 custom-scrollbar self-start">
          
          {/* GROUP 1: General & Recommendation */}
          <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-700/50 pb-6">
              <Zap size={18} className="text-slate-400"/>
              <h3 className="font-semibold uppercase text-xs tracking-widest text-white">Main Settings</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Embedding Model</label>
                <input name="embedding_model" value={formData.embedding_model} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:border-[#E59500] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rec. Target</label>
                  <input type="number" name="recommend_target" value={formData.recommend_target} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Min Conf. Score</label>
                  <input type="number" step="0.01" name="min_conf_score" value={formData.min_conf_score} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* GROUP 2: UMAP (Dimensionality Reduction) */}
          <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-blue-400 border-b border-slate-800 pb-6">
              <Layers size={18} />
              <h3 className="font-semibold uppercase text-xs tracking-widest">UMAP Model (Dim. Reduction)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">n_neighbors</label>
                <input type="number" name="n_neighbors" value={formData.n_neighbors} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">n_components</label>
                <input type="number" name="n_components" value={formData.n_components} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">min_dist</label>
                <input type="number" step="0.1" name="min_dist" value={formData.min_dist} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">random_state</label>
                <input type="number" name="random_state" value={formData.random_state} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] text-slate-500">metric_umap</label>
                <select name="metric_umap" value={formData.metric_umap} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2">
                  <option value="cosine">Cosine</option>
                  <option value="euclidean">Euclidean</option>
                  <option value="manhattan">Manhattan</option>
                </select>
              </div>
            </div>
          </div>

          {/* GROUP 3: HDBSCAN (Clustering) */}
          <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-emerald-400 border-b border-slate-800 pb-6">
              <BrainCircuit size={18} />
              <h3 className="font-semibold uppercase text-xs tracking-widest">HDBSCAN Model (Clustering)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">min_cluster_size</label>
                <input type="number" name="min_cluster_size" value={formData.min_cluster_size} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">min_samples</label>
                <input type="number" name="min_samples" value={formData.min_samples} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">metric_hdbscan</label>
                <select name="metric_hdbscan" value={formData.metric_hdbscan} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2">
                  <option value="euclidean">Euclidean</option>
                  <option value="manhattan">Manhattan</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">selection_method</label>
                <select name="cluster_selection_method" value={formData.cluster_selection_method} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2">
                  <option value="eom">EOM</option>
                  <option value="leaf">Leaf</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center justify-between bg-[#02040F] p-3 rounded-lg border border-slate-700 mt-2">
                <label className="text-xs font-medium text-slate-300">Prediction Data</label>
                <input type="checkbox" name="prediction_data" checked={formData.prediction_data} onChange={handleInputChange} className="w-4 h-4 accent-[#E59500]" />
              </div>
            </div>
          </div>

          {/* GROUP 4: Text Processing (Vectorizer & CTFIDF) */}
          <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-purple-400 border-b border-slate-800 pb-6">
              <Settings size={18} />
              <h3 className="font-semibold uppercase text-xs tracking-widest">Text Processing</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">ngram_range</label>
                <input type="text" name="ngram_range" value={formData.ngram_range} onChange={handleInputChange} placeholder="(1, 1)" className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">min_df</label>
                <input type="number" name="min_df" value={formData.min_df} onChange={handleInputChange} className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-2" />
              </div>
              <div className="col-span-2 space-y-2 mt-2">
                <div className="flex items-center justify-between bg-[#02040F] p-3 rounded-lg border border-slate-700">
                  <label className="text-xs font-medium text-slate-300">BM25 Weighting</label>
                  <input type="checkbox" name="bm25_weighting" checked={formData.bm25_weighting} onChange={handleInputChange} className="w-4 h-4 accent-purple-500" />
                </div>
                <div className="flex items-center justify-between bg-[#02040F] p-3 rounded-lg border border-slate-700">
                  <label className="text-xs font-medium text-slate-300">Reduce Frequent Words</label>
                  <input type="checkbox" name="reduce_frequent_words" checked={formData.reduce_frequent_words} onChange={handleInputChange} className="w-4 h-4 accent-purple-500" />
                </div>
              </div>
            </div>
            {/* TOMBOL EKSEKUSI */}
            <button 
              onClick={() => setIsConfirmOpen(true)}
              disabled={isLoading}
              className="mt-8 w-full flex items-center justify-center gap-2 bg-[#E59500] hover:bg-[#E59500]/90 text-[#02040F] font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(229,149,0,0.3)] hover:shadow-[0_0_25px_rgba(229,149,0,0.5)] disabled:opacity-50 disabled:hover:shadow-[0_0_15px_rgba(229,149,0,0.3)] disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#02040F]/30 border-t-[#02040F] rounded-full animate-spin" />
                  <span>Clustering Data...</span>
                </>
              ) : (
                <>
                  <Play size={18} className="fill-current" />
                  <span>Execute Cluster</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* ================= AREA KANAN: RESULT ================= */}
        <div className="lg:col-span-7 bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between mb-6 border-b border-slate-700/50 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-[#E59500]" />
              <h3 className="text-xl font-semibold text-white">Result</h3>
            </div>
            {/* Status Badge Live */}
            {isLoading ? (
              <span className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 rounded-full animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                Clustering
              </span>
            ) : clusterResult ? (
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
                <Network className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#E59500] animate-pulse" size={24} />
              </div>
              <p className="animate-pulse tracking-wide">BERTopic sedang bekerja, mohon tunggu...</p>
            </div>
          )}

          {/* Kondisi 2: State Awal (Belum ada aksi) */}
          {!isLoading && !clusterResult && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-60">
              <BrainCircuit size={48} strokeWidth={1} />
              <p className="text-sm">Silakan konfigurasikan parameter di sebelah kiri dan tekan Execute.</p>
            </div>
          )}

          {/* Kondisi 3: Error */}
          {!isLoading && clusterResult?.error && (
            <div className="flex-1 flex flex-col items-center justify-center text-red-400 space-y-3 bg-red-950/10 rounded-xl border border-red-900/30 p-6 text-center">
              <AlertCircle size={40} className="text-red-500 mb-2" />
              <h4 className="font-semibold text-lg text-red-300">Proses Gagal</h4>
              <p className="text-sm text-red-400/80">{clusterResult.message}</p>
            </div>
          )}

          {/* Kondisi  4: Sukses Render Data */}
          {!isLoading && clusterResult && !clusterResult.error && clusterResult.status === "success" && clusterResult.data && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 flex-1 flex flex-col justify-center">

              {/* 1. HIGHLIGHT BANNER */}
              <div className="flex flex-col items-center justify-center py-6 bg-emerald-950/30 rounded-xl border border-emerald-500/20 mb-6 text-center px-4 relative overflow-hidden">
                {/* Efek Glow Latar Belakang */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none" />
                
                <CheckCircle2 size={40} className="text-emerald-400 mb-3 relative z-10" />
                <h4 className="text-lg font-bold text-emerald-300 mb-1 relative z-10">
                  {clusterResult?.status === "success" ? "Eksekusi Sukses" : "Proses Selesai"}
                </h4>
                <p className="text-sm text-emerald-400/80 relative z-10">
                  {clusterResult?.message}
                </p>
              </div>
              
              {/* Highlight Result Cards */}
              <div className="grid grid-cols-2 gap-6">
                {/* Kartu 1: Total Cluster */}
                <div className="bg-[#002642]/40 p-6 rounded-2xl border border-blue-500/20 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Topic</p>
                  <h4 className="text-5xl font-black text-blue-400">
                    {clusterResult.data.metadatas.total_cluster}
                  </h4>
                </div>
                
                {/* Kartu 2: Recommended Cluster */}
                <div className="bg-[#002642]/40 p-6 rounded-2xl border border-[#E59500]/20 text-center relative">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Rec. Topic</p>
                  <h4 className="text-5xl font-black text-[#E59500]">
                    {clusterResult.data.metadatas.total_recommended}
                  </h4>
                  <div className="absolute top-4 right-4 text-[#E59500] animate-pulse">
                    <Zap size={20} />
                  </div>
                </div>

                {/* Kartu 3: Filtered Articles & Min CF Range */}
                <div className="bg-[#0A0E1A] p-6 rounded-2xl border border-purple-500/20 text-center relative overflow-hidden">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Clustered Articles</p>
                  <h4 className="text-4xl font-black text-purple-400">
                    {clusterResult.data.metadatas.clustered_total_article}
                  </h4>
                  {/* Badge untuk min_cf_range */}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500/10 text-purple-300 text-[10px] rounded-md border border-purple-500/20">
                    CF Range: {clusterResult.data.metadatas.min_cf_range}
                  </div>
                </div>

                {/* Kartu 4: Outlier Articles */}
                <div className="bg-[#0A0E1A] p-6 rounded-2xl border border-slate-700/50 text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Outlier Articles</p>
                  <h4 className="text-4xl font-black text-slate-300">
                    {clusterResult.data.metadatas.outlier_total_article}
                  </h4>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-800 pt-6">
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Hash size={16} className="text-[#E59500]" />
                  Top 5 Extracted Topics
                </h4>
                
                <div className="space-y-3">
                  {/* Melakukan mapping pada array cluster, dipotong 5 teratas saja */}
                  {clusterResult.data.cluster.slice(0, 5).map((item: ClusterList, index: number) => (
                    <div key={item.cluster_id} className="bg-[#02040F] border border-slate-800 p-4 rounded-xl flex items-start justify-between hover:border-slate-600 transition-colors group">
                      
                      {/* Sisi Kiri: Nama & Keyword */}
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded">#{index + 1}</span>
                          <h5 className="font-semibold text-slate-200 capitalize truncate max-w-xs" title={item.cluster_name}>
                            {item.cluster_name}
                          </h5>
                          {item.is_recommended && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#E59500] bg-[#E59500]/10 px-2 py-0.5 rounded-full border border-[#E59500]/20">
                              <Star size={10} className="fill-current" /> Rec
                            </div>
                          )}
                        </div>
                        
                        {/* Render Keywords sebagai tag kecil */}
                        <div className="flex flex-wrap gap-1.5">
                          {item.cluster_keywords.slice(0, 4).map((keyword: string, kIdx: number) => (
                            <span key={kIdx} className="text-[10px] text-slate-400 bg-slate-800/50 border border-slate-700/50 px-2 py-0.5 rounded-md">
                              {keyword}
                            </span>
                          ))}
                          {item.cluster_keywords.length > 4 && (
                            <span className="text-[10px] text-slate-500 px-1 py-0.5">...</span>
                          )}
                        </div>
                      </div>

                      {/* Sisi Kanan: Article Count */}
                      <div className="flex flex-col items-end justify-center min-w-[80px] border-l border-slate-800 pl-4 h-full">
                        <span className="text-2xl font-bold text-blue-400">{item.article_count}</span>
                        <span className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider">Articles</span>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* 🔥 PERBAIKAN: MODAL KONFIRMASI DENGAN DATA CLUSTER */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleClusterExecute}
        title="Cluster Article Confirmation"
        message="Apakah Anda yakin ingin memulai proses pengelompokan (clustering) dengan parameter BERTopic berikut? Proses ini membutuhkan komputasi AI dan mungkin memakan waktu beberapa saat."
        confirmText="Ya, Mulai Clustering"
        icon={<Network size={24} />}
      >
        {/* Kotak Ringkasan Data yang Diinput User */}
        <div className="bg-[#02040F] border border-slate-800 rounded-xl p-4 space-y-4 mt-2">
          
          {/* Baris 1: Embedding Model */}
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Embedding Model</span>
            <span className="text-xs font-bold text-[#E59500] bg-[#E59500]/10 px-2 py-1 rounded-md border border-[#E59500]/20 shadow-inner truncate max-w-[150px]">
              {formData.embedding_model}
            </span>
          </div>

          {/* Grid Parameter Angka (Menampilkan 4 Parameter Terpenting) */}
          <div className="grid grid-cols-2 gap-3">
            
            <div className="bg-[#0A0E1A] border border-slate-800/80 p-3 rounded-lg flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rec. Target</span>
              <span className="text-sm font-bold text-slate-200">{formData.recommend_target}</span>
            </div>

            <div className="bg-[#0A0E1A] border border-slate-800/80 p-3 rounded-lg flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Min Conf. Score</span>
              <span className="text-sm font-bold text-slate-200">{formData.min_conf_score}</span>
            </div>

            <div className="bg-[#0A0E1A] border border-slate-800/80 p-3 rounded-lg flex justify-between items-center" title="UMAP Neighbors">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Neighbors</span>
              <span className="text-sm font-bold text-slate-200">{formData.n_neighbors}</span>
            </div>

            <div className="bg-[#0A0E1A] border border-slate-800/80 p-3 rounded-lg flex justify-between items-center" title="HDBSCAN Min Cluster Size">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Min Cluster</span>
              <span className="text-sm font-bold text-slate-200">{formData.min_cluster_size}</span>
            </div>
            
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
}