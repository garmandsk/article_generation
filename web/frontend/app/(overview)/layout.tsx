"use client";

import { useState} from "react";
import { usePathname } from "next/navigation";
import { Activity } from "lucide-react"; 
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const [isRIghtSidebarOpen, setIsRightSidebarOpen] = useState(false);
  
  return (
    // Warna dasar kanvas (Paling gelap)
    <div className="flex h-screen bg-[#02040F] text-[#E5DADA] font-sans ">
      
      {/* --- LEFT SIDEBAR --- */}
      <LeftSidebar />

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col relative p-5">
        {/* Header / Topbar */}
        <header className="h-15 bg-[#002642]/50 backdrop-blur-md border-b border-slate-700/50 rounded-xl flex items-center justify-between px-8 z-10 shadow-lg">
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
        <main className="flex-1 overflow-y-auto mt-6">
            {children} 
        </main>
      </div>

      {/* RIGHT SIDEBAR */}
      <RightSidebar isOpen={isRIghtSidebarOpen} />

    </div>
  );
}