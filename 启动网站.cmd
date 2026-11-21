@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "The Camp Iceberg Server" cmd /k "node server.js"
timeout /t 1 >nul
start "" http://127.0.0.1:8790/
