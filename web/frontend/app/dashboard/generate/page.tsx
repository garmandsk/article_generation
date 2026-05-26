"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  FileText, Settings, Zap, BadgeCheck, Network, 
  Sparkles, Play, CheckCircle2, Clock, AlertCircle, 
  Plus, X, ChevronDown, Lock, EyeOff, Eye, Check, Copy,
  Pencil
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TopicData } from "@/types/types";
import { sysLog } from "@/utils/logger";
import ConfirmationModal from "@/components/ConfirmationModal";

export default function GeneratePage() {
  // 1. Data Mentah dari Backend (Pool)
  const [topicPool, setTopicPool] = useState<TopicData[]>([]);
  
  // 2. State Pilihan Pengguna (Hanya menyimpan nama string)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  
  // State Konfigurasi Tambahan
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3-flash-preview");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false); // <-- Tambahkan ini

  const [apiKeyModel, setApiKeyModel] = useState("")
  const [showApiKeyModel, setShowApiKeyModel] = useState(false)

  // State Kontrol Layar
  const [isFetchingTags, setIsFetchingTags] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [generateResult, setGenerateResult] = useState<any | null>(null);

  // Input Teks Manual
  const [topicInputValue, setTopicInputValue] = useState("");
  const [keywordInputValue, setKeywordInputValue] = useState("");

  // Modal konfirmasi
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // State tombol copy
  const [isTitleCopied, setIsTitleCopied] = useState(false);
  const [isContentCopied, setIsContentCopied] = useState(false);

  // State editing
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");

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
    return topicPool.filter(t => !selectedTopics.includes(t.name));
  }, [topicPool, selectedTopics]);

  // B. Mengumpulkan Keyword Daftar Tunggu (Hanya dari Topik yang TERPILIH)
  const suggestedKeywords = useMemo(() => {
    const activeTopics = topicPool.filter(t => selectedTopics.includes(t.name));
    const keywordSet = new Set<string>();
    
    activeTopics.forEach(t => {
      t.keywords?.forEach(kw => keywordSet.add(kw));
    });

    // Jangan tampilkan keyword di daftar tunggu jika sudah dipilih
    return Array.from(keywordSet).filter(kw => !selectedKeywords.includes(kw));
  }, [topicPool, selectedTopics, selectedKeywords]);

  // ================= HANDLERS INTERAKSI BUBBLE =================
  const toggleTopic = (name: string) => {
    if (selectedTopics.includes(name)) {
      // Hapus topik
      setSelectedTopics(prev => prev.filter(t => t !== name));
      
      // OPTIONAL: Bersihkan keyword otomatis yang terkait dengan topik ini jika mau
      // Di sini kita biarkan keyword yang sudah terpilih tetap ada, kecuali di-klik manual.
    } else {
      // Tambah topik
      setSelectedTopics(prev => [...prev, name]);
    }
  };

  const toggleKeyword = (name: string) => {
    if (selectedKeywords.includes(name)) {
      setSelectedKeywords(prev => prev.filter(k => k !== name));
    } else {
      setSelectedKeywords(prev => [...prev, name]);
    }
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
    let exec_time = "0";

    setIsLoading(true);
    setGenerateResult(null);
    sysLog("info", "Memulai proses Generate Artikel AI...", exec_time);

    const payload = {
      topics: selectedTopics,
      keywords: selectedKeywords,
      prompt: prompt,
      model: selectedModel,
      model_api_key: apiKeyModel
    };

    try {
      const response = await fetch("http://localhost:8000/api/v1/run/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      await new Promise(resolve => setTimeout(resolve, 2500)); 
      const result = await response.json();

      console.log("result", result);

      setGenerateResult(result);
      setEditedContent(result.data?.content);

      sysLog("success", "Artikel berhasil di-generate.", result.exec_time);

    } catch (error) {
      sysLog("error", `Gagal memproses AI: ${error}`, exec_time);
      setGenerateResult({ error: true, message: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyTitle = async () => {
    let exec_time = "0";
    if (!generateResult?.data?.title) return;
    try {
      await navigator.clipboard.writeText(generateResult.data.title)
      setIsTitleCopied(true);
      setTimeout(() => setIsTitleCopied(false), 2000);
      sysLog("success", "Judul disalin ke clipboard!", exec_time);
    } catch (error) {
      sysLog("error", "Gagal menyalin judul.", exec_time)
    }
  }

  const handleCopyContent = async () => {
    let exec_time = "0";
    if (!generateResult?.data?.content) return;
    try {
      await navigator.clipboard.writeText(generateResult.data.content)
      setIsContentCopied(true);
      setTimeout(() => setIsContentCopied(false), 2000);
      sysLog("success", "Konten disalin ke clipboard!", exec_time);
    } catch (error) {
      sysLog("error", "Gagal menyalin konten.", exec_time)
    }
  }

  // Inisialisasi Tiptap editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editable: isEditing,
    onUpdate: ({ editor }) => {
      // Sinkronisasi setiap ada perubahan
    },
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const handleSaveEdit = () => {
    let exec_time = "0";
    
    if (contentRef.current) {
      const newContent = contentRef.current.innerText; // Mengambil teks hasil edit
      setEditedContent(newContent);
      setIsEditing(false);
      sysLog("success", "Perubahan tersimpan secara lokal.", exec_time);
    }
  };

  // ================= FETCHING DATA =================
  useEffect(() => {
    const fetchInitialData = async () => {
      let exec_time = "0";
      sysLog("info", "Mencoba mengambil data topik dan keywords dari backend", exec_time)

      setIsFetchingTags(true);
      try {
        const response = await fetch("http://localhost:8000/api/v1/data/cluster", {
          credentials: "include"
        });
        const result = await response.json();

        if (result && result.status === "success" && result.data?.topics) {
          setTopicPool(result.data.topics);
          sysLog("success", "Sukses menarik data topics dan keywords dari backend", result.exec_time)
        }
      } catch (error) {
        sysLog("error", "Gagal menarik data topics dan keywords dari backend.", exec_time);
      } finally {
        setIsFetchingTags(false);
      }
    };
    fetchInitialData();
  }, []);

  // Editing
  useEffect(() => {
    if (editor && generateResult?.data?.content) {
      editor.commands.setContent(generateResult.data.content);
    }
  }, [generateResult, editor]);

  useEffect(() => {
    editor?.setEditable(isEditing);
  }, [isEditing, editor])

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 relative pb-10">

      {/* HEADER STICKY */}
      <div className="sticky top-0 z-50 bg-[#002642]/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-md flex items-center justify-between">
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
                
                {/* Selected Box */}
                <div className="flex flex-wrap gap-2 p-3 bg-[#02040F] border border-slate-700/50 rounded-lg min-h-[56px] transition-all focus-within:border-blue-500/50">
                  {selectedTopics.length === 0 && !topicInputValue && (
                    <span className="text-sm text-slate-600 my-auto italic">Pilih dari daftar di bawah...</span>
                  )}
                  {selectedTopics.map(name => (
                    <button 
                      key={`sel-topic-${name}`}
                      onClick={() => toggleTopic(name)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-all active:scale-95 group ${getColorClass(name, "topic")}`}
                    >
                      {name}
                      <X size={12} className="opacity-60 group-hover:opacity-100" />
                    </button>
                  ))}
                  <input 
                    type="text"
                    value={topicInputValue}
                    onChange={(e) => setTopicInputValue(e.target.value)}
                    onKeyDown={(e) => handleManualAdd(e, topicInputValue, setTopicInputValue, toggleTopic, selectedTopics)}
                    placeholder={selectedTopics.length === 0 ? "" : "Ketik manual..."}
                    className="flex-1 bg-transparent text-sm text-slate-200 outline-none min-w-[120px]"
                  />
                </div>

                {/* Waiting List Box (Suggestion) */}
                <div className="p-3 bg-[#02040F]/50 border border-slate-800 border-dashed rounded-lg">
                  <span className="text-[10px] text-slate-500 block mb-2 font-medium uppercase">list of topics</span>
                  {isFetchingTags ? (
                    <div className="flex gap-2 animate-pulse">
                      <div className="h-6 w-20 bg-slate-800/50 rounded-full border border-slate-700/30"></div>
                      <div className="h-6 w-24 bg-slate-800/50 rounded-full border border-slate-700/30"></div>
                    </div>
                  ) : suggestedTopics.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {suggestedTopics.map(t => (
                        <button 
                          key={`sug-topic-${t.id}`}
                          onClick={() => toggleTopic(t.name)}
                          className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border transition-all active:scale-95 ${
                            t.color === "green"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50" // Hijau untuk Recommended
                              : "bg-slate-900/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200 hover:border-slate-500" // Abu-abu untuk Default
                          }`}
                        >
                          <Plus size={12} /> {t.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">Semua topik telah dipilih.</span>
                  )}
                </div>
              </div>

              {/* ============== SECTION KEYWORD ============== */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                  <span>Selected Keywords</span>
                  {selectedTopics.length === 0 && <span className="text-red-400/80 normal-case italic">*Pilih topik dulu</span>}
                </label>
                
                {/* Selected Box */}
                <div className="flex flex-wrap gap-2 p-3 bg-[#02040F] border border-slate-700/50 rounded-lg min-h-[56px] transition-all focus-within:border-[#E59500]/50">
                  {selectedKeywords.length === 0 && !keywordInputValue && (
                    <span className="text-sm text-slate-600 my-auto italic">Pilih dari daftar di bawah...</span>
                  )}
                  {selectedKeywords.map(name => (
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
                    onKeyDown={(e) => handleManualAdd(e, keywordInputValue, setKeywordInputValue, toggleKeyword, selectedKeywords)}
                    placeholder={selectedKeywords.length === 0 ? "" : "Ketik manual..."}
                    className="flex-1 bg-transparent text-sm text-slate-200 outline-none min-w-[120px]"
                  />
                </div>

                {/* Waiting List Box (Suggestion) */}
                <div className={`p-3 bg-[#02040F]/50 border border-slate-800 border-dashed rounded-lg transition-opacity ${selectedTopics.length === 0 ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
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
                      {selectedTopics.length === 0 ? "Menunggu topik dipilih..." : "Tidak ada rekomendasi tersisa."}
                    </span>
                  )}
                </div>
              </div>

              {/* ============== SECTION LAINNYA ============== */}
              <div className="space-y-1 mt-2 relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Selected Model</label>
                
                {/* Custom Combobox Input */}
                <div className="relative">
                  <input 
                    type="text"
                    value={selectedModel} 
                    onChange={(e) => setSelectedModel(e.target.value)}
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
                            setSelectedModel(model.value);
                            setIsModelDropdownOpen(false);
                          }}
                          className="px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-[#E59500] cursor-pointer transition-colors border-b border-slate-800/50 last:border-0 flex justify-between items-center"
                        >
                          <span>{model.label}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{model.value}</span>
                        </div>
                      ))}
                      
                      {/* Indikator Jika Mengetik Model Custom */}
                      {!PREDEFINED_MODELS.find(m => m.value === selectedModel) && selectedModel.trim() !== "" && (
                        <div className="px-4 py-2.5 text-sm text-emerald-400 bg-emerald-500/10 border-t border-emerald-500/20 italic">
                          Menggunakan model kustom: "{selectedModel}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Input Api Key */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  API Key Model
                </label>
                
                <div className="relative">
                  {/* Ikon Gembok (Sisi Kiri) */}
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  
                  <input 
                    type={showApiKeyModel ? "text" : "password"} 
                    required
                    value={apiKeyModel}
                    onChange={(e) => setApiKeyModel(e.target.value)}
                    placeholder="sk-..." 
                    className="w-full bg-[#02040F] border border-slate-700 text-slate-200 pl-10 pr-10 py-2.5 text-sm rounded-lg focus:border-[#E59500] outline-none transition-colors placeholder:text-slate-600"
                    
                    // Event pengujian tetap aman di sini
                    // onPaste={(e) => console.log("User melakukan Paste:", e.clipboardData.getData('text'))}
                    // onCopy={() => console.log("User melakukan Copy")}
                    // onCut={() => console.log("User melakukan Cut")}
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
                  value={prompt} 
                  onChange={(e) => setPrompt(e.target.value)} 
                  placeholder="Tambahkan instruksi khusus untuk AI..." 
                  className="w-full h-24 bg-[#02040F] border border-slate-700 text-slate-200 text-sm rounded-lg p-3 focus:border-[#E59500] outline-none transition-colors"
                />
              </div>

            </div>
            
            {/* TOMBOL EKSEKUSI */}
            <button 
              onClick={() => setIsConfirmOpen(true)}
              disabled={isLoading || isFetchingTags || selectedTopics.length === 0}
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
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 flex-1 flex flex-col justify-center">

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
              <div className="bg-[#002642]/60 p-5 rounded-2xl border border-blue-500/20 shadow-inner flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Title Article</p>
                  
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isEditing ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    <Pencil size={12} /> {isEditing ? "Save Changes" : "Click to Edit"}
                  </button>

                  {/* 🔥 TOMBOL COPY: JUDUL */}
                  <button
                    onClick={handleCopyTitle}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
                      isTitleCopied 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" 
                        : "bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 active:scale-95"
                    }`}
                  >
                    {isTitleCopied ? <Check size={14} /> : <Copy size={14} />}
                    {isTitleCopied ? "Copied" : "Copy Title"}
                  </button>
                </div>
                
                <h4 className="text-xl font-black text-white leading-relaxed pr-2">
                  {generateResult.data.title}
                </h4>
              </div>

              {/* KONTEN ARTIKEL (DI-RENDER DENGAN MARKDOWN) */}
              <div className="bg-[#02040F] p-6 rounded-2xl border border-slate-700/50 shadow-inner flex-1 space-y-2 flex flex-col max-h-[500px]">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Content Article</p>
                  
                  {/* 🔥 TOMBOL COPY: KONTEN */}
                  <button
                    onClick={handleCopyContent}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
                      isContentCopied 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" 
                        : "bg-[#E59500] text-[#02040F] hover:bg-[#ffb020] active:scale-95"
                    }`}
                  >
                    {isContentCopied ? <Check size={14} /> : <Copy size={14} />}
                    {isContentCopied ? "Copied" : "Copy Content"}
                  </button>
                </div>
                
                {/* 🔥 PENGGUNAAN REACT MARKDOWN (Area Scroll) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <div
                    ref={contentRef}
                    contentEditable={isEditing}
                    suppressContentEditableWarning={true} 
                    className="prose prose-sm prose-invert max-w-none text-slate-200 font-serif
                    prose-headings:text-white prose-headings:font-bold
                    prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                    prose-p:leading-relaxed prose-p:mb-4
                    prose-a:text-[#E59500] prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-white prose-strong:font-bold
                    prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4
                    prose-li:mb-1
                    prose-blockquote:border-l-4 prose-blockquote:border-[#E59500] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-400
                  ">
                     {isEditing ? 
                      editedContent 
                      : 
                      <ReactMarkdown>{editedContent}</ReactMarkdown>}
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
        onConfirm={handleGenerateExecute}
        title="Generate Article Confirmation"
        message={`Apakah Anda yakin ingin menginstruksikan AI untuk menulis artikel berdasarkan ${selectedTopics.length} topik dan ${selectedKeywords.length} kata kunci yang dipilih? Proses ini mungkin memakan waktu beberapa detik.`}
        confirmText="Ya, Eksekusi"
        icon={<Sparkles size={24} />}
      >
        {/* Kotak Ringkasan Data yang Diinput User */}
        <div className="bg-[#02040F] border border-slate-800 rounded-xl p-4 space-y-4">
          
          {/* Baris 1: Model */}
          <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Model</span>
            <span className="text-sm font-bold text-[#E59500] bg-[#E59500]/10 px-2 py-0.5 rounded border border-[#E59500]/20">
              {selectedModel}
            </span>
          </div>

          {/* Baris 2: Topics */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Topik Terpilih ({selectedTopics.length})</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedTopics.map(t => (
                <span key={`mod-t-${t}`} className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full text-xs">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Baris 3: Keywords */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Kata Kunci ({selectedKeywords.length})</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedKeywords.length > 0 ? selectedKeywords.map(k => (
                <span key={`mod-k-${k}`} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs">
                  {k}
                </span>
              )) : (
                <span className="text-xs text-slate-600 italic">Tidak ada kata kunci spesifik</span>
              )}
            </div>
          </div>

          {/* Baris 4: Prompt (Jika Ada) */}
          {prompt.trim() !== "" && (
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Custom Prompt</span>
              <div className="bg-[#0A0E1A] border border-slate-800 p-2.5 rounded-lg text-xs text-slate-400 italic line-clamp-3">
                "{prompt}"
              </div>
            </div>
          )}
        </div>
      </ConfirmationModal>

    </div>
  );
}