# Install Python dependencies and start the AI service in a new window
Write-Host "Starting Python AI Service..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd e:\ecotrack\ecotrack-ai-service; if (!(Test-Path venv)) { python -m venv venv }; .\venv\Scripts\activate; pip install -r requirements.txt; uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

# Install Node dependencies and start the main app in a new window
Write-Host "Starting Main EcoTrack Application..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd e:\ecotrack; npm install axios form-data multer uuid; npm install --save-dev @types/multer @types/uuid; npm run dev"

Write-Host "Both services are starting up in new windows!" -ForegroundColor Yellow
Write-Host "Once the blue Node window says 'ready', you can open your browser to http://localhost:5173" -ForegroundColor Cyan
