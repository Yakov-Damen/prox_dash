import fs from 'fs';
import path from 'path';
import https from 'https';
import fetch, { Response } from 'node-fetch';
import { logger } from '../../logger';
import {
  InfraProvider,
  ClusterStatus,
  NodeStatus,
  Workload,
  ClusterStorage,
  LegacyProxmoxNodeStatus,
  LegacyProxmoxVMStatus,
  convertProxmoxNodeToUnified,
  convertProxmoxVMToWorkload,
} from '../types';
import { ProxmoxClusterConfig, parseProxmoxConfig, LegacyProxmoxConfig } from './config';
import {
  ProxmoxNodeListResponseSchema,
  ProxmoxVersionResponseSchema,
  ProxmoxNodeStatusResponseSchema,
  ProxmoxVMListResponseSchema,
  ProxmoxVMStatusResponseSchema,
  ProxmoxCephStatusResponseSchema,
} from './schemas';

// ============================================================================
// Configuration Loading
// ============================================================================

const INVENTORY_PATH = path.join(process.cwd(), 'hardware_inventory.json');

interface HardwareInfo {
  manufacturer?: string;
  productName?: string;
}
let cachedInventory: Record<string, Record<string, HardwareInfo>> | null = null;

/**
 * Clear the inventory cache (useful for testing or hot-reloading)
 */
export function clearConfigCache(): void {
  cachedInventory = null;
}

/**
 * Load hardware inventory from file
 */
function getHardwareInventory(): Record<string, Record<string, HardwareInfo>> {
  if (cachedInventory) return cachedInventory;

  try {
    if (!fs.existsSync(INVENTORY_PATH)) return {};
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
    cachedInventory = inventory;
    return inventory;
  } catch (e: unknown) {
    logger.error({ err: e }, 'Failed to read hardware inventory');
    return {};
  }
}

// ============================================================================
// ProxmoxProvider Class
// ============================================================================

/**
 * Proxmox infrastructure provider implementation
 */
export class ProxmoxProvider implements InfraProvider {
  readonly type = 'proxmox' as const;
  readonly name: string;

  private config: ProxmoxClusterConfig;

  constructor(config: ProxmoxClusterConfig) {
    this.config = config;
    this.name = config.name;
  }

  /**
   * Make an authenticated request to the Proxmox API
   */
  private async fetchProxmox(url: string): Promise<Response> {
    const isHttps = url.toLowerCase().startsWith('https');
    const agent = isHttps
      ? new https.Agent({
          rejectUnauthorized: !this.config.allowInsecure,
        })
      : undefined;

    const headers: HeadersInit = {
      Authorization: `PVEAPIToken=${this.config.tokenId}=${this.config.tokenSecret}`,
    };

    const fetchOptions: Parameters<typeof fetch>[1] = {
      headers,
      agent,
    };

    return fetch(url, fetchOptions);
  }

  /**
   * Test connection to the Proxmox cluster
   */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    try {
      const url = `${this.config.url}/api2/json/version`;
      const res = await this.fetchProxmox(url);

      if (!res.ok) {
        return {
          ok: false,
          message: `API returned ${res.status}: ${res.statusText}`,
        };
      }

      const json = await res.json();
      const parsed = ProxmoxVersionResponseSchema.safeParse(json);

      if (!parsed.success) {
        return {
          ok: false,
          message: 'Invalid response format from Proxmox API',
        };
      }

      return {
        ok: true,
        message: `Connected to Proxmox ${parsed.data.data.version}`,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        ok: false,
        message: `Connection failed: ${err.message}`,
      };
    }
  }

  /**
   * Get all clusters (for Proxmox, this returns the single cluster this provider manages)
   */
  async getClusters(): Promise<ClusterStatus[]> {
    const cluster = await this.getCluster(this.config.name);
    return cluster ? [cluster] : [];
  }

  /**
   * Get a single cluster's status
   */
  async getCluster(name: string): Promise<ClusterStatus | null> {
    // This provider only manages its configured cluster
    if (name !== this.config.name) {
      return null;
    }

    try {
      const apiUrl = `${this.config.url}/api2/json/nodes`;
      const versionUrl = `${this.config.url}/api2/json/version`;

      logger.info(
        { cluster: this.config.name, url: this.config.url },
        'Starting cluster fetch'
      );
      const inventory = getHardwareInventory();

      const res = await this.fetchProxmox(apiUrl);
      if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();

      // Validate with Zod
      const parsed = ProxmoxNodeListResponseSchema.safeParse(json);
      if (!parsed.success) {
        logger.error(
          { err: parsed.error, cluster: this.config.name },
          'Invalid node list format from Proxmox'
        );
        throw new Error('Invalid response format from Proxmox API');
      }

      const data = parsed.data;

      // Fetch Version
      let version = '';
      try {
        const verRes = await this.fetchProxmox(versionUrl);
        if (verRes.ok) {
          const verJson = await verRes.json();
          const verParsed = ProxmoxVersionResponseSchema.safeParse(verJson);
          if (verParsed.success) {
            version = verParsed.data.data.version;
          }
        }
      } catch (e: unknown) {
        logger.warn(
          { err: e, cluster: this.config.name },
          'Failed to fetch cluster version'
        );
      }

      const legacyNodes: LegacyProxmoxNodeStatus[] = await Promise.all(
        data.data.map(async (node) => {
          const basicNode: LegacyProxmoxNodeStatus = {
            id: node.id || node.node,
            node: node.node,
            status: node.status,
            cpu: node.cpu || 0,
            maxcpu: node.maxcpu || 0,
            mem: node.mem || 0,
            maxmem: node.maxmem || 0,
            uptime: node.uptime || 0,
            disk: node.disk || 0,
            maxdisk: node.maxdisk || 0,
          };

          // Check inventory
          const inv =
            inventory[this.config.name]?.[node.node] || inventory[node.node];
          if (!inv) {
            logger.debug(
              { cluster: this.config.name, node: node.node },
              'No hardware inventory found for node'
            );
          }

          if (inv) {
            if (inv.manufacturer) basicNode.manufacturer = inv.manufacturer;
            if (inv.productName) basicNode.productName = inv.productName;
          }

          // If online, try to fetch detailed status
          if (node.status === 'online') {
            try {
              const detailUrl = `${this.config.url}/api2/json/nodes/${node.node}/status`;
              const detailRes = await this.fetchProxmox(detailUrl);

              if (detailRes.ok) {
                const detailJson = await detailRes.json();
                const dParsed =
                  ProxmoxNodeStatusResponseSchema.safeParse(detailJson);

                if (dParsed.success) {
                  const d = dParsed.data.data;

                  // Update with detailed metrics
                  basicNode.cpu = d.cpu || 0;
                  if (d.cpuinfo?.cores) {
                    basicNode.maxcpu = d.cpuinfo.cores;
                  }

                  if (d.memory) {
                    basicNode.mem = d.memory.used;
                    basicNode.maxmem = d.memory.total;
                  }

                  if (d.rootfs) {
                    basicNode.disk = d.rootfs.used;
                    basicNode.maxdisk = d.rootfs.total;
                  }

                  if (d.uptime) {
                    basicNode.uptime = d.uptime;
                  }

                  if (d.cpuinfo) {
                    basicNode.cpuModel = d.cpuinfo.model;
                    basicNode.cpuSockets = d.cpuinfo.sockets;
                    basicNode.cpuCores = d.cpuinfo.cores;
                  }
                  if (d.kversion) {
                    basicNode.kernelVersion = d.kversion.split(' #')[0];
                  }
                }
              }
            } catch (e: unknown) {
              logger.warn(
                { err: e, node: node.node },
                'Failed to fetch details for node'
              );
            }
          }
          return basicNode;
        })
      );

      // Sort nodes alphabetically
      legacyNodes.sort((a, b) =>
        a.node.localeCompare(b.node, undefined, { numeric: true })
      );

      // Convert to unified format
      const nodes: NodeStatus[] = legacyNodes.map((n) =>
        convertProxmoxNodeToUnified(n, this.config.name)
      );

      // Fetch Ceph Status
      let storage: ClusterStorage | undefined = undefined;
      try {
        const cephUrl = `${this.config.url}/api2/json/cluster/ceph/status`;
        const cephRes = await this.fetchProxmox(cephUrl);

        if (cephRes.ok) {
          const cephJson = await cephRes.json();
          const cephParsed = ProxmoxCephStatusResponseSchema.safeParse(cephJson);

          if (cephParsed.success) {
            const d = cephParsed.data.data;
            storage = {
              type: 'ceph',
              health: d.health.status,
            };

            if (d.pgmap) {
              storage.usage = {
                total: d.pgmap.bytes_total,
                used: d.pgmap.bytes_used,
                available: d.pgmap.bytes_avail,
              };
            }
          }
        }
      } catch (e: unknown) {
        // Ceph might not be installed, which returns 404 usually or just fails.
        // We log as debug to not spam errors if Ceph isn't present.
        logger.debug(
          { err: e, cluster: this.config.name },
          'Failed to fetch Ceph status (may not be installed)'
        );
      }

      logger.info(
        { cluster: this.config.name, nodeCount: nodes.length },
        'Successfully fetched cluster status'
      );

      return {
        name: this.config.name,
        provider: 'proxmox',
        nodes,
        version,
        storage,
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error({ err, cluster: this.config.name }, 'Failed to fetch cluster');
      return {
        name: this.config.name,
        provider: 'proxmox',
        nodes: [],
        error: err.message,
      };
    }
  }

  /**
   * Get a single node's detailed status
   */
  async getNode(clusterName: string, nodeName: string): Promise<NodeStatus | null> {
    // This provider only manages its configured cluster
    if (clusterName !== this.config.name) {
      return null;
    }

    try {
      logger.info(
        { cluster: this.config.name, node: nodeName },
        'Fetching single node status'
      );
      const inventory = getHardwareInventory();

      const url = `${this.config.url}/api2/json/nodes/${nodeName}/status`;
      const res = await this.fetchProxmox(url);

      if (!res.ok) {
        logger.warn(
          { cluster: this.config.name, node: nodeName, status: res.status },
          'Failed to fetch node status API'
        );
        return null;
      }

      const json = await res.json();
      const parsed = ProxmoxNodeStatusResponseSchema.safeParse(json);

      if (!parsed.success) {
        logger.warn(
          { cluster: this.config.name, node: nodeName, err: parsed.error },
          'Invalid node status format'
        );
        return null;
      }

      const d = parsed.data.data;

      const legacyNode: LegacyProxmoxNodeStatus = {
        id: `node/${this.config.name}/${nodeName}`,
        node: nodeName,
        status: 'online',
        cpu: d.cpu || 0,
        maxcpu: d.cpuinfo?.cores || 0,
        mem: d.memory?.used || 0,
        maxmem: d.memory?.total || 0,
        uptime: d.uptime || 0,
        disk: d.rootfs?.used || 0,
        maxdisk: d.rootfs?.total || 0,
        cpuModel: d.cpuinfo?.model,
        cpuSockets: d.cpuinfo?.sockets,
        cpuCores: d.cpuinfo?.cores,
        kernelVersion: d.kversion ? d.kversion.split(' #')[0] : undefined,
      };

      // Mix in inventory
      const inv =
        inventory[this.config.name]?.[nodeName] || inventory[nodeName];
      if (inv) {
        if (inv.manufacturer) legacyNode.manufacturer = inv.manufacturer;
        if (inv.productName) legacyNode.productName = inv.productName;
      }

      return convertProxmoxNodeToUnified(legacyNode, this.config.name);
    } catch (e: unknown) {
      logger.error(
        { err: e, cluster: this.config.name, node: nodeName },
        'Error fetching single node status'
      );
      return null;
    }
  }

  /**
   * Get workloads (VMs and containers) on a specific node
   */
  async getWorkloads(clusterName: string, nodeName: string): Promise<Workload[]> {
    // This provider only manages its configured cluster
    if (clusterName !== this.config.name) {
      return [];
    }

    try {
      logger.info(
        { node: nodeName, cluster: this.config.name },
        'Fetching VMs for node'
      );

      // Run in parallel
      const [qemuRes, lxcRes] = await Promise.all([
        this.fetchProxmox(`${this.config.url}/api2/json/nodes/${nodeName}/qemu`),
        this.fetchProxmox(`${this.config.url}/api2/json/nodes/${nodeName}/lxc`),
      ]);

      const processVMs = async (
        res: Response,
        type: 'qemu' | 'lxc'
      ): Promise<LegacyProxmoxVMStatus[]> => {
        if (!res.ok) return [];

        const json = await res.json();
        const parsed = ProxmoxVMListResponseSchema.safeParse(json);
        if (!parsed.success) {
          logger.warn(
            { node: nodeName, type, err: parsed.error },
            'Invalid VM list format'
          );
          return [];
        }

        const results = await Promise.all(
          parsed.data.data.map(async (vm) => {
            const basicVM: LegacyProxmoxVMStatus = {
              vmid: vm.vmid,
              name: vm.name,
              status: (['running', 'stopped', 'paused'].includes(vm.status)
                ? vm.status
                : 'stopped') as 'running' | 'stopped' | 'paused',
              cpus: vm.cpus || 0,
              maxmem: vm.maxmem || 0,
              mem: vm.mem || 0,
              uptime: vm.uptime || 0,
              type,
            };

            if (basicVM.status === 'running') {
              try {
                const statusUrl = `${this.config.url}/api2/json/nodes/${nodeName}/${type}/${vm.vmid}/status/current`;
                const statusRes = await this.fetchProxmox(statusUrl);
                if (statusRes.ok) {
                  const statusJson = await statusRes.json();
                  const statusParsed =
                    ProxmoxVMStatusResponseSchema.safeParse(statusJson);
                  if (statusParsed.success) {
                    const d = statusParsed.data.data;
                    if (d.cpu !== undefined) {
                      basicVM.cpuUsage = d.cpu;
                    }
                    if (d.mem !== undefined) {
                      basicVM.mem = d.mem;
                    }
                    if (d.maxmem !== undefined) {
                      basicVM.maxmem = d.maxmem;
                    }
                    if (d.uptime !== undefined) {
                      basicVM.uptime = d.uptime;
                    }
                  }
                }
              } catch (e) {
                logger.warn(
                  { err: e, vmid: vm.vmid },
                  'Failed to fetch detailed VM status'
                );
              }
            }
            return basicVM;
          })
        );
        return results;
      };

      const [qemus, lxcs] = await Promise.all([
        processVMs(qemuRes, 'qemu'),
        processVMs(lxcRes, 'lxc'),
      ]);

      const legacyVMs = [...qemus, ...lxcs];

      // Sort by VMID
      legacyVMs.sort((a, b) => a.vmid - b.vmid);

      // Convert to unified format
      const workloads = legacyVMs.map(convertProxmoxVMToWorkload);

      logger.info(
        { node: nodeName, vmCount: workloads.length },
        'Fetched VMs for node'
      );

      return workloads;
    } catch (e: unknown) {
      logger.error({ err: e, node: nodeName }, 'Failed to fetch VMs for node');
      return [];
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new ProxmoxProvider instance from configuration
 */
export function createProxmoxProvider(config: ProxmoxClusterConfig): InfraProvider {
  return new ProxmoxProvider(config);
}

/**
 * Create a ProxmoxProvider from a legacy config object
 */
export function createProxmoxProviderFromLegacy(
  config: LegacyProxmoxConfig
): InfraProvider {
  return new ProxmoxProvider(parseProxmoxConfig(config));
}
