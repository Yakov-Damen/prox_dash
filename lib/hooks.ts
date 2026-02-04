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
