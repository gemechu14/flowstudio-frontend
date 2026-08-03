@echo off
setlocal
cd /d "%~dp0.."

echo ==> Installing Sphinx deps...
python -m pip install -r docs\requirements.txt
if errorlevel 1 exit /b 1

echo ==> Building HTML...
python -m sphinx -b html docs docs\_build\html
if errorlevel 1 (
  echo Sphinx finished with errors.
  exit /b 1
)

echo ==> Built: docs\_build\html
echo Open docs\_build\html\index.html
echo.
echo Deploy ONLY docs\_build\html\* to /var/www/frontend-documentation/
echo Never upload .rst or conf.py to the public server.
echo.
echo Verify:
echo   curl -I https://flowstudio.crestwardlabs.com/frontend-documentation/
echo   curl -I https://flowstudio.crestwardlabs.com/frontend-documentation/_static/css/theme.css

endlocal
