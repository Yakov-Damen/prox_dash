import { z } from 'zod';
import { BaseProviderConfig, BaseProviderConfigSchema } from '../types';

// ============================================================================
// OpenStack Cluster Configuration
// ============================================================================

export interface OpenStackClusterConfig extends BaseProviderConfig {
  type: 'openstack';
  authUrl: string;                      // Keystone auth URL (e.g., https://openstack.example.com:5000/v3)
  region?: string;                      // Region name
  projectName: string;                  // Project/tenant name
  projectDomainName?: string;           // Project domain (default: 'Default')
  userDomainName?: string;              // User domain (default: 'Default')

  // Password authentication
  username?: string;                    // Username for password auth
  password?: string;                    // Password for password auth

  // Application credential authentication
  applicationCredentialId?: string;     // App credential ID
  applicationCredentialSecret?: string; // App credential secret
}

// ============================================================================
// Zod Schema for Validation
// ============================================================================

export const OpenStackClusterConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal('openstack'),
  authUrl: z.string().url('authUrl must be a valid URL'),
  region: z.string().optional(),
  projectName: z.string().min(1, 'projectName is required'),
  projectDomainName: z.string().optional().default('Default'),
  userDomainName: z.string().optional().default('Default'),

  // Password authentication fields
  username: z.string().optional(),
  password: z.string().optional(),

  // Application credential fields
  applicationCredentialId: z.string().optional(),
  applicationCredentialSecret: z.string().optional(),
}).refine(
  (data) => {
    // Must have either password auth or application credential auth
    const hasPasswordAuth = data.username && data.password;
    const hasAppCredAuth = data.applicationCredentialId && data.applicationCredentialSecret;
    return hasPasswordAuth || hasAppCredAuth;
  },
  {
    message: 'Either username/password or applicationCredentialId/applicationCredentialSecret must be provided',
  }
).refine(
  (data) => {
    // Can't have both auth methods (to avoid confusion)
    const hasPasswordAuth = data.username && data.password;
    const hasAppCredAuth = data.applicationCredentialId && data.applicationCredentialSecret;
    return !(hasPasswordAuth && hasAppCredAuth);
  },
  {
    message: 'Cannot use both password auth and application credentials simultaneously',
  }
);

// ============================================================================
// Helper Functions
// ============================================================================

export function validateOpenStackConfig(config: unknown): OpenStackClusterConfig {
  return OpenStackClusterConfigSchema.parse(config) as OpenStackClusterConfig;
}

export function isPasswordAuth(config: OpenStackClusterConfig): boolean {
  return !!(config.username && config.password);
}

export function isAppCredAuth(config: OpenStackClusterConfig): boolean {
  return !!(config.applicationCredentialId && config.applicationCredentialSecret);
}

// ============================================================================
// Default Values
// ============================================================================

export const OPENSTACK_DEFAULTS = {
  projectDomainName: 'Default',
  userDomainName: 'Default',
  region: 'RegionOne',
} as const;
