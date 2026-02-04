// Status color mappings for all providers
// Supports: Proxmox, Kubernetes, OpenStack

type StatusCategory = 'success' | 'warning' | 'error' | 'neutral' | 'info';

// Map all known statuses to categories
const statusCategories: Record<string, StatusCategory> = {
  // ============================================================================
  // Proxmox Statuses
  // ============================================================================
  'online': 'success',
  'running': 'success',
  'offline': 'neutral',
  'stopped': 'neutral',
  'paused': 'warning',
  'unknown': 'warning',

  // ============================================================================
  // Kubernetes Statuses
  // ============================================================================
  // Node conditions
  'ready': 'success',
  'Ready': 'success',
  'notready': 'error',
  'not-ready': 'error',
  'NotReady': 'error',

  // Pod/workload statuses
  'Pending': 'warning',
  'pending': 'warning',
  'Running': 'success',
  'Succeeded': 'success',
  'succeeded': 'success',
  'Failed': 'error',
  'failed': 'error',
  'CrashLoopBackOff': 'error',
  'crashloopbackoff': 'error',
  'ImagePullBackOff': 'error',
  'imagepullbackoff': 'error',
  'ContainerCreating': 'info',
  'containercreating': 'info',
  'Terminating': 'warning',
  'terminating': 'warning',
  'Evicted': 'error',
  'evicted': 'error',
  'Completed': 'success',
  'completed': 'success',
  'Error': 'error',
  'error': 'error',

  // Deployment/ReplicaSet statuses
  'Available': 'success',
  'Progressing': 'info',
  'ReplicaFailure': 'error',

  // ============================================================================
  // OpenStack Statuses
  // ============================================================================
  // Instance statuses (Nova)
  'ACTIVE': 'success',
  'active': 'success',
  'BUILD': 'info',
  'build': 'info',
  'REBUILD': 'info',
  'rebuild': 'info',
  'STOPPED': 'neutral',
  'SHUTOFF': 'neutral',
  'shutoff': 'neutral',
  'PAUSED': 'warning',
  'SUSPENDED': 'warning',
  'suspended': 'warning',
  'RESCUE': 'warning',
  'rescue': 'warning',
  'RESIZE': 'info',
  'resize': 'info',
  'VERIFY_RESIZE': 'info',
  'verify_resize': 'info',
  'REVERT_RESIZE': 'info',
  'revert_resize': 'info',
  'REBOOT': 'info',
  'reboot': 'info',
  'HARD_REBOOT': 'warning',
  'hard_reboot': 'warning',
  'MIGRATING': 'info',
  'migrating': 'info',
  'SHELVED': 'neutral',
  'shelved': 'neutral',
  'SHELVED_OFFLOADED': 'neutral',
  'shelved_offloaded': 'neutral',
  'ERROR': 'error',
  'DELETED': 'neutral',
  'deleted': 'neutral',
  'SOFT_DELETED': 'neutral',
  'soft_deleted': 'neutral',

  // Hypervisor/host statuses
  'up': 'success',
  'down': 'error',
  'enabled': 'success',
  'disabled': 'warning',

  // ============================================================================
  // Unified Statuses (from types.ts)
  // ============================================================================
  'maintenance': 'warning',
};

function getStatusCategory(status: string): StatusCategory {
  return statusCategories[status] || statusCategories[status.toLowerCase()] || 'neutral';
}

export function getStatusColor(status: string, variant: 'badge' | 'text' | 'bg' = 'badge'): string {
  const category = getStatusCategory(status);

  const colors: Record<StatusCategory, { badge: string; text: string; bg: string }> = {
    success: {
      badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      text: 'text-emerald-400',
      bg: 'bg-emerald-500',
    },
    warning: {
      badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      text: 'text-amber-400',
      bg: 'bg-amber-500',
    },
    error: {
      badge: 'bg-red-500/10 text-red-400 border border-red-500/20',
      text: 'text-red-400',
      bg: 'bg-red-500',
    },
    info: {
      badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      text: 'text-blue-400',
      bg: 'bg-blue-500',
    },
    neutral: {
      badge: 'bg-slate-800 text-slate-500 border border-slate-700',
      text: 'text-slate-500',
      bg: 'bg-slate-500',
    },
  };

  return colors[category][variant];
}

// Get a human-friendly status label
export function getStatusLabel(status: string): string {
  const labelMap: Record<string, string> = {
    // Kubernetes
    'CrashLoopBackOff': 'Crash Loop',
    'ImagePullBackOff': 'Image Pull Error',
    'ContainerCreating': 'Creating',
    'not-ready': 'Not Ready',
    'NotReady': 'Not Ready',

    // OpenStack
    'SHUTOFF': 'Stopped',
    'VERIFY_RESIZE': 'Verifying Resize',
    'REVERT_RESIZE': 'Reverting Resize',
    'HARD_REBOOT': 'Hard Rebooting',
    'SHELVED_OFFLOADED': 'Shelved',
    'SOFT_DELETED': 'Deleted',
  };

  return labelMap[status] || status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatBytesPair(used: number, total: number): string {
  if (total === 0) return '0 / 0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  // Determine unit based on total
  const i = Math.floor(Math.log(total) / Math.log(k));

  const usedVal = parseFloat((used / Math.pow(k, i)).toFixed(1));
  const totalVal = parseFloat((total / Math.pow(k, i)).toFixed(1));

  return `${usedVal} / ${totalVal} ${sizes[i] || 'B'}`;
}

export function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '-';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
