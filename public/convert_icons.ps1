Add-Type -AssemblyName System.Drawing
$files = @(
    "logo_pwa_192.png",
    "logo_pwa_512.png",
    "../src/app/icon.png",
    "../src/app/apple-icon.png"
)

foreach ($file in $files) {
    $path = Join-Path (Get-Location).Path $file
    if (Test-Path $path) {
        Write-Host "Processing $path"
        
        # Read the image to memory to prevent file lock when saving
        $bytes = [System.IO.File]::ReadAllBytes($path)
        $ms = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length)
        $img = [System.Drawing.Image]::FromStream($ms)
        
        $bmp = New-Object System.Drawing.Bitmap $img.Width, $img.Height
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        
        # Fill with white
        $graphics.Clear([System.Drawing.Color]::White)
        # Draw the original image on top
        $graphics.DrawImage($img, 0, 0)
        
        # Save over original file
        $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $graphics.Dispose()
        $bmp.Dispose()
        $img.Dispose()
        $ms.Dispose()
        Write-Host "Successfully processed $file"
    } else {
        Write-Host "File not found: $path"
    }
}
