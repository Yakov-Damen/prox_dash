import { BaseProviderConfig, ProviderType } from '../providers/types';

// ============================================================================
// Proxmox Provider Configuration
// ============================================================================

export interface ProxmoxConfig extends BaseProviderConfig {
  type: 'proxmox';
  url: string;
  tokenId: string;
  tokenSecret: string;
  allowInsecure?: boolean;
}

// ============================================================================
// Kubernetes Provider Configuration
// ============================================================================

export interface KubernetesConfig extends BaseProviderConfig {
  type: 'kubernetes';
  /**
   * Path to kubeconfig file. Supports ~ for home directory.
   * If not provided, defaults to ~/.kube/config or in-cluster config.
   */
  kubeConfigPath?: string;
  /**
   * Context to use from the kubeconfig file.
   * If not provided, uses the current-context.
   */
  kubeConfigContext?: string;
  /**
   * Base64-encoded kubeconfig content (alternative to file path).
   * Useful for environments where file access is restricted.
   */
  kubeConfigData?: string;
}

// ============================================================================
// OpenStack Provider Configuration
// ============================================================================

export interface OpenStackConfig extends BaseProviderConfig {
  type: 'openstack';
  /**
   * Keystone authentication URL (e.g., https://keystone.example.com:5000/v3)
   */
  authUrl: string;
  /**
   * OpenStack project/tenant name
   */
  projectName: string;
  /**
   * OpenStack username
   */
  username: string;
  /**
   * OpenStack password
   */
  password: string;
  /**
   * User domain name (defaults to 'Default')
   */
  userDomainName?: string;
  /**
   * Project domain name (defaults to 'Default')
   */
  projectDomainName?: string;
  /**
   * Region name (optional)
   */
  region?: string;
  /**
   * Skip TLS certificate verification
   */
  allowInsecure?: boolean;
}

// ============================================================================
// Provider Config Union Type
// ============================================================================

export type ProviderConfig = ProxmoxConfig | KubernetesConfig | OpenStackConfig;

// ============================================================================
// Infrastructure Configuration
// ============================================================================

/**
 * The complete infrastructure configuration containing all provider configs.
 */
export type InfrastructureConfig = ProviderConfig[];

// ============================================================================
// Legacy Proxmox Configuration (for backwards compatibility)
// ============================================================================

/**
 * Legacy format from proxmox_config.json (before multi-provider support).
 * Does not include the 'type' field.
 */
export interface LegacyProxmoxConfig {
  name: string;
  url: string;
  tokenId: string;
  tokenSecret: string;
  allowInsecure?: boolean;
}

export type LegacyInfrastructureConfig = LegacyProxmoxConfig[];

// ============================================================================
// Type Guards
// ============================================================================

export function isProxmoxConfig(config: ProviderConfig): config is ProxmoxConfig {
  return config.type === 'proxmox';
}

export function isKubernetesConfig(config: ProviderConfig): config is KubernetesConfig {
  return config.type === 'kubernetes';
}

export function isOpenStackConfig(config: ProviderConfig): config is OpenStackConfig {
  return config.type === 'openstack';
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract configs of a specific provider type from the array.
 */
export type ConfigsOfType<T extends ProviderType> = Extract<ProviderConfig, { type: T }>;

/**
 * Helper to get the config type for a provider type.
 */
export type ProviderConfigMap = {
  proxmox: ProxmoxConfig;
  kubernetes: KubernetesConfig;
  openstack: OpenStackConfig;
};
