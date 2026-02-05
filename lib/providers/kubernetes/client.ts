import {
  KubeConfig,
  CoreV1Api,
  VersionApi,
  Metrics,
  V1Pod,
} from '@kubernetes/client-node';
import type { InfraProvider, ClusterStatus, NodeStatus, Workload } from '../types';
import type { KubernetesClusterConfig } from './config';
import type { K8sNodeMetrics, K8sPodMetrics } from './schemas';
import { mapK8sNodeToUnified, mapK8sPodsToWorkloads } from './mappers';
import { logger } from '../../logger';

// ============================================================================
// Kubernetes Provider Implementation
// ============================================================================

export class KubernetesProvider implements InfraProvider {
  readonly type = 'kubernetes' as const;
  readonly name: string;

  private kubeConfig: KubeConfig;
  private coreApi: CoreV1Api;
  private versionApi: VersionApi;
  private metricsClient: Metrics;
  private config: KubernetesClusterConfig;
  private contextName: string;

  constructor(config: KubernetesClusterConfig) {
    this.config = config;
    this.name = config.name;
    this.kubeConfig = new KubeConfig();

    // Load kubeconfig based on configuration
    if (config.inCluster) {
      this.kubeConfig.loadFromCluster();
      this.contextName = 'in-cluster';
    } else if (config.kubeConfigPath) {
      this.kubeConfig.loadFromFile(config.kubeConfigPath);
      if (config.kubeConfigContext) {
        this.kubeConfig.setCurrentContext(config.kubeConfigContext);
      }
      this.contextName = config.kubeConfigContext || this.kubeConfig.getCurrentContext() || config.name;
    } else {
      this.kubeConfig.loadFromDefault();
      if (config.kubeConfigContext) {
        this.kubeConfig.setCurrentContext(config.kubeConfigContext);
      }
      this.contextName = config.kubeConfigContext || this.kubeConfig.getCurrentContext() || config.name;
    }

    // Initialize API clients
    this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
    this.versionApi = this.kubeConfig.makeApiClient(VersionApi);
    this.metricsClient = new Metrics(this.kubeConfig);
  }

  // ==========================================================================
  // InfraProvider Implementation
  // ==========================================================================

  /**
   * Test connection to the Kubernetes API server
   */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const versionInfo = await this.versionApi.getCode();
      const version = versionInfo.gitVersion || 'unknown';
      return {
        ok: true,
        message: `Connected to Kubernetes ${version}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, provider: this.name }, 'Kubernetes connection test failed');
      return {
        ok: false,
        message: `Failed to connect: ${message}`,
      };
    }
  }

  /**
   * Get all clusters (for K8s, this returns the single configured context as a cluster)
   */
  async getClusters(): Promise<ClusterStatus[]> {
    try {
      const cluster = await this.getCluster(this.contextName);
      return cluster ? [cluster] : [];
    } catch (error) {
      logger.error({ error, provider: this.name }, 'Failed to get Kubernetes clusters');
      return [{
        name: this.name,
        provider: 'kubernetes',
        nodes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }];
    }
  }

  /**
   * Get a single cluster by name (context name)
   */
  async getCluster(name: string): Promise<ClusterStatus | null> {
    // Only return cluster if name matches our context
    if (name !== this.contextName && name !== this.name) {
      return null;
    }

    try {
      // Get version info
      const versionInfo = await this.versionApi.getCode();
      const version = versionInfo.gitVersion || undefined;

      // Get all nodes
      const nodesResponse = await this.coreApi.listNode();
      const nodes = nodesResponse.items;

      // Try to get node metrics (may fail if metrics-server not installed)
      const metricsMap = await this.getNodeMetrics();

      // Map nodes to unified format
      const mappedNodes = nodes.map(node => {
        const nodeName = node.metadata?.name || '';
        const metrics = metricsMap.get(nodeName);
        return mapK8sNodeToUnified(node, metrics);
      });

      return {
        name: this.name,
        provider: 'kubernetes',
        nodes: mappedNodes,
        version,
        metadata: {
          platform: versionInfo.platform || 'unknown',
          goVersion: versionInfo.goVersion || 'unknown',
        },
      };
    } catch (error) {
      logger.error({ error, provider: this.name, cluster: name }, 'Failed to get Kubernetes cluster');
      return {
        name: this.name,
        provider: 'kubernetes',
        nodes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get a single node's detailed status
   */
  async getNode(clusterName: string, nodeName: string): Promise<NodeStatus | null> {
    // Verify cluster name matches
    if (clusterName !== this.contextName && clusterName !== this.name) {
      return null;
    }

    try {
      // Get the specific node
      const nodeResponse = await this.coreApi.readNode({ name: nodeName });
      const node = nodeResponse;

      // Try to get node metrics
      const metricsMap = await this.getNodeMetrics();
      const metrics = metricsMap.get(nodeName);

      return mapK8sNodeToUnified(node, metrics);
    } catch (error) {
      logger.error({ error, provider: this.name, node: nodeName }, 'Failed to get Kubernetes node');
      return null;
    }
  }

  /**
   * Get workloads (pods) on a specific node
   */
  async getWorkloads(clusterName: string, nodeName: string): Promise<Workload[]> {
    // Verify cluster name matches
    if (clusterName !== this.contextName && clusterName !== this.name) {
      return [];
    }

    try {
      // Get pods on the specific node using field selector
      const fieldSelector = `spec.nodeName=${nodeName}`;
      const podsResponse = await this.coreApi.listPodForAllNamespaces({
        fieldSelector,
      });

      const pods = podsResponse.items;

      // Filter by namespace if configured
      const filteredPods = this.config.namespace
        ? pods.filter(pod => pod.metadata?.namespace === this.config.namespace)
        : pods;

      // Try to get pod metrics
      const metricsMap = await this.getPodMetrics(nodeName);

      return mapK8sPodsToWorkloads(filteredPods, metricsMap);
    } catch (error) {
      logger.error({ error, provider: this.name, node: nodeName }, 'Failed to get Kubernetes workloads');
      return [];
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Get node metrics from metrics-server
   * Returns empty map if metrics-server is not available
   */
  private async getNodeMetrics(): Promise<Map<string, K8sNodeMetrics>> {
    const metricsMap = new Map<string, K8sNodeMetrics>();

    try {
      const metrics = await this.metricsClient.getNodeMetrics();

      for (const item of metrics.items) {
        const name = item.metadata?.name;
        if (name) {
          metricsMap.set(name, {
            metadata: {
              name,
              creationTimestamp: item.metadata?.creationTimestamp,
            },
            timestamp: item.timestamp,
            window: item.window,
            usage: {
              cpu: item.usage?.cpu || '0',
              memory: item.usage?.memory || '0',
            },
          });
        }
      }
    } catch (error) {
      // Metrics server may not be installed - this is not a fatal error
      logger.debug({ error, provider: this.name }, 'Failed to get node metrics (metrics-server may not be installed)');
    }

    return metricsMap;
  }

  /**
   * Get pod metrics from metrics-server for pods on a specific node
   * Returns empty map if metrics-server is not available
   */
  private async getPodMetrics(_nodeName: string): Promise<Map<string, K8sPodMetrics>> {
    const metricsMap = new Map<string, K8sPodMetrics>();

    try {
      const metrics = await this.metricsClient.getPodMetrics();

      for (const item of metrics.items) {
        // Filter to pods on the specified node (we'll get all and filter client-side)
        const podKey = `${item.metadata?.namespace}/${item.metadata?.name}`;

        metricsMap.set(podKey, {
          metadata: {
            name: item.metadata?.name || '',
            namespace: item.metadata?.namespace || '',
            creationTimestamp: item.metadata?.creationTimestamp,
          },
          timestamp: item.timestamp,
          window: item.window,
          containers: (item.containers || []).map(c => ({
            name: c.name,
            usage: {
              cpu: c.usage?.cpu || '0',
              memory: c.usage?.memory || '0',
            },
          })),
        });
      }
    } catch (error) {
      // Metrics server may not be installed - this is not a fatal error
      logger.debug({ error, provider: this.name }, 'Failed to get pod metrics (metrics-server may not be installed)');
    }

    return metricsMap;
  }

  // ==========================================================================
  // Additional Public Methods
  // ==========================================================================

  /**
   * Get the current Kubernetes context name
   */
  getContextName(): string {
    return this.contextName;
  }

  /**
   * Get all available contexts from the kubeconfig
   */
  getAvailableContexts(): string[] {
    return this.kubeConfig.getContexts().map(ctx => ctx.name);
  }

  /**
   * Check if metrics server is available
   */
  async hasMetricsServer(): Promise<boolean> {
    try {
      await this.metricsClient.getNodeMetrics();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get namespaces in the cluster
   */
  async getNamespaces(): Promise<string[]> {
    try {
      const response = await this.coreApi.listNamespace();
      return response.items.map(ns => ns.metadata?.name || '').filter(Boolean);
    } catch (error) {
      logger.error({ error, provider: this.name }, 'Failed to list namespaces');
      return [];
    }
  }

  /**
   * Get all pods in the cluster (optionally filtered by namespace)
   */
  async getAllPods(namespace?: string): Promise<Workload[]> {
    try {
      const ns = namespace || this.config.namespace;
      let pods: V1Pod[];

      if (ns) {
        const response = await this.coreApi.listNamespacedPod({ namespace: ns });
        pods = response.items;
      } else {
        const response = await this.coreApi.listPodForAllNamespaces();
        pods = response.items;
      }

      // Try to get pod metrics
      const metricsMap = await this.getPodMetrics('');

      return mapK8sPodsToWorkloads(pods, metricsMap);
    } catch (error) {
      logger.error({ error, provider: this.name }, 'Failed to get all pods');
      return [];
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createKubernetesProvider(config: KubernetesClusterConfig): InfraProvider {
  return new KubernetesProvider(config);
}
