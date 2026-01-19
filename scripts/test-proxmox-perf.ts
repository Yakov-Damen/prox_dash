import { getAllClustersStatus } from '../lib/proxmox';

async function testPerf() {
  console.log('Starting First Fetch (Cold Cache)...');
  const start1 = Date.now();
  try {
    const res1 = await getAllClustersStatus();
    console.log(`First Fetch Result Nodes: ${res1.flatMap(c => c.nodes).length}`);
  } catch (e) {
    console.error("Error in first fetch:", e);
  }
  const end1 = Date.now();
  console.log(`First Fetch took ${end1 - start1}ms`);

  console.log('Starting Second Fetch (Warm Cache)...');
  const start2 = Date.now();
  try {
    const res2 = await getAllClustersStatus();
    console.log(`Second Fetch Result Nodes: ${res2.flatMap(c => c.nodes).length}`);
  } catch (e) {
    console.error("Error in second fetch:", e);
  }
  const end2 = Date.now();
  console.log(`Second Fetch took ${end2 - start2}ms`);
}

testPerf();
