import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, Clock, Shield, ArrowLeft, User, Calendar, DollarSign, RefreshCw, Trophy, Info, Cpu } from 'lucide-react';

import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import { useAuction, useAuctionBids, usePlaceBid, useStartAuction, useFinalizeAuction, useSettleAuction, useRefundBid } from '../lib/hooks';
import { formatAddress, formatTimeRemaining, getAuctionBadge, lamportsToSol, saveTransaction, getTransactions, parseAuctionDescription } from '../lib/utils';
import { useNotifications } from '../components/Notifications';

// Use Native SOL Mint
const DEFAULT_MINT = NATIVE_MINT;

const AuctionDetails = () => {
    const { id } = useParams();
    const auctionPda = useMemo(() => (id ? new PublicKey(id) : null), [id]);
    const { connected, publicKey } = useWallet();
    const { notify } = useNotifications();


    const { auction, loading, error, refetch: refetchAuction } = useAuction(auctionPda!);
    const { bids, loading: bidsLoading, refetch: refetchBids } = useAuctionBids(auctionPda!);

    const { placeBid, loading: bidding } = usePlaceBid();
    const { startAuction, loading: starting } = useStartAuction();
    const { finalizeAuction, loading: finalizing } = useFinalizeAuction();
    const { settleAuction, loading: settling } = useSettleAuction();
    const { refundBid, loading: refunding } = useRefundBid();

    const [bidAmount, setBidAmount] = useState('');
    const [bidProgress, setBidProgress] = useState('');

    // Extract image URL and cleaned description - moved to top to follow Rules of Hooks
    const { description: displayDescription, imageUrl } = useMemo(() => {
        return parseAuctionDescription(auction?.itemDescription || '');
    }, [auction]);

    const userBid = useMemo(() => {
        if (!publicKey || !bids) return null;
        return bids.find((b: any) => b.account.bidder.equals(publicKey));
    }, [publicKey, bids]);

    const isWinner = useMemo(() => {
        if (!publicKey || !auction?.winner) return false;
        return auction.winner.equals(publicKey);
    }, [publicKey, auction]);

    const fundsClaimed = useMemo(() => {
        if (!publicKey || !auctionPda) return false;
        const txs = getTransactions(publicKey);
        const auctionAddr = formatAddress(auctionPda);
        return txs.some(tx => tx.type === 'claim' && tx.description.includes(auctionAddr));
    }, [publicKey, auctionPda]);

    const auctionEnded = useMemo(() => {
        if (!auction) return false;
        return Math.floor(Date.now() / 1000) >= auction.endTime.toNumber();
    }, [auction]);

    const activeBids = useMemo(() => {
        return bids.filter((bid: any) => Object.keys(bid.account.status)[0].toLowerCase() === 'active');
    }, [bids]);

    const handleStartAuction = async () => {
        if (!auctionPda) return;
        try {
            await startAuction(auctionPda);
            notify({
                type: 'success',
                title: 'Auction started',
                message: 'Bidders can now place private encrypted bids.',
            });
            window.location.reload(); // Refresh to get updated status
        } catch (err: any) {
            notify({
                type: 'error',
                title: 'Could not start auction',
                message: err.message || 'Please try again after confirming the auction timing.',
            });
        }
    };

    const handleSettleAuction = async () => {
        if (!auctionPda) return;
        try {
            const result = await settleAuction(auctionPda, DEFAULT_MINT);
            const signature = (result as any).signature || (result as unknown as string);

            saveTransaction(publicKey, {
                signature: signature,
                type: 'claim',
                description: `Claimed funds from auction ${formatAddress(auctionPda)}`,
                amount: lamportsToSol(auction.highestBidAmount.toNumber()),
                date: Date.now(),
                status: 'confirmed'
            });
            notify({
                type: 'success',
                title: 'Funds claimed',
                message: 'The winning bid funds were sent to your wallet.',
            });
            window.location.reload();
        } catch (err: any) {
            notify({
                type: 'error',
                title: 'Could not claim funds',
                message: err.message || 'Please try again in a moment.',
            });
        }
    };

    const handleFinalizeWithArcium = async () => {
        if (!auctionPda) return;

        if (!auctionEnded) {
            notify({
                type: 'info',
                title: 'Auction still running',
                message: 'Arcium finalization becomes available after the auction end time.',
            });
            return;
        }

        if (activeBids.length < 2) {
            notify({
                type: 'error',
                title: 'Not enough bids',
                message: 'Arcium comparison needs two encrypted bids to finalize this auction.',
            });
            return;
        }

        if (activeBids.length > 2) {
            notify({
                type: 'error',
                title: 'Too many bids for this finalizer',
                message: 'The current UI finalizes the two-bid Arcium demo path. A multi-bid bracket finalizer should be used for larger auctions.',
                duration: 7600,
            });
            return;
        }

        try {
            notify({
                type: 'info',
                title: 'Finalizing with Arcium',
                message: 'Approve the queue transaction. The app will wait for the verified Arcium callback.',
                duration: 7600,
            });

            const result = await finalizeAuction({
                auctionPda,
                bidAPda: activeBids[0].publicKey,
                bidBPda: activeBids[1].publicKey,
                waitForCallback: true,
            });

            notify({
                type: 'success',
                title: 'Auction finalized',
                message: result.finalizeSignature
                    ? 'Arcium returned a verified winner and closed the auction.'
                    : 'The Arcium comparison was queued.',
            });
            await Promise.all([refetchAuction(), refetchBids()]);
        } catch (err: any) {
            notify({
                type: 'error',
                title: 'Arcium finalization failed',
                message: err.message || 'The comparison could not be queued or finalized.',
                duration: 7600,
            });
        }
    };

    const handleRefundBid = async () => {
        if (!auctionPda || !publicKey) return;
        try {
            const result = await refundBid(auctionPda, publicKey, DEFAULT_MINT);
            const signature = (result as any).signature || (result as unknown as string);

            if (userBid) {
                saveTransaction(publicKey, {
                    signature: signature,
                    type: 'refund',
                    description: `Refunded bid from auction ${formatAddress(auctionPda)}`,
                    amount: lamportsToSol(userBid.account.bidAmount.toNumber()),
                    date: Date.now(),
                    status: 'confirmed'
                });
            }
            notify({
                type: 'success',
                title: 'Bid refunded',
                message: 'Your locked bid funds were returned.',
            });
            window.location.reload();
        } catch (err: any) {
            notify({
                type: 'error',
                title: 'Could not refund bid',
                message: err.message || 'Please try again in a moment.',
            });
        }
    };

    const handlePlaceBid = async () => {
        if (userBid) {
            notify({
                type: 'info',
                title: 'Bid already placed',
                message: 'Each wallet can place one encrypted bid per auction.',
            });
            return;
        }

        if (!connected) {
            notify({
                type: 'info',
                title: 'Connect your wallet',
                message: 'Connect a devnet wallet before placing a private bid.',
            });
            return;
        }

        const amount = parseFloat(bidAmount);
        if (isNaN(amount) || amount <= 0) {
            notify({
                type: 'error',
                title: 'Enter a bid amount',
                message: 'Use a positive SOL amount for your encrypted bid.',
            });
            return;
        }

        // Check against reserve price
        const reserveSOL = lamportsToSol(auction.reservePrice.toNumber());
        if (amount < reserveSOL) {
            notify({
                type: 'error',
                title: 'Bid below reserve',
                message: `This auction requires at least ${reserveSOL} SOL.`,
            });
            return;
        }

        try {
            setBidProgress('Encrypting your bid locally with Arcium.');
            notify({
                type: 'info',
                title: 'Private bid setup',
                message: 'You will approve storage transactions first, then the final transaction that locks your bid amount.',
                duration: 7600,
            });
            const result = await placeBid({
                auctionPda: auctionPda!,
                bidAmount: amount * 1_000_000_000, // Convert to lamports
                tokenMint: DEFAULT_MINT,
                onProgress: (message) => {
                    setBidProgress(message);
                    notify({
                        type: 'info',
                        title: 'Wallet approval needed',
                        message,
                        duration: 4200,
                    });
                },
            });

            const signature = (result as any).signature || (result as unknown as string);

            saveTransaction(publicKey, {
                signature: signature,
                type: 'bid',
                description: `Placed bid on ${formatAddress(auctionPda!)}`,
                amount: amount,
                date: Date.now(),
                status: 'confirmed'
            });
            notify({
                type: 'success',
                title: 'Bid placed privately',
                message: 'Your bid amount is locked and the encrypted bid is ready for Arcium comparison.',
            });
            setBidAmount('');
            setBidProgress('');
            await Promise.all([refetchAuction(), refetchBids()]);
        } catch (err: any) {
            setBidProgress('');
            notify({
                type: 'error',
                title: 'Bid was not placed',
                message: err.message || 'The wallet request was rejected or the transaction failed.',
            });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background-main flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-primary-purple border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-text-secondary">Loading auction details...</p>
                </div>
            </div>
        );
    }

    if (error || !auction) {
        return (
            <div className="min-h-screen bg-background-main flex items-center justify-center p-4">
                <div className="bg-background-card p-8 rounded-xl border border-border text-center max-w-md">
                    <div className="w-16 h-16 bg-status-error bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-status-error" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary mb-2">Auction Not Found</h2>
                    <p className="text-text-secondary mb-6">{error || 'The auction you are looking for does not exist or has been removed.'}</p>
                    <Link to="/browse" className="inline-block px-6 py-3 bg-primary-purple text-white rounded-lg font-semibold">
                        Back to Browse
                    </Link>
                </div>
            </div>
        );
    }

    const badge = getAuctionBadge(auction);


    return (
        <div className="min-h-screen bg-background-main">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <Link
                    to="/browse"
                    className="inline-flex items-center space-x-2 text-text-secondary hover:text-primary-purple transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Browse</span>
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Image */}
                    <div>
                        <div className="bg-background-card rounded-xl overflow-hidden border border-border sticky top-24">
                            <div className="w-full aspect-square bg-background-elevated flex items-center justify-center">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={auction.itemName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600?text=ShadowBid+Item';
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center text-text-muted">
                                        <Lock className="w-16 h-16 mb-2 opacity-20" />
                                        <span className="text-lg">No Image Provided</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Right Column - Details */}
                    <div className="space-y-6">
                        {/* Status Badge */}
                        <div className="flex items-center space-x-3">
                            {badge === 'live' && (
                                <div className="flex items-center space-x-2 bg-status-live text-white px-4 py-2 rounded-full text-sm font-semibold">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    <span>LIVE AUCTION</span>
                                </div>
                            )}
                            {badge === 'ending' && (
                                <div className="bg-status-error text-white px-4 py-2 rounded-full text-sm font-semibold">
                                    ⏰ ENDING SOON
                                </div>
                            )}
                            {badge === 'hot' && (
                                <div className="bg-accent-orange text-white px-4 py-2 rounded-full text-sm font-semibold">
                                    🔥 HOT AUCTION
                                </div>
                            )}
                        </div>


                        {/* Title & Description */}
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                                {auction.itemName}
                            </h1>
                            <p className="text-text-secondary leading-relaxed">
                                {displayDescription}
                            </p>
                        </div>

                        {/* Creator Info */}
                        <div className="bg-background-card p-4 rounded-xl border border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-primary-purple rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-text-muted">Creator</p>
                                        <p className="text-sm text-text-primary font-semibold">{formatAddress(auction.authority)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 text-text-muted">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-sm">Created {new Date(auction.startTime.toNumber() * 1000).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>


                        {/* Auction Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background-card p-4 rounded-xl border border-border">
                                <div className="flex items-center space-x-2 mb-2">
                                    <Lock className="w-5 h-5 text-primary-purple" />
                                    <span className="text-sm text-text-muted">Total Bids</span>
                                </div>
                                <div className="flex items-end space-x-2">
                                    <p className="text-2xl font-bold text-text-primary">{auction.totalBids}</p>
                                    {bidsLoading && <div className="w-4 h-4 border-2 border-primary-purple border-t-transparent rounded-full animate-spin mb-1"></div>}
                                </div>
                            </div>

                            <div className="bg-background-card p-4 rounded-xl border border-border">
                                <div className="flex items-center space-x-2 mb-2">
                                    <Clock className="w-5 h-5 text-status-error" />
                                    <span className="text-sm text-text-muted">Time Left</span>
                                </div>
                                <p className="text-2xl font-bold text-text-primary">
                                    {formatTimeRemaining(auction.endTime.toNumber())}
                                </p>
                            </div>
                        </div>

                        {/* Reserve Price */}
                        <div className="bg-background-card p-6 rounded-xl border border-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-text-muted mb-1">Reserve Price</p>
                                    <p className="text-3xl font-bold text-text-primary">{lamportsToSol(auction.reservePrice.toNumber())} SOL</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-text-muted mb-1">Status</p>
                                    <p className="text-lg font-semibold text-primary-purple capitalize">{Object.keys(auction.status)[0]}</p>
                                </div>
                            </div>
                        </div>


                        {/* Creator Actions */}
                        {publicKey?.equals(auction.authority) && (
                            <div className="bg-background-elevated p-6 rounded-xl border border-primary-purple border-dashed">
                                <h3 className="text-lg font-semibold text-text-primary mb-2 flex items-center">
                                    <Shield className="w-5 h-5 mr-2 text-primary-purple" />
                                    Creator Actions
                                </h3>

                                <div className="space-y-3 mt-4">
                                    {auction.status.pending && (
                                        <button
                                            onClick={handleStartAuction}
                                            disabled={starting}
                                            className="w-full py-3 bg-primary-purple text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center space-x-2"
                                        >
                                            {starting ? (
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <span>Start Auction</span>
                                            )}
                                        </button>
                                    )}
                                    {auction.status.active && (
                                        auctionEnded ? (
                                            <div className="space-y-3">
                                                <button
                                                    onClick={handleFinalizeWithArcium}
                                                    disabled={finalizing || activeBids.length !== 2}
                                                    className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${activeBids.length === 2
                                                        ? 'bg-primary-purple text-white hover:bg-opacity-90'
                                                        : 'bg-background-main text-text-disabled cursor-not-allowed border border-border'
                                                        }`}
                                                >
                                                    {finalizing ? (
                                                        <>
                                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            <span>Waiting for Arcium...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Cpu className="w-5 h-5" />
                                                            <span>Finalize with Arcium</span>
                                                        </>
                                                    )}
                                                </button>
                                                {activeBids.length !== 2 && (
                                                    <p className="text-xs leading-5 text-text-muted">
                                                        This finalizer currently supports exactly two active bids. Current active bids: {activeBids.length}.
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border border-border bg-background-main p-4">
                                                <div className="flex items-start space-x-3">
                                                    <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-cyan" />
                                                    <p className="text-sm leading-5 text-text-secondary">
                                                        Manual closing is disabled. When the auction ends, the winner should be finalized through Arcium's encrypted comparison flow.
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    )}
                                    {auction.status.closed && (
                                        <button
                                            onClick={handleSettleAuction}
                                            disabled={settling || fundsClaimed}
                                            className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${fundsClaimed
                                                ? 'bg-background-elevated text-text-disabled cursor-not-allowed border border-border'
                                                : 'bg-accent-yellow text-background-main hover:bg-opacity-90'
                                                }`}
                                        >
                                            {settling ? (
                                                <div className="w-5 h-5 border-2 border-background-main border-t-transparent rounded-full animate-spin"></div>
                                            ) : fundsClaimed ? (
                                                <>
                                                    <DollarSign className="w-5 h-5" />
                                                    <span>Funds Claimed</span>
                                                </>
                                            ) : (
                                                <>
                                                    <DollarSign className="w-5 h-5" />
                                                    <span>Claim Funds</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Winner View */}
                        {auction.status.closed && isWinner && (
                            <div className="bg-accent-yellow bg-opacity-10 p-6 rounded-xl border border-accent-yellow mb-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-2 bg-accent-yellow rounded-full text-background-main">
                                        <Trophy className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-text-primary">Congratulations! You Won!</h3>
                                </div>
                                <p className="text-text-secondary mb-2">
                                    You are the winner of this auction.
                                </p>
                                <div className="p-4 bg-background-elevated rounded-lg border border-accent-yellow border-dashed">
                                    <p className="text-sm text-text-muted mb-1">Winning Bid</p>
                                    <p className="text-2xl font-bold text-accent-yellow">
                                        {lamportsToSol(auction.highestBidAmount.toNumber())} SOL
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Bidder Actions */}
                        {auction.status.closed && userBid && !isWinner && Object.keys(userBid.account.status)[0].toLowerCase() !== 'refunded' && (
                            <div className="bg-background-elevated p-6 rounded-xl border border-border">
                                <h3 className="text-lg font-semibold text-text-primary mb-2">Auction Ended</h3>
                                <p className="text-sm text-text-secondary mb-4">
                                    This auction has ended. Since you did not win, you can reclaim your bid funds.
                                </p>
                                <button
                                    onClick={handleRefundBid}
                                    disabled={refunding}
                                    className="w-full py-3 bg-background-main text-text-primary border border-border rounded-lg font-semibold hover:bg-background-elevated transition-all flex items-center justify-center space-x-2"
                                >
                                    {refunding ? (
                                        <div className="w-5 h-5 border-2 border-text-primary border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4" />
                                            <span>Refund Bid ({lamportsToSol(userBid.account.bidAmount.toNumber())} SOL)</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}


                        {/* Bid Form */}
                        {auction.status.active ? (
                            <div className="bg-primary-purple bg-opacity-10 p-6 rounded-xl border border-primary-purple">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Shield className="w-5 h-5 text-primary-purple" />
                                    <h3 className="text-lg font-semibold text-text-primary">
                                        {userBid ? 'Your Bid Is In' : 'Place Your Bid'}
                                    </h3>
                                </div>

                                <p className="text-sm text-text-secondary mb-4">
                                    {userBid
                                        ? 'You have already placed one encrypted bid for this auction. It will remain private until Arcium finalizes the result.'
                                        : 'Your bid will be encrypted using Arcium MPC before submission. The wallet approvals before the final bid transaction store the encrypted bid privately on-chain.'}
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-text-primary mb-2">
                                            Bid Amount (SOL)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min={lamportsToSol(auction.reservePrice.toNumber())}
                                            value={bidAmount}
                                            onChange={(e) => setBidAmount(e.target.value)}
                                            placeholder="Enter amount"
                                            disabled={Boolean(userBid) || bidding}
                                            className="w-full px-4 py-3 bg-background-input border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-purple transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <p className="text-xs text-text-muted mt-1">
                                            {userBid
                                                ? `Your private bid: ${lamportsToSol(userBid.account.bidAmount.toNumber())} SOL`
                                                : `Must be at least ${lamportsToSol(auction.reservePrice.toNumber())} SOL`}
                                        </p>
                                    </div>


                                    <button
                                        onClick={handlePlaceBid}
                                        disabled={Boolean(userBid) || bidding || !connected}
                                        className={`w-full py-4 rounded-lg font-semibold transition-all ${connected && !userBid
                                            ? 'bg-primary-purple text-white hover:bg-opacity-90 btn-hover-lift'
                                            : 'bg-background-elevated text-text-disabled cursor-not-allowed'
                                            }`}
                                    >
                                        {bidding ? (
                                            <div className="flex items-center justify-center space-x-2">
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Encrypting & Submitting...</span>
                                            </div>
                                        ) : userBid ? (
                                            'Bid Already Placed'
                                        ) : connected ? (
                                            'Place Encrypted Bid'
                                        ) : (
                                            'Connect Wallet to Bid'
                                        )}
                                    </button>
                                    {bidProgress && (
                                        <div className="rounded-lg border border-accent-cyan border-opacity-40 bg-background-main p-3 text-sm text-text-secondary">
                                            {bidProgress}
                                        </div>
                                    )}

                                </div>
                            </div>
                        ) : !auction.status.closed ? (
                            <div className="bg-background-card p-6 rounded-xl border border-border text-center">
                                <Clock className="w-12 h-12 text-text-muted mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-text-primary mb-2">
                                    Auction Not Active
                                </h3>
                                <p className="text-text-secondary">
                                    This auction is currently {Object.keys(auction.status)[0]}. Bidding is not available.
                                </p>
                            </div>
                        ) : null}

                        {/* Privacy Info */}
                        <div className="bg-background-card p-4 rounded-xl border border-border">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-accent-cyan bg-opacity-20 rounded-lg flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-accent-cyan" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-text-primary mb-1">
                                        Privacy Guaranteed
                                    </h4>
                                    <p className="text-xs text-text-secondary">
                                        This auction uses Arcium's Multi-Party Computation to ensure complete
                                        bid privacy. Your bid amount is encrypted and only revealed to you if you win.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuctionDetails;
