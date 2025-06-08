@echo off
echo Starting DexTools Bot...
echo.

:: Check if Python is installed
python --version > nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if Chrome is installed
reg query "HKEY_CURRENT_USER\Software\Google\Chrome\BLBeacon" /v "version" > nul 2>&1
if errorlevel 1 (
    echo Error: Google Chrome is not installed
    pause
    exit /b 1
)

:: Activate virtual environment
if exist venv\Scripts\activate (
    call venv\Scripts\activate
) else (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate
    echo Installing requirements...
    pip install -r requirements.txt
)

:: Run the bot
echo Running DexTools Bot...
python dextools_bot.py

:: Keep window open if there's an error
if errorlevel 1 (
    echo.
    echo An error occurred. Press any key to exit...
    pause > nul
) 