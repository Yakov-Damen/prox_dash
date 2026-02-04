/**
 * @deprecated This module is maintained for backward compatibility.
 * Use `lib/providers/proxmox` for new code.
 */

import { logger } from './logger';
import {
  ProxmoxClusterConfig as NewProxmoxClusterConfig,
  ProxmoxProvider,
  getProxmoxConfigs,
} from './providers/proxmox';
import {
  LegacyProxmoxNodeStatus,
  LegacyProxmoxVMStatus,
} from './providers/types';

// ============================================================================
// Legacy Type Re-exports (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use `ProxmoxClusterConfig` from `lib/providers/proxmox/config`
 */
export interface ProxmoxClusterConfig {
  name: string;
  url: string;
  tokenId: string;
  tokenSecret: string;
  allowInsecure?: boolean;
}

/**
 * @deprecated Use `NodeStatus` from `lib/providers/types`
 */
export interface NodeStatus {
  id: string;
  node: string;
  status: 'online' | 'offline' | 'unknown';
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  uptime: number;
  disk?: number;
  maxdisk?: number;
  cpuModel?: string;
  cpuSockets?: number;
  cpuCores?: number;
  kernelVersion?: string;
  manufacturer?: string;
  productName?: string;
}

/**
 * @deprecated Use `ClusterStatus` from `lib/providers/types`
 */
export interface ClusterStatus {
  name: string;
  nodes: NodeStatus[];
  error?: string;
  version?: string;
}

/**
 * @deprecated Use `Workload` from `lib/providers/types`
 */
export interface VMStatus {
  vmid: number;
  name: string;
  status: 'running' | 'stopped' | 'paused';
  cpus: number;
  cpuUsage?: number;
  maxmem: number;
  mem: number;
  uptime: number;
  type: 'qemu' | 'lxc';
}

// ============================================================================
// Legacy Function Implementations (delegating to new provider)
// ============================================================================

/**
 * @deprecated Use `getProxmoxConfigs()` from `lib/providers/proxmox`
 */
export function getClusterConfigs(): ProxmoxClusterConfig[] {
  return getProxmoxConfigs();
}

/**
 * Convert unified NodeStatus back to legacy format
 */
function convertUnifiedToLegacyNode(
  unified: import('./providers/types').NodeStatus
): NodeStatus {
  return {
    id: unified.id,
    node: unified.name,
    status: unified.status as 'online' | 'offline' | 'unknown',
    cpu: unified.cpu.total > 0 ? unified.cpu.used / unified.cpu.total : 0,
    maxcpu: unified.cpu.total,
    mem: unified.memory.used,
    maxmem: unified.memory.total,
    uptime: unified.uptime || 0,
    disk: unified.storage?.used,
    maxdisk: unified.storage?.total,
    cpuModel: unified.providerData?.cpuModel,
    cpuSockets: unified.providerData?.cpuSockets,
    cpuCores: unified.providerData?.cpuCores,
    kernelVersion: unified.providerData?.kernelVersion,
    manufacturer: unified.providerData?.manufacturer,
    productName: unified.providerData?.productName,
  };
}

/**
 * Convert unified Workload back to legacy VMStatus format
 */
function convertUnifiedToLegacyVM(
  unified: import('./providers/types').Workload
): VMStatus {
  return {
    vmid: unified.providerData?.vmid || parseInt(unified.id, 10),
    name: unified.name,
    status: unified.status as 'running' | 'stopped' | 'paused',
    cpus: unified.cpu.count,
    cpuUsage: unified.cpu.usage,
    maxmem: unified.memory.total,
    mem: unified.memory.used,
    uptime: unified.uptime || 0,
    type: unified.type as 'qemu' | 'lxc',
  };
}

/**
 * @deprecated Use `ProxmoxProvider.getCluster()` from `lib/providers/proxmox`
 */
export async function fetchClusterStatus(
  config: ProxmoxClusterConfig
): Promise<ClusterStatus> {
  const provider = new ProxmoxProvider({
    ...config,
    type: 'proxmox',
    enabled: true,
  });

  const unified = await provider.getCluster(config.name);

  if (!unified) {
    return {
      name: config.name,
      nodes: [],
      error: 'Failed to fetch cluster status',
    };
  }

  return {
    name: unified.name,
    nodes: unified.nodes.map(convertUnifiedToLegacyNode),
    error: unified.error,
    version: unified.version,
  };
}

/**
 * @deprecated Use `ProxmoxProvider.getNode()` from `lib/providers/proxmox`
 */
export async function getNodeStatus(
  config: ProxmoxClusterConfig,
  nodeName: string
): Promise<NodeStatus | null> {
  const provider = new ProxmoxProvider({
    ...config,
    type: 'proxmox',
    enabled: true,
  });

  const unified = await provider.getNode(config.name, nodeName);
  if (!unified) return null;

  return convertUnifiedToLegacyNode(unified);
}

/**
 * @deprecated Use `ProxmoxProvider.getWorkloads()` from `lib/providers/proxmox`
 */
export async function getNodeVMs(
  config: ProxmoxClusterConfig,
  node: string
): Promise<VMStatus[]> {
  const provider = new ProxmoxProvider({
    ...config,
    type: 'proxmox',
    enabled: true,
  });

  const workloads = await provider.getWorkloads(config.name, node);
  return workloads.map(convertUnifiedToLegacyVM);
}

/**
 * @deprecated Use provider factory from `lib/providers`
 */
export async function getAllClustersStatus(): Promise<ClusterStatus[]> {
  const configs = getClusterConfigs();
  const promises = configs.map((config) => fetchClusterStatus(config));
  return Promise.all(promises);
}
