"use client"

import { useAccount } from 'wagmi';
import { useBasename } from '@/hooks/use-basename';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Award, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

/**
 * Builder Rewards Banner Component
 *
 * Displays WalletConnect Builder Rewards Program eligibility status
 * Shows whether user has a Basename and is eligible for rewards
 */
export function BuilderRewardsBanner() {
  const { address, isConnected } = useAccount();
  const { hasBasename, basename, isLoading } = useBasename(address);

  if (!isConnected) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/30 mb-6">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Award className="h-8 w-8 text-purple-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">
                WalletConnect Builder Rewards
              </h3>
              <Badge variant="outline" className="bg-purple-500/20 border-purple-500/50 text-purple-300">
                Active Integration
              </Badge>
            </div>

            <p className="text-sm text-slate-300 mb-3">
              EventBase is integrated with the WalletConnect Builder Rewards Program.
              Earn weekly rewards by building on Base!
            </p>

            {/* Eligibility Checklist */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {/* WalletConnect Integration */}
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                <span className="text-slate-300">WalletConnect Integration</span>
              </div>

              {/* Verified Contracts */}
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                <span className="text-slate-300">Verified Contracts on Base</span>
              </div>

              {/* Basename Status */}
              <div className="flex items-center gap-2 text-sm">
                {isLoading ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 animate-pulse" />
                    <span className="text-slate-300">Checking Basename...</span>
                  </>
                ) : hasBasename ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span className="text-slate-300">
                      Basename: <span className="text-green-400 font-medium">{basename}</span>
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-orange-400 flex-shrink-0" />
                    <span className="text-slate-300">No Basename detected</span>
                  </>
                )}
              </div>

              {/* Builder Score */}
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                <span className="text-slate-300">
                  Builder Score: <Link
                    href="https://www.talentprotocol.com/"
                    target="_blank"
                    className="text-purple-400 hover:text-purple-300 underline"
                  >
                    Check on Talent
                  </Link>
                </span>
              </div>
            </div>

            {/* Call to Action */}
            <div className="flex flex-wrap gap-3">
              {!hasBasename && (
                <Link
                  href="https://www.base.org/names"
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
                >
                  <span>Register Basename</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}

              <Link
                href="https://www.talentprotocol.com/"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                <span>Check Builder Score</span>
                <ExternalLink className="h-3 w-3" />
              </Link>

              <Link
                href="/resources"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
              >
                <span>Learn More</span>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact Builder Rewards Status Badge
 * For use in header or smaller spaces
 */
export function BuilderRewardsStatusBadge() {
  const { address, isConnected } = useAccount();
  const { hasBasename, isLoading } = useBasename(address);

  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500/50 text-yellow-300">
        <AlertCircle className="h-3 w-3 mr-1" />
        Checking...
      </Badge>
    );
  }

  if (hasBasename) {
    return (
      <Badge
        variant="outline"
        className="bg-green-500/20 border-green-500/50 text-green-300"
        title="Basename owner - Eligible for WalletConnect Builder Rewards"
      >
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Builder Rewards Eligible
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-orange-500/20 border-orange-500/50 text-orange-300"
      title="Register a Basename to qualify for Builder Rewards"
    >
      <AlertCircle className="h-3 w-3 mr-1" />
      Get Basename
    </Badge>
  );
}
