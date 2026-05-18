# Start AI-CMPS Backend
Write-Host "Starting AI-CMPS Backend..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot"
.\venv\Scripts\python -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
