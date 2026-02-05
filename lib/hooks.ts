import useSWR from 'swr';
import { toast } from 'sonner';
import { POLLING_INTERVAL } from './constants';
import type { ClusterStatus, NodeStatus, Workload, ProviderType } from './providers/types';

// Re-export types for backward compatibility
export type { ClusterStatus, NodeStatus, Workload, ProviderType };

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
};

const swrOptions = {
  refreshInterval: POLLING_INTERVAL,
  onError: (err: Error) => {
    toast.error(err.message || 'Failed to fetch data');
  }
};

// ============================================================================
// Unified Infrastructure Hooks (new API)
// ============================================================================

/**
 * Fetch all clusters from all configured providers
 */
export function useInfrastructure(provider?: ProviderType) {
  const url = provider
    ? `/api/infrastructure?provider=${provider}`
    : '/api/infrastructure';

  const { data, error, isLoading, mutate } = useSWR<ClusterStatus[]>(
    url,
    fetcher,
    swrOptions
  );

  return {
    data: data || [],
    loading: isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Fetch cluster names from all configured providers (for parallel loading)
 */
export function useInfrastructureNames(provider?: ProviderType) {
  const url = provider
    ? `/api/infrastructure/list?provider=${provider}`
    : '/api/infrastructure/list';

  const { data, error, isLoading, mutate } = useSWR<string[]>(
    url,
    fetcher,
    swrOptions
  );

  return {
    data: data || [],
    loading: isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Fetch a single cluster by name
 */
export function useInfraCluster(name: string) {
  const { data, error, isLoading, mutate } = useSWR<ClusterStatus>(
    name ? `/api/infrastructure/cluster/${encodeURIComponent(name)}` : null,
    fetcher,
    swrOptions
  );

  return {
    data,
    loading: isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Fetch a single node's status
 */
export function useInfraNode(clusterName: string, nodeName: string) {
  const { data, error, isLoading, mutate } = useSWR<NodeStatus>(
    clusterName && nodeName
      ? `/api/infrastructure/cluster/${encodeURIComponent(clusterName)}/node/${encodeURIComponent(nodeName)}`
      : null,
    fetcher,
    swrOptions
  );

  return {
    data,
    loading: isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Fetch workloads (VMs, pods, instances) on a node
 */
export function useInfraWorkloads(clusterName: string, nodeName: string) {
  const { data, error, isLoading, mutate } = useSWR<Workload[]>(
    clusterName && nodeName
      ? `/api/infrastructure/cluster/${encodeURIComponent(clusterName)}/node/${encodeURIComponent(nodeName)}/workloads`
      : null,
    fetcher,
    swrOptions
  );

  return {
    data: data || [],
    loading: isLoading,
    error,
    refresh: mutate
  };
}

/**
 * Fetch and aggregate status for global monitoring
 */
 export interface AggregatedStatus {
  provider: ProviderType;
  totalClusters: number;
  onlineClusters: number;
  totalNodes: number;
  onlineNodes: number;
  totalCores: number;
  usedCores: number;
  totalMemory: number;
  usedMemory: number;
  totalStorage: number;
  usedStorage: number;
  totalCephStorage: number;
  usedCephStorage: number;
  health: 'healthy' | 'warning' | 'critical';
  cephStatus?: 'healthy' | 'warning' | 'critical' | 'unknown';
}

export function useAggregatedStatus() {
  const { data: clusters, error, isLoading, mutate } = useSWR<ClusterStatus[]>(
    '/api/infrastructure',
    fetcher,
    swrOptions
  );

  const aggregatedData = (clusters || []).reduce((acc, cluster) => {
    const provider = cluster.provider;
    if (!acc[provider]) {
      acc[provider] = {
        provider,
        totalClusters: 0,
        onlineClusters: 0,
        totalNodes: 0,
        onlineNodes: 0,
        totalCores: 0,
        usedCores: 0,
        totalMemory: 0,
        usedMemory: 0,
        totalStorage: 0,
        usedStorage: 0,
        totalCephStorage: 0,
        usedCephStorage: 0,
        health: 'healthy',
        cephStatus: undefined
      };
    }

    const stats = acc[provider];
    stats.totalClusters++;
    if (!cluster.error) {
      stats.onlineClusters++;
    }
    
    // Aggregate from nodes
    cluster.nodes.forEach(node => {
      stats.totalNodes++;
      if (node.status === 'online' || node.status === 'ready') {
        stats.onlineNodes++;
      }
      stats.totalCores += node.cpu.total || 0;
      // Calculate used cores based on percentage if available
      stats.usedCores += (node.cpu.percentage / 100) * (node.cpu.total || 0);

      stats.totalMemory += node.memory.total || 0;
      stats.usedMemory += node.memory.used || 0;
    });

    // Aggregate Storage (Cluster level)
    if (cluster.storage) {
        stats.totalStorage += cluster.storage.usage?.total || 0;
        stats.usedStorage += cluster.storage.usage?.used || 0;

        // Ceph Status Logic (if applicable)
        if (cluster.storage.type === 'ceph') {
            stats.totalCephStorage += cluster.storage.usage?.total || 0;
            stats.usedCephStorage += cluster.storage.usage?.used || 0;

            // Map 'HEALTH_OK' -> 'healthy', etc.
            let incoming: 'healthy' | 'warning' | 'critical' | 'unknown' = 'unknown';
            const health = cluster.storage.health;
            
            if (health === 'HEALTH_OK') incoming = 'healthy';
            else if (health === 'HEALTH_WARN') incoming = 'warning';
            else if (health === 'HEALTH_ERR') incoming = 'critical';
            
            const current = stats.cephStatus;
            
            if (!current) {
                stats.cephStatus = incoming;
            } else if (incoming === 'critical') {
                stats.cephStatus = 'critical';
            } else if (incoming === 'warning' && current !== 'critical') {
                stats.cephStatus = 'warning';
            } else if (incoming === 'healthy' && !['critical', 'warning'].includes(current)) {
                stats.cephStatus = 'healthy';
            }
        }
    }

    // Simple health check: if any node is offline/not-ready, mark as warning/critical
    // For now, let's say < 100% online is warning
    if (stats.onlineNodes < stats.totalNodes) {
      stats.health = 'critical'; 
    }

    return acc;
  }, {} as Record<string, AggregatedStatus>);

  return {
    data: Object.values(aggregatedData),
    loading: isLoading,
    error,
    refresh: mutate
  };
}

// ============================================================================
// Legacy Proxmox Hooks (backward compatibility)
// ============================================================================

// Legacy types for backward compatibility
import { ClusterStatus as LegacyClusterStatus, NodeStatus as LegacyNodeStatus, VMStatus } from './proxmox';

/**
 * @deprecated Use useInfrastructure() instead
 */
export function useClusterList() {
  const { data, error, isLoading, mutate } = useSWR<LegacyClusterStatus[]>(
    '/api/proxmox',
    fetcher,
    swrOptions
  );

  return {
    data: data || [],
    loading: isLoading,
    error,
    refresh: mutate
  };
}

/**
 * @deprecated Use useInfrastructureNames() instead
 * Fetch cluster names for parallel loading
 */
export function useClusterNames() {
  const { data, error, isLoading, mutate } = useSWR<string[]>(
    '/api/proxmox/list',
    fetcher,
    swrOptions
  );

  return {
    data: data || [],
    loading: isLoading,
    error,
    refresh: mutate
  };
}

/**
 * @deprecated Use useInfraCluster() instead
 */
export function useCluster(name: string) {
  const { data, error, isLoading, mutate } = useSWR<LegacyClusterStatus>(
    name ? `/api/proxmox/cluster/${encodeURIComponent(name)}` : null,
    fetcher,
    swrOptions
  );

  return {
    data,
    loading: isLoading,
    error,
    refresh: mutate
  };
}

/**
 * @deprecated Use useInfraNode() instead
 */
export function useNode(clusterName: string, nodeName: string) {
  const { data, error, isLoading, mutate } = useSWR<LegacyNodeStatus>(
    clusterName && nodeName ? `/api/proxmox/cluster/${encodeURIComponent(clusterName)}/node/${encodeURIComponent(nodeName)}` : null,
    fetcher,
    swrOptions
  );

  return {
    data,
    loading: isLoading,
    error,
    refresh: mutate
  };
}

/**
 * @deprecated Use useInfraWorkloads() instead
 */
export function useNodeVMs(clusterName: string, nodeName: string) {
  const { data, error, isLoading, mutate } = useSWR<VMStatus[]>(
    clusterName && nodeName ? `/api/proxmox/cluster/${encodeURIComponent(clusterName)}/node/${encodeURIComponent(nodeName)}/vms` : null,
    fetcher,
    swrOptions
  );

  return {
    data: data || [],
    loading: isLoading,
    error,
    refresh: mutate
  };
}
