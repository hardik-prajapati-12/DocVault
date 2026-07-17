import React from 'react';
import { DashboardCharts } from '@/components/dashboard';

const DashboardPage: React.FC = () => {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Overview of your document vault
        </p>
      </div>
      <DashboardCharts />
    </div>
  );
};

export default DashboardPage;
