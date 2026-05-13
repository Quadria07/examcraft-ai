$files = Get-ChildItem -Path ".\src" -Recurse -Filter "*.jsx"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    # Remove shadow, shadow-sm, shadow-lg, shadow-blue-500/20, shadow-[...]
    $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, '\bshadow(?:-[a-zA-Z0-9\-\/\[\]\.\,]+)?\b', '')
    
    # Clean up any double spaces created by removal
    $newContent = [System.Text.RegularExpressions.Regex]::Replace($newContent, ' {2,}', ' ')
    
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "Updated $($file.Name)"
    }
}
