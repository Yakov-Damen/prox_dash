// ============================================================================
// Proxmox Provider Module
// ============================================================================

// Configuration
export {
  type ProxmoxClusterConfig,
  type LegacyProxmoxConfig,
  ProxmoxClusterConfigSchema,
  LegacyProxmoxConfigSchema,
  parseProxmoxConfig,
  convertLegacyConfig,
} from './config';

// Schemas
export {
  ProxmoxNodeListResponseSchema,
  ProxmoxNodeListItemSchema,
  ProxmoxVersionResponseSchema,
  ProxmoxNodeStatusResponseSchema,
  ProxmoxCpuInfoSchema,
  ProxmoxMemoryInfoSchema,
  ProxmoxVMListResponseSchema,
  ProxmoxVMListItemSchema,
  ProxmoxVMStatusResponseSchema,
  type ProxmoxNodeListResponse,
  type ProxmoxNodeListItem,
  type ProxmoxVersionResponse,
  type ProxmoxNodeStatusResponse,
  type ProxmoxVMListResponse,
  type ProxmoxVMListItem,
  type ProxmoxVMStatusResponse,
} from './schemas';

// Client
export {
  ProxmoxProvider,
  createProxmoxProvider,
  createProxmoxProviderFromLegacy,
  getProxmoxConfigs,
  getAllProxmoxProviders,
  clearConfigCache,
} from './client';
