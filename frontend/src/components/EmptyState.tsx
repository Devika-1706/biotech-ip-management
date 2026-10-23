import React from 'react';
import { FolderX } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are currently no items matching your criteria in this section.',
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || <FolderX size={28} />}</div>
      <h4 className="empty-title">{title}</h4>
      <p className="empty-description">{description}</p>
      {actionText && onAction && (
        <button className="btn btn-primary btn-sm" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
};
