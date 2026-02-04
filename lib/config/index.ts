// ============================================================================
// Configuration System - Main Export
// ============================================================================

// Types
export type {
  ProxmoxConfig,
  KubernetesConfig,
  OpenStackConfig,
  ProviderConfig,
  InfrastructureConfig,
  LegacyProxmoxConfig,
  LegacyInfrastructureConfig,
  ConfigsOfType,
  ProviderConfigMap,
} from './types';

// Type Guards
export {
  isProxmoxConfig,
  isKubernetesConfig,
  isOpenStackConfig,
} from './types';

// Schemas
export {
  ProxmoxConfigSchema,
  KubernetesConfigSchema,
  OpenStackConfigSchema,
  ProviderConfigSchema,
  InfrastructureConfigSchema,
  LegacyProxmoxConfigSchema,
  LegacyInfrastructureConfigSchema,
} from './schemas';

// Schema Types
export type {
  ProxmoxConfigSchemaType,
  KubernetesConfigSchemaType,
  OpenStackConfigSchemaType,
  ProviderConfigSchemaType,
  InfrastructureConfigSchemaType,
  LegacyProxmoxConfigSchemaType,
  LegacyInfrastructureConfigSchemaType,
  SafeProviderConfigResult,
  SafeInfrastructureConfigResult,
} from './schemas';

// Validation Helpers
export {
  validateProviderConfig,
  validateInfrastructureConfig,
  safeValidateProviderConfig,
  safeValidateInfrastructureConfig,
  isLegacyFormat,
  convertLegacyConfig,
} from './schemas';

// Configuration Loader
export {
  loadConfig,
  getProviderConfigs,
  getProviderConfigsByType,
  getProviderConfigByName,
  getProxmoxConfigs,
  getKubernetesConfigs,
  getOpenStackConfigs,
  clearConfigCache,
  getConfigCacheStatus,
  getConfigSummary,
} from './loader';
