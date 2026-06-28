param(
  [string]$Version = "",
  [switch]$RunSmokeTest
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

$candidates = @(
  "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
  "C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

$csc = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $csc) {
  throw "csc.exe was not found. Install .NET Framework build tools or use a Windows runner with .NET Framework."
}

$releaseDir = Join-Path $Root "release"
$sourcePath = Join-Path $Root "native\winforms\AiVideoAgentNative.cs"
$readmePath = Join-Path $Root "native\winforms\README.md"
$exePath = Join-Path $releaseDir ("AI-Video-Agent-Native-{0}-Windows-x64.exe" -f $Version)
$zipPath = Join-Path $releaseDir ("AI-Video-Agent-Native-{0}-Windows-x64.zip" -f $Version)
$shaPath = $zipPath + ".sha256"
$iconPath = Join-Path $Root "public\logo.ico"

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null

$compileArgs = @(
  "/nologo",
  "/target:winexe",
  "/platform:x64",
  "/optimize+",
  "/out:$exePath",
  "/reference:System.dll",
  "/reference:System.Core.dll",
  "/reference:System.Drawing.dll",
  "/reference:System.Windows.Forms.dll",
  $sourcePath
)

if (Test-Path -LiteralPath $iconPath) {
  $compileArgs = @("/win32icon:$iconPath") + $compileArgs
}

Write-Host "[native] compiling $exePath"
& $csc @compileArgs

if (-not (Test-Path -LiteralPath $exePath)) {
  throw "Native executable was not created: $exePath"
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
if (Test-Path -LiteralPath $shaPath) {
  Remove-Item -LiteralPath $shaPath -Force
}

Write-Host "[native] packaging $zipPath"
Compress-Archive -LiteralPath @($exePath, $readmePath) -DestinationPath $zipPath -Force

$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
Set-Content -LiteralPath $shaPath -Encoding ASCII -Value ("{0}  {1}" -f $hash, (Split-Path -Leaf $zipPath))

if ($RunSmokeTest) {
  Write-Host "[native] smoke testing executable startup"
  $process = Start-Process -FilePath $exePath -ArgumentList $Root -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 4
  if ($process.HasExited) {
    throw "Native executable exited during smoke test with code $($process.ExitCode)"
  }
  Stop-Process -Id $process.Id -Force
}

Write-Host "[native] exe: $exePath"
Write-Host "[native] zip: $zipPath"
Write-Host "[native] sha256: $hash"
