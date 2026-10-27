@echo off
title Ponte WhatsApp - CRM Yago Duarte
chcp 65001 >nul
cd /d "%~dp0whatsapp-bridge"
echo =======================================================
echo   Iniciando Ponte WhatsApp - CRM Yago Duarte
echo =======================================================
echo.
echo Verificando se ja existe outra janela aberta...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Where-Object { $_.CommandLine -match 'index\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
timeout /t 1 /nobreak >nul
echo Pressione Ctrl+C para encerrar quando quiser fechar.
echo.
node index.js
pause
