// ============================================================================
// Kubernetes Provider Module
// ============================================================================

// Configuration
export {
  type KubernetesClusterConfig,
  KubernetesClusterConfigSchema,
  validateKubernetesConfig,
  getEffectiveContextName,
} from './config';

// Schemas
export {
  // Node schemas
  K8sNodeConditionSchema,
  K8sNodeTaintSchema,
  K8sNodeSystemInfoSchema,
  K8sNodeAddressSchema,
  type K8sNodeCondition,
  type K8sNodeTaint,
  type K8sNodeSystemInfo,
  type K8sNodeAddress,

  // Pod schemas
  K8sContainerStateSchema,
  K8sContainerStatusSchema,
  K8sPodConditionSchema,
  type K8sContainerState,
  type K8sContainerStatus,
  type K8sPodCondition,

  // Metrics schemas
  K8sNodeMetricsSchema,
  K8sPodMetricsSchema,
  type K8sNodeMetrics,
  type K8sPodMetrics,

  // Quantity parsers
  parseCpuQuantity,
  parseMemoryQuantity,
  parseStorageQuantity,
} from './schemas';

// Mappers
export {
  mapK8sNodeToUnified,
  mapK8sPodToWorkload,
  mapK8sNodesToUnified,
  mapK8sPodsToWorkloads,
} from './mappers';

// Provider
export {
  KubernetesProvider,
  createKubernetesProvider,
} from './client';
