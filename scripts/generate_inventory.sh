#!/bin/bash

# Proxmox Hardware Inventory Generator
# Run this on your Proxmox node to generate a JSON snippet for the dashboard.
# Usage: ./generate_inventory.sh

NODE_NAME=$(hostname)
MANUFACTURER=$(dmidecode -s system-manufacturer 2>/dev/null || echo "Unknown")
PRODUCT=$(dmidecode -s system-product-name 2>/dev/null || echo "Unknown")
CPU=$(lscpu | grep 'Model name' | cut -f 2 -d ":" | awk '{$1=$1}1')

echo "Copy the following JSON snippet into the 'nodes' object in hardware_inventory.json:"
echo ""
echo "  \"$NODE_NAME\": {"
echo "    \"manufacturer\": \"$MANUFACTURER\","
echo "    \"productName\": \"$PRODUCT\","
echo "    \"cpuModel\": \"$CPU\""
echo "  },"
echo ""
