@echo off
REM Simple batch file for building Stellarium Web Engine
REM This handles paths more reliably on Windows

echo === Stellarium Web Engine Build ===
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo Current directory: %CD%
echo.

REM Check if emsdk exists
if not exist "emsdk" (
    echo ERROR: emsdk directory not found!
    echo Please run: git clone https://github.com/emscripten-core/emsdk.git
    pause
    exit /b 1
)

REM Check if stellarium-web-engine exists
if not exist "stellarium-web-engine" (
    echo ERROR: stellarium-web-engine directory not found!
    echo Please run: git clone https://github.com/Stellarium/stellarium-web-engine.git
    pause
    exit /b 1
)

echo Step 1: Activating emsdk...
cd emsdk
call emsdk activate latest
if errorlevel 1 (
    echo ERROR: Failed to activate emsdk
    pause
    exit /b 1
)

call emsdk_env.bat
if errorlevel 1 (
    echo ERROR: Failed to run emsdk_env.bat
    pause
    exit /b 1
)

REM Set required environment variables
set EMSDK=%CD%
set EMSCRIPTEN=%EMSDK%\upstream\emscripten
set EMSCRIPTEN_TOOL_PATH=%EMSCRIPTEN%
set PATH=%EMSCRIPTEN%;%EMSDK%;%PATH%

echo.
echo Environment variables set:
echo   EMSDK=%EMSDK%
echo   EMSCRIPTEN_TOOL_PATH=%EMSCRIPTEN_TOOL_PATH%
echo.

echo Step 2: Building Stellarium Web Engine...
cd ..\stellarium-web-engine

REM Check if SConstruct exists
if not exist "SConstruct" (
    echo ERROR: SConstruct not found in stellarium-web-engine directory!
    pause
    exit /b 1
)

echo Running: scons target=js
echo This may take 10-30 minutes...
scons target=js

if errorlevel 1 (
    echo.
    echo ERROR: Build failed!
    echo.
    echo Troubleshooting:
    echo   1. Make sure Python is installed: python --version
    echo   2. Make sure SCons is installed: pip install scons
    echo   3. Check that emsdk is properly installed
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo.

REM Look for built files
echo Step 3: Looking for built files...
if exist "html\static\js\stellarium-web-engine.js" (
    echo Found files in html\static\js\
    if not exist "..\stellarium-build" mkdir "..\stellarium-build"
    copy "html\static\js\stellarium-web-engine.js" "..\stellarium-build\" >nul
    copy "html\static\js\stellarium-web-engine.wasm" "..\stellarium-build\" >nul
    echo Files copied to stellarium-build\
) else (
    echo Warning: Built files not found in expected location
    echo Please check the build output
)

echo.
echo === Done ===
pause

