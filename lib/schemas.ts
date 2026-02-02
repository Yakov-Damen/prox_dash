import { z } from 'zod';

export const NodeStatusSchema = z.object({
  id: z.string().optional(),
  node: z.string(),
  status: z.enum(['online', 'offline', 'unknown']),
  cpu: z.number().optional().default(0),
  maxcpu: z.number().optional().default(0),
  mem: z.number().optional().default(0),
  maxmem: z.number().optional().default(0),
  uptime: z.number().optional().default(0),
  disk: z.number().optional().default(0),
  maxdisk: z.number().optional().default(0),
  // Detailed status fields
  cpuModel: z.string().optional(),
  cpuSockets: z.number().optional(),
  cpuCores: z.number().optional(),
  kernelVersion: z.string().optional(),
  manufacturer: z.string().optional(),
  productName: z.string().optional(),
});

export const ClusterStatusSchema = z.object({
  name: z.string(),
  nodes: z.array(NodeStatusSchema),
  error: z.string().optional(),
  version: z.string().optional(),
});

export const VMStatusSchema = z.object({
  vmid: z.coerce.number(), // coerce because string IDs sometimes happen
  name: z.string(),
  status: z.enum(['running', 'stopped', 'paused']),
  cpus: z.number().optional().default(0),
  cpuUsage: z.number().optional(),
  maxmem: z.number().optional().default(0),
  mem: z.number().optional().default(0),
  uptime: z.number().optional().default(0),
  type: z.enum(['qemu', 'lxc']),
});

// Response Wrappers for Proxmox API
export const ProxmoxNodeListResponseSchema = z.object({
  data: z.array(z.object({
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
  }))
});

export const ProxmoxVersionResponseSchema = z.object({
  data: z.object({
    version: z.string(),
    release: z.string(),
    repoid: z.string(),
  })
});

export const ProxmoxNodeStatusResponseSchema = z.object({
  data: z.object({
    cpu: z.number().optional(),
    memory: z.object({
      total: z.number(),
      used: z.number(),
      free: z.number(),
    }).optional(),
    rootfs: z.object({
        total: z.number(),
        used: z.number(),
        free: z.number(),
    }).optional(),
    uptime: z.number().optional(),
    cpuinfo: z.object({
        model: z.string(),
        sockets: z.number(),
        cores: z.number(),
    }).optional(),
    kversion: z.string().optional(),
  })
});

export const ProxmoxVMListResponseSchema = z.object({
    data: z.array(z.object({
        vmid: z.coerce.number(),
        name: z.string(),
        status: z.string(), // We coerce to enum later or validate loosely first
        cpus: z.number().optional(),
        maxmem: z.number().optional(),
        mem: z.number().optional(),
        uptime: z.number().optional(),
    }))
});
