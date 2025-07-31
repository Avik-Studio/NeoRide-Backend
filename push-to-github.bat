@echo off
echo ===== Pushing NeoRide Backend to GitHub =====
echo.

cd %~dp0
echo Current directory: %CD%
echo.

echo Initializing Git repository...
git init

echo.
echo Adding all files...
git add .

echo.
echo Committing changes...
git commit -m "MongoDB backend API for Vercel deployment"

echo.
echo Adding remote repository...
git remote add origin https://github.com/Avik-Studio/NeoRide-Official.git

echo.
echo Pushing to NeoRide-Backend-Official branch...
git push -u origin NeoRide-Backend-Official

echo.
echo If you see any errors, you might need to pull first:
echo git pull origin NeoRide-Backend-Official --allow-unrelated-histories
echo.

echo Done!
pause