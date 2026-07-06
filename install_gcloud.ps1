# ─── Silent Google Cloud CLI Installer for Windows ────────────────────────────
$ErrorActionPreference = "Stop"

$Url = "https://storage.googleapis.com/cloud-sdk-release/google-cloud-sdk-575.0.0-windows-x86_64-bundled-python.zip"
$ZipFile = Join-Path $pwd "gcloud.zip"
$DestDir = Join-Path $pwd "google-cloud-sdk"

# 1. Download archive
Write-Host "→ Downloading Google Cloud CLI bundled archive (150MB+)..."
Invoke-WebRequest -Uri $Url -OutFile $ZipFile

# 2. Extract archive
Write-Host "→ Extracting archive (this may take a minute)..."
if (Test-Path $DestDir) {
    Remove-Item -Recurse -Force $DestDir
}
Expand-Archive -Path $ZipFile -DestinationPath $pwd -Force

# 3. Clean up zip
Write-Host "→ Cleaning up installer files..."
Remove-Item -Force $ZipFile

# 4. Install silently
Write-Host "→ Initializing Google Cloud CLI..."
& ".\google-cloud-sdk\install.bat" --quiet --path-update false --usage-reporting false

# 5. Export binary folder path to the environment
Write-Host "→ Google Cloud CLI successfully installed!"
Write-Host "Binary path: $(Join-Path $DestDir 'bin')"
