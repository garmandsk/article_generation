import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Ambil Secret Key dari environment variables (Wajib sama dengan FastAPI)
const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET_KEY);
// const SECRET_KEY = process.env.JWT_SECRET_KEY;

export async function proxy(request: NextRequest) {
  const agc_token = request.cookies.get('agc_token')?.value;
  const mydigilearn_token = request.cookies.get('mydigilearn_token')?.value;
  const path = request.nextUrl.pathname;
  
  const isProtectedRoute = 
    path.startsWith('/dashboard') ||
    path.startsWith('/storage') ||
    path.startsWith('/article');

  const isAuthRoute = path === '/login' || path === '/signup';
  
  // --- LOGIKA VALIDASI TOKEN ---
  let isTokenValid = false;
  
  // console.log("Secret key: ", SECRET_KEY)
  if (agc_token && mydigilearn_token) {
    try {
      // jwtVerify akan membongkar token, mengecek signature, DAN mengecek waktu expired (exp)
      await jwtVerify(agc_token, SECRET_KEY);
      isTokenValid = true; 
    } catch (error) {
      // Jika masuk ke sini, artinya token Palsu, Dimodifikasi, atau Sudah Expired
      console.error("Token tidak valid atau expired:", error);
      isTokenValid = false;
    }
  }

  // --- LOGIKA PENJAGA GERBANG (GATEKEEPING) ---

  // Skenario A: Masuk rute aman TAPI token tidak ada ATAU tidak valid
  if (isProtectedRoute && !isTokenValid) {
    // Opsional: Hapus cookie token yang tidak valid tersebut agar bersih
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    response.cookies.delete('agc_token');
    response.cookies.delete('mydigilearn_token');

    return response;
  }

  // Skenario B: Masuk rute login TAPI token masih valid
  if (isAuthRoute && isTokenValid) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/dashboard',
    '/storage',
    '/article/:path*', 
  ],
};