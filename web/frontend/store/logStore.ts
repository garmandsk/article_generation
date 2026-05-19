import { create } from 'zustand';

// 1. Tipe data untuk satu baris Log
export type LogType = 'info' | 'success' | 'error' | 'warning';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  message: string;
}

// 2. Interface untuk Store kita
interface LogStore {
  logs: LogEntry[];
  addLog: (type: LogType, message: string) => void;
  clearLogs: () => void;
}

// 3. Membuat Store Zustand
export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  
  // Fungsi untuk menambah log baru
  addLog: (type, message) => set((state) => {
    const now = new Date();
    const newLog: LogEntry = {
      id: crypto.randomUUID(), // ID unik bawaan browser
      timestamp: now.toLocaleTimeString('id-ID', { hour12: false }), // Format: 14:30:45
      type,
      message,
    };

    // OPTIMALISASI: Batasi maksimal 100 log agar memori browser tidak penuh
    const updatedLogs = [...state.logs, newLog];
    if (updatedLogs.length > 100) {
      updatedLogs.shift(); // Buang log paling tua jika lebih dari 100
    }

    return { logs: updatedLogs };
  }),

  // Fungsi untuk membersihkan terminal
  clearLogs: () => set({ logs: [] }),
}));