
Add-Type -AssemblyName System.Drawing


$sourcePath = "c:\Users\yawar\Documents\StreamVault\client\public\icons\icon-alt.png"
$targetPath = "c:\Users\yawar\Documents\StreamVault\client\public\icons\icon-alt-512.png"

$image = [System.Drawing.Image]::FromFile($sourcePath)
$squareSize = 512
$bmp = New-Object System.Drawing.Bitmap($squareSize, $squareSize)
$graph = [System.Drawing.Graphics]::FromImage($bmp)

# High quality settings
$graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

# Clear with transparent background (important for rounded corners)
$graph.Clear([System.Drawing.Color]::Transparent)

# Create rounded path
$cornerRadius = 100 # Adjust for desired curvature
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$rect = New-Object System.Drawing.Rectangle(0, 0, $squareSize, $squareSize)
$d = $cornerRadius * 2

$path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
$path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
$path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
$path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
$path.CloseFigure()

# Set clipping region to rounded rect
$graph.SetClip($path)

# Draw the black background first (in case the source image has transparency or fills poorly)
$graph.FillPath([System.Drawing.Brushes]::Black, $path)

# Draw the image
# Calculate aspect ratio to fit/cover
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

$graph.DrawImage($image, $x, $y, $newWidth, $newHeight)

$bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)

$image.Dispose()
$bmp.Dispose()
$graph.Dispose()
$path.Dispose()

Write-Host "Created rounded icon at $targetPath"
