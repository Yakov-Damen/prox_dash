import { z } from 'zod';

// ============================================================================
// Kubernetes Node Schemas
// ============================================================================

// Node condition (Ready, MemoryPressure, DiskPressure, etc.)
export const K8sNodeConditionSchema = z.object({
  type: z.string(),
  status: z.enum(['True', 'False', 'Unknown']),
  lastHeartbeatTime: z.string().optional(),
  lastTransitionTime: z.string().optional(),
  reason: z.string().optional(),
  message: z.string().optional(),
});

export type K8sNodeCondition = z.infer<typeof K8sNodeConditionSchema>;

// Node taint
export const K8sNodeTaintSchema = z.object({
  key: z.string(),
  value: z.string().optional(),
  effect: z.enum(['NoSchedule', 'PreferNoSchedule', 'NoExecute']),
  timeAdded: z.string().optional(),
});

export type K8sNodeTaint = z.infer<typeof K8sNodeTaintSchema>;

// Node system info
export const K8sNodeSystemInfoSchema = z.object({
  machineID: z.string().optional(),
  systemUUID: z.string().optional(),
  bootID: z.string().optional(),
  kernelVersion: z.string().optional(),
  osImage: z.string().optional(),
  containerRuntimeVersion: z.string().optional(),
  kubeletVersion: z.string().optional(),
  kubeProxyVersion: z.string().optional(),
  operatingSystem: z.string().optional(),
  architecture: z.string().optional(),
});

export type K8sNodeSystemInfo = z.infer<typeof K8sNodeSystemInfoSchema>;

// Node address
export const K8sNodeAddressSchema = z.object({
  type: z.enum(['Hostname', 'ExternalIP', 'InternalIP', 'ExternalDNS', 'InternalDNS']),
  address: z.string(),
});

export type K8sNodeAddress = z.infer<typeof K8sNodeAddressSchema>;

// ============================================================================
// Kubernetes Pod Schemas
// ============================================================================

// Container state
export const K8sContainerStateSchema = z.object({
  running: z.object({
    startedAt: z.string().optional(),
  }).optional(),
  waiting: z.object({
    reason: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
  terminated: z.object({
    exitCode: z.number().optional(),
    signal: z.number().optional(),
    reason: z.string().optional(),
    message: z.string().optional(),
    startedAt: z.string().optional(),
    finishedAt: z.string().optional(),
    containerID: z.string().optional(),
  }).optional(),
});

export type K8sContainerState = z.infer<typeof K8sContainerStateSchema>;

// Container status
export const K8sContainerStatusSchema = z.object({
  name: z.string(),
  state: K8sContainerStateSchema.optional(),
  lastState: K8sContainerStateSchema.optional(),
  ready: z.boolean(),
  restartCount: z.number(),
  image: z.string(),
  imageID: z.string().optional(),
  containerID: z.string().optional(),
  started: z.boolean().optional(),
});

export type K8sContainerStatus = z.infer<typeof K8sContainerStatusSchema>;

// Pod condition
export const K8sPodConditionSchema = z.object({
  type: z.string(),
  status: z.enum(['True', 'False', 'Unknown']),
  lastProbeTime: z.string().nullable().optional(),
  lastTransitionTime: z.string().optional(),
  reason: z.string().optional(),
  message: z.string().optional(),
});

export type K8sPodCondition = z.infer<typeof K8sPodConditionSchema>;

// ============================================================================
// Metrics Server Schemas
// ============================================================================

// Node metrics from metrics-server
export const K8sNodeMetricsSchema = z.object({
  metadata: z.object({
    name: z.string(),
    creationTimestamp: z.string().optional(),
  }),
  timestamp: z.string().optional(),
  window: z.string().optional(),
  usage: z.object({
    cpu: z.string(),    // e.g., "250m" or "1"
    memory: z.string(), // e.g., "1Gi" or "1024Ki"
  }),
});

export type K8sNodeMetrics = z.infer<typeof K8sNodeMetricsSchema>;

// Pod metrics from metrics-server
export const K8sPodMetricsSchema = z.object({
  metadata: z.object({
    name: z.string(),
    namespace: z.string(),
    creationTimestamp: z.string().optional(),
  }),
  timestamp: z.string().optional(),
  window: z.string().optional(),
  containers: z.array(z.object({
    name: z.string(),
    usage: z.object({
      cpu: z.string(),
      memory: z.string(),
    }),
  })),
});

export type K8sPodMetrics = z.infer<typeof K8sPodMetricsSchema>;

// ============================================================================
// Resource Quantity Parsing
// ============================================================================

/**
 * Parse Kubernetes CPU quantity string to millicores
 * Examples: "100m" -> 100, "1" -> 1000, "2.5" -> 2500
 */
export function parseCpuQuantity(quantity: string): number {
  if (quantity.endsWith('m')) {
    return parseInt(quantity.slice(0, -1), 10);
  }
  if (quantity.endsWith('n')) {
    return parseInt(quantity.slice(0, -1), 10) / 1_000_000;
  }
  return parseFloat(quantity) * 1000;
}

/**
 * Parse Kubernetes memory quantity string to bytes
 * Examples: "1Gi" -> 1073741824, "512Mi" -> 536870912, "1024Ki" -> 1048576
 */
export function parseMemoryQuantity(quantity: string): number {
  const units: Record<string, number> = {
    'Ki': 1024,
    'Mi': 1024 ** 2,
    'Gi': 1024 ** 3,
    'Ti': 1024 ** 4,
    'Pi': 1024 ** 5,
    'Ei': 1024 ** 6,
    'K': 1000,
    'M': 1000 ** 2,
    'G': 1000 ** 3,
    'T': 1000 ** 4,
    'P': 1000 ** 5,
    'E': 1000 ** 6,
    'k': 1000,
    'm': 1000 ** 2,
  };

  // Check for units (longest first)
  for (const [unit, multiplier] of Object.entries(units).sort((a, b) => b[0].length - a[0].length)) {
    if (quantity.endsWith(unit)) {
      return parseFloat(quantity.slice(0, -unit.length)) * multiplier;
    }
  }

  // Plain number in bytes
  return parseInt(quantity, 10);
}

/**
 * Parse storage quantity (alias for memory since they use same format)
 */
export const parseStorageQuantity = parseMemoryQuantity;
