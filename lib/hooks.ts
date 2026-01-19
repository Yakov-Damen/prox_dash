import useSWR from 'swr';
import { toast } from 'sonner';
import { ClusterStatus, NodeStatus, VMStatus } from './proxmox';
import { POLLING_INTERVAL } from './constants';

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

export function useClusterList() {
  const { data, error, isLoading, mutate } = useSWR<ClusterStatus[]>(
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

export function useCluster(name: string) {
  const { data, error, isLoading, mutate } = useSWR<ClusterStatus>(
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

export function useNode(clusterName: string, nodeName: string) {
  const { data, error, isLoading, mutate } = useSWR<NodeStatus>(
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
