# DLQ Replay Script (PowerShell version for Windows)
# Usage: .\replay-dlq.ps1 -ErrorType "TIMEOUT_ERROR" -StartDate "2026-02-10T00:00:00Z" -BatchSize 100

param(
    [string]$ErrorType = "",
    [string]$StartDate = "",
    [string]$EndDate = "",
    [string]$Source = "",
    [int]$BatchSize = 100,
    [switch]$DryRun
)

# Build filters object
$filters = @{}
if ($ErrorType) { $filters.errorType = $ErrorType }
if ($StartDate) { $filters.startDate = $StartDate }
if ($EndDate) { $filters.endDate = $EndDate }
if ($Source) { $filters.source = $Source }

# Build payload
$payload = @{
    filters = $filters
    batchSize = $BatchSize
    dryRun = $DryRun.IsPresent
} | ConvertTo-Json

Write-Host "Replaying DLQ messages..." -ForegroundColor Cyan
Write-Host "Payload: $payload" -ForegroundColor Gray

# Call API
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/dlq/replay-batch" `
        -Method Post `
        -ContentType "application/json" `
        -Body $payload

    Write-Host "`nReplay complete!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "`nReplay failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
