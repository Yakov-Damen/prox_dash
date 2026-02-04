import { z } from 'zod';
import { BaseProviderConfig, BaseProviderConfigSchema } from '../types';

// ============================================================================
// Proxmox Cluster Configuration
// ============================================================================

/**
 * Configuration for a Proxmox cluster connection
 */
export interface ProxmoxClusterConfig extends BaseProviderConfig {
  type: 'proxmox';
  url: string;
  tokenId: string;
  tokenSecret: string;
  allowInsecure?: boolean;
}

/**
 * Zod schema for validating Proxmox cluster configuration
 */
export const ProxmoxClusterConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal('proxmox'),
  url: z.string().url('Invalid Proxmox URL'),
  tokenId: z.string().min(1, 'Token ID is required'),
  tokenSecret: z.string().min(1, 'Token secret is required'),
  allowInsecure: z.boolean().optional().default(false),
});

/**
 * Schema for validating legacy config format (without type field)
 * Used for backward compatibility with existing proxmox_config.json files
 */
export const LegacyProxmoxConfigSchema = z.object({
  name: z.string(),
  url: z.string(),
  tokenId: z.string(),
  tokenSecret: z.string(),
  allowInsecure: z.boolean().optional().default(false),
});

export type LegacyProxmoxConfig = z.infer<typeof LegacyProxmoxConfigSchema>;

/**
 * Convert a legacy config to the new format
 */
export function convertLegacyConfig(legacy: LegacyProxmoxConfig): ProxmoxClusterConfig {
  return {
    ...legacy,
    type: 'proxmox',
    enabled: true,
  };
}

/**
 * Validate and parse a Proxmox cluster configuration
 */
export function parseProxmoxConfig(config: unknown): ProxmoxClusterConfig {
  // Try new format first
  const newResult = ProxmoxClusterConfigSchema.safeParse(config);
  if (newResult.success) {
    return newResult.data;
  }

  // Fall back to legacy format
  const legacyResult = LegacyProxmoxConfigSchema.safeParse(config);
  if (legacyResult.success) {
    return convertLegacyConfig(legacyResult.data);
  }

  // If both fail, throw the new format error
  throw new Error(`Invalid Proxmox config: ${newResult.error.message}`);
}
