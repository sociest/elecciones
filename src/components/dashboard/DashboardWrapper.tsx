import React from 'react';
// Force refresh triggered to clear potential stale cache
import EntityDashboard from './Dashboard';

const DashboardWrapper: React.FC = () => {
  return (
    <div data-dashboard-ready="true">
      <EntityDashboard />
    </div>
  );
};

export default DashboardWrapper;
