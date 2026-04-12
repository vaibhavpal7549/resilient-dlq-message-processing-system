param(
    [string]$ApiBaseUrl = "http://localhost:3000",
    [ValidateSet("mongo", "spool")]
    [string]$Mode = "mongo",
    [string]$ErrorType = "",
    [string]$Source = "",
    [string]$StartDate = "",
    [string]$EndDate = "",
    [int]$BatchSize = 25,
    [switch]$DryRun
)

if ($Mode -eq "spool") {
    $endpoint = "$ApiBaseUrl/api/dlq/spool/replay"
    $payload = @{
        batchSize = $BatchSize
    }
} else {
    $filters = @{}
    if ($ErrorType) { $filters.errorType = $ErrorType }
    if ($Source) { $filters.source = $Source }
    if ($StartDate) { $filters.startDate = $StartDate }
    if ($EndDate) { $filters.endDate = $EndDate }

    $endpoint = "$ApiBaseUrl/api/dlq/replay-batch"
    $payload = @{
        filters = $filters
        batchSize = $BatchSize
        dryRun = $DryRun.IsPresent
    }
}

Write-Host "Calling $endpoint" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $endpoint `
        -Method Post `
        -ContentType "application/json" `
        -Body ($payload | ConvertTo-Json -Depth 10)

    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
