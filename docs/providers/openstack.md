# OpenStack Provider Setup

## Overview
The OpenStack provider connects to an OpenStack cloud to monitor instances and hypervisors (if admin). It authenticates via Keystone v3.

## Configuration

Add an OpenStack entry to your `infrastructure_config.json`:

```json
{
  "name": "OpenStack Lab",
  "type": "openstack",
  "authUrl": "https://identity.example.com:5000/v3",
  "region": "RegionOne",
  "projectName": "admin",
  "projectDomainName": "Default",
  "userDomainName": "Default",
  "username": "admin",
  "password": "secret-password",
  "enabled": true
}
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | Yes | Display name |
| `type` | string | Yes | Must be `"openstack"` |
| `authUrl` | string | Yes | Keystone Identity URL (v3) |
| `region` | string | No | Region name (default: "RegionOne" or first available) |
| `projectName` | string | Yes | Project (Tenant) to scope to |
| `projectDomainName`| string | No | Domain for the project (default: "Default") |
| `userDomainName` | string | No | Domain for the user (default: "Default") |
| `username` | string | No* | Username (required for password auth) |
| `password` | string | No* | Password (required for password auth) |
| `applicationCredentialId`| string | No* | App Credential ID (alternative auth) |
| `applicationCredentialSecret`| string | No* | App Credential Secret (alternative auth) |

*\* Note: You must provide either username/password OR application credentials.*

## Admin vs Member Access
- **Admin**: Can see underlying Hypervisor (Node) details and physical resource usage.
- **Member**: Sees a "Project Summary" node with quota usage and list of instances within the project.

## Workloads
- Monitors OpenStack Nova instances.
- Maps instance states (ACTIVE, BUILD, ERROR) to unified dashboard statuses.
