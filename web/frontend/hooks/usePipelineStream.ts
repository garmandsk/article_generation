import { useState } from "react";

export const usePipelineStream = () => {
  // State untuk mengontrol indikator loading/spinning di UI
  const [isLoading, setIsLoading] = useState(false);
  // State berupa array string untuk menampung baris log terminal monitor
  const [logs, setLogs] = useState<string[]>([]);
  // State untuk melacak persentase progres pipeline (0 - 100)
  const [progress, setProgress] = useState(0);

  /**
   * Fungsi utama untuk mengeksekusi request HTTP berbasis streaming (SSE)
   * Menggunakan arsitektur Promise agar halaman pemanggil bisa menunggu (await) hingga proses selesai
   */
  const executeStream = async <T = unknown>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> => {
    setIsLoading(true);
    setLogs(["Menghubungi server..."]);
    setProgress(0);

    return new Promise((resolve, reject) => {
      fetch(endpoint, options)
        .then(async (response) => {
          // 1. CEGAT ERROR HTTP (401, 404, 500, dll) sebelum masuk ke pembacaan stream
          if (!response.ok) {
            let errorMessage = `HTTP Error ${response.status}`;
            try {
              // Coba ekstrak pesan error detail yang dikirim oleh FastAPI (Pydantic/HTTPException)
              const errorData = await response.json();
              errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
              // Abaikan jika response error bukan berupa JSON valid
            }
            // Lempar error agar langsung ditangkap oleh blok .catch() di bawah
            throw new Error(errorMessage);
          }

          // 2. INISIALISASI STREAM READER dari body response HTTP
          const reader = response.body?.getReader();
          if (!reader) throw new Error("Gagal membaca stream jaringan");
          
          // Decoder teks berbasis UTF-8 untuk menerjemahkan chunk biner menjadi teks biasa
          const decoder = new TextDecoder("utf-8");

          // 3. LOOPING ABADI untuk membaca potongan data (chunks) dari jaringan selama data masih mengalir
          while (true) {
            const { done, value } = await reader.read();
            // Jika koneksi stream dari server resmi ditutup, keluar dari loop pembacaan
            if (done) break;

            // Terjemahkan byte biner menjadi string teks. Opsi stream: true menjaga potongan JSON tidak rusak di tengah.
            const chunk = decoder.decode(value, { stream: true });
            // Pecah string berdasarkan baris baru karena format SSE menggunakan pemisah '\n'
            const lines = chunk.split("\n");

            lines.forEach((line) => {
              // Filter hanya baris yang diawali standar spesifikasi SSE yaitu 'data: '
              if (line.startsWith("data: ")) {
                const dataStr = line.replace("data: ", "");
                try {
                  // Konversi string mentah dari server menjadi objek JavaScript
                  const data = JSON.parse(dataStr);

                  // 4. PROSES SANITASI DATA LOG (Pencegah Crash Objek di React)
                  let safeText = "";
                  if (data.text) {
                    // Jika data.text bertipe objek (seperti JSON artikel final), ubah paksa menjadi string teks
                    safeText = typeof data.text === "object" ? JSON.stringify(data.text) : String(data.text);
                  }

                  // 5. EVALUASI STATUS LOG DARI BACKEND
                  if (data.status === "done") {
                    // Masukkan teks aman hasil sanitasi ke log terminal
                    if (safeText) setLogs((prev) => [...prev, safeText]);
                    setProgress(100);
                    // Beri jeda 2 detik agar user sempat membaca status sukses di terminal sebelum loading ditutup
                    setTimeout(() => setIsLoading(false), 2000);
                    // Selesaikan Promise dan kembalikan data payload utama (JSON artikel) ke halaman pemanggil
                    resolve(data.result);
                  } 
                  else if (data.status === "error") {
                    if (safeText) setLogs((prev) => [...prev, safeText]);
                    setTimeout(() => setIsLoading(false), 2000);
                    // Tolak Promise agar alur kode di Frontend langsung masuk ke blok try-catch utama
                    reject(new Error(safeText));
                  } 
                  else if (data.text) {
                    // Kondisi reguler (sedang berjalan/scraping/generating)
                    setLogs((prev) => [...prev, safeText]); // ✅ DIUBAH KE SAFETEXT AGAR TIDAK CRASH
                    // Hitung persentase progres jika backend menyediakan data step dan total
                    if (data.total) setProgress(Math.round((data.step / data.total) * 100));
                  }
                } catch (e) {
                  // Fallback jika baris data 'data: ' bukan JSON valid, masukkan teks mentahnya saja agar log tidak kosong
                  if (dataStr.trim() !== "") {
                    setLogs((prev) => [...prev, dataStr]);
                  }
                }
              }
            });
          }
        })
        .catch((err) => {
          // Blok penangkap semua kegagalan jaringan, HTTP error, maupun error parsing internal
          setLogs((prev) => [...prev, `ERROR: ${err.message || err}`]);
          // Matikan loading spinner agar tidak berputar selamanya di layar saat error terjadi
          setTimeout(() => setIsLoading(false), 1500);
          reject(err);
        });
    });
  };

  // Kembalikan semua fungsi kontrol dan state agar bisa digunakan di GeneratePage.tsx
  return { isLoading, logs, progress, executeStream };
};