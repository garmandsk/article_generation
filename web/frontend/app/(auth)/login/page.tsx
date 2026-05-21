"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { setCookie, getCookie, deleteCookie } from "cookies-next";

export default function LoginPage() { 
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("")

    // const loginAPI = "http://127.0.0.1:8000/api/v1/auth/login";
    const loginAPI = "http://localhost:8000/api/v1/auth/login";
    const payload = {
      username: username,
      password: password
    }
    console.log("Mengirim data ke server: ", payload)
    console.log("username: ", username)
    console.log("password: ", password)

    try {
      const response = await fetch(loginAPI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log("data: ", data)
      if (!response.ok && !(data.status_code == 200)){
        console.log("error: ", data.detail)

        const pesanDariServer = data?.details?.details?.message || data?.message || data?.detail;
        setErrorMessage(pesanDariServer || "Login gagal. Periksa kembali username & password Anda.")
      } 
      console.log("login berhasil")

      router.push("/dashboard")
    } catch (error) {
      setErrorMessage("Tidak dapat terhubung ke server. Pastikan API sedang berjalan.");
      console.error("Error saat login:", error);
    } finally {
      setIsLoading(false); // Matikan efek loading apa pun yang terjadi
    }


    // setTimeout(() => {
    //   // Mengarahkan ke root dashboard setelah login sukses
    //   window.location.href = "/dashboard"; 
    // }, 1000);
  };

  return (
    /* KARTU LOGIN (Glassmorphism Navy Card)
      Otomatis melayang tepat di tengah layar berkat pengaturan dari AuthLayout
    */
    <div className="w-full max-w-md bg-[#002642]/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative z-10">
      
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-slate-400 text-sm">Please enter your credentials to access the dashboard.</p>
      </div>

      {/* Notifikasi Error */}
      {errorMessage && (
        <div
          className="mb-6 p-4 bg-[#840032]/20 border border-[#840032] rounded-lg flex items-start gap-3"
        >
          <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{errorMessage}</p> 
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-6">
        
        {/* Input Username */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Username</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User size={18} />
            </div>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username here.." 
              className="w-full bg-[#02040F]/50 border border-slate-700 text-[#E5DADA] pl-10 pr-4 py-3 rounded-lg focus:ring-1 focus:ring-[#E59500] focus:border-[#E59500] outline-none transition-all placeholder:text-slate-600"
              
              // Tambahkan 3 baris ini sementara untuk mengetes
              // onPaste={(e) => console.log("User melakukan Paste:", e.clipboardData.getData('text'))}
              // onCopy={() => console.log("User melakukan Copy")}
              // onCut={() => console.log("User melakukan Cut")}
            />
          </div>
        </div>

        {/* Input Password */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock size={18} />
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password here.." 
              className="w-full bg-[#02040F]/50 border border-slate-700 text-[#E5DADA] pl-10 pr-4 py-3 rounded-lg focus:ring-1 focus:ring-[#E59500] focus:border-[#E59500] outline-none transition-all placeholder:text-slate-600"
              
              // Tambahkan 3 baris ini sementara untuk mengetes
              // onPaste={(e) => console.log("User melakukan Paste:", e.clipboardData.getData('text'))}
              // onCopy={() => console.log("User melakukan Copy")}
              // onCut={() => console.log("User melakukan Cut")}
            />
          </div>
        </div>

        {/* Checkbox Show Password */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative flex items-center justify-center">
              <input 
                type="checkbox" 
                className="peer appearance-none w-5 h-5 border-2 border-slate-600 rounded bg-transparent checked:bg-[#E59500] checked:border-[#E59500] transition-all cursor-pointer"
                onChange={(e) => setShowPassword(e.target.checked)}
              />
              <svg className="absolute w-3 h-3 text-[#02040F] opacity-0 peer-checked:opacity-100 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
              Show Password
            </span>
          </label>
        </div>

        {/* Tombol Akses */}
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-[#E59500] hover:bg-[#D98E0F] disabled:bg-slate-700 disabled:text-slate-400 text-[#02040F] font-bold text-lg py-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-[#E59500]/20 mt-4"
        >
          {isLoading ? "Logging in..." : "Login"}
          {!isLoading && <ArrowRight size={20} />}
        </button>

      </form>

      {/* Sign Up */}
      <div className="mt-6 text-center text-sm text-slate-400">
        Don't have an account?{" "}
        <Link href="" className="text-[#E59500] hover:underline font-medium transition-all">
          Sign Up
        </Link>
      </div>

    </div>
  );
}