$ErrorActionPreference = 'Stop'

# Recover only Docker's disposable Windows IPC directories. Never touch VM disks,
# images, volumes, credentials, or project configuration.
$probe = Start-Process docker -ArgumentList 'info','--format','{{.ServerVersion}}' -WindowStyle Hidden -PassThru
if ($probe.WaitForExit(15000) -and $probe.ExitCode -eq 0) {
    Write-Output 'Docker is already running.'
    exit 0
}
if (-not $probe.HasExited) { Stop-Process -Id $probe.Id -Force }

$backendLog = Join-Path $env:LOCALAPPDATA 'Docker\log\host\com.docker.backend.exe.log'
$recent = if (Test-Path -LiteralPath $backendLog) { Get-Content -LiteralPath $backendLog -Tail 400 }
if (($recent -join "`n") -match 'initializing (Inference manager|Secrets Engine).*The file cannot be accessed by the system') {
    Get-CimInstance Win32_Process -Filter "name = 'com.docker.backend.exe' OR name = 'Docker Desktop.exe'" |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    foreach ($relative in @('Docker\run', 'docker-secrets-engine')) {
        $directory = Join-Path $env:LOCALAPPDATA $relative
        if (Test-Path -LiteralPath $directory) {
            Rename-Item -LiteralPath $directory -NewName ((Split-Path $directory -Leaf) + '.stale-' + $stamp)
            Write-Output "Preserved IPC directory: $directory.stale-$stamp"
        }
    }
}
Start-Process -FilePath 'C:\Program Files\Docker\Docker\Docker Desktop.exe' -WindowStyle Hidden
Write-Output 'Docker Desktop is starting. Backups were preserved; no container data was removed.'
