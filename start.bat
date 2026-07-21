@echo off
title Server
cd /d "%~dp0"

echo Opening browser...
start http://localhost:2000

echo ==================================================
echo Starting server...
echo PLEASE DO NOT CLOSE THIS WINDOW.
echo ==================================================
echo.

node server.js

echo.
echo Server has stopped.
pause
