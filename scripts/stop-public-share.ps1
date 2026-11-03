$ErrorActionPreference = 'Stop'
$statePath = Join-Path (Split-Path $PSScriptRoot -Parent) '.runlogs/public-share.state.json'
if (-not (Test-Path -LiteralPath $statePath)) { Write-Output 'No recorded public share.'; exit 0 }
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
foreach ($entry in @(@{id=$state.tunnelPid; marker='nokey@localhost.run'}, @{id=$state.gatewayPid; marker='public-share-server.mjs'})) {
    if (-not $entry.id) { continue }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.id)" -ErrorAction SilentlyContinue
    if ($process -and $process.CommandLine -like "*$($entry.marker)*") {
        Stop-Process -Id $process.ProcessId -Force
    }
}
$state.url = $null
$state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
Write-Output 'Public share closed. Local frontend, API and Docker were left running.'
