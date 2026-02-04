import { z } from 'zod';

// ============================================================================
// Proxmox API Response Schemas
// ============================================================================

/**
 * Schema for a single node in the Proxmox node list API response
 */
export const ProxmoxNodeListItemSchema = z.object({
  id: z.string().optional(),
  node: z.string(),
  status: z.enum(['online', 'offline', 'unknown']),
  cpu: z.number().optional(),
  maxcpu: z.number().optional(),
  mem: z.number().optional(),
  maxmem: z.number().optional(),
  uptime: z.number().optional(),
  disk: z.number().optional(),
  maxdisk: z.number().optional(),
});

/**
 * Schema for Proxmox /api2/json/nodes response
 */
export const ProxmoxNodeListResponseSchema = z.object({
  data: z.array(ProxmoxNodeListItemSchema),
});

export type ProxmoxNodeListResponse = z.infer<typeof ProxmoxNodeListResponseSchema>;
export type ProxmoxNodeListItem = z.infer<typeof ProxmoxNodeListItemSchema>;

/**
 * Schema for Proxmox /api2/json/version response
 */
export const ProxmoxVersionResponseSchema = z.object({
  data: z.object({
    version: z.string(),
    release: z.string(),
    repoid: z.string(),
  }),
});

export type ProxmoxVersionResponse = z.infer<typeof ProxmoxVersionResponseSchema>;

/**
 * Schema for CPU info in node status
 */
export const ProxmoxCpuInfoSchema = z.object({
  model: z.string(),
  sockets: z.number(),
  cores: z.number(),
});

/**
 * Schema for memory/disk info in node status
 */
export const ProxmoxMemoryInfoSchema = z.object({
  total: z.number(),
  used: z.number(),
  free: z.number(),
});

/**
 * Schema for Proxmox /api2/json/nodes/{node}/status response
 */
export const ProxmoxNodeStatusResponseSchema = z.object({
  data: z.object({
    cpu: z.number().optional(),
    memory: ProxmoxMemoryInfoSchema.optional(),
    rootfs: ProxmoxMemoryInfoSchema.optional(),
    uptime: z.number().optional(),
    cpuinfo: ProxmoxCpuInfoSchema.optional(),
    kversion: z.string().optional(),
  }),
});

export type ProxmoxNodeStatusResponse = z.infer<typeof ProxmoxNodeStatusResponseSchema>;

/**
 * Schema for a single VM/container in the list response
 */
export const ProxmoxVMListItemSchema = z.object({
  vmid: z.coerce.number(),
  name: z.string(),
  status: z.string(), // We coerce to enum later
  cpus: z.number().optional(),
  maxmem: z.number().optional(),
  mem: z.number().optional(),
  uptime: z.number().optional(),
});

/**
 * Schema for Proxmox /api2/json/nodes/{node}/qemu or /lxc response
 */
export const ProxmoxVMListResponseSchema = z.object({
  data: z.array(ProxmoxVMListItemSchema),
});

export type ProxmoxVMListResponse = z.infer<typeof ProxmoxVMListResponseSchema>;
export type ProxmoxVMListItem = z.infer<typeof ProxmoxVMListItemSchema>;

/**
 * Schema for detailed VM status response
 * Used for /api2/json/nodes/{node}/{type}/{vmid}/status/current
 */
export const ProxmoxVMStatusResponseSchema = z.object({
  data: z.object({
    cpu: z.number().optional(),
    mem: z.number().optional(),
    maxmem: z.number().optional(),
    uptime: z.number().optional(),
    status: z.string().optional(),
  }),
});

export type ProxmoxVMStatusResponse = z.infer<typeof ProxmoxVMStatusResponseSchema>;
