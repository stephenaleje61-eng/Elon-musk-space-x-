import React from 'react';
import { ShieldCheck, ShieldAlert, Clock, ExternalLink, CheckCircle2 } from 'lucide-react';
import { VerificationRecord } from '../types';

interface VerificationBadgeProps {
  record?: VerificationRecord | null;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showDetailsTooltip?: boolean;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  record,
  size = 'md',
  onClick,
  showDetailsTooltip = true,
}) => {
  const isVerified = record?.isVerified === true && record?.status === 'verified';
  const isPending = record?.status === 'pending_audit';

  // Badge size styles
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  if (isVerified) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center font-bold rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm transition-all cursor-pointer border border-blue-500/80 ${sizeClasses}`}
        title={
          showDetailsTooltip
            ? `Verified Legal Owner: ${record.legalOwnerName || 'Independent Entity'} · Source: ${record.verificationProvider || 'Authorized Registry'}`
            : undefined
        }
      >
        <span className="relative flex items-center justify-center">
          <CheckCircle2 className={`${iconSizes} fill-white text-blue-600`} />
        </span>
        <span className="tracking-tight">Verified Owner</span>
        {record?.verificationDate && size !== 'sm' && (
          <span className="text-[10px] opacity-80 font-mono hidden sm:inline">
            · {record.verificationDate}
          </span>
        )}
      </button>
    );
  }

  // Pending / In Review Status
  if (isPending) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center font-semibold rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 transition-all cursor-pointer ${sizeClasses}`}
        title="Authentic ownership documentation submitted. Awaiting independent third-party audit."
      >
        <Clock className={`${iconSizes} text-amber-400 shrink-0`} />
        <span>Verification Pending</span>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
      </button>
    );
  }

  // Default: Unverified status (never claim false endorsement)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center font-medium rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 transition-all cursor-pointer ${sizeClasses}`}
      title="Ownership verification requires independent authorized validation."
    >
      <ShieldAlert className={`${iconSizes} text-zinc-500 shrink-0`} />
      <span>Awaiting Third-Party Audit</span>
    </button>
  );
};
