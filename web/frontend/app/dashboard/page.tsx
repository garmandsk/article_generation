"use client";

import { sysLog } from "@/utils/logger";

export default function HomePage() {

  const handleLogging= () => {
    sysLog("info", "Memulai inisialisasi scraping ke e-learning...");

    setTimeout(() => {
      sysLog("warning", "Mencoba bypass sesi dengan token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI...");
    }, 1000);

    // 🔥 UJI COBA KEBOCORAN API KEY (Harusnya tersensor otomatis)
    setTimeout(() => {
      sysLog("success", "Koneksi ke LLM berhasil. Menggunakan kunci: sk-proj-928347abdcdefghijklmnopq");
    }, 2000);

    // 🔥 UJI COBA KEBOCORAN EMAIL (Harusnya tersensor otomatis)
    setTimeout(() => {
      sysLog("error", "Data terdeteksi milik dosen dengan kontak dosen.killer@universitas.ac.id");
    }, 3000);
  }

  return (
    // Card besar untuk meniru area konten
    <div className="bg-[#002642]/30 border border-slate-700/50 w-full h-full rounded-2xl p-8 shadow-xl min-h-[500px] flex flex-col items-center justify-center">
      <h2 className="text-3xl font-bold text-[#E59500] mb-4">
        Selamat Datang di Dashboard Home!
      </h2>
      <p className="text-slate-300">
        Ini adalah area konten. Sidebar dan Header di sekelilingnya adalah Layout utama kita yang tetap diam di tempat.
      </p>
      <button 
        onClick={handleLogging}
        className="px-6 py-3 bg-[#E59500] hover:bg-[#ffb020] text-black font-bold rounded-lg shadow-lg transition-all active:scale-95"
      >
        Tembak Log Sensitif!
      </button>
    </div>
  );
}