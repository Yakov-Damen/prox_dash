# Proxmox Provider Setup

## Overview
The Proxmox provider allows `prox_dash` to connect to one or more Proxmox VE clusters. It uses the Proxmox API to fetch cluster status, node health, and VM/LXC container details.

## Configuration

Add a Proxmox entry to your `infrastructure_config.json`:

```json
{
  "name": "My Proxmox Cluster",
  "type": "proxmox",
  "url": "https://192.168.1.100:8006",
  "tokenId": "root@pam!prox_dash",
  "tokenSecret": "your-uuid-token-secret",
  "allowInsecure": true,
  "enabled": true
}
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | Yes | Display name for the cluster |
| `type` | string | Yes | Must be `"proxmox"` |
| `url` | string | Yes | Base URL of the Proxmox API (e.g., `https://host:8006`) |
| `tokenId` | string | Yes | API Token ID (format: `USER@REALM!TOKENID`) |
| `tokenSecret` | string | Yes | API Token Secret |
| `allowInsecure`| boolean | No | Set to `true` to bypass SSL certificate validation (default: `false`) |
| `enabled` | boolean | No | Set to `false` to disable this provider (default: `true`) |

## Permissions
The API token user needs read-only access to the resources you want to monitor.
Recommended role: `PVEAuditor` on path `/`.

## Features
- **Cluster Status**: Overall health of the cluster.
- **Node Monitoring**: CPU, Memory, and Disk usage per node.
- **Workload Tracking**: Status and resource usage for QEMU VMs and LXC Containers.
