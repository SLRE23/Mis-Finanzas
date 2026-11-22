# Genera los íconos PNG de la app (mismo diseño que icons/icon.svg).
# Uso: powershell -ExecutionPolicy Bypass -File herramientas\generar-iconos.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'icons'
New-Item -ItemType Directory -Force $out | Out-Null

function New-Icon([int]$size, [string]$name) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $s = $size / 512.0
  # Fondo a sangre completa (sirve como ícono "maskable" en Android)
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0f766e'))

  function Bar($x, $y, $w, $h, $hex) {
    $b = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
    $r = 14 * $s
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $X = $x * $s; $Y = $y * $s; $W = $w * $s; $H = $h * $s; $d = $r * 2
    $path.AddArc($X, $Y, $d, $d, 180, 90)
    $path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
    $path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
    $path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($b, $path)
  }
  Bar 120 292 56 100 '#99f6e4'
  Bar 228 232 56 160 '#5eead4'
  Bar 336 160 56 232 '#ffffff'

  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), (22 * $s)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $pts = @(
    (New-Object System.Drawing.PointF (120 * $s), (236 * $s)),
    (New-Object System.Drawing.PointF (228 * $s), (170 * $s)),
    (New-Object System.Drawing.PointF (300 * $s), (196 * $s)),
    (New-Object System.Drawing.PointF (392 * $s), (112 * $s))
  )
  $g.DrawLines($pen, [System.Drawing.PointF[]]$pts)

  $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-Icon 192 'icon-192.png'
New-Icon 512 'icon-512.png'
New-Icon 180 'apple-touch-icon.png'
Write-Host "Iconos generados en $out"
