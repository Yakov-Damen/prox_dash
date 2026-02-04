import { z } from 'zod';
import { OpenStackClusterConfig, isPasswordAuth, isAppCredAuth, OPENSTACK_DEFAULTS } from './config';

// ============================================================================
// Keystone Token Response Types
// ============================================================================

export interface ServiceEndpoint {
  region_id: string;
  url: string;
  interface: 'public' | 'internal' | 'admin';
  id: string;
}

export interface ServiceCatalogEntry {
  type: string;
  name: string;
  id: string;
  endpoints: ServiceEndpoint[];
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
  catalog: ServiceCatalogEntry[];
  projectId: string;
  userId: string;
  roles: Array<{ id: string; name: string }>;
}

// ============================================================================
// Keystone API Response Schemas
// ============================================================================

const KeystoneEndpointSchema = z.object({
  region_id: z.string(),
  url: z.string(),
  interface: z.enum(['public', 'internal', 'admin']),
  id: z.string(),
});

const KeystoneCatalogEntrySchema = z.object({
  type: z.string(),
  name: z.string(),
  id: z.string(),
  endpoints: z.array(KeystoneEndpointSchema),
});

const KeystoneTokenResponseSchema = z.object({
  token: z.object({
    expires_at: z.string(),
    catalog: z.array(KeystoneCatalogEntrySchema).optional(),
    project: z.object({
      id: z.string(),
      name: z.string(),
      domain: z.object({ id: z.string(), name: z.string() }).optional(),
    }).optional(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      domain: z.object({ id: z.string(), name: z.string() }).optional(),
    }),
    roles: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  }),
});

// ============================================================================
// Token Cache
// ============================================================================

interface CachedToken {
  token: AuthToken;
  cachedAt: Date;
}

// Token cache by config key
const tokenCache = new Map<string, CachedToken>();

// Buffer time before expiry to refresh token (5 minutes)
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

function getCacheKey(config: OpenStackClusterConfig): string {
  // Create a unique key based on auth parameters
  if (isAppCredAuth(config)) {
    return `openstack:${config.authUrl}:appcred:${config.applicationCredentialId}`;
  }
  return `openstack:${config.authUrl}:password:${config.username}:${config.projectName}`;
}

function isTokenValid(cached: CachedToken): boolean {
  const now = new Date();
  const bufferExpiresAt = new Date(cached.token.expiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS);
  return now < bufferExpiresAt;
}

// ============================================================================
// Authentication Functions
// ============================================================================

function buildPasswordAuthPayload(config: OpenStackClusterConfig): object {
  return {
    auth: {
      identity: {
        methods: ['password'],
        password: {
          user: {
            name: config.username,
            password: config.password,
            domain: {
              name: config.userDomainName || OPENSTACK_DEFAULTS.userDomainName,
            },
          },
        },
      },
      scope: {
        project: {
          name: config.projectName,
          domain: {
            name: config.projectDomainName || OPENSTACK_DEFAULTS.projectDomainName,
          },
        },
      },
    },
  };
}

function buildAppCredAuthPayload(config: OpenStackClusterConfig): object {
  return {
    auth: {
      identity: {
        methods: ['application_credential'],
        application_credential: {
          id: config.applicationCredentialId,
          secret: config.applicationCredentialSecret,
        },
      },
    },
  };
}

async function requestToken(config: OpenStackClusterConfig): Promise<AuthToken> {
  const authUrl = config.authUrl.replace(/\/+$/, '');
  const tokenUrl = `${authUrl}/auth/tokens`;

  const payload = isPasswordAuth(config)
    ? buildPasswordAuthPayload(config)
    : buildAppCredAuthPayload(config);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Keystone authentication failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  // Get token from X-Subject-Token header
  const subjectToken = response.headers.get('X-Subject-Token');
  if (!subjectToken) {
    throw new Error('Keystone response missing X-Subject-Token header');
  }

  const body = await response.json();
  const parsed = KeystoneTokenResponseSchema.parse(body);

  return {
    token: subjectToken,
    expiresAt: new Date(parsed.token.expires_at),
    catalog: parsed.token.catalog || [],
    projectId: parsed.token.project?.id || '',
    userId: parsed.token.user.id,
    roles: parsed.token.roles || [],
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get an authentication token for OpenStack.
 * Uses caching with automatic refresh before expiry.
 */
export async function getAuthToken(config: OpenStackClusterConfig): Promise<AuthToken> {
  const cacheKey = getCacheKey(config);
  const cached = tokenCache.get(cacheKey);

  // Return cached token if still valid
  if (cached && isTokenValid(cached)) {
    return cached.token;
  }

  // Request new token
  const token = await requestToken(config);

  // Cache the token
  tokenCache.set(cacheKey, {
    token,
    cachedAt: new Date(),
  });

  return token;
}

/**
 * Force refresh the token, bypassing cache.
 */
export async function refreshToken(config: OpenStackClusterConfig): Promise<AuthToken> {
  const cacheKey = getCacheKey(config);
  tokenCache.delete(cacheKey);
  return getAuthToken(config);
}

/**
 * Clear all cached tokens for a specific config.
 */
export function clearTokenCache(config: OpenStackClusterConfig): void {
  const cacheKey = getCacheKey(config);
  tokenCache.delete(cacheKey);
}

/**
 * Clear entire token cache.
 */
export function clearAllTokenCache(): void {
  tokenCache.clear();
}

/**
 * Get service endpoint URL from the service catalog.
 */
export function getServiceEndpoint(
  token: AuthToken,
  serviceType: string,
  endpointInterface: 'public' | 'internal' | 'admin' = 'public',
  region?: string
): string | null {
  const service = token.catalog.find((s) => s.type === serviceType);
  if (!service) {
    return null;
  }

  // Find matching endpoint
  const endpoint = service.endpoints.find((ep) => {
    const matchesInterface = ep.interface === endpointInterface;
    const matchesRegion = !region || ep.region_id === region;
    return matchesInterface && matchesRegion;
  });

  return endpoint?.url || null;
}

/**
 * Get Nova (compute) service endpoint.
 */
export function getNovaEndpoint(
  token: AuthToken,
  endpointInterface: 'public' | 'internal' | 'admin' = 'public',
  region?: string
): string | null {
  return getServiceEndpoint(token, 'compute', endpointInterface, region);
}

/**
 * Get Glance (image) service endpoint.
 */
export function getGlanceEndpoint(
  token: AuthToken,
  endpointInterface: 'public' | 'internal' | 'admin' = 'public',
  region?: string
): string | null {
  return getServiceEndpoint(token, 'image', endpointInterface, region);
}

/**
 * Get Neutron (network) service endpoint.
 */
export function getNeutronEndpoint(
  token: AuthToken,
  endpointInterface: 'public' | 'internal' | 'admin' = 'public',
  region?: string
): string | null {
  return getServiceEndpoint(token, 'network', endpointInterface, region);
}

/**
 * Check if the token has admin role.
 */
export function hasAdminRole(token: AuthToken): boolean {
  return token.roles.some((r) => r.name.toLowerCase() === 'admin');
}
