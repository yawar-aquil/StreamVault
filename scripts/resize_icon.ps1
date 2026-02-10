
Add-Type -AssemblyName System.Drawing

$sourcePath = "c:\Users\yawar\Documents\StreamVault\client\public\icons\icon-alt.png"
$targetPath = "c:\Users\yawar\Documents\StreamVault\client\public\icons\icon-alt-512.png"

$image = [System.Drawing.Image]::FromFile($sourcePath)
$squareSize = 512
$bmp = New-Object System.Drawing.Bitmap($squareSize, $squareSize)
$graph = [System.Drawing.Graphics]::FromImage($bmp)

# Fill with black background
$graph.Clear([System.Drawing.Color]::Black)

# Calculate aspect ratio
$ratio = $image.Width / $image.Height
$newWidth = $squareSize
$newHeight = $squareSize

if ($ratio -gt 1) {
    # Landscape
    $newHeight = [int]($squareSize / $ratio)
} else {
    # Portrait
    $newWidth = [int]($squareSize * $ratio)
}

$x = [int](($squareSize - $newWidth) / 2)
$y = [int](($squareSize - $newHeight) / 2)

$graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graph.DrawImage($image, $x, $y, $newWidth, $newHeight)

$bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)

$image.Dispose()
$bmp.Dispose()
$graph.Dispose()

Write-Host "Resized image saved to $targetPath"
