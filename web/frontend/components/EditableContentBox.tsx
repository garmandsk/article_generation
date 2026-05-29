"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Check, ChevronDown, Copy, FileText, Globe, Code } from "lucide-react";
import { sysLog } from "@/utils/logger";
import TurndownService from "turndown";

export const EditableContentBox = ({ 
  initialContent, 
  titleText 
}: { 
  initialContent: string, 
  titleText: string 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);

  // State salin
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Ref untuk mendeteksi klik di luar dropdown
  const menuRef = useRef<HTMLDivElement>(null);

  const triggerCopiedAnim = (format: string) => {
    setCopiedFormat(format);
    setIsCopyMenuOpen(false);
    setTimeout(() => setCopiedFormat(null), 2000);
  }

  const handleCopyText = async () => {
    if (!content) return;
    const tempDiv = document.createElement("div");
    const proseElement = document.querySelector(".prose-content");

    if (proseElement) tempDiv.innerHTML = proseElement.innerHTML;
    else tempDiv.innerText = content;

    try {
      await navigator.clipboard.writeText(tempDiv.innerText);
      triggerCopiedAnim("text");
      sysLog("success", 'format "text" bersih disalin (Cocok untuk Notepad/Chat)!', "0");
    } catch (error) {
      sysLog("error", `Gagal menyalin format text: ${error}`, "0");
    }
  };

  const handleCopyHtml = async () => {
    if (!content) return;
    const proseElement = document.querySelector(".prose-content");
    if (!proseElement) return;

    try {
      const blob = new Blob([proseElement.innerHTML], { type: "text/html" });
      const item = new ClipboardItem({ "text/html": blob })
      await navigator.clipboard.write([item]);

      triggerCopiedAnim("html");
      sysLog("success", 'format "html" berhasil disalin (Cocok untuk Medium/Docs)!', "0");
    } catch (error) {
      sysLog("error", `Browser tidak mendukung Copy HTML, mengalihkan ke Teks: ${error}`, "0");
      handleCopyText();
    }
  };

  const handleCopyMarkdown = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      triggerCopiedAnim("markdown");
      sysLog("success", 'format "markdown" berhasil disalin (Cocok untuk Readme/Chatbot)', "0");
    } catch (error) {
      sysLog("error", `gagal menyalin teks dengan format "markdown": ${error}`, "0");
    }
  }

  // Isi Content box
  useEffect(() => {
    // Deteksi sederhana: apakah string mengandung tag HTML penutup atau pembuka?
    const containsHTML = /<\/?[a-z][\s\S]*>/i.test(initialContent);

    if (containsHTML) {
      try {
        // Inisialisasi Turndown dengan pengaturan yang ramah standar Markdown
        const turndownService = new TurndownService({
          headingStyle: 'atx', // Mengubah <h1> menjadi #
          codeBlockStyle: 'fenced', // Mengubah <pre><code> menjadi ```
          hr: '---', // Garis pembatas
          bulletListMarker: '-' // Format list
        });

        const safeHtml = initialContent.replace(/src=["']\s*["']/gi, 'src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="');

        // Konversi HTML ke Markdown
        const markdownConverted = turndownService.turndown(safeHtml);
        setContent(markdownConverted);
        sysLog("info", "Format HTML terdeteksi dan berhasil dikonversi ke Markdown.", "0");
      } catch (error) {
        sysLog("error", `Gagal mengonversi HTML. Memuat teks mentah.: ${error}`, "0");
        setContent(initialContent); // Fallback jika gagal
      }
    } else {
      // Jika sudah Markdown / Teks biasa, langsung set saja
      setContent(initialContent);
    }
  }, [initialContent]);

  // Efek untup menutup dropdown saat klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsCopyMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-[#02040F] p-6 rounded-2xl border border-slate-700/50 shadow-inner space-y-2 flex flex-col transition-all relative h-[500px] lg:h-[600px]">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          {titleText} {isEditing && <span className="bg-[#E59500] text-[#02040F] px-1.5 py-0.5 rounded text-[8px] animate-pulse">EDIT MODE</span>}
        </p>
        
        {/* AREA DROPDOWN COPY */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsCopyMenuOpen(!isCopyMenuOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md ${
              copiedFormat 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" 
                : "bg-[#E59500] text-[#02040F] hover:bg-[#ffb020]"
            }`}
          >
            {copiedFormat ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedFormat ? "Copied!" : "Copy As..."}</span>
            {!copiedFormat && <ChevronDown size={14} className={`transition-transform duration-200 ${isCopyMenuOpen ? "rotate-180" : ""}`} />}
          </button>

          {/* Menu Dropdown */}
          {isCopyMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-[#0A0E1A] border border-slate-700 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="flex flex-col">
                
                <button onClick={handleCopyText} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-800/50 text-left group">
                  <FileText size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                  <div>
                    <span className="block font-medium">Plain Text</span>
                    <span className="block text-[10px] text-slate-500">For Chat / Notepad</span>
                  </div>
                </button>

                <button onClick={handleCopyHtml} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-[#E59500] transition-colors border-b border-slate-800/50 text-left group">
                  <Globe size={16} className="text-slate-500 group-hover:text-[#E59500] transition-colors" />
                  <div>
                    <span className="block font-medium">Rich Text (HTML)</span>
                    <span className="block text-[10px] text-slate-500">For Word / Medium</span>
                  </div>
                </button>

                <button onClick={handleCopyMarkdown} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-purple-400 transition-colors text-left group">
                  <Code size={16} className="text-slate-500 group-hover:text-purple-400 transition-colors" />
                  <div>
                    <span className="block font-medium">Markdown</span>
                    <span className="block text-[10px] text-slate-500">For Notion / GitHub</span>
                  </div>
                </button>

              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 h-full">
        {isEditing ? (
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)} 
            onBlur={() => setIsEditing(false)}
            className="absolute inset-0 w-full h-full bg-[#0A0E1A] text-slate-200 font-serif p-4 border border-[#E59500]/50 rounded-lg outline-none resize-none focus:ring-2 ring-[#E59500]/20 custom-scrollbar"
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className="prose-content cursor-pointer hover:bg-slate-800/30 p-2 rounded-lg transition-colors prose prose-sm prose-invert max-w-none text-slate-200 font-serif
            prose-headings:text-white prose-headings:font-bold
            prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
            prose-p:leading-relaxed prose-p:mb-4
            prose-a:text-[#E59500] prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white prose-strong:font-bold
            prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4
            prose-li:mb-1
            prose-blockquote:border-l-4 prose-blockquote:border-[#E59500] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-400"
            title="Klik untuk mengedit konten"
          >
            <ReactMarkdown
              components={{
                img: ({ ...props }) => {
                  // Cegah render elemen img jika src-nya kosong atau berisi gambar transparan/tracking
                  const imageSrc = props.src as string;

                  // 2. Logika pemblokiran jadi lebih bersih karena tidak perlu 'typeof' lagi
                  if (!imageSrc || imageSrc.includes('data:image/gif;base64')) {
                    return null; 
                  }
                  
                  return (
                    <Image 
                      src={imageSrc} // 🔥 Ambil src secara eksplisit, jangan pakai {...props}
                      alt={props.alt || "Article Image"} 
                      width={800} 
                      height={450} 
                      unoptimized 
                      // 🔥 Tambahkan w-full h-auto agar rasio gambar tetap proporsional dan tidak penyok
                      className="rounded-lg my-4 w-full h-auto object-contain bg-slate-900/50" 
                    />
                  );
                }
              }}
            >{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};