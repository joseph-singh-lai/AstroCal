# Fix: emsdk.py Not Found

## The Issue

On Windows, emsdk might not have a `.py` extension, or it might be a batch file.

## Solution 1: Use `emsdk` directly (no .py)

Instead of:
```powershell
python emsdk.py install latest
```

Try:
```powershell
.\emsdk install latest
```

Or:
```powershell
python emsdk install latest
```

## Solution 2: Check what files exist

From the `emsdk` directory, run:
```powershell
cd emsdk
Get-ChildItem | Select-Object Name
```

Look for:
- `emsdk` (no extension) - use `.\emsdk`
- `emsdk.py` - use `python emsdk.py`
- `emsdk.bat` - use `.\emsdk.bat`

## Solution 3: Use the batch file (Windows)

On Windows, there's usually a batch file:
```powershell
cd emsdk
.\emsdk.bat install latest
.\emsdk.bat activate latest
.\emsdk_env.bat
```

## Solution 4: Re-clone if needed

If the emsdk directory seems incomplete:
```powershell
cd ..
Remove-Item -Recurse -Force emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
```

Then try the commands again.

## Correct Commands for Windows

From the `emsdk` directory:

```powershell
# Method 1: Direct command (most common)
.\emsdk install latest
.\emsdk activate latest
.\emsdk_env.bat

# Method 2: If that doesn't work, try with python
python emsdk install latest
python emsdk activate latest
.\emsdk_env.bat

# Method 3: Use batch file
.\emsdk.bat install latest
.\emsdk.bat activate latest
.\emsdk_env.bat
```

## Verify Installation

After running install, check if emscripten was installed:
```powershell
Test-Path "upstream\emscripten\emcc.bat"
```

Should return `True` if installed correctly.

