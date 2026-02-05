import { logger } from '../logger';
import {
  InfraProvider,
  ProviderType,
  BaseProviderConfig,
  ClusterStatus,
  NodeStatus,
  Workload,
} from './types';
import {
  createProxmoxProvider,
  getAllProxmoxProviders,
  ProxmoxClusterConfig,
} from './proxmox';
import {
  createKubernetesProvider,
  KubernetesClusterConfig,
} from './kubernetes';
import {
  createOpenStackProvider,
  OpenStackClusterConfig,
} from './openstack';
import {
  getKubernetesConfigs,
  getOpenStackConfigs,
} from '../config/loader';

// ============================================================================
// Provider Registry
// ============================================================================

// All registered providers keyed by their unique name (from config)
const providerRegistry = new Map<string, InfraProvider>();

// Mapping of cluster names to provider names for lookup
const clusterToProviderMap = new Map<string, string>();

// ============================================================================
// Provider Initialization
// ============================================================================

let initialized = false;

/**
 * Initialize all providers from their respective configurations.
 * This is called lazily on first access.
 */
export function initializeProviders(): void {
  if (initialized) return;

  logger.info('Initializing infrastructure providers');

  // Initialize Proxmox providers
  try {
    const proxmoxProviders = getAllProxmoxProviders();
    for (const provider of proxmoxProviders) {
      providerRegistry.set(provider.name, provider);
      // For Proxmox, the provider name is the cluster name
      clusterToProviderMap.set(provider.name, provider.name);
      logger.debug({ provider: provider.name, type: provider.type }, 'Registered provider');
    }
    logger.info({ count: proxmoxProviders.length }, 'Initialized Proxmox providers');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Proxmox providers');
  }

  // Initialize Kubernetes providers
  try {
    const k8sConfigs = getKubernetesConfigs();
    for (const config of k8sConfigs) {
      const provider = createKubernetesProvider(config);
      providerRegistry.set(provider.name, provider);
      clusterToProviderMap.set(provider.name, provider.name);
      logger.debug({ provider: provider.name, type: provider.type }, 'Registered Kubernetes provider');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Kubernetes providers');
  }

  // Initialize OpenStack providers
  try {
    const openStackConfigs = getOpenStackConfigs();
    for (const config of openStackConfigs) {
      const provider = createOpenStackProvider(config);
      providerRegistry.set(provider.name, provider);
      // For OpenStack, the cluster name includes the region (e.g. "Dev OpenStack/RegionOne")
      // We need to map that specific cluster name to the provider
      // BUT getClusters() is async, so we can't do it here easily.
      // However, getProviderForCluster falls back to checking provider.name, which works for "Dev OpenStack"
      
      // We can also try to proactively map the likely cluster name
      const region = config.regionName || 'default';
      const clusterName = `${provider.name}/${region}`;
      clusterToProviderMap.set(clusterName, provider.name);
      
      logger.debug({ provider: provider.name, type: provider.type }, 'Registered OpenStack provider');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize OpenStack providers');
  }

  initialized = true;
  logger.info({ totalProviders: providerRegistry.size }, 'Provider initialization complete');
}

/**
 * Force re-initialization of providers (useful for config changes)
 */
export function reinitializeProviders(): void {
  providerRegistry.clear();
  clusterToProviderMap.clear();
  initialized = false;
  initializeProviders();
}

// ============================================================================
// Provider Access Functions
// ============================================================================

/**
 * Get a provider by its name
 */
export function getProvider(name: string): InfraProvider | undefined {
  initializeProviders();
  return providerRegistry.get(name);
}

/**
 * Get all registered providers
 */
export function getAllProviders(): InfraProvider[] {
  initializeProviders();
  return Array.from(providerRegistry.values());
}

/**
 * Get all providers of a specific type
 */
export function getProvidersByType(type: ProviderType): InfraProvider[] {
  initializeProviders();
  return Array.from(providerRegistry.values()).filter(p => p.type === type);
}

/**
 * Find the provider that manages a given cluster name
 */
export function getProviderForCluster(clusterName: string): InfraProvider | undefined {
  initializeProviders();
  const providerName = clusterToProviderMap.get(clusterName);
  if (providerName) {
    return providerRegistry.get(providerName);
  }
  // Fallback: check all providers (for multi-cluster providers like K8s contexts)
  for (const provider of providerRegistry.values()) {
    // The cluster might be managed by this provider
    if (provider.name === clusterName) {
      return provider;
    }
  }
  return undefined;
}

// ============================================================================
// Unified Data Access Functions
// ============================================================================

/**
 * Get all clusters from all providers (or filtered by provider type)
 */
export async function getAllClusters(providerType?: ProviderType): Promise<ClusterStatus[]> {
  initializeProviders();

  const providers = providerType
    ? getProvidersByType(providerType)
    : getAllProviders();

  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        return await provider.getClusters();
      } catch (error) {
        logger.error({ err: error, provider: provider.name }, 'Failed to get clusters from provider');
        return [];
      }
    })
  );

  return results.flat();
}

/**
 * Get a single cluster by name (auto-detects provider)
 */
export async function getCluster(clusterName: string): Promise<ClusterStatus | null> {
  const provider = getProviderForCluster(clusterName);
  if (!provider) {
    logger.warn({ clusterName }, 'No provider found for cluster');
    return null;
  }

  try {
    return await provider.getCluster(clusterName);
  } catch (error) {
    logger.error({ err: error, clusterName }, 'Failed to get cluster');
    return null;
  }
}

/**
 * Get a node from a cluster (auto-detects provider)
 */
export async function getNode(clusterName: string, nodeName: string): Promise<NodeStatus | null> {
  const provider = getProviderForCluster(clusterName);
  if (!provider) {
    logger.warn({ clusterName, nodeName }, 'No provider found for cluster');
    return null;
  }

  try {
    return await provider.getNode(clusterName, nodeName);
  } catch (error) {
    logger.error({ err: error, clusterName, nodeName }, 'Failed to get node');
    return null;
  }
}

/**
 * Get workloads on a node (auto-detects provider)
 */
export async function getWorkloads(clusterName: string, nodeName: string): Promise<Workload[]> {
  const provider = getProviderForCluster(clusterName);
  if (!provider) {
    logger.warn({ clusterName, nodeName }, 'No provider found for cluster');
    return [];
  }

  try {
    return await provider.getWorkloads(clusterName, nodeName);
  } catch (error) {
    logger.error({ err: error, clusterName, nodeName }, 'Failed to get workloads');
    return [];
  }
}

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Provider configuration union type
 */
export type ProviderConfig = ProxmoxClusterConfig | KubernetesClusterConfig | OpenStackClusterConfig;

/**
 * Create a provider instance from configuration
 */
export function createProvider(config: ProviderConfig): InfraProvider {
  switch (config.type) {
    case 'proxmox':
      return createProxmoxProvider(config as ProxmoxClusterConfig);
    case 'kubernetes':
      return createKubernetesProvider(config as KubernetesClusterConfig);
    case 'openstack':
      return createOpenStackProvider(config as OpenStackClusterConfig);
    default:
      throw new Error(`Unknown provider type: ${(config as BaseProviderConfig).type}`);
  }
}

// ============================================================================
// Re-export types for convenience
// ============================================================================

export type {
  InfraProvider,
  ProviderType,
  BaseProviderConfig,
  ClusterStatus,
  NodeStatus,
  Workload,
} from './types';

export { ProviderTypes, NodeStatuses, WorkloadStatuses, WorkloadTypes } from './types';

// Re-export Proxmox provider
export {
  ProxmoxProvider,
  createProxmoxProvider,
  type ProxmoxClusterConfig,
} from './proxmox';
