import { z } from 'zod';

// ============================================================================
// Provider Type Discriminator
// ============================================================================

export const ProviderTypes = ['proxmox', 'kubernetes', 'openstack'] as const;
export type ProviderType = (typeof ProviderTypes)[number];

export const ProviderTypeSchema = z.enum(ProviderTypes);

// ============================================================================
// Unified Status Types
// ============================================================================

// Node/host statuses across all providers
export const NodeStatuses = [
  'online',      // Proxmox: online, K8s: Ready, OpenStack: up
  'offline',     // Proxmox: offline, K8s: not schedulable, OpenStack: down
  'unknown',     // Unknown state
  'ready',       // K8s specific: node ready
  'not-ready',   // K8s specific: node not ready
  'maintenance', // Under maintenance
] as const;
export type NodeStatusType = (typeof NodeStatuses)[number];

// Workload statuses across all providers
export const WorkloadStatuses = [
  'running',     // Active/running
  'stopped',     // Stopped/terminated
  'paused',      // Paused/suspended
  'pending',     // K8s: pending, OpenStack: building
  'failed',      // Error state
  'succeeded',   // K8s: completed successfully
  'unknown',     // Unknown state
] as const;
export type WorkloadStatusType = (typeof WorkloadStatuses)[number];

// ============================================================================
// Workload Types
// ============================================================================

export const WorkloadTypes = [
  // Proxmox
  'qemu',        // Proxmox QEMU VM
  'lxc',         // Proxmox LXC container
  // Kubernetes
  'pod',         // K8s Pod
  'deployment',  // K8s Deployment
  'statefulset', // K8s StatefulSet
  'daemonset',   // K8s DaemonSet
  'job',         // K8s Job
  'cronjob',     // K8s CronJob
  // OpenStack
  'instance',    // OpenStack Nova instance
  'volume',      // OpenStack Cinder volume (for display)
] as const;
export type WorkloadType = (typeof WorkloadTypes)[number];

// ============================================================================
// Resource Metrics
// ============================================================================

export interface ResourceMetric {
  used: number;
  total: number;
  percentage: number;
}

export const ResourceMetricSchema = z.object({
  used: z.number(),
  total: z.number(),
  percentage: z.number(),
});

// ============================================================================
// Unified Cluster Status
// ============================================================================

export interface ClusterStatus {
  name: string;
  provider: ProviderType;
  nodes: NodeStatus[];
  version?: string;
  error?: string;
  metadata?: Record<string, string>;
}

export const ClusterStatusSchema = z.object({
  name: z.string(),
  provider: ProviderTypeSchema,
  nodes: z.array(z.lazy(() => NodeStatusSchema)),
  version: z.string().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// ============================================================================
// Unified Node Status
// ============================================================================

export interface NodeStatus {
  id: string;
  name: string;
  status: NodeStatusType;
  cpu: ResourceMetric;
  memory: ResourceMetric;
  storage?: ResourceMetric;
  uptime?: number;
  metadata?: Record<string, string>;

  // Provider-specific extended info (optional)
  providerData?: {
    // Proxmox specific
    cpuModel?: string;
    cpuSockets?: number;
    cpuCores?: number;
    kernelVersion?: string;
    manufacturer?: string;
    productName?: string;

    // Kubernetes specific
    kubeletVersion?: string;
    containerRuntime?: string;
    osImage?: string;
    architecture?: string;
    conditions?: Array<{ type: string; status: string; message?: string }>;
    taints?: Array<{ key: string; value?: string; effect: string }>;

    // OpenStack specific
    hypervisorType?: string;
    hypervisorHostname?: string;
    availabilityZone?: string;
  };
}

export const NodeStatusSchema: z.ZodType<NodeStatus> = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(NodeStatuses),
  cpu: ResourceMetricSchema,
  memory: ResourceMetricSchema,
  storage: ResourceMetricSchema.optional(),
  uptime: z.number().optional(),
  metadata: z.record(z.string()).optional(),
  providerData: z.object({
    // Proxmox
    cpuModel: z.string().optional(),
    cpuSockets: z.number().optional(),
    cpuCores: z.number().optional(),
    kernelVersion: z.string().optional(),
    manufacturer: z.string().optional(),
    productName: z.string().optional(),
    // Kubernetes
    kubeletVersion: z.string().optional(),
    containerRuntime: z.string().optional(),
    osImage: z.string().optional(),
    architecture: z.string().optional(),
    conditions: z.array(z.object({
      type: z.string(),
      status: z.string(),
      message: z.string().optional(),
    })).optional(),
    taints: z.array(z.object({
      key: z.string(),
      value: z.string().optional(),
      effect: z.string(),
    })).optional(),
    // OpenStack
    hypervisorType: z.string().optional(),
    hypervisorHostname: z.string().optional(),
    availabilityZone: z.string().optional(),
  }).optional(),
});

// ============================================================================
// Unified Workload Status
// ============================================================================

export interface Workload {
  id: string;
  name: string;
  status: WorkloadStatusType;
  type: WorkloadType;
  cpu: {
    count: number;
    usage?: number; // 0-1 percentage
  };
  memory: {
    used: number;
    total: number;
  };
  uptime?: number;
  metadata?: Record<string, string>;

  // Provider-specific extended info
  providerData?: {
    // Proxmox specific
    vmid?: number;

    // Kubernetes specific
    namespace?: string;
    containers?: Array<{
      name: string;
      image: string;
      ready: boolean;
      restartCount: number;
      state: string;
    }>;
    nodeName?: string;
    podIP?: string;

    // OpenStack specific
    flavorName?: string;
    flavorId?: string;
    imageId?: string;
    tenantId?: string;
    availabilityZone?: string;
    addresses?: Record<string, Array<{ addr: string; type: string }>>;
  };
}

export const WorkloadSchema: z.ZodType<Workload> = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(WorkloadStatuses),
  type: z.enum(WorkloadTypes),
  cpu: z.object({
    count: z.number(),
    usage: z.number().optional(),
  }),
  memory: z.object({
    used: z.number(),
    total: z.number(),
  }),
  uptime: z.number().optional(),
  metadata: z.record(z.string()).optional(),
  providerData: z.any().optional(), // Flexible for provider-specific data
});

// ============================================================================
// Provider Configuration Base
// ============================================================================

export interface BaseProviderConfig {
  name: string;
  type: ProviderType;
  enabled?: boolean;
}

export const BaseProviderConfigSchema = z.object({
  name: z.string(),
  type: ProviderTypeSchema,
  enabled: z.boolean().optional().default(true),
});

// ============================================================================
// Provider Interface
// ============================================================================

export interface InfraProvider {
  readonly type: ProviderType;
  readonly name: string;

  /**
   * Test connection to the provider
   */
  testConnection(): Promise<{ ok: boolean; message: string }>;

  /**
   * Get all clusters/contexts managed by this provider config
   */
  getClusters(): Promise<ClusterStatus[]>;

  /**
   * Get a single cluster by name
   */
  getCluster(name: string): Promise<ClusterStatus | null>;

  /**
   * Get a single node's detailed status
   */
  getNode(clusterName: string, nodeName: string): Promise<NodeStatus | null>;

  /**
   * Get workloads (VMs, pods, instances) on a specific node
   */
  getWorkloads(clusterName: string, nodeName: string): Promise<Workload[]>;
}

// ============================================================================
// Provider Factory Types
// ============================================================================

export type ProviderFactory<T extends BaseProviderConfig> = (config: T) => InfraProvider;

// ============================================================================
// Utility Types
// ============================================================================

// Map legacy Proxmox types to unified types
export interface LegacyProxmoxNodeStatus {
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

export interface LegacyProxmoxVMStatus {
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
// Conversion Helpers
// ============================================================================

export function createResourceMetric(used: number, total: number): ResourceMetric {
  return {
    used,
    total,
    percentage: total > 0 ? (used / total) * 100 : 0,
  };
}

export function convertProxmoxNodeToUnified(
  legacy: LegacyProxmoxNodeStatus,
  clusterName: string
): NodeStatus {
  return {
    id: legacy.id || `${clusterName}/${legacy.node}`,
    name: legacy.node,
    status: legacy.status,
    cpu: createResourceMetric(legacy.cpu * legacy.maxcpu, legacy.maxcpu), // cpu is 0-1 ratio
    memory: createResourceMetric(legacy.mem, legacy.maxmem),
    storage: legacy.maxdisk
      ? createResourceMetric(legacy.disk || 0, legacy.maxdisk)
      : undefined,
    uptime: legacy.uptime,
    providerData: {
      cpuModel: legacy.cpuModel,
      cpuSockets: legacy.cpuSockets,
      cpuCores: legacy.cpuCores,
      kernelVersion: legacy.kernelVersion,
      manufacturer: legacy.manufacturer,
      productName: legacy.productName,
    },
  };
}

export function convertProxmoxVMToWorkload(
  legacy: LegacyProxmoxVMStatus
): Workload {
  return {
    id: String(legacy.vmid),
    name: legacy.name,
    status: legacy.status,
    type: legacy.type,
    cpu: {
      count: legacy.cpus,
      usage: legacy.cpuUsage,
    },
    memory: {
      used: legacy.mem,
      total: legacy.maxmem,
    },
    uptime: legacy.uptime,
    providerData: {
      vmid: legacy.vmid,
    },
  };
}
