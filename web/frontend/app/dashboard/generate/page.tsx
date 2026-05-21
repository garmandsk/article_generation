"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, X } from "lucide-react";

export default function GeneratePage() {
  // Data dummy untuk visualisasi Tags
  const mockTopics = ["Cloud Computing", "IoT", "AI"];
  const mockKeywords = ["cloud", "iot", "engineer"];

  return (
    <div className="flex h-full gap-6 relative animate-in fade-in duration-500">
      
      {/* --- MAIN AREA (KIRI) --- */}
      <div className={`flex flex-col gap-6 transition-all duration-300`}>
        
        {/* KARTU 1: CONFIGURE */}
        <section className="bg-[#002642]/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
            <Sparkles className="text-[#E59500]" size={20} />
            Configure Generation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Kolom Kiri Configure */}
            <div className="space-y-6">
              {/* Topics */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Topics</label>
                <div className="flex flex-wrap gap-2 p-3 bg-[#02040F]/50 border border-slate-700 rounded-lg min-h-[60px]">
                  {mockTopics.map((topic, i) => (
                    <span key={i} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-sm">
                      {topic} <X size={14} className="cursor-pointer hover:text-white" />
                    </span>
                  ))}
                  <input type="text" placeholder="Add topic..." className="bg-transparent outline-none text-sm text-slate-300 placeholder-slate-600 flex-1 min-w-[100px]" />
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">System Prompt (Optional)</label>
                <textarea 
                  rows={4}
                  placeholder="Enter specific instructions for the AI..."
                  className="w-full bg-[#02040F]/50 border border-slate-700 rounded-lg p-3 text-[#E5DADA] placeholder-slate-600 focus:ring-1 focus:ring-[#E59500] focus:border-[#E59500] outline-none resize-none"
                />
              </div>
            </div>

            {/* Kolom Kanan Configure */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Keywords */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Keywords</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-[#02040F]/50 border border-slate-700 rounded-lg min-h-[60px]">
                    {mockKeywords.map((kw, i) => (
                      <span key={i} className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-sm">
                        {kw} <X size={14} className="cursor-pointer hover:text-white" />
                      </span>
                    ))}
                    <input type="text" placeholder="Add keyword..." className="bg-transparent outline-none text-sm text-slate-300 placeholder-slate-600 flex-1 min-w-[100px]" />
                  </div>
                </div>

                {/* Model Select */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">AI Model</label>
                  <select className="w-full bg-[#02040F]/50 border border-slate-700 rounded-lg p-3 text-[#E5DADA] focus:ring-1 focus:ring-[#E59500] focus:border-[#E59500] outline-none appearance-none">
                    <option value="gemini-2.5-flash">Gemini 3 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 3 Pro</option>
                  </select>
                </div>
              </div>

              {/* Action Button */}
              <button className="w-full bg-[#E59500] hover:bg-[#D98E0F] text-[#02040F] font-bold text-lg py-3 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] shadow-lg shadow-[#E59500]/20">
                <Sparkles size={20} />
                Generate Article
              </button>
            </div>
          </div>
        </section>

        {/* KARTU 2: RESULT */}
        <section className="bg-[#002642]/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Result</h2>
            {/* Status Badge */}
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-sm font-medium">
              <CheckCircle2 size={16} /> SUCCESS
            </div>
          </div>

          {/* Render Area */}
          <div className="bg-[#02040F]/50 border border-slate-700 rounded-lg p-6 flex-1 overflow-y-auto">
            <h1 className="text-2xl font-bold text-white mb-4 leading-snug">
              Sinergi Cloud, AI, dan IoT: Transformasi Digital dalam Menyelesaikan Masalah Kompleks di Era Modern
            </h1>
            <div className="h-px w-full bg-slate-700/50 mb-4" />
            <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-4">
              <p><strong># Pendahuluan: Memahami Ekosistem Teknologi Masa Depan</strong></p>
              <p>Dalam beberapa dekade terakhir, dunia telah menyaksikan lompatan teknologi yang belum pernah terjadi sebelumnya. Konvergensi antara Cloud Computing, Artificial Intelligence (AI), dan Internet of Things (IoT) telah menciptakan ekosistem baru yang kuat.</p>
              {/* Dummy text just to show scrolling if needed */}
              <p>Teknologi ini tidak lagi berdiri sendiri, melainkan saling melengkapi untuk mengotomatisasi proses bisnis dan memberikan wawasan yang sangat akurat secara real-time.</p>
              <p>Teknologi ini tidak lagi berdiri sendiri, melainkan saling melengkapi untuk mengotomatisasi proses bisnis dan memberikan wawasan yang sangat akurat secara real-time.</p>
              <p>Teknologi ini tidak lagi berdiri sendiri, melainkan saling melengkapi untuk mengotomatisasi proses bisnis dan memberikan wawasan yang sangat akurat secara real-time.</p>
              <p>Teknologi ini tidak lagi berdiri sendiri, melainkan saling melengkapi untuk mengotomatisasi proses bisnis dan memberikan wawasan yang sangat akurat secara real-time.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}