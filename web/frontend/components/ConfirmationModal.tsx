"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  isDestructive?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Lanjutkan",
  cancelText = "Batal",
  icon,
  isDestructive = false,
  children,
}: ConfirmationModalProps) {
  // 1. Logika State identik dengan LeftSidebar
  const [render, setRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // 2. Fungsi Eksekusi Animasi 300ms
  const handleModalClosing = () => {
    setIsClosing(true);
    setTimeout(() => {
      setRender(false);
      setIsClosing(false);
      onClose(); // Memberi tahu parent untuk mengubah state isOpen menjadi false
    }, 300);
  };
  
  // Fungsi khusus saat pengguna menekan tombol konfirmasi ("Ya, Eksekusi")
  const handleConfirmClosing = () => {
    setIsClosing(true);
    setTimeout(() => {
      setRender(false);
      setIsClosing(false);
      onClose();
      onConfirm(); // Jalankan fungsi utama (contoh: handleGenerateExecute)
    }, 300);
  };
  
  // Pantau perubahan dari luar (Prop isOpen)
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRender(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsClosing(false);
    } else if (render && !isClosing) {
      // Jika parent memaksa tutup tanpa melalui tombol di dalam modal
      handleModalClosing();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!render) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      
      {/* 3. Backdrop dengan Animasi Fade identik dengan LeftSidebar */}
      <div 
        className={`absolute inset-0 bg-[#02040F]/80 backdrop-blur-md fill-mode-forwards ${
          isClosing
            ? "animate-out fade-out duration-300"
            : "animate-in fade-in duration-300"
        }`}
        onMouseDown={handleModalClosing}
      />

      {/* 4. Modal Box dengan Animasi Zoom + Slide identik dengan LeftSidebar */}
      <div 
        className={`relative w-full max-w-md bg-[#0A0E1A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col fill-mode-forwards ${
          isClosing 
            ? "animate-out zoom-out-95 fade-out slide-out-to-bottom-4 duration-300"
            : "animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300"
        }`}
      >
        
        {/* Glow Effect khas desainmu di pojok kiri atas */}
        <div 
          className={`absolute -top-24 -left-24 w-48 h-48 blur-[80px] pointer-events-none ${
            isDestructive ? "bg-red-500/20" : "bg-[#E59500]/15"
          }`} 
        />

        {/* Tombol X */}
        <button 
          onClick={handleModalClosing} 
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"
        >
          <X size={20} />
        </button>

        {/* Konten Modal (Header & Body) */}
        <div className="p-6 relative z-10 flex-1 overflow-y-auto custom-scrollbar max-h-[75vh]">
          <div className="flex items-start gap-4 mb-2">
            <div className={`p-3 rounded-xl border flex-shrink-0 ${
              isDestructive 
                ? "bg-red-500/10 text-red-500 border-red-500/20" 
                : "bg-[#E59500]/10 text-[#E59500] border-[#E59500]/20"
            }`}>
              {icon || <AlertTriangle size={24} />}
            </div>
            <div className="pt-1">
              <h3 className="text-xl font-bold text-white tracking-wide">{title}</h3>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Render Custom Content (Children - Data Summary) */}
          {children && (
            <div className="mt-5">
              {children}
            </div>
          )}
        </div>

        {/* Footer Modal (Tombol Action) */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white/5 border-t border-white/5 relative z-10">
          <button 
            onClick={handleModalClosing}
            className="px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            {cancelText}
          </button>
          
          <button 
            onClick={handleConfirmClosing}
            className={`px-6 py-2 text-sm font-bold rounded-lg transition-all active:scale-95 shadow-lg ${
              isDestructive 
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" 
                : "bg-[#E59500] hover:bg-[#ffb020] text-[#02040F] shadow-[#E59500]/20"
            }`}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}