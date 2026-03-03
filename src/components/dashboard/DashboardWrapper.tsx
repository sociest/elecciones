import React from 'react';
import EntityDashboard from './Dashboard';

const DashboardWrapper: React.FC = () => {
  return (
    <div data-dashboard-ready="true">
      <EntityDashboard />
    </div>
  );
};

export default DashboardWrapper;
