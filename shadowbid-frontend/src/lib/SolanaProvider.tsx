import React, { createContext, useContext, useMemo } from 'react';
import { useAnchorProvider } from './hooks';
import { ShadowBidClient } from './shadowbid-sdk';
import { PublicKey } from '@solana/web3.js';

// Replace with your actual program ID
const DEFAULT_PROGRAM_ID = 'EkfGifLr2z1zyVsqBWekmRnzGcfy45KzdNpSZbFm4yuy';
export const SHADOWBID_PROGRAM_ID = new PublicKey(
    import.meta.env.VITE_PROGRAM_ID || DEFAULT_PROGRAM_ID
);

interface SolanaContextState {
    client: ShadowBidClient | null;
}

const SolanaContext = createContext<SolanaContextState>({
    client: null,
});

export const useSolana = () => useContext(SolanaContext);

export const SolanaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const provider = useAnchorProvider();

    const client = useMemo(() => {
        if (!provider) return null;
        return new ShadowBidClient(provider, SHADOWBID_PROGRAM_ID);
    }, [provider]);

    return (
        <SolanaContext.Provider value={{ client }}>
            {children}
        </SolanaContext.Provider>
    );
};
