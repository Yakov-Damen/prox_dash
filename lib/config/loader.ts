import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ProviderType } from '../providers/types';
import {
  ProviderConfig,
  InfrastructureConfig,
  ProxmoxConfig,
  KubernetesConfig,
  OpenStackConfig,
} from './types';
import {
  InfrastructureConfigSchema,
  LegacyInfrastructureConfigSchema,
  isLegacyFormat,
  convertLegacyConfig,
} from './schemas';
import { logger } from '../logger';

// ============================================================================
// Configuration File Paths
// ============================================================================

const CONFIG_DIR = process.cwd();
const NEW_CONFIG_FILE = 'infrastructure_config.json';
const LEGACY_CONFIG_FILE = 'proxmox_config.json';

// ============================================================================
// Configuration Cache
// ============================================================================

let cachedConfig: InfrastructureConfig | null = null;
let configLoadedAt: number | null = null;

// Cache TTL in milliseconds (5 minutes)
const CONFIG_CACHE_TTL = 5 * 60 * 1000;

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Load and parse the infrastructure configuration from file.
 * Supports both new unified format and legacy Proxmox-only format.
 *
 * File priority:
 * 1. infrastructure_config.json (new unified format)
 * 2. proxmox_config.json (legacy format, auto-converted)
 */
export function loadConfig(forceReload = false): InfrastructureConfig {
  // Return cached config if valid and not forcing reload
  if (!forceReload && cachedConfig && configLoadedAt) {
    const now = Date.now();
    if (now - configLoadedAt < CONFIG_CACHE_TTL) {
      return cachedConfig;
    }
  }

  const newConfigPath = join(CONFIG_DIR, NEW_CONFIG_FILE);
  const legacyConfigPath = join(CONFIG_DIR, LEGACY_CONFIG_FILE);

  let configPath: string;
  let isLegacy = false;

  // Check which config file exists
  if (existsSync(newConfigPath)) {
    configPath = newConfigPath;
    logger.info({ path: newConfigPath }, 'Loading infrastructure config from new unified format');
  } else if (existsSync(legacyConfigPath)) {
    configPath = legacyConfigPath;
    isLegacy = true;
    logger.info({ path: legacyConfigPath }, 'Loading infrastructure config from legacy Proxmox format');
  } else {
    logger.warn(
      { newConfigPath, legacyConfigPath },
      'No configuration file found. Please create infrastructure_config.json or proxmox_config.json'
    );
    cachedConfig = [];
    configLoadedAt = Date.now();
    return cachedConfig;
  }

  try {
    const fileContents = readFileSync(configPath, 'utf-8');
    const rawConfig = JSON.parse(fileContents);

    let validatedConfig: InfrastructureConfig;

    // Auto-detect legacy format even in new config file
    if (isLegacy || isLegacyFormat(rawConfig)) {
      logger.info('Detected legacy Proxmox config format, converting to unified format');
      const legacyParsed = LegacyInfrastructureConfigSchema.parse(rawConfig);
      validatedConfig = convertLegacyConfig(legacyParsed) as InfrastructureConfig;
    } else {
      validatedConfig = InfrastructureConfigSchema.parse(rawConfig);
    }

    // Filter out disabled providers
    const enabledConfig = validatedConfig.filter((config) => config.enabled !== false);

    logger.info(
      {
        total: validatedConfig.length,
        enabled: enabledConfig.length,
        providers: enabledConfig.map((c) => ({ name: c.name, type: c.type })),
      },
      'Infrastructure configuration loaded successfully'
    );

    cachedConfig = enabledConfig;
    configLoadedAt = Date.now();
    return cachedConfig;
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.error({ path: configPath, error: error.message }, 'Invalid JSON in configuration file');
      throw new Error(`Invalid JSON in configuration file ${configPath}: ${error.message}`);
    }
    if (error instanceof Error && error.name === 'ZodError') {
      logger.error({ path: configPath, error }, 'Configuration validation failed');
      throw new Error(`Configuration validation failed for ${configPath}: ${error.message}`);
    }
    throw error;
  }
}

// ============================================================================
// Configuration Accessors
// ============================================================================

/**
 * Get all provider configurations.
 */
export function getProviderConfigs(): ProviderConfig[] {
  return loadConfig();
}

/**
 * Get provider configurations filtered by type.
 */
export function getProviderConfigsByType<T extends ProviderType>(
  type: T
): Array<
  T extends 'proxmox'
    ? ProxmoxConfig
    : T extends 'kubernetes'
    ? KubernetesConfig
    : T extends 'openstack'
    ? OpenStackConfig
    : ProviderConfig
> {
  const configs = loadConfig();
  return configs.filter((config) => config.type === type) as Array<
    T extends 'proxmox'
      ? ProxmoxConfig
      : T extends 'kubernetes'
      ? KubernetesConfig
      : T extends 'openstack'
      ? OpenStackConfig
      : ProviderConfig
  >;
}

/**
 * Get a specific provider configuration by name.
 */
export function getProviderConfigByName(name: string): ProviderConfig | undefined {
  const configs = loadConfig();
  return configs.find((config) => config.name === name);
}

/**
 * Get all Proxmox configurations (typed helper).
 */
export function getProxmoxConfigs(): ProxmoxConfig[] {
  return getProviderConfigsByType('proxmox');
}

/**
 * Get all Kubernetes configurations (typed helper).
 */
export function getKubernetesConfigs(): KubernetesConfig[] {
  return getProviderConfigsByType('kubernetes');
}

/**
 * Get all OpenStack configurations (typed helper).
 */
export function getOpenStackConfigs(): OpenStackConfig[] {
  return getProviderConfigsByType('openstack');
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the configuration cache, forcing a reload on next access.
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  configLoadedAt = null;
  logger.debug('Configuration cache cleared');
}

/**
 * Get the current cache status.
 */
export function getConfigCacheStatus(): {
  cached: boolean;
  loadedAt: Date | null;
  expiresAt: Date | null;
  count: number;
} {
  return {
    cached: cachedConfig !== null,
    loadedAt: configLoadedAt ? new Date(configLoadedAt) : null,
    expiresAt: configLoadedAt ? new Date(configLoadedAt + CONFIG_CACHE_TTL) : null,
    count: cachedConfig?.length ?? 0,
  };
}

// ============================================================================
// Configuration Statistics
// ============================================================================

/**
 * Get a summary of the current configuration.
 */
export function getConfigSummary(): {
  total: number;
  byType: Record<ProviderType, number>;
  providers: Array<{ name: string; type: ProviderType; enabled: boolean }>;
} {
  const configs = loadConfig();
  const byType: Record<ProviderType, number> = {
    proxmox: 0,
    kubernetes: 0,
    openstack: 0,
  };

  configs.forEach((config) => {
    byType[config.type]++;
  });

  return {
    total: configs.length,
    byType,
    providers: configs.map((c) => ({
      name: c.name,
      type: c.type,
      enabled: c.enabled !== false,
    })),
  };
}
