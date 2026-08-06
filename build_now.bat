@echo off
echo =========================================================
echo    Building AfiaCare Native Flutter Release APK
echo =========================================================
echo.
echo Building Flutter Release APK...
call "E:\flutter\bin\flutter.bat" build apk --release --no-tree-shake-icons

echo.
echo Copying APK to project root...
if exist "build\app\outputs\flutter-apk\app-release.apk" (
    copy /Y "build\app\outputs\flutter-apk\app-release.apk" "AfiaCare.apk"
    echo.
    echo =========================================================
    echo     BUILD AND EXPORT SUCCESSFUL!
    echo =========================================================
    echo File created: E:\AlResafaClinic\AfiaCare.apk
    dir "AfiaCare.apk"
) else (
    echo.
    echo [ERROR] app-release.apk not found.
)
echo.
pause
