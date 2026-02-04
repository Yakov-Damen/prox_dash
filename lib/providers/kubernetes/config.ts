import { z } from 'zod';
import { BaseProviderConfig, BaseProviderConfigSchema } from '../types';

// ============================================================================
// Kubernetes Provider Configuration
// ============================================================================

export interface KubernetesClusterConfig extends BaseProviderConfig {
  type: 'kubernetes';
  kubeConfigPath?: string;      // Path to kubeconfig file
  kubeConfigContext?: string;   // Context name to use
  inCluster?: boolean;          // Use in-cluster config
  namespace?: string;           // Default namespace filter (undefined = all namespaces)
}

export const KubernetesClusterConfigSchema = BaseProviderConfigSchema.extend({
  type: z.literal('kubernetes'),
  kubeConfigPath: z.string().optional(),
  kubeConfigContext: z.string().optional(),
  inCluster: z.boolean().optional().default(false),
  namespace: z.string().optional(),
});

// ============================================================================
// Configuration Validation
// ============================================================================

export function validateKubernetesConfig(config: unknown): KubernetesClusterConfig {
  return KubernetesClusterConfigSchema.parse(config) as KubernetesClusterConfig;
}

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Determines the effective context name for display purposes.
 * Uses the configured context name, or generates one from the config path.
 */
export function getEffectiveContextName(config: KubernetesClusterConfig): string {
  if (config.kubeConfigContext) {
    return config.kubeConfigContext;
  }
  if (config.inCluster) {
    return 'in-cluster';
  }
  return config.name;
}
