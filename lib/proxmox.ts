import fs from 'fs';
import path from 'path';
import https from 'https';
import { logger } from './logger';
import fetch, { Response } from 'node-fetch';

export interface ProxmoxClusterConfig {
  name: string;
  url: string;
  tokenId: string;
  tokenSecret: string;
  allowInsecure?: boolean;
}

export interface NodeStatus {
  id: string;
  node: string;
  status: 'online' | 'offline' | 'unknown';
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  uptime: number;
  disk?: number;
  maxdisk?: number;
  cpuModel?: string;
  cpuSockets?: number;
  cpuCores?: number;
  kernelVersion?: string;
  manufacturer?: string;
  productName?: string;
}

export interface ClusterStatus {
  name: string;
  nodes: NodeStatus[];
  error?: string;
  version?: string;
}

export interface VMStatus {
  vmid: number;
  name: string;
  status: 'running' | 'stopped' | 'paused';
  cpus: number;
  maxmem: number; // bytes
  mem: number; // bytes used
  uptime: number;
  type: 'qemu' | 'lxc';
}

const CONFIG_PATH = path.join(process.cwd(), 'proxmox_config.json');
const INVENTORY_PATH = path.join(process.cwd(), 'hardware_inventory.json');

// In-memory cache
let cachedConfigs: ProxmoxClusterConfig[] | null = null;

interface HardwareInfo {
  manufacturer?: string;
  productName?: string;
}
let cachedInventory: Record<string, Record<string, HardwareInfo>> | null = null;

export function getClusterConfigs(): ProxmoxClusterConfig[] {
  if (cachedConfigs) return cachedConfigs;
  
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      logger.warn({ path: CONFIG_PATH }, "Config file not found");
      return [];
    }
    const fileContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const configs = JSON.parse(fileContent);
    logger.debug({ count: configs.length }, "Loaded cluster configs");
    cachedConfigs = configs;
    return configs;
  } catch (error) {
    logger.error({ err: error }, "Error reading config");
    return [];
  }
}

function getHardwareInventory(): Record<string, Record<string, HardwareInfo>> {
  if (cachedInventory) return cachedInventory;

  try {
    if (!fs.existsSync(INVENTORY_PATH)) return {};
    const inventory = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
    cachedInventory = inventory;
    return inventory;
  } catch (e: unknown) {
    logger.error({ err: e }, "Failed to read hardware inventory");
    return {};
  }
}

// Helper to handle fetch with auth and TLS agent
async function fetchProxmox(url: string, config: ProxmoxClusterConfig): Promise<Response> {
  const agent = new https.Agent({
    rejectUnauthorized: !config.allowInsecure
  });

  const headers: HeadersInit = {
    'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
  };

  const fetchOptions: any = {
    headers,
    agent, 
  };

  try {
    const res = await fetch(url, fetchOptions);
    return res;
  } catch (e: unknown) {
    throw e;
  }
}

import { ProxmoxNodeListResponseSchema, ProxmoxVersionResponseSchema, ProxmoxNodeStatusResponseSchema, ProxmoxVMListResponseSchema } from './schemas';

// ... (previous code)

export async function fetchClusterStatus(config: ProxmoxClusterConfig): Promise<ClusterStatus> {
  try {
    const apiUrl = `${config.url}/api2/json/nodes`;
    const versionUrl = `${config.url}/api2/json/version`;
    
    logger.info({ cluster: config.name, url: config.url }, "Starting cluster fetch");
    const inventory = getHardwareInventory();

    const res = await fetchProxmox(apiUrl, config);
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    const json = await res.json();
    
    // Validate with Zod
    const parsed = ProxmoxNodeListResponseSchema.safeParse(json);
    if (!parsed.success) {
        logger.error({ err: parsed.error, cluster: config.name }, "Invalid node list format from Proxmox");
        throw new Error("Invalid response format from Proxmox API");
    }
    
    const data = parsed.data;

    // Fetch Version
    let version = '';
    try {
        const verRes = await fetchProxmox(versionUrl, config);
        if (verRes.ok) {
            const verJson = await verRes.json();
            const verParsed = ProxmoxVersionResponseSchema.safeParse(verJson);
            if (verParsed.success) {
                version = verParsed.data.data.version;
            }
        }
    } catch (e: unknown) {
        logger.warn({ err: e, cluster: config.name }, "Failed to fetch cluster version");
    }

    const nodes: NodeStatus[] = await Promise.all(data.data.map(async (node) => {
      const basicNode: NodeStatus = {
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
      const inv = inventory[config.name]?.[node.node] || inventory[node.node];
      if (!inv) {
         logger.debug({ cluster: config.name, node: node.node }, "No hardware inventory found for node");
      }
      
      if (inv) {
        if (inv.manufacturer) basicNode.manufacturer = inv.manufacturer;
        if (inv.productName) basicNode.productName = inv.productName;
      }

      // If online, try to fetch detailed status
      if (node.status === 'online') {
        try {
          const detailUrl = `${config.url}/api2/json/nodes/${node.node}/status`;
          const detailRes = await fetchProxmox(detailUrl, config);

           if (detailRes.ok) {
             const detailJson = await detailRes.json();
             // Validate detail
             const dParsed = ProxmoxNodeStatusResponseSchema.safeParse(detailJson);
             
             if (dParsed.success) {
                 const d = dParsed.data.data;
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
          logger.warn({ err: e, node: node.node }, "Failed to fetch details for node");
        }
      }
      return basicNode;
    }));

    // Sort nodes alphabetically
    nodes.sort((a, b) => a.node.localeCompare(b.node, undefined, { numeric: true }));

    logger.info({ cluster: config.name, nodeCount: nodes.length }, "Successfully fetched cluster status");

    return {
      name: config.name,
      nodes,
      version
    };

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ err, cluster: config.name }, "Failed to fetch cluster");
    return {
      name: config.name,
      nodes: [],
      error: err.message
    };
  }
}



export async function getNodeStatus(config: ProxmoxClusterConfig, nodeName: string): Promise<NodeStatus | null> {
  try {
    logger.info({ cluster: config.name, node: nodeName }, "Fetching single node status");
    const inventory = getHardwareInventory();
    
    const url = `${config.url}/api2/json/nodes/${nodeName}/status`;
    const res = await fetchProxmox(url, config);

    if (!res.ok) {
        logger.warn({ cluster: config.name, node: nodeName, status: res.status }, "Failed to fetch node status API");
        return null;
    }

    const json = await res.json();
    const parsed = ProxmoxNodeStatusResponseSchema.safeParse(json);
    
    if (!parsed.success) {
         logger.warn({ cluster: config.name, node: nodeName, err: parsed.error }, "Invalid node status format");
         return null;
    }

    const d = parsed.data.data;

    const node: NodeStatus = {
        id: `node/${config.name}/${nodeName}`,
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
        kernelVersion: d.kversion ? d.kversion.split(' #')[0] : undefined
    };

    // Mix in inventory
    const inv = inventory[config.name]?.[nodeName] || inventory[nodeName];
    if (inv) {
        if (inv.manufacturer) node.manufacturer = inv.manufacturer;
        if (inv.productName) node.productName = inv.productName;
    }

    return node;
  } catch (e: unknown) {
    logger.error({ err: e, cluster: config.name, node: nodeName }, "Error fetching single node status");
    return null;
  }
}

export async function getNodeVMs(config: ProxmoxClusterConfig, node: string): Promise<VMStatus[]> {
  try {
    logger.info({ node, cluster: config.name }, "Fetching VMs for node");
    
    // Run in parallel
    const [qemuRes, lxcRes] = await Promise.all([
        fetchProxmox(`${config.url}/api2/json/nodes/${node}/qemu`, config),
        fetchProxmox(`${config.url}/api2/json/nodes/${node}/lxc`, config)
    ]);

    let vms: VMStatus[] = [];

    const processVMs = async (res: Response, type: 'qemu' | 'lxc') => {
        if (res.ok) {
            const json = await res.json();
            const parsed = ProxmoxVMListResponseSchema.safeParse(json);
            if (parsed.success) {
                return parsed.data.data.map(vm => ({
                    vmid: vm.vmid,
                    name: vm.name,
                    status: (['running', 'stopped', 'paused'].includes(vm.status) ? vm.status : 'stopped') as 'running' | 'stopped' | 'paused',
                    cpus: vm.cpus || 0,
                    maxmem: vm.maxmem || 0,
                    mem: vm.mem || 0,
                    uptime: vm.uptime || 0,
                    type
                }));
            } else {
                logger.warn({ node, type, err: parsed.error }, "Invalid VM list format");
            }
        }
        return [];
    };

    const qemus = await processVMs(qemuRes, 'qemu');
    const lxcs = await processVMs(lxcRes, 'lxc');
    
    vms = [...qemus, ...lxcs];

    // Sort by VMID
    vms.sort((a, b) => a.vmid - b.vmid);
    
    logger.info({ node, vmCount: vms.length }, "Fetched VMs for node");
    
    return vms;

  } catch (e: unknown) {
    logger.error({ err: e, node }, "Failed to fetch VMs for node");
    return [];
  }
}

export async function getAllClustersStatus(): Promise<ClusterStatus[]> {
  const configs = getClusterConfigs();
  const promises = configs.map(config => fetchClusterStatus(config));
  return Promise.all(promises);
}

