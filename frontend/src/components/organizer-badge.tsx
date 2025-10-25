"use client"

import { useBasename } from '@/hooks/use-basename';
import { User } from 'lucide-react';

interface OrganizerBadgeProps {
  address: string | `0x${string}`;
  className?: string;
  showIcon?: boolean;
}

/**
 * OrganizerBadge Component
 *
 * Displays event organizer's Basename (if they have one) or shortened address
 * Shows a verification badge if organizer has a Basename (eligible for Builder Rewards)
 */
export function OrganizerBadge({ address, className = '', showIcon = true }: OrganizerBadgeProps) {
  const { displayName, hasBasename, isLoading } = useBasename(address as `0x${string}`);

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-slate-400 ${className}`}>
        {showIcon && <User className="h-4 w-4" />}
        <span className="animate-pulse">Loading organizer...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {showIcon && <User className="h-4 w-4 text-blue-400 flex-shrink-0" />}
      <span className="text-slate-300">
        Organizer:{' '}
        <span className={hasBasename ? 'text-blue-400 font-medium' : 'text-slate-400'}>
          {displayName}
        </span>
        {hasBasename && (
          <span className="ml-1 text-green-400" title="Verified Basename - Builder Rewards Participant">
            ✓
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Compact organizer display for smaller spaces
 */
export function OrganizerName({ address, className = '' }: Omit<OrganizerBadgeProps, 'showIcon'>) {
  const { displayName, hasBasename, isLoading } = useBasename(address as `0x${string}`);

  if (isLoading) {
    return <span className={`text-slate-400 animate-pulse ${className}`}>Loading...</span>;
  }

  return (
    <span className={`${hasBasename ? 'text-blue-400' : 'text-slate-400'} ${className}`}>
      {displayName}
      {hasBasename && (
        <span className="ml-1 text-green-400 text-xs" title="Verified Basename">
          ✓
        </span>
      )}
    </span>
  );
}
