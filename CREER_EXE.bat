@echo off
title SpotLocal - Generer le .exe Windows
cd /d "%~dp0"
if not exist "node_modules" (
  echo Installation des dependances...
  call npm install
)
echo Compilation de l'interface...
call npm run build
echo Compilation du serveur autonome...
call npm run build:server
echo Installation temporaire d'Electron Builder...
call npm install --no-save electron electron-builder
echo Generation du fichier .exe...
call npx electron-builder --config electron-builder.json --win
echo.
echo Termine ! Votre .exe se trouve dans le dossier "release\SpotLocal-Portable.exe".
if exist "release" start "" "%~dp0release"
pause
