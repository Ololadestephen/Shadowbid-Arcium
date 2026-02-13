import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Lock, Clock, TrendingUp, Grid, List } from 'lucide-react';
import { useAuctions } from '../lib/hooks';
import {
    sortAuctions,
    getAuctionBadge,
    formatTimeRemaining,
    lamportsToSol,
    filterAuctionsByStatus,
    getAuctionStatus
} from '../lib/utils';

const BrowseAuctions = () => {
    const { auctions, loading, error, refetch } = useAuctions();

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('ending-soon');
    const [searchQuery, setSearchQuery] = useState('');

    // Apply filters and sorting
    const filteredAuctions = useMemo(() => {
        let result = auctions.filter(auction => {
            if (!auction.account) return false;

            // Search filter
            const searchMatch = !searchQuery ||
                auction.account.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                auction.publicKey.toBase58().includes(searchQuery);

            if (!searchMatch) return false;

            return true;
        });

        // Apply remaining filters and sorting
        result = filterAuctionsByStatus(result, statusFilter as any); // Re-added status filter
        result = sortAuctions(result, sortBy as any); // Re-added sort

        return result;
    }, [auctions, searchQuery, statusFilter, sortBy]); // Updated dependencies


    const statusOptions = [
        { value: 'all', label: 'All Auctions' },
        { value: 'live', label: '🟢 Live' },
        { value: 'ending', label: '⏰ Ending Soon' },
        { value: 'hot', label: '🔥 Hot' },
        { value: 'new', label: '🆕 New' },
    ];

    const sortOptions = [
        { value: 'ending-soon', label: 'Ending Soon' },
        { value: 'most-bids', label: 'Most Bids' },
        { value: 'newest', label: 'Newest First' },
        { value: 'reserve-low', label: 'Reserve: Low to High' },
        { value: 'reserve-high', label: 'Reserve: High to Low' },
    ];

    const getBadgeComponent = (badge: string | null) => {
        switch (badge) {
            case 'live':
                return (
                    <div className="flex items-center space-x-1 bg-status-live text-white px-3 py-1 rounded-full text-xs font-semibold">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        <span>LIVE</span>
                    </div>
                );
            case 'hot':
                return (
                    <div className="bg-accent-orange text-white px-3 py-1 rounded-full text-xs font-semibold">
                        🔥 HOT
                    </div>
                );
            case 'ending':
                return (
                    <div className="bg-status-error text-white px-3 py-1 rounded-full text-xs font-semibold">
                        ⏰ ENDING SOON
                    </div>
                );
            case 'new':
                return (
                    <div className="bg-accent-cyan text-white px-3 py-1 rounded-full text-xs font-semibold">
                        🆕 NEW
                    </div>
                );
            default:
                return null;
        }
    };


    return (
        <div className="min-h-screen bg-background-main">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-text-primary mb-2">
                        Browse Auctions
                    </h1>
                    <p className="text-text-secondary">
                        Discover and bid on privacy-protected auctions
                    </p>
                </div>

                {/* Filters & Search */}
                <div className="bg-background-card rounded-xl border border-border p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="md:col-span-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search auctions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-background-input border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-purple transition-colors"
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-background-input border border-border rounded-lg text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-primary-purple transition-colors"
                                >
                                    {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Sort */}
                        <div>
                            <div className="relative">
                                <TrendingUp className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-background-input border border-border rounded-lg text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-primary-purple transition-colors"
                                >
                                    {sortOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <p className="text-sm text-text-muted">
                            Showing <span className="text-text-primary font-semibold">{filteredAuctions.length}</span> auctions
                        </p>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                                    ? 'bg-primary-purple text-white'
                                    : 'text-text-muted hover:text-text-primary hover:bg-background-elevated'
                                    }`}
                            >
                                <Grid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                                    ? 'bg-primary-purple text-white'
                                    : 'text-text-muted hover:text-text-primary hover:bg-background-elevated'
                                    }`}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Auctions Grid/List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-background-card p-6 rounded-xl border border-border animate-pulse">
                                <div className="w-full h-48 bg-background-elevated rounded mb-4"></div>
                                <div className="w-3/4 h-6 bg-background-elevated rounded mb-2"></div>
                                <div className="w-1/2 h-4 bg-background-elevated rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="text-center py-20 bg-background-card rounded-xl border border-border">
                        <div className="w-16 h-16 bg-status-error bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-status-error" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary mb-2">Error Loading Auctions</h2>
                        <p className="text-text-secondary mb-6">{error}</p>
                        <button
                            onClick={() => refetch()}
                            className="px-6 py-2 bg-primary-purple text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredAuctions.length === 0 ? (

                    <div className="text-center py-20 bg-background-card rounded-xl border border-border">
                        <p className="text-text-secondary mb-4">No auctions found matching your criteria</p>
                        <button
                            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                            className="text-primary-purple font-semibold hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAuctions.map((auction) => (
                            <Link
                                key={auction.publicKey.toBase58()}
                                to={`/auction/${auction.publicKey.toBase58()}`}
                                className="bg-background-card rounded-xl overflow-hidden border border-border hover:shadow-card-hover transition-all card-hover"
                            >
                                <div className="relative">
                                    <div className="w-full h-48 bg-background-elevated flex items-center justify-center">
                                        <span className="text-text-muted">No Image</span>
                                    </div>
                                    <div className="absolute top-3 right-3">
                                        {getBadgeComponent(getAuctionBadge(auction.account))}
                                    </div>
                                </div>

                                <div className="p-5">
                                    <h3 className="text-lg font-semibold text-text-primary mb-2 truncate">
                                        {auction.account.itemName}
                                    </h3>
                                    <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                                        {auction.account.itemDescription}
                                    </p>

                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-1 text-primary-purple">
                                            <Lock className="w-4 h-4" />
                                            <span className="text-sm font-semibold">{auction.account.totalBids} bids</span>
                                        </div>
                                        <div className="flex items-center space-x-1 text-status-error">
                                            <Clock className="w-4 h-4" />
                                            <span className="text-sm font-semibold">{formatTimeRemaining(auction.account.endTime.toNumber())}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-text-muted">Reserve Price</span>
                                        <span className="text-text-primary font-semibold">
                                            {lamportsToSol(auction.account.reservePrice.toNumber())} SOL
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredAuctions.map((auction) => (
                            <Link
                                key={auction.publicKey.toBase58()}
                                to={`/auction/${auction.publicKey.toBase58()}`}
                                className="bg-background-card rounded-xl border border-border hover:shadow-card-hover transition-all card-hover overflow-hidden"
                            >
                                <div className="flex flex-col md:flex-row">
                                    <div className="relative md:w-64 h-48 md:h-auto flex-shrink-0">
                                        <div className="w-full h-full bg-background-elevated flex items-center justify-center min-h-[192px]">
                                            <span className="text-text-muted">No Image</span>
                                        </div>
                                        <div className="absolute top-3 right-3">
                                            {getBadgeComponent(getAuctionBadge(auction.account))}
                                        </div>
                                    </div>

                                    <div className="flex-1 p-6">
                                        <h3 className="text-xl font-semibold text-text-primary mb-2">
                                            {auction.account.itemName}
                                        </h3>
                                        <p className="text-text-secondary mb-4 line-clamp-2">
                                            {auction.account.itemDescription}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-6">
                                            <div className="flex items-center space-x-2 text-primary-purple">
                                                <Lock className="w-5 h-5" />
                                                <div>
                                                    <p className="text-xs text-text-muted">Bids</p>
                                                    <p className="text-sm font-semibold">{auction.account.totalBids}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-2 text-status-error">
                                                <Clock className="w-5 h-5" />
                                                <div>
                                                    <p className="text-xs text-text-muted">Time Left</p>
                                                    <p className="text-sm font-semibold">
                                                        {formatTimeRemaining(auction.account.endTime.toNumber())}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-text-muted">Reserve Price</p>
                                                <p className="text-sm font-semibold text-text-primary">
                                                    {lamportsToSol(auction.account.reservePrice.toNumber())} SOL
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

            </div>
        </div>
    );
};

export default BrowseAuctions;