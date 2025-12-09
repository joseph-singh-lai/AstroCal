# Expected Results After Running Commands

## After Running the One-Line Environment Setup Command

When you run:
```powershell
$emsdkPath = Get-Location; $emscriptenPath = Join-Path $emsdkPath "upstream\emscripten"; $env:EMSDK = $emsdkPath; $env:EMSCRIPTEN = $emscriptenPath; $env:EMSCRIPTEN_TOOL_PATH = $emscriptenPath; $env:PATH = "$emscriptenPath;$emsdkPath;$env:PATH"
```

### Expected Output:
**Nothing visible!** The command runs silently and sets the variables in the background.

### How to Verify It Worked:

Run this to check:
```powershell
echo $env:EMSCRIPTEN_TOOL_PATH
```

**Expected result:**
```
C:\Users\Admin\Desktop\AstroCal\emsdk\upstream\emscripten
```

If you see a path like that (ending with `\upstream\emscripten`), it worked! ✅

### Also Check:
```powershell
echo $env:EMSDK
```

**Expected result:**
```
C:\Users\Admin\Desktop\AstroCal\emsdk
```

### Verify emcc is Available:
```powershell
emcc --version
```

**Expected result:**
```
emcc (Emscripten gcc/clang-like replacement) X.X.X
```

If you see version info, everything is set up correctly! ✅

---

## After Running `scons target=js`

When you run the build command:
```powershell
cd ..\stellarium-web-engine
scons target=js
```

### Expected Output:

You'll see a LOT of compilation messages like:
```
scons: Reading SConscript files ...
scons: done reading SConscript files.
scons: Building targets ...
emcc [lots of files being compiled]
...
[Many compilation lines]
...
scons: done building targets.
```

### Success Indicators:
- ✅ No error messages
- ✅ Final line says "scons: done building targets"
- ✅ Takes 10-30 minutes (this is normal!)

### After Successful Build:

Check if files were created:
```powershell
Test-Path "html\static\js\stellarium-web-engine.js"
Test-Path "html\static\js\stellarium-web-engine.wasm"
```

Both should return `True`.

---

## Common Issues and What They Mean

### If `echo $env:EMSCRIPTEN_TOOL_PATH` shows nothing:
- The command didn't run correctly
- Try running it again
- Make sure you're in the `emsdk` directory

### If `emcc --version` says "command not found":
- Environment variables weren't set
- PATH wasn't updated correctly
- Try running the setup command again

### If `scons target=js` fails with "EMSCRIPTEN_TOOL_PATH not found":
- Environment variables weren't set in this PowerShell session
- You need to set them again (they only last for the current session)
- Run the one-line command again

### If build fails with compilation errors:
- Check the error message
- Make sure emsdk is fully installed
- Try running `python emsdk.py install latest` first

---

## Next Steps After Successful Build

1. **Find the built files:**
   ```powershell
   Get-ChildItem -Recurse -Filter "stellarium-web-engine.js"
   Get-ChildItem -Recurse -Filter "stellarium-web-engine.wasm"
   ```

2. **Copy them to stellarium-build directory:**
   ```powershell
   cd ..
   New-Item -ItemType Directory -Force -Path "stellarium-build"
   Copy-Item "stellarium-web-engine\html\static\js\stellarium-web-engine.js" -Destination "stellarium-build\"
   Copy-Item "stellarium-web-engine\html\static\js\stellarium-web-engine.wasm" -Destination "stellarium-build\"
   ```

3. **Verify files are there:**
   ```powershell
   Get-ChildItem "stellarium-build\"
   ```

You should see both `.js` and `.wasm` files! ✅

