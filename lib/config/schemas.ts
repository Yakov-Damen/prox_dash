import { z } from 'zod';

// ============================================================================
// Proxmox Config Schema
// ============================================================================

export const ProxmoxConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.literal('proxmox'),
  enabled: z.boolean().optional().default(true),
  url: z.string().url('URL must be a valid URL'),
  tokenId: z.string().min(1, 'Token ID is required'),
  tokenSecret: z.string().min(1, 'Token secret is required'),
  allowInsecure: z.boolean().optional().default(false),
});

export type ProxmoxConfigSchemaType = z.infer<typeof ProxmoxConfigSchema>;

// ============================================================================
// Kubernetes Config Schema
// ============================================================================

export const KubernetesConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.literal('kubernetes'),
  enabled: z.boolean().optional().default(true),
  kubeConfigPath: z.string().optional(),
  kubeConfigContext: z.string().optional(),
  kubeConfigData: z.string().optional(),
}).refine(
  (data) => data.kubeConfigPath || data.kubeConfigData || true,
  {
    message: 'Either kubeConfigPath or kubeConfigData should be provided (or use default in-cluster config)',
  }
);

export type KubernetesConfigSchemaType = z.infer<typeof KubernetesConfigSchema>;

// ============================================================================
// OpenStack Config Schema
// ============================================================================

export const OpenStackConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.literal('openstack'),
  enabled: z.boolean().optional().default(true),
  authUrl: z.string().url('Auth URL must be a valid URL'),
  projectName: z.string().min(1, 'Project name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  userDomainName: z.string().optional().default('Default'),
  projectDomainName: z.string().optional().default('Default'),
  region: z.string().optional(),
  allowInsecure: z.boolean().optional().default(false),
});

export type OpenStackConfigSchemaType = z.infer<typeof OpenStackConfigSchema>;

// ============================================================================
// Discriminated Union for Provider Config
// ============================================================================

export const ProviderConfigSchema = z.discriminatedUnion('type', [
  ProxmoxConfigSchema,
  KubernetesConfigSchema,
  OpenStackConfigSchema,
]);

export type ProviderConfigSchemaType = z.infer<typeof ProviderConfigSchema>;

// ============================================================================
// Infrastructure Config Schema (Array of Provider Configs)
// ============================================================================

export const InfrastructureConfigSchema = z.array(ProviderConfigSchema);

export type InfrastructureConfigSchemaType = z.infer<typeof InfrastructureConfigSchema>;

// ============================================================================
// Legacy Proxmox Config Schema (for backwards compatibility)
// ============================================================================

export const LegacyProxmoxConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('URL must be a valid URL'),
  tokenId: z.string().min(1, 'Token ID is required'),
  tokenSecret: z.string().min(1, 'Token secret is required'),
  allowInsecure: z.boolean().optional().default(false),
});

export type LegacyProxmoxConfigSchemaType = z.infer<typeof LegacyProxmoxConfigSchema>;

export const LegacyInfrastructureConfigSchema = z.array(LegacyProxmoxConfigSchema);

export type LegacyInfrastructureConfigSchemaType = z.infer<typeof LegacyInfrastructureConfigSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate a configuration object and return typed result or throw.
 */
export function validateProviderConfig(config: unknown): ProviderConfigSchemaType {
  return ProviderConfigSchema.parse(config);
}

/**
 * Validate a full infrastructure configuration.
 */
export function validateInfrastructureConfig(config: unknown): InfrastructureConfigSchemaType {
  return InfrastructureConfigSchema.parse(config);
}

/**
 * Safe parse result type for provider config.
 */
export type SafeProviderConfigResult = ReturnType<typeof ProviderConfigSchema.safeParse>;

/**
 * Safe parse result type for infrastructure config.
 */
export type SafeInfrastructureConfigResult = ReturnType<typeof InfrastructureConfigSchema.safeParse>;

/**
 * Safely validate without throwing (returns result object).
 */
export function safeValidateProviderConfig(config: unknown): SafeProviderConfigResult {
  return ProviderConfigSchema.safeParse(config);
}

/**
 * Safely validate infrastructure config without throwing.
 */
export function safeValidateInfrastructureConfig(config: unknown): SafeInfrastructureConfigResult {
  return InfrastructureConfigSchema.safeParse(config);
}

/**
 * Check if a config object looks like legacy Proxmox format (no 'type' field).
 */
export function isLegacyFormat(config: unknown): boolean {
  if (!Array.isArray(config) || config.length === 0) {
    return false;
  }
  // Check first item - if it has no 'type' but has 'url' and 'tokenId', it's legacy
  const first = config[0];
  return (
    typeof first === 'object' &&
    first !== null &&
    'url' in first &&
    'tokenId' in first &&
    !('type' in first)
  );
}

/**
 * Convert legacy Proxmox config to new unified format.
 */
export function convertLegacyConfig(legacyConfig: LegacyProxmoxConfigSchemaType[]): ProviderConfigSchemaType[] {
  return legacyConfig.map((config) => ({
    ...config,
    type: 'proxmox' as const,
    enabled: true,
  }));
}
