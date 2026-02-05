
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const fullPath = path.join('/');

  console.log(`[Mock K8s] GET /${fullPath}`);

  // 1. Version Endpoint
  if (fullPath === 'version') {
    return NextResponse.json({
      major: '1',
      minor: '30',
      gitVersion: 'v1.30.0',
      gitCommit: 'mock-commit',
      gitTreeState: 'clean',
      buildDate: '2024-01-01T00:00:00Z',
      goVersion: 'go1.22.2',
      compiler: 'gc',
      platform: 'linux/amd64',
    });
  }

  // 2. Nodes Endpoint
  if (fullPath === 'api/v1/nodes') {
    return NextResponse.json({
      kind: 'NodeList',
      apiVersion: 'v1',
      items: [
        {
          metadata: {
            name: 'k8s-node-1',
            creationTimestamp: '2024-01-01T00:00:00Z',
            labels: { 'kubernetes.io/hostname': 'k8s-node-1' },
          },
          status: {
            conditions: [{ type: 'Ready', status: 'True' }],
            capacity: { cpu: '8', memory: '16Gi' }, // 16GB
            allocatable: { cpu: '8', memory: '16Gi' },
            nodeInfo: {
              kubeletVersion: 'v1.30.0',
              osImage: 'Ubuntu 22.04.4 LTS',
              architecture: 'amd64',
            },
          },
        },
        {
          metadata: {
            name: 'k8s-node-2',
            creationTimestamp: '2024-01-01T00:00:00Z',
            labels: { 'kubernetes.io/hostname': 'k8s-node-2' },
          },
          status: {
            conditions: [{ type: 'Ready', status: 'True' }],
            capacity: { cpu: '8', memory: '16Gi' },
            allocatable: { cpu: '8', memory: '16Gi' },
            nodeInfo: {
              kubeletVersion: 'v1.30.0',
              osImage: 'Ubuntu 22.04.4 LTS',
              architecture: 'amd64',
            },
          },
        },
      ],
    });
  }

  // 3. Node Metrics Endpoint (metrics-server)
  if (fullPath === 'apis/metrics.k8s.io/v1beta1/nodes') {
    return NextResponse.json({
      kind: 'NodeMetricsList',
      apiVersion: 'metrics.k8s.io/v1beta1',
      items: [
        {
          metadata: { name: 'k8s-node-1' },
          timestamp: new Date().toISOString(),
          window: '30s',
          usage: { cpu: '2000m', memory: '8Gi' }, // 2 cores, 8GB used
        },
        {
          metadata: { name: 'k8s-node-2' },
          timestamp: new Date().toISOString(),
          window: '30s',
          // Use less here
          usage: { cpu: '1000m', memory: '4Gi' }, // 1 core, 4GB used
        },
      ],
    });
  }

  // 4. Pods Endpoint (Workloads)
  if (fullPath === 'api/v1/pods') {
    return NextResponse.json({
      kind: 'PodList',
      apiVersion: 'v1',
      items: [
        {
          metadata: {
            name: 'nginx-deployment-12345',
            namespace: 'default',
            creationTimestamp: '2024-01-02T10:00:00Z',
          },
          spec: {
            nodeName: 'k8s-node-1',
            containers: [{ name: 'nginx' }],
          },
          status: {
            phase: 'Running',
            podIP: '10.244.0.10',
            startTime: '2024-01-02T10:00:05Z',
          },
        },
        {
          metadata: {
            name: 'postgres-0',
            namespace: 'database',
            creationTimestamp: '2024-01-02T11:00:00Z',
          },
          spec: {
            nodeName: 'k8s-node-1',
            containers: [{ name: 'postgres' }],
          },
          status: {
            phase: 'Running',
            podIP: '10.244.0.11',
            startTime: '2024-01-02T11:00:05Z',
          },
        },
        {
          metadata: {
            name: 'redis-master',
            namespace: 'cache',
            creationTimestamp: '2024-01-02T12:00:00Z',
          },
          spec: {
            nodeName: 'k8s-node-2',
            containers: [{ name: 'redis' }],
          },
          status: {
            phase: 'Running',
            podIP: '10.244.1.20',
            startTime: '2024-01-02T12:00:05Z',
          },
        },
      ],
    });
  }
  
  // 5. Pod Metrics Endpoint
  if (fullPath === 'apis/metrics.k8s.io/v1beta1/pods') {
    return NextResponse.json({
      kind: 'PodMetricsList',
      apiVersion: 'metrics.k8s.io/v1beta1',
      items: [
        {
          metadata: { name: 'nginx-deployment-12345', namespace: 'default' },
          timestamp: new Date().toISOString(),
          window: '30s',
          containers: [{ name: 'nginx', usage: { cpu: '100m', memory: '128Mi' } }]
        },
        {
          metadata: { name: 'postgres-0', namespace: 'database' },
          timestamp: new Date().toISOString(),
          window: '30s',
          containers: [{ name: 'postgres', usage: { cpu: '500m', memory: '512Mi' } }]
        },
         {
          metadata: { name: 'redis-master', namespace: 'cache' },
          timestamp: new Date().toISOString(),
          window: '30s',
          containers: [{ name: 'redis', usage: { cpu: '200m', memory: '256Mi' } }]
        }
      ]
    });
  }

  // 6. Namespaces
  if (fullPath === 'api/v1/namespaces') {
     return NextResponse.json({
       kind: 'NamespaceList',
       apiVersion: 'v1',
       items: [
         { metadata: { name: 'default' } },
         { metadata: { name: 'database' } },
         { metadata: { name: 'cache' } },
         { metadata: { name: 'kube-system' } }
       ]
     });
  }

  // Fallback
  return new NextResponse(`Mock K8s Path not found: ${fullPath}`, { status: 404 });
}
