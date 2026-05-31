@echo off
setlocal EnableDelayedExpansion

:: 1. Trik ajaib menciptakan karakter ESC (Escape) di Windows
for /F "delims=#" %%E in ('"prompt #$E# & for %%E in (1) do rem"') do set "ESC=%%E"

:: 2. Deklarasi Palet Warna
set "RED=%ESC%[91m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "CYAN=%ESC%[96m"
set "RESET=%ESC%[0m"

echo %CYAN%===================================================%RESET%
echo %CYAN%  Memulai Instalasi dan Menjalankan AGC Dashboard%RESET%
echo %CYAN%===================================================%RESET%
echo.
echo %YELLOW%Membangun container... (Ini mungkin memakan waktu beberapa menit)%RESET%
docker compose up -d --build --wait

:: Cek apakah ada error dari Docker
if %errorlevel% neq 0 (
    echo.
    echo %RED%===================================================%RESET%
    echo %RED%  [ERROR] GAGAL MEMBANGUN CONTAINER!%RESET%
    echo %RED%===================================================%RESET%
    echo %RED%Silakan gulir ke atas untuk melihat pesan error Docker.%RESET%
    echo.
    pause
    exit /b %errorlevel%
)

echo.
echo %GREEN%===================================================%RESET%
echo %GREEN%  Aplikasi Berhasil Dijalankan di Background!%RESET%
echo %GREEN%===================================================%RESET%
echo.
echo Akses aplikasi melalui browser Anda:
echo Frontend UI  : %CYAN%http://localhost:8080%RESET%
echo Backend API  : %CYAN%http://localhost:8000/docs%RESET%
echo.
echo Untuk mematikan aplikasi, ketik: %YELLOW%docker compose down%RESET%
echo.
pause