import { useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Trophy, Clock, TrendingUp, Lock, ArrowUpRight, ArrowDownLeft, History, ExternalLink, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserBids, useAuctions, useRefundBid } from '../lib/hooks';
import { getAuctionStatus, formatTimeRemaining, formatAddress, lamportsToSol, getTransactions, formatRelativeTime, saveTransaction } from '../lib/utils';
import { NATIVE_MINT } from '@solana/spl-token';


const Dashboard = () => {
    const { connected, publicKey } = useWallet();
    const { bids, loading: bidsLoading, refetch: refetchBids } = useUserBids(publicKey);
    const { auctions: allAuctions, loading: allAuctionsLoading } = useAuctions();

    // Derived state for user auctions to avoid double fetching
    const userAuctions = useMemo(() => {
        if (!publicKey || !allAuctions) return [];
        return allAuctions.filter(a => a.account.authority.equals(publicKey));
    }, [allAuctions, publicKey]);

    const [processingRefund, setProcessingRefund] = useState<string | null>(null);
    const { refundBid } = useRefundBid();

    const transactions = useMemo(() => getTransactions(publicKey), [publicKey]);

    const activeBids = useMemo(() => {
        return bids.filter(b => {

            return b.account;
        });
    }, [bids]);

    const pendingRefunds = useMemo(() => {
        if (!publicKey || !allAuctions.length || !bids.length) return [];
        return bids.filter(bid => {
            const auction = allAuctions.find(a => a.publicKey.equals(bid.account.auction));
            if (!auction) return false;

            const status = getAuctionStatus(auction.account);
            const isClosed = status === 'closed';
            const isWinner = auction.account.winner.equals(publicKey);


            const bidStatus = Object.keys(bid.account.status)[0].toLowerCase();
            const isRefunded = bidStatus === 'refunded';

            return isClosed && !isWinner && !isRefunded;
        });
    }, [bids, allAuctions, publicKey]);

    const wonAuctions = useMemo(() => {
        if (!publicKey || !allAuctions.length) return [];
        return allAuctions.filter(a =>
            a.account.winner.equals(publicKey) &&
            getAuctionStatus(a.account) === 'closed'
        );
    }, [allAuctions, publicKey]);

    const activeBidsCount = activeBids.length;


    const totalVolume = useMemo(() => {
        return userAuctions
            .filter(a => getAuctionStatus(a.account) === 'closed')
            .reduce((sum, a) => sum + a.account.highestBidAmount.toNumber(), 0);
    }, [userAuctions]);

    const stats = [
        { label: 'Active Bids', value: activeBidsCount.toString(), icon: Clock, color: 'text-primary-purple' },
        { label: 'Your Auctions', value: userAuctions.length.toString(), icon: Trophy, color: 'text-accent-yellow' },
        { label: 'Total Volume', value: `${lamportsToSol(totalVolume).toFixed(1)} SOL`, icon: TrendingUp, color: 'text-status-live' },
    ];

    const handleClaimRefund = async (bid: any) => {
        if (!publicKey) return;
        const bidAddress = bid.publicKey.toBase58();
        setProcessingRefund(bidAddress);
        try {
            const auction = allAuctions.find(a => a.publicKey.equals(bid.account.auction));
            if (!auction) return; // Should not happen

            const result = await refundBid(auction.publicKey, publicKey, NATIVE_MINT);
            const signature = (result as any).signature || result as string;

            saveTransaction(publicKey, {
                signature: signature,
                type: 'refund',
                description: `Refunded bid from auction ${formatAddress(auction.publicKey)}`,
                amount: lamportsToSol(bid.account.bidAmount.toNumber()),
                date: Date.now(),
                status: 'confirmed'
            });
            alert('Bid refunded successfully!');
            refetchBids();
        } catch (err: any) {
            alert(err.message || 'Failed to refund bid');
        } finally {
            setProcessingRefund(null);
        }
    };


    if (!connected) {
        return (
            <div className="min-h-screen bg-background-main flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 bg-primary-purple bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-10 h-10 text-primary-purple" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary mb-2">Connect Your Wallet</h2>
                    <p className="text-text-secondary">Please connect your wallet to view your dashboard</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-main">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-text-primary mb-2">Dashboard</h1>
                    <p className="text-text-secondary">
                        Wallet: {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
                    </p>
                </div>

                {/* Refund Notification */}
                {pendingRefunds.length > 0 && (
                    <div className="mb-4 bg-primary-purple bg-opacity-10 border border-primary-purple rounded-xl p-4 flex items-center justify-between animate-fade-in-down">
                        <div className="flex items-center space-x-3">
                            <AlertCircle className="w-6 h-6 text-primary-purple" />
                            <div>
                                <h3 className="font-bold text-primary-purple">Refunds Available</h3>
                                <p className="text-sm text-text-secondary">You have {pendingRefunds.length} completed auction(s) to claim refunds from.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => document.getElementById('pending-refunds')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-4 py-2 bg-primary-purple text-white rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                        >
                            View Refunds
                        </button>
                    </div>
                )}

                {/* Winner Notification */}
                {wonAuctions.length > 0 && (
                    <div className="mb-8 bg-accent-yellow bg-opacity-10 border border-accent-yellow rounded-xl p-4 flex items-center justify-between animate-fade-in-down">
                        <div className="flex items-center space-x-3">
                            <Trophy className="w-6 h-6 text-accent-yellow" />
                            <div>
                                <h3 className="font-bold text-accent-yellow text-text-primary">You Won!</h3>
                                <p className="text-sm text-text-secondary">Congratulations! You won {wonAuctions.length} auction{wonAuctions.length > 1 ? 's' : ''}.</p>
                            </div>
                        </div>
                        {wonAuctions.length === 1 ? (
                            <Link
                                to={`/auction/${wonAuctions[0].publicKey.toBase58()}`}
                                className="px-4 py-2 bg-accent-yellow text-background-main rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                            >
                                View Auction
                            </Link>
                        ) : (
                            <button
                                onClick={() => document.getElementById('won-auctions')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-4 py-2 bg-accent-yellow text-background-main rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                            >
                                View Winnings
                            </button>
                        )}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="bg-background-card p-6 rounded-xl border border-border"
                        >
                            <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
                            <p className="text-2xl font-bold text-text-primary mb-1">{stat.value}</p>
                            <p className="text-sm text-text-muted">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Won Auctions Section */}
                {wonAuctions.length > 0 && (
                    <div id="won-auctions" className="bg-background-card rounded-xl border border-border p-6 mb-8 border-l-4 border-l-accent-yellow">
                        <h2 className="text-xl font-semibold text-text-primary mb-4">Won Auctions</h2>
                        <div className="space-y-4">
                            {wonAuctions.map((auction) => (
                                <Link
                                    key={auction.publicKey.toBase58()}
                                    to={`/auction/${auction.publicKey.toBase58()}`}
                                    className="flex items-center justify-between p-4 bg-background-elevated rounded-lg hover:bg-background-main transition-colors group"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-lg bg-background-card flex items-center justify-center border border-accent-yellow border-opacity-30">
                                            <Trophy className="w-6 h-6 text-accent-yellow" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-text-primary group-hover:text-primary-purple transition-colors">
                                                {auction.account.itemName}
                                            </h3>
                                            <p className="text-sm text-text-secondary">
                                                Winning Bid: <span className="text-accent-yellow font-bold">{lamportsToSol(auction.account.highestBidAmount.toNumber())} SOL</span>
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowUpRight className="w-5 h-5 text-text-muted group-hover:text-primary-purple transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pending Refunds Section */}
                {pendingRefunds.length > 0 && (
                    <div id="pending-refunds" className="bg-background-card rounded-xl border border-border p-6 mb-8 border-l-4 border-l-primary-purple">
                        <h2 className="text-xl font-semibold text-text-primary mb-4">Pending Refunds</h2>
                        <div className="space-y-4">
                            {pendingRefunds.map((bid) => (
                                <div
                                    key={bid.publicKey.toBase58()}
                                    className="flex items-center justify-between p-4 bg-background-elevated rounded-lg hover:bg-background-main transition-colors"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 rounded-lg bg-background-card flex items-center justify-center">
                                            <ArrowDownLeft className="w-6 h-6 text-status-success" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-text-primary">
                                                Auction {formatAddress(bid.account.auction)}
                                            </h3>
                                            <p className="text-sm text-text-secondary">
                                                Refund Amount: <span className="text-status-success font-bold">{lamportsToSol(bid.account.bidAmount.toNumber())} SOL</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleClaimRefund(bid)}
                                        disabled={processingRefund === bid.publicKey.toBase58()}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-colors ${processingRefund === bid.publicKey.toBase58()
                                            ? 'bg-background-elevated cursor-not-allowed text-text-muted'
                                            : 'bg-status-success text-white hover:bg-opacity-90'
                                            }`}
                                    >
                                        {processingRefund === bid.publicKey.toBase58() ? 'Processing...' : 'Claim Refund'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Active Bids */}
                <div className="bg-background-card rounded-xl border border-border p-6 mb-8">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Your Recent Bids</h2>
                    {(bidsLoading || allAuctionsLoading) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-background-card p-4 rounded-xl border border-border animate-pulse">
                                    <div className="w-full h-24 bg-background-elevated rounded mb-3"></div>
                                    <div className="w-3/4 h-4 bg-background-elevated rounded mb-2"></div>
                                    <div className="w-1/2 h-3 bg-background-elevated rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : activeBids.length > 0 ? (
                        <div className="space-y-4">
                            {activeBids.map((bid) => (
                                <Link
                                    key={bid.publicKey.toBase58()}
                                    to={`/auction/${bid.account.auction.toBase58()}`}
                                    className="flex items-center space-x-4 p-4 bg-background-elevated rounded-lg hover:bg-background-main transition-colors"
                                >
                                    <div className="w-20 h-20 rounded-lg bg-background-card flex items-center justify-center">
                                        <Lock className="w-8 h-8 text-text-muted" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-text-primary mb-1">
                                            Auction {formatAddress(bid.account.auction)}
                                        </h3>
                                        <p className="text-sm text-text-secondary">
                                            Your bid: {lamportsToSol(bid.account.bidAmount.toNumber())} SOL
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="px-3 py-1 rounded-full text-xs font-semibold mb-2 bg-primary-purple text-white">
                                            {Object.keys(bid.account.status)[0].toUpperCase()}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-text-secondary mb-4">You haven't placed any bids yet.</p>
                            <Link to="/browse" className="text-primary-purple font-semibold hover:underline">
                                Browse live auctions
                            </Link>
                        </div>
                    )}
                </div>


                {/* Your Auctions */}
                <div className="bg-background-card rounded-xl border border-border p-6 mb-8">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Your Created Auctions</h2>
                    {allAuctionsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-background-card p-4 rounded-xl border border-border animate-pulse">
                                    <div className="w-full h-24 bg-background-elevated rounded mb-3"></div>
                                    <div className="w-3/4 h-4 bg-background-elevated rounded mb-2"></div>
                                    <div className="w-1/2 h-3 bg-background-elevated rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : userAuctions.length > 0 ? (

                        <div className="space-y-4">
                            {userAuctions.map((auction) => (
                                <Link
                                    key={auction.publicKey.toBase58()}
                                    to={`/auction/${auction.publicKey.toBase58()}`}
                                    className="flex items-center space-x-4 p-4 bg-background-elevated rounded-lg hover:bg-background-main transition-colors"
                                >
                                    <div className="w-20 h-20 rounded-lg bg-background-card flex items-center justify-center">
                                        <TrendingUp className="w-8 h-8 text-text-muted" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-text-primary mb-1">
                                            {auction.account.itemName}
                                        </h3>
                                        <p className="text-sm text-text-secondary">
                                            Bids: {auction.account.totalBids} | Reserve: {lamportsToSol(auction.account.reservePrice.toNumber())} SOL
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="px-3 py-1 rounded-full text-xs font-semibold mb-2 bg-accent-cyan text-white">
                                            {Object.keys(auction.account.status)[0].toUpperCase()}
                                        </div>
                                        <p className="text-sm text-text-muted">
                                            Ends {formatTimeRemaining(auction.account.endTime.toNumber())}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
                            <p className="text-text-secondary mb-4">You haven't created any auctions yet.</p>
                            <Link to="/create" className="text-primary-purple font-semibold hover:underline">
                                Create your first auction
                            </Link>
                        </div>
                    )}
                </div>

                {/* Recent Transactions */}
                <div className="bg-background-card rounded-xl border border-border p-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <History className="w-5 h-5 text-primary-purple" />
                        <h2 className="text-xl font-semibold text-text-primary">Transaction History</h2>
                    </div>

                    {transactions.length > 0 ? (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div key={tx.signature} className="flex items-center justify-between p-4 bg-background-elevated rounded-lg hover:bg-background-main transition-colors border border-transparent hover:border-border">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'claim' || tx.type === 'refund'
                                            ? 'bg-status-success bg-opacity-20 text-status-success'
                                            : 'bg-primary-purple bg-opacity-20 text-primary-purple'
                                            }`}>
                                            {tx.type === 'claim' || tx.type === 'refund' ? (
                                                <ArrowDownLeft className="w-5 h-5" />
                                            ) : (
                                                <ArrowUpRight className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-text-primary">{tx.description}</p>
                                            <a
                                                href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-text-secondary flex items-center hover:text-primary-purple transition-colors"
                                            >
                                                {formatAddress(tx.signature, 8)}
                                                <ExternalLink className="w-3 h-3 ml-1" />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${tx.type === 'claim' || tx.type === 'refund'
                                            ? 'text-status-success'
                                            : 'text-text-primary'
                                            }`}>
                                            {tx.type === 'claim' || tx.type === 'refund' ? '+' : '-'}{tx.amount.toFixed(2)} SOL
                                        </p>
                                        <p className="text-xs text-text-muted">
                                            {formatRelativeTime(tx.date)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <History className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-20" />
                            <p className="text-text-secondary">No recent transactions found.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Dashboard;