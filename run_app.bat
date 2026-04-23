@echo off
title EchoDict Runner
cls
echo ==========================================
echo    DANG KHOI DONG ECHODICT...
echo ==========================================
echo.

:: Mo trinh duyet truoc
start http://localhost:8000

:: Thu chay bang python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Dang dung lenh: python
    python -m http.server 8000
    goto end
)

:: Thu chay bang py
py --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Dang dung lenh: py
    py -m http.server 8000
    goto end
)

:: Thu chay bang python3
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Dang dung lenh: python3
    python3 -m http.server 8000
    goto end
)

echo [LOI] Khong tim thay Python tren may cua ban!
echo Vui long cai dat Python hoac mo truc tiep file index.html.
echo.
pause

:end
pause
