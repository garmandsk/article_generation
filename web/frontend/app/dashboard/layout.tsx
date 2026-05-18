"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { Home, Pickaxe, Network, FileOutput, LogOut, ChevronLeft, ChevronRight, History, X, Activity } from "lucide-react"; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRIghtSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", icon: Home, path: "/dashboard" },
    { name: "Scrap", icon: Pickaxe, path: "/dashboard/scrap" },
    { name: "Cluster", icon: Network, path: "/dashboard/cluster" },
    { name: "Generate", icon: FileOutput, path: "/dashboard/generate" },
  ];

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

  return (
    // Warna dasar kanvas (Paling gelap)
    <div className="flex h-screen bg-[#02040F] text-[#E5DADA] font-sans overflow-hidden">
      
      {/* --- Left Sidebar --- */}
      <aside 
        className={`${isLeftSidebarOpen ? "w-64" : "w-20"} transition-all duration-300 ease-in-out bg-[#002642] flex flex-col justify-between border-r border-slate-700/50 z-20`}
      >
        <div>
          {/* Logo Area */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/50">
            {isLeftSidebarOpen && <span className="text-2xl font-bold tracking-wider text-white">AGC</span>}
            <button 
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              className="p-1 rounded-md hover:bg-slate-700/50 text-slate-300 transition-colors"
            >
              {isLeftSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} className="mx-auto" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex flex-col gap-2 px-3">
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
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-700/50">
           <button 
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-3 w-full rounded-lg text-red-500 hover:bg-red-500/10 transition-all ${!isLeftSidebarOpen && "justify-center"}`}
           >
              <LogOut size={20} />
              {isLeftSidebarOpen && <span>Log Out</span>}
           </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col relative">
        {/* Header / Topbar */}
        <header className="h-16 m-4 bg-[#002642]/50 backdrop-blur-md border-b border-slate-700/50 rounded-xl flex items-center justify-between px-8 z-10 shadow-lg">
            {/* Breadcrumb */}
            <h1 className="text-xl font-semibold capitalize text-white flex items-center gap-2">
                {pathname.split('/').pop() || 'Dashboard'}
            </h1>

            {/* Tombol riwayat/log */}
            <button
              onClick={() => setIsRightSidebarOpen(!isRIghtSidebarOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isRIghtSidebarOpen 
                ? "bg-[#E59500] text-[#02040F] shadow-lg" 
                : "bg-[#02040F] border border-slate-700 text-slate-300 hover:border-[#E59500]/50 hover:text-white" 
              }`}
            >
              <Activity size={18} />
              <span className={`text-sm`}>Logs & History</span>
            </button>
        </header>

        {/* Bagian tengah/Konten utama */}
        <main className="flex-1 m-4 overflow-y-auto">
            {children} 
        </main>
      </div>

      {/* Right Sidebar */}
      {/* Logika CSS: 
        - Kita beri margin (my-4 mr-4) dan border-radius bulat (rounded-2xl) agar terlihat melayang (Floating) dan tidak menempel kaku di ujung layar.
        - Lebarnya 80 (w-80). Jika ditutup, margin dan lebarnya menjadi 0 agar menghilang dengan mulus.
      */}
      <aside
        className={`font-mono ${
          isRIghtSidebarOpen
          ? "w-80 ml-4 mr-4 my-4 opacity-100"
          : "w-0 m-0 opacity-0 overflow-hidden"  
        } transition-all duration-300 ease-in-out bg-[#002642]/80 backdrop-blue-xl border border-slate-700/50 rounded-2xl flex flex-col shadow-2xl relative z-20`}
      >
        {/* Header */}
        <div className={`p-4 border-b border-slate-700/50 flex items-center justify-between`}>
          <h3 className={`font-semibold text-white flex items-center gap-2`}>
            <History size={18} className="text-[#E59500]"/>
            System Logs
          </h3>
          <button
            onClick={() => setIsRightSidebarOpen(false)}
            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Contoh Item Log Sukses */}
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-sm font-medium text-emerald-400">Scraping Selesai</p>
            <p className="text-xs text-slate-300 mt-1">12 artikel berhasil ditarik ke database.</p>
            <p className="text-[10px] text-slate-500 mt-2">10:45 WIB</p>
          </div>

          {/* Contoh Item Log Generasi (Artikel) */}
          <div className="p-3 bg-[#02040F]/60 border border-slate-700 rounded-lg cursor-pointer hover:border-[#E59500]/50 transition-colors">
            <p className="text-sm font-medium text-slate-200 line-clamp-2">Sinergi Cloud, AI, dan IoT dalam Industri...</p>
            <p className="text-[10px] text-slate-500 mt-2">Generate • 09:12 WIB</p>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-sm font-medium text-emerald-400">Scraping Selesai</p>
            <p className="text-xs text-slate-300 mt-1">12 artikel berhasil ditarik ke database.</p>
            <p className="text-[10px] text-slate-500 mt-2">10:45 WIB</p>
          </div>

          {/* Contoh Item Log Generasi (Artikel) */}
          <div className="p-3 bg-[#02040F]/60 border border-slate-700 rounded-lg cursor-pointer hover:border-[#E59500]/50 transition-colors">
            <p className="text-sm font-medium text-slate-200 line-clamp-2">Sinergi Cloud, AI, dan IoT dalam Industri...</p>
            <p className="text-[10px] text-slate-500 mt-2">Generate • 09:12 WIB</p>
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-sm font-medium text-emerald-400">Scraping Selesai</p>
            <p className="text-xs text-slate-300 mt-1">12 artikel berhasil ditarik ke database.</p>
            <p className="text-[10px] text-slate-500 mt-2">10:45 WIB</p>
          </div>

          {/* Contoh Item Log Generasi (Artikel) */}
          <div className="p-3 bg-[#02040F]/60 border border-slate-700 rounded-lg cursor-pointer hover:border-[#E59500]/50 transition-colors">
            <p className="text-sm font-medium text-slate-200 line-clamp-2">Sinergi Cloud, AI, dan IoT dalam Industri...</p>
            <p className="text-[10px] text-slate-500 mt-2">Generate • 09:12 WIB</p>
          </div>
        </div>
      </aside>

    </div>
  );
}