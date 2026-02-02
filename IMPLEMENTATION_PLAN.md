# Global Infrastructure Dashboard - Implementation Plan

## Overview

Transform prox_dash from a Proxmox-only dashboard into a unified infrastructure management platform supporting:
- **Proxmox VE** (existing)
- **Kubernetes** (new)
- **OpenStack** (new)

---

## Phase 1: Provider Abstraction Layer

### 1.1 Define Unified Domain Types

**Goal**: Create platform-agnostic interfaces that all providers will implement.

**Tasks**:

1. **Create `lib/providers/types.ts`**
   - Define `InfraProvider` interface with common methods
   - Define unified resource types: `Cluster`, `ComputeNode`, `Workload`
   - Define provider configuration union type
   - Add provider type discriminator enum

   ```typescript
   // Core types to define:
   export type ProviderType = 'proxmox' | 'kubernetes' | 'openstack';

   export interface InfraProvider {
     type: ProviderType;
     getAllClusters(): Promise<ClusterStatus[]>;
     getCluster(name: string): Promise<ClusterStatus | null>;
     getNode(clusterName: string, nodeName: string): Promise<NodeStatus | null>;
     getWorkloads(clusterName: string, nodeName: string): Promise<Workload[]>;
   }

   export interface ClusterStatus {
     name: string;
     provider: ProviderType;
     nodes: NodeStatus[];
     version?: string;
     error?: string;
   }

   export interface NodeStatus {
     id: string;
     name: string;
     status: 'online' | 'offline' | 'unknown' | 'ready' | 'not-ready';
     cpu: { used: number; total: number; percentage: number };
     memory: { used: number; total: number; percentage: number };
     storage?: { used: number; total: number; percentage: number };
     uptime?: number;
     metadata?: Record<string, string>;
   }

   export interface Workload {
     id: string;
     name: string;
     status: string;
     type: WorkloadType;
     cpu: { count: number; usage?: number };
     memory: { used: number; total: number };
     uptime?: number;
   }

   export type WorkloadType =
     | 'qemu'           // Proxmox VM
     | 'lxc'            // Proxmox container
     | 'pod'            // Kubernetes pod
     | 'deployment'     // Kubernetes deployment
     | 'instance';      // OpenStack instance
   ```

   **Verification**:
   - [ ] Types compile without errors
   - [ ] Run `npm run lint` - no type errors
   - [ ] Types can represent Proxmox, K8s, and OpenStack resources

---

### 1.2 Create Provider Factory

**Goal**: Centralized provider instantiation and management.

**Tasks**:

1. **Create `lib/providers/index.ts`**
   - Implement `getProvider(config: ProviderConfig): InfraProvider`
   - Implement `getAllProviders(): InfraProvider[]`
   - Cache provider instances for reuse

   **Verification**:
   - [ ] Factory returns correct provider type based on config
   - [ ] Provider instances are properly cached
   - [ ] Unknown provider types throw meaningful errors

---

### 1.3 Refactor Proxmox Client

**Goal**: Move existing Proxmox logic into provider pattern.

**Tasks**:

1. **Create `lib/providers/proxmox/config.ts`**
   - Move `ProxmoxClusterConfig` interface
   - Add Zod schema for config validation
   - Add config loader from JSON

2. **Create `lib/providers/proxmox/schemas.ts`**
   - Move Proxmox-specific Zod schemas from `lib/schemas.ts`
   - Keep only Proxmox API response schemas

3. **Create `lib/providers/proxmox/client.ts`**
   - Move all functions from `lib/proxmox.ts`
   - Implement `InfraProvider` interface
   - Add transformation from Proxmox types to unified types

4. **Create `lib/providers/proxmox/index.ts`**
   - Export provider class and types
   - Export factory function `createProxmoxProvider(config)`

5. **Update `lib/proxmox.ts`**
   - Re-export from `lib/providers/proxmox/`
   - Mark as deprecated (maintains backward compatibility during migration)

   **Verification**:
   - [ ] Existing Proxmox functionality unchanged
   - [ ] `npm run dev` - dashboard still works
   - [ ] All API routes return same data structure
   - [ ] Tests pass (if any exist)

---

### 1.4 Create Unified Schemas

**Goal**: Zod schemas for unified domain types.

**Tasks**:

1. **Create `lib/providers/schemas.ts`**
   - Define `ClusterStatusSchema` for unified type
   - Define `NodeStatusSchema` for unified type
   - Define `WorkloadSchema` for unified type
   - Define `ProviderConfigSchema` union type

   **Verification**:
   - [ ] Schemas validate sample data from each provider
   - [ ] Type inference works correctly with Zod
   - [ ] Invalid data rejected with clear error messages

---

## Phase 2: Unified Configuration System

### 2.1 Extend Configuration Schema

**Goal**: Support multiple provider types in configuration file.

**Tasks**:

1. **Create `lib/config/types.ts`**
   ```typescript
   export interface BaseProviderConfig {
     name: string;
     type: ProviderType;
     enabled?: boolean;
   }

   export interface ProxmoxConfig extends BaseProviderConfig {
     type: 'proxmox';
     url: string;
     tokenId: string;
     tokenSecret: string;
     allowInsecure?: boolean;
   }

   export interface KubernetesConfig extends BaseProviderConfig {
     type: 'kubernetes';
     kubeConfigPath?: string;
     kubeConfigContext?: string;
     inCluster?: boolean;
     namespace?: string;
   }

   export interface OpenStackConfig extends BaseProviderConfig {
     type: 'openstack';
     authUrl: string;
     region?: string;
     projectName: string;
     projectDomainName?: string;
     userDomainName?: string;
     username?: string;
     password?: string;
     applicationCredentialId?: string;
     applicationCredentialSecret?: string;
   }

   export type ProviderConfig = ProxmoxConfig | KubernetesConfig | OpenStackConfig;
   ```

2. **Create `lib/config/loader.ts`**
   - Load from `infrastructure_config.json` (new) or `proxmox_config.json` (legacy)
   - Validate with Zod schemas
   - Cache configuration
   - Support hot-reload in development

3. **Create `lib/config/schemas.ts`**
   - Zod schemas for all provider config types
   - Discriminated union for ProviderConfig

4. **Rename/migrate configuration file**
   - `proxmox_config.json` → `infrastructure_config.json`
   - Add `type: 'proxmox'` to existing entries
   - Keep backward compatibility check

   **Verification**:
   - [ ] Existing `proxmox_config.json` still works
   - [ ] New multi-provider config validates correctly
   - [ ] Invalid configs produce helpful error messages
   - [ ] Config changes trigger reload in dev mode

---

### 2.2 Update Configuration Documentation

**Tasks**:

1. **Update CLAUDE.md configuration section**
2. **Create example `infrastructure_config.example.json`**

   **Verification**:
   - [ ] Documentation reflects new config format
   - [ ] Example file is valid and comprehensive

---

## Phase 3: Unified API Routes

### 3.1 Create New API Route Structure

**Goal**: Provider-agnostic API routes.

**Tasks**:

1. **Create `app/api/infrastructure/route.ts`**
   - GET: Return all clusters from all providers
   - Query param `?provider=proxmox` for filtering
   - Uses unified response schema

2. **Create `app/api/infrastructure/cluster/[name]/route.ts`**
   - GET: Return single cluster status
   - Automatically detect provider from cluster name

3. **Create `app/api/infrastructure/cluster/[name]/node/[node]/route.ts`**
   - GET: Return single node status

4. **Create `app/api/infrastructure/cluster/[name]/node/[node]/workloads/route.ts`**
   - GET: Return workloads (VMs, pods, instances)

5. **Create backward compatibility layer**
   - Keep `/api/proxmox/*` routes working
   - Redirect to unified routes internally

   **Verification**:
   - [ ] New routes return unified schema
   - [ ] Old routes still work (backward compat)
   - [ ] Provider filtering works correctly
   - [ ] All routes have proper error handling
   - [ ] Logging works with new routes

---

### 3.2 Update Data Fetching Hooks

**Goal**: Hooks that work with unified API.

**Tasks**:

1. **Update `lib/hooks.ts`**
   - Update SWR hooks to use new API endpoints
   - Add provider filter parameter where needed
   - Maintain backward compatibility

2. **Create new hooks for specific needs**
   - `useProviders()`: List all configured providers
   - `useClustersByProvider(provider)`: Filter by provider

   **Verification**:
   - [ ] Existing hooks work unchanged
   - [ ] New hooks function correctly
   - [ ] SWR caching/polling works with new routes

---

## Phase 4: Kubernetes Provider

### 4.1 Kubernetes Client Setup

**Goal**: Kubernetes API client that implements InfraProvider.

**Tasks**:

1. **Add dependencies**
   ```bash
   npm install @kubernetes/client-node
   ```

2. **Create `lib/providers/kubernetes/config.ts`**
   - KubeConfig loading (file, in-cluster, context)
   - Connection validation

3. **Create `lib/providers/kubernetes/schemas.ts`**
   - Zod schemas for K8s API responses we use
   - Node, Pod, Deployment schemas

4. **Create `lib/providers/kubernetes/client.ts`**
   - Implement `InfraProvider` interface
   - `getAllClusters()`: Returns single cluster (K8s context = cluster)
   - `getCluster()`: Node list with resource stats
   - `getNode()`: Node details with conditions
   - `getWorkloads()`: Pods on node

5. **Create `lib/providers/kubernetes/mappers.ts`**
   - Transform K8s Node → unified NodeStatus
   - Transform K8s Pod → unified Workload
   - Map K8s conditions to status enum

   **Verification**:
   - [ ] Can connect to local/remote K8s cluster
   - [ ] Nodes listed with resource usage
   - [ ] Pods listed with status and resources
   - [ ] Metrics server integration works (if available)
   - [ ] Graceful handling when metrics unavailable

---

### 4.2 Kubernetes Status Mapping

**Goal**: Map K8s-specific statuses to unified UI.

**Tasks**:

1. **Update `lib/status-utils.ts`**
   - Add K8s node conditions: Ready, MemoryPressure, DiskPressure
   - Add K8s pod phases: Pending, Running, Succeeded, Failed, Unknown
   - Add K8s container states: Waiting, Running, Terminated

2. **Create K8s-specific status helpers**
   - `getK8sNodeStatus(conditions)`: Determine overall node health
   - `getK8sPodStatus(pod)`: Determine overall pod health

   **Verification**:
   - [ ] All K8s statuses have color mappings
   - [ ] Status badges render correctly for K8s resources
   - [ ] Edge cases handled (CrashLoopBackOff, etc.)

---

## Phase 5: OpenStack Provider

### 5.1 OpenStack Client Setup

**Goal**: OpenStack API client that implements InfraProvider.

**Tasks**:

1. **Add dependencies**
   ```bash
   npm install openstack-client  # or use raw fetch with Keystone auth
   ```

2. **Create `lib/providers/openstack/config.ts`**
   - Keystone authentication config
   - Project/domain scoping

3. **Create `lib/providers/openstack/auth.ts`**
   - Keystone v3 token authentication
   - Token caching and refresh
   - Scoped vs unscoped tokens

4. **Create `lib/providers/openstack/schemas.ts`**
   - Zod schemas for OpenStack API responses
   - Server, Hypervisor, Flavor schemas

5. **Create `lib/providers/openstack/client.ts`**
   - Implement `InfraProvider` interface
   - `getAllClusters()`: Returns project/region as cluster
   - `getCluster()`: Hypervisor list (admin) or instance summary
   - `getNode()`: Hypervisor details (admin only)
   - `getWorkloads()`: Instances in project

6. **Create `lib/providers/openstack/mappers.ts`**
   - Transform OpenStack Server → unified Workload
   - Transform OpenStack Hypervisor → unified NodeStatus
   - Map server states to status enum

   **Verification**:
   - [ ] Can authenticate to OpenStack
   - [ ] Token refresh works
   - [ ] Instances listed with status
   - [ ] Hypervisor info (if admin access)
   - [ ] Graceful degradation without admin role

---

### 5.2 OpenStack Status Mapping

**Goal**: Map OpenStack-specific statuses to unified UI.

**Tasks**:

1. **Update `lib/status-utils.ts`**
   - Add OpenStack server states: ACTIVE, BUILD, STOPPED, ERROR, etc.
   - Add OpenStack hypervisor states

   **Verification**:
   - [ ] All OpenStack statuses have color mappings
   - [ ] Status badges render correctly

---

## Phase 6: UI Updates

### 6.1 Provider-Aware Components

**Goal**: UI components that work with all providers.

**Tasks**:

1. **Create `components/ProviderBadge.tsx`**
   - Visual indicator for provider type
   - Icons: Server (Proxmox), Ship (K8s), Cloud (OpenStack)
   - Colors per provider

2. **Update `components/StatusBadge.tsx`**
   - Support all provider statuses
   - Provider-specific tooltips

3. **Update `components/ResourceBar.tsx`**
   - No changes needed (already generic)

4. **Create `components/WorkloadTable.tsx`**
   - Replaces VMTable with unified workload display
   - Workload type icons
   - Provider-specific columns when relevant

5. **Create `components/ClusterCard.tsx`**
   - Unified cluster card with provider badge
   - Handles all provider types

6. **Create `components/NodeCard.tsx`**
   - Unified node card
   - Provider-specific metadata display

   **Verification**:
   - [ ] Components render correctly for all providers
   - [ ] Provider badges display correctly
   - [ ] Status colors work for all provider statuses
   - [ ] Responsive design maintained

---

### 6.2 Dashboard Page Updates

**Goal**: Update pages to use unified components.

**Tasks**:

1. **Update `app/page.tsx` (Dashboard Home)**
   - Group clusters by provider OR show unified list
   - Add provider filter toggle
   - Use new ClusterCard component

2. **Update `app/cluster/[name]/page.tsx`**
   - Use unified NodeCard component
   - Show provider badge in header
   - Handle provider-specific features

3. **Update `app/cluster/[name]/node/[node]/page.tsx`**
   - Use WorkloadTable component
   - Provider-specific metadata sections

4. **Consider navigation updates**
   - Breadcrumb shows provider type
   - URL structure unchanged (backward compat)

   **Verification**:
   - [ ] Dashboard displays all provider types
   - [ ] Navigation works for all providers
   - [ ] Data refreshes correctly (SWR polling)
   - [ ] Error states handled gracefully

---

### 6.3 Provider Management UI (Optional Enhancement)

**Goal**: UI for managing provider configurations.

**Tasks**:

1. **Create `app/settings/page.tsx`**
   - List configured providers
   - Show connection status
   - Enable/disable providers

2. **Create `app/settings/providers/[type]/page.tsx`**
   - Provider-specific configuration form
   - Connection test button

   **Verification**:
   - [ ] Can view all providers
   - [ ] Connection status accurate
   - [ ] Forms validate input correctly

---

## Phase 7: Testing & Documentation

### 7.1 Mock API Extensions

**Goal**: Mock APIs for all providers for development.

**Tasks**:

1. **Create `app/api/mock-infrastructure/route.ts`**
   - Returns mock data for all provider types

2. **Create mock data generators**
   - `lib/mocks/proxmox.ts` (move existing)
   - `lib/mocks/kubernetes.ts`
   - `lib/mocks/openstack.ts`

3. **Update mock data to match unified schema**

   **Verification**:
   - [ ] Mock API works in development
   - [ ] All provider types have mock data
   - [ ] Mock data matches real API structure

---

### 7.2 Documentation Updates

**Tasks**:

1. **Update `CLAUDE.md`**
   - New architecture overview
   - Provider abstraction documentation
   - Configuration format updates
   - New API routes

2. **Update `README.md`**
   - Multi-provider feature description
   - Configuration examples for each provider
   - Setup instructions per provider

3. **Create `docs/providers/`**
   - `proxmox.md`: Proxmox-specific setup
   - `kubernetes.md`: K8s setup and requirements
   - `openstack.md`: OpenStack setup and permissions

   **Verification**:
   - [ ] Documentation accurate and complete
   - [ ] New users can set up any provider
   - [ ] Troubleshooting section for common issues

---

## Phase 8: Production Readiness

### 8.1 Error Handling & Resilience

**Tasks**:

1. **Implement circuit breaker pattern**
   - Track provider failures
   - Temporary disable failing providers
   - Automatic recovery attempts

2. **Add health check endpoints**
   - `GET /api/health`: Overall health
   - `GET /api/health/providers`: Per-provider health

3. **Improve error messages**
   - Provider-specific error codes
   - User-friendly error messages

   **Verification**:
   - [ ] Single provider failure doesn't break dashboard
   - [ ] Health checks accurate
   - [ ] Error messages helpful

---

### 8.2 Performance Optimization

**Tasks**:

1. **Implement request coalescing**
   - Batch multiple provider requests
   - Reduce API calls to providers

2. **Add response caching**
   - Cache provider responses
   - Configurable TTL per provider

3. **Optimize parallel fetching**
   - Fetch all providers in parallel
   - Timeout handling per provider

   **Verification**:
   - [ ] Dashboard loads quickly
   - [ ] Provider latency doesn't block other providers
   - [ ] Caching reduces API calls

---

### 8.3 Docker & Deployment Updates

**Tasks**:

1. **Update Dockerfile**
   - Include new dependencies
   - Multi-provider config mounting

2. **Update docker-compose example**
   - Volume mounts for configs
   - Environment variable support

3. **Update CI/CD pipeline**
   - Build verification
   - Multi-architecture support if needed

   **Verification**:
   - [ ] Docker build succeeds
   - [ ] Container runs with multi-provider config
   - [ ] CI/CD pipeline passes

---

## Implementation Order & Dependencies

```
Phase 1.1 ──→ Phase 1.2 ──→ Phase 1.3 ──→ Phase 1.4
    │                           │
    └───────────────────────────┼──→ Phase 2.1 ──→ Phase 2.2
                                │
                                └──→ Phase 3.1 ──→ Phase 3.2
                                         │
    ┌────────────────────────────────────┘
    │
    ├──→ Phase 4.1 ──→ Phase 4.2
    │
    ├──→ Phase 5.1 ──→ Phase 5.2
    │
    └──→ Phase 6.1 ──→ Phase 6.2 ──→ Phase 6.3 (optional)
                           │
                           └──→ Phase 7.1 ──→ Phase 7.2
                                    │
                                    └──→ Phase 8.1 ──→ Phase 8.2 ──→ Phase 8.3
```

**Critical Path**: 1.1 → 1.2 → 1.3 → 3.1 → 6.2

**Can be parallelized**:
- Phase 4 (Kubernetes) and Phase 5 (OpenStack) after Phase 3
- Phase 6.1 (Components) while implementing providers
- Phase 7 (Testing/Docs) alongside Phase 6

---

## Verification Checklist Summary

### After Phase 1-2 (Foundation)
- [ ] Proxmox still works exactly as before
- [ ] New provider types compile
- [ ] Config loader handles new format
- [ ] No breaking changes to existing functionality

### After Phase 3 (Unified API)
- [ ] New API routes functional
- [ ] Old API routes still work
- [ ] Hooks fetch from new routes
- [ ] SWR caching works

### After Phase 4 (Kubernetes)
- [ ] K8s clusters appear in dashboard
- [ ] K8s nodes show with resources
- [ ] K8s pods listed as workloads
- [ ] K8s-specific statuses render correctly

### After Phase 5 (OpenStack)
- [ ] OpenStack projects appear in dashboard
- [ ] OpenStack instances listed
- [ ] OpenStack statuses render correctly
- [ ] Works with and without admin access

### After Phase 6 (UI)
- [ ] Dashboard shows all provider types
- [ ] Provider badges visible
- [ ] Navigation works for all providers
- [ ] Responsive design maintained

### After Phase 7-8 (Production)
- [ ] Documentation complete
- [ ] Mock APIs for development
- [ ] Docker deployment works
- [ ] Error handling robust

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing Proxmox functionality | Maintain backward compat layer, extensive testing |
| K8s metrics unavailable | Graceful degradation, show resource requests instead |
| OpenStack admin access required | Support project-level view without hypervisor details |
| Performance degradation with multiple providers | Parallel fetching, per-provider timeouts |
| Configuration complexity | Clear documentation, example configs, validation errors |

---

## Success Criteria

1. **Functional**: All three providers display in unified dashboard
2. **Non-breaking**: Existing Proxmox-only deployments work unchanged
3. **Performant**: Dashboard loads within 2 seconds with all providers
4. **Maintainable**: Clear provider abstraction allows adding new providers
5. **Documented**: Users can configure any provider from documentation

