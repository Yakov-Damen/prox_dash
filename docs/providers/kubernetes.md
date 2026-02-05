# Kubernetes Provider Setup

## Overview
The Kubernetes provider enables monitoring of K8s clusters, nodes, and pods. It integrates using the standard kubeconfig file or in-cluster service account authentication.

## Configuration

Add a Kubernetes entry to your `infrastructure_config.json`:

```json
{
  "name": "Production K8s",
  "type": "kubernetes",
  "kubeConfigPath": "/path/to/kubeconfig",
  "kubeConfigContext": "prod-context",
  "enabled": true
}
```

### Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | string | Yes | Display name for the cluster |
| `type` | string | Yes | Must be `"kubernetes"` |
| `kubeConfigPath`| string | No | Absolute path to kubeconfig file. Defaults to `KUBECONFIG` env var or `~/.kube/config`. |
| `kubeConfigContext`| string | No | Specific context to use from the kubeconfig. |
| `inCluster` | boolean | No | Set to `true` if running inside a pod to use Service Account token. |
| `enabled` | boolean | No | Default: `true` |

## Capabilities
- **Node Status**: Ready/NotReady state, CPU/Memory capacity and usage (via Metrics Server).
- **Workloads**: Pod status (Running, Pending, Failed, etc.) and resource requests/limits.

## Requirements
- **Metrics Server**: For CPU/Memory usage stats, the Kubernetes Metrics Server must be installed on the cluster.
