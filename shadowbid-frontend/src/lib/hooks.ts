import { useMemo, useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import { useSolana } from './SolanaProvider';
import { PublicKey } from '@solana/web3.js';

export const useAnchorProvider = () => {
    const { connection } = useConnection();
    const wallet = useWallet();

    return useMemo(() => {
        if (!wallet.publicKey) return null;
        return new AnchorProvider(connection, wallet as any, {
            commitment: 'confirmed',
        });
    }, [connection, wallet]);
};

export const useAuctions = () => {
    const { client } = useSolana();
    const [auctions, setAuctions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAuctions = async () => {
        if (!client) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const data = await client.getAllAuctions();
            setAuctions(data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching auctions:', err);
            setError(err.message || 'Failed to fetch auctions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuctions();

        // Listen for new auctions
        const listenerId = client?.subscribeToAuctionEvents(() => {
            fetchAuctions();
        });


        return () => {
            if (client && listenerId) client.unsubscribe(listenerId);
        };
    }, [client]);

    return { auctions, loading, error, refetch: fetchAuctions };
};


export const useAuction = (auctionPda: PublicKey) => {
    const { client } = useSolana();
    const [auction, setAuction] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAuction = async () => {
            if (!client || !auctionPda) return;
            try {
                setLoading(true);
                const data = await client.getAuction(auctionPda);
                setAuction(data);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching auction:', err);
                setError(err.message || 'Failed to fetch auction');
            } finally {
                setLoading(false);
            }
        };

        fetchAuction();
    }, [client, auctionPda]);

    return { auction, loading, error };
};

export const useAuctionBids = (auctionPda: PublicKey) => {
    const { client } = useSolana();
    const [bids, setBids] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBids = async () => {
            if (!client || !auctionPda) return;
            try {
                setLoading(true);
                const data = await client.getAuctionBids(auctionPda);
                setBids(data);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching bids:', err);
                setError(err.message || 'Failed to fetch bids');
            } finally {
                setLoading(false);
            }
        };

        fetchBids();

        const listenerId = client?.subscribeToBidEvents((event) => {
            if (event.auction.equals(auctionPda)) {
                fetchBids();
            }
        });

        return () => {
            if (client && listenerId) client.unsubscribe(listenerId);
        };
    }, [client, auctionPda]);

    return { bids, loading, error };
};

export const useStartAuction = () => {
    const { client } = useSolana();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startAuction = async (auctionPda: PublicKey) => {
        if (!client) throw new Error('Solana client not initialized');
        setLoading(true);
        setError(null);
        try {
            const result = await client.startAuction(auctionPda);
            return result;
        } catch (err: any) {
            console.error('Error starting auction:', err);
            setError(err.message || 'Failed to start auction');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { startAuction, loading, error };
};

export const useCloseAuction = () => {
    const { client } = useSolana();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const closeAuction = async (auctionPda: PublicKey) => {
        if (!client) throw new Error('Solana client not initialized');
        setLoading(true);
        setError(null);
        try {
            const result = await client.closeAuction({ auctionPda });
            return result;
        } catch (err: any) {
            console.error('Error closing auction:', err);
            setError(err.message || 'Failed to close auction');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { closeAuction, loading, error };
};

export const usePlaceBid = () => {
    const { client } = useSolana();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const placeBid = async (params: {
        auctionPda: PublicKey;
        bidAmount: number;
        tokenMint: PublicKey;
    }) => {
        if (!client) throw new Error('Solana client not initialized');
        setLoading(true);
        setError(null);
        try {
            const result = await client.placeBid(params);
            return result;
        } catch (err: any) {
            console.error('Error placing bid:', err);
            setError(err.message || 'Failed to place bid');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { placeBid, loading, error };
};

export const useCreateAuction = () => {
    const { client } = useSolana();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createAuction = async (params: any) => {
        if (!client) throw new Error('Solana client not initialized');
        setLoading(true);
        setError(null);
        try {
            const result = await client.createAuction(params);
            return result;
        } catch (err: any) {
            console.error('Error creating auction:', err);
            setError(err.message || 'Failed to create auction');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { createAuction, loading, error };
};

export const useUserAuctions = (userPubkey: PublicKey | null) => {
    const { client } = useSolana();
    const [auctions, setAuctions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserAuctions = async () => {
            if (!client || !userPubkey) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const all = await client.getAllAuctions();
                const filtered = all.filter((a: any) => a.account.authority.equals(userPubkey));
                setAuctions(filtered);
                setError(null);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch user auctions');
            } finally {
                setLoading(false);
            }
        };

        fetchUserAuctions();
    }, [client, userPubkey]);

    return { auctions, loading, error };
};

export const useUserBids = (userPubkey: PublicKey | null) => {
    const { client } = useSolana();
    const [bids, setBids] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUserBids = useCallback(async () => {
        if (!client || !userPubkey) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const data = await client.getUserBids(userPubkey);
            setBids(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch user bids');
        } finally {
            setLoading(false);
        }
    }, [client, userPubkey]);

    useEffect(() => {
        fetchUserBids();
    }, [fetchUserBids]);

    return { bids, loading, error, refetch: fetchUserBids };
};

export const useSettleAuction = () => {
    const { client } = useSolana();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const settleAuction = async (auctionPda: PublicKey, tokenMint: PublicKey) => {
        if (!client) throw new Error('Solana client not initialized');
        setLoading(true);
        setError(null);
        try {
            const result = await client.settleAuction({ auctionPda, tokenMint });
            return result;
        } catch (err: any) {
            console.error('Error settling auction:', err);
            setError(err.message || 'Failed to settle auction');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { settleAuction, loading, error };
};

export const useRefundBid = () => {
    const { client } = useSolana();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refundBid = async (auctionPda: PublicKey, bidderPubkey: PublicKey, tokenMint: PublicKey) => {
        if (!client) throw new Error('Solana client not initialized');
        setLoading(true);
        setError(null);
        try {
            const result = await client.refundBid({ auctionPda, bidderPubkey, tokenMint });
            return result;
        } catch (err: any) {
            console.error('Error refunding bid:', err);
            setError(err.message || 'Failed to refund bid');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { refundBid, loading, error };
};