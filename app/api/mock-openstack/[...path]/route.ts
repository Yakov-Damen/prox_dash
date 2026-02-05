
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fullPath = path.join('/');

  console.log(`[Mock OpenStack] GET /${fullPath}`);

  // 1. Compute Limits (Project Summary)
  // Path usually: compute/v2.1/limits or limits
  if (fullPath.endsWith('limits')) {
    return NextResponse.json({
      limits: {
        absolute: {
          maxTotalCores: 100,
          maxTotalRAMSize: 102400, // 100GB
          totalCoresUsed: 12,
          totalRAMUsed: 16384, // 16GB
          totalInstancesUsed: 5,
          maxTotalInstances: 50,
        },
      },
    });
  }

  // 2. Hypervisors (Admin View)
  if (fullPath.endsWith('os-hypervisors/detail')) {
    return NextResponse.json({
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
    });
  }

  // 3. Flavors
  if (fullPath.endsWith('flavors/detail')) {
    return NextResponse.json({
      flavors: [
        { id: '1', name: 'm1.small', vcpus: 1, ram: 2048, disk: 20 },
        { id: '2', name: 'm1.medium', vcpus: 2, ram: 4096, disk: 40 },
        { id: '3', name: 'm1.large', vcpus: 4, ram: 8192, disk: 80 },
      ],
    });
  }

  // 4. Servers (Instances)
  if (fullPath.endsWith('servers/detail')) {
    return NextResponse.json({
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
        },
        {
          id: 'inst-2',
          name: 'db-server-main',
          status: 'ACTIVE',
          flavor: { id: '3' }, // m1.large
          hostId: 'host-1',
          'OS-EXT-SRV-ATTR:hypervisor_hostname': 'compute-node-1.example.com',
          created: '2024-01-10T11:00:00Z',
           addresses: {
             'private': [{ addr: '10.0.0.5', version: 4 }]
          }
        },
         {
          id: 'inst-3',
          name: 'worker-node-1',
          status: 'ACTIVE',
          flavor: { id: '1' }, // m1.small
          hostId: 'host-2',
          'OS-EXT-SRV-ATTR:hypervisor_hostname': 'compute-node-2.example.com',
          created: '2024-01-10T12:00:00Z',
           addresses: {
             'private': [{ addr: '10.0.0.6', version: 4 }]
          }
        },
      ],
    });
  }
  
  // 5. Single Hypervisor (Fallback for detailed lookup)
  if (fullPath.includes('os-hypervisors/hyper-1')) {
      return NextResponse.json({
          hypervisor: {
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
               cpu_info: {
                 model: 'Intel Xeon',
                 vendor: 'Intel',
                 topology: { cores: 32, threads: 2, sockets: 1 }
              }
          }
      });
  }

  // Fallback
  return new NextResponse(`Mock OpenStack Path not found: ${fullPath}`, { status: 404 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fullPath = path.join('/');

  console.log(`[Mock OpenStack] POST /${fullPath}`);

  // Identity / Auth Token
  // Usually: identity/v3/auth/tokens
  if (fullPath.includes('auth/tokens')) {
    // Return a dummy token with service catalog
    const headers = {
       'X-Subject-Token': 'mock-auth-token-12345',
    };
    
    const body = {
      token: {
        project: {
             id: 'mock-project-id',
             name: 'mock-project'
        },
        user: {
          id: 'mock-user-id',
          name: 'mock-user',
          domain: { id: 'default', name: 'Default' },
        },
        roles: [
            { id: 'role-admin', name: 'admin' }, // Simulate admin for hypervisor visibility
            { id: 'role-member', name: 'member' }
        ],
        catalog: [
          {
            id: 'service-compute',
            type: 'compute',
            name: 'nova',
            endpoints: [
              {
                id: 'end-compute',
                interface: 'public',
                region_id: 'RegionOne',
                url: 'http://localhost:3000/api/mock-openstack/compute/v2.1',
              },
            ],
          },
          {
             id: 'service-identity',
             type: 'identity',
             name: 'keystone',
             endpoints: [
                 {
                     id: 'end-identity',
                     interface: 'public',
                     region_id: 'RegionOne',
                     url: 'http://localhost:3000/api/mock-openstack/identity/v3'
                 }
             ]
          }
        ],
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        issued_at: new Date().toISOString(),
      },
    };

    return NextResponse.json(body, { headers });
  }

   return new NextResponse(`Mock OpenStack POST Path not found: ${fullPath}`, { status: 404 });
}
