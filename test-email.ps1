# Send one of the staggered programme emails to your inbox for previewing.
# Uses the test-mode bypass in process-daily-emails (guarded by TEST_MODE_KEY).
#
#   .\test-email.ps1 -Day 14 -Email you@example.com
#   .\test-email.ps1 -Day 0  -Email you@example.com -Goal "learning guitar"

param(
  [Parameter(Mandatory=$true)][int]$Day,
  [Parameter(Mandatory=$true)][string]$Email,
  [string]$Goal
)

$keyFile = Join-Path $HOME '.mind-sovereignty-test-key'
if (-not (Test-Path $keyFile)) {
  Write-Error "Missing $keyFile. Regenerate a key and set it as the TEST_MODE_KEY Supabase secret."
  exit 1
}
$key = (Get-Content $keyFile -Raw).Trim()

$envFile = Join-Path $PSScriptRoot '.env'
$anon = $null
foreach ($line in Get-Content $envFile) {
  if ($line -match '^VITE_SUPABASE_ANON_KEY=(.+)$') { $anon = $matches[1].Trim(); break }
}
if (-not $anon) {
  Write-Error "VITE_SUPABASE_ANON_KEY not found in $envFile"
  exit 1
}

$projectRef = 'pkiviewfgzspwzpvazjm'
$qs = "test=$key&day=$Day&email=$([uri]::EscapeDataString($Email))"
if ($Goal) { $qs += "&goal=$([uri]::EscapeDataString($Goal))" }
$url = "https://$projectRef.supabase.co/functions/v1/process-daily-emails?$qs"

$headers = @{ 'Authorization' = "Bearer $anon"; 'apikey' = $anon }

try {
  $r = Invoke-WebRequest -Uri $url -Method POST -Headers $headers -UseBasicParsing
  Write-Output "OK ($($r.StatusCode))"
  Write-Output $r.Content
} catch {
  $status = $_.Exception.Response.StatusCode.value__
  Write-Output "FAILED ($status)"
  $stream = $_.Exception.Response.GetResponseStream()
  $reader = New-Object System.IO.StreamReader($stream)
  Write-Output ($reader.ReadToEnd())
}
