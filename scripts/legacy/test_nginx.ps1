$loginBody = @{ email = "final@test.com"; password = "Pass123!" } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri "http://localhost/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
Write-Host "LOGIN: OK, token=$($loginResp.access_token.Substring(0,20))..."

$headers = @{ Authorization = "Bearer $($loginResp.access_token)" }
$courseBody = @{ title = "Nginx Course"; description = "via nginx"; category = "math" } | ConvertTo-Json

try {
    $courseResp = Invoke-RestMethod -Uri "http://localhost/api/v1/courses/" -Method POST -Body $courseBody -ContentType "application/json" -Headers $headers
    Write-Host "CREATE COURSE: OK - $($courseResp.title)"
} catch {
    Write-Host "CREATE COURSE FAILED: $($_.Exception.Message)"
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    Write-Host "Response body: $($reader.ReadToEnd())"
}
