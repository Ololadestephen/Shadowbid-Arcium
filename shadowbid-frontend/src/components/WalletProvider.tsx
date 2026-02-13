import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
    // Check if we should use localnet
    const useLocalnet = import.meta.env.VITE_USE_LOCALNET === 'true';

    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = useLocalnet ? 'localnet' : WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => {
        if (useLocalnet) return 'http://127.0.0.1:8899';
        if (import.meta.env.VITE_RPC_URL) return import.meta.env.VITE_RPC_URL;
        return clusterApiUrl(network as WalletAdapterNetwork);
    }, [useLocalnet, network]);

    console.log(`[ShadowBid] Connected to ${network} via ${endpoint} (VITE_USE_LOCALNET: ${import.meta.env.VITE_USE_LOCALNET})`);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <SolanaWalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </SolanaWalletProvider>
        </ConnectionProvider>
    );
};
