import { PublicKey } from '@solana/web3.js';
import { formatDistanceToNow } from 'date-fns';

// Format wallet address
export const formatAddress = (address: string | PublicKey, chars = 4): string => {
    const addressString = typeof address === 'string' ? address : address.toBase58();
    return `${addressString.slice(0, chars)}...${addressString.slice(-chars)}`;
};

// Format SOL amount
export const formatSOL = (lamports: number): string => {
    const sol = lamports / 1_000_000_000;
    return `${sol.toLocaleString()} SOL`;
};

// Format time remaining
export const formatTimeRemaining = (endTime: Date | number): string => {
    const end = typeof endTime === 'number' ? new Date(endTime * 1000) : endTime;
    const now = new Date();

    if (end < now) {
        return 'Ended';
    }

    const diff = end.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
};

// Format relative time
export const formatRelativeTime = (date: Date | number): string => {
    const dateObj = typeof date === 'number' ? new Date(date * 1000) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
};

// Get auction status
export const getAuctionStatus = (auction: any): 'pending' | 'active' | 'closed' | 'cancelled' => {
    if (!auction || !auction.status) return 'pending';

    const statusKeys = Object.keys(auction.status);
    if (statusKeys.length === 0) return 'pending';

    return statusKeys[0] as 'pending' | 'active' | 'closed' | 'cancelled';
};

// Check if auction is live
export const isAuctionLive = (auction: any): boolean => {
    const status = getAuctionStatus(auction);
    const now = Date.now() / 1000;

    return (
        status === 'active' &&
        now >= auction.startTime.toNumber() &&
        now < auction.endTime.toNumber()
    );
};

// Check if auction is ending soon (< 1 hour)
export const isAuctionEndingSoon = (auction: any): boolean => {
    const now = Date.now() / 1000;
    const endTime = auction.endTime.toNumber();
    const timeLeft = endTime - now;

    return timeLeft > 0 && timeLeft < 3600; // Less than 1 hour
};

// Check if auction is new (created in last 24 hours)
export const isAuctionNew = (_auction: any): boolean => {
    // This would require a createdAt timestamp in the auction account
    // For now, we'll just return false
    return false;
};

// Check if auction is hot (many bids)
export const isAuctionHot = (auction: any): boolean => {
    return auction.totalBids > 10;
};

// Get badge type for auction
export const getAuctionBadge = (auction: any): 'live' | 'hot' | 'ending' | 'new' | null => {
    if (isAuctionLive(auction)) {
        if (isAuctionEndingSoon(auction)) return 'ending';
        if (isAuctionHot(auction)) return 'hot';
        return 'live';
    }

    if (isAuctionNew(auction)) return 'new';

    return null;
};

// Convert SOL to lamports
export const solToLamports = (sol: number): number => {
    return Math.floor(sol * 1_000_000_000);
};

// Convert lamports to SOL
export const lamportsToSol = (lamports: number): number => {
    return lamports / 1_000_000_000;
};

// Validate bid amount
export const validateBidAmount = (
    bidAmount: string,
    reservePrice: number,
    _minimumIncrement: number = 0.1
): { valid: boolean; error?: string } => {
    const amount = parseFloat(bidAmount);

    if (isNaN(amount) || amount <= 0) {
        return { valid: false, error: 'Please enter a valid bid amount' };
    }

    const reserveInSOL = lamportsToSol(reservePrice);

    if (amount < reserveInSOL) {
        return { valid: false, error: `Bid must be at least ${reserveInSOL} SOL` };
    }

    return { valid: true };
};

// Generate auction ID
export const generateAuctionId = (): number => {
    return Date.now();
};

// Check if user is auction creator
export const isAuctionCreator = (auction: any, userPubkey: PublicKey | null): boolean => {
    if (!userPubkey || !auction) return false;
    return auction.authority.equals(userPubkey);
};

// Check if user has bid on auction
export const hasUserBid = (bids: any[], userPubkey: PublicKey | null): boolean => {
    if (!userPubkey || !bids) return false;
    return bids.some((bid: any) => bid.account.bidder.equals(userPubkey));
};

// Get user's bid for auction
export const getUserBid = (bids: any[], userPubkey: PublicKey | null): any | null => {
    if (!userPubkey || !bids) return null;
    return bids.find((bid: any) => bid.account.bidder.equals(userPubkey)) || null;
};

// Sort auctions
export const sortAuctions = (auctions: any[], sortBy: string): any[] => {
    const sorted = [...auctions];

    switch (sortBy) {
        case 'ending-soon':
            return sorted.sort((a, b) => a.account.endTime.toNumber() - b.account.endTime.toNumber());

        case 'most-bids':
            return sorted.sort((a, b) => b.account.totalBids - a.account.totalBids);

        case 'newest':
            return sorted.sort((a, b) => b.account.startTime.toNumber() - a.account.startTime.toNumber());

        case 'reserve-low':
            return sorted.sort((a, b) => a.account.reservePrice.toNumber() - b.account.reservePrice.toNumber());

        case 'reserve-high':
            return sorted.sort((a, b) => b.account.reservePrice.toNumber() - a.account.reservePrice.toNumber());

        default:
            return sorted;
    }
};

// Filter auctions by search query
export const filterAuctionsBySearch = (auctions: any[], query: string): any[] => {
    if (!query.trim()) return auctions;

    const lowerQuery = query.toLowerCase();

    return auctions.filter((auction: any) =>
        auction.account.itemName.toLowerCase().includes(lowerQuery) ||
        auction.account.itemDescription.toLowerCase().includes(lowerQuery)
    );
};

// Filter auctions by status
export const filterAuctionsByStatus = (auctions: any[], status: string): any[] => {
    if (status === 'all') return auctions;

    return auctions.filter((auction: any) => {
        const auctionStatus = getAuctionStatus(auction.account);

        if (status === 'live') return auctionStatus === 'active';
        if (status === 'ending') return isAuctionEndingSoon(auction.account);
        if (status === 'hot') return isAuctionHot(auction.account);
        if (status === 'new') return isAuctionNew(auction.account);

        return auctionStatus === status;
    });
};

// Calculate auction statistics
export const calculateAuctionStats = (auctions: any[]) => {
    const totalAuctions = auctions.length;
    const activeAuctions = auctions.filter(a => getAuctionStatus(a.account) === 'active').length;
    const totalBids = auctions.reduce((sum, a) => sum + a.account.totalBids, 0);
    const totalVolume = auctions
        .filter(a => getAuctionStatus(a.account) === 'closed')
        .reduce((sum, a) => sum + a.account.highestBidAmount.toNumber(), 0);

    return {
        totalAuctions,
        activeAuctions,
        totalBids,
        totalVolume: lamportsToSol(totalVolume),
    };
};

// Transaction History Helpers
export type Transaction = {
    signature: string;
    type: 'bid' | 'create' | 'claim' | 'refund';
    description: string;
    amount: number; // in SOL
    date: number; // timestamp
    status: 'confirmed' | 'processing' | 'failed';
};

const TX_STORAGE_KEY = 'shadowbid_transactions';

export const getTransactions = (userPubkey: PublicKey | null): Transaction[] => {
    if (!userPubkey) return [];
    try {
        const stored = localStorage.getItem(TX_STORAGE_KEY);
        if (!stored) return [];
        const allTxs: { [key: string]: Transaction[] } = JSON.parse(stored);
        return allTxs[userPubkey.toBase58()] || [];
    } catch (e) {
        console.error('Failed to load transactions', e);
        return [];
    }
};

export const saveTransaction = (userPubkey: PublicKey | null, tx: Transaction) => {
    if (!userPubkey) return;
    try {
        const stored = localStorage.getItem(TX_STORAGE_KEY);
        const allTxs: { [key: string]: Transaction[] } = stored ? JSON.parse(stored) : {};
        const userKey = userPubkey.toBase58();

        const userTxs = allTxs[userKey] || [];
        // Add to beginning
        userTxs.unshift(tx);
        // Keep last 50
        allTxs[userKey] = userTxs.slice(0, 50);

        localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(allTxs));
    } catch (e) {
        console.error('Failed to save transaction', e);
    }
};