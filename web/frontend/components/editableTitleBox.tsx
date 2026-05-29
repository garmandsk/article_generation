"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { sysLog } from "@/utils/logger";

export const EditableTitleBox = ({
  titleText,
  initialTitle,
}: {
  initialTitle: string,
  titleText: string
}) => {
  // State title
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [prevInitialTitle, setPrevInitialTitle] = useState(initialTitle)

  // State salin
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyTitle = async () => {
    const exec_time = "0";
    if (!title) return;
    try {
      await navigator.clipboard.writeText(title)
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      sysLog("success", "Judul disalin ke clipboard!", exec_time);
    } catch (error) {
      sysLog("error", `Gagal menyalin judul: ${error}`, exec_time)
    }
  }

  if (initialTitle !== prevInitialTitle) {
    setPrevInitialTitle(initialTitle);
    setTitle(initialTitle);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">{titleText} {isEditing && <span className="bg-[#E59500] text-[#02040F] px-1.5 py-0.5 rounded text-[8px] animate-pulse">EDIT MODE</span>}</p>
        
        {/* TOMBOL COPY: JUDUL */}
        <button
          onClick={handleCopyTitle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${isCopied 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" 
              : "bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 active:scale-95"
          }`}
        >
          {isCopied 
          ? <Check size={14} /> 
          : <Copy size={14} />}
          {isCopied 
          ? "Copied" 
          : "Copy Title"}
        </button>
      </div>
      
      {isEditing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setIsEditing(false)} // Simpan saat klik di luar
          className="w-full text-xl font-black text-white bg-[#0A0E1A] border border-[#E59500]/50 rounded-lg p-2 outline-none focus:ring-2 ring-[#E59500]/20"
        />
      ) : (
        <h4  
          onClick={() => setIsEditing(true)}
          className="text-xl font-black text-white leading-relaxed pr-2 cursor-pointer hover:text-[#E59500] transition-colors"
          title="Klik untuk mengedit judul"
        >
          {title}
        </h4>
      )}
    </>
  )
}