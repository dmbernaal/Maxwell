'use client';

import React from 'react';
import Header from './Header';

interface AppShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export default function AppShell({ children, showHeader = true }: AppShellProps) {
  return (
    <>
      {showHeader && <Header />}
      {children}
    </>
  );
}
