param([string]$path)
(Get-Content -Raw $path) -replace '^pick e5bc512','edit e5bc512' | Set-Content -Path $path
