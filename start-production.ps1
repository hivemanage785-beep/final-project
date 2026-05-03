# Buzz-Off Production Initiation Script (Windows PowerShell)
# This script starts the full stack in separated processes for production verification.

Write-Host "--- INITIATING BUZZ-OFF PRODUCTION STACK ---" -ForegroundColor Yellow

# 1. Start ML Inference Service (FastAPI)
Write-Host "1. Starting ML Inference Service on Port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'final-project/ml-service'; python -m uvicorn ml_api:app --host 0.0.0.0 --port 8000"

# 2. Start Backend API (Node.js)
Write-Host "2. Starting Backend API on Port 3001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'final-project/backend'; npm start"

# 3. Start Frontend UI (Vite)
Write-Host "3. Starting Frontend UI on Port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'final-project/frontend'; npm run dev -- --port 3000 --host 0.0.0.0"

Write-Host "--- STACK DEPLOYED ---" -ForegroundColor Green
Write-Host "Access the UI at: http://localhost:3000"
Write-Host "API Health: http://localhost:3001/health"
Write-Host "ML Health: http://localhost:8000/health"
