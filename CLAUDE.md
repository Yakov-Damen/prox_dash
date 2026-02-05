# CLAUDE.md - AI Assistant Guide for prox_dash

## Project Overview

**prox_dash** is a unified infrastructure management platform. Originally a Proxmox-only dashboard, it now abstracts the underlying infrastructure to support multiple providers:
- **Proxmox VE**: VM/CT management, node health.
- **Kubernetes**: Cluster status, node health, pod workloads.
- **OpenStack**: Instance management, hypervisor monitoring (admin).

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 22
- **Styling**: Tailwind CSS v4
- **UI Components**: Lucide React icons
- **Data Fetching**: SWR for client-side caching and auto-refresh
- **Validation**: Zod schemas for API response validation
- **Logging**: Pino with pretty-print in development
- **Notifications**: Sonner for toast notifications

## Directory Structure

```
prox_dash/
├── app/
│   ├── api/
│   │   ├── infrastructure/       # Unified API routes (multi-provider)
│   │   ├── proxmox/              # Legacy Proxmox routes (deprecated)
│   │   └── mock-proxmox/         # Mock data
│   ├── cluster/[name]/           # Provider-agnostic cluster view
│   │   └── node/[node]/          # Provider-agnostic node view
│   ├── page.tsx                  # Dashboard home
│   └── layout.tsx                # Root layout
├── components/
│   ├── ClusterCard.tsx           # Unified cluster display
│   ├── NodeCard.tsx              # Unified node display
│   ├── ProviderBadge.tsx         # Provider type indicator
│   └── WorkloadTable.tsx         # Use abstract "Workload" type (VM/Pod/Instance)
├── lib/
│   ├── config/                   # Configuration loader
│   ├── providers/                # Provider Abstraction Layer
│   │   ├── kubernetes/           # K8s implementation
│   │   ├── openstack/            # OpenStack implementation
│   │   ├── proxmox/              # Proxmox implementation
│   │   ├── index.ts              # Provider factory
│   │   └── types.ts              # Unified domain types
│   └── hooks.ts                  # Unified SWR hooks
├── docs/
│   └── providers/                # Provider-specific documentation
├── infrastructure_config.json    # Main configuration
└── Dockerfile                    # Production build
```

## Architecture: Provider Abstraction

The core of the system is the `InfraProvider` interface (`lib/providers/types.ts`). All providers implement:
- `getClusters()`: Return standardized cluster status.
- `getNode()`: Return standardized node health/resources.
- `getWorkloads()`: Return standardized list of workloads.

Data flows from: `Config -> Provider Factory -> Specific Provider -> Unified API -> SWR Hooks -> UI Components`.

## Key Configuration

### infrastructure_config.json
New unified configuration format replacing `proxmox_config.json`.
Supports mixed provider types in a single array.

```json
[
  {
    "name": "Home Lab",
    "type": "proxmox",
    "url": "...",
    "tokenId": "..."
  },
  {
    "name": "K8s Prod",
    "type": "kubernetes",
    "kubeConfigPath": "..."
  }
]
```

See `docs/providers/` for detailed configuration options per provider.

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Coding Conventions

### Unified Types
- ALWAYS use types from `lib/providers/types.ts` (`ClusterStatus`, `NodeStatus`, `Workload`) in UI components.
- Do NOT use provider-specific types (e.g., `ProxmoxNode`) in shared components.
- Use `providerData` field in unified types for provider-specific extras (handle gracefully if missing).

### API & Hooks
- Use `useInfrastructure()` hook for dashboard data.
- Use `/api/infrastructure` endpoints.
- Avoid adding new routes to `/api/proxmox` (keep for legacy compat only).

### Styling
- Tailwind CSS v4.
- Dark theme default (slate-950).
- Use `ProviderBadge` to distinguish resources visually.

## Docker Deployment

```bash
docker build -t prox-dash .
docker run -p 3000:3000 -v ./infrastructure_config.json:/app/infrastructure_config.json prox-dash
```
