# Build FlowStudio Sphinx docs and optionally sync HTML to a deploy path.
# Usage:
#   .\docs\publish.ps1
#   .\docs\publish.ps1 -DeployPath "\\server\var\www\frontend-documentation"

param(
  [string]$DeployPath = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Root) { $Root = (Get-Location).Path }
$Docs = Join-Path $Root "docs"
$Out = Join-Path $Docs "_build\html"

Write-Host "==> Installing Sphinx deps..."
python -m pip install -r (Join-Path $Docs "requirements.txt")

Write-Host "==> Building HTML..."
python -m sphinx -b html $Docs $Out -W --keep-going
if ($LASTEXITCODE -ne 0) {
  Write-Host "Sphinx reported warnings/errors (see above)."
}

Write-Host "==> Built: $Out"
Write-Host "Open: $(Join-Path $Out 'index.html')"

if ($DeployPath) {
  if (-not (Test-Path $DeployPath)) {
    New-Item -ItemType Directory -Force -Path $DeployPath | Out-Null
  }
  Write-Host "==> Syncing HTML only to $DeployPath ..."
  # Deploy ONLY built HTML — never .rst / conf.py
  robocopy $Out $DeployPath /MIR /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  Write-Host "Deployed."
} else {
  Write-Host "Tip: pass -DeployPath to copy docs/_build/html/* to the server alias path."
  Write-Host "Target example: /var/www/frontend-documentation/"
}
