@echo off
title Resincronizar Historico Completo WhatsApp - CRM Yago Duarte
chcp 65001 >nul
cd /d "%~dp0whatsapp-bridge"
echo ===============================================================
echo   Resincronizando Historico Completo do WhatsApp (CRM)
echo ===============================================================
echo.
echo Limpando credenciais locais para solicitar o historico do celular do zero...
if exist "auth_info" rmdir /s /q "auth_info"
echo.
echo Iniciando ponte... Escaneie o QR Code que vai aparecer abaixo:
echo.
node index.js
pause
