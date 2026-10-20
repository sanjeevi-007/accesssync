import React from 'react';
import { Tag } from 'lucide-react';

export const SampleBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 ${className}`}
      title="Sample demonstration data"
    >
      <Tag className="w-3 h-3 text-amber-800 shrink-0" aria-hidden="true" />
      <span>Sample</span>
    </span>
  );
};
