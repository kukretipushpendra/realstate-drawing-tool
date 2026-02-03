@echo off
REM Vercel Deployment Helper for Windows
REM Run this script to verify and deploy your app

echo.
echo ========================================
echo  Drawing Tab - Vercel Deployment Setup
echo ========================================
echo.

REM Step 1: Test build
echo [Step 1] Testing production build...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Build failed. Please fix the errors above.
    pause
    exit /b 1
)

echo.
echo ✓ Build successful!
echo.

REM Step 2: Show git commands
echo [Step 2] Ready to push to GitHub
echo.
echo Run these commands:
echo   git add .
echo   git commit -m "Drawing Tab - Ready for Vercel"
echo   git push origin main
echo.

REM Step 3: Show deployment options
echo [Step 3] Deploy to Vercel
echo.
echo Option A: Web Dashboard (Recommended)
echo   1. Visit: https://vercel.com/new
echo   2. Click "Import Project"
echo   3. Select your GitHub repository
echo   4. Click "Deploy"
echo   5. Done! Your app goes live in 2-3 minutes.
echo.
echo Option B: Vercel CLI
echo   npm i -g vercel
echo   vercel --prod
echo.

echo ========================================
echo  Status: READY FOR VERCEL DEPLOYMENT
echo ========================================
echo.
echo Next steps:
echo 1. git add . && git commit -m "Deploy" && git push
echo 2. Go to https://vercel.com/new
echo 3. Import your GitHub repository
echo 4. Click Deploy
echo.
pause
