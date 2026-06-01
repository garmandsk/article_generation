import { useLogStore } from "@/store/logStore"
import { LOGS_URL } from "./api";

function maskSensitiveData(text: string): string {
  let safeText = text;

  // 1. Sensor Bearer Token 
  // Contoh: "Bearer eyJhbGciOiJIUzI1Ni..." -> "Bearer [MASKED_TOKEN]"
  safeText = safeText.replace(/(Bearer\s+)[A-Za-z0-9\-\._~+\/]+=*/gi, '$1[MASKED_TOKEN]');

  // 2. Sensor API Key 
  // Contoh: "sk-proj-1234abcd..." -> "sk-proj-********"
  safeText = safeText.replace(/(sk-[a-zA-Z0-9\-]{4})[a-zA-Z0-9\-]+/g, '$1********');

  // 3. Sensor Email 
  // Contoh: "admin@univ.edu" -> "[MASKED_EMAIL]"
  safeText = safeText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[MASKED_EMAIL]');

  // 4. Sensor Password di URL
  // Contoh: "postgres://user:password123@localhost" -> "postgres://user:***@localhost"
  safeText = safeText.replace(/(:\/\/[^:]+:)([^@]+)(@)/g, '$1***$3');

  return safeText;
}


type LogType = 'info' | 'success' | 'error' | 'warning';

/**
 * Fungsi Utama Dual-Track Logging
 */
export const sysLog = (type: LogType, rawMessage: string, exec_time: string | null) => {
  // Eksekusi Masking (Amankan info data)
  const safeMessage = maskSensitiveData(rawMessage);

  // Logger Frontend (Stateless)
  useLogStore.getState().addLog(type, safeMessage, exec_time);

  // Logger Backend (Statefull -> Kirim ke LaaS)
  // try {
    // const logsAPI = LOGS_URL;
  //   fetch(logsAPI, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       level: level,
  //       message: safeMessage,
  //       timestamp: new Date().toISOString(),
  //       source: 'frontend_agc_dashboard'
  //     })
  //   }).catch((err) => {
  //     // Jika server mati, log error-nya diam-diam di console browser, 
  //     // jangan hancurkan UI.
  //     console.warn("Gagal mengirim log ke backend:", err);
  //   });
  // } catch (error) {
  //   console.error("Fatal error saat Track Backend", error);
  // }
};