import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeClass = (s: string) => {
    switch (s?.toLowerCase()) {
      // Success states
      case 'granted':
      case 'active':
      case 'approved':
      case 'completed':
      case 'converted to patent':
      case 'low':
        return 'badge-success';

      // Warning states
      case 'under review':
      case 'under examination':
      case 'negotiation':
      case 'in progress':
      case 'medium':
        return 'badge-warning';

      // Danger states
      case 'critical':
      case 'high':
      case 'overdue':
      case 'rejected':
      case 'expired':
      case 'terminated':
        return 'badge-danger';

      // Info states
      case 'planning':
      case 'filed':
      case 'prepared':
      case 'submitted':
      case 'proposed':
        return 'badge-info';

      // Purple states
      case 'draft':
      case 'on hold':
        return 'badge-purple';

      default:
        return 'badge-neutral';
    }
  };

  return <span className={`badge ${getBadgeClass(status)}`}>{status}</span>;
};
