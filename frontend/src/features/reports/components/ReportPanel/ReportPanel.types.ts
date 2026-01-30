import type { ReactNode } from 'react';

export interface ReportPanelProps {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

