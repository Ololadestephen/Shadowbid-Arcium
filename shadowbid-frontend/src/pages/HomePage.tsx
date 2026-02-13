import { Link } from 'react-router-dom';
import { Shield, Lock, TrendingUp, Users, Clock, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { useAuctions } from '../lib/hooks';
import { calculateAuctionStats, getAuctionBadge, formatTimeRemaining, parseAuctionDescription } from '../lib/utils';

const HomePage = () => {
    const { auctions, loading } = useAuctions();

    // Calculate real stats
    const stats = calculateAuctionStats(auctions);

    const displayStats = [
        { label: 'Total Auctions', value: stats.totalAuctions.toString(), icon: TrendingUp, color: 'text-primary-purple' },
        { label: 'Active Auctions', value: stats.activeAuctions.toString(), icon: Users, color: 'text-accent-cyan' },
        { label: 'Total Bids', value: stats.totalBids.toString(), icon: Sparkles, color: 'text-accent-yellow' },
        { label: 'Total Volume', value: `${stats.totalVolume.toFixed(1)} SOL`, icon: Clock, color: 'text-status-live' },
    ];

    const features = [
        {
            icon: Lock,
            title: 'Encrypted Bids',
            description: 'All bids encrypted client-side using Arcium MPC before hitting the blockchain.',
            color: 'bg-primary-purple',
        },
        {
            icon: Shield,
            title: 'MEV Protection',
            description: 'No information leakage in mempool. Prevent frontrunning and sandwich attacks.',
            color: 'bg-primary-blue',
        },
        {
            icon: Users,
            title: 'Collusion Resistant',
            description: 'Bidders cannot see competing bids. Fair price discovery guaranteed.',
            color: 'bg-accent-cyan',
        },
        {
            icon: Zap,
            title: 'Fast & Cheap',
            description: 'Built on Solana for lightning-fast transactions with minimal fees.',
            color: 'bg-accent-orange',
        },
    ];

    // Get featured auctions (first 3 active auctions)
    const featuredAuctions = auctions
        .filter(a => a.account && getAuctionBadge(a.account) !== null)
        .slice(0, 3);

    const getBadgeComponent = (badge: string | null) => {
        switch (badge) {
            case 'live':
                return (
                    <div className="absolute top-3 right-3 bg-status-live text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        <span>LIVE</span>
                    </div>
                );
            case 'hot':
                return (
                    <div className="absolute top-3 right-3 bg-accent-orange text-white px-3 py-1 rounded-full text-xs font-semibold">
                        🔥 HOT
                    </div>
                );
            case 'ending':
                return (
                    <div className="absolute top-3 right-3 bg-status-error text-white px-3 py-1 rounded-full text-xs font-semibold">
                        ⏰ ENDING SOON
                    </div>
                );
            case 'new':
                return (
                    <div className="absolute top-3 right-3 bg-accent-cyan text-white px-3 py-1 rounded-full text-xs font-semibold">
                        🆕 NEW
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-primary-purple opacity-5"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center space-x-2 bg-background-card px-4 py-2 rounded-full mb-8 border border-border">
                            <Sparkles className="w-4 h-4 text-accent-yellow" />
                            <span className="text-sm text-text-secondary">Powered by Arcium MPC</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-6">
                            Privacy-First
                            <br />
                            <span className="text-primary-purple">Blind Auctions</span>
                        </h1>

                        <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
                            Create and participate in truly private auctions on Solana.
                            No bid sniping, no MEV exploitation, just fair price discovery.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <Link
                                to="/browse"
                                className="w-full sm:w-auto px-8 py-4 bg-primary-purple text-white rounded-lg font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center space-x-2 btn-hover-lift"
                            >
                                <span>Browse Auctions</span>
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                to="/create"
                                className="w-full sm:w-auto px-8 py-4 bg-background-card text-text-primary rounded-lg font-semibold hover:bg-background-elevated transition-all border border-border"
                            >
                                Create Auction
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-background-card p-6 rounded-xl border border-border animate-pulse">
                                <div className="w-8 h-8 bg-background-elevated rounded mb-3"></div>
                                <div className="w-16 h-8 bg-background-elevated rounded mb-2"></div>
                                <div className="w-24 h-4 bg-background-elevated rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {displayStats.map((stat, index) => (
                            <div
                                key={index}
                                className="bg-background-card p-6 rounded-xl border border-border hover:border-primary-purple transition-all card-hover"
                            >
                                <stat.icon className={`w-8 h-8 ${stat.color} mb-3`} />
                                <p className="text-3xl font-bold text-text-primary mb-1">{stat.value}</p>
                                <p className="text-sm text-text-muted">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Features Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                        Why Choose ShadowBid?
                    </h2>
                    <p className="text-lg text-text-secondary max-w-2xl mx-auto">
                        Built with cutting-edge privacy technology to ensure fair and secure auctions.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-background-card p-6 rounded-xl border border-border hover:shadow-card-hover transition-all"
                        >
                            <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-text-primary mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-text-secondary text-sm">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Featured Auctions Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-text-primary mb-2">
                            Featured Auctions
                        </h2>
                        <p className="text-text-secondary">
                            Trending auctions ending soon
                        </p>
                    </div>
                    <Link
                        to="/browse"
                        className="text-primary-purple hover:text-opacity-80 transition-colors flex items-center space-x-2"
                    >
                        <span>View All</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-background-card p-6 rounded-xl border border-border animate-pulse">
                                <div className="w-full h-48 bg-background-elevated rounded mb-4"></div>
                                <div className="w-3/4 h-6 bg-background-elevated rounded mb-2"></div>
                                <div className="w-1/2 h-4 bg-background-elevated rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : featuredAuctions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {featuredAuctions.map((auction) => {
                            const { imageUrl } = parseAuctionDescription(auction.account.itemDescription);
                            return (
                                <Link
                                    key={auction.publicKey.toBase58()}
                                    to={`/auction/${auction.publicKey.toBase58()}`}
                                    className="bg-background-card rounded-xl overflow-hidden border border-border hover:shadow-card-hover transition-all card-hover"
                                >
                                    <div className="relative">
                                        <div className="w-full h-48 bg-background-elevated flex items-center justify-center">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={auction.account.itemName}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600?text=ShadowBid';
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center text-text-muted opacity-20">
                                                    <Lock className="w-12 h-12 mb-1" />
                                                    <span className="text-sm">No Image</span>
                                                </div>
                                            )}
                                        </div>
                                        {getBadgeComponent(getAuctionBadge(auction.account))}
                                    </div>

                                    <div className="p-5">
                                        <h3 className="text-lg font-semibold text-text-primary mb-3 truncate">
                                            {auction.account.itemName}
                                        </h3>
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center space-x-1 text-primary-purple">
                                                <Lock className="w-4 h-4" />
                                                <span>{auction.account.totalBids} bids</span>
                                            </div>
                                            <div className="flex items-center space-x-1 text-status-error">
                                                <Clock className="w-4 h-4" />
                                                <span>{formatTimeRemaining(auction.account.endTime.toNumber())}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-text-muted">No featured auctions at the moment</p>
                        <Link to="/create" className="text-primary-purple hover:underline mt-2 inline-block">
                            Create the first auction
                        </Link>
                    </div>
                )}
            </section>

            {/* CTA Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="bg-primary-purple rounded-2xl p-12 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Start Bidding?
                    </h2>
                    <p className="text-white text-opacity-90 mb-8 max-w-2xl mx-auto">
                        Join thousands of users already experiencing privacy-first auctions on Solana.
                    </p>
                    <Link
                        to="/browse"
                        className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-primary-purple rounded-lg font-semibold hover:bg-opacity-90 transition-all btn-hover-lift"
                    >
                        <span>Explore Auctions</span>
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default HomePage;