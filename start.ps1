# Engage - Auto-start script with GPU detection (Windows PowerShell)
# Usage: .\start.ps1 [up|down|logs|status]

param(
    [Parameter(Position=0)]
    [ValidateSet("up", "down", "logs", "status", "restart")]
    [string]$Action = "up"
)

$ErrorActionPreference = "Stop"

$ComposeFiles = @("-f", "docker-compose.yml")
$GpuDetected = $false

# Detect NVIDIA GPU
function Test-NvidiaGpu {
    try {
        $null = & nvidia-smi 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

# Check for GPU and add compose file if available
if (Test-NvidiaGpu) {
    Write-Host "√ NVIDIA GPU detected - enabling GPU acceleration" -ForegroundColor Green
    $ComposeFiles += @("-f", "docker-compose.gpu.yml")
    $GpuDetected = $true
} else {
    Write-Host "○ No NVIDIA GPU detected - running on CPU" -ForegroundColor Yellow
}

$Port = if ($env:PORT) { $env:PORT } else { "3000" }

switch ($Action) {
    "up" {
        Write-Host "Starting Engage..."
        & docker compose @ComposeFiles up -d
        Write-Host ""
        Write-Host "√ Engage is starting at http://localhost:$Port" -ForegroundColor Green
        if ($GpuDetected) {
            Write-Host "√ GPU acceleration enabled" -ForegroundColor Green
        }
        Write-Host ""
        Write-Host "Run '.\start.ps1 logs' to watch startup progress"
    }
    "down" {
        Write-Host "Stopping Engage..."
        & docker compose @ComposeFiles down
    }
    "logs" {
        & docker compose @ComposeFiles logs -f
    }
    "status" {
        & docker compose @ComposeFiles ps
    }
    "restart" {
        Write-Host "Restarting Engage..."
        & docker compose @ComposeFiles down
        & docker compose @ComposeFiles up -d
    }
}

