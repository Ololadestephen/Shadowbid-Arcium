import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Upload, Calendar, DollarSign, FileText, Shield } from 'lucide-react';
import { useCreateAuction } from '../lib/hooks';
import { solToLamports, generateAuctionId } from '../lib/utils';
import { NATIVE_MINT } from '@solana/spl-token';

// Use Native SOL Mint
const DEFAULT_MINT = NATIVE_MINT;



const CreateAuction = () => {
    const { connected } = useWallet();
    const navigate = useNavigate();
    const { createAuction, loading, error: createError } = useCreateAuction();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        reservePrice: '',
        startTime: '',
        endTime: '',
        imageUrl: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!connected) {
            alert('Please connect your wallet');
            return;
        }

        try {
            // Combine description and image URL using a separator
            const combinedDescription = formData.imageUrl
                ? `${formData.description} ||img:${formData.imageUrl}`
                : formData.description;

            const result = await createAuction({
                auctionId: generateAuctionId(),
                startTime: new Date(formData.startTime),
                endTime: new Date(formData.endTime),
                reservePrice: solToLamports(parseFloat(formData.reservePrice)),
                itemName: formData.title,
                itemDescription: combinedDescription,
                tokenMint: DEFAULT_MINT,
            });

            alert('Auction created successfully!');
            navigate(`/auction/${result.auctionPda.toBase58()}`);
        } catch (err: any) {
            console.error('Failed to create:', err);
            alert(err.message || 'Failed to create auction');
        }
    };


    return (
        <div className="min-h-screen bg-background-main">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-text-primary mb-2">
                        Create Auction
                    </h1>
                    <p className="text-text-secondary">
                        Launch a privacy-protected blind auction on Solana
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Item Details */}
                    <div className="bg-background-card p-6 rounded-xl border border-border">
                        <h2 className="text-xl font-semibold text-text-primary mb-4">Item Details</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    <FileText className="w-4 h-4 inline mr-2" />
                                    Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Enter item title"
                                    className="w-full px-4 py-3 bg-background-input border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-purple transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Description
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe your item"
                                    className="w-full px-4 py-3 bg-background-input border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-purple transition-colors resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    <Upload className="w-4 h-4 inline mr-2" />
                                    Image URL (Optional)
                                </label>
                                <input
                                    type="url"
                                    value={formData.imageUrl}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-3 bg-background-input border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-purple transition-colors"
                                />
                                <p className="text-text-muted text-xs mt-1">Provide a link to your item's image (Imgur, IPFS, etc.)</p>
                            </div>
                        </div>
                    </div>

                    {/* Auction Settings */}
                    <div className="bg-background-card p-6 rounded-xl border border-border">
                        <h2 className="text-xl font-semibold text-text-primary mb-4">Auction Settings</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    <DollarSign className="w-4 h-4 inline mr-2" />
                                    Reserve Price (SOL)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    required
                                    value={formData.reservePrice}
                                    onChange={(e) => setFormData({ ...formData, reservePrice: e.target.value })}
                                    placeholder="Minimum acceptable bid"
                                    className="w-full px-4 py-3 bg-background-input border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary-purple transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        <Calendar className="w-4 h-4 inline mr-2" />
                                        Start Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full px-4 py-3 bg-background-input border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary-purple transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        End Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="w-full px-4 py-3 bg-background-input border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary-purple transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Notice */}
                    <div className="bg-primary-purple bg-opacity-10 p-6 rounded-xl border border-primary-purple">
                        <div className="flex items-start space-x-3">
                            <Shield className="w-6 h-6 text-primary-purple flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-sm font-semibold text-text-primary mb-2">
                                    Privacy-Protected Auction
                                </h3>
                                <p className="text-sm text-text-secondary">
                                    All bids will be encrypted using Arcium MPC. Bidders won't see each other's bids,
                                    preventing collusion and MEV exploitation. Only the winner and winning amount will
                                    be revealed when the auction closes.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!connected || loading}
                        className={`w-full py-4 rounded-lg font-semibold transition-all ${connected && !loading
                            ? 'bg-primary-purple text-white hover:bg-opacity-90 btn-hover-lift'
                            : 'bg-background-elevated text-text-disabled cursor-not-allowed'
                            }`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Creating Auction...</span>
                            </div>
                        ) : connected ? (
                            'Create Auction'
                        ) : (
                            'Connect Wallet to Create'
                        )}
                    </button>

                    {createError && (
                        <p className="text-status-error text-center text-sm">{createError}</p>
                    )}

                </form>
            </div>
        </div>
    );
};

export default CreateAuction;