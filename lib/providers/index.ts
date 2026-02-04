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
  ProxmoxProvider,
  createProxmoxProvider,
  getAllProxmoxProviders,
  ProxmoxClusterConfig,
} from './proxmox';

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

  // TODO: Initialize Kubernetes providers when implemented
  // TODO: Initialize OpenStack providers when implemented

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
export type ProviderConfig = ProxmoxClusterConfig; // | KubernetesConfig | OpenStackConfig

/**
 * Create a provider instance from configuration
 */
export function createProvider(config: ProviderConfig): InfraProvider {
  switch (config.type) {
    case 'proxmox':
      return createProxmoxProvider(config);
    // Future providers:
    // case 'kubernetes':
    //   return createKubernetesProvider(config);
    // case 'openstack':
    //   return createOpenStackProvider(config);
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
