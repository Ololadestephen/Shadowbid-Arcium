import { Link } from 'react-router-dom';
import { Github, Twitter, MessageCircle, Shield } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-background-card border-t border-border mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="bg-primary-purple p-2 rounded-lg">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-text-primary">
                                Shadow<span className="text-primary-purple">Bid</span>
                            </span>
                        </div>
                        <p className="text-text-secondary text-sm mb-4 max-w-md">
                            Privacy-preserving blind auctions on Solana. Powered by Arcium MPC for
                            secure, MEV-resistant, and fair price discovery.
                        </p>
                        <div className="flex items-center space-x-4">
                            <a
                                href="https://github.com/yourusername/shadowbid"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-text-muted hover:text-primary-purple transition-colors"
                            >
                                <Github className="w-5 h-5" />
                            </a>
                            <a
                                href="https://twitter.com/shadowbid"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-text-muted hover:text-primary-purple transition-colors"
                            >
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a
                                href="https://discord.gg/shadowbid"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-text-muted hover:text-primary-purple transition-colors"
                            >
                                <MessageCircle className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-text-primary font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/browse" className="text-text-secondary hover:text-primary-purple text-sm transition-colors">
                                    Browse Auctions
                                </Link>
                            </li>
                            <li>
                                <Link to="/create" className="text-text-secondary hover:text-primary-purple text-sm transition-colors">
                                    Create Auction
                                </Link>
                            </li>
                            <li>
                                <Link to="/dashboard" className="text-text-secondary hover:text-primary-purple text-sm transition-colors">
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link to="/history" className="text-text-secondary hover:text-primary-purple text-sm transition-colors">
                                    History
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="text-text-primary font-semibold mb-4">Resources</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/how-it-works" className="text-text-secondary hover:text-primary-purple text-sm transition-colors">
                                    How It Works
                                </Link>
                            </li>
                            <li>
                                <a
                                    href="https://docs.shadowbid.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-text-secondary hover:text-primary-purple text-sm transition-colors"
                                >
                                    Documentation
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://docs.arcium.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-text-secondary hover:text-primary-purple text-sm transition-colors"
                                >
                                    Arcium MPC
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/yourusername/shadowbid"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-text-secondary hover:text-primary-purple text-sm transition-colors"
                                >
                                    GitHub
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center">
                    <p className="text-text-muted text-sm">
                        © 2024 ShadowBid. Built with ❤️ for the Solana ecosystem.
                    </p>
                    <div className="flex items-center space-x-6 mt-4 md:mt-0">
                        <a href="#" className="text-text-muted hover:text-primary-purple text-sm transition-colors">
                            Privacy Policy
                        </a>
                        <a href="#" className="text-text-muted hover:text-primary-purple text-sm transition-colors">
                            Terms of Service
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;