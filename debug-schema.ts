
import { OpenStackHypervisorsResponseSchema, OpenStackServersResponseSchema } from './lib/providers/openstack/schemas';

const mockHypervisors = {
  hypervisors: [
    {
      id: 'hyper-1',
      hypervisor_hostname: 'compute-node-1.example.com',
      status: 'enabled',
      state: 'up',
      vcpus: 64,
      vcpus_used: 32,
      memory_mb: 256000,
      memory_mb_used: 128000,
      running_vms: 10,
      hypervisor_type: 'QEMU',
      hypervisor_version: 6000000,
      cpu_info: {
         model: 'Intel Xeon',
         vendor: 'Intel',
         topology: { cores: 32, threads: 2, sockets: 1 }
      }
    },
    {
      id: 'hyper-2',
      hypervisor_hostname: 'compute-node-2.example.com',
      status: 'enabled',
      state: 'up',
      vcpus: 64,
      vcpus_used: 16,
      memory_mb: 256000,
      memory_mb_used: 64000,
      running_vms: 5,
       hypervisor_type: 'QEMU',
       hypervisor_version: 6000000,
       cpu_info: {
         model: 'Intel Xeon',
         vendor: 'Intel',
         topology: { cores: 32, threads: 2, sockets: 1 }
      }
    },
  ],
};

const mockServers = {
  servers: [
    {
      id: 'inst-1',
      name: 'web-server-prod',
      status: 'ACTIVE',
      flavor: { id: '2' }, // m1.medium
      hostId: 'host-1',
      'OS-EXT-SRV-ATTR:hypervisor_hostname': 'compute-node-1.example.com',
      created: '2024-01-10T10:00:00Z',
      addresses: {
         'public': [{ addr: '192.168.100.10', version: 4 }]
      }
    }
  ]
};

try {
  console.log('Validating Hypervisors...');
  OpenStackHypervisorsResponseSchema.parse(mockHypervisors);
  console.log('Hypervisors Valid!');
} catch (e) {
  console.error('Hypervisor Validation Failed:', JSON.stringify(e, null, 2));
}

try {
  console.log('Validating Servers...');
  OpenStackServersResponseSchema.parse(mockServers);
  console.log('Servers Valid!');
} catch (e) {
  console.error('Server Validation Failed:', JSON.stringify(e, null, 2));
}
