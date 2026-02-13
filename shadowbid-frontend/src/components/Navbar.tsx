import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Gavel, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;

    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/browse', label: 'Browse' },
        { path: '/create', label: 'Create' },
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/how-it-works', label: 'How It Works' },
    ];

    return (
        <nav className="bg-background-card border-b border-border sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 group">
                        <div className="bg-primary-purple p-2 rounded-lg group-hover:shadow-glow-purple-sm transition-all">
                            <Gavel className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-text-primary">
                            Shadow<span className="text-primary-purple">Bid</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive(link.path)
                                        ? 'bg-primary-purple text-white'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-background-elevated'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Wallet Button */}
                    <div className="hidden md:block">
                        <WalletMultiButton />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-background-elevated"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-border">
                    <div className="px-4 py-4 space-y-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${isActive(link.path)
                                        ? 'bg-primary-purple text-white'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-background-elevated'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-2">
                            <WalletMultiButton className="!w-full" />
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;