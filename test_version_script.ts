import { fetchClusterStatus, getClusterConfigs } from './lib/proxmox';

async function main() {
  const configs = getClusterConfigs();
  console.log('Found configs:', configs.length);
  
  for (const config of configs) {
    console.log(`Checking cluster: ${config.name} at ${config.url}`);
    const status = await fetchClusterStatus(config);
    console.log(`Status for ${config.name}:`);
    console.log(`  Version: ${status.version}`);
    console.log(`  Nodes: ${status.nodes.length}`);
    if (status.error) {
        console.log(`  Error: ${status.error}`);
    }
  }
}

main().catch(console.error);
