$files = Get-ChildItem -Path ".\src" -Recurse -Filter "*.jsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, 'rounded-\[.*?\]', 'rounded-xl')
    
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated $($file.Name)"
    }
}
