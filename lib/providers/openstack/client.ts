import {
  InfraProvider,
  ProviderType,
  ClusterStatus,
  NodeStatus,
  Workload,
} from '../types';
import { OpenStackClusterConfig } from './config';
import {
  getAuthToken,
  getNovaEndpoint,
  hasAdminRole,
  AuthToken,
  clearTokenCache,
} from './auth';
import { logger } from '../../logger';
import {
  OpenStackServersResponseSchema,
  OpenStackHypervisorsResponseSchema,
  OpenStackHypervisorDetailResponseSchema,
  OpenStackFlavorsResponseSchema,
  OpenStackLimitsSchema,
  OpenStackServer,
  OpenStackFlavor,
  OpenStackHypervisor,
} from './schemas';
import {
  mapOpenStackHypervisorToNode,
  mapHypervisorsToNodes,
  mapServersToWorkloads,
  createProjectSummaryNode,
  filterServersByHypervisor,
} from './mappers';

// ============================================================================
// OpenStack Provider Implementation
// ============================================================================

export class OpenStackProvider implements InfraProvider {
  readonly type: ProviderType = 'openstack';
  readonly name: string;

  private config: OpenStackClusterConfig;
  private cachedFlavors: Map<string, OpenStackFlavor> = new Map();
  private flavorsLastFetched: number = 0;
  private readonly FLAVOR_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(config: OpenStackClusterConfig) {
    this.config = config;
    this.name = config.name;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Makes an authenticated request to an OpenStack service.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getAuthToken(this.config);
    const novaUrl = getNovaEndpoint(token, 'public', this.config.region);

    if (!novaUrl) {
      throw new Error(
        `Nova (compute) endpoint not found in service catalog for region: ${this.config.region || 'any'}`
      );
    }

    const url = `${novaUrl.replace(/\/+$/, '')}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Auth-Token': token.token,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    logger.debug({ 
      method: options.method || 'GET', 
      url, 
      status: response.status 
    }, 'OpenStack API Request');

    if (!response.ok) {
      // Clear token cache on auth failures
      if (response.status === 401) {
        clearTokenCache(this.config);
      }

      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error({ 
        status: response.status, 
        statusText: response.statusText, 
        error: errorText,
        url
      }, 'OpenStack API Error');

      throw new Error(
        `OpenStack API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Gets the current auth token.
   */
  private async getToken(): Promise<AuthToken> {
    return getAuthToken(this.config);
  }

  /**
   * Checks if the current user has admin privileges.
   */
  private async isAdmin(): Promise<boolean> {
    const token = await this.getToken();
    return hasAdminRole(token);
  }

  /**
   * Fetches and caches flavors.
   */
  private async fetchFlavors(): Promise<Map<string, OpenStackFlavor>> {
    const now = Date.now();

    // Return cached flavors if still valid
    if (this.cachedFlavors.size > 0 && now - this.flavorsLastFetched < this.FLAVOR_CACHE_TTL_MS) {
      return this.cachedFlavors;
    }

    try {
      const data = await this.request<unknown>('/flavors/detail');
      const parsed = OpenStackFlavorsResponseSchema.parse(data);

      this.cachedFlavors.clear();
      for (const flavor of parsed.flavors) {
        this.cachedFlavors.set(flavor.id, flavor);
      }
      this.flavorsLastFetched = now;
    } catch (error) {
      // Log but don't fail - flavors are used for enrichment only
      logger.warn({ err: error }, 'Failed to fetch flavors');
    }

    return this.cachedFlavors;
  }

  /**
   * Fetches all servers in the project.
   */
  private async fetchServers(allTenants: boolean = false): Promise<OpenStackServer[]> {
    const endpoint = allTenants
      ? '/servers/detail?all_tenants=1'
      : '/servers/detail';

    const data = await this.request<unknown>(endpoint);
    const parsed = OpenStackServersResponseSchema.parse(data);
    return parsed.servers;
  }

  /**
   * Fetches all hypervisors (admin only).
   */
  private async fetchHypervisors(): Promise<OpenStackHypervisor[]> {
    const data = await this.request<unknown>('/os-hypervisors/detail');
    const parsed = OpenStackHypervisorsResponseSchema.parse(data);
    return parsed.hypervisors;
  }

  /**
   * Fetches a single hypervisor by ID or hostname (admin only).
   */
  private async fetchHypervisor(idOrHostname: string): Promise<OpenStackHypervisor | null> {
    try {
      // First try by ID
      const data = await this.request<unknown>(`/os-hypervisors/${idOrHostname}`);
      const parsed = OpenStackHypervisorDetailResponseSchema.parse(data);
      return parsed.hypervisor;
    } catch (error) {
      logger.debug({ err: error, id: idOrHostname }, 'Failed to fetch hypervisor by ID');
      // If ID lookup fails, try searching by hostname
      try {
        const searchData = await this.request<unknown>(
          `/os-hypervisors?hypervisor_hostname_pattern=${encodeURIComponent(idOrHostname)}`
        );
        const searchParsed = OpenStackHypervisorsResponseSchema.parse(searchData);

        if (searchParsed.hypervisors.length > 0) {
          // Get full details for the first match
          const hypervisor = searchParsed.hypervisors[0];
          const detailData = await this.request<unknown>(`/os-hypervisors/${hypervisor.id}`);
          const detailParsed = OpenStackHypervisorDetailResponseSchema.parse(detailData);
          return detailParsed.hypervisor;
        }
      } catch (error) {
        // Search also failed
        logger.debug({ err: error, hostname: idOrHostname }, 'Failed to search hypervisor by hostname');
      }

      return null;
    }
  }

  /**
   * Fetches project limits.
   */
  private async fetchLimits(): Promise<{
    maxTotalCores?: number;
    maxTotalRAMSize?: number;
    totalCoresUsed?: number;
    totalRAMUsed?: number;
    totalInstancesUsed?: number;
    maxTotalInstances?: number;
  }> {
    try {
      const data = await this.request<unknown>('/limits');
      const parsed = OpenStackLimitsSchema.parse(data);
      return parsed.limits.absolute;
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch limits');
      return {};
    }
  }

  // ==========================================================================
  // InfraProvider Interface Implementation
  // ==========================================================================

  /**
   * Test connection to the OpenStack cloud.
   */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const token = await getAuthToken(this.config);

      // Verify we can reach the compute service
      const novaUrl = getNovaEndpoint(token, 'public', this.config.region);
      if (!novaUrl) {
        return {
          ok: false,
          message: `Nova endpoint not found for region: ${this.config.region || 'any'}`,
        };
      }

      // Try to list servers (minimal call to verify access)
      await this.request<unknown>('/servers?limit=1');

      const isAdmin = hasAdminRole(token);
      return {
        ok: true,
        message: `Connected to ${this.config.projectName} (${isAdmin ? 'admin' : 'member'})`,
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ err }, 'OpenStack connection test failed');
      return {
        ok: false,
        message: err.message,
      };
    }
  }

  /**
   * Get all clusters/projects.
   * For OpenStack, we treat each region/project combination as a "cluster".
   */
  async getClusters(): Promise<ClusterStatus[]> {
    try {
      const isAdmin = await this.isAdmin();
      const clusterName = this.getClusterName();

      let nodes: NodeStatus[] = [];

      if (isAdmin) {
        // Admin users can see hypervisors
        const hypervisors = await this.fetchHypervisors();
        nodes = mapHypervisorsToNodes(hypervisors);
      } else {
        // Non-admin users see a project summary
        const limits = await this.fetchLimits();
        nodes = [createProjectSummaryNode(this.config.projectName, limits)];
      }

      const token = await this.getToken();

      return [
        {
          name: clusterName,
          provider: 'openstack',
          nodes,
          metadata: {
            projectName: this.config.projectName,
            projectId: token.projectId,
            region: this.config.region || 'default',
            isAdmin: String(isAdmin),
          },
        },
      ];

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ err }, 'Failed to get OpenStack clusters');
      return [
        {
          name: this.getClusterName(),
          provider: 'openstack',
          nodes: [],
          error: err.message,
        },
      ];
    }
  }

  /**
   * Get a single cluster by name.
   */
  async getCluster(name: string): Promise<ClusterStatus | null> {
    const clusterName = this.getClusterName();

    // Only return if the requested name matches our cluster
    if (name !== clusterName && name !== this.name) {
      return null;
    }

    const clusters = await this.getClusters();
    return clusters[0] || null;
  }

  /**
   * Get a single node's detailed status.
   * For admin users: hypervisor details
   * For non-admin users: project summary
   */
  async getNode(clusterName: string, nodeName: string): Promise<NodeStatus | null> {
    const expectedCluster = this.getClusterName();

    if (clusterName !== expectedCluster && clusterName !== this.name) {
      return null;
    }

    const isAdmin = await this.isAdmin();

    if (isAdmin) {
      // Try to get hypervisor details
      const hypervisor = await this.fetchHypervisor(nodeName);
      if (hypervisor) {
        return mapOpenStackHypervisorToNode(hypervisor);
      }
    }

    // Fallback: return project summary
    if (nodeName.startsWith('project-') || nodeName.includes(this.config.projectName)) {
      const limits = await this.fetchLimits();
      return createProjectSummaryNode(this.config.projectName, limits);
    }

    return null;
  }

  /**
   * Get workloads (instances) on a specific node.
   * For admin users with hypervisor name: instances on that hypervisor
   * For non-admin or project node: all instances in the project
   */
  async getWorkloads(clusterName: string, nodeName: string): Promise<Workload[]> {
    const expectedCluster = this.getClusterName();

    if (clusterName !== expectedCluster && clusterName !== this.name) {
      return [];
    }

    try {
      const isAdmin = await this.isAdmin();

      // Fetch servers and flavors in parallel
      const [servers, flavors] = await Promise.all([
        this.fetchServers(),
        this.fetchFlavors(),
      ]);

      let filteredServers = servers;

      // For admin users, filter by hypervisor if a hypervisor node is requested
      if (isAdmin && !nodeName.startsWith('project-')) {
        filteredServers = filterServersByHypervisor(servers, nodeName);

        // If no servers found on this hypervisor, check if it's a valid hypervisor
        if (filteredServers.length === 0) {
          const hypervisor = await this.fetchHypervisor(nodeName);
          if (!hypervisor) {
            // Not a valid hypervisor, return all servers
            filteredServers = servers;
          }
        }
      }

      return mapServersToWorkloads(filteredServers, flavors);
    } catch (error) {
      logger.error({ err: error, cluster: clusterName, node: nodeName }, 'Failed to get workloads for node');
      return [];
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Gets the cluster name for this provider configuration.
   */
  private getClusterName(): string {
    const region = this.config.region || 'default';
    return `${this.name}/${region}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates an OpenStack provider instance.
 */
export function createOpenStackProvider(config: OpenStackClusterConfig): InfraProvider {
  return new OpenStackProvider(config);
}
