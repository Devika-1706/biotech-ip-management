import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({
  message = 'Loading platform records...',
}) => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <span>{message}</span>
    </div>
  );
};
