param(
    [switch]$Standalone
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$UiDir = Join-Path $RepoRoot "ui"
$UiOutDir = Join-Path $UiDir "out"
$OutputDir = Join-Path $RepoRoot "release"
$IconPath = Join-Path $RepoRoot "icon.png"
$AddSoundsDir = Join-Path $RepoRoot "sounds\transaction-add"
$DeleteSoundsDir = Join-Path $RepoRoot "sounds\transaction-delete"
$OneFile = -not $Standalone
$AppVersion = "0.0.5"

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed ($LASTEXITCODE): $FilePath $($Arguments -join ' ')"
    }
}

function Resolve-PythonCommand {
    if (Get-Command py -ErrorAction SilentlyContinue) {
        & py -3.12 --version | Out-Null
        if ($LASTEXITCODE -eq 0) {
            return @{ File = "py"; Prefix = @("-3.12") }
        }
    }
    return @{ File = "python"; Prefix = @() }
}

Write-Host "==> Repo root: $RepoRoot"

if (-not (Test-Path $UiDir)) {
    throw "UI directory not found: $UiDir"
}

if (-not (Test-Path $IconPath)) {
    throw "Icon file not found: $IconPath"
}

foreach ($SoundDir in @($AddSoundsDir, $DeleteSoundsDir)) {
    if (-not (Test-Path $SoundDir)) {
        throw "Sound directory not found: $SoundDir"
    }
}

$Py = Resolve-PythonCommand
Write-Host "==> Python command: $($Py.File) $($Py.Prefix -join ' ')"

Write-Host "==> Installing Python dependencies"
Invoke-CheckedCommand -FilePath $Py.File -Arguments ($Py.Prefix + @("-m", "pip", "install", "-r", (Join-Path $RepoRoot "requirements.txt")))
Invoke-CheckedCommand -FilePath $Py.File -Arguments ($Py.Prefix + @("-m", "pip", "install", "-r", (Join-Path $RepoRoot "requirements-build.txt")))

Write-Host "==> Installing UI dependencies"
Push-Location $UiDir
Invoke-CheckedCommand -FilePath "npm" -Arguments @("ci", "--prefer-offline", "--no-audit", "--no-fund")
Write-Host "==> Building UI production bundle"
Invoke-CheckedCommand -FilePath "npm" -Arguments @("run", "build")
Pop-Location

if (-not (Test-Path (Join-Path $UiOutDir "index.html"))) {
    throw "Static UI export not found after build: $UiOutDir"
}

Write-Host "==> Building executable with Nuitka"
New-Item -ItemType Directory -Force $OutputDir | Out-Null

$nuitkaArgs = $Py.Prefix + @(
    "-m", "nuitka",
    "--assume-yes-for-downloads",
    "--remove-output",
    "--windows-console-mode=disable",
    "--windows-icon-from-ico=$IconPath",
    "--output-dir=$OutputDir",
    "--output-filename=TorCalculator.exe",
    "--include-data-dir=$UiOutDir=ui/out",
    "--include-data-dir=$AddSoundsDir=sounds/transaction-add",
    "--include-data-dir=$DeleteSoundsDir=sounds/transaction-delete",
    (Join-Path $RepoRoot "app.py")
)

if ($OneFile) {
    $nuitkaArgs += "--onefile"
    $nuitkaArgs += "--onefile-tempdir-spec={CACHE_DIR}/TorCalculator/$AppVersion"
    Write-Host "==> Build mode: onefile (single exe)"
} else {
    $nuitkaArgs += "--standalone"
    Write-Host "==> Build mode: standalone (folder)"
}

Invoke-CheckedCommand -FilePath $Py.File -Arguments $nuitkaArgs

Write-Host ""
Write-Host "==> Build completed."
Write-Host "Artifacts:"
if ($OneFile) {
    Write-Host "    $OutputDir\TorCalculator.exe"
} else {
    Write-Host "    $OutputDir"
}
