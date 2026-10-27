@echo off
title Ponte WhatsApp - CRM Yago Duarte
chcp 65001 >nul
cd /d "%~dp0whatsapp-bridge"
echo =======================================================
echo   Iniciando Ponte WhatsApp - CRM Yago Duarte
echo =======================================================
echo.
echo Pressione Ctrl+C para encerrar quando quiser fechar.
echo.
node index.js
pause
