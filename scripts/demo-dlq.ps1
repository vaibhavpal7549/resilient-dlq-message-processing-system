param(
    [string]$ApiBaseUrl = "http://localhost:3000",
    [int]$WaitSeconds = 8
)

$messages = @(
    @{
        payload = @{
            simulateError = $true
            errorType = "VALIDATION_ERROR"
            orderId = "ORD-DEMO-1001"
        }
        source = "demo-script"
        priority = 1
        tags = @("demo", "validation")
    },
    @{
        payload = @{
            simulateError = $true
            errorType = "VALIDATION_ERROR"
            orderId = "ORD-DEMO-1002"
        }
        source = "demo-script"
        priority = 2
        tags = @("demo", "validation")
    },
    @{
        payload = @{
            simulateError = $true
            errorType = "TIMEOUT_ERROR"
            orderId = "ORD-DEMO-1003"
        }
        source = "demo-script"
        priority = 2
        tags = @("demo", "transient")
    }
)

Write-Host "Submitting demo messages to $ApiBaseUrl/api/messages" -ForegroundColor Cyan

foreach ($message in $messages) {
    $payload = $message | ConvertTo-Json -Depth 10
    $response = Invoke-RestMethod -Uri "$ApiBaseUrl/api/messages" `
        -Method Post `
        -ContentType "application/json" `
        -Body $payload

    Write-Host "Queued message $($response.messageId)" -ForegroundColor Green
}

Write-Host "Waiting $WaitSeconds seconds for queue processing..." -ForegroundColor Yellow
Start-Sleep -Seconds $WaitSeconds

Write-Host "`nDLQ stats:" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$ApiBaseUrl/api/dlq/stats" -Method Get | ConvertTo-Json -Depth 10 | Write-Host

Write-Host "`nRecent demo DLQ records:" -ForegroundColor Cyan
$encodedSource = [System.Uri]::EscapeDataString("demo-script")
Invoke-RestMethod -Uri "$ApiBaseUrl/api/dlq?source=$encodedSource&limit=10&sortOrder=desc" -Method Get | ConvertTo-Json -Depth 10 | Write-Host
