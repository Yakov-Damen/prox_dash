import type { Metadata } from 'next';
import { Rajdhani, Outfit } from 'next/font/google';
import { Toaster } from 'sonner';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import './globals.css';

const rajdhani = Rajdhani({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rajdhani',
});

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Proxmox Dashboard',
  description: 'Centralized Proxmox Cluster Monitoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${rajdhani.variable} ${outfit.variable} font-sans bg-[#030712] text-slate-50 min-h-screen selection:bg-cyan-500/30`}>
        <GlobalErrorBoundary>
          {children}
          <Toaster theme="dark" position="top-right" />
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
