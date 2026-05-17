@echo off
:: Set code page to UTF-8 for nice symbols
chcp 65001 >nul
title AI-CMPS - Control Panel

:: Ensure we are in the correct directory (handles paths with spaces)
cd /d "%~dp0"

cls
echo =======================================================================
echo          Welcome to AI-CMPS Startup Orchestrator (Frontend ^& Backend)
echo =======================================================================
echo.
echo  This script will launch the AI-Powered Content Management ^&
echo  Personalization System (AI-CMPS) services in separate windows.
echo.
echo  [System Check]
echo  - Virtual Environment:  Checking...

if not exist "venv\Scripts\python.exe" (
    echo    [ERROR] Virtual environment not found at 'venv\Scripts\python.exe'.
    echo    Please set up your virtual environment and install dependencies first.
    echo.
    pause
    exit /b
)
echo    [OK] Virtual environment found.

echo  - Frontend Folder:      Checking...
if not exist "frontend\package.json" (
    echo    [ERROR] Frontend directory or 'package.json' not found at 'frontend/'.
    echo    Please ensure the frontend code is present.
    echo.
    pause
    exit /b
)
echo    [OK] Frontend folder found.
echo.
echo -----------------------------------------------------------------------
echo  Launching Services...
echo -----------------------------------------------------------------------
echo.

:: 1. Launch Backend Service
echo  [1/2] Starting Backend Server (Uvicorn)...
echo        Interactive API Docs: http://localhost:8000/docs
start "AI-CMPS Backend" cmd /k "venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000"

:: Small delay to let the backend start binding to the port before frontend starts
timeout /t 2 /nobreak >nul

:: 2. Launch Frontend Service
echo  [2/2] Starting Frontend Server (Vite)...
echo        Application URL:       http://localhost:5173
start "AI-CMPS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =======================================================================
echo  Success! Both services are now launching in separate windows.
echo  - Keep those windows open to maintain the services.
echo  - You can close this orchestrator window.
echo =======================================================================
echo.
pause
