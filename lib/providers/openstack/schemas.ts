import { z } from 'zod';

// ============================================================================
// OpenStack Server (Instance) Schemas
// ============================================================================

/**
 * OpenStack server status values
 */
export const OpenStackServerStatus = [
  'ACTIVE',
  'BUILD',
  'DELETED',
  'ERROR',
  'HARD_REBOOT',
  'MIGRATING',
  'PASSWORD',
  'PAUSED',
  'REBOOT',
  'REBUILD',
  'RESCUE',
  'RESIZE',
  'REVERT_RESIZE',
  'SHELVED',
  'SHELVED_OFFLOADED',
  'SHUTOFF',
  'SOFT_DELETED',
  'SUSPENDED',
  'UNKNOWN',
  'VERIFY_RESIZE',
] as const;

export type OpenStackServerStatusType = (typeof OpenStackServerStatus)[number];

const ServerAddressSchema = z.object({
  addr: z.string(),
  version: z.number(),
  'OS-EXT-IPS:type': z.string().optional(),
  'OS-EXT-IPS-MAC:mac_addr': z.string().optional(),
});

const ServerFaultSchema = z.object({
  code: z.number(),
  created: z.string(),
  message: z.string(),
  details: z.string().optional(),
});

export const OpenStackServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(), // Will validate against OpenStackServerStatus
  tenant_id: z.string().optional(),
  user_id: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  addresses: z.record(z.array(ServerAddressSchema)).optional(),
  flavor: z.union([
    z.object({
      id: z.string(),
      links: z.array(z.any()).optional(),
    }),
    z.object({
      original_name: z.string().optional(),
      vcpus: z.number().optional(),
      ram: z.number().optional(),
      disk: z.number().optional(),
      ephemeral: z.number().optional(),
      swap: z.number().optional(),
    }),
  ]).optional(),
  image: z.union([
    z.object({
      id: z.string(),
      links: z.array(z.any()).optional(),
    }),
    z.string(),
    z.null(),
  ]).optional(),
  key_name: z.string().nullable().optional(),
  metadata: z.record(z.string()).optional(),
  'OS-EXT-AZ:availability_zone': z.string().optional(),
  'OS-EXT-SRV-ATTR:host': z.string().nullable().optional(),
  'OS-EXT-SRV-ATTR:hypervisor_hostname': z.string().nullable().optional(),
  'OS-EXT-SRV-ATTR:instance_name': z.string().optional(),
  'OS-EXT-STS:power_state': z.number().optional(),
  'OS-EXT-STS:task_state': z.string().nullable().optional(),
  'OS-EXT-STS:vm_state': z.string().optional(),
  'OS-SRV-USG:launched_at': z.string().nullable().optional(),
  'OS-SRV-USG:terminated_at': z.string().nullable().optional(),
  fault: ServerFaultSchema.optional(),
  hostId: z.string().optional(),
  progress: z.number().optional(),
  'os-extended-volumes:volumes_attached': z.array(z.object({
    id: z.string(),
    delete_on_termination: z.boolean().optional(),
  })).optional(),
  config_drive: z.string().optional(),
  accessIPv4: z.string().optional(),
  accessIPv6: z.string().optional(),
  security_groups: z.array(z.object({ name: z.string() })).optional(),
});

export type OpenStackServer = z.infer<typeof OpenStackServerSchema>;

export const OpenStackServersResponseSchema = z.object({
  servers: z.array(OpenStackServerSchema),
});

export const OpenStackServerDetailResponseSchema = z.object({
  server: OpenStackServerSchema,
});

// ============================================================================
// OpenStack Flavor Schemas
// ============================================================================

export const OpenStackFlavorSchema = z.object({
  id: z.string(),
  name: z.string(),
  vcpus: z.number(),
  ram: z.number(), // MB
  disk: z.number(), // GB
  ephemeral: z.number().optional(),
  swap: z.union([z.number(), z.string()]).optional(), // Can be "" or number
  'OS-FLV-DISABLED:disabled': z.boolean().optional(),
  'OS-FLV-EXT-DATA:ephemeral': z.number().optional(),
  'os-flavor-access:is_public': z.boolean().optional(),
  rxtx_factor: z.number().optional(),
  description: z.string().nullable().optional(),
});

export type OpenStackFlavor = z.infer<typeof OpenStackFlavorSchema>;

export const OpenStackFlavorsResponseSchema = z.object({
  flavors: z.array(OpenStackFlavorSchema),
});

export const OpenStackFlavorDetailResponseSchema = z.object({
  flavor: OpenStackFlavorSchema,
});

// ============================================================================
// OpenStack Hypervisor Schemas (Admin only)
// ============================================================================

export const OpenStackHypervisorSchema = z.object({
  id: z.union([z.string(), z.number()]),
  hypervisor_hostname: z.string(),
  hypervisor_type: z.string().optional(),
  hypervisor_version: z.number().optional(),
  state: z.string(), // 'up' or 'down'
  status: z.string(), // 'enabled' or 'disabled'
  host_ip: z.string().optional(),
  running_vms: z.number().optional(),
  current_workload: z.number().optional(),
  vcpus: z.number().optional(),
  vcpus_used: z.number().optional(),
  memory_mb: z.number().optional(),
  memory_mb_used: z.number().optional(),
  free_ram_mb: z.number().optional(),
  local_gb: z.number().optional(),
  local_gb_used: z.number().optional(),
  free_disk_gb: z.number().optional(),
  disk_available_least: z.number().nullable().optional(),
  cpu_info: z.union([z.string(), z.object({}).passthrough()]).optional(),
  service: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    host: z.string().optional(),
    disabled_reason: z.string().nullable().optional(),
  }).optional(),
  servers: z.array(z.object({
    uuid: z.string(),
    name: z.string(),
  })).optional(),
});

export type OpenStackHypervisor = z.infer<typeof OpenStackHypervisorSchema>;

export const OpenStackHypervisorsResponseSchema = z.object({
  hypervisors: z.array(OpenStackHypervisorSchema),
});

export const OpenStackHypervisorDetailResponseSchema = z.object({
  hypervisor: OpenStackHypervisorSchema,
});

// ============================================================================
// OpenStack Limits Schemas
// ============================================================================

export const OpenStackLimitsSchema = z.object({
  limits: z.object({
    rate: z.array(z.any()).optional(),
    absolute: z.object({
      maxServerMeta: z.number().optional(),
      maxPersonality: z.number().optional(),
      maxPersonalitySize: z.number().optional(),
      maxTotalRAMSize: z.number().optional(),
      maxTotalInstances: z.number().optional(),
      maxTotalCores: z.number().optional(),
      maxTotalKeypairs: z.number().optional(),
      maxSecurityGroups: z.number().optional(),
      maxSecurityGroupRules: z.number().optional(),
      maxServerGroups: z.number().optional(),
      maxServerGroupMembers: z.number().optional(),
      totalRAMUsed: z.number().optional(),
      totalCoresUsed: z.number().optional(),
      totalInstancesUsed: z.number().optional(),
      totalFloatingIpsUsed: z.number().optional(),
      totalSecurityGroupsUsed: z.number().optional(),
      totalServerGroupsUsed: z.number().optional(),
    }),
  }),
});

export type OpenStackLimits = z.infer<typeof OpenStackLimitsSchema>;

// ============================================================================
// OpenStack Availability Zone Schemas
// ============================================================================

export const OpenStackAvailabilityZoneSchema = z.object({
  zoneName: z.string(),
  zoneState: z.object({
    available: z.boolean(),
  }),
  hosts: z.record(z.record(z.object({
    available: z.boolean(),
    active: z.boolean(),
    updated_at: z.string().nullable().optional(),
  }))).nullable().optional(),
});

export type OpenStackAvailabilityZone = z.infer<typeof OpenStackAvailabilityZoneSchema>;

export const OpenStackAvailabilityZonesResponseSchema = z.object({
  availabilityZoneInfo: z.array(OpenStackAvailabilityZoneSchema),
});

// ============================================================================
// OpenStack Server Diagnostics Schemas (Admin only)
// ============================================================================

export const OpenStackServerDiagnosticsSchema = z.object({
  // CPU
  cpu0_time: z.number().optional(),
  cpu1_time: z.number().optional(),
  cpu2_time: z.number().optional(),
  cpu3_time: z.number().optional(),
  // Memory
  memory: z.number().optional(),
  memory_actual: z.number().optional(),
  memory_rss: z.number().optional(),
  memory_swap_in: z.number().optional(),
  memory_swap_out: z.number().optional(),
  // Disk
  vda_read: z.number().optional(),
  vda_read_req: z.number().optional(),
  vda_write: z.number().optional(),
  vda_write_req: z.number().optional(),
  vda_errors: z.number().optional(),
  // Network
  tap_rx: z.number().optional(),
  tap_rx_drop: z.number().optional(),
  tap_rx_errors: z.number().optional(),
  tap_rx_packets: z.number().optional(),
  tap_tx: z.number().optional(),
  tap_tx_drop: z.number().optional(),
  tap_tx_errors: z.number().optional(),
  tap_tx_packets: z.number().optional(),
  // Generic passthrough for other metrics
}).passthrough();

export type OpenStackServerDiagnostics = z.infer<typeof OpenStackServerDiagnosticsSchema>;

// ============================================================================
// OpenStack API Version Schemas
// ============================================================================

export const OpenStackVersionSchema = z.object({
  id: z.string(),
  status: z.string(),
  version: z.string().optional(),
  min_version: z.string().optional(),
  updated: z.string().optional(),
  links: z.array(z.object({
    rel: z.string(),
    href: z.string(),
  })).optional(),
});

export const OpenStackVersionsResponseSchema = z.object({
  versions: z.array(OpenStackVersionSchema),
});

// ============================================================================
// Power State Mapping
// ============================================================================

export const POWER_STATE = {
  0: 'NOSTATE',
  1: 'RUNNING',
  3: 'PAUSED',
  4: 'SHUTDOWN',
  6: 'CRASHED',
  7: 'SUSPENDED',
} as const;

export function getPowerStateName(state: number): string {
  return POWER_STATE[state as keyof typeof POWER_STATE] || 'UNKNOWN';
}
