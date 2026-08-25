@echo off
REM «Узел» — запуск на Windows: двойной клик по этому файлу.
REM Сервер стартует, данные будут в папке .\data рядом с приложением.
cd /d "%~dp0"
start "" "http://localhost:4173"
node server.mjs
pause
