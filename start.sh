#!/bin/bash
# Engage - Auto-start script with GPU detection
# Usage: ./start.sh [up|down|logs|status]

set -e

ACTION="${1:-up}"
COMPOSE_FILES="-f docker-compose.yml"
GPU_DETECTED=false

# Detect NVIDIA GPU
detect_gpu() {
    if command -v nvidia-smi &> /dev/null; then
        if nvidia-smi &> /dev/null; then
            GPU_DETECTED=true
            return 0
        fi
    fi
    return 1
}

# Check for GPU and add compose file if available
if detect_gpu; then
    echo "✓ NVIDIA GPU detected - enabling GPU acceleration"
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.gpu.yml"
else
    echo "○ No NVIDIA GPU detected - running on CPU"
fi

case "$ACTION" in
    up)
        echo "Starting Engage..."
        docker compose $COMPOSE_FILES up -d
        echo ""
        echo "✓ Engage is starting at http://localhost:${PORT:-3000}"
        if [ "$GPU_DETECTED" = true ]; then
            echo "✓ GPU acceleration enabled"
        fi
        echo ""
        echo "Run './start.sh logs' to watch startup progress"
        ;;
    down)
        echo "Stopping Engage..."
        docker compose $COMPOSE_FILES down
        ;;
    logs)
        docker compose $COMPOSE_FILES logs -f
        ;;
    status)
        docker compose $COMPOSE_FILES ps
        ;;
    restart)
        echo "Restarting Engage..."
        docker compose $COMPOSE_FILES down
        docker compose $COMPOSE_FILES up -d
        ;;
    *)
        echo "Usage: $0 [up|down|logs|status|restart]"
        echo ""
        echo "Commands:"
        echo "  up      - Start all services (default)"
        echo "  down    - Stop all services"
        echo "  logs    - Follow service logs"
        echo "  status  - Show service status"
        echo "  restart - Restart all services"
        exit 1
        ;;
esac

