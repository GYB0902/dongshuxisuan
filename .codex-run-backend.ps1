Set-Location "D:\PythonEnv\CodeSpace\dongshuxisuan\backend"
$env:PYTHONUNBUFFERED='1'
..\.venv\Scripts\python.exe -c "import app; app.app.run(host='0.0.0.0', port=5050, debug=False, use_reloader=False)"
