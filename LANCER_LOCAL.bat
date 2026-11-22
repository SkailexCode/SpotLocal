@echo off
title SpotLocal - Demarrage Rapide
cd /d "%~dp0"
if not exist "node_modules" (
  echo Installation des dependances...
  call npm install
)
echo Demarrage de SpotLocal sur http://localhost:3000 ...
start "" "http://localhost:3000"
call npm run dev
pause
