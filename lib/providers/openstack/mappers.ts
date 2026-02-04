import {
  Workload,
  WorkloadStatusType,
  NodeStatus,
  NodeStatusType,
  createResourceMetric,
} from '../types';
import { OpenStackServer, OpenStackHypervisor, OpenStackFlavor } from './schemas';

// ============================================================================
// Server Status Mapping
// ============================================================================

/**
 * Maps OpenStack server status to unified WorkloadStatusType.
 */
export function mapServerStatus(status: string): WorkloadStatusType {
  const normalizedStatus = status.toUpperCase();

  switch (normalizedStatus) {
    case 'ACTIVE':
      return 'running';

    case 'SHUTOFF':
    case 'DELETED':
    case 'SOFT_DELETED':
    case 'SHELVED':
    case 'SHELVED_OFFLOADED':
      return 'stopped';

    case 'PAUSED':
    case 'SUSPENDED':
      return 'paused';

    case 'BUILD':
    case 'REBUILD':
    case 'RESIZE':
    case 'VERIFY_RESIZE':
    case 'REVERT_RESIZE':
    case 'MIGRATING':
    case 'REBOOT':
    case 'HARD_REBOOT':
    case 'RESCUE':
    case 'PASSWORD':
      return 'pending';

    case 'ERROR':
      return 'failed';

    default:
      return 'unknown';
  }
}

/**
 * Maps OpenStack hypervisor state to unified NodeStatusType.
 */
export function mapHypervisorStatus(state: string, status: string): NodeStatusType {
  const normalizedState = state.toLowerCase();
  const normalizedStatus = status.toLowerCase();

  // If hypervisor is disabled, it's in maintenance
  if (normalizedStatus === 'disabled') {
    return 'maintenance';
  }

  // Map state
  switch (normalizedState) {
    case 'up':
      return 'online';
    case 'down':
      return 'offline';
    default:
      return 'unknown';
  }
}

// ============================================================================
// Server to Workload Mapping
// ============================================================================

/**
 * Maps an OpenStack server to a unified Workload type.
 */
export function mapOpenStackServerToWorkload(
  server: OpenStackServer,
  flavor?: OpenStackFlavor | null
): Workload {
  // Extract CPU count from flavor
  let cpuCount = 1;
  let memoryTotal = 0;

  if (flavor) {
    cpuCount = flavor.vcpus;
    memoryTotal = flavor.ram * 1024 * 1024; // Convert MB to bytes
  } else if (server.flavor && 'vcpus' in server.flavor && server.flavor.vcpus) {
    // Some API versions include flavor details inline
    cpuCount = server.flavor.vcpus;
    memoryTotal = (server.flavor.ram || 0) * 1024 * 1024;
  }

  // Calculate uptime from launched_at
  let uptime: number | undefined;
  const launchedAt = server['OS-SRV-USG:launched_at'];
  if (launchedAt && server.status === 'ACTIVE') {
    const launchDate = new Date(launchedAt);
    uptime = Math.floor((Date.now() - launchDate.getTime()) / 1000);
  }

  // Extract flavor info for providerData
  let flavorId: string | undefined;
  let flavorName: string | undefined;

  if (flavor) {
    flavorId = flavor.id;
    flavorName = flavor.name;
  } else if (server.flavor) {
    if ('id' in server.flavor) {
      flavorId = server.flavor.id;
    }
    if ('original_name' in server.flavor && server.flavor.original_name) {
      flavorName = server.flavor.original_name;
    }
  }

  // Extract image ID
  let imageId: string | undefined;
  if (server.image) {
    if (typeof server.image === 'object' && server.image !== null && 'id' in server.image) {
      imageId = server.image.id;
    }
  }

  // Map addresses to simplified format
  const addresses: Record<string, Array<{ addr: string; type: string }>> = {};
  if (server.addresses) {
    for (const [network, addrs] of Object.entries(server.addresses)) {
      addresses[network] = addrs.map((a) => ({
        addr: a.addr,
        type: a['OS-EXT-IPS:type'] || 'unknown',
      }));
    }
  }

  return {
    id: server.id,
    name: server.name,
    status: mapServerStatus(server.status),
    type: 'instance',
    cpu: {
      count: cpuCount,
      usage: undefined, // OpenStack doesn't provide CPU usage in server list
    },
    memory: {
      used: 0, // OpenStack doesn't provide memory usage in server list
      total: memoryTotal,
    },
    uptime,
    metadata: server.metadata,
    providerData: {
      flavorName,
      flavorId,
      imageId,
      tenantId: server.tenant_id,
      availabilityZone: server['OS-EXT-AZ:availability_zone'],
      addresses: Object.keys(addresses).length > 0 ? addresses : undefined,
    },
  };
}

// ============================================================================
// Hypervisor to Node Mapping
// ============================================================================

/**
 * Maps an OpenStack hypervisor to a unified NodeStatus type.
 */
export function mapOpenStackHypervisorToNode(hypervisor: OpenStackHypervisor): NodeStatus {
  const id = String(hypervisor.id);

  // Calculate CPU metrics
  const cpuTotal = hypervisor.vcpus || 0;
  const cpuUsed = hypervisor.vcpus_used || 0;

  // Calculate memory metrics (convert MB to bytes)
  const memoryTotal = (hypervisor.memory_mb || 0) * 1024 * 1024;
  const memoryUsed = (hypervisor.memory_mb_used || 0) * 1024 * 1024;

  // Calculate storage metrics (convert GB to bytes)
  const storageTotal = (hypervisor.local_gb || 0) * 1024 * 1024 * 1024;
  const storageUsed = (hypervisor.local_gb_used || 0) * 1024 * 1024 * 1024;

  // Parse CPU info if available
  let cpuInfo: object | undefined;
  if (hypervisor.cpu_info) {
    if (typeof hypervisor.cpu_info === 'string') {
      try {
        cpuInfo = JSON.parse(hypervisor.cpu_info);
      } catch {
        // Ignore parse errors
      }
    } else {
      cpuInfo = hypervisor.cpu_info;
    }
  }

  return {
    id,
    name: hypervisor.hypervisor_hostname,
    status: mapHypervisorStatus(hypervisor.state, hypervisor.status),
    cpu: createResourceMetric(cpuUsed, cpuTotal),
    memory: createResourceMetric(memoryUsed, memoryTotal),
    storage: storageTotal > 0 ? createResourceMetric(storageUsed, storageTotal) : undefined,
    uptime: undefined, // OpenStack doesn't provide hypervisor uptime
    metadata: {
      runningVMs: String(hypervisor.running_vms || 0),
      currentWorkload: String(hypervisor.current_workload || 0),
    },
    providerData: {
      hypervisorType: hypervisor.hypervisor_type,
      hypervisorHostname: hypervisor.hypervisor_hostname,
      // Include CPU info if parsed successfully
      ...(cpuInfo && typeof cpuInfo === 'object' && 'model' in cpuInfo
        ? { cpuModel: String(cpuInfo.model) }
        : {}),
    },
  };
}

// ============================================================================
// Summary Node (for non-admin users)
// ============================================================================

/**
 * Creates a summary "node" from project limits when hypervisor access is not available.
 * This provides a basic view for non-admin users.
 */
export function createProjectSummaryNode(
  projectName: string,
  limits: {
    maxTotalCores?: number;
    maxTotalRAMSize?: number;
    totalCoresUsed?: number;
    totalRAMUsed?: number;
    totalInstancesUsed?: number;
  }
): NodeStatus {
  return {
    id: `project-${projectName}`,
    name: `Project: ${projectName}`,
    status: 'online',
    cpu: createResourceMetric(
      limits.totalCoresUsed || 0,
      limits.maxTotalCores || 0
    ),
    memory: createResourceMetric(
      (limits.totalRAMUsed || 0) * 1024 * 1024, // Convert MB to bytes
      (limits.maxTotalRAMSize || 0) * 1024 * 1024
    ),
    metadata: {
      instancesUsed: String(limits.totalInstancesUsed || 0),
      isProjectSummary: 'true',
    },
  };
}

// ============================================================================
// Batch Mapping Utilities
// ============================================================================

/**
 * Maps multiple servers to workloads with flavor lookup.
 */
export function mapServersToWorkloads(
  servers: OpenStackServer[],
  flavorsById: Map<string, OpenStackFlavor>
): Workload[] {
  return servers.map((server) => {
    let flavor: OpenStackFlavor | null = null;

    // Try to get flavor from the map
    if (server.flavor && 'id' in server.flavor) {
      flavor = flavorsById.get(server.flavor.id) || null;
    }

    return mapOpenStackServerToWorkload(server, flavor);
  });
}

/**
 * Maps multiple hypervisors to nodes.
 */
export function mapHypervisorsToNodes(hypervisors: OpenStackHypervisor[]): NodeStatus[] {
  return hypervisors.map(mapOpenStackHypervisorToNode);
}

// ============================================================================
// Server Filtering
// ============================================================================

/**
 * Filters servers by hypervisor hostname (for node-specific queries).
 * Only works if the server includes OS-EXT-SRV-ATTR:hypervisor_hostname.
 */
export function filterServersByHypervisor(
  servers: OpenStackServer[],
  hypervisorHostname: string
): OpenStackServer[] {
  return servers.filter((server) => {
    const hostname = server['OS-EXT-SRV-ATTR:hypervisor_hostname'];
    return hostname === hypervisorHostname;
  });
}
