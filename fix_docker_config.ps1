$configPath = "$env:USERPROFILE\.docker\config.json"
$json = @{
    auths = @{}
    currentContext = "desktop-linux"
} | ConvertTo-Json
Set-Content -Path $configPath -Value $json -Encoding UTF8
Write-Host "Docker config fixed: $configPath"
Get-Content $configPath
