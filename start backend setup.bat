@echo off
REM -----------------------------------
REM Start Node.js server and ngrok minimized
REM -----------------------------------

REM 1️⃣ Change directory to backend folder where app.js
cd /d "%~dp0backend"

REM Start Node.js server with nodemon in a new minimized terminal
start /min cmd /k "nodemon app.js"

REM Wait 3 seconds to ensure server starts
timeout /t 3

REM 2️⃣ Start ngrok.exe located in the same folder as this batch file, minimized
start /min cmd /k "%~dp0ngrok.exe http 3000"

REM Optional: keep this window open
pause
