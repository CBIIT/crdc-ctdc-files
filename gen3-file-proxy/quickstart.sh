#!/bin/bash

# Quick Start Script for Gen3 File Proxy Service
# This script helps you get started quickly

set -e

echo "=========================================="
echo "Gen3 File Proxy Service - Quick Start"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env and set your Gen3 configuration:"
    echo "   - GEN3_API_URL (required)"
    echo "   - ALLOWED_ORIGINS (your frontend URL)"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Check for required environment variables
source .env

if [ -z "$GEN3_API_URL" ] || [ "$GEN3_API_URL" = "https://your-gen3-commons.org" ]; then
    echo "❌ Error: GEN3_API_URL not configured in .env"
    exit 1
fi

echo "✓ Configuration loaded"
echo "  Gen3 API: $GEN3_API_URL"
echo ""

# Ask user for installation method
echo "Choose installation method:"
echo "  1) Docker (recommended)"
echo "  2) Local Python"
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo ""
        echo "Starting with Docker..."
        if ! command -v docker &> /dev/null; then
            echo "❌ Error: Docker not found. Please install Docker first."
            exit 1
        fi
        
        echo "Building Docker image..."
        docker-compose build
        
        echo "Starting service..."
        docker-compose up -d
        
        echo ""
        echo "✓ Service started!"
        echo ""
        echo "View logs: docker-compose logs -f"
        ;;
    
    2)
        echo ""
        echo "Installing locally..."
        
        # Check Python version
        if ! command -v python3 &> /dev/null; then
            echo "❌ Error: Python 3 not found"
            exit 1
        fi
        
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
        echo "✓ Found Python $PYTHON_VERSION"
        
        # Create virtual environment
        if [ ! -d venv ]; then
            echo "Creating virtual environment..."
            python3 -m venv venv
        fi
        
        echo "Activating virtual environment..."
        source venv/bin/activate
        
        echo "Installing dependencies..."
        pip install -q --upgrade pip
        pip install -q -r requirements.txt
        
        echo "Starting service..."
        python main.py &
        SERVICE_PID=$!
        
        echo ""
        echo "✓ Service started (PID: $SERVICE_PID)"
        echo ""
        echo "Stop with: kill $SERVICE_PID"
        ;;
    
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Service is running!"
echo "=========================================="
echo ""
echo "Available endpoints:"
echo "  • Health:      http://localhost:${PORT:-8000}/health"
echo "  • API Docs:    http://localhost:${PORT:-8000}/docs"
echo "  • File API:    http://localhost:${PORT:-8000}/api/files/{file_id}"
echo ""
echo "Test with:"
echo '  curl http://localhost:'${PORT:-8000}'/health'
echo ""
echo "Download a file:"
echo '  curl -H "Authorization: Bearer YOUR_TOKEN" \'
echo '       http://localhost:'${PORT:-8000}'/api/files/YOUR_FILE_ID \'
echo '       --output file.dat'
echo ""
echo "=========================================="
