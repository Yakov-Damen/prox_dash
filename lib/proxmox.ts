import fs from 'fs';
import path from 'path';
import https from 'https';

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
}

const CONFIG_PATH = path.join(process.cwd(), 'proxmox_config.json');

export function getClusterConfigs(): ProxmoxClusterConfig[] {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.warn("Config file not found:", CONFIG_PATH);
      return [];
    }
    const fileContent = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading config:", error);
    return [];
  }
}

const INVENTORY_PATH = path.join(process.cwd(), 'hardware_inventory.json');

function getHardwareInventory(): Record<string, any> {
  try {
    if (!fs.existsSync(INVENTORY_PATH)) return {};
    return JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
  } catch (e) {
    console.error("Failed to read hardware inventory", e);
    return {};
  }
}

export async function fetchClusterStatus(config: ProxmoxClusterConfig): Promise<ClusterStatus> {
  try {
    // ... (existing api url setup)
    const apiUrl = `${config.url}/api2/json/nodes`;
    const inventory = getHardwareInventory();

    // ... (rest of setup)
    const agent = new https.Agent({
      rejectUnauthorized: !config.allowInsecure
    });

    // WORKAROUND for self-signed certs in Node fetch:
    if (config.allowInsecure) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const res = await fetch(apiUrl, {
        headers: {
            'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
        },
    });
    
    if (config.allowInsecure) {
         process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'; // Restore
    }

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const nodes: NodeStatus[] = await Promise.all(data.data.map(async (node: any) => {
      const basicNode: NodeStatus = {
        id: node.id || node.node,
        node: node.node,
        status: node.status,
        cpu: node.cpu,
        maxcpu: node.maxcpu,
        mem: node.mem,
        maxmem: node.maxmem,
        uptime: node.uptime,
        disk: node.disk,
        maxdisk: node.maxdisk,
      };

      // Check inventory (Hierarchical: Cluster -> Node, or Flat Fallback)
      const inv = inventory[config.name]?.[node.node] || inventory[node.node];
      
      if (inv) {
        if (inv.manufacturer) basicNode.manufacturer = inv.manufacturer;
        if (inv.productName) basicNode.productName = inv.productName;
        // Optional: Override CPU if inventory has it, or keep API's if preferred.
        // Let's defer to API detailed status if available, but fallback to inventory.
      }

      // If online, try to fetch detailed status for hardware info
      if (node.status === 'online') {
        try {
          const detailUrl = `${config.url}/api2/json/nodes/${node.node}/status`;
          // Reuse headers logic
          const headers: HeadersInit = {
              'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
          };
          
          if (config.allowInsecure) {
             process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
          }
           const res = await fetch(detailUrl, { headers });
           if (config.allowInsecure) {
             process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
           }

           if (res.ok) {
             const detailJson = await res.json();
             const d = detailJson.data;
             if (d.cpuinfo) {
               basicNode.cpuModel = d.cpuinfo.model;
               basicNode.cpuSockets = d.cpuinfo.sockets;
               basicNode.cpuCores = d.cpuinfo.cores;
             }
             if (d.kversion) {
               // Clean up kernel version: "Linux 5.4... #1 SMP..." -> "Linux 5.4..."
               basicNode.kernelVersion = d.kversion.split(' #')[0];
             }
           }
        } catch (e) {
          console.warn(`Failed to fetch details for node ${node.node}`, e);
        }
      }
      return basicNode;
    }));

    // Sort nodes alphabetically
    nodes.sort((a, b) => a.node.localeCompare(b.node, undefined, { numeric: true }));

    return {
      name: config.name,
      nodes
    };

  } catch (error: any) {
    console.error(`Failed to fetch cluster ${config.name}:`, error);
    return {
      name: config.name,
      nodes: [],
      error: error.message
    };
  }
}

// ... types

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

// ... existing code ...

export async function getNodeVMs(config: ProxmoxClusterConfig, node: string): Promise<VMStatus[]> {
  try {
     const headers: HeadersInit = {
        'Authorization': `PVEAPIToken=${config.tokenId}=${config.tokenSecret}`,
     };
      
      if (config.allowInsecure) {
         process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      }

    // Fetch QEMU (VMs)
    const qemuRes = await fetch(`${config.url}/api2/json/nodes/${node}/qemu`, { headers });
    const lxcRes = await fetch(`${config.url}/api2/json/nodes/${node}/lxc`, { headers });

     if (config.allowInsecure) {
         process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';
     }

    let vms: VMStatus[] = [];

    if (qemuRes.ok) {
        const json = await qemuRes.json();
        const qemus = json.data.map((vm: any) => ({
            vmid: vm.vmid,
            name: vm.name,
            status: vm.status,
            cpus: vm.cpus,
            maxmem: vm.maxmem,
            mem: vm.mem || 0,
            uptime: vm.uptime || 0,
            type: 'qemu'
        }));
        vms = [...vms, ...qemus];
    }

    if (lxcRes.ok) {
        const json = await lxcRes.json();
        const lxcs = json.data.map((vm: any) => ({
            vmid: vm.vmid,
            name: vm.name,
            status: vm.status,
            cpus: vm.cpus,
            maxmem: vm.maxmem,
            mem: vm.mem || 0,
            uptime: vm.uptime || 0,
            type: 'lxc'
        }));
        vms = [...vms, ...lxcs];
    }

    // Sort by VMID
    vms.sort((a, b) => a.vmid - b.vmid);
    
    return vms;

  } catch (e) {
    console.error(`Failed to fetch VMs for node ${node}`, e);
    return [];
  }
}

export async function getAllClustersStatus(): Promise<ClusterStatus[]> {
  const configs = getClusterConfigs();
  const promises = configs.map(config => fetchClusterStatus(config));
  return Promise.all(promises);
}

