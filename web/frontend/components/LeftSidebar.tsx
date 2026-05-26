import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Pickaxe, Network, Sparkles, FileOutput, LogOut, ChevronLeft, ChevronRight, X, Info } from "lucide-react"; 


export default function LeftSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true)

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [infoPage, setInfoPage] = useState(0);
  const [isInfoClosing, setIsInfoClosing] = useState(false);

  const menuItems = [
    { name: "Dashboard", icon: Home, path: "/dashboard" },
    { name: "Scrap", icon: Pickaxe, path: "/dashboard/scrap" },
    { name: "Cluster", icon: Network, path: "/dashboard/cluster" },
    { name: "Generate", icon: Sparkles, path: "/dashboard/generate" },
  ];

  // Data konten info
  const infoContent = [
    {
      title: "🚀 Selamat Datang di AGC Dashboard",
      icon: "🏠",
      desc: "Aplikasi ini dirancang untuk otomatisasi konten mulai dari penarikan data hingga penulisan artikel berbasis AI. Gunakan sidebar kiri untuk navigasi antar fitur utama.",
    },
    {
      title: "🕸️ Modul Scraping",
      icon: "📡",
      desc: "Di sini sistem akan menembus platform e-learning. Pastikan URL yang dimasukkan valid. Data ditarik secara background dan disimpan dalam format mentah (raw).",
    },
    {
      title: "🧠 Clustering AI",
      icon: "📂",
      desc: "Sistem akan menganalisis ribuan artikel mentah dan mengelompokkannya secara otomatis berdasarkan kemiripan makna menggunakan algoritma Machine Learning.",
    },
    {
      title: "✍️ Article Generator",
      icon: "🪄",
      desc: "Tahap akhir di mana AI akan meracik cluster data menjadi artikel baru yang unik, SEO-friendly, dan siap untuk dipublikasikan secara massal.",
    }
  ];
  
  const handleInfoClosing = () => {
    setIsInfoClosing(true);
    setTimeout(() => {
      setIsInfoOpen(false);
      setIsInfoClosing(false);
      setInfoPage(0);
    }, 300);
  };
  
  const handleLogout = async () => {
    try {
      const logoutAPI = "http://localhost:8000/api/v1/auth/logout"
      await fetch(logoutAPI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include"
      });
    } catch (error) {
      console.error("Gagal menghubungi server untuk logout: ", error);
    } finally {
      router.push("/login ")
    }
  }
  
  useEffect(() => {
    if (!isInfoOpen || isInfoClosing) return;

    const handleKey = (e: KeyboardEvent) => {

      // Saat arrow kanan ditekan
      if (e.key === "ArrowRight") {

        // saat pointer bukan di ujung kanan
        if (infoPage < infoContent.length - 1) setInfoPage((prev) => prev + 1);

        // saat pointer di ujung kanan
        else if (infoPage >= infoContent.length - 1) setInfoPage((prev) => prev - prev);
      } 
      
      //  saat arrow kiri ditekan
      else if (e.key === "ArrowLeft") {

        // saat pointer bukan di ujung kiri
        if (infoPage > 0) setInfoPage((prev) => prev - 1);

        // saat pointer di ujung kiri
        else if (infoPage <= 0) setInfoPage((prev) => (prev * 0) + infoContent.length - 1)
      } 
      
      // saat tombol esc, enter, spasi ditekan
      else if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        handleInfoClosing();
      }
    };

    window.addEventListener("keydown", handleKey);

    // Bersihkan listener saat tidak digunakan
    return () => window.removeEventListener("keydown", handleKey);
  }, [isInfoOpen, isInfoClosing, infoPage])
  

  return (
    <aside 
      className={`${isLeftSidebarOpen ? "w-64" : "w-20"} transition-all duration-300 ease-in-out bg-[#002642] flex flex-col justify-between border-r border-slate-700/50 z-20`}
    >

      {/* Toggler area */}
      <div className="h-20 flex items-center justify-between px-3 border-b border-slate-700/50">
        {isLeftSidebarOpen && <span className="text-2xl font-bold tracking-wider text-white">AGC</span>}
        <button 
          onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          className="p-1 rounded-md hover:bg-slate-700/50 text-slate-300 transition-colors"
        >
          {isLeftSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} className="mx-auto" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex-col gap-2 px-3 pt-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.name} 
              href={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                isActive 
                ? "bg-[#E59500] text-[#02040F] font-semibold shadow-lg" // Warna aksen emas jika aktif
                : "text-slate-300 hover:bg-[#840032]/40 hover:text-white" // Sedikit marun saat di-hover
              }`}
            >
              <item.icon size={20} className={!isLeftSidebarOpen ? "mx-auto" : ""} />
              {isLeftSidebarOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>
        
      {/* Bottom button */}
      <div className="p-3 border-t border-slate-700/50">
        
        {/* Info Button */}
        <button
          onClick={() => setIsInfoOpen(true)}
          className={`flex items-center gap-3 px-3 py-3 w-full rounded-lg text-slate-300 hover:bg-[#E59500]/10 hover:text-[#E59500] transition-all ${!isLeftSidebarOpen && "justify-center"}`}
        >
          <Info size={20} />
          {isLeftSidebarOpen && <span>Info</span>}
        </button>

        <a
          href="https://github.com/Garmandsk/article_generation.git"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-3 w-full rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-all ${!isLeftSidebarOpen && "justify-center"}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          {isLeftSidebarOpen && <span>Source Code</span>}
        </a>
        
        {/* Logout Button */}
        <button 
        onClick={handleLogout}
        className={`flex items-center gap-3 px-3 py-3 w-full rounded-lg text-red-500 hover:bg-red-500/10 transition-all ${!isLeftSidebarOpen && "justify-center"}`}
        >
          <LogOut size={20} />
          {isLeftSidebarOpen && <span>Log Out</span>}
        </button>
      </div>

      {/* MODAL INFO POPUP */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* 1. Backdrop dengan Animasi Fade-In */}
          <div 
            className={`absolute inset-0 bg-black/80 backdrop-blur-md fill-mode-forwards ${
              isInfoClosing
                ? "animate-out fade-out duration-300"
                : "animate-in fade-in duration-300"
              }`}
            onMouseDown={handleInfoClosing}
          />

          {/* 2. Modal Box dengan Animasi Zoom-In + Bounce */}
          <div className={`relative w-full max-w-lg bg-[#0A0E1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col fill-mode-forwards ${
            isInfoClosing 
              ? "animate-out zoom-out-95 fade-out slide-out-to-bottom-4 duration-300"
              : "animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300"
            }`}>
            
            {/* Glow Effect di pojok modal */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#E59500]/10 blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#E59500]/20 flex items-center justify-center text-[#E59500]">
                  <Info size={18} />
                </div>
                <span className="text-xs font-mono text-slate-500 tracking-widest uppercase">
                  Step {infoPage + 1} of {infoContent.length}
                </span>
              </div>
              <button onClick={handleInfoClosing} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Konten Berhalaman (Animasi Transisi Konten) */}
            <div className="p-8 text-center min-h-[280px] flex flex-col items-center justify-center relative z-10">
              <div key={infoPage} className="animate-in slide-in-from-right-8 fade-in duration-500">
                <div className="text-5xl mb-6">{infoContent[infoPage].icon}</div>
                <h2 className="text-2xl font-bold text-white mb-4">{infoContent[infoPage].title}</h2>
                <p className="text-slate-400 leading-relaxed text-sm">
                  {infoContent[infoPage].desc}
                </p>
              </div>
            </div>

            {/* Navigasi / Footer */}
            <div className="p-5 bg-white/5 flex items-center justify-between relative z-10">
              
              {/* Indikator Titik (Dots) */}
              <div className="flex gap-2 items-center">
                {infoContent.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setInfoPage(idx)}
                    aria-label={`pindah ke halaman ${idx + 1}`}
                    className={`h-3 w-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#E59500]/50 ${
                      idx === infoPage 
                        ? "w-6 bg-[#E59500]" 
                        : "w-1.5 bg-slate-700 hover:bg-slate-400 cursor-pointer"
                    }`}
                  />
                ))}
              </div>

              {/* Tombol Kontrol */}
              <div className="flex gap-2">
                {infoPage > 0 && (
                  <button 
                    onClick={() => setInfoPage(prev => prev - 1)}
                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    if (infoPage < infoContent.length - 1) {
                      setInfoPage(prev => prev + 1);
                    } else {
                      handleInfoClosing();
                    }
                  }}
                  className="px-6 py-2 bg-[#E59500] hover:bg-[#ffb020] text-black font-bold rounded-lg transition-all active:scale-95 shadow-lg shadow-[#E59500]/20"
                >
                  {infoPage === infoContent.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </aside>
  )
};