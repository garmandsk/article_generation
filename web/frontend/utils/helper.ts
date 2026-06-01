import TurndownService from "turndown";
import { sysLog } from "./logger";

const convertToMD = (text: string) => {
  if (!text) return "";
  
  const containsHTML = /<\/?[a-z][\s\S]*>/i.test(text);
  if (!containsHTML) return text;

  try {
    // Inisialisasi Turndown dengan pengaturan yang ramah standar Markdown
    const turndownService = new TurndownService({
      headingStyle: 'atx', // Mengubah <h1> menjadi #
      codeBlockStyle: 'fenced', // Mengubah <pre><code> menjadi ```
      hr: '---', // Garis pembatas
      bulletListMarker: '-' // Format list
    });

    const safeHtml = text.replace(/src=["']\s*["']/gi, 'src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="');

    // Konversi HTML ke Markdown
    const markdownConverted = turndownService.turndown(safeHtml);
    return markdownConverted;
    sysLog("info", "Format HTML terdeteksi dan berhasil dikonversi ke Markdown.", "0");
  } catch (error) {
    sysLog("error", `Gagal mengonversi HTML. Memuat teks mentah.: ${error}`, "0");
    return text;// Fallback jika gagal
  }

}

export { convertToMD };