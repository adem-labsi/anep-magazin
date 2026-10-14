@echo off
cd /d "%~dp0"
where podman-compose >nul 2>nul
if %errorlevel% equ 0 (
  set "COMPOSE=podman-compose"
) else (
  where docker >nul 2>nul
  if %errorlevel% equ 0 (
    set "COMPOSE=docker compose"
  ) else (
    echo Erreur : aucun moteur compose trouve (docker ou podman).
    exit /b 1
  )
)

echo Construction avec : %COMPOSE%
%COMPOSE% -f docker-compose.yml build
if %errorlevel% neq 0 exit /b %errorlevel%
%COMPOSE% -f docker-compose.deploy.yml build

echo Build termine. Demarrage :
echo   podman compose -f docker-compose.yml up -d      pour le developpement
echo   podman compose -f docker-compose.deploy.yml up -d --build  pour la production