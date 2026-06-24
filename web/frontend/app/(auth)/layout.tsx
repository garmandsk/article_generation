import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Auth Page",
    default: "Auth Page"
  },
  description: "AGC Auth Page"
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    // Mengunci warna kanvas dasar dan mengaktifkan flex arah kolom
    <div className="min-h-screen flex flex-col font-sans bg-[#02040F]">
      {/* --- HEADER GLOBAL AUTENTIKASI --- */}
      <header className="bg-[#840032] text-white py-6 px-8 md:px-16 shadow-md z-10 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight hover:text-[#E59500] transition-colors cursor-pointer">
            Article Generation & Clustering
          </h1>
        </Link>
      </header>

      {/* --- AREA KONTEN (Tempat Form Login / Sign Up di-render) --- */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Efek Cahaya Latar Belakang yang konstan untuk Login & Sign Up */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-[#E59500]/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Konten dari page.tsx masing-masing akan muncul di bawah sini */}
        {children}
      </main>

      {/* --- FOOTER GLOBAL AUTENTIKASI --- */}
      <footer className="bg-[#840032] text-white py-5 px-8 md:px-16 text-lg tracking-wide z-10">
        <p>
          <span className="text-[#E59500] font-bold">AGC</span> by Anak Magang Telkom
        </p>
      </footer>
    </div>
  );
}
