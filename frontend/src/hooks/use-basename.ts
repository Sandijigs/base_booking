import { useEnsName } from 'wagmi';
import { mainnet, base } from 'wagmi/chains';
import { normalize } from 'viem/ens';

/**
 * Hook to fetch Basename (Base Name Service) for an address
 * Basenames are required for WalletConnect Builder Rewards Program
 *
 * @param address - Ethereum address to lookup
 * @returns Basename (.base.eth) or ENS name if available, otherwise shortened address
 */
export function useBasename(address: `0x${string}` | undefined) {
  // Try to get Base name (Base Mainnet - Chain ID 8453)
  const { data: basename, isLoading: basenameLoading } = useEnsName({
    address,
    chainId: base.id, // Base Mainnet
  });

  // Fallback to regular ENS (Mainnet)
  const { data: ensName, isLoading: ensLoading } = useEnsName({
    address,
    chainId: mainnet.id,
  });

  const isLoading = basenameLoading || ensLoading;
  const displayName = basename || ensName;

  // Format address for display (0x1234...5678)
  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return {
    basename,
    ensName,
    displayName: displayName || (address ? formatAddress(address) : ''),
    isLoading,
    hasBasename: !!basename,
    hasEns: !!ensName,
  };
}

/**
 * Hook to check if an address has a Basename (for Builder Rewards eligibility)
 *
 * @param address - Ethereum address to check
 * @returns Boolean indicating if address has a Basename
 */
export function useHasBasename(address: `0x${string}` | undefined) {
  const { hasBasename, isLoading } = useBasename(address);

  return {
    hasBasename,
    isLoading,
  };
}

/**
 * Format a Basename for display with styling
 *
 * @param name - Basename or ENS name
 * @returns Formatted name with .base.eth or .eth suffix highlighted
 */
export function formatBasename(name: string | null | undefined): string {
  if (!name) return '';

  // Already formatted
  if (name.endsWith('.base.eth') || name.endsWith('.eth')) {
    return name;
  }

  return name;
}

/**
 * Hook to get multiple Basenames at once (useful for event organizers list)
 *
 * @param addresses - Array of addresses to lookup
 * @returns Map of addresses to their Basenames
 */
export function useBasenames(addresses: (`0x${string}` | undefined)[]) {
  const results = addresses.map(address => ({
    address,
    ...useBasename(address)
  }));

  return {
    basenames: results,
    isLoading: results.some(r => r.isLoading),
  };
}
