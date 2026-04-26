$path = "$env:USERPROFILE\.docker\config.json"
[System.IO.File]::WriteAllText($path, '{"auths":{},"currentContext":"desktop-linux"}')
Write-Host "Fixed BOM"
