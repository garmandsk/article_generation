import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Code, JetBrains_Mono } from "next/font/google";
import "@/app/globals.css";
// import CustomCursor from "@/components/CustomCursor";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta"
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira"
});

const jetBrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://article-generation-omega.vercel.app"),
  title: {
    // %s akan diganti dengan title spesifik dari setiap halaman
    template: "%s | Article Generation & Clustering", 
    default: "Article Generation & Clustering - Buat Konten Dan Pemetaan Topik Otomatis",
  },
  description: "Platform cerdas berbasis AI untuk menghasilkan artikel & Pemetaan Topik.",
  keywords: ["AI Article Writer", "Generative AI", "Markdown", "EduTech", "NextJS", "FastAPI", "BERTopic"],
  authors: [{ name: "garmandsk" }], // Berikan namamu kredit sebagai kreator!
  creator: "garmandsk",
  
  // Konfigurasi Open Graph (Untuk Tampilan Preview di WhatsApp/LinkedIn/Facebook)
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://article-generation-omega.vercel.app", // URL Vercel-mu
    siteName: "Article Generation & Clustering",
    title: "Article Generation & Clustering",
    description: "Hasilkan artikel edukasi berkualitas tinggi & Pemetaan Topik dalam hitungan detik menggunakan kecerdasan buatan.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Article Generation & Clustering Preview",
      },
    ],
  },
  
  // Konfigurasi Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Article Generation & Clustering",
    description: "Hasilkan artikel edukasi berkualitas tinggi & Pemetaan Topik dalam hitungan detik menggunakan kecerdasan buatan.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* className antialiased membuat font dirender lebih halus di browser */}
      <body
        className={`${plusJakarta.variable} ${firaCode.variable} ${jetBrains.variable} bg-[#02040F] text-[#E5DADA] antialiased`}
      >
        {/* <CustomCursor /> */}
        {children}
      </body>
    </html>
  );
}
