param(
  [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $Root

if ([string]::IsNullOrWhiteSpace($Version)) {
  $packageJson = Get-Content -LiteralPath (Join-Path $Root "package.json") -Encoding UTF8 -Raw
  $match = [regex]::Match($packageJson, '"version"\s*:\s*"([^"]+)"')
  if (-not $match.Success) {
    throw "Cannot read version from package.json"
  }
  $Version = $match.Groups[1].Value
}

$exePath = Join-Path $Root ("release\AI-Video-Agent-Native-{0}-Windows-x64.exe" -f $Version)
if (-not (Test-Path -LiteralPath $exePath)) {
  & (Join-Path $Root "scripts\build-native-desktop.ps1") -Version $Version
}

Start-Process -FilePath $exePath -ArgumentList $Root
