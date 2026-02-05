// ============================================================================
// OpenStack Provider - Public API
// ============================================================================

// Configuration
export {
  OpenStackClusterConfigSchema,
  validateOpenStackConfig,
  isPasswordAuth,
  isAppCredAuth,
  OPENSTACK_DEFAULTS,
} from './config';

export type {
  OpenStackClusterConfig,
} from './config';

// Authentication
export {
  getAuthToken,
  refreshToken,
  clearTokenCache,
  clearAllTokenCache,
  getServiceEndpoint,
  getNovaEndpoint,
  getGlanceEndpoint,
  getNeutronEndpoint,
  hasAdminRole,
} from './auth';

export type {
  AuthToken,
  ServiceEndpoint,
  ServiceCatalogEntry,
} from './auth';

// Schemas
export {
  OpenStackServerSchema,
  OpenStackServersResponseSchema,
  OpenStackServerDetailResponseSchema,
  OpenStackFlavorSchema,
  OpenStackFlavorsResponseSchema,
  OpenStackFlavorDetailResponseSchema,
  OpenStackHypervisorSchema,
  OpenStackHypervisorsResponseSchema,
  OpenStackHypervisorDetailResponseSchema,
  OpenStackLimitsSchema,
  OpenStackAvailabilityZoneSchema,
  OpenStackAvailabilityZonesResponseSchema,
  OpenStackServerDiagnosticsSchema,
  OpenStackVersionSchema,
  OpenStackVersionsResponseSchema,
  OpenStackServerStatus,
  POWER_STATE,
  getPowerStateName,
} from './schemas';

export type {
  OpenStackServer,
  OpenStackFlavor,
  OpenStackHypervisor,
  OpenStackLimits,
  OpenStackAvailabilityZone,
  OpenStackServerDiagnostics,
  OpenStackServerStatusType,
} from './schemas';

// Mappers
export {
  mapServerStatus,
  mapHypervisorStatus,
  mapOpenStackServerToWorkload,
  mapOpenStackHypervisorToNode,
  mapServersToWorkloads,
  mapHypervisorsToNodes,
  createProjectSummaryNode,
  filterServersByHypervisor,
} from './mappers';

// Provider
export { OpenStackProvider, createOpenStackProvider } from './client';

// Re-export types from main types module for convenience
export type { InfraProvider, ClusterStatus, NodeStatus, Workload } from '../types';
