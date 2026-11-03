param([ValidateRange(1024, 65535)][int]$Port = 5180)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$logs = Join-Path $projectRoot '.runlogs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$statePath = Join-Path $logs 'public-share.state.json'
function ShareProcess($processId, $marker) {
    if (-not $processId) { return $null }
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
    if ($process -and $process.CommandLine -like "*$marker*") { return $process }
    return $null
}
if (Test-Path -LiteralPath $statePath) {
    $previous = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $gateway = ShareProcess $previous.gatewayPid 'public-share-server.mjs'
    $tunnel = ShareProcess $previous.tunnelPid 'nokey@localhost.run'
    if ($gateway -and $tunnel -and $previous.url) { Write-Output ($previous.url + '/#/home'); exit 0 }
    foreach ($process in @($tunnel, $gateway)) { if ($process) { Stop-Process -Id $process.ProcessId -Force } }
}
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'apps/web/dist/index.html'))) { throw 'Build the frontend first: npm run build' }
$health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/v1/health' -TimeoutSec 10
if ($health.status -ne 'ok') { throw 'Start the local API first.' }
$env:NODE_USE_ENV_PROXY = ''
$env:MSS_PUBLIC_PORT = [string]$Port
$gateway = Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"' + (Join-Path $PSScriptRoot 'public-share-server.mjs') + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'public-share-gateway.stdout.log') -RedirectStandardError (Join-Path $logs 'public-share-gateway.stderr.log') -PassThru
$sshArgs = @('-T', '-o', 'BatchMode=yes', '-o', 'IdentityAgent=none', '-o', 'IdentitiesOnly=yes', '-o', 'IdentityFile=none', '-o', 'PreferredAuthentications=none', '-o', 'StrictHostKeyChecking=accept-new', '-o', ('UserKnownHostsFile="' + (Join-Path $logs 'public-share-known-hosts') + '"'), '-o', 'ExitOnForwardFailure=yes', '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=30', '-R', "80:127.0.0.1:$Port", 'nokey@localhost.run')
$tunnel = Start-Process -FilePath (Get-Command ssh).Source -ArgumentList $sshArgs -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'public-share-ssh.stdout.log') -RedirectStandardError (Join-Path $logs 'public-share-ssh.stderr.log') -PassThru
$state = @{ gatewayPid = $gateway.Id; tunnelPid = $tunnel.Id; port = $Port; url = $null }
$state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    if (-not (ShareProcess $gateway.Id 'public-share-server.mjs')) { throw 'Gateway stopped. See .runlogs/public-share-gateway.stderr.log' }
    if (-not (ShareProcess $tunnel.Id 'nokey@localhost.run')) { throw 'Tunnel stopped. See .runlogs/public-share-ssh.stderr.log' }
    $output = Get-Content -LiteralPath (Join-Path $logs 'public-share-ssh.stdout.log') -Raw -ErrorAction SilentlyContinue
    if ($output -match 'https://[a-z0-9-]+\.lhr\.life\b') {
        $state.url = $Matches[0]
        $state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
        Write-Output ($state.url + '/#/home')
        exit 0
    }
}
throw 'Still waiting for a tunnel URL. Check .runlogs; stop-public-share.ps1 can close these processes.'
