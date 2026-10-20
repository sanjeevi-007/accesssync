import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Wifi,
  WifiOff,
  CircleSlash,
  Check,
  X,
} from 'lucide-react';

export type StatusType =
  | 'pass'
  | 'needs_improvement'
  | 'fail'
  | 'not_assessed'
  | 'online'
  | 'offline'
  | 'never_connected'
  | 'active'
  | 'inactive'
  | string;

export const StatusBadge: React.FC<{ status: StatusType; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status.toLowerCase()) {
    case 'pass':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-[var(--color-success)] border border-emerald-200 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Pass</span>
        </span>
      );

    case 'needs_improvement':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-[var(--color-warning)] border border-amber-200 ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Needs Improvement</span>
        </span>
      );

    case 'fail':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-red-50 text-[var(--color-danger)] border border-red-200 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Fail</span>
        </span>
      );

    case 'not_assessed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-[var(--color-neutral)] border border-gray-300 ${className}`}
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Not Assessed</span>
        </span>
      );

    case 'online':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-[var(--color-success)] border border-emerald-200 ${className}`}
        >
          <Wifi className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Online</span>
        </span>
      );

    case 'offline':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-red-50 text-[var(--color-danger)] border border-red-200 ${className}`}
        >
          <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Offline</span>
        </span>
      );

    case 'never_connected':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-[var(--color-neutral)] border border-gray-300 ${className}`}
        >
          <CircleSlash className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Never connected</span>
        </span>
      );

    case 'active':
    case 'true':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-[var(--color-success)] border border-emerald-200 ${className}`}
        >
          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Active</span>
        </span>
      );

    case 'inactive':
    case 'false':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 ${className}`}
        >
          <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Inactive</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 ${className}`}
        >
          <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="capitalize">{status}</span>
        </span>
      );
  }
};
