'use client';

import { cn } from '@/lib/utils';
import { Server, Anchor, Cloud } from 'lucide-react';
import type { ProviderType } from '@/lib/providers/types';

interface ProviderBadgeProps {
  provider: ProviderType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const providerConfig: Record<ProviderType, {
  label: string;
  icon: typeof Server;
  colorClasses: string;
}> = {
  proxmox: {
    label: 'Proxmox',
    icon: Server,
    colorClasses: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  },
  kubernetes: {
    label: 'Kubernetes',
    icon: Anchor,
    colorClasses: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  openstack: {
    label: 'OpenStack',
    icon: Cloud,
    colorClasses: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
};

const sizeConfig = {
  sm: {
    container: 'px-1.5 py-0.5 gap-1',
    icon: 'h-3 w-3',
    text: 'text-[10px]',
  },
  md: {
    container: 'px-2 py-1 gap-1.5',
    icon: 'h-3.5 w-3.5',
    text: 'text-xs',
  },
  lg: {
    container: 'px-3 py-1.5 gap-2',
    icon: 'h-4 w-4',
    text: 'text-sm',
  },
};

export function ProviderBadge({ provider, size = 'md', className }: ProviderBadgeProps) {
  const config = providerConfig[provider];
  const sizing = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        config.colorClasses,
        sizing.container,
        className
      )}
    >
      <Icon className={sizing.icon} />
      <span className={sizing.text}>{config.label}</span>
    </span>
  );
}
