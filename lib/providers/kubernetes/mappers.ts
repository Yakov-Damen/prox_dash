import type { V1Node, V1Pod } from '@kubernetes/client-node';
import type { NodeStatus, Workload, WorkloadStatusType, NodeStatusType } from '../types';
import { createResourceMetric } from '../types';
import {
  parseCpuQuantity,
  parseMemoryQuantity,
  parseStorageQuantity,
  type K8sNodeMetrics,
  type K8sPodMetrics,
} from './schemas';

// ============================================================================
// Node Status Mapping
// ============================================================================

/**
 * Determine unified node status from K8s node conditions
 */
function getNodeStatus(node: V1Node): NodeStatusType {
  const conditions = node.status?.conditions || [];

  // Find the Ready condition
  const readyCondition = conditions.find(c => c.type === 'Ready');

  if (!readyCondition) {
    return 'unknown';
  }

  if (readyCondition.status === 'True') {
    return 'ready';
  }

  if (readyCondition.status === 'False') {
    return 'not-ready';
  }

  return 'unknown';
}

/**
 * Check if node is schedulable (not cordoned)
 */
function isNodeSchedulable(node: V1Node): boolean {
  return !node.spec?.unschedulable;
}

/**
 * Parse node allocatable/capacity resources
 */
function parseNodeResources(node: V1Node) {
  const capacity = node.status?.capacity || {};
  const allocatable = node.status?.allocatable || {};

  // CPU in millicores
  const cpuCapacity = capacity.cpu ? parseCpuQuantity(capacity.cpu) : 0;
  const cpuAllocatable = allocatable.cpu ? parseCpuQuantity(allocatable.cpu) : cpuCapacity;

  // Memory in bytes
  const memoryCapacity = capacity.memory ? parseMemoryQuantity(capacity.memory) : 0;
  const memoryAllocatable = allocatable.memory ? parseMemoryQuantity(allocatable.memory) : memoryCapacity;

  // Ephemeral storage in bytes
  const storageCapacity = capacity['ephemeral-storage']
    ? parseStorageQuantity(capacity['ephemeral-storage'])
    : undefined;
  const storageAllocatable = allocatable['ephemeral-storage']
    ? parseStorageQuantity(allocatable['ephemeral-storage'])
    : storageCapacity;

  return {
    cpuCapacity,
    cpuAllocatable,
    memoryCapacity,
    memoryAllocatable,
    storageCapacity,
    storageAllocatable,
  };
}

/**
 * Map Kubernetes V1Node to unified NodeStatus
 */
export function mapK8sNodeToUnified(
  node: V1Node,
  metrics?: K8sNodeMetrics
): NodeStatus {
  const resources = parseNodeResources(node);
  const nodeInfo = node.status?.nodeInfo;
  const conditions = node.status?.conditions || [];
  const taints = node.spec?.taints || [];

  // Calculate CPU usage from metrics if available
  let cpuUsed = 0;
  if (metrics?.usage?.cpu) {
    cpuUsed = parseCpuQuantity(metrics.usage.cpu);
  }

  // Calculate memory usage from metrics if available
  let memoryUsed = 0;
  if (metrics?.usage?.memory) {
    memoryUsed = parseMemoryQuantity(metrics.usage.memory);
  }

  // Determine status - if unschedulable, mark as maintenance
  let status = getNodeStatus(node);
  if (!isNodeSchedulable(node) && status === 'ready') {
    status = 'maintenance';
  }

  // Calculate uptime from node creation time
  let uptime: number | undefined;
  if (node.metadata?.creationTimestamp) {
    const created = new Date(node.metadata.creationTimestamp);
    uptime = Math.floor((Date.now() - created.getTime()) / 1000);
  }

  return {
    id: node.metadata?.uid || node.metadata?.name || 'unknown',
    name: node.metadata?.name || 'unknown',
    status,
    cpu: createResourceMetric(cpuUsed, resources.cpuAllocatable),
    memory: createResourceMetric(memoryUsed, resources.memoryAllocatable),
    storage: resources.storageCapacity
      ? createResourceMetric(0, resources.storageAllocatable || resources.storageCapacity)
      : undefined,
    uptime,
    metadata: {
      ...(node.metadata?.labels || {}),
    },
    providerData: {
      kubeletVersion: nodeInfo?.kubeletVersion,
      containerRuntime: nodeInfo?.containerRuntimeVersion,
      osImage: nodeInfo?.osImage,
      architecture: nodeInfo?.architecture,
      conditions: conditions.map(c => ({
        type: c.type || 'Unknown',
        status: c.status || 'Unknown',
        message: c.message,
      })),
      taints: taints.map(t => ({
        key: t.key || '',
        value: t.value,
        effect: t.effect || 'NoSchedule',
      })),
    },
  };
}

// ============================================================================
// Pod Status Mapping
// ============================================================================

/**
 * Determine unified workload status from K8s pod phase and conditions
 */
function getPodStatus(pod: V1Pod): WorkloadStatusType {
  const phase = pod.status?.phase;

  switch (phase) {
    case 'Running':
      return 'running';
    case 'Pending':
      return 'pending';
    case 'Succeeded':
      return 'succeeded';
    case 'Failed':
      return 'failed';
    case 'Unknown':
    default:
      return 'unknown';
  }
}

/**
 * Get container state as a string
 */
function getContainerState(status: { state?: { running?: object; waiting?: { reason?: string }; terminated?: { reason?: string } } }): string {
  if (status.state?.running) {
    return 'running';
  }
  if (status.state?.waiting) {
    return status.state.waiting.reason || 'waiting';
  }
  if (status.state?.terminated) {
    return status.state.terminated.reason || 'terminated';
  }
  return 'unknown';
}

/**
 * Parse pod resource requests/limits
 */
function parsePodResources(pod: V1Pod) {
  let totalCpuRequests = 0;
  let totalCpuLimits = 0;
  let totalMemoryRequests = 0;
  let totalMemoryLimits = 0;

  const containers = pod.spec?.containers || [];

  for (const container of containers) {
    const requests = container.resources?.requests || {};
    const limits = container.resources?.limits || {};

    if (requests.cpu) {
      totalCpuRequests += parseCpuQuantity(requests.cpu);
    }
    if (limits.cpu) {
      totalCpuLimits += parseCpuQuantity(limits.cpu);
    }
    if (requests.memory) {
      totalMemoryRequests += parseMemoryQuantity(requests.memory);
    }
    if (limits.memory) {
      totalMemoryLimits += parseMemoryQuantity(limits.memory);
    }
  }

  return {
    cpuRequests: totalCpuRequests,
    cpuLimits: totalCpuLimits || totalCpuRequests,
    memoryRequests: totalMemoryRequests,
    memoryLimits: totalMemoryLimits || totalMemoryRequests,
  };
}

/**
 * Map Kubernetes V1Pod to unified Workload
 */
export function mapK8sPodToWorkload(
  pod: V1Pod,
  metrics?: K8sPodMetrics
): Workload {
  const resources = parsePodResources(pod);
  const containerStatuses = pod.status?.containerStatuses || [];

  // Calculate actual CPU/memory usage from metrics
  let cpuUsage = 0;
  let memoryUsed = 0;

  if (metrics?.containers) {
    for (const container of metrics.containers) {
      cpuUsage += parseCpuQuantity(container.usage.cpu);
      memoryUsed += parseMemoryQuantity(container.usage.memory);
    }
  }

  // Calculate uptime from pod start time
  let uptime: number | undefined;
  if (pod.status?.startTime) {
    const started = new Date(pod.status.startTime);
    uptime = Math.floor((Date.now() - started.getTime()) / 1000);
  }

  // Map container statuses for provider data
  const containersInfo = containerStatuses.map(cs => ({
    name: cs.name,
    image: cs.image,
    ready: cs.ready,
    restartCount: cs.restartCount,
    state: getContainerState(cs),
  }));

  // CPU count is the number of CPU cores requested/limited
  const cpuCount = Math.ceil(resources.cpuLimits / 1000) || 1;

  return {
    id: pod.metadata?.uid || `${pod.metadata?.namespace}/${pod.metadata?.name}`,
    name: pod.metadata?.name || 'unknown',
    status: getPodStatus(pod),
    type: 'pod',
    cpu: {
      count: cpuCount,
      usage: resources.cpuLimits > 0 ? cpuUsage / resources.cpuLimits : undefined,
    },
    memory: {
      used: memoryUsed || resources.memoryRequests,
      total: resources.memoryLimits,
    },
    uptime,
    metadata: {
      ...(pod.metadata?.labels || {}),
    },
    providerData: {
      namespace: pod.metadata?.namespace,
      containers: containersInfo,
      nodeName: pod.spec?.nodeName,
      podIP: pod.status?.podIP,
    },
  };
}

// ============================================================================
// Batch Mapping Utilities
// ============================================================================

/**
 * Map multiple nodes with optional metrics
 */
export function mapK8sNodesToUnified(
  nodes: V1Node[],
  metricsMap?: Map<string, K8sNodeMetrics>
): NodeStatus[] {
  return nodes.map(node => {
    const nodeName = node.metadata?.name || '';
    const metrics = metricsMap?.get(nodeName);
    return mapK8sNodeToUnified(node, metrics);
  });
}

/**
 * Map multiple pods with optional metrics
 */
export function mapK8sPodsToWorkloads(
  pods: V1Pod[],
  metricsMap?: Map<string, K8sPodMetrics>
): Workload[] {
  return pods.map(pod => {
    const podKey = `${pod.metadata?.namespace}/${pod.metadata?.name}`;
    const metrics = metricsMap?.get(podKey);
    return mapK8sPodToWorkload(pod, metrics);
  });
}
