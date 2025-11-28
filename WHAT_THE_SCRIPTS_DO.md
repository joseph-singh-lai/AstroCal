# What Happens When You Run the Build Scripts

## build-simple.bat - Step by Step

When you run `build-simple.bat`, here's what happens:

### 1. **Initial Setup**
- Finds the directory where the script is located
- Changes to that directory (your project root: `C:\Users\Admin\Desktop\AstroCal`)
- Checks if `emsdk` directory exists
- Checks if `stellarium-web-engine` directory exists
- If either is missing, shows an error and stops

### 2. **Activate Emscripten SDK**
- Changes to the `emsdk` directory
- Runs `emsdk activate latest` to activate the latest Emscripten version
- Runs `emsdk_env.bat` to set up Emscripten environment variables
- Sets these environment variables:
  - `EMSDK` = path to emsdk directory
  - `EMSCRIPTEN` = path to emscripten compiler
  - `EMSCRIPTEN_TOOL_PATH` = path to emscripten tools (required by SConstruct)
  - Updates `PATH` to include emscripten tools

### 3. **Build Stellarium Web Engine**
- Changes to `stellarium-web-engine` directory
- Checks if `SConstruct` file exists (the build configuration)
- Runs `scons target=js` to build the JavaScript/WASM version
- This step takes 10-30 minutes and compiles C++ code to WebAssembly

### 4. **Copy Built Files**
- Looks for the built files (`stellarium-web-engine.js` and `.wasm`)
- Usually finds them in `html\static\js\` directory
- Creates `stellarium-build\` directory in your project root
- Copies the files there so your website can use them

### 5. **Done!**
- Shows success message
- Files are ready in `stellarium-build\` directory

## SETUP_ENV.ps1 - What It Does

When you run `SETUP_ENV.ps1` from the `emsdk` directory:

### 1. **Gets Current Location**
- Assumes you're in the `emsdk` directory
- Gets the full path to that directory

### 2. **Calculates Paths**
- Builds the path to `upstream\emscripten` subdirectory
- This is where the Emscripten compiler tools are located

### 3. **Sets Environment Variables**
- `EMSDK` = current directory (emsdk)
- `EMSCRIPTEN` = path to emscripten compiler
- `EMSCRIPTEN_TOOL_PATH` = same as EMSCRIPTEN (required!)
- Updates `PATH` to include these directories

### 4. **Verifies Setup**
- Checks if `emcc.bat` exists (the Emscripten C compiler)
- Shows you if everything is set up correctly

### 5. **Shows Next Steps**
- Tells you to go to stellarium directory
- Tells you to run `scons target=js`

## What You'll See

### build-simple.bat Output:
```
=== Stellarium Web Engine Build ===

Current directory: C:\Users\Admin\Desktop\AstroCal

Step 1: Activating emsdk...
[emsdk activation output]

Environment variables set:
  EMSDK=C:\Users\Admin\Desktop\AstroCal\emsdk
  EMSCRIPTEN_TOOL_PATH=C:\Users\Admin\Desktop\AstroCal\emsdk\upstream\emscripten

Step 2: Building Stellarium Web Engine...
Running: scons target=js
This may take 10-30 minutes...
[scons build output - lots of compilation messages]

Build completed successfully!

Step 3: Looking for built files...
Found files in html\static\js\
Files copied to stellarium-build

=== Done ===
```

### SETUP_ENV.ps1 Output:
```
Setting up Emscripten environment...

EMSDK path: C:\Users\Admin\Desktop\AstroCal\emsdk
Emscripten path: C:\Users\Admin\Desktop\AstroCal\emsdk\upstream\emscripten

Environment variables set:
  EMSDK = C:\Users\Admin\Desktop\AstroCal\emsdk
  EMSCRIPTEN_TOOL_PATH = C:\Users\Admin\Desktop\AstroCal\emsdk\upstream\emscripten

✓ emcc.bat found

Now you can run: cd ..\stellarium-web-engine
Then run: scons target=js
```

## What Gets Created

After a successful build, you'll have:

1. **stellarium-build/** directory containing:
   - `stellarium-web-engine.js` (~2-5 MB) - JavaScript wrapper
   - `stellarium-web-engine.wasm` (~5-10 MB) - WebAssembly binary

2. These files can then be used by `sky-map-engine.html` to render the interactive sky map.

## Time Estimates

- **emsdk activation**: 1-2 minutes (first time only)
- **Building Stellarium**: 10-30 minutes (depends on your CPU)
- **Total**: Usually 15-35 minutes for first build

## If Something Goes Wrong

The scripts will:
- Show clear error messages
- Tell you what's missing
- Stop at the first error (so you can fix it)
- Not continue if prerequisites aren't met

## Why Use Scripts?

- **Automatic path handling** - No need to manually construct paths
- **Error checking** - Verifies everything exists before proceeding
- **Environment setup** - Sets all required variables correctly
- **Reproducible** - Same steps every time

