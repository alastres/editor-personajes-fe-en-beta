# Sube a GitHub los cambios del editor de personajes y escenas (solo lo que permite .gitignore).
#   ./sincronizar.ps1 "qué cambió"
param([string]$mensaje = "Actualizar editor de personajes y escenas")
Set-Location $PSScriptRoot
git pull --rebase --autostash
if (-not $?) { Write-Host "No se pudo traer lo último de GitHub: revisa el conflicto antes de seguir."; exit 1 }
git add -A
git diff --cached --quiet
if ($?) { Write-Host "No hay cambios que subir."; exit 0 }
git commit -m $mensaje
if ($?) { git push }
