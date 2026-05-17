# Launcher: starts the FPST·13 Forensic Console backend.
# Usage:  .\run.ps1
# Open:   http://localhost:8000  (pick COM port from the UI)
& "$PSScriptRoot\.venv\Scripts\uvicorn.exe" main:app --app-dir "$PSScriptRoot\backend" --reload
