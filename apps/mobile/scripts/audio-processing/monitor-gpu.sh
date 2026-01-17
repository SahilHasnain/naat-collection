#!/bin/bash
# GPU Monitoring Script for Azure VM
# Shows GPU usage, memory, and running processes

echo "🎮 GPU Monitoring Dashboard"
echo "======================================"
echo ""

# Check if nvidia-smi exists
if ! command -v nvidia-smi &> /dev/null; then
    echo "❌ nvidia-smi not found. Is this a GPU VM?"
    exit 1
fi

# GPU Info
echo "📊 GPU Information:"
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader

echo ""
echo "💾 GPU Memory Usage:"
nvidia-smi --query-gpu=memory.used,memory.free,memory.total --format=csv,noheader

echo ""
echo "🔥 GPU Utilization:"
nvidia-smi --query-gpu=utilization.gpu,utilization.memory,temperature.gpu --format=csv,noheader

echo ""
echo "⚡ Running Processes:"
nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv,noheader

echo ""
echo "======================================"
echo "💡 For continuous monitoring, run:"
echo "   watch -n 1 nvidia-smi"
echo ""
echo "💡 To see detailed stats:"
echo "   nvidia-smi dmon"
