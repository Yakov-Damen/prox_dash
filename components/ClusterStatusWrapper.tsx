import { useCluster } from '@/lib/hooks';
import { ClusterSummaryCard } from '@/components/ClusterSummaryCard';
import { GradientCard } from '@/components/GradientCard';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a utils file

export function ClusterStatusWrapper({ clusterName }: { clusterName: string }) {
  const { data: cluster, loading, error } = useCluster(clusterName);

  if (loading) {
    return (
      <GradientCard className="h-full flex flex-col justify-center items-center min-h-[300px]">
        <RefreshCw size={32} className="animate-spin text-slate-600 mb-4" />
        <p className="text-slate-500 text-sm">Loading {clusterName}...</p>
      </GradientCard>
    );
  }

  if (error || (cluster && cluster.error)) {
    return (
      <GradientCard className="h-full flex flex-col justify-center items-center min-h-[300px] border-red-900/20 bg-red-950/10">
        <div className="p-3 rounded-full bg-red-500/10 text-red-500 mb-4">
           <AlertTriangle size={24} />
        </div>
        <h3 className="text-xl font-bold text-slate-300 mb-2">{clusterName}</h3>
        <p className="text-slate-500 text-sm mb-4 px-6 text-center">
            {error ? error.message : cluster?.error || 'Failed to connection to cluster'}
        </p>
      </GradientCard>
    );
  }

  if (!cluster) {
      return null;
  }

  return <ClusterSummaryCard cluster={cluster} />;
}
