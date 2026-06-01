import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    // min-h-screen memastikan layout memenuhi layar dari atas ke bawah
    <div className="min-h-screen flex flex-col font-sans">
      
      {/* --- HEADER --- */}
      <header className="bg-[#840032] text-white py-6 px-8 md:px-16 shadow-md z-10">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Article Generation & Clustering
        </h1>
      </header>

      {/* --- MAIN HERO SECTION --- */}
      {/* flex-1 membuat area ini mengisi seluruh sisa ruang kosong di tengah */}
      <main className="flex-1 bg-[#002642] flex items-center justify-center p-8 md:p-16">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* KOLOM KIRI: Teks & Tombol */}
          <div className="flex flex-col items-start space-y-10">
            <h2 className="text-4xl md:text-5xl lg:text-[56px] font-semibold text-white leading-[1.15] tracking-tight">
              Welcome to <span className="text-[#E59500]">AGC.</span> This is an application made for Article Generation and Clustering
            </h2>
            
            <Link href="/login">
              <button className="bg-[#E59500] hover:bg-[#c98200] text-white text-2xl font-bold py-3 px-12 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl">
                Login
              </button>
            </Link>
          </div>

          {/* KOLOM KANAN: Frame Diagram */}
          <div className="relative w-full aspect-square flex items-center justify-center border border-[#E5DADA]/20 rounded-sm p-4">
            <Image 
              src="/diagram.svg" 
              alt="Architecture Diagram" 
              fill 
              className="object-contain p-4"
            />
          </div>

        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-[#840032] text-white py-5 px-8 md:px-16 text-lg tracking-wide">
        <p><span className="text-[#E59500] font-bold">AGC</span> by Anak Magang Telkom</p>
      </footer>
      
    </div>
  );
}