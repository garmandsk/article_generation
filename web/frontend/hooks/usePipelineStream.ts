// file: hooks/usePipelineStream.ts
import { useState } from "react";

export const usePipelineStream = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

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

          if (!response.ok) {
            let errorMessage = `HTTP Error ${response.status}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.detail || errorData.message || errorMessage
            } catch (e) {

            }

            throw new Error(errorMessage)
          }

          const reader = response.body?.getReader();

          if (!reader) throw new Error("Gagal membaca stream jaringan");
          const decoder = new TextDecoder("utf-8");

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            lines.forEach((line) => {
              if (line.startsWith("data: ")) {
                const dataStr = line.replace("data: ", "");
                try {
                  const data = JSON.parse(dataStr);

                  let safeText = "";
                  if (data.text) {
                    safeText =
                      typeof data.text === "object" ? JSON.stringify(data.text) : String(data.text);
                  }

                  if (data.status === "done") {
                    if (safeText) setLogs((prev) => [...prev, data.text]);
                    setProgress(100);
                    setTimeout(() => setIsLoading(false), 2000);
                    resolve(data.result);
                  } else if (data.status === "error") {
                    if (safeText) setLogs((prev) => [...prev, data.text]);
                    setTimeout(() => setIsLoading(false), 2000);
                    // Tolak promise agar masuk ke blok 'catch' di halaman utamamu
                    reject(new Error(data.text));
                  } else if (data.text) {
                    setLogs((prev) => [...prev, data.text]);
                    if (data.total) setProgress(Math.round((data.step / data.total) * 100));
                  }
                } catch (e) {
                  if (dataStr.trim() !== "") {
                    setLogs((prev) => [...prev, dataStr]);
                  }
                }
              }
            });
          }
        })
        .catch((err) => {
          setLogs((prev) => [...prev, `ERROR: ${err.message || err}`]);
          setTimeout(() => setIsLoading(false), 3000);
          reject(err);
        });
    });
  };

  return { isLoading, logs, progress, executeStream };
};
