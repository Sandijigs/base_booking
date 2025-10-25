"use client";

import { RainbowKitProvider, darkTheme, getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";
import { http } from "viem";
import { Toaster } from "sonner";

const config = getDefaultConfig({
    appName: 'EventBase Ticket',
    appDescription: 'Decentralized event ticketing on Base - Built with WalletConnect & Reown AppKit',
    appUrl: 'https://eventbase.app',
    appIcon: 'https://eventbase.app/EventBase-logo.png',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '1eebe528ca0ce94a99ceaa2e915058d7',
    chains: [baseSepolia, base],
    transports: {
      [baseSepolia.id]: http('https://sepolia.base.org', {
        timeout: 30000,
        retryDelay: 1000,
        retryCount: 3,
        batch: {
          wait: 50,
        },
      }),
      [base.id]: http('https://mainnet.base.org', {
        timeout: 30000,
        retryDelay: 1000,
        retryCount: 3,
        batch: {
          wait: 50,
        },
      })
    },
    ssr: true,
  });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          modalSize="compact" 
          theme={{
            lightMode: lightTheme(),
            darkMode: darkTheme(),
          }}
          // showRecentTransactions={true}
        >
          {children}
          <Toaster position="top-right" richColors />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
