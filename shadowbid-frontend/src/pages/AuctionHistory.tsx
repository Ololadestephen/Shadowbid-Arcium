import { Clock } from 'lucide-react';

const AuctionHistory = () => {
    const closedAuctions = [
        {
            id: 1,
            title: 'Vintage NFT #123',
            image: 'https://via.placeholder.com/200x150',
            winningBid: '15.5 SOL',
            winner: '7xKX...9pQm',
            closedAt: '2 days ago',
            totalBids: 18,
        },
        {
            id: 2,
            title: 'Digital Art Piece',
            image: 'https://via.placeholder.com/200x150',
            winningBid: '8.2 SOL',
            winner: '4mPQ...7tRs',
            closedAt: '5 days ago',
            totalBids: 12,
        },
    ];

    return (
        <div className="min-h-screen bg-background-main">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-text-primary mb-2">Auction History</h1>
                    <p className="text-text-secondary">View past auctions and results</p>
                </div>

                <div className="space-y-4">
                    {closedAuctions.map((auction) => (
                        <div
                            key={auction.id}
                            className="bg-background-card rounded-xl border border-border overflow-hidden"
                        >
                            <div className="flex flex-col md:flex-row">
                                <img
                                    src={auction.image}
                                    alt={auction.title}
                                    className="w-full md:w-48 h-48 object-cover"
                                />
                                <div className="flex-1 p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-text-primary mb-2">
                                                {auction.title}
                                            </h3>
                                            <p className="text-sm text-text-muted flex items-center space-x-1">
                                                <Clock className="w-4 h-4" />
                                                <span>Closed {auction.closedAt}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-text-muted mb-1">Winning Bid</p>
                                            <p className="text-2xl font-bold text-status-success">
                                                {auction.winningBid}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-6">
                                        <div>
                                            <p className="text-xs text-text-muted">Winner</p>
                                            <p className="text-sm text-text-primary font-semibold">
                                                {auction.winner}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-text-muted">Total Bids</p>
                                            <p className="text-sm text-text-primary font-semibold">
                                                {auction.totalBids}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AuctionHistory;