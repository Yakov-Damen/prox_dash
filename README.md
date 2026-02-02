# Proxmox Central Dashboard

A unified dashboard for managing and monitoring Proxmox clusters. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Cluster Overview**: View all your Proxmox clusters in one place
- **Node Monitoring**: Real-time CPU, memory, and status monitoring
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Clean, dark-themed interface with gradient accents
- **Real-time Updates**: Auto-refreshing data with manual refresh option

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Lucide React icons
- **Data Fetching**: SWR for server-state management
- **Charts**: Recharts for data visualization

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd prox_dash
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/                    # API routes for Proxmox integration
│   ├── cluster/                # Cluster detail pages
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Dashboard home page
├── components/                 # Reusable UI components
├── lib/                       # Utilities and hooks
│   ├── hooks/                 # Custom React hooks
│   ├── proxmox.ts             # Proxmox API integration
│   └── utils.ts               # Utility functions
└── package.json
```

## Configuration

The application connects to Proxmox clusters through API routes. Ensure your Proxmox instances have the API enabled and proper network access configured.

## Build & Deploy

```bash
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
