@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Python virtual environment not found.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
".venv\Scripts\python.exe" backend\app.py
