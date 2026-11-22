# Servidor local sencillo para probar la app en la computadora.
# Uso: powershell -ExecutionPolicy Bypass -File herramientas\servidor.ps1  (luego abre http://localhost:8080)
param([int]$Port = 8080)
$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'application/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'
}
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Mis Finanzas en http://localhost:$Port/  (Ctrl+C para detener)"
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
      if ($rel -eq '') { $rel = 'index.html' }
      $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
      if ($full.StartsWith($root) -and (Test-Path $full -PathType Leaf)) {
        $bytes = [IO.File]::ReadAllBytes($full)
        $ext = [IO.Path]::GetExtension($full).ToLower()
        $ct = $types[$ext]; if (-not $ct) { $ct = 'application/octet-stream' }
        $ctx.Response.ContentType = $ct
        $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
        $ctx.Response.ContentLength64 = $bytes.Length
        if ($ctx.Request.HttpMethod -ne 'HEAD') { $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length) }
      } else {
        $ctx.Response.StatusCode = 404
      }
    } catch {
      Write-Host "Error: $($_.Exception.Message)"
    } finally {
      try { $ctx.Response.Close() } catch { }
    }
  }
} finally { $listener.Stop() }
