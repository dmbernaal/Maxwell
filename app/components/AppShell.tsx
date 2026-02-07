'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { GlobalCommandBar } from './GlobalCommandBar';

interface AppShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export default function AppShell({ children, showHeader = true }: AppShellProps) {
  const pathname = usePathname();
  const isMarketDetail = pathname?.startsWith('/markets/');
  const shouldShowHeader = showHeader && !isMarketDetail;

  return (
    <>
      {shouldShowHeader && <GlobalCommandBar />}
      {children}
    </>
  );
}
