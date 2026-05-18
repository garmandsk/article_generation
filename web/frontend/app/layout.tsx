import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fira_Code, JetBrains_Mono } from "next/font/google";
import "@/app/globals.css";
// import CustomCursor from "@/components/CustomCursor";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira",
});

const jetBrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains"
})

export const metadata: Metadata = {
  title: "AGC - Article Generation & Clustering",
  description: "Application for Article Generation and Clustering",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* className antialiased membuat font dirender lebih halus di browser */}
      <body className={`${plusJakarta.variable} ${firaCode.variable} ${jetBrains.variable} bg-[#02040F] text-[#E5DADA] antialiased`}>
        {/* <CustomCursor /> */}
        {children}
      </body>
    </html>
  );
}