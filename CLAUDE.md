# CLAUDE.md - AI Assistant Guide for prox_dash

## Project Overview

**prox_dash** is a unified dashboard for managing and monitoring Proxmox virtualization clusters. It provides real-time visibility into cluster health, node status, and virtual machines/containers across multiple Proxmox environments.

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
- **Charts**: Recharts (available but minimal current usage)
- **Error Handling**: react-error-boundary

## Directory Structure

```
prox_dash/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── mock-proxmox/         # Mock Proxmox API for development
│   │   └── proxmox/              # Real Proxmox API routes
│   ├── cluster/[name]/           # Cluster detail pages
│   │   └── node/[node]/          # Node detail pages
│   ├── globals.css               # Global Tailwind imports
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Dashboard home page
├── components/                   # Reusable UI components
│   ├── GlobalErrorBoundary.tsx   # App-wide error boundary
│   ├── GradientCard.tsx          # Styled card component
│   ├── ResourceBar.tsx           # CPU/Memory/Disk usage bars
│   └── StatusBadge.tsx           # Status indicator badges
├── lib/                          # Utilities and business logic
│   ├── api-utils.ts              # Request logging wrapper
│   ├── constants.ts              # App-wide constants
│   ├── hooks.ts                  # Custom React hooks (SWR wrappers)
│   ├── logger.ts                 # Pino logger configuration
│   ├── proxmox.ts                # Proxmox API client and types
│   ├── schemas.ts                # Zod validation schemas
│   ├── status-utils.ts           # Status colors and formatters
│   └── utils.ts                  # General utilities (cn helper)
├── proxmox_config.json           # Cluster configuration file
├── hardware_inventory.json       # Optional hardware metadata
├── Dockerfile                    # Multi-stage production build
└── .github/workflows/            # CI/CD pipelines
```

## Architecture Patterns

### Data Flow
1. **Client pages** use SWR hooks from `lib/hooks.ts` to fetch data
2. **API routes** (`app/api/proxmox/`) call functions in `lib/proxmox.ts`
3. **Proxmox client** validates responses with Zod schemas from `lib/schemas.ts`
4. **Logging** is handled via `withLogger` wrapper in `lib/api-utils.ts`

### Page Structure
- `/` - Dashboard home showing all clusters
- `/cluster/[name]` - Cluster detail showing all nodes
- `/cluster/[name]/node/[node]` - Node detail showing VMs/containers

### API Routes
- `GET /api/proxmox` - All clusters status
- `GET /api/proxmox/cluster/[name]` - Single cluster status
- `GET /api/proxmox/cluster/[name]/node/[node]` - Single node status
- `GET /api/proxmox/cluster/[name]/node/[node]/vms` - Node VMs/containers

### Mock API
Routes under `app/api/mock-proxmox/` simulate Proxmox API responses for development without a real cluster.

## Key Configuration Files

### proxmox_config.json
Array of cluster configurations:
```json
[
  {
    "name": "Cluster Name",
    "url": "https://proxmox-host:8006",
    "tokenId": "user@pam!token-name",
    "tokenSecret": "uuid-token-secret",
    "allowInsecure": true  // Optional: skip TLS verification
  }
]
```

### hardware_inventory.json (Optional)
Provides hardware metadata not available via Proxmox API:
```json
{
  "cluster-name": {
    "node-name": {
      "manufacturer": "Dell Inc.",
      "productName": "PowerEdge R640"
    }
  }
}
```

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Coding Conventions

### TypeScript
- Strict mode enabled
- Use explicit types for function parameters and returns
- Prefer interfaces over type aliases for object shapes
- Use Zod for runtime validation of external data

### React/Next.js
- Use `'use client'` directive only when needed (hooks, interactivity)
- Pages are server components by default
- Use `useParams()` for dynamic route parameters
- SWR hooks handle all data fetching with auto-refresh

### Styling
- Tailwind CSS exclusively (no CSS modules)
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- Dark theme only (slate-950 background)
- Consistent color palette:
  - Primary: indigo-500
  - Success: emerald-500
  - Warning: amber-500
  - Error: red-500

### Components
- Keep components in `components/` directory
- Use TypeScript interfaces for props
- Prefer composition over prop drilling
- Components should be self-contained and reusable

### API Routes
- Always use `export const dynamic = 'force-dynamic'` for real-time data
- Wrap handlers with `withLogger()` for consistent request logging
- Validate all Proxmox API responses with Zod schemas
- Return proper HTTP status codes and error messages

### Error Handling
- Use try/catch in async functions
- Log errors with context using Pino logger
- Return user-friendly error messages
- GlobalErrorBoundary catches unhandled React errors

## Important Patterns

### SWR Data Fetching
```typescript
const { data, loading, error, refresh } = useClusterList();
```
- All hooks return consistent shape
- Auto-refresh every 10 seconds (POLLING_INTERVAL)
- Toast notifications on errors

### Resource Display
```typescript
formatBytes(bytes)           // "1.5 GB"
formatBytesPair(used, total) // "1.5 / 4 GB"
```

### Status Colors
```typescript
getStatusColor('online', 'badge')  // Badge styling
getStatusColor('running', 'text')  // Text color only
getStatusColor('offline', 'bg')    // Background color only
```

## Docker Deployment

The Dockerfile uses multi-stage builds optimized for Next.js standalone output:
1. **deps** - Install dependencies
2. **builder** - Build the application
3. **runner** - Minimal production image

Build and run:
```bash
docker build -t prox-dash .
docker run -p 3000:3000 -v ./proxmox_config.json:/app/proxmox_config.json prox-dash
```

## CI/CD

GitHub Actions workflow (`.github/workflows/docker-publish.yml`):
- Triggers on push to `main` branch
- Builds and pushes to Docker Hub (`yakovda/prox-dash`)
- Tags: `latest` and git SHA

## Common Tasks

### Adding a New Cluster
1. Edit `proxmox_config.json` with new cluster details
2. Restart the application to reload configuration

### Adding a New API Endpoint
1. Create route file in `app/api/proxmox/` following existing patterns
2. Add Zod schema in `lib/schemas.ts` if needed
3. Add helper function in `lib/proxmox.ts`
4. Create SWR hook in `lib/hooks.ts`

### Adding a New Component
1. Create file in `components/` directory
2. Use TypeScript interface for props
3. Import and use `cn()` for conditional styling
4. Follow existing component patterns

### Modifying the UI Theme
- Colors defined in Tailwind classes throughout components
- Common colors in `lib/constants.ts`
- Status-specific colors in `lib/status-utils.ts`

## Testing Notes

- No test framework currently configured
- Mock API available for local development testing
- Use `npm run lint` to catch TypeScript and ESLint issues

## Security Considerations

- API tokens stored in `proxmox_config.json` (keep out of version control in production)
- `allowInsecure: true` bypasses TLS verification (use only for self-signed certs)
- No authentication layer on the dashboard itself (add reverse proxy auth in production)

## Performance Notes

- SWR provides request deduplication and caching
- Standalone Next.js output minimizes production bundle size
- API responses validated but not deeply transformed (minimal overhead)
- Polling interval configurable via `POLLING_INTERVAL` constant (default: 10s)
