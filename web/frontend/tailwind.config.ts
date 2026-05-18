import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Tambahkan blok fontFamily ini
      fontFamily: {
        sans: ['var(--font-jakarta)', 'sans-serif'], // Font default utama
        mono: ['var(--font-fira)', 'monospace'],     // Font khusus kode/log
      },
      // ... warna kustom milikmu sebelumnya ...
    },
  },
  plugins: [],
};
export default config;