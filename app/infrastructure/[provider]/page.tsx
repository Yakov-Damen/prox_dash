'use client';

import { useParams } from 'next/navigation';
import { useInfrastructure } from '@/lib/hooks';
import { ClusterSummaryCard } from '@/components/ClusterSummaryCard';
import { ProviderType } from '@/lib/providers/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const ProviderTitles: Record<string, string> = {
  proxmox: 'Proxmox Virtualization',
  kubernetes: 'Kubernetes Clusters',
  openstack: 'OpenStack Cloud',
};

export default function ProviderInfrastructurePage() {
  const params = useParams();
  const provider = params.provider as ProviderType;
  
  // Fetch clusters specific to this provider
  const { data: clusters, loading, error } = useInfrastructure(provider);
  
  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg">
          Failed to load infrastructure data: {error.message}
        </div>
      </div>
    );
  }

  const title = ProviderTitles[provider] || `${provider} Infrastructure`;

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-indigo-400">
              {title}
            </h1>
            <p className="text-slate-400 mt-1">
              {clusters.length} Cluster{clusters.length !== 1 ? 's' : ''} Online
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clusters.map((cluster) => (
            <div key={cluster.name} className="h-64">
              <ClusterSummaryCard cluster={cluster} />
            </div>
          ))}
          
          {clusters.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              No clusters found for this provider.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
