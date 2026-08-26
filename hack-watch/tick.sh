#!/bin/bash
# One watch iteration: poll, diff, rebuild the dashboard.
cd "$(dirname "$0")" || exit 1
echo "=== POLL ==="
python3 monitor.py || exit 1
echo "=== BUILD ==="
python3 build.py
