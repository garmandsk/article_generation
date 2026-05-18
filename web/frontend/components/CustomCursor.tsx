"use client";

import { useEffect, useState } from "react";

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // 1. Fungsi untuk mengupdate koordinat mouse
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    // 2. Fungsi untuk mendeteksi apakah mouse sedang menyentuh tombol/link
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "BUTTON" || 
        target.tagName === "A" || 
        target.closest("button") ||
        target.closest("a") ||
        target.getAttribute("role") === "button"
      ) {
        setIsHovered(true);
      } else {
        setIsHovered(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseover", handleMouseOver);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 pointer-events-none z-[9999] -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ease-out"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {isHovered ? (
        /* ─── KURSOR KEDUA: WUJUD SAAT MENYENTUH TOMBOL (Tech Arrow Pointer) ─── */
        <div className="relative scale-110 transition-transform duration-200">
          {/* Efek Cahaya Oranye di belakang panah */}
          <div className="absolute -inset-2 bg-[#E59500]/30 rounded-full blur-md animate-pulse" />
          
          {/* Simbol Panah Segitiga Khas Cyberpunk/Tech */}
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_0_6px_rgba(229,149,0,0.8)]"
          >
            <path 
              d="M4.5 3V17.5L9.2 13.5L13.5 21L16.5 19.3L12.3 12L18.5 12.5L4.5 3Z" 
              fill="#E59500" 
              stroke="#02040F" 
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ) : (
        /* ─── KURSOR PERTAMA: WUJUD BIASA (Minimalist Dot & Ring) ─── */
        <div className="flex items-center justify-center">
          {/* Titik Inti Tengah */}
          <div className="w-2 h-2 bg-[#E5DADA] rounded-full absolute" />
          
          {/* Lingkaran Luar yang Berputar Ringan */}
          <div className="w-6 h-6 border border-slate-500/40 rounded-full absolute animate-spin [animation-duration:4s] border-dashed" />
        </div>
      )}
    </div>
  );
}