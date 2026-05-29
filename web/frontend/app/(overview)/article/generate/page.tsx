"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  FileText, Settings, Zap, 
  Sparkles, Play, CheckCircle2, Clock, AlertCircle, 
  Plus, X, ChevronDown, Lock, EyeOff, Eye, Check, Copy
} from "lucide-react";
import { GenerateResult, TopicData } from "@/types/types";
import { sysLog } from "@/utils/logger";
import ConfirmationModal from "@/components/ConfirmationModal";
import { EditableTitleBox } from "@/components/editableTitleBox";
import { EditableContentBox } from "@/components/EditableContentBox";

export default function GeneratePage() {
  const [formData, setFormData] = useState({
    topics: [] as string[],
    keywords: [] as string[],
    prompt: "",
    model: "gemini-3-flash-preview",
    model_api_key: ""
  });
  
  const [topicLimit, setTopicLimit] = useState<number | "all">(10);
  const [topicSort, setTopicSort] = useState<"rec" | "count_asc" | "count_desc" | "name_asc" | "name_desc">("rec");
  const [topicPool, setTopicPool] = useState<TopicData[]>([]);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false); // <-- Tambahkan ini
  const [showApiKeyModel, setShowApiKeyModel] = useState(false)

  // State Kontrol Layar
  const [isFetchingTags, setIsFetchingTags] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);

  // Input Teks Manual
  const [topicInputValue, setTopicInputValue] = useState("");
  const [keywordInputValue, setKeywordInputValue] = useState("");

  // Modal konfirmasi
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // State tombol copy
  const [isTitleCopied, setIsTitleCopied] = useState(false);

  // State editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  
  // Daftar model utama
  const PREDEFINED_MODELS = [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-lite" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
    { value: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash-lite (Preview)" }
  ];

  // ================= LOGIKA KETERGANTUNGAN DATA =================
  // A. Memisahkan Topik (Terpilih vs Daftar Tunggu)
  const suggestedTopics = useMemo(() => {
    // Ambil sesuai batas filter
    let filtered = topicPool.filter(t => !formData.topics.includes(t.name));

    // Sorting
    if (topicSort === "rec") {
      filtered = filtered.filter(t => t.color === "green");
      
      // Urutkan berdasarkan jumlah terdikit
      filtered.sort((a, b) => (a.article_count || 0) - (b.article_count || 0));
    } else {
      filtered.sort((a, b) => {
        const countA = a.article_count || 0;
        const countB = b.article_count || 0;
  
        if (topicSort === "count_asc") return countA - countB;
        if (topicSort === "count_desc") return countB - countA;
        if (topicSort === "name_asc") return a.name.localeCompare(b.name);
        if (topicSort === "name_desc") return b.name.localeCompare(a.name);
  
        return 0;
      });
    }

    if (topicLimit != "all") {
      filtered = filtered.slice(0, topicLimit as number);
    }

    return filtered;
  }, [topicLimit, topicSort, topicPool, formData.topics]);

  // B. Mengumpulkan Keyword Daftar Tunggu (Hanya dari Topik yang TERPILIH)
  const suggestedKeywords = useMemo(() => {
    const activeTopics = topicPool.filter(t => formData.topics.includes(t.name));
    const keywordSet = new Set<string>();
    
    activeTopics.forEach(t => {
      t.keywords?.forEach(kw => keywordSet.add(kw));
    });

    // Jangan tampilkan keyword di daftar tunggu jika sudah dipilih
    return Array.from(keywordSet).filter(kw => !formData.keywords.includes(kw));
  }, [topicPool, formData.topics, formData.keywords]);

  // ================= HANDLERS INTERAKSI =================
  // Handler universal untuk input teks biasa (Prompt, API Key)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleTopic = (name: string) => {
    setFormData(prev => {
      const isCurrentlySelected = prev.topics.includes(name);

      if (isCurrentlySelected) {
        // Jika topik dihapus

        const newTopics = prev.topics.filter(t => t !== name);
        
        // Cari daftar keyword dari topik yang baru saja dihapus 
        const topicToRemoveData = topicPool.find(t => t.name === name)
        const keywordsToRemove = topicToRemoveData?.keywords || [];

        /// Kumpulkan semua keyword dari topik-topik sisanya (yang masih aktif)
        const remainingKeywordsSet = new Set<string>();
        newTopics.forEach(topicName => {
          const tData = topicPool.find(t => t.name === topicName);
          tData?.keywords?.forEach(kw => remainingKeywordsSet.add(kw));
        });

        // Filter keyword yang ada di kotak saat ini:
        // - Pertahankan jika BUKAN milik topik yang dihapus.
        // - ATAU pertahankan jika dia milik topik yang dihapus, TAPI kebetulan masih dipakai topik lain.
        const newKeywords = prev.keywords.filter(kw => 
          !keywordsToRemove.includes(kw) || remainingKeywordsSet.has(kw)
        );

        return {
          ...prev,
          topics: newTopics,
          keywords: newKeywords
        };

      } else {
        // Jika topik ditambah

        const selectedTopicData = topicPool.find(t => t.name === name);
        const autoKeywords = selectedTopicData?.keywords || [];

        const mergedKeywords = new Set([...prev.keywords, ...autoKeywords]);

        return {
          ...prev,
          topics: [...prev.topics, name],
          keywords: Array.from(mergedKeywords)
        }
      }
    });
  };

  const toggleKeyword = (name: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.includes(name)
        ? prev.keywords.filter(k => k !== name)
        : [...prev.keywords, name]
    }));
  };

  // Handler Input Manual
  const handleManualAdd = (
    e: React.KeyboardEvent<HTMLInputElement>, 
    value: string, 
    setValue: React.Dispatch<React.SetStateAction<string>>, 
    toggleFn: (name: string) => void,
    selectedList: string[]
  ) => {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      if (!selectedList.includes(value.trim())) {
        toggleFn(value.trim());
      }
      setValue("");
    }
  };

  // Helper Warna
  const getColorClass = (name: string, type: "topic" | "keyword") => {
    if (type === "keyword") return "bg-[#E59500]/20 text-[#E59500] border-[#E59500]/40 hover:bg-[#E59500]/30";
    
    // Cek apakah topik ini dari database dan apa warnanya
    const dbTopic = topicPool.find(t => t.name === name);
    console.log("dbTopic", dbTopic);
    if (dbTopic?.color === "green") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30";
    
    return "bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30"; // Manual / Default Topik
  };

  // ================= EKSEKUSI GENERATE =================
  const handleGenerateExecute = async () => {
    const exec_time = "0";

    setIsLoading(true);
    setGenerateResult(null);
    sysLog("info", "Memulai proses Generate Artikel AI...", exec_time);

    try {
      const generateAPI = "http://localhost:8000/api/v1/run/generate";
      const response = await fetch(generateAPI, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include"
      });

      const result = await response.json();
      if (result.status_code != 200) throw new Error(result.message || result.detail);

      // console.log("result", result);

      setGenerateResult(result);
      setEditedTitle(result.data?.title || "");
      sysLog("success", result.message, result.exec_time);
    } catch (error) {
      sysLog("error", `Gagal generate artikel: ${error}`, exec_time);
      setGenerateResult({ error: true, message: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTitle = async () => {
    const exec_time = "0";
    if (!editedTitle) return;
    try {
      await navigator.clipboard.writeText(editedTitle)
      setIsTitleCopied(true);
      setTimeout(() => setIsTitleCopied(false), 2000);
      sysLog("success", "Judul disalin ke clipboard!", exec_time);
    } catch (error) {
      sysLog("error", "Gagal menyalin judul.", exec_time)
    }
  }

  // ================= FETCHING INIT DATA =================
  useEffect(() => {
    const fetchInitialData = async () => {
      const exec_time = "0";
      sysLog("info", "Mencoba mengambil data topik dan keywords dari backend", exec_time)

      setIsFetchingTags(true);
      try {
        const dataClusterAPI = "http://localhost:8000/api/v1/data/cluster";
        const response = await fetch(dataClusterAPI, {
          credentials: "include"
        });
        const result = await response.json();

        if (result.status_code != 200) throw new Error(result.message || result.detail)

        if (result && result.status === "success" && result.data?.topics) {
          setTopicPool(result.data.topics);
          sysLog("success", "Sukses menarik data topics dan keywords dari backend", result.exec_time)
        }
      } catch (error) {
        sysLog("error", `Gagal menarik data topics dan keywords: ${error}`, exec_time);
      } finally {
        setIsFetchingTags(false);
      }
    };
    fetchInitialData();
  }, []);

  // Kontrol confirm dengan keyboard
  useEffect(() => {
    if (!isConfirmOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      // saat enter ditekan -> eksekusi
      if (e.key === "Enter"){
          e.preventDefault();
          handleGenerateExecute();
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
  }, [isConfirmOpen])

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 relative pb-10">

      {/* HEADER STICKY */}
      <div className="bg-[#002642]/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl text-purple-400 border border-blue-500/20">
            <Sparkles size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">Article Generator</h2>
            <p className="text-sm text-slate-400 mt-1">Hasilkan konten artikel berkualitas berdasarkan topik dan kata kunci AI.</p>
          </div>
        </div>
      </div>

      {/* SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 pb-6 gap-6 relative">
        
        {/* ================= AREA KIRI: CONFIGURATION ================= */}
        <div className="lg:col-span-5 space-y-6 max-h-[700px] overflow-y-auto pr-2 sticky top-32 custom-scrollbar">
          
          <div className="bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-700/50 pb-4">
              <Settings size={20} className="text-slate-400" />
              <h3 className="text-lg font-semibold text-white">Configure</h3>
            </div>
            
            <div className="flex flex-col gap-6">
              
              {/* ============== SECTION TOPIK ============== */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Selected Topics
                </label>
                
                {/* 1. Selected Box */}
                <div className="flex flex-wrap gap-2 p-3 bg-[#02040F] border border-slate-700/50 rounded-lg min-h-[56px] transition-all focus-within:border-blue-500/50">
                  {formData.topics.length === 0 && !topicInputValue && (
                    <span className="text-sm text-slate-600 my-auto italic">Pilih dari daftar di bawah...</span>
                  )}
                  {formData.topics.map(name => {
                    // Cari data asli untuk mengambil count-nya
                    const topicData = topicPool.find(t => t.name === name);
                    const count = topicData?.article_count || 0;
                    
                    return (
                      <button 
                        key={`sel-topic-${name}`}
                        onClick={() => toggleTopic(name)}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-all active:scale-95 group ${getColorClass(name, "topic")}`}
                      >
                        {name}
                        {/* 🔥 BADGE ANGKA (SELECTED) */}
                        <span className="text-[9px] opacity-60">({count})</span>
                        <X size={12} className="opacity-60 group-hover:opacity-100" />
                      </button>
                    )
                  })}
                  <input 
                    type="text"
                    value={topicInputValue}
                    onChange={(e) => setTopicInputValue(e.target.value)}
                    onKeyDown={(e) => handleManualAdd(e, topicInputValue, setTopicInputValue, toggleTopic, formData.topics)}
                    placeholder={formData.topics.length === 0 ? "" : "Ketik manual..."}
                    className="flex-1 bg-transparent text-sm text-slate-200 outline-none min-w-[120px]"
                  />
                </div>

                {/* 2. Waiting List Box (Suggestion) */}
                <div className="p-3 bg-[#02040F]/50 border border-slate-800 border-dashed rounded-lg">
                  
                  {/* FILTER & SORT */}
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800/50 pb-2">
                    <span className="text-[10px] text-slate-500 font-medium uppercase">List of Topics</span>
                    <div className="flex items-center gap-2">
                      {/* Sort Dropdown */}
                      <select 
                        value={topicSort} 
                        onChange={(e) => setTopicSort(e.target.value as any)}
                        className="bg-[#0A0E1A] text-[10px] text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 outline-none cursor-pointer hover:border-slate-500 transition-colors"
                      >
                        <option value="rec">Recommended</option>
                        <option value="count_desc">Highest Count</option>
                        <option value="count_asc">Lowest Count</option>
                        <option value="name_asc">A - Z</option>
                        <option value="name_desc">Z - A</option>
                      </select>
                      
                      {/* Limit Dropdown */}
                      <select 
                        value={topicLimit} 
                        onChange={(e) => setTopicLimit(e.target.value === "all" ? "all" : Number(e.target.value))}
                        className="bg-[#0A0E1A] text-[10px] text-slate-400 border border-slate-700 rounded px-1.5 py-0.5 outline-none cursor-pointer hover:border-slate-500 transition-colors"
                      >
                        <option value={5}>Top 5</option>
                        <option value={10}>Top 10</option>
                        <option value={50}>Top 50</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                  </div>

                  {isFetchingTags ? (
                    <div className="flex gap-2 animate-pulse mt-2">
                      <div className="h-6 w-20 bg-slate-800/50 rounded-full border border-slate-700/30"></div>
                      <div className="h-6 w-24 bg-slate-800/50 rounded-full border border-slate-700/30"></div>
                    </div>
                  ) : suggestedTopics.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {suggestedTopics.map(t => (
                        <button 
                          key={`sug-topic-${t.id}`}
                          onClick={() => toggleTopic(t.name)}
                          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-all active:scale-95 ${
                            t.color === "green"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50"
                              : "bg-slate-900/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-500"
                          }`}
                        >
                          <Plus size={12} /> {t.name}
                          
                          {/* BADGE ANGKA */}
                          <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            t.color === "green" ? "bg-emerald-500/20 text-emerald-300" : "bg-black/40 text-slate-400"
                          }`}>
                            {t.article_count || 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic mt-2 block">Semua topik pada filter ini telah dipilih.</span>
                  )}
                </div>
              </div>

              {/* ============== SECTION KEYWORD ============== */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                  <span>Selected Keywords</span>
                  {formData.topics.length === 0 && <span className="text-red-400/80 normal-case italic">*Pilih topik dulu</span>}
                </label>
                
                {/* Selected Box */}
                <div className="flex flex-wrap gap-2 p-3 bg-[#02040F] border border-slate-700/50 rounded-lg min-h-[56px] transition-all focus-within:border-[#E59500]/50">
                  {formData.keywords.length === 0 && !keywordInputValue && (
                    <span className="text-sm text-slate-600 my-auto italic">Pilih dari daftar di bawah...</span>
                  )}
                  {formData.keywords.map(name => (
                    <button 
                      key={`sel-kw-${name}`}
                      onClick={() => toggleKeyword(name)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-all active:scale-95 group ${getColorClass(name, "keyword")}`}
                    >
                      {name}
                      <X size={12} className="opacity-60 group-hover:opacity-100" />
                    </button>
                  ))}
                  <input 
                    type="text"
                    value={keywordInputValue}
                    onChange={(e) => setKeywordInputValue(e.target.value)}
                    onKeyDown={(e) => handleManualAdd(e, keywordInputValue, setKeywordInputValue, toggleKeyword, formData.keywords)}
                    placeholder={formData.keywords.length === 0 ? "" : "Ketik manual..."}
                    className="flex-1 bg-transparent text-sm text-slate-200 outline-none min-w-[120px]"
                  />
                </div>

                {/* Waiting List Box (Suggestion) */}
                <div className={`p-3 bg-[#02040F]/50 border border-slate-800 border-dashed rounded-lg transition-opacity ${formData.topics.length === 0 ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                  <span className="text-[10px] text-slate-500 block mb  -2 font-medium uppercase">List of Keywords (By Topics)</span>
                  {suggestedKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {suggestedKeywords.map(kw => (
                        <button 
                          key={`sug-kw-${kw}`}
                          onClick={() => toggleKeyword(kw)}
                          className="flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-slate-700 text-slate-400 bg-slate-900/50 hover:bg-[#E59500]/20 hover:text-[#E59500] hover:border-[#E59500]/50 transition-all active:scale-95"
                        >
                          <Plus size={12} /> {kw}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">
                      {formData.topics.length === 0 ? "Menunggu topik dipilih..." : "Tidak ada rekomendasi tersisa."}
                    </span>
                  )}
                </div>
              </div>

              {/* ============== Selection Model ============== */}
              <div className="space-y-1 mt-2 relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Selected Model</label>
                
                {/* Custom Combobox Input */}
                <div className="relative">
                  <input 
                    type="text"
                    name="model"
                    value={formData.model} 
                    onChange={handleInputChange}
                    onFocus={() => setIsModelDropdownOpen(true)}
                    // Delay onBlur sedikit agar klik pada dropdown sempat tereksekusi
                    onBlur={() => setIsModelDropdownOpen(false)} 
                    placeholder="Ketik model custom atau pilih..."
                    className="w-full bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-3 outline-none focus:border-[#E59500] transition-colors pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 ${isModelDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {/* Floating Dropdown */}
                {isModelDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-[#0A0E1A] border border-slate-700 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {PREDEFINED_MODELS.map((model) => (
                        <div
                          key={model.value}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData(prev => ({ ...prev, model: model.value }));
                            setIsModelDropdownOpen(false);
                          }}
                          className="px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-[#E59500] cursor-pointer transition-colors border-b border-slate-800/50 last:border-0 flex justify-between items-center"
                        >
                          <span>{model.label}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{model.value}</span>
                        </div>
                      ))}
                      
                      {/* Indikator Jika Mengetik Model Custom */}
                      {!PREDEFINED_MODELS.find(m => m.value === formData.model) && formData.model.trim() !== "" && (
                        <div className="px-4 py-2.5 text-sm text-emerald-400 bg-emerald-500/10 border-t border-emerald-500/20 italic">
                          Menggunakan model kustom: "{formData.model}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Input Api Key */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                  <span>API Key Model</span>
                  {/* Peringatan akan muncul jika input kosong */}
                  {formData.model_api_key.trim() === "" && <span className="text-red-400/80 normal-case italic">*Wajib diisi</span>}
                </label>
                
                <div className="relative">
                  {/* Ikon Gembok (Sisi Kiri) */}
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  
                  <input 
                    type={showApiKeyModel ? "text" : "password"} 
                    name="model_api_key"
                    required
                    value={formData.model_api_key}
                    onChange={handleInputChange}
                    placeholder="sk-..." 
                    className="w-full bg-[#02040F] border border-slate-700 text-slate-200 pl-10 pr-10 py-2.5 text-sm rounded-lg focus:border-[#E59500] outline-none transition-colors placeholder:text-slate-600"
                  />

                  {/* 🔥 TOGGLER IKON MATA (Sisi Kanan Dalam Input Box) */}
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModel(!showApiKeyModel)} // Pastikan nama state pembuka selaras
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  >
                    {showApiKeyModel ? (
                      <EyeOff size={16} className="animate-in fade-in duration-200" />
                    ) : (
                      <Eye size={16} className="animate-in fade-in duration-200" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* Custom Prompt */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Custom Prompt (Optional)</label>
                <textarea 
                  name="prompt"
                  value={formData.prompt} 
                  onChange={handleInputChange} 
                  placeholder="Tambahkan instruksi khusus untuk AI..." 
                  className="w-full h-24 bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-3 focus:border-[#E59500] outline-none transition-colors"
                />
              </div>

            </div>
            
            {/* TOMBOL EKSEKUSI */}
            <button 
              onClick={() => setIsConfirmOpen(true)}
              disabled={isLoading || isFetchingTags || formData.topics.length === 0 || formData.model_api_key.trim() === ""}
              className="mt-8 w-full flex items-center justify-center gap-2 bg-[#E59500] hover:bg-[#E59500]/90 text-[#02040F] font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(229,149,0,0.3)] hover:shadow-[0_0_25px_rgba(229,149,0,0.5)] disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#02040F]/30 border-t-[#02040F] rounded-full animate-spin" />
                  <span>Generating Article...</span>
                </>
              ) : (
                <>
                  <Play size={18} className="fill-current" />
                  <span>Execute Generate</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ================= AREA KANAN: RESULT ================= */}
        <div className="lg:col-span-7 bg-[#0A0E1A]/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 shadow-xl flex flex-col min-h-[600px]">
          <div className="flex items-center justify-between mb-6 border-b border-slate-700/50 pb-4">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-purple-400" />
              <h3 className="text-xl font-semibold text-white">Result</h3>
            </div>
            
            {isLoading ? (
              <span className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20 rounded-full animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                Generating
              </span>
            ) : generateResult ? (
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
                <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[#E59500] animate-pulse" size={24} />
              </div>
              <p className="animate-pulse tracking-wide">AI sedang berpikir, dan menulis artikel...</p>
            </div>
          )}

          {/* Kondisi 2: State Awal (Belum ada aksi) */}
          {!isLoading && !generateResult && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 opacity-60">
              <FileText size={48} strokeWidth={1} />
              <p className="text-sm">Silakan konfigurasikan parameter di sebelah kiri dan tekan Execute.</p>
            </div>
          )}

          {/* Kondisi 3: Error */}
          {!isLoading && generateResult?.error && (
            <div className="flex-1 flex flex-col items-center justify-center text-red-400 space-y-3 bg-red-950/10 rounded-xl border border-red-900/30 p-6 text-center">
              <AlertCircle size={40} className="text-red-500 mb-2" />
              <h4 className="font-semibold text-lg text-red-300">Proses Gagal</h4>
              <p className="text-sm text-red-400/80">{generateResult.message}</p>
            </div>
          )}
          
          {/* Kondisi  4: Sukses Render Data */}
          {!isLoading && generateResult && !generateResult.error && generateResult.status === "success" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">

              {/* 1. HIGHLIGHT BANNER */}
              <div className="flex flex-col items-center justify-center py-6 bg-emerald-950/30 rounded-xl border border-emerald-500/20 mb-6 text-center px-4 relative overflow-hidden">
                {/* Efek Glow Latar Belakang */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none" />
                
                <CheckCircle2 size={40} className="text-emerald-400 mb-3 relative z-10" />
                <h4 className="text-lg font-bold text-emerald-300 mb-1 relative z-10">
                  {generateResult?.status === "success" ? "Eksekusi Sukses" : "Proses Selesai"}
                </h4>
                <p className="text-sm text-emerald-400/80 relative z-10">
                  {generateResult?.message}
                </p>
              </div>

              {/* JUDUL ARTIKEL */}
              <div className="bg-[#002642]/60 p-5 rounded-2xl border border-blue-500/20 shadow-inner flex-1 flex flex-col transition-all">
                <EditableTitleBox 
                  initialTitle={generateResult.data?.title || "Initial Title"}
                  titleText="Title Article"
                />
              </div>

              {/* KONTEN ARTIKEL */}
              <EditableContentBox
                initialContent={generateResult.data?.content || "Initial Content"}
                titleText="Content Article"
              />

            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleGenerateExecute}
        title="Generate Article Confirmation"
        message={`Apakah Anda yakin ingin menginstruksikan AI untuk menulis artikel berdasarkan ${formData.topics.length} topik dan ${formData.keywords.length} kata kunci yang dipilih? Proses ini mungkin memakan waktu beberapa detik.`}
        confirmText="Ya, Eksekusi"
        icon={<Sparkles size={24} />}
      >
        {/* Kotak Ringkasan Data yang Diinput User */}
        <div className="bg-[#02040F] border border-slate-800 rounded-xl p-4 space-y-4">
          
          {/* Baris 1: Model */}
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Model</span>
            <span className="text-sm font-bold text-[#E59500] bg-[#E59500]/10 px-2 py-0.5 rounded border border-[#E59500]/20">
              {formData.model}
            </span>
          </div>

          {/* Baris 2: Topics */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Topik Terpilih ({formData.topics.length})</span>
            <div className="flex flex-wrap gap-1.5">
              {formData.topics.map(t => (
                <span key={`mod-t-${t}`} className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full text-xs">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Baris 3: Keywords */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Kata Kunci ({formData.keywords.length})</span>
            <div className="flex flex-wrap gap-1.5">
              {formData.keywords.length > 0 ? formData.keywords.map(k => (
                <span key={`mod-k-${k}`} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs">
                  {k}
                </span>
              )) : (
                <span className="text-xs text-slate-600 italic">Tidak ada kata kunci spesifik</span>
              )}
            </div>
          </div>

          {/* Baris 4: Prompt (Jika Ada) */}
          {formData.prompt.trim() !== "" && (
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Custom Prompt</span>
              <div className="bg-[#0A0E1A] border border-slate-800 p-2.5 rounded-lg text-xs text-slate-400 italic line-clamp-3">
                "{formData.prompt}"
              </div>
            </div>
          )}
        </div>
      </ConfirmationModal>

    </div>
  );
}